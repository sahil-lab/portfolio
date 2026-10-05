const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {parseGlb,hash}=require('../../scripts/complete-export-format.cjs'),{craftParts}=require('../../app/craft-kit.ts'),root=path.resolve(__dirname,'../..'),bytes=fs.readFileSync(path.join(__dirname,'craft-kit.glb')),{document,binary}=parseGlb(bytes);
const parts=document.nodes.filter(node=>node.mesh!==undefined),names=parts.map(node=>node.extras?.craftPart);assert.deepEqual(names.slice().sort(),craftParts.slice().sort());assert.equal(new Set(names).size,28);assert.ok(bytes.length<750000);assert.equal(document.images?.length??0,0);assert.equal(document.animations?.length??0,0);assert.equal(document.skins?.length??0,0);assert.equal(document.cameras?.length??0,0);assert.equal(document.extensions?.KHR_lights_punctual,undefined);
const triangles={};
for(const node of parts){
 if(node.rotation)assert.deepEqual(node.rotation,[0,0,0,1]);if(node.scale)assert.deepEqual(node.scale,[1,1,1]);let total=0;
 for(const primitive of document.meshes[node.mesh].primitives){
  for(const attribute of ['POSITION','NORMAL','COLOR_0','TEXCOORD_0'])assert.equal(typeof primitive.attributes[attribute],'number',node.extras.craftPart+' missing '+attribute);
  const position=document.accessors[primitive.attributes.POSITION];assert.ok(position.min.every(value=>Number.isFinite(value)&&value>=-.50001));assert.ok(position.max.every(value=>Number.isFinite(value)&&value<=.50001));
  const normal=document.accessors[primitive.attributes.NORMAL],view=document.bufferViews[normal.bufferView],start=(view.byteOffset??0)+(normal.byteOffset??0),stride=view.byteStride??12;assert.equal(normal.componentType,5126);
  for(let index=0;index<normal.count;index++){const offset=start+index*stride,length=Math.hypot(binary.readFloatLE(offset),binary.readFloatLE(offset+4),binary.readFloatLE(offset+8));assert.ok(length>.99&&length<1.01,node.extras.craftPart+' invalid normal')}
  total+=document.accessors[primitive.indices??primitive.attributes.POSITION].count/3;
 }
 triangles[node.extras.craftPart]=total;
}
const recipes=['remodel-craft.py','remodel-transport.py','remodel-venues.py','remodel-landmarks.py'],recipeHashes=Object.fromEntries(recipes.map(file=>[file,hash(fs.readFileSync(path.join(__dirname,file)))]));
const report={version:'collectible-craft-v1',bytes:bytes.length,sha256:hash(bytes),parts:craftParts,triangles,recipeHashes};fs.writeFileSync(path.join(__dirname,'craft-manifest.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

if(process.argv.includes('--publish')){
 const reviewPath='outputs/playtest/craft-candidate-final-checks.json',review=JSON.parse(fs.readFileSync(path.join(root,reviewPath),'utf8'));
 assert.deepEqual(review.errors,[]);assert.equal(review.craftFingerprints['assets/world-candidates/craft-kit.glb'],report.sha256);
 for(const [file,digest] of Object.entries(review.craftFingerprints))assert.equal(hash(fs.readFileSync(path.join(root,file))),digest,'Reviewed input changed: '+file);
 const subjects=review.checks.filter(check=>check.craftSubject),assemblies=review.checks.filter(check=>check.craftAssembly);assert.equal(subjects.length,52);assert.equal(assemblies.length,4);
 for(const category of ['vehicle','venue','landmark','sign'])assert.ok(subjects.some(check=>check.craftSubject.category===category));
 for(const check of subjects){const subject=check.craftSubject;assert.ok(subject.objectPixels>100&&subject.extent<.9&&subject.missingColors===0);if(subject.motion)assert.ok(subject.motion.moving&&subject.motion.frozen);if(subject.entry)assert.ok(subject.entry.clear)}
 const source='assets/world-candidates/world-details-study-20261005-r3.blend',sourceBytes=fs.statSync(path.join(root,source)).size;assert.ok(sourceBytes>1000000000);
 const destination=path.join(root,'public/assets/world-v1'),target=path.join(destination,'craft-kit.glb');fs.mkdirSync(destination,{recursive:true});
 if(fs.existsSync(target))assert.equal(hash(fs.readFileSync(target)),report.sha256,'Refusing to replace a published craft revision');else fs.copyFileSync(path.join(__dirname,'craft-kit.glb'),target);assert.equal(hash(fs.readFileSync(target)),report.sha256);
 const manifest={...report,url:'/assets/world-v1/craft-kit.glb',source,sourceBytes,reviews:[reviewPath]},manifestPath=path.join(destination,'craft-manifest.json');if(fs.existsSync(manifestPath))assert.deepEqual(JSON.parse(fs.readFileSync(manifestPath,'utf8')),manifest);else fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');console.log('REVIEWED_CRAFT_KIT_PUBLISHED');
}
