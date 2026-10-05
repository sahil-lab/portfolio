const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {parseGlb,hash}=require('../../scripts/complete-export-format.cjs');
const {document,binary}=parseGlb(fs.readFileSync(path.join(__dirname,'angel.raw.glb'))),names=new Set();
for(const node of document.nodes){if(node.extras?.collectibleRuntimeName)node.name=node.extras.collectibleRuntimeName;assert.ok(!names.has(node.name),'Duplicate node '+node.name);names.add(node.name)}
for(const name of ['ANGEL_Character','ANGEL_Body','ANGEL_Wing_L','ANGEL_Wing_R','ANGEL_Halo','ANGEL_Tee_StarBadge','ANGEL_Slide_Sole_1'])assert.ok(names.has(name),name);
assert.equal(document.nodes.find(node=>node.name==='ANGEL_Character').extras.collectibleHero,'angel-v1');
for(const material of document.materials){if(material.extras?.collectibleMaterialName)material.name=material.extras.collectibleMaterialName;const color=material.extras?.collectibleBaseColorLinear;assert.ok(color?.length===4&&color.every(Number.isFinite));material.pbrMetallicRoughness.baseColorFactor=[...color]}
const triangles=document.meshes.reduce((total,mesh)=>total+mesh.primitives.reduce((sum,primitive)=>sum+document.accessors[primitive.indices??primitive.attributes.POSITION].count/3,0),0);assert.ok(triangles>200000&&triangles<275000);
assert.ok(document.materials.filter(material=>material.normalTexture&&material.pbrMetallicRoughness.metallicRoughnessTexture).length>=8);
assert.ok(!document.cameras?.length);assert.ok(!document.extensions?.KHR_lights_punctual);
const json=Buffer.from(JSON.stringify(document)),padding=(4-json.length%4)%4,header=Buffer.alloc(20),binaryHeader=Buffer.alloc(8);
header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+json.length+padding+8+binary.length,8);header.writeUInt32LE(json.length+padding,12);header.writeUInt32LE(0x4e4f534a,16);binaryHeader.writeUInt32LE(binary.length);binaryHeader.writeUInt32LE(0x004e4942,4);
const result=Buffer.concat([header,json,Buffer.alloc(padding,32),binaryHeader,binary]);assert.ok(parseGlb(result).binary.equals(binary));assert.ok(result.length<11000000);
fs.writeFileSync(path.join(__dirname,'angel.glb'),result);
const report={status:'exported-awaiting-rig-and-runtime-review',bytes:result.length,sha256:hash(result),triangles,nodes:document.nodes.length,materials:document.materials.length,images:document.images.length,originalSha256:hash(fs.readFileSync(path.resolve(__dirname,'../../public/assets/anime-angel.glb')))};
fs.writeFileSync(path.join(__dirname,'angel-manifest.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

if(process.argv.includes('--publish')){
 const root=path.resolve(__dirname,'../..'),flightPath='outputs/playtest/angel-collectible-candidate-v2/checks.json',groundPath='outputs/playtest/angel-collectible-ground-v4/checks.json';
 const flight=JSON.parse(fs.readFileSync(path.join(root,flightPath),'utf8')),ground=JSON.parse(fs.readFileSync(path.join(root,groundPath),'utf8'));
 for(const review of [flight,ground]){assert.equal(review.sourceHash,report.sha256);assert.deepEqual(review.errors,[])}
 assert.equal(flight.destinations.length,10);assert.equal(flight.captures.length,3);assert.ok(flight.initial.halo&&flight.initial.mapped>5);assert.equal(ground.captures.length,6);assert.equal(ground.planet.status.locomotion,'grounded');
 const destination=path.join(root,'public/assets/hero-v1');fs.mkdirSync(destination,{recursive:true});const target=path.join(destination,'angel.glb');
 if(fs.existsSync(target))assert.equal(hash(fs.readFileSync(target)),report.sha256,'Refusing to replace another published version');else fs.copyFileSync(path.join(__dirname,'angel.glb'),target);assert.equal(hash(fs.readFileSync(target)),report.sha256);
 const manifest={version:'collectible-angel-v1',url:'/assets/hero-v1/angel.glb',bytes:report.bytes,sha256:report.sha256,originalSha256:report.originalSha256,source:'assets/hero-candidates/angel-study-20261003.blend',reviews:[flightPath,groundPath]},manifestPath=path.join(destination,'angel-manifest.json');
 if(fs.existsSync(manifestPath))assert.deepEqual(JSON.parse(fs.readFileSync(manifestPath,'utf8')),manifest);else fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');console.log('REVIEWED_ANGEL_PUBLISHED');
}
