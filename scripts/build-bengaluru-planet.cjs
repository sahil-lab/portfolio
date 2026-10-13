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
const {values:options}=require('node:util').parseArgs({options:{config:{type:'string',default:'assets/bengaluru/planet-config.json'},output:{type:'string',default:'public/assets/bengaluru-v1'},manifest:{type:'string',default:'app/bengaluru-planet-manifest.json'},'install-staging':{type:'string'},check:{type:'boolean'},fetch:{type:'boolean'},stream:{type:'boolean'},help:{type:'boolean'}}});
const root=path.resolve(__dirname,'..'),configPath=path.resolve(root,options.config),outputDir=path.resolve(root,options.output),appManifest=path.resolve(root,options.manifest);
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
 const snapshot=JSON.parse(text),format=snapshot.provenance?.format==='osm-pbf'?' (OSM PBF normalized geometry)':' (Overpass API JSON, out geom)';
 return {snapshot,input:{sha256:sha256(text),bytes:Buffer.byteLength(text),description:path.relative(root,file).replace(/\\/g,'/')+format}};
}

function build(buildOptions){
 const {snapshot,input}=loadSnapshot(),started=performance.now(),result=buildPlanet(snapshot,config,input,sha256,buildOptions);
 return {...result,ms:performance.now()-started};
}

function installBuild(result,staging){
 const relative=path.relative(root,outputDir);
 assert.ok(relative.startsWith('public'+path.sep+'assets'+path.sep),'generated output must be under public/assets');
 const backup=path.join(root,'outputs/geodata/bengaluru','previous-assets-'+Date.now());
 let retainedOriginal=false;
 if(fs.existsSync(outputDir)){
  try{fs.renameSync(outputDir,backup)}catch(error){
   if(!['EPERM','EBUSY','EXDEV'].includes(error.code))throw error;
   fs.cpSync(outputDir,backup,{recursive:true,force:false,errorOnExist:true});retainedOriginal=true;
  }
 }
 try{
  fs.mkdirSync(path.dirname(outputDir),{recursive:true});
  if(retainedOriginal){
   const previous=JSON.parse(fs.readFileSync(path.join(backup,'manifest.json'),'utf8'));
   fs.cpSync(staging,outputDir,{recursive:true,force:true});
   const generated=new Set(result.manifest.tiles.flatMap(tile=>[tile.features,...tile.lods.map(lod=>lod.file)]));
   for(const tile of previous.tiles)for(const file of [tile.features,...tile.lods.map(lod=>lod.file)])if(!generated.has(file))fs.rmSync(path.join(outputDir,file),{force:true});
  }else{
  try{fs.renameSync(staging,outputDir)}catch(error){
   if(!['EPERM','EBUSY','EXDEV'].includes(error.code)||fs.existsSync(outputDir))throw error;
   fs.cpSync(staging,outputDir,{recursive:true,force:false,errorOnExist:true});
  }
  }
 }
 catch(error){if(fs.existsSync(backup)){if(retainedOriginal)fs.cpSync(backup,outputDir,{recursive:true,force:true});else fs.renameSync(backup,outputDir)}throw error}
 fs.writeFileSync(appManifest,JSON.stringify(result.manifest)+'\n');
}

function check(result){
 for(const [file,content] of result.files){
  const disk=fs.readFileSync(path.join(outputDir,file));
  assert.equal(sha256(disk),sha256(typeof content==='string'?Buffer.from(content):content),`${file} differs from the published build`);
 }
 assert.deepEqual(JSON.parse(fs.readFileSync(appManifest,'utf8')),result.manifest,'app manifest differs');
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
 if(options.help){console.log('node scripts/build-bengaluru-planet.cjs [--config file] [--output public/assets/name] [--manifest app/name-manifest.json] [--stream] [--check] [--fetch]');return}
 if(options.fetch)return fetchSnapshot();
 if(options['install-staging']){
  const staging=path.resolve(root,options['install-staging']),manifest=JSON.parse(fs.readFileSync(path.join(staging,'manifest.json'),'utf8'));
  assert.ok(path.relative(path.join(root,'outputs/geodata/bengaluru'),staging).startsWith('build-'),'only a completed local build can be installed');
  assert.deepEqual(manifest.aoi.bbox,config.bbox);assert.equal(manifest.projection.kind,config.projectionMode??'spherical-cap');
  for(const tile of manifest.tiles){
   for(const lod of tile.lods){const bytes=fs.readFileSync(path.join(staging,lod.file));assert.equal(bytes.length,lod.bytes,lod.file);assert.equal(sha256(bytes),lod.sha256,lod.file)}
   assert.equal(JSON.parse(fs.readFileSync(path.join(staging,tile.features),'utf8')).length,tile.featureCount,tile.features);
  }
  for(const file of [manifest.fallback,manifest.sky])assert.ok(fs.statSync(path.join(staging,file)).size>0,file);
  installBuild({manifest},staging);console.log('BENGALURU_PLANET_INSTALL_OK '+manifest.tiles.length+' verified tiles');return;
 }
 if(options.check&&!options.stream){const result=build();check(result);console.log('BENGALURU_PLANET_CHECK_OK');return}
 const staging=options.check?null:path.join(root,'outputs/geodata/bengaluru','build-'+Date.now());
 if(staging)fs.mkdirSync(path.join(staging,'tiles'),{recursive:true});
 const expected=new Set();let reported=0;
 const result=build({releaseSourceGeometry:true,writeFile:(file,content)=>{
  expected.add(file);
  if(options.check)assert.equal(sha256(fs.readFileSync(path.join(outputDir,file))),sha256(content),file+' differs from the published build');
  else fs.writeFileSync(path.join(staging,file),content);
 },onTile:(completed,total)=>{if(completed-reported>=100){reported=completed;console.log('BENGALURU_TILE_BUILD '+completed+'/'+total)}}});
 if(options.check){
  assert.deepEqual(JSON.parse(fs.readFileSync(appManifest,'utf8')),result.manifest,'app manifest differs');
  for(const file of fs.readdirSync(path.join(outputDir,'tiles')))assert.ok(expected.has('tiles/'+file),'stale published tile '+file);
  console.log('BENGALURU_PLANET_CHECK_OK');return;
 }
 installBuild(result,staging);report(result);console.log('BENGALURU_PLANET_BUILD_OK');
}
main().catch(error=>{console.error(error);process.exitCode=1});
