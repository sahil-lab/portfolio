// Conservative first-playable upper bound: every shipped client file, including lazy chunks.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)])}
const entries=files('dist/client').filter(f=>!f.endsWith('.map')).map(file=>{const bytes=fs.readFileSync(file);return {file,raw:bytes.length,gzip:zlib.gzipSync(bytes).length}});
const totals=entries.reduce((a,e)=>({raw:a.raw+e.raw,gzip:a.gzip+e.gzip}),{raw:0,gzip:0});
console.log(JSON.stringify({method:'Sum of independently gzipped client files; not a network HAR. Includes lazy chunks and manifests. Add HTML and HTTP overhead.',...totals,target:10000000,pass:totals.gzip<10000000,largest:entries.sort((a,b)=>b.gzip-a.gzip).slice(0,6)},null,2));
if(totals.gzip>=10000000)process.exitCode=1;
