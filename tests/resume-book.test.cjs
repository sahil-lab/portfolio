const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),ts=require('typescript'),T=require('three');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
const {createResumeBooks,resumeBookSites,resumeBookSize}=require('../app/resume-book.ts');
const manifest=require('../public/assets/resume-book/pages.json');
function canvasDocument(){return {createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})}}
test('all three resume images preserve the current source PDF and contain text',()=>{
 assert.equal(manifest.pageCount,3);assert.equal(manifest.pages.length,3);
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync('public'+manifest.pdf)).digest('hex'),manifest.sourceSha256);
 for(const page of manifest.pages){assert.ok(page.text.length>2000);assert.equal(page.width,2048);assert.ok(page.height>2800);assert.ok(fs.statSync('public'+page.image).size>10000);assert.match(page.previewImage,/-preview\.webp$/);assert.ok(fs.statSync('public'+page.previewImage).size<160000)}
});
test('full-resolution resume pages are not requested before approaching a book',async context=>{
 const original=global.document;global.document=canvasDocument();context.after(()=>{global.document=original});
 const requests=[],display=createResumeBooks(new T.Scene(),new T.Group(),{open(){},loadTexture:async url=>{requests.push(url);return new T.Texture()}});
 await display.ready;
 try{assert.equal(requests.some(url=>manifest.pages.some(page=>page.image===url)),false,'startup eagerly requested a full-resolution resume page');assert.equal(display.books.length,2)}finally{display.dispose()}
});
test('resume detail residency is shared, bounded and released after leaving or hiding',async context=>{
 const original=global.document;global.document=canvasDocument();context.after(()=>{global.document=original});
 const player=new T.Group(),requests=[],released=[],display=createResumeBooks(new T.Scene(),player,{open(){},loadTexture:async url=>{requests.push(url);const texture=new T.Texture();texture.name=url;texture.addEventListener('dispose',()=>released.push(url));return texture}});
 await display.ready;const now=performance.now(),book=display.books[0];player.position.set(book.site.x,.8,book.site.z+6);display.update(true,player.position,now);await display.ready;
 assert.deepEqual(display.detailStats,{resident:2,pending:0,wanted:2});assert.equal(requests.filter(url=>url===manifest.pages[0].image).length,1);assert.equal(display.books[0].leaves[0].front.material.map,display.books[1].leaves[0].front.material.map);
 book.setSpread(1);await display.ready;assert.deepEqual(display.detailStats,{resident:1,pending:0,wanted:1});assert.ok(released.includes(manifest.pages[0].image));assert.ok(released.includes(manifest.pages[1].image));
 player.position.set(10000,.8,10000);display.update(true,player.position,now+10000);assert.deepEqual(display.detailStats,{resident:0,pending:0,wanted:0});assert.equal(book.leaves[0].front.material.map.name,manifest.pages[2].previewImage);
 player.position.set(book.site.x,.8,book.site.z+6);display.update(true,player.position,now+11000);await display.ready;assert.equal(display.detailStats.resident,1);global.document.hidden=true;display.update(true);assert.equal(display.detailStats.resident,0);assert.equal(book.leaves[0].front.material.map.name,manifest.pages[2].previewImage);display.dispose();
});
test('resume detail loads are sequential and late arrivals cannot restore retired textures',async context=>{
 const original=global.document;global.document=canvasDocument();context.after(()=>{global.document=original});
 const player=new T.Group(),waiting=[],requests=[],released=[],display=createResumeBooks(new T.Scene(),player,{open(){},loadTexture:url=>{requests.push(url);if(manifest.pages.some(page=>page.image===url))return new Promise(resolve=>waiting.push({url,resolve}));return Promise.resolve(new T.Texture())}});
 await display.ready;const book=display.books[0];player.position.set(book.site.x,.8,book.site.z+6);display.update(true);assert.equal(waiting.length,1);assert.equal(display.detailStats.pending,1);
 display.update(false);const first=new T.Texture();first.addEventListener('dispose',()=>released.push('first'));waiting.shift().resolve(first);await display.ready;assert.deepEqual(display.detailStats,{resident:0,pending:0,wanted:0});assert.deepEqual(released,['first']);assert.equal(requests.filter(url=>url===manifest.pages[1].image).length,0);
 display.update(true,player.position,performance.now()+1000);assert.equal(waiting.length,1);display.dispose();const late=new T.Texture();late.addEventListener('dispose',()=>released.push('late'));waiting.shift().resolve(late);await display.ready;assert.deepEqual(released,['first','late']);assert.equal(display.detailStats.resident,0);
});
test('medium resume books sit right of weather and beside the statue with readable front and back spreads',async context=>{
 const original=global.document;global.document=canvasDocument();context.after(()=>{global.document=original});
 const scene=new T.Scene(),player=new T.Group(),opened=[],textures=[];
 const display=createResumeBooks(scene,player,{open:(site,page)=>opened.push({site,page}),loadTexture:async url=>{const texture=new T.Texture();texture.name=url;textures.push(texture);return texture}});await display.ready;
 assert.ok(display.loaded);assert.equal(display.books.length,2);assert.ok(resumeBookSites[0].x-resumeBookSize.width/2>14.2);assert.ok(Math.hypot(resumeBookSites[1].x-150,resumeBookSites[1].z+121)<45);assert.ok(resumeBookSize.height<16.875);
 for(const book of display.books){
    player.position.set(book.site.x,.8,book.site.z+6);display.update(true,player.position,performance.now()+1000);await display.ready;
  const left=book.leaves[0],right=book.leaves[1];assert.equal(left.front.material.map.name,manifest.pages[0].image);assert.equal(right.front.material.map.name,manifest.pages[1].image);
  for(const leaf of book.leaves){assert.equal(leaf.front.material,leaf.back.material);assert.equal(leaf.back.position.x,-leaf.front.position.x);assert.ok(new T.Vector3(0,0,1).applyQuaternion(leaf.front.quaternion).z>.98);assert.ok(new T.Vector3(0,0,1).applyQuaternion(leaf.back.quaternion).z<-.98)}
    assert.ok(book.setSpread(1));await display.ready;assert.equal(left.front.material.map.name,manifest.pages[2].image);assert.equal(left.back.userData.resumePage,3);assert.equal(book.setSpread(2),false);
  for(const side of [-1,1]){player.position.set(book.site.x,.8,book.site.z+side*6);assert.equal(display.near(),book);assert.ok(display.interact());assert.deepEqual(opened.at(-1),{site:book.site.id,page:3})}
  assert.ok(display.blocked(book.site.x,book.site.z,.8));assert.equal(display.blocked(book.site.x,book.site.z+6,.8),false);
 }
 const position=display.books[0].group.position.clone();scene.scale.setScalar(2);scene.updateMatrixWorld(true);assert.deepEqual(display.books[0].group.position,position);
 display.dispose();assert.equal(scene.children.length,0);
});
