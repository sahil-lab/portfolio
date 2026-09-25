const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {validateBytes}=require('gltf-validator');

async function main(){
 const output=path.resolve('outputs/reference-dog'),filename=path.join(output,'reference-dog.glb'),bytes=fs.readFileSync(filename);
 assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const jsonLength=bytes.readUInt32LE(12);assert.equal(bytes.readUInt32LE(16),0x4e4f534a);
 const gltf=JSON.parse(bytes.toString('utf8',20,20+jsonLength));
 assert.ok(gltf.images?.length>=2,'Expected embedded undercoat and strand textures');
 assert.ok(gltf.images.every(image=>image.bufferView!==undefined&&!image.uri),'GLB must be self-contained');
 assert.ok(gltf.nodes.some(node=>node.name==='Dog_Continuous_QuadDerived_Skin'));
 assert.ok(gltf.nodes.some(node=>node.name==='Groom_Curled_Brown_Root_White_Tail_Plume'));
 assert.ok(gltf.nodes.every(node=>!node.name?.startsWith('Studio')&&!node.name?.startsWith('REF_')),'Studio and references must not leak into GLB');
 let primitives=0;
 for(const mesh of gltf.meshes)for(const primitive of mesh.primitives){
  primitives++;assert.notEqual(primitive.attributes.NORMAL,undefined,'Missing normals');assert.notEqual(primitive.attributes.TEXCOORD_0,undefined,'Missing UVs');assert.notEqual(primitive.material,undefined,'Missing material');
 }
 const report=await validateBytes(new Uint8Array(bytes),{uri:'reference-dog.glb',maxIssues:2000});
 const result={sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,meshes:gltf.meshes.length,primitives,materials:gltf.materials.length,embeddedImages:gltf.images.length,validator:report};
 fs.writeFileSync(path.join(output,'glb-validation.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({bytes:result.bytes,meshes:result.meshes,materials:result.materials,images:result.embeddedImages,errors:report.issues.numErrors,warnings:report.issues.numWarnings,messages:report.issues.messages.slice(0,10)},null,2));
 assert.equal(report.issues.numErrors,0,'Khronos GLB validation failed');console.log('REFERENCE_DOG_GLB_VALID');
}
main().catch(error=>{console.error(error);process.exitCode=1});
