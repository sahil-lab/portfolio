import {copyFile,mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const directory=resolve('public/assets/friends-pc');await mkdir(directory,{recursive:true});
const packageInfo=JSON.parse(await readFile('node_modules/v86/package.json','utf8'));
const assets=[
 {name:'v86.wasm',local:'node_modules/v86/build/v86.wasm'},
 {name:'v86-LICENSE',local:'node_modules/v86/LICENSE'},
 {name:'seabios.bin',url:'https://raw.githubusercontent.com/copy/v86/5f9a90f/bios/seabios.bin'},
 {name:'vgabios.bin',url:'https://raw.githubusercontent.com/copy/v86/5f9a90f/bios/vgabios.bin'},
 {name:'buildroot-bzimage68.bin',url:'https://i.copy.sh/buildroot-bzimage68.bin',size:10068480},
];
const manifest=[];
for(const asset of assets){
 const destination=resolve(directory,asset.name);
 if(asset.local)await copyFile(asset.local,destination);
 else{
  let present=false;try{const existing=await stat(destination);present=asset.size?existing.size===asset.size:existing.size>16384}catch{}
  if(!present){const response=await fetch(asset.url,{signal:AbortSignal.timeout(90000)});if(!response.ok)throw new Error(`${asset.name}: HTTP ${response.status}`);const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>20000000||bytes.length<16384||asset.size&&bytes.length!==asset.size)throw new Error(`Unexpected size for ${asset.name}`);await writeFile(destination,bytes)}
 }
 const bytes=await readFile(destination);manifest.push({file:asset.name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),source:asset.url??asset.local});
}
await writeFile(resolve(directory,'manifest.json'),JSON.stringify({emulator:packageInfo.version,guest:'Buildroot Linux 6.8',assets:manifest},null,2)+'\n');
console.log(JSON.stringify({prepared:manifest.map(asset=>({file:asset.file,bytes:asset.bytes})),emulator:packageInfo.version},null,2));
