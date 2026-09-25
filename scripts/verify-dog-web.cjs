const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {validateBytes}=require('gltf-validator');
async function main(){
 const output=path.resolve('outputs/dog-digital-double'),reports=[];
 for(const [lod,filename] of ['dog_web.glb','dog_web_lod1.glb','dog_web_lod2.glb'].entries()){
  const bytes=fs.readFileSync(path.join(output,filename));assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
  const gltf=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
  assert.ok(gltf.images.every(image=>image.bufferView!==undefined&&!image.uri),'External texture dependency');
  assert.ok(gltf.nodes.every(node=>!node.name?.startsWith('REF_')&&!node.name?.startsWith('STUDIO_')),'Reference/studio object leaked');
    const body=gltf.nodes.find(node=>node.name===`WEB_L${lod}_DOG_BODY_RETOPO`);assert.ok(body,'Missing body');assert.ok((body.translation??[0,0,0]).every(value=>Math.abs(value)<1e-7),'Body is detached from its groom frame');
    const image=gltf.images.find(image=>image.name==='dog_basecolor');assert.ok(image,'Missing current albedo');const view=gltf.bufferViews[image.bufferView],start=28+bytes.readUInt32LE(12)+(view.byteOffset??0);
    assert.ok(bytes.subarray(start,start+view.byteLength).equals(fs.readFileSync(path.join(output,'textures/dog_basecolor.png'))),'Stale packed albedo');
  let triangles=0;const fur=gltf.meshes.filter(mesh=>mesh.name.includes('FUR_'));assert.equal(fur.length,12);
  for(const mesh of gltf.meshes)for(const primitive of mesh.primitives){assert.notEqual(primitive.attributes.NORMAL,undefined);assert.notEqual(primitive.attributes.TEXCOORD_0,undefined);triangles+=gltf.accessors[primitive.indices].count/3;if(mesh.name.includes('FUR_')){assert.notEqual(primitive.attributes.COLOR_0,undefined);assert.equal(gltf.materials[primitive.material].alphaMode,'MASK')}}
  assert.ok(triangles<[300000,180000,90000][lod]);
  const validation=await validateBytes(new Uint8Array(bytes),{uri:filename,maxIssues:2000});
  const report={file:filename,lod,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),triangles,meshes:gltf.meshes.length,embeddedImages:gltf.images.length,validation};
  fs.writeFileSync(path.join(output,`glb-validation-lod${lod}.json`),JSON.stringify(report,null,2)+'\n');reports.push(report);
  console.log(JSON.stringify({file:filename,bytes:bytes.length,triangles,errors:validation.issues.numErrors,warnings:validation.issues.numWarnings,messages:validation.issues.messages.slice(0,5)}));
  assert.equal(validation.issues.numErrors,0,filename+' is not conformant');
 }
 assert.ok(reports[0].triangles>reports[1].triangles&&reports[1].triangles>reports[2].triangles);console.log('DOG_WEB_LODS_VALID');
}
main().catch(error=>{console.error(error);process.exitCode=1});
