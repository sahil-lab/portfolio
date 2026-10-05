const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {parseGlb,hash}=require('../../scripts/complete-export-format.cjs');
const originalBytes=fs.readFileSync(path.resolve(__dirname,'../../public/assets/roaming-dog.glb')),original=parseGlb(originalBytes),{document,binary}=parseGlb(fs.readFileSync(path.join(__dirname,'dog.raw.glb'))),names=new Set();
for(const node of document.nodes){if(node.extras?.collectibleRuntimeName)node.name=node.extras.collectibleRuntimeName;assert.ok(!names.has(node.name),'Duplicate node '+node.name);names.add(node.name)}
for(const name of ['DOG_CollectibleRoot','WEB_L1_DOG_BODY_RETOPO','WEB_L1_DOG_COLLAR','WEB_L1_DOG_COLLAR_TAG'])assert.ok(names.has(name),name);
for(const material of document.materials)if(material.extras?.collectibleMaterialName)material.name=material.extras.collectibleMaterialName;
const imageHashes=asset=>Object.fromEntries(asset.document.images.map(image=>{const view=asset.document.bufferViews[image.bufferView];return [image.name,hash(asset.binary.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength))]}));
assert.deepEqual(imageHashes({document,binary}),imageHashes(original),'Original coat and groom images must remain unchanged');assert.deepEqual(document.samplers,original.document.samplers);
const fur=document.materials.find(material=>material.name==='WEB_Fur_Alpha_Cutout_PBR'),originalFur=original.document.materials.find(material=>material.name==='WEB_Fur_Alpha_Cutout_PBR');assert.equal(fur.alphaMode,originalFur.alphaMode);assert.equal(fur.alphaCutoff,originalFur.alphaCutoff);
const triangles=document.meshes.reduce((total,mesh)=>total+mesh.primitives.reduce((sum,primitive)=>sum+document.accessors[primitive.indices??primitive.attributes.POSITION].count/3,0),0);assert.ok(triangles>80000&&triangles<95000);
assert.ok(!document.cameras?.length);assert.ok(!document.extensions?.KHR_lights_punctual);
const json=Buffer.from(JSON.stringify(document)),padding=(4-json.length%4)%4,header=Buffer.alloc(20),binaryHeader=Buffer.alloc(8);
header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+json.length+padding+8+binary.length,8);header.writeUInt32LE(json.length+padding,12);header.writeUInt32LE(0x4e4f534a,16);binaryHeader.writeUInt32LE(binary.length);binaryHeader.writeUInt32LE(0x004e4942,4);
const result=Buffer.concat([header,json,Buffer.alloc(padding,32),binaryHeader,binary]);assert.ok(parseGlb(result).binary.equals(binary));assert.ok(result.length<9000000);
fs.writeFileSync(path.join(__dirname,'dog.glb'),result);
const report={status:'exported-awaiting-rig-and-runtime-review',bytes:result.length,sha256:hash(result),triangles,nodes:document.nodes.length,materials:document.materials.length,images:imageHashes({document,binary}),originalSha256:hash(originalBytes)};
fs.writeFileSync(path.join(__dirname,'dog-manifest.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

if(process.argv.includes('--publish')){
 const root=path.resolve(__dirname,'../..'),reviewPath='outputs/playtest/dog-collectible-candidate-v6/checks.json',review=JSON.parse(fs.readFileSync(path.join(root,reviewPath),'utf8'));
 assert.equal(report.originalSha256,'fd6caf91202250e078d32ea03f47a4ba41c679cad37cb9dd9b34bc0fc7ed7f5c');assert.equal(review.sourceHash,report.sha256);assert.equal(review.rigHash,hash(fs.readFileSync(path.join(root,'app/dog-rig.ts'))));assert.deepEqual(review.errors,[]);
 assert.equal(review.captures.length,4);assert.ok(review.captures.every(capture=>capture.visibleDogPixels>150&&capture.framingExtent<.9&&!capture.overflow));assert.ok(review.initial.collar);assert.equal(review.initial.triangles,triangles);assert.ok(review.movement.frozen&&review.movement.destinations>=2&&review.movement.steppingTurns>20);
 const source='assets/hero-candidates/dog-study-20261003.blend',sourceBytes=fs.statSync(path.join(root,source)).size;assert.ok(sourceBytes>1000000000);
 const destination=path.join(root,'public/assets/hero-v1');fs.mkdirSync(destination,{recursive:true});const target=path.join(destination,'dog.glb');
 if(fs.existsSync(target))assert.equal(hash(fs.readFileSync(target)),report.sha256,'Refusing to replace another published version');else fs.copyFileSync(path.join(__dirname,'dog.glb'),target);assert.equal(hash(fs.readFileSync(target)),report.sha256);
 const manifest={version:'collectible-dog-v1',url:'/assets/hero-v1/dog.glb',bytes:report.bytes,sha256:report.sha256,originalSha256:report.originalSha256,source,sourceBytes,rigHash:review.rigHash,reviews:[reviewPath]},manifestPath=path.join(destination,'dog-manifest.json');
 if(fs.existsSync(manifestPath))assert.deepEqual(JSON.parse(fs.readFileSync(manifestPath,'utf8')),manifest);else fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');console.log('REVIEWED_DOG_PUBLISHED');
}

