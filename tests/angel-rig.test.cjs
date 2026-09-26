const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),T=require('three');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {createAngelRig}=require('../app/angel-rig.ts');
const {GLTFLoader}=require('three/addons/loaders/GLTFLoader.js');
async function rigAsset(){const bytes=fs.readFileSync('public/assets/anime-angel.glb');return createAngelRig((await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene)}
test('angel runtime skeleton preserves the real body, shoes and wing hinges with normalized skin weights',async()=>{
 const rig=await rigAsset();assert.equal(rig.legs.length,2);assert.equal(rig.arms.length,2);assert.ok(rig.bones.length>=16);assert.ok(rig.root.getObjectByName('ANGEL_Wing_L'));assert.ok(rig.root.getObjectByName('ANGEL_Wing_R'));
 assert.ok(rig.meshes.length>50);assert.ok(rig.meshes.some(mesh=>mesh.name==='ANGEL_Body'&&mesh.geometry.getAttribute('position').count>40000));
 for(const mesh of rig.meshes){const weights=mesh.geometry.getAttribute('skinWeight');for(let index=0;index<weights.count;index++){const total=weights.getX(index)+weights.getY(index)+weights.getZ(index)+weights.getW(index);assert.ok(Math.abs(total-1)<.00001,mesh.name)}}
 const body=rig.meshes.find(mesh=>mesh.name==='ANGEL_Body'),positions=body.geometry.getAttribute('position'),weights=body.geometry.getAttribute('skinWeight'),indices=body.geometry.getAttribute('skinIndex');let wristVertices=0;
 const armBones=new Set(rig.arms.flatMap(arm=>[arm.upper,arm.lower,arm.hand]));
 for(let index=0;index<positions.count;index++)if(Math.abs(positions.getX(index))>rig.height*.135&&positions.getY(index)>rig.height*.44&&positions.getY(index)<rig.height*.51){
  wristVertices++;let armWeight=0;for(let slot=0;slot<4;slot++)if(armBones.has(rig.bones[indices.getComponent(index,slot)]))armWeight+=weights.getComponent(index,slot);assert.ok(armWeight>.99,'wrist must not follow the thigh');
 }
 assert.ok(wristVertices>100);
 assert.ok(rig.meshes.some(mesh=>mesh.name==='ANGEL_Slide_Sole_1'));rig.dispose();
});
test('angel solved feet remain planted through walking and turning and stop on paused time',async()=>{
 const rig=await rigAsset(),placement=new T.Group();placement.add(rig.root);const matrix=new T.Matrix4(),sample=point=>({point:new T.Vector3(point.x,rig.sole,point.z),normal:new T.Vector3(0,1,0),stop:0});
 let previous=[],maximumDrift=0,contacts=0,swings=0;
 for(let frame=0;frame<600;frame++){
  const yaw=frame*.18/60;placement.rotation.y=yaw;placement.position.x+=Math.sin(yaw)*rig.height*.45/60;placement.position.z+=Math.cos(yaw)*rig.height*.45/60;placement.updateMatrixWorld(true);matrix.copy(placement.matrix);
  rig.update(1/60,{grounded:true,speed:rig.height*.45,run:false,turnRate:.18,matrix,sample,reduced:false,landing:0});
  const current=rig.legs.map((leg,index)=>({position:leg.foot.getWorldPosition(new T.Vector3()),planted:rig.gait.feet[index].planted}));
  if(frame>100)current.forEach((foot,index)=>{if(foot.planted&&previous[index].planted){contacts++;maximumDrift=Math.max(maximumDrift,foot.position.distanceTo(previous[index].position))}else swings++});previous=current;
 }
 assert.ok(contacts>200);assert.ok(swings>200);assert.ok(maximumDrift<.003,'Solved stance feet drifted '+maximumDrift);
 const pose=rig.bones.map(bone=>bone.quaternion.toArray());rig.update(0,{grounded:true,speed:2,run:true,turnRate:1,matrix,sample,reduced:false,landing:0});assert.deepEqual(rig.bones.map(bone=>bone.quaternion.toArray()),pose);rig.dispose();
});
