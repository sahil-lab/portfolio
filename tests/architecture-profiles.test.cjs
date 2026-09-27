const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {architectureProfiles,planetArchitectureFor,architectureRecipe}=require('../app/architecture-profiles.ts');
const {transitStops}=require('../app/transit-config.ts');
test('all existing planets use different roof systems and architectural families',()=>{
 const styles=transitStops.map(planetArchitectureFor);assert.equal(new Set(styles).size,transitStops.length);assert.equal(new Set(styles.map(style=>architectureProfiles[style].roof)).size,styles.length);
});
test('every building address has a deterministic geometric recipe, not a repeated color variant',()=>{
 for(const style of Object.keys(architectureProfiles)){
  const recipes=new Set(),massings=new Set(),attachments=new Set();
  for(let index=0;index<1200;index++){
   const recipe=architectureRecipe(style,'lot-'+index);assert.deepEqual(recipe,architectureRecipe(style,'lot-'+index));
   const {id,seed,...geometry}=recipe;assert.ok(id.endsWith('lot-'+index));assert.ok(Number.isInteger(seed));recipes.add(JSON.stringify(geometry));massings.add(recipe.massing);attachments.add(recipe.attachment);
   assert.ok(recipe.width>.8&&recipe.width<1&&recipe.depth>.8&&recipe.depth<1);
  }
  assert.equal(recipes.size,1200,style);assert.equal(massings.size,5);assert.equal(attachments.size,4);
 }
});
