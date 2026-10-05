const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {parseGlb,hash}=require('../../scripts/complete-export-format.cjs');
const {document,binary}=parseGlb(fs.readFileSync(path.join(__dirname,'copper-bakery-collectible.raw.glb'))),names=new Set();
for(const node of document.nodes){
  if(node.extras?.collectibleRuntimeName)node.name=node.extras.collectibleRuntimeName;
  assert.ok(!names.has(node.name),'Duplicate bakery node '+node.name);names.add(node.name);
}
for(const required of ['Copper_Crumb_Asset','Copper_PiercedFacade','Copper_CourtyardMesh','Shop_Rooftop_pretzel','Pretzel_BraidedLoaf'])assert.ok(names.has(required),required);
for(const material of document.materials){
  if(material.extras?.collectibleRuntimeName)material.name=material.extras.collectibleRuntimeName;
  const color=material.extras?.collectibleBaseColorLinear;assert.ok(color&&color.length===4&&color.every(Number.isFinite),'Missing material color '+material.name);material.pbrMetallicRoughness.baseColorFactor=[...color];
}
assert.ok(document.materials.some(material=>material.name==='Copper Cabinet Enamel'));
const json=Buffer.from(JSON.stringify(document)),padding=(4-json.length%4)%4,header=Buffer.alloc(20),binaryHeader=Buffer.alloc(8);
header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+json.length+padding+8+binary.length,8);header.writeUInt32LE(json.length+padding,12);header.writeUInt32LE(0x4e4f534a,16);binaryHeader.writeUInt32LE(binary.length);binaryHeader.writeUInt32LE(0x004e4942,4);
const result=Buffer.concat([header,json,Buffer.alloc(padding,32),binaryHeader,binary]),verified=parseGlb(result);assert.ok(verified.binary.equals(binary));
fs.writeFileSync(path.join(__dirname,'copper-bakery-collectible.glb'),result);
const report={status:'draft-awaiting-geometry-and-bake-validation',bytes:result.length,sha256:hash(result),nodes:document.nodes.length,materials:document.materials.length,triangles:document.meshes.reduce((total,mesh)=>total+mesh.primitives.reduce((sum,primitive)=>sum+document.accessors[primitive.indices??primitive.attributes.POSITION].count/3,0),0)};
fs.writeFileSync(path.join(__dirname,'bakery-export.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

if(process.argv.includes('--publish')){
  const root=path.resolve(__dirname,'../..'),review=JSON.parse(fs.readFileSync(path.join(root,'outputs/playtest/collectible-bakery-candidate-v3-checks.json'),'utf8')),baseline=JSON.parse(fs.readFileSync(path.join(root,'outputs/playtest/collectible-bakery-baseline-v2-checks.json'),'utf8'));
  assert.equal(review.checks.length,4);assert.equal(baseline.checks.length,4);assert.deepEqual(review.errors,[]);assert.deepEqual(baseline.errors,[]);
  for(const file of ['app/copper-bakery.ts','public/assets/copper-bakery.glb','public/assets/copper-bakery-ao.png'])assert.equal(review.bakeryFingerprints[file],baseline.bakeryFingerprints[file],'Baseline scene input changed: '+file);
  for(const check of review.checks){const original=baseline.checks.find(value=>value.name===check.name);assert.ok(original);assert.deepEqual(check.camera,original.camera);if(check.direction)assert.deepEqual(check.direction,original.direction)}
  const ao=fs.readFileSync(path.join(__dirname,'copper-bakery-collectible-ao.png')),aoHash=hash(ao);
  assert.equal(report.sha256,review.bakeryFingerprints['assets/premium-candidates/copper-bakery-collectible.glb']);assert.equal(aoHash,review.bakeryFingerprints['assets/premium-candidates/copper-bakery-collectible-ao.png']);
  assert.ok(report.triangles<60000);assert.ok(result.length+ao.length<6500000);
  for(const file of ['public/assets/copper-bakery.glb','public/assets/copper-bakery-ao.png'])assert.equal(hash(fs.readFileSync(path.join(root,file))),review.bakeryFingerprints[file],'Original public asset changed');
  const destination=path.join(root,'public/assets/collectible-v1');fs.mkdirSync(destination,{recursive:true});
  const entries=[{source:'copper-bakery-collectible.glb',name:'copper-bakery.glb',bytes:result.length,sha256:report.sha256},{source:'copper-bakery-collectible-ao.png',name:'copper-bakery-ao.png',bytes:ao.length,sha256:aoHash}];
  for(const entry of entries){const target=path.join(destination,entry.name);if(fs.existsSync(target))assert.equal(hash(fs.readFileSync(target)),entry.sha256,'Refusing to overwrite another version');else fs.copyFileSync(path.join(__dirname,entry.source),target);assert.equal(hash(fs.readFileSync(target)),entry.sha256)}
  const manifest={version:'cute-collectible-bakery-v1',assets:entries.map(entry=>({url:'/assets/collectible-v1/'+entry.name,bytes:entry.bytes,sha256:entry.sha256})),triangles:report.triangles,source:'assets/premium-candidates/collectible-bakery.py',baseline:'outputs/playtest/collectible-bakery-baseline-v2-checks.json',review:'outputs/playtest/collectible-bakery-candidate-v3-checks.json',originalFilesUnchanged:true};
  const manifestPath=path.join(destination,'bakery-manifest.json');if(fs.existsSync(manifestPath))assert.deepEqual(JSON.parse(fs.readFileSync(manifestPath,'utf8')),manifest);else fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');console.log('COLLECTIBLE_BAKERY_PUBLISHED',JSON.stringify(manifest));
}
