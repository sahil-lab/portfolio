const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),sharp=require('sharp');
const {parseGlb,compactGlb,hash}=require('../../scripts/complete-export-format.cjs');
const root=path.resolve(__dirname,'../..'),folder=path.join(__dirname,'terrain'),selected=process.argv.find(value=>value.startsWith('--only='))?.slice(7);
const planets=[...new Set(JSON.parse(fs.readFileSync(path.join(__dirname,'terrain-source/manifest.json'),'utf8')).map(entry=>entry.planet))].filter(planet=>!selected||planet===selected);
assert.ok(planets.length);fs.mkdirSync(folder,{recursive:true});

async function main(){
 const results=[];
 for(const planet of planets){
  const raw=fs.readFileSync(path.join(__dirname,'terrain-raw',planet+'.glb')),{document,binary}=parseGlb(raw),contact=fs.readFileSync(path.join(root,'public/assets/planets/blender-final',planet+'-scene-ao.png'));
  assert.equal(document.meshes.length,2);assert.equal(document.images.length,2);assert.ok(document.nodes.filter(node=>node.mesh!==undefined).every(node=>node.extras.terrainRevision==='sculpted-v2'));
  const ao=document.materials[0].occlusionTexture;assert.ok(ao);assert.ok(document.materials.every(material=>material.occlusionTexture.index===ao.index&&(material.occlusionTexture.texCoord??0)===0&&material.normalTexture.texCoord===1));
  const image=document.images[document.textures[ao.index].source],view=document.bufferViews[image.bufferView],self=binary.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength),selfMetadata=await sharp(self).metadata(),contactMetadata=await sharp(contact).metadata();
  assert.equal(contactMetadata.width,2048);assert.equal(contactMetadata.height,1024);
  const combined=await sharp(self).resize(2048,1024).composite([{input:contact,blend:'multiply'}]).png().toBuffer();
  fs.writeFileSync(path.join(folder,planet+'-contact-ao.png'),combined);image.name='Scene And Relief AO '+planet;
  for(const node of document.nodes)if(node.mesh!==undefined)node.extras={...node.extras,blenderSceneFinish:'scene-relief-ao-v2',inheritedSceneContact:true};
  const blocks=[];let length=0;
  document.bufferViews.forEach((entry,index)=>{
   const data=index===image.bufferView?combined:binary.subarray(entry.byteOffset??0,(entry.byteOffset??0)+entry.byteLength),padding=(4-length%4)%4;
   if(padding){blocks.push(Buffer.alloc(padding));length+=padding}entry.byteOffset=length;entry.byteLength=data.length;blocks.push(data);length+=data.length;
  });
  document.buffers[0].byteLength=length;
  const json=Buffer.from(JSON.stringify(document)),jsonPadding=(4-json.length%4)%4,binaryPadding=(4-length%4)%4,header=Buffer.alloc(20),binaryHeader=Buffer.alloc(8);
  header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+json.length+jsonPadding+8+length+binaryPadding,8);header.writeUInt32LE(json.length+jsonPadding,12);header.writeUInt32LE(0x4e4f534a,16);binaryHeader.writeUInt32LE(length+binaryPadding);binaryHeader.writeUInt32LE(0x004e4942,4);
  const result=compactGlb(Buffer.concat([header,json,Buffer.alloc(jsonPadding,32),binaryHeader,...blocks,Buffer.alloc(binaryPadding)]));assert.ok(result.length<3500000);
  fs.writeFileSync(path.join(folder,planet+'.glb'),result);results.push({planet,bytes:result.length,sha256:hash(result),inheritedContactSha256:hash(contact),selfOcclusionResolution:[selfMetadata.width,selfMetadata.height],contactResolution:[2048,1024]});console.log(planet+': '+result.length+' bytes');
 }
 const manifest={status:'candidate-awaiting-review',terrainRevision:'sculpted-v2',geographyHash:hash(fs.readFileSync(path.join(root,'app/planet-geography.ts'))),models:results};
 if(!selected){assert.equal(results.length,9);assert.ok(results.reduce((sum,entry)=>sum+entry.bytes,0)<26000000);fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')}
 console.log('SCULPTED_TERRAIN_FINALIZED '+results.length);
 if(process.argv.includes('--publish')){
  assert.equal(selected,undefined);const reviewPath='outputs/playtest/terrain-candidate-final-checks.json',review=JSON.parse(fs.readFileSync(path.join(root,reviewPath),'utf8'));
  assert.equal(review.checks.length,64);assert.deepEqual(review.errors,[]);assert.equal(review.checks.filter(check=>check.sculptedTerrain).length,54);
  for(const [file,digest] of Object.entries(review.terrainFingerprints))assert.equal(hash(fs.readFileSync(path.join(root,file))),digest,'Reviewed terrain input changed: '+file);
  assert.ok(review.checks.filter(check=>check.sculptedTerrain).every(check=>check.sculptedTerrain.revision==='sculpted-v2'&&check.sculptedTerrain.heightError<.0002&&check.sculptedTerrain.normalChannel===1&&check.sculptedTerrain.aoChannel===0));
  const source='assets/world-candidates/world-details-study-20261004-r2.blend',sourceBytes=fs.statSync(path.join(root,source)).size;assert.ok(sourceBytes>1000000000);
  const destination=path.join(root,'public/assets/world-v1/terrain');fs.mkdirSync(destination,{recursive:true});
  for(const model of results){const target=path.join(destination,model.planet+'.glb');if(fs.existsSync(target))assert.equal(hash(fs.readFileSync(target)),model.sha256,'Refusing to overwrite a published terrain revision');else fs.copyFileSync(path.join(folder,model.planet+'.glb'),target);assert.equal(hash(fs.readFileSync(target)),model.sha256)}
  const published={...manifest,status:'reviewed',source,sourceBytes,reviews:[reviewPath]},target=path.join(destination,'manifest.json');if(fs.existsSync(target))assert.deepEqual(JSON.parse(fs.readFileSync(target,'utf8')),published);else fs.writeFileSync(target,JSON.stringify(published,null,2)+'\n');
  console.log('REVIEWED_SCULPTED_TERRAIN_PUBLISHED');
 }
}
main().catch(error=>{console.error(error);process.exitCode=1});
