const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),draws=[];
global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({font:'',measureText(text){return {width:text.length*(parseFloat(this.font.match(/([\d.]+)px/)?.[1])||20)*.57}},fillText(text,x,y,width){draws.push({text,x,y,width})}},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};
const {createBulletinWorld,bulletinSites,bulletinView,bulletinCameraView}=require('../app/bulletin-world.ts'),{emptyMarket,emptyNews,quoteFromYahoo}=require('../app/bulletin-data.ts'),{commonsVenues}=require('../app/creative-plaza.ts'),{disposeScene}=require('../app/scene-resources.ts');
const quotes=Array.from({length:19},(_,index)=>quoteFromYahoo({symbol:'TEST'+index,quoteType:'EQUITY',longName:'A publicly listed company '+index,regularMarketPrice:100.5,marketCap:1e11-index,regularMarketChangePercent:index%2?-1.5:1.5,regularMarketTime:1789761600,currency:'USD',marketState:'CLOSED'}));
const headlines=Array.from({length:8},(_,index)=>({title:'Business headline '+index+' with a readable market update for the board',source:'BBC Business',url:'https://www.bbc.com/news/articles/'+index,publishedAt:'2026-09-20T12:00:00.000Z'}));

test('market and news boards remain separate from shops, each other and the central avenue',()=>{
  const scene=new T.Scene(),player=new T.Group(),boards=createBulletinWorld(scene,player,()=>{});
  assert.ok(scene.getObjectByName('Market_Display'));assert.ok(scene.getObjectByName('News_Display'));
  assert.ok(bulletinSites.news.x-bulletinSites.markets.x>32);
  for(const venue of commonsVenues)for(const site of Object.values(bulletinSites))assert.ok(Math.abs(site.z-venue.z)>venue.depth/2+8);
  for(let z=139;z<=205;z+=.5)assert.equal(boards.blocked(0,z,.8),false);
  assert.equal(boards.blocked(bulletinSites.markets.x+12.5,156,.8),true);disposeScene(scene);
});

test('verified prices, sources, times and coverage render without placeholder market numbers',()=>{
  const scene=new T.Scene(),player=new T.Group(),boards=createBulletinWorld(scene,player,()=>{});draws.length=0;
  boards.setMarket({...emptyMarket,quotes,stockCount:19,status:'partial',fetchedAt:'2026-09-20T12:00:00.000Z'});boards.setNews({...emptyNews,headlines,sources:['BBC Business'],status:'available',fetchedAt:'2026-09-20T12:00:00.000Z'});
  assert.ok(draws.some(draw=>draw.text.includes('19 / 10,000')));assert.ok(draws.some(draw=>draw.text.includes('100.50 USD')));assert.ok(draws.some(draw=>draw.text.includes('MARKET CLOSED')));assert.ok(draws.some(draw=>draw.text.includes('BBC BUSINESS')));assert.ok(draws.every(draw=>draw.y<=1152));disposeScene(scene);
});

test('boards paginate and scroll only nearby, honor reduced motion, and retain their textures',()=>{
  const scene=new T.Scene(),player=new T.Group(),boards=createBulletinWorld(scene,player,()=>{});player.position.set(-24,.8,181);
  boards.setMarket({...emptyMarket,quotes,status:'partial',stockCount:19});boards.setNews({...emptyNews,headlines,status:'available'});
  const textures=boards.boards.map(board=>board.texture);for(let frame=0;frame<130;frame++)boards.update(.1,false,true);assert.equal(boards.page,1);
  const page=boards.page,version=textures[1].version;for(let frame=0;frame<20;frame++)boards.update(.1,false,true);assert.ok(textures[1].version>version);
  boards.update(.1,true,true);const paused=textures[1].version;for(let frame=0;frame<300;frame++)boards.update(.1,true,true);assert.equal(boards.page,page);assert.equal(textures[1].version,paused);
  boards.interact();assert.equal(boards.page,page+1);player.position.set(18,.8,181);boards.interact();assert.equal(boards.headlineIndex,1);boards.boards.forEach((board,index)=>assert.equal(board.texture,textures[index]));disposeScene(scene);
});

test('both bulletin screens fit desktop and mobile camera views with unobstructed wayfinding',()=>{
  const {createGameCamera}=require('../app/game-camera.ts'),{defaultSettings}=require('../app/persistence.ts'),{planWalkingRoute}=require('../app/walking-route.ts');
  for(const [width,height] of [[1440,960],[390,844],[320,926]])for(const kind of ['markets','news']){
    const scene=new T.Scene(),player=new T.Group(),camera=new T.PerspectiveCamera(50,width/height,.1,4000);scene.add(player);scene.scale.setScalar(2);player.position.set(bulletinSites[kind].x,.8,bulletinView.z);
    const boards=createBulletinWorld(scene,player,()=>{});scene.updateMatrixWorld(true);const rig=createGameCamera(camera,scene,player);rig.reset(bulletinCameraView(camera.aspect));rig.update(.016,false,defaultSettings,false,14);camera.updateMatrixWorld(true);
    const board=boards.boards.find(board=>board.kind===kind),positions=board.display.geometry.getAttribute('position');for(let index=0;index<positions.count;index++){const point=new T.Vector3().fromBufferAttribute(positions,index).applyMatrix4(board.display.matrixWorld).project(camera);assert.ok(Math.abs(point.x)<1&&Math.abs(point.y)<1,kind+' cropped at '+width)}
    const route=planWalkingRoute({x:0,z:136},{x:bulletinSites[kind].x,z:181},(x,z)=>boards.blocked(x,z,.8));assert.ok(route.length>1);disposeScene(scene);
  }
});

test('long headlines finish scrolling before rotation and manual advance restarts the reading interval',()=>{
  const scene=new T.Scene(),player=new T.Group(),boards=createBulletinWorld(scene,player,()=>{});player.position.set(18,.8,181);
  boards.setNews({...emptyNews,headlines:[{...headlines[0],title:'Business update '.repeat(17)},...headlines.slice(1)],status:'available'});
  for(let frame=0;frame<260;frame++)boards.update(.1,false,true);assert.equal(boards.headlineIndex,0);
  boards.interact();assert.equal(boards.headlineIndex,1);for(let frame=0;frame<10;frame++)boards.update(.1,false,true);assert.equal(boards.headlineIndex,1);disposeScene(scene);
});
