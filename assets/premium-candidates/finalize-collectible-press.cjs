const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {parseGlb,hash}=require('../../scripts/complete-export-format.cjs');
const root=path.resolve(__dirname,'../..'),originalBytes=fs.readFileSync(path.join(root,'public/assets/packet-press.glb'));
const candidate=parseGlb(fs.readFileSync(path.join(__dirname,'packet-press-collectible.raw.glb'))),original=parseGlb(originalBytes),document=candidate.document;
const lookup=new Map();
for(const [index,node] of document.nodes.entries()){
  if(node.extras?.collectibleRuntimeName)node.name=node.extras.collectibleRuntimeName;
  assert.ok(!lookup.has(node.name),'Duplicate runtime node '+node.name);lookup.set(node.name,index);
}
assert.ok(lookup.has('PacketPress_CollectibleAssembly'));
let authoredTints=0;
for(const material of document.materials){
  const color=material.extras?.collectibleBaseColorLinear;if(!color)continue;
  assert.equal(color.length,4);assert.ok(color.every(value=>Number.isFinite(value)&&value>=0&&value<=1));
  material.pbrMetallicRoughness.baseColorFactor=[...color];authoredTints++;
}
assert.equal(authoredTints,9,'All authored materials must preserve their Blender tint');
const blocks=[candidate.binary],accessors=new Map(),views=new Map();let byteLength=candidate.binary.length;
function copyView(index){
  if(views.has(index))return views.get(index);
  const source=original.document.bufferViews[index];assert.equal(source.buffer,0);
  const padding=(4-byteLength%4)%4;if(padding){blocks.push(Buffer.alloc(padding));byteLength+=padding}
  const bytes=original.binary.subarray(source.byteOffset??0,(source.byteOffset??0)+source.byteLength);assert.equal(bytes.length,source.byteLength);
  const target=document.bufferViews.length;document.bufferViews.push({...source,buffer:0,byteOffset:byteLength});views.set(index,target);blocks.push(bytes);byteLength+=bytes.length;return target;
}
function copyAccessor(index){
  if(accessors.has(index))return accessors.get(index);
  const accessor=structuredClone(original.document.accessors[index]);
  if(accessor.bufferView!==undefined)accessor.bufferView=copyView(accessor.bufferView);
  if(accessor.sparse)for(const part of ['indices','values'])accessor.sparse[part].bufferView=copyView(accessor.sparse[part].bufferView);
  const target=document.accessors.length;document.accessors.push(accessor);accessors.set(index,target);return target;
}
document.animations=original.document.animations.map(animation=>({...animation,
  samplers:animation.samplers.map(sampler=>({...sampler,input:copyAccessor(sampler.input),output:copyAccessor(sampler.output)})),
  channels:animation.channels.map(channel=>{
    const name=original.document.nodes[channel.target.node].name;assert.ok(lookup.has(name),'Missing animation target '+name);
    return {...channel,target:{...channel.target,node:lookup.get(name)}};
  }),
}));
document.buffers[0].byteLength=byteLength;
const json=Buffer.from(JSON.stringify(document)),jsonPadding=(4-json.length%4)%4,binaryPadding=(4-byteLength%4)%4,header=Buffer.alloc(20),binaryHeader=Buffer.alloc(8);
header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+json.length+jsonPadding+8+byteLength+binaryPadding,8);header.writeUInt32LE(json.length+jsonPadding,12);header.writeUInt32LE(0x4e4f534a,16);binaryHeader.writeUInt32LE(byteLength+binaryPadding);binaryHeader.writeUInt32LE(0x004e4942,4);
const result=Buffer.concat([header,json,Buffer.alloc(jsonPadding,32),binaryHeader,...blocks,Buffer.alloc(binaryPadding)]),verified=parseGlb(result);
for(const [sourceIndex,targetIndex] of views){
  const source=original.document.bufferViews[sourceIndex],target=verified.document.bufferViews[targetIndex];
  assert.ok(original.binary.subarray(source.byteOffset??0,(source.byteOffset??0)+source.byteLength).equals(verified.binary.subarray(target.byteOffset,target.byteOffset+target.byteLength)),'Original animation samples changed');
}
assert.ok(verified.document.materials.some(material=>material.normalTexture&&material.pbrMetallicRoughness?.baseColorTexture&&material.pbrMetallicRoughness?.metallicRoughnessTexture),'Export lost its authored surface maps');
assert.ok(verified.document.materials.some(material=>material.alphaMode==='BLEND'),'Transparent vessel missing');
assert.ok(result.length<4500000,'Collectible exceeds its download budget');
fs.writeFileSync(path.join(__dirname,'packet-press-collectible.glb'),result);
const report={status:'exported-awaiting-runtime-checks',bytes:result.length,sha256:hash(result),originalSha256:hash(originalBytes),nodes:document.nodes.length,materials:document.materials.length,images:document.images.length,authoredTints,originalAnimationViewsPreserved:views.size};
fs.writeFileSync(path.join(__dirname,'packet-press-export.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

if(process.argv.includes('--publish')){
  const review=JSON.parse(fs.readFileSync(path.join(root,'outputs/playtest/collectible-press-study-v2-checks.json'),'utf8'));
  assert.deepEqual(review.errors,[]);assert.equal(review.checks.length,4);
  assert.equal(review.fingerprints['assets/premium-candidates/packet-press-collectible.glb'],report.sha256);
  assert.equal(review.fingerprints['public/assets/packet-press.glb'],report.originalSha256);
  const destination=path.join(root,'public/assets/collectible-v1'),target=path.join(destination,'packet-press.glb');fs.mkdirSync(destination,{recursive:true});
  if(fs.existsSync(target))assert.equal(hash(fs.readFileSync(target)),report.sha256,'Refusing to overwrite a different published version');else fs.copyFileSync(path.join(__dirname,'packet-press-collectible.glb'),target);
  assert.equal(hash(fs.readFileSync(target)),report.sha256);
  const manifest={version:'cute-collectible-v1',scope:['packet-press'],source:'assets/premium-candidates/collectible-press.py',assets:[{url:'/assets/collectible-v1/packet-press.glb',bytes:report.bytes,sha256:report.sha256,originalSha256:report.originalSha256}],review:'outputs/playtest/collectible-press-study-v2-checks.json',originalFilesUnchanged:true};
  const manifestPath=path.join(destination,'manifest.json');if(fs.existsSync(manifestPath))assert.deepEqual(JSON.parse(fs.readFileSync(manifestPath,'utf8')),manifest);else fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  console.log('COLLECTIBLE_PRESS_PUBLISHED',target);
}
