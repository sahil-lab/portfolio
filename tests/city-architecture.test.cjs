const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createCityBuilding,cityBlock}=require('../app/city-architecture.ts'),{disposeScene}=require('../app/scene-resources.ts');
const {mergeGeometries}=require('three/addons/utils/BufferGeometryUtils.js'),{createHash}=require('node:crypto');

function geometrySignature(root){
  const hash=createHash('sha256');root.updateMatrixWorld(true);
  root.traverse(object=>{
    if(!(object instanceof T.Mesh))return;
    hash.update(JSON.stringify([object.name,object.matrixWorld.elements,object.material.color.getHex()]));
    for(const attribute of Object.values(object.geometry.attributes))hash.update(Buffer.from(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength));
  });
  return hash.digest('hex');
}

test('city buildings use shaped corners, defined storeys, inset windows and planted roofs within known bounds',()=>{
  for(const variant of [0,1,2])for(const height of [3,5.7,8]){
    const building=createCityBuilding({accent:'#e77c67',height,variant});
    assert.ok(building.root.getObjectByName('City_RoundedShell').userData.cameraSolid);
    assert.ok(building.root.getObjectByName('City_ArtificialTurfRoof'));
    assert.ok(building.root.getObjectByName('City_RecessedBlueWindow'));
    if(height>4.5)assert.ok(building.root.getObjectByName('City_BalconyHandrail'));
    const bounds=new T.Box3().setFromObject(building.root);assert.ok(bounds.max.x<=2.1);assert.ok(bounds.min.x>=-2.1);assert.ok(bounds.max.y<height+1.6);assert.ok(bounds.max.z<2.3);assert.ok(bounds.min.z>-2.3);assert.ok(bounds.min.y>=-.00001);
    disposeScene(building.root);
  }
});

test('rounded architecture retains finite geometry and exact dimensions',()=>{
  const geometry=cityBlock(4.8,1,4.8,.25);geometry.computeBoundingBox();const size=geometry.boundingBox.getSize(new T.Vector3());
  assert.ok(Math.abs(size.x-4.8)<.00001&&Math.abs(size.y-1)<.00001);assert.ok(Array.from(geometry.attributes.normal.array).every(Number.isFinite));geometry.dispose();
});

test('city residences have matte ceramic finishes, fitted canopies and usable storefront proportions',()=>{
  const building=createCityBuilding({accent:'#f18d83'});
  for(const name of ['City_RearPanorama','City_WindowSill','City_CanopySoffit','City_CanopyBracket','City_EntryCallbox','City_ServiceSocket','City_RoofPlanter'])assert.ok(building.root.getObjectByName(name),name);
  assert.equal(building.root.getObjectByName('City_StripedAwning'),undefined);assert.equal(building.root.getObjectByName('City_AwningScallop'),undefined);
  assert.ok(building.material.paint.clearcoat<=.25);assert.ok(building.material.paint.roughness>=.6);
  const shell=building.root.getObjectByName('City_RoundedShell');assert.ok(shell.geometry.attributes.position.count<=324);
  const canopy=new T.Box3().setFromObject(building.root.getObjectByName('City_EntranceCanopy')),entrance=new T.Box3().setFromObject(building.root.getObjectByName('City_EntranceSurround'));
  assert.ok(canopy.min.x<entrance.min.x&&canopy.max.x>entrance.max.x);assert.ok(canopy.max.z>entrance.max.z);assert.ok(canopy.min.y>entrance.max.y);
  assert.ok(entrance.getSize(new T.Vector3()).y>=1.8&&entrance.getSize(new T.Vector3()).y<=2.1);
  disposeScene(building.root);
});

test('the world finishing pass preserves authored ceramic paint and facade colors',()=>{
  const {finishKingdomMaterials}=require('../app/kingdom-art.ts'),building=createCityBuilding({accent:'#f18d83'}),color=building.material.paint.color.getHex();
  finishKingdomMaterials(building.root);
  assert.equal(building.material.paint.color.getHex(),color);assert.equal(building.material.paint.roughness,.66);assert.equal(building.material.paint.clearcoat,.18);
  assert.equal(building.material.pearl.roughness,.76);assert.equal(building.material.wood.roughness,.86);assert.equal(building.material.sage.roughness,.82);
  assert.equal(building.material.lawn.roughness,.96);disposeScene(building.root);
});

test('corner profiles remove full-height square corners and the upper body is genuinely set back',()=>{
  for(const variant of [0,1,2]){
    const building=createCityBuilding({accent:'#f18d83',variant}),shell=building.root.getObjectByName('City_RoundedShell'),upper=building.root.getObjectByName('City_UpperSetback');
    const lowerBounds=new T.Box3().setFromObject(shell),upperBounds=new T.Box3().setFromObject(upper),positions=shell.geometry.attributes.position;
    assert.ok(upper.userData.cameraSolid);
    assert.ok(upperBounds.min.x>lowerBounds.min.x+.1&&upperBounds.max.x<lowerBounds.max.x-.1);
    assert.ok(upperBounds.min.z>lowerBounds.min.z+.1&&upperBounds.max.z<lowerBounds.max.z-.1);
    assert.ok(Math.abs(upperBounds.max.y-(building.height+.22))<.00001);
    let diagonalNormals=0;
    for(let vertex=0;vertex<positions.count;vertex++){
      assert.ok(Math.abs(positions.getX(vertex))<building.width/2-.04||Math.abs(positions.getZ(vertex))<building.depth/2-.04);
      const normal=shell.geometry.attributes.normal;if(Math.abs(normal.getX(vertex))>.1&&Math.abs(normal.getZ(vertex))>.1)diagonalNormals++;
    }
    assert.ok(diagonalNormals>0);disposeScene(building.root);
  }
});

test('rounded window frames have real openings with glazing behind the reveal',()=>{
  for(const variant of [0,1,2]){
    const building=createCityBuilding({accent:'#e77c67',variant});let checked=0;
    building.root.traverse(object=>{
      if(!(object instanceof T.Mesh)||!['City_RecessedBlueWindow','City_RearPanorama','City_SidePanorama','City_EntranceGlass'].includes(object.name))return;
      const frame=object.parent.children.find(child=>child instanceof T.Mesh&&child!==object&&child.geometry.parameters?.shapes?.holes?.length===1);
      assert.ok(frame,object.name);frame.geometry.computeBoundingBox();object.geometry.computeBoundingBox();
      const frameFront=frame.geometry.boundingBox.max.z+frame.position.z,paneFront=object.geometry.boundingBox.max.z+object.position.z;
      assert.ok(frameFront-paneFront>.09);assert.ok(object.geometry.parameters.shapes.getPoints(3).length>8);
      const ray=new T.Raycaster(new T.Vector3(0,0,1),new T.Vector3(0,0,-1)),frameProbe=new T.Mesh(frame.geometry,frame.material),paneProbe=new T.Mesh(object.geometry,object.material);
      frameProbe.updateMatrixWorld();paneProbe.updateMatrixWorld();assert.equal(ray.intersectObject(frameProbe).length,0);assert.ok(ray.intersectObject(paneProbe).length>0);
      checked++;
    });
    assert.ok(checked>=9);disposeScene(building.root);
  }
});

test('three authored variants are deterministic and existing expansion parameters select all three',()=>{
  const signatures=new Set();
  for(const variant of [0,1,2]){
    const options={accent:'#e77c67',variant},first=createCityBuilding(options),second=createCityBuilding(options);
    const signature=geometrySignature(first.root);assert.equal(signature,geometrySignature(second.root));signatures.add(signature);
    assert.equal(first.root.userData.architectureVariant,variant);assert.equal(Boolean(first.root.getObjectByName('City_RoofMonitor')),variant!==0);
    assert.equal(Boolean(first.root.getObjectByName('City_RoofCoolingFin')),variant===2);
    disposeScene(first.root);disposeScene(second.root);
  }
  assert.equal(signatures.size,3);
  const inferred=new Set(),accents=['#f0a18d','#8bc9b0','#89badb','#eccb7c','#dca8ad','#b9d9d3'],heights=[5.6,7.2,8.4,6.5,4.8,7.6];
  accents.forEach((accent,index)=>{
    const options={accent,width:4.6,depth:4.2,height:heights[index]},building=createCityBuilding(options),repeat=createCityBuilding(options);
    inferred.add(building.root.userData.architectureVariant);assert.equal(geometrySignature(building.root),geometrySignature(repeat.root));disposeScene(building.root);disposeScene(repeat.root);
  });
  assert.deepEqual([...inferred].sort(),[0,1,2]);
  for(const [requested,expected] of [[-1,2],[3,0],[4.8,1]]){
    const building=createCityBuilding({accent:'#e77c67',variant:requested});assert.equal(building.root.userData.architectureVariant,expected);disposeScene(building.root);
  }
});

test('all variants honor unplanted roofs, explicit glazing and scaled footprints',()=>{
  for(const variant of [0,1,2])for(const [width,depth] of [[2.6,2.4],[4.6,4.2],[6.2,5]]){
    const building=createCityBuilding({accent:'#e77c67',glass:'#8bc9db',roofGarden:false,width,depth,height:8,variant}),bounds=new T.Box3().setFromObject(building.root);
    for(const name of ['City_ArtificialTurfRoof','City_RoofPlanter','City_SculptedShrub','City_RoofBench'])assert.equal(building.root.getObjectByName(name),undefined);
    assert.equal(building.material.glass.color.getHexString(),'8bc9db');
    assert.ok(bounds.max.x<=width/2+.25&&bounds.min.x>=-width/2-.25);assert.ok(bounds.max.z<depth/2+.7&&bounds.min.z>-depth/2-.7);assert.ok(bounds.max.y<9.6);
    disposeScene(building.root);
  }
});

test('architecture geometry has finite positions, unit normals and a bounded polygon and material budget',()=>{
  for(const variant of [0,1,2])for(const height of [3,5.7,8]){
    const building=createCityBuilding({accent:'#e77c67',height,variant}),materials=new Set();let triangles=0,meshes=0;
    building.root.traverse(object=>{
      if(!(object instanceof T.Mesh))return;
      const geometry=object.geometry,normal=geometry.attributes.normal;meshes++;triangles+=(geometry.index?.count??geometry.attributes.position.count)/3;materials.add(object.material);
      assert.deepEqual(Object.keys(geometry.attributes).sort(),['normal','position','uv']);
      for(const attribute of Object.values(geometry.attributes))assert.ok(Array.from(attribute.array).every(Number.isFinite),object.name);
      for(let vertex=0;vertex<normal.count;vertex++)assert.ok(Math.abs(Math.hypot(normal.getX(vertex),normal.getY(vertex),normal.getZ(vertex))-1)<.00001,object.name);
      assert.ok(object.material instanceof T.MeshStandardMaterial);assert.equal(object.material.map,null);assert.equal(object.material.emissiveIntensity,1);assert.equal(object.material.emissive.getHex(),0);
    });
    assert.ok(triangles<6000,`${triangles} triangles`);assert.ok(meshes<=110,`${meshes} meshes`);assert.ok(materials.size<=8);
    disposeScene(building.root);
  }
});

test('factory keeps its dependency surface and supports the distant bakeModel merge contract',()=>{
  const imports=ts.preProcessFile(fs.readFileSync(require.resolve('../app/city-architecture.ts'),'utf8')).importedFiles.map(entry=>entry.fileName);
  assert.deepEqual(imports,['three','three/addons/geometries/RoundedBoxGeometry.js']);
  for(const variant of [0,1,2]){
    const building=createCityBuilding({width:4.6,height:8.4,depth:4.2,accent:'#89badb',variant}),groups=new Map(),baked=new T.Group();building.root.updateMatrixWorld(true);
    const originalBounds=new T.Box3().setFromObject(building.root);
    building.root.traverse(object=>{
      if(!(object instanceof T.Mesh))return;
      assert.ok(!Array.isArray(object.material));
      const geometry=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();geometry.applyMatrix4(object.matrixWorld);
      const list=groups.get(object.material)??[];list.push(geometry);groups.set(object.material,list);
    });
    for(const [material,geometries] of groups){
      const merged=mergeGeometries(geometries);assert.ok(merged);assert.equal(merged.attributes.position.count,geometries.reduce((count,geometry)=>count+geometry.attributes.position.count,0));
      const instance=new T.InstancedMesh(merged,material,1);instance.setMatrixAt(0,new T.Matrix4());instance.computeBoundingBox();instance.computeBoundingSphere();assert.ok(Number.isFinite(instance.boundingSphere.radius));baked.add(instance);
      geometries.forEach(geometry=>geometry.dispose());
    }
    const bakedBounds=new T.Box3().setFromObject(baked);assert.ok(bakedBounds.min.distanceTo(originalBounds.min)<.00001);assert.ok(bakedBounds.max.distanceTo(originalBounds.max)<.00001);
    baked.traverse(object=>{if(object instanceof T.Mesh)object.geometry.dispose()});disposeScene(building.root);
  }
});

test('static scenery batching retains lower and upper camera collision bounds',()=>{
  const {batchScenery}=require('../app/static-batching.ts'),scene=new T.Scene();
  for(const variant of [0,1,2]){
    const building=createCityBuilding({accent:'#e77c67',variant});building.root.position.x=variant*6;scene.add(building.root);
  }
  const before=new T.Box3().setFromObject(scene);batchScenery(scene,{});const after=new T.Box3().setFromObject(scene);
  assert.equal(scene.userData.staticCameraBounds.length,6);assert.ok(before.min.distanceTo(after.min)<.00001&&before.max.distanceTo(after.max)<.00001);
  assert.ok(scene.children.some(object=>object.name==='SceneryBatch'));disposeScene(scene);
});

