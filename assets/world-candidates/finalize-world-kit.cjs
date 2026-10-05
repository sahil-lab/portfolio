const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {parseGlb,compactGlb,hash}=require('../../scripts/complete-export-format.cjs');
const originalBytes=fs.readFileSync(path.resolve(__dirname,'../../public/assets/premium-v1/kingdom-world-kit.glb'));
assert.equal(hash(originalBytes),'eb7343dedfb018b8aface701e4f7d3b51ef14198559de03e0947b034f672bf9d');
const sources=[originalBytes,fs.readFileSync(path.join(__dirname,'trees.raw.glb'))].map(bytes=>({asset:parseGlb(bytes),views:new Map(),accessors:new Map(),materials:new Map()}));
const original=sources[0].asset.document,remodeled=sources[1].asset.document,trees=new Map(remodeled.nodes.filter(node=>node.mesh!==undefined).map(node=>[node.extras.kitPart,node]));
assert.equal(trees.size,8);for(const source of sources)assert.equal(source.asset.document.images?.length??0,0);
const document={asset:{version:'2.0',generator:'Blender botanical kit return'},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],materials:[],accessors:[],bufferViews:[],buffers:[{byteLength:0}]},blocks=[];let length=0;
function view(source,index){
 if(source.views.has(index))return source.views.get(index);
 const entry=source.asset.document.bufferViews[index],data=source.asset.binary.subarray(entry.byteOffset??0,(entry.byteOffset??0)+entry.byteLength),padding=(4-length%4)%4;
 assert.equal(data.length,entry.byteLength);if(padding){blocks.push(Buffer.alloc(padding));length+=padding}
 const target=document.bufferViews.length;document.bufferViews.push({...entry,buffer:0,byteOffset:length});blocks.push(data);length+=data.length;source.views.set(index,target);return target;
}
function accessor(source,index){
 if(source.accessors.has(index))return source.accessors.get(index);
 const entry=source.asset.document.accessors[index];assert.equal(entry.sparse,undefined);assert.equal(typeof entry.bufferView,'number');const target=document.accessors.length;
 document.accessors.push({...entry,bufferView:view(source,entry.bufferView)});source.accessors.set(index,target);return target;
}
function material(source,index){
 if(source.materials.has(index))return source.materials.get(index);const target=document.materials.length;document.materials.push(structuredClone(source.asset.document.materials[index]));source.materials.set(index,target);return target;
}
for(const node of original.nodes.filter(node=>node.mesh!==undefined)){
 const replacement=trees.get(node.name),source=sources[replacement?1:0],selected=replacement??node,mesh=source.asset.document.meshes[selected.mesh];
 const target={...structuredClone(node),mesh:document.meshes.length};if(replacement)target.extras={...target.extras,collectibleTreeStyle:replacement.extras.collectibleTreeStyle};
 delete target.children;document.scenes[0].nodes.push(document.nodes.length);document.nodes.push(target);
 document.meshes.push({...structuredClone(mesh),primitives:mesh.primitives.map(primitive=>{
  assert.equal(primitive.targets,undefined);const result={...primitive,attributes:Object.fromEntries(Object.entries(primitive.attributes).map(([key,index])=>[key,accessor(source,index)]))};
  if(primitive.indices!==undefined)result.indices=accessor(source,primitive.indices);if(primitive.material!==undefined)result.material=material(source,primitive.material);return result;
 })});
}
assert.equal(document.nodes.length,21);document.buffers[0].byteLength=length;
const used=[...new Set(sources.flatMap(source=>source.asset.document.extensionsUsed??[]))];if(used.length)document.extensionsUsed=used;
const json=Buffer.from(JSON.stringify(document)),jsonPadding=(4-json.length%4)%4,binaryPadding=(4-length%4)%4,header=Buffer.alloc(20),binaryHeader=Buffer.alloc(8);
header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+json.length+jsonPadding+8+length+binaryPadding,8);header.writeUInt32LE(json.length+jsonPadding,12);header.writeUInt32LE(0x4e4f534a,16);binaryHeader.writeUInt32LE(length+binaryPadding);binaryHeader.writeUInt32LE(0x004e4942,4);
const result=compactGlb(Buffer.concat([header,json,Buffer.alloc(jsonPadding,32),binaryHeader,...blocks,Buffer.alloc(binaryPadding)]));assert.ok(result.length<1200000);
fs.writeFileSync(path.join(__dirname,'kingdom-world-kit.glb'),result);
const triangles=Object.fromEntries(document.nodes.map(node=>[node.name,document.meshes[node.mesh].primitives.reduce((sum,primitive)=>sum+document.accessors[primitive.indices??primitive.attributes.POSITION].count/3,0)]));
const report={bytes:result.length,sha256:hash(result),originalSha256:hash(originalBytes),remodeledParts:[...trees.keys()],preservedParts:21-trees.size,triangles};fs.writeFileSync(path.join(__dirname,'trees-manifest.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

if(process.argv.includes('--publish')){
 const root=path.resolve(__dirname,'../..'),reviewPath='outputs/playtest/botanical-candidate-final/checks.json',review=JSON.parse(fs.readFileSync(path.join(root,reviewPath),'utf8'));
 assert.equal(review.sourceHash,report.sha256);assert.equal(review.captures.length,30);assert.equal(review.inventory.planets.length,9);assert.deepEqual(review.errors,[]);assert.deepEqual(review.shaderErrors,[]);
 assert.ok(review.captures.every(capture=>capture.framed&&capture.treePixels>100&&capture.motionPixels>0&&capture.reducedMotionFrozen&&capture.sameWorld));
 for(const [file,digest] of Object.entries(review.sourceHashes))assert.equal(hash(fs.readFileSync(path.join(root,file))),digest,'Reviewed source changed: '+file);
 const source='assets/world-candidates/world-details-study-20261004-r1.blend',sourceBytes=fs.statSync(path.join(root,source)).size;assert.ok(sourceBytes>1000000000);
 const destination=path.join(root,'public/assets/world-v1'),target=path.join(destination,'kingdom-world-kit.glb');fs.mkdirSync(destination,{recursive:true});
 if(fs.existsSync(target))assert.equal(hash(fs.readFileSync(target)),report.sha256,'Refusing to overwrite a published revision');else fs.copyFileSync(path.join(__dirname,'kingdom-world-kit.glb'),target);
 assert.equal(hash(fs.readFileSync(target)),report.sha256);
 const manifest={version:'collectible-trees-v1',url:'/assets/world-v1/kingdom-world-kit.glb',...report,source,sourceBytes,reviews:[reviewPath]},manifestPath=path.join(destination,'trees-manifest.json');
 if(fs.existsSync(manifestPath))assert.deepEqual(JSON.parse(fs.readFileSync(manifestPath,'utf8')),manifest);else fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 console.log('REVIEWED_BOTANICAL_KIT_PUBLISHED');
}
