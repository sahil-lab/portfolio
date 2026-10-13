const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const zlib=require('node:zlib');
const assert=require('node:assert/strict');
const {Readable,Writable}=require('node:stream');
const {pipeline}=require('node:stream/promises');
const {DatabaseSync}=require('node:sqlite');
const parsePbf=require('osm-pbf-parser');
const ts=require('typescript');

require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {classify}=require('../app/bengaluru-features.ts');
const root=path.resolve(__dirname,'..');
const hashFile=async file=>{const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(file))hash.update(chunk);return hash.digest('hex')};
const inside=(point,bbox)=>point.lon>=bbox.west&&point.lon<=bbox.east&&point.lat>=bbox.south&&point.lat<=bbox.north;

function intersects(geometry,bbox){
 let west=Infinity,south=Infinity,east=-Infinity,north=-Infinity;
 for(const point of geometry){west=Math.min(west,point.lon);east=Math.max(east,point.lon);south=Math.min(south,point.lat);north=Math.max(north,point.lat)}
 return west<=bbox.east&&east>=bbox.west&&south<=bbox.north&&north>=bbox.south;
}

async function downloadPbf(url,file){
 assert.equal(new URL(url).protocol,'https:','source downloads must use HTTPS');
 fs.mkdirSync(path.dirname(file),{recursive:true});
 if(fs.existsSync(file))return {file,sha256:await hashFile(file),bytes:fs.statSync(file).size,cached:true};
 const response=await fetch(url,{signal:AbortSignal.timeout(900000),headers:{'User-Agent':'BengaluruPlanet/2 offline OSM asset build'}});
 assert.ok(response.ok,'PBF source returned HTTP '+response.status);
 const partial=file+'.partial';
 const hash=crypto.createHash('sha256');let bytes=0,reported=0;
 const input=Readable.fromWeb(response.body);
 input.on('data',chunk=>{hash.update(chunk);bytes+=chunk.length;if(bytes-reported>=64*1048576){reported=bytes;console.log('PBF_DOWNLOAD_MIB '+Math.round(bytes/1048576))}});
 try{
  await pipeline(input,fs.createWriteStream(partial,{flags:'wx'}));
  if(response.headers.has('content-length'))assert.equal(bytes,Number(response.headers.get('content-length')),'incomplete PBF download');
  fs.renameSync(partial,file);
 }catch(error){if(fs.existsSync(partial))fs.rmSync(partial);throw error}
 const record={file,sha256:hash.digest('hex'),bytes,url,lastModified:response.headers.get('last-modified')};
 fs.writeFileSync(file+'.source.json',JSON.stringify(record,null,2)+'\n');
 return record;
}

async function importPbf(file,config,{sourceUrl,cacheDir=path.join(root,'outputs/geodata/bengaluru'),onProgress=()=>{}}={}){
 const {bbox}=config;
 assert.ok([bbox.west,bbox.east,bbox.south,bbox.north].every(Number.isFinite));
 assert.ok(bbox.west<bbox.east&&bbox.south<bbox.north,'invalid geographic AOI');
 fs.mkdirSync(cacheDir,{recursive:true});
 const spool=path.join(cacheDir,'coordinates-'+process.pid+'-'+crypto.randomUUID()+'.sqlite');
 const database=new DatabaseSync(spool);
 const selected=new Map(),relationIds=[],skipped=[],counts={nodes:0,ways:0,relations:0};
 let header;
 try{
  database.exec('PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF; PRAGMA cache_size=-65536; CREATE TABLE nodes(id INTEGER PRIMARY KEY,lon REAL NOT NULL,lat REAL NOT NULL); CREATE TABLE ways(id INTEGER PRIMARY KEY,refs TEXT NOT NULL,tags TEXT NOT NULL); CREATE TABLE relations(id INTEGER PRIMARY KEY,members TEXT NOT NULL,tags TEXT NOT NULL); BEGIN;');
  const insertNode=database.prepare('INSERT INTO nodes VALUES(?,?,?)'),insertWay=database.prepare('INSERT INTO ways VALUES(?,?,?)'),insertRelation=database.prepare('INSERT INTO relations VALUES(?,?,?)');
  const nodeAt=database.prepare('SELECT lon,lat FROM nodes WHERE id=?'),wayAt=database.prepare('SELECT refs,tags FROM ways WHERE id=?'),relationAt=database.prepare('SELECT members,tags FROM relations WHERE id=?');
  const wayGeometry=refs=>{
   const geometry=[];
   for(const reference of refs){const point=nodeAt.get(reference);if(!point)return null;geometry.push({lat:point.lat,lon:point.lon})}
   return geometry;
  };
  const primitives=new parsePbf.PrimitivesParser();
  await pipeline(fs.createReadStream(file),new parsePbf.BlobParser(),new parsePbf.BlobDecompressor(),primitives,new Writable({objectMode:true,write(items,_encoding,done){
   try{
    for(const item of items){
     assert.ok(Number.isSafeInteger(item.id),'OSM identifier exceeds the exact integer range');
     if(item.type==='node'){
      assert.ok(Number.isFinite(item.lon)&&Number.isFinite(item.lat),'non-finite OSM coordinate');
      insertNode.run(item.id,item.lon,item.lat);counts.nodes++;
      if(inside(item,bbox)&&classify(item.tags,'node',false))selected.set('node/'+item.id,{type:'node',id:item.id,lat:item.lat,lon:item.lon,tags:item.tags});
     }else if(item.type==='way'){
      insertWay.run(item.id,JSON.stringify(item.refs),JSON.stringify(item.tags));counts.ways++;
      if(classify(item.tags,'way',item.refs.length>3&&item.refs[0]===item.refs.at(-1))){
       const geometry=wayGeometry(item.refs);
       if(geometry&&intersects(geometry,bbox))selected.set('way/'+item.id,{type:'way',id:item.id,tags:item.tags,geometry});
       else if(!geometry)skipped.push({id:'way/'+item.id,reason:'incomplete node references'});
      }
     }else if(item.type==='relation'){
      insertRelation.run(item.id,JSON.stringify(item.members),JSON.stringify(item.tags));counts.relations++;
      if(classify(item.tags,'relation',true))relationIds.push(item.id);
     }
    }
    onProgress({...counts,selected:selected.size});done();
   }catch(error){done(error)}
  }}));
  header=primitives._osmheader;
  assert.ok(header,'PBF header is missing');
  assert.ok(!header.required_features.includes('HistoricalInformation'),'history PBFs must be reduced to a single snapshot first');
  assert.ok(header.required_features.includes('DenseNodes'),'this importer requires a DenseNodes OSM extract');
  database.exec('COMMIT');
  const membersOf=(relationId,ancestors=new Set(),inverted=false)=>{
   if(ancestors.has(relationId))throw new Error('cyclic relation '+relationId);
   const relation=relationAt.get(relationId);if(!relation)throw new Error('missing relation '+relationId);
   const branch=new Set(ancestors);branch.add(relationId);const members=[];
   for(const member of JSON.parse(relation.members)){
    const inner=(member.role==='inner')!==inverted;
    if(member.type==='relation')members.push(...membersOf(member.id,branch,inner));
    else if(member.type==='way'){
     const way=wayAt.get(member.id);if(!way)throw new Error('missing way '+member.id);
     const geometry=wayGeometry(JSON.parse(way.refs));if(!geometry)throw new Error('incomplete way '+member.id);
     members.push({type:'way',ref:member.id,role:inner?'inner':'outer',geometry,sourceRelations:[...branch]});
    }
   }
   return members;
  };
  for(const id of relationIds){
   try{
    const members=membersOf(id);
    if(members.some(member=>intersects(member.geometry,bbox)))selected.set('relation/'+id,{type:'relation',id,tags:JSON.parse(relationAt.get(id).tags),members});
   }catch(error){skipped.push({id:'relation/'+id,reason:error.message})}
  }
 }finally{
  database.close();
  fs.rmSync(spool,{force:true});
 }
 const timestamp=Number(header.osmosis_replication_timestamp);
 assert.ok(timestamp>0,'extract has no replication timestamp; snapshot provenance is required');
 const sourceSha256=await hashFile(file);
 const elements=[...selected.values()].sort((first,second)=>first.type.localeCompare(second.type)||first.id-second.id);
 assert.ok(elements.length>0,'the extract has no features in the configured AOI');
 const snapshot={version:0.6,generator:'bengaluru-pbf-import/1',osm3s:{timestamp_osm_base:new Date(timestamp*1000).toISOString(),copyright:'OpenStreetMap contributors, ODbL 1.0'},provenance:{format:'osm-pbf',sourceUrl,inputSha256:sourceSha256,inputBytes:fs.statSync(file).size,aoi:{kind:'versioned-custom-bbox',id:config.aoiId??'bengaluru-region-v1',bbox},skipped},elements};
 return {snapshot,report:{...counts,selected:elements.length,sourceSha256,skipped,snapshotTimestamp:snapshot.osm3s.timestamp_osm_base}};
}

async function main(){
 const {values}=require('node:util').parseArgs({options:{config:{type:'string'},pbf:{type:'string'},output:{type:'string'},download:{type:'string'},help:{type:'boolean'}}});
 if(values.help){console.log('node scripts/import-bengaluru-osm.cjs --config <config.json> --pbf <extract.osm.pbf> --output <snapshot.json.gz> [--download <https-url>]');return}
 assert.ok(values.config&&values.pbf&&values.output,'--config, --pbf and --output are required');
 const config=JSON.parse(fs.readFileSync(path.resolve(values.config),'utf8'));
 const file=path.resolve(values.pbf);
 if(values.download)console.log('PBF_SOURCE '+JSON.stringify(await downloadPbf(values.download,file)));
 let last=0;
 const result=await importPbf(file,config,{sourceUrl:values.download??config.sourceUrl,onProgress:progress=>{if(progress.nodes+progress.ways-last>1000000){last=progress.nodes+progress.ways;console.log('PBF_IMPORT '+JSON.stringify(progress))}}});
 const output=path.resolve(values.output);fs.mkdirSync(path.dirname(output),{recursive:true});
 const text=JSON.stringify(result.snapshot),compressed=zlib.gzipSync(text,{level:9});
 fs.writeFileSync(output,compressed,{flag:'wx'});
 fs.writeFileSync(output+'.report.json',JSON.stringify({...result.report,outputBytes:compressed.length,snapshotSha256:crypto.createHash('sha256').update(text).digest('hex')},null,2)+'\n',{flag:'wx'});
 console.log('PBF_IMPORT_COMPLETE '+JSON.stringify({output,elements:result.snapshot.elements.length,bytes:compressed.length,sourceSha256:result.report.sourceSha256,skipped:result.report.skipped.length}));
}

module.exports={downloadPbf,importPbf,intersects};
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1});
