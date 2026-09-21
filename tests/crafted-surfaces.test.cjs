const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{craftedBox,createCraftMaterials}=require('../app/crafted-surfaces.ts');

test('crafted edges preserve architecture and collision dimensions',()=>{
  for(const dimensions of [[4,3,2],[.1,4,2],[110,2,264]]){
    const geometry=craftedBox(...dimensions);geometry.computeBoundingBox();
    assert.ok((geometry.index?.count??geometry.attributes.position.count)/3<=108,'Repeated edge geometry must remain within the primitive budget');
    const size=geometry.boundingBox.getSize(new T.Vector3()).toArray();
    size.forEach((value,index)=>assert.ok(Math.abs(value-dimensions[index])<.00001));
    assert.ok(Array.from(geometry.attributes.normal.array).every(Number.isFinite));geometry.dispose();
  }
});

test('ceramic and metal finishes share subtle grain but retain independent animated materials',()=>{
  const create=createCraftMaterials(),ceramic=create('#cceae5'),metal=create('#b6c9cc',0,.7),signal=create('#56e6d6',.8);
  assert.ok(ceramic instanceof T.MeshPhysicalMaterial);assert.ok(ceramic.clearcoat>0);
  assert.ok(metal.roughness<ceramic.roughness);assert.ok(metal.envMapIntensity>ceramic.envMapIntensity);
  assert.equal(ceramic.roughnessMap,metal.roughnessMap);assert.equal(signal.emissiveIntensity,.8);
  const other=create('#cceae5');ceramic.emissiveIntensity=2;assert.equal(other.emissiveIntensity,0);
  assert.ok(ceramic.bumpScale<.01);assert.ok(ceramic.roughnessMap.image.width<=64);
  assert.ok(ceramic.roughness>=.6);assert.ok(metal.roughness>=.4);assert.ok(ceramic.clearcoat<=.25);assert.ok(ceramic.bumpScale<.005);
  ceramic.roughnessMap.dispose();for(const material of [ceramic,metal,signal,other])material.dispose();
});
