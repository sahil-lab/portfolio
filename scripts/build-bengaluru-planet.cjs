/**
 * Bengaluru planet asset build.
 *
 *   node scripts/build-bengaluru-planet.cjs            build tiles from the configured snapshot
 *   node scripts/build-bengaluru-planet.cjs --check    rebuild in memory and verify published bytes
 *   node scripts/build-bengaluru-planet.cjs --fetch    download a fresh bounded Overpass snapshot
 *
 * Source data is OpenStreetMap (ODbL). The build works from a stored extract rather than
 * scraping map tiles; `--fetch` issues one bounded Overpass query for the configured AOI and
 * stores it gzipped under assets/bengaluru/snapshots so the build stays reproducible.
 * If TLS fails behind a corporate proxy, run with `node --use-system-ca`.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),assert=require('node:assert/strict'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {buildPlanet}=require('../app/bengaluru-pipeline.ts');
const root=path.resolve(__dirname,'..'),configPath=path.join(root,'assets/bengaluru/planet-config.json'),outputDir=path.join(root,'public/assets/bengaluru-v1'),appManifest=path.join(root,'app/bengaluru-planet-manifest.json');
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const config=JSON.parse(fs.readFileSync(configPath,'utf8'));

function overpassQuery(bbox){
 const area=`${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
 return `[out:json][timeout:${config.overpass.timeoutS}][bbox:${area}];(way["building"];relation["building"]["type"="multipolygon"];way["building:part"];way["highway"];way["leisure"~"^(park|garden|pitch|playground|golf_course|stadium|nature_reserve|common|recreation_ground|dog_park|track)$"];relation["leisure"~"^(park|garden|golf_course|nature_reserve|recreation_ground)$"]["type"="multipolygon"];way["landuse"~"^(grass|forest|recreation_ground|cemetery|meadow|village_green|orchard|greenfield|flowerbed|reservoir|basin)$"];relation["landuse"~"^(forest|recreation_ground|grass|cemetery|reservoir)$"]["type"="multipolygon"];way["natural"~"^(water|wood|scrub|grassland|wetland|heath)$"];relation["natural"="water"]["type"="multipolygon"];way["water"];way["waterway"~"^(river|stream|canal|drain|ditch|riverbank|dock)$"];way["railway"~"^(rail|light_rail|subway|tram|narrow_gauge)$"];node["place"];node["tourism"]["name"];node["historic"]["name"];node["amenity"~"^(place_of_worship|library|theatre|university|college|hospital|townhall|courthouse|marketplace|bus_station|arts_centre)$"]["name"];node["railway"~"^(station|halt)$"]["name"];node["public_transport"="station"]["name"];way["tourism"]["name"];way["historic"]["name"];);out geom;`;
}

async function fetchSnapshot(){
 const query=overpassQuery(config.bbox),started=Date.now();
 const response=await fetch(config.overpass.endpoint,{method:'POST',headers:{'User-Agent':'portfolio-bengaluru-planet-build/1 (reproducible local asset build)','Content-Type':'application/x-www-form-urlencoded'},body:'data='+encodeURIComponent(query)});
 assert.equal(response.status,200,'Overpass returned HTTP '+response.status);
 const text=await response.text(),data=JSON.parse(text);
 assert.ok(Array.isArray(data.elements)&&data.elements.length>0,'snapshot has no elements');
 const stamp=(data.osm3s?.timestamp_osm_base??new Date().toISOString()).slice(0,10),file=path.join(root,'assets/bengaluru/snapshots',`civic-core-${stamp}.json.gz`);
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,zlib.gzipSync(Buffer.from(text),{level:9}));
 console.log(`fetched ${data.elements.length} elements in ${Date.now()-started}ms (osm base ${data.osm3s?.timestamp_osm_base}) -> ${path.relative(root,file)} (${fs.statSync(file).size} bytes gzip, raw sha256 ${sha256(text)})`);
 console.log('set "snapshot" in assets/bengaluru/planet-config.json to use it');
}

function loadSnapshot(){
 const file=path.join(root,config.snapshot),gz=fs.readFileSync(file),text=zlib.gunzipSync(gz).toString('utf8');
 return {snapshot:JSON.parse(text),input:{sha256:sha256(text),bytes:Buffer.byteLength(text),description:path.relative(root,file).replace(/\\/g,'/')+' (Overpass API JSON, out geom)'}};
}

function build(){
 const {snapshot,input}=loadSnapshot(),started=performance.now(),result=buildPlanet(snapshot,config,input,sha256);
 return {...result,ms:performance.now()-started};
}

function writeBuild(result){
 fs.rmSync(outputDir,{recursive:true,force:true});fs.mkdirSync(path.join(outputDir,'tiles'),{recursive:true});
 for(const [file,content] of result.files)fs.writeFileSync(path.join(outputDir,file),content);
 fs.writeFileSync(appManifest,JSON.stringify(result.manifest,null,0)+'\n');
}

function check(result){
 for(const [file,content] of result.files){
  const disk=fs.readFileSync(path.join(outputDir,file));
  assert.equal(sha256(disk),sha256(typeof content==='string'?Buffer.from(content):content),`${file} differs from the published build`);
 }
 assert.equal(JSON.parse(fs.readFileSync(appManifest,'utf8')).source.inputSha256,result.manifest.source.inputSha256,'app manifest input hash differs');
 for(const entry of fs.readdirSync(path.join(outputDir,'tiles')))assert.ok(result.files.has('tiles/'+entry),'stale published tile '+entry);
}

function report(result){
 const {manifest,report}=result,byClass=Object.entries(manifest.counts).map(([k,v])=>`${k} ${v}`).join(', ');
 console.log(`${manifest.name}: ${report.features} features (${byClass}); ${report.tiles} tiles, ${(report.bytes/1048576).toFixed(2)} MiB of GLB, ${report.trees} trees, planet radius ${manifest.projection.planetRadiusM} m for city radius ${manifest.projection.cityRadiusM} m at ${manifest.projection.capAngleDeg} deg`);
 console.log(`heights: ${Object.entries(manifest.heights.sources).map(([k,v])=>`${k} ${v}`).join(', ')}; landmarks ${manifest.landmarks.length}/${config.landmarks.length}; places ${manifest.places.length}; named ${manifest.named.length}; snapshot ${manifest.source.snapshotTimestamp} sha256 ${manifest.source.inputSha256.slice(0,12)}; ${result.ms.toFixed(0)} ms`);
 if(report.skipped.length)console.log(`skipped ${report.skipped.length}: ${Object.entries(manifest.skipped.reasons).map(([k,v])=>`${k} ${v}`).join(', ')}`);
 for(const skip of report.skipped.filter(s=>s.reason==='landmark not found in snapshot'))console.log(`  landmark missing: ${skip.id}`);
}

async function main(){
 if(process.argv.includes('--fetch'))return fetchSnapshot();
 const result=build();
 if(process.argv.includes('--check')){check(result);console.log('BENGALURU_PLANET_CHECK_OK');return}
 writeBuild(result);report(result);console.log('BENGALURU_PLANET_BUILD_OK');
}
main().catch(error=>{console.error(error);process.exitCode=1});
