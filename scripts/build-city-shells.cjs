const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),zlib=require('node:zlib'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText:text=>({width:text.length*25})},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};
const T=require('three'),{GLTFLoader}=require('three/addons/loaders/GLTFLoader.js'),{installArchitectureKit}=require('../app/architecture-kit.ts'),{createCityExpansion}=require('../app/city-expansion.ts'),{disposeScene}=require('../app/scene-resources.ts');
const {encodeArchitectureShells,installArchitectureShells,takeArchitectureShells,clearArchitectureShells}=require('../app/architecture-shells.ts');
const output=path.resolve(__dirname,'../public/assets/world-v1/city-shells.bin');
const manifest=path.resolve(__dirname,'../app/architecture-shells-manifest.json');
function digest(geometry){
 const hash=crypto.createHash('sha256');
 for(const [name,attribute] of [...Object.entries(geometry.attributes),['index',geometry.index]].sort(([first],[second])=>first.localeCompare(second))){
  hash.update(name);if(!attribute){hash.update('none');continue}
  hash.update(JSON.stringify([attribute.itemSize,attribute.normalized,attribute.count]));hash.update(Buffer.from(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength));
 }
 return hash.digest('hex');
}
async function main(){
 require('./build-hero-models.cjs');
 const bytes=fs.readFileSync(path.resolve(__dirname,'../public/assets/premium-v1/architecture-kit.glb')),kit=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
 assert.equal(installArchitectureKit(kit),true);disposeScene(kit);
 const root=new T.Group(),exportMaterial=new T.MeshStandardMaterial({vertexColors:true}),expected=new Map();root.userData.architectureShellLibrary=1;
 const scene=new T.Scene(),city=createCityExpansion(scene,undefined,shells=>{
  const group=shells.clone();group.name='CityShell_'+root.children.length;
  for(const mesh of group.children){expected.set(group.name+'/'+mesh.userData.shellMaterial,digest(mesh.geometry));mesh.material=exportMaterial}
  root.add(group);
 });
 assert.equal(root.children.length,city.architecture.length);assert.ok(root.children.length>200);
 const encoded=encodeArchitectureShells(root),decodeStart=performance.now();assert.equal(installArchitectureShells(encoded),true);const decodeMs=performance.now()-decodeStart;let checked=0;
 for(const group of root.children){const restored=takeArchitectureShells(group.userData.shellKey,new Array(100));assert.ok(restored);for(const skin of restored.skins){assert.equal(digest(skin.geometry),expected.get(group.name+'/'+skin.materialIndex),group.name+'/'+skin.materialIndex);skin.geometry.dispose();checked++}}
 assert.equal(checked,expected.size);
 const compressed=zlib.gzipSync(Buffer.from(encoded),{level:9}),sha256=crypto.createHash('sha256').update(compressed).digest('hex');
 if(process.argv.includes('--check')){assert.deepEqual(zlib.gunzipSync(fs.readFileSync(output)),Buffer.from(encoded),'City shells are stale; run npm run build:city-shells');assert.equal(JSON.parse(fs.readFileSync(manifest,'utf8')).sha256,sha256)}
 else{fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,compressed);fs.writeFileSync(manifest,JSON.stringify({sha256})+'\n')}
 console.log(JSON.stringify({neighborhoods:root.children.length,batches:checked,decodeMs,rawBytes:encoded.byteLength,downloadBytes:compressed.byteLength,sha256}));
 city.dispose();disposeScene(scene);disposeScene(root);clearArchitectureShells();
 if(process.argv.includes('--prepare-friends'))require('node:child_process').execFileSync(process.execPath,[path.join(__dirname,'prepare-friends-pc.mjs')],{stdio:'inherit'});
}
main().catch(error=>{console.error(error);process.exitCode=1});
