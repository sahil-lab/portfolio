const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {createSpatialIndex}=require('../app/spatial-index.ts'),{sceneryCollision}=require('../app/collision-world.ts');
test('spatial collision candidates preserve exact clearance and vertical semantics',()=>{
 const boxes=Array.from({length:1200},(_,index)=>({x:index%40*8-160,z:Math.floor(index/40)*8-120,y:index%4*2,w:2+index%5,h:1+index%3,d:3})),buildings=[{x:-12,z:-9,w:12,d:18,y:0,h:9}],collision=sceneryCollision(boxes,buildings);
 const reference=(x,z,feet)=>buildings.some(object=>Math.abs(x-object.x)<object.w/2+.4&&Math.abs(z-object.z)<object.d/2+.4&&feet+2.3>object.y&&feet<object.y+object.h-.02)||boxes.some(object=>Math.abs(x-object.x)<object.w/2+.4&&Math.abs(z-object.z)<object.d/2+.4&&feet+2.3>object.y-object.h/2&&feet<object.y+object.h/2-.02);
 for(let index=0;index<8000;index++){const x=(index*1.731%350)-175,z=(index*2.479%280)-140,height=index%11-3;assert.equal(collision(x,z,height),reference(x,z,height),JSON.stringify({x,z,height}))}
 boxes.push({x:900,y:1,z:900,w:4,h:4,d:4});assert.equal(collision(900,900,.8),true);
});
test('large world boxes are bounded separately and local queries do not scan unrelated cells',()=>{
 const values=Array.from({length:1000},(_,index)=>({minX:index*30,maxX:index*30+2,minZ:0,maxZ:2}));values.push({minX:-20000,maxX:20000,minZ:-20000,maxZ:20000});const index=createSpatialIndex(values,value=>value);
 assert.equal(index.at(1,1).length,1);assert.equal(index.broad.length,1);assert.equal(index.at(-900,100).length,0);assert.ok(index.cellCount<2000);
 const selected=new Set();index.query({minX:0,maxX:35,minZ:0,maxZ:3},selected);assert.equal(selected.size,3);index.query({minX:90000,maxX:90010,minZ:0,maxZ:3},selected);assert.equal(selected.size,1);
});
test('venue and tilted grove indexing preserve brute-force collision results for varying radii',()=>{
 global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText:text=>({width:text.length*25})},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};
 const T=require('three'),{createEverydayPlace}=require('../app/everyday-places.ts'),{createCanopyGrove}=require('../app/canopy-grove.ts'),{disposeScene}=require('../app/scene-resources.ts'),venue=createEverydayPlace({kind:'mall',style:'atelier',address:'indexed-mall'}),grove=createCanopyGrove([{id:'angled',kind:'banyan',position:new T.Vector3(12,4,8),rotation:new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),1.2),scale:1.2,patch:'one'}]),point=new T.Vector3(),offset=new T.Vector3();
 for(let index=0;index<3000;index++){
  point.set(index*1.723%70-35,index*.793%28-6,index*2.493%60-30);const padding=index%3===0?6:.4;
  assert.equal(venue.blocked(point,padding),venue.solids.some(solid=>point.y<solid.max.y+.4&&point.y>solid.min.y-.4&&point.x>solid.min.x-padding&&point.x<solid.max.x+padding&&point.z>solid.min.z-padding&&point.z<solid.max.z+padding));
  const reference=grove.columns.some(column=>{offset.copy(point).sub(column.position);const height=offset.dot(column.up);if(height<-.5-padding||height>column.height+.1)return false;offset.addScaledVector(column.up,-height);return offset.lengthSq()<(column.radius+padding)**2});assert.equal(grove.blocked(point,padding),reference);
 }disposeScene(venue.root);disposeScene(grove.root);delete global.document;
});
