const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),T=require('three');
const {GLTFLoader}=require('three/addons/loaders/GLTFLoader.js');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

async function load(filename,field='architecturePart',count=14){
 const bytes=fs.readFileSync(filename),asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''),parts=new Map();
 asset.scene.traverse(object=>{if(object.isMesh&&object.userData[field]){assert.ok(!parts.has(object.userData[field]));parts.set(object.userData[field],object)}});
 assert.equal(parts.size,count);return {bytes,parts};
}

async function main(){
 const baseline=await load(path.resolve('public/assets/architecture-kit.glb')),candidate=await load(path.join(__dirname,'architecture-kit.glb'),'architecturePart',15),report={status:'roundtrip-verified-unpublished',baselineSha256:hash(baseline.bytes),candidateSha256:hash(candidate.bytes),candidateBytes:candidate.bytes.length,parts:[],triangles:0};
 assert.deepEqual(new Set(candidate.parts.keys()),new Set([...baseline.parts.keys(),'Architecture_DetailSphere']));assert.ok(candidate.bytes.length<1000000);
 for(const [name,mesh] of candidate.parts){
    const geometry=mesh.geometry,original=baseline.parts.get(name==='Architecture_DetailSphere'?'Architecture_Sphere':name).geometry;geometry.computeBoundingBox();original.computeBoundingBox();const error=Math.max(geometry.boundingBox.min.distanceTo(original.boundingBox.min),geometry.boundingBox.max.distanceTo(original.boundingBox.max));assert.ok(error<.00002,name);
  for(const attribute of ['position','normal','color']){assert.ok(geometry.attributes[attribute],name+'/'+attribute);assert.ok([...geometry.attributes[attribute].array].every(Number.isFinite),name+'/'+attribute)}
  let normalError=0;const normals=geometry.attributes.normal;for(let index=0;index<normals.count;index++)normalError=Math.max(normalError,Math.abs(new T.Vector3().fromBufferAttribute(normals,index).length()-1));assert.ok(normalError<.001,name+'/normals');
  const triangles=(geometry.index?.count??geometry.attributes.position.count)/3;assert.ok(triangles<3000,name);report.triangles+=triangles;report.parts.push({name,triangles,originalTriangles:(original.index?.count??original.attributes.position.count)/3,boundsError:error,normalError});
 }
 for(const name of ['Architecture_ConservatoryRoof','Architecture_Vault']){const geometry=candidate.parts.get(name).geometry,box=geometry.boundingBox,ray=new T.Raycaster(new T.Vector3((box.min.x+box.max.x)/2,box.min.y+(box.max.y-box.min.y)*.35,box.max.z+2),new T.Vector3(0,0,-1)),mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));mesh.updateMatrixWorld(true);assert.equal(ray.intersectObject(mesh).length,0,name+' opening');mesh.material.dispose()}
 for(const name of ['Architecture_Block','Architecture_Dome','Architecture_DetailSphere']){const part=report.parts.find(part=>part.name===name);assert.ok(part.triangles>part.originalTriangles,name)}assert.ok(report.triangles<15000);
 const kitOriginal=await load(path.resolve('public/assets/kingdom-world-kit.glb'),'kitPart',21),kit=await load(path.join(__dirname,'kingdom-world-kit.glb'),'kitPart',21);assert.deepEqual(new Set(kit.parts.keys()),new Set(kitOriginal.parts.keys()));let kitTriangles=0;
 for(const [name,mesh] of kit.parts){assert.equal(mesh.name,name);const original=kitOriginal.parts.get(name).geometry;mesh.geometry.computeBoundingBox();original.computeBoundingBox();assert.ok(mesh.geometry.boundingBox.min.distanceTo(original.boundingBox.min)<.00002,name);assert.ok(mesh.geometry.boundingBox.max.distanceTo(original.boundingBox.max)<.00002,name);for(const key of ['position','normal','color']){assert.ok(mesh.geometry.attributes[key],name+'/'+key);assert.ok([...mesh.geometry.attributes[key].array].every(Number.isFinite))}assert.ok(mesh.userData.kitTint.every(value=>value>0));kitTriangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3}
 assert.ok(kitTriangles<30000);assert.ok(kit.bytes.length<1500000);report.worldKit={parts:21,bytes:kit.bytes.length,triangles:kitTriangles,baselineSha256:hash(kitOriginal.bytes),candidateSha256:hash(kit.bytes)};
 fs.writeFileSync(path.join(__dirname,'architecture-verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1});
