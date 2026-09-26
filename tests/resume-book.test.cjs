const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),ts=require('typescript'),T=require('three');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
const {createResumeBooks,resumeBookSites,resumeBookSize}=require('../app/resume-book.ts');
const manifest=require('../public/assets/resume-book/pages.json');
function canvasDocument(){return {createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})}}
test('all three resume images preserve the current source PDF and contain text',()=>{
 assert.equal(manifest.pageCount,3);assert.equal(manifest.pages.length,3);
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync('public'+manifest.pdf)).digest('hex'),manifest.sourceSha256);
 for(const page of manifest.pages){assert.ok(page.text.length>2000);assert.equal(page.width,2048);assert.ok(page.height>2800);assert.ok(fs.statSync('public'+page.image).size>10000)}
});
test('medium resume books sit right of weather and beside the statue with readable front and back spreads',async context=>{
 const original=global.document;global.document=canvasDocument();context.after(()=>{global.document=original});
 const scene=new T.Scene(),player=new T.Group(),opened=[],textures=[];
 const display=createResumeBooks(scene,player,{open:(site,page)=>opened.push({site,page}),loadTexture:async url=>{const texture=new T.Texture();texture.name=url;textures.push(texture);return texture}});await display.ready;
 assert.ok(display.loaded);assert.equal(display.books.length,2);assert.ok(resumeBookSites[0].x-resumeBookSize.width/2>14.2);assert.ok(Math.hypot(resumeBookSites[1].x-150,resumeBookSites[1].z+121)<45);assert.ok(resumeBookSize.height<16.875);
 for(const book of display.books){
  const left=book.leaves[0],right=book.leaves[1];assert.equal(left.front.material.map.name,manifest.pages[0].image);assert.equal(right.front.material.map.name,manifest.pages[1].image);
  for(const leaf of book.leaves){assert.equal(leaf.front.material,leaf.back.material);assert.equal(leaf.back.position.x,-leaf.front.position.x);assert.ok(new T.Vector3(0,0,1).applyQuaternion(leaf.front.quaternion).z>.98);assert.ok(new T.Vector3(0,0,1).applyQuaternion(leaf.back.quaternion).z<-.98)}
  assert.ok(book.setSpread(1));assert.equal(left.front.material.map.name,manifest.pages[2].image);assert.equal(left.back.userData.resumePage,3);assert.equal(book.setSpread(2),false);
  for(const side of [-1,1]){player.position.set(book.site.x,.8,book.site.z+side*6);assert.equal(display.near(),book);assert.ok(display.interact());assert.deepEqual(opened.at(-1),{site:book.site.id,page:3})}
  assert.ok(display.blocked(book.site.x,book.site.z,.8));assert.equal(display.blocked(book.site.x,book.site.z+6,.8),false);
 }
 const position=display.books[0].group.position.clone();scene.scale.setScalar(2);scene.updateMatrixWorld(true);assert.deepEqual(display.books[0].group.position,position);
 display.dispose();assert.equal(scene.children.length,0);
});
