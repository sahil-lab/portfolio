const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three');
global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText(text){return {width:text.length*parseFloat(this.font.split(' ')[1])*.55}}},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};
const {createPlanetSurface}=require('../app/planet-geography.ts'),{planetTowns}=require('../app/planet-infrastructure.ts'),{createPlanetPopulation}=require('../app/planet-population.ts'),{transitStops}=require('../app/transit-config.ts'),{disposeScene}=require('../app/scene-resources.ts');
function populationFor(stop=transitStops[2]){const scene=new T.Scene(),surface=createPlanetSurface(stop,96),population=createPlanetPopulation(scene,surface,planetTowns(surface));return {scene,population}}
function instancePose(mesh,index){const matrix=new T.Matrix4(),position=new T.Vector3(),rotation=new T.Quaternion(),scale=new T.Vector3();mesh.getMatrixAt(index,matrix);matrix.decompose(position,rotation,scale);return {matrix,position,rotation,scale}}

test('all configured planet residents retain cheap instancing with four fitted occupational profiles',()=>{
 let count=0;
 for(const stop of transitStops.slice(1)){
  const {scene,population}=populationFor(stop),meshes=population.root.children.filter(object=>object instanceof T.Mesh);count+=population.residents.length;
  assert.equal(population.residents.length,66);assert.equal(new Set(population.residents.map(resident=>resident.occupation)).size,4);
  assert.equal(meshes.length,14);assert.ok(meshes.every(mesh=>mesh instanceof T.InstancedMesh));
  const residentMeshes=meshes.filter(mesh=>mesh.name.startsWith('Planet_Resident'));assert.equal(residentMeshes.length,10);
  const triangles=residentMeshes.reduce((sum,mesh)=>sum+(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*mesh.count,0);
  assert.ok(triangles<=760*population.residents.length,`resident triangle budget: ${triangles}`);
  for(const name of ['Heads','Faces','Collars','Equipment','Headwear','Smiles'])assert.equal(population.root.getObjectByName('Planet_Resident'+name).count,66);
  assert.equal(population.root.getObjectByName('Planet_ResidentArms').count,132);disposeScene(scene);
 }
 assert.equal(count,(transitStops.length-1)*66);assert.ok(count>=198);
});

test('yielding residents plant their feet, keep their speech and reopen their eyes in reduced motion',()=>{
 const {scene,population}=populationFor(),player=new T.Group(),resident=population.residents[0];player.position.copy(resident.position);
 const feet=population.root.getObjectByName('Planet_ResidentFeet'),eyes=population.root.getObjectByName('Planet_ResidentEyes'),rest=instancePose(feet,0).matrix.clone();
 assert.ok(population.interact(player.position));population.update(.1,false,player,true);assert.equal(resident.moving,false);
 const planted=instancePose(feet,0).matrix;assert.ok(planted.elements.every((value,index)=>Math.abs(value-rest.elements[index])<1e-6));assert.equal(population.speech.sprite.visible,true);
 player.position.set(1000,1000,1000);for(let frame=0;frame<38;frame++)population.update(.1,false,player,true);
 population.update(.1,true,player,true);
 for(let index=0;index<4;index++)assert.ok(Math.abs(instancePose(eyes,index*2).scale.y-[.05,.058,.047,.055][index])<1e-6);
 const before=population.residents.map(actor=>actor.position.clone());population.update(.1,true,player,true);assert.ok(population.residents.some((actor,index)=>actor.position.distanceTo(before[index])>0));disposeScene(scene);
});

test('off-world culling skips instance uploads and all animated geometry stays within the prior resident footprint',()=>{
 const {scene,population}=populationFor(),player=new T.Group();player.position.set(1000,1000,1000);
 for(let frame=0;frame<24;frame++)population.update(.1,false,player,true);
 const meshes=population.root.children.filter(object=>object instanceof T.InstancedMesh),versions=meshes.map(mesh=>mesh.instanceMatrix.version),positions=population.residents.map(resident=>resident.position.clone());
 population.update(.1,false,player,false);assert.equal(population.root.visible,false);assert.equal(population.speech.sprite.visible,false);
 assert.deepEqual(meshes.map(mesh=>mesh.instanceMatrix.version),versions);assert.ok(population.residents.every((resident,index)=>resident.position.equals(positions[index])));
 for(const delta of [NaN,Infinity,-1,0,.1])population.update(delta,false,player,true);
 for(const mesh of meshes){
  assert.ok(Array.from(mesh.instanceMatrix.array).every(Number.isFinite));if(!mesh.name.startsWith('Planet_Resident'))continue;
  const paired=mesh.count===population.residents.length*2,vertex=new T.Vector3(),inverse=new T.Quaternion(),attributes=mesh.geometry.attributes.position;
    const radius=mesh.name==='Planet_ResidentFeet'?Math.hypot(.2+.23/2,.16+.39/2)+.001:.425;
  for(let index=0;index<mesh.count;index++){
   const resident=population.residents[paired?Math.floor(index/2):index],{matrix}=instancePose(mesh,index);inverse.copy(resident.rotation).invert();
   for(let point=0;point<attributes.count;point++){
    vertex.fromBufferAttribute(attributes,point).applyMatrix4(matrix).sub(resident.position).applyQuaternion(inverse);
    assert.ok(Math.hypot(vertex.x,vertex.z)<radius,`${mesh.name} crossed its original visual reach`);
    assert.ok(vertex.y>-.001&&vertex.y<1.94,`${mesh.name} crossed the original height envelope`);
   }
  }
 }
 disposeScene(scene);
});
