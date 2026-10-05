const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {parseGlb,hash}=require('../../scripts/complete-export-format.cjs');
const originalBytes=fs.readFileSync(path.resolve(__dirname,'../../public/assets/sah-suited-figure.glb')),{document,binary}=parseGlb(fs.readFileSync(path.join(__dirname,'monument.raw.glb'))),names=new Set();
assert.equal(hash(originalBytes),'3aef840cbc623bd34f32428020b67d787089c47f83f6278d864239db9e5527de');
for(const node of document.nodes){assert.ok(node.extras?.collectibleRuntimeName);node.name=node.extras.collectibleRuntimeName;assert.ok(!names.has(node.name));names.add(node.name)}
for(const name of ['FIG_Body_Fitted','FIG_Jacket','FIG_Trousers','FIG_Podium_Core','FIG_Lapel_Pin'])assert.ok(names.has(name),name);
for(const material of document.materials)if(material.extras?.collectibleMaterialName)material.name=material.extras.collectibleMaterialName;
const triangles=document.meshes.reduce((total,mesh)=>total+mesh.primitives.reduce((sum,primitive)=>sum+document.accessors[primitive.indices??primitive.attributes.POSITION].count/3,0),0);
assert.ok(triangles>130000&&triangles<180000);assert.equal(document.nodes.length,25);assert.ok(document.images.length>=4);assert.ok(!document.cameras?.length);assert.ok(!document.extensions?.KHR_lights_punctual);
assert.ok(document.materials.find(material=>material.name==='FIG_Podium_Stone').pbrMetallicRoughness.metallicFactor<.2);
for(const image of document.images){assert.equal(typeof image.bufferView,'number');assert.ok(!image.uri)}
const json=Buffer.from(JSON.stringify(document)),padding=(4-json.length%4)%4,header=Buffer.alloc(20),binaryHeader=Buffer.alloc(8);
header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+json.length+padding+8+binary.length,8);header.writeUInt32LE(json.length+padding,12);header.writeUInt32LE(0x4e4f534a,16);binaryHeader.writeUInt32LE(binary.length);binaryHeader.writeUInt32LE(0x004e4942,4);
const result=Buffer.concat([header,json,Buffer.alloc(padding,32),binaryHeader,binary]);assert.ok(parseGlb(result).binary.equals(binary));assert.ok(result.length<9000000);
fs.writeFileSync(path.join(__dirname,'monument.glb'),result);
const report={status:'exported-awaiting-runtime-review',bytes:result.length,sha256:hash(result),triangles,nodes:document.nodes.length,materials:document.materials.length,images:document.images.length,originalSha256:hash(originalBytes)};
fs.writeFileSync(path.join(__dirname,'monument-manifest.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

if(process.argv.includes('--publish')){
 const root=path.resolve(__dirname,'../..'),reviewPath='outputs/playtest/monument-collectible-candidate-v3/checks.json',review=JSON.parse(fs.readFileSync(path.join(root,reviewPath),'utf8'));
 assert.equal(review.sourceHash,report.sha256);assert.deepEqual(review.errors,[]);
 for(const [file,digest] of Object.entries(review.sourceHashes))assert.equal(hash(fs.readFileSync(path.join(root,file))),digest,'Reviewed source changed: '+file);
 assert.equal(review.captures.length,3);assert.ok(review.captures.every(capture=>capture.changedPixels>250&&capture.goldPixels>150&&capture.extent<.98&&!capture.overflow));
 assert.equal(review.initial.meshes.length,25);assert.ok(review.initial.meshes.includes('FIG_Lapel_Pin'));assert.ok(Math.abs(review.initial.totalHeight-101.25)<.001);assert.equal(review.initial.ground,0);assert.ok(review.initial.podiumBlocked);assert.equal(review.initial.outsideBlocked,false);
 assert.equal(review.depth.occludedDifference,0);assert.equal(review.depth.lookingAwayDifference,0);assert.deepEqual(review.offworld.matrix,review.offworld.original);
 const source='assets/hero-candidates/monument-study-20261003.blend',sourceBytes=fs.statSync(path.join(root,source)).size;assert.ok(sourceBytes>1000000000);
 const destination=path.join(root,'public/assets/hero-v1'),target=path.join(destination,'monument.glb');fs.mkdirSync(destination,{recursive:true});
 if(fs.existsSync(target))assert.equal(hash(fs.readFileSync(target)),report.sha256,'Refusing to overwrite a published revision');else fs.copyFileSync(path.join(__dirname,'monument.glb'),target);
 assert.equal(hash(fs.readFileSync(target)),report.sha256);
 const manifest={version:'collectible-monument-v1',url:'/assets/hero-v1/monument.glb',bytes:report.bytes,sha256:report.sha256,originalSha256:report.originalSha256,source,sourceBytes,reviews:[reviewPath]},manifestPath=path.join(destination,'monument-manifest.json');
 if(fs.existsSync(manifestPath))assert.deepEqual(JSON.parse(fs.readFileSync(manifestPath,'utf8')),manifest);else fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 console.log('REVIEWED_MONUMENT_PUBLISHED');
}
