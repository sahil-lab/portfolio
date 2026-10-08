const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),manifestPath=path.join(root,'app/hero-model-manifest.json'),check=process.argv.includes('--check'),manifest=check?JSON.parse(fs.readFileSync(manifestPath,'utf8')):{};
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
let decodedBytes=0,downloadBytes=0;
for(const id of ['monument','dog','angel']){
 const source=fs.readFileSync(path.join(root,'public/assets/hero-v1',id+'.glb')),url='/assets/hero-v1/'+id+'.bin',filename=path.join(root,'public',url);
 const compressed=check?fs.readFileSync(filename):zlib.gzipSync(source,{level:9});
 assert.deepEqual(zlib.gunzipSync(compressed),source,id+' decompression changed model bytes');
 const record={url,sha256:digest(compressed),bytes:compressed.byteLength,decodedBytes:source.byteLength};
 if(check)assert.deepEqual(manifest[id],record,id+' compressed manifest is stale');else{fs.writeFileSync(filename,compressed);manifest[id]=record}
 decodedBytes+=source.byteLength;downloadBytes+=compressed.byteLength;
}
if(!check)fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({models:Object.keys(manifest).length,decodedBytes,downloadBytes,savedBytes:decodedBytes-downloadBytes,lossless:true,check}));
