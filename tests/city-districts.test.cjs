const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {cityDistricts,cityBlockPlan,cityDistrictReserved,nearestCityDistrict}=require('../app/city-districts.ts'),{motherboardBounds}=require('../app/world-config.ts');

test('authored district centers span the enlarged board while preserving the original core',()=>{
  assert.equal(new Set(cityDistricts.map(district=>district.id)).size,6);
  for(const district of cityDistricts){assert.ok(district.x-44>motherboardBounds.minX&&district.x+44<motherboardBounds.maxX);assert.ok(district.z-44>motherboardBounds.minZ&&district.z+44<motherboardBounds.maxZ);assert.ok(cityDistrictReserved(district.x,district.z));assert.equal(nearestCityDistrict(district.x,district.z),district)}
  assert.equal(cityDistrictReserved(0,19),false);
});

test('city blocks have distinct layouts, eight human-scale buildings, and a continuous central alley',()=>{
  const signatures=new Set();
  for(let column=0;column<4;column++){
    const plan=cityBlockPlan(column,0);signatures.add(JSON.stringify(plan.map(({x,z})=>[x,z])));assert.equal(plan.length,8);
    for(const lot of plan){assert.ok(lot.scale<2);assert.ok(Math.abs(lot.x)+lot.scale*2.6<40&&Math.abs(lot.z)+lot.scale*2.6<40);assert.ok(Math.abs(lot.x)>8||Math.abs(lot.z)>20)}
    for(let index=0;index<plan.length;index++)for(const other of plan.slice(index+1))assert.ok(Math.hypot(plan[index].x-other.x,plan[index].z-other.z)>12);
  }
  assert.equal(signatures.size,4);
});
