const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{disposeScene}=require('../app/scene-resources.ts');
global.document={createElement:()=>{
  const canvas={width:0,height:0,draws:[]};
  const context={font:'',fillRect(){},strokeRect(){},fillText(text){canvas.draws.push(text)},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){},save(){},restore(){},translate(){},rotate(){},closePath(){},roundRect(){},rect(){},clip(){},
    measureText(text){return {width:text.length*(Number(this.font.match(/([\d.]+)px/)?.[1])||16)*.6}},createLinearGradient(){return {addColorStop(){}}}};
  canvas.getContext=()=>context;return canvas;
}};

function checkDisplay(root,name,casing){
  root.updateWorldMatrix(true,true);
  const front=root.getObjectByName(name),back=root.getObjectByName(name+'_Back');
  assert.ok(front,name+' front');assert.ok(back,name+' back');
  assert.equal(front.geometry,back.geometry);assert.equal(front.material,back.material);assert.equal(front.material.map,back.material.map);
  for(const [face,side] of [[front,1],[back,-1]]){
    const normal=new T.Vector3(0,0,1).transformDirection(face.matrixWorld),outward=new T.Vector3(0,0,side).transformDirection(face.parent.matrixWorld);
    const right=new T.Vector3(1,0,0).transformDirection(face.matrixWorld),up=new T.Vector3(0,1,0).transformDirection(face.matrixWorld);
    assert.ok(normal.dot(outward)>.999999);assert.ok(right.dot(up.cross(normal).normalize())>.999999);
    assert.equal(face.material.side,T.FrontSide);assert.equal(face.userData.displaySide,side);assert.ok(face.matrixWorld.determinant()>0);
    const {width,height}=face.geometry.parameters;
    for(const [horizontal,vertical] of [[0,0],[-.38,-.32],[-.38,.32],[.38,-.32],[.38,.32]])for(const distance of [4,18])for(const angle of [-Math.PI/4,0,Math.PI/4])for(const elevation of [0,.35]){
      const sample=new T.Vector3(horizontal*width,vertical*height,0),target=face.localToWorld(sample.clone());
      const origin=face.localToWorld(sample.clone().add(new T.Vector3(Math.sin(angle)*distance,elevation*distance,Math.cos(angle)*distance))),targetDistance=origin.distanceTo(target);
      const hits=new T.Raycaster(origin,target.clone().sub(origin).normalize()).intersectObjects([front,back,...casing],true);
      const message=name+' side '+side+' at '+distance+' units, '+angle+' radians, elevation '+elevation+', sample '+horizontal+','+vertical+': hit '+hits[0]?.object.name;
      assert.ok(!hits.length||hits[0].distance>=targetDistance-1e-6,message);
      if(horizontal||vertical)assert.equal(hits[0]?.object,face,message);
    }
  }
  return {front,back,texture:front.material.map};
}

function disposalCounts(front){
  const counts=new Map([front.geometry,front.material,front.material.map].map(resource=>[resource,0]));
  for(const resource of counts.keys())resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));
  return ()=>[...counts.values()];
}

test('Chronicle shares verified snapshot repaints across outward faces clear of its housing',()=>{
  const {createKingdomChronicle}=require('../app/kingdom-chronicle.ts'),{emptyForge}=require('../app/forge-feed.ts');
  const scene=new T.Scene(),chronicle=createKingdomChronicle(scene),{front,back,texture}=checkDisplay(chronicle.root,'Chronicle_VerifiedDisplay',[chronicle.root]);
  assert.equal(texture.image,chronicle.canvas);assert.equal(texture.colorSpace,T.SRGBColorSpace);
  const version=texture.version,counts=disposalCounts(front);
  chronicle.set({...emptyForge,status:'live',fetchedAt:'2026-09-21T12:00:00Z',complete:true,repositories:[{name:'verified-display',stars:7,forks:2,pushedAt:'2026-09-21T11:00:00Z'}]});
  assert.ok(texture.version>version);assert.equal(back.material.map.version,texture.version);
  assert.ok(chronicle.canvas.draws.includes('verified-display'));assert.ok(chronicle.canvas.draws.includes('VERIFIED PUBLIC SNAPSHOT'));
  chronicle.update(.1,false);assert.ok(chronicle.root.getObjectByName('Chronicle_UpdateStrip').scale.y>1);
  chronicle.update(.1,true);assert.equal(chronicle.root.getObjectByName('Chronicle_UpdateStrip').scale.y,1);
  disposeScene(scene);assert.deepEqual(counts(),[1,1,1]);
});

test('repository and career plaques face outward, retain records and release both faces on replacement',()=>{
  const {createCivilizationWorld}=require('../app/civilization-world.ts'),{createPlanetSurface}=require('../app/planet-geography.ts'),{transitStops}=require('../app/transit-config.ts'),{emptyForge}=require('../app/forge-feed.ts');
  for(const stop of [transitStops[1],transitStops[3]]){
    const scene=new T.Scene(),world=createCivilizationWorld(scene,createPlanetSurface(stop,stop.radius)),plaques=[];
    world.root.traverse(object=>{if(object.name==='Civilization_RecordPlaque')plaques.push(object)});
    assert.equal(plaques.length,world.landmarks.length);assert.ok(plaques.length>=5);
    const initialCounts=plaques.map(front=>{checkDisplay(front.parent,front.name,[front.parent]);return disposalCounts(front)});
    const group=plaques[0].parent,repository={name:'verified-repository',url:'https://github.com/sahil-lab/verified-repository',description:'Verified public record',language:'TypeScript',stars:11,forks:2,archived:false};
    const snapshot={...emptyForge,status:'live',fetchedAt:'2026-09-21T12:00:00Z',repositories:[repository]};
    world.setRepositories(snapshot);
    if(world.identity==='github'){
      assert.deepEqual(initialCounts[0](),[1,1,1]);for(const counts of initialCounts.slice(1))assert.deepEqual(counts(),[0,0,0]);
      assert.equal(plaques[0].parent,null);
      const updated=checkDisplay(group,'Civilization_RecordPlaque',[group]),updatedCounts=disposalCounts(updated.front);
      assert.notEqual(updated.texture,plaques[0].material.map);assert.ok(updated.texture.image.draws.includes(repository.name));assert.ok(updated.texture.image.draws.includes('TypeScript / 11 stars'));
      assert.equal(world.landmarks[0].url,repository.url);assert.match(world.landmarks[0].description,/11 stars \/ 2 forks \/ GitHub public API/);
      world.setRepositories({...snapshot,status:'stale',repositories:[{...repository,name:'archived-repository',archived:true}]});
      assert.deepEqual(updatedCounts(),[1,1,1]);assert.equal(updated.front.parent,null);assert.equal(updated.back.parent,null);
      const replacement=checkDisplay(group,'Civilization_RecordPlaque',[group]),replacementCounts=disposalCounts(replacement.front);
      assert.ok(replacement.texture.image.draws.includes('ARCHIVED'));assert.match(world.landmarks[0].description,/last verified snapshot/);
      assert.equal(group.children.filter(object=>object.name.startsWith('Civilization_RecordPlaque')).length,2);
      disposeScene(scene);assert.deepEqual(updatedCounts(),[1,1,1]);assert.deepEqual(replacementCounts(),[1,1,1]);
    }else{
      assert.equal(group.getObjectByName('Civilization_RecordPlaque'),plaques[0]);assert.ok(plaques[0].material.map.image.draws.length>1);disposeScene(scene);
    }
    for(const counts of initialCounts)assert.deepEqual(counts(),[1,1,1]);
  }
});

test('orbital resume stays readable and selectable outside both frame faces as it rotates',()=>{
  const {createCivilizationLink}=require('../app/civilization-link.ts'),resume=require('../app/resume-data.json'),scene=new T.Scene();
  const path={length:100,sample:distance=>({position:new T.Vector3(distance,40,0),up:new T.Vector3(0,1,0)})},link=createCivilizationLink(scene,path);
  const {front,back,texture}=checkDisplay(link.satellite,'OrbitalResume_Display',[link.satellite]),counts=disposalCounts(front),version=texture.version;
  assert.equal(front.material.transparent,true);assert.equal(front.material.opacity,.92);assert.equal(texture.colorSpace,T.SRGBColorSpace);
  assert.equal(texture.image.width,768);assert.equal(texture.image.height,1120);assert.ok(texture.image.draws.includes(resume.role));assert.ok(texture.image.draws.includes(resume.education.name));
  for(const record of resume.experience)assert.ok(texture.image.draws.includes(record.name));
  for(const face of [front,back]){
    const target=face.localToWorld(new T.Vector3(.5,.5,0)),origin=face.localToWorld(new T.Vector3(.5,.5,4));
    assert.equal(link.select(new T.Raycaster(origin,target.sub(origin).normalize())),true);
  }
  link.update(1,false);assert.notEqual(link.satellite.rotation.y,-.12);checkDisplay(link.satellite,'OrbitalResume_Display',[link.satellite]);
  link.update(1,true);assert.equal(link.satellite.rotation.y,-.12);assert.equal(front.material.map,texture);assert.equal(back.material.map,texture);assert.equal(texture.version,version);
  disposeScene(scene);assert.deepEqual(counts(),[1,1,1]);
});

test('weather repaints one shared live canvas outside both frame faces',()=>{
  const {createWeatherWorld}=require('../app/weather-world.ts'),{parseCurrentWeather}=require('../app/weather-state.ts');
  const scene=new T.Scene(),sun=new T.DirectionalLight(),player=new T.Group();scene.add(sun);scene.background=new T.Color();scene.fog=new T.FogExp2();
  const weather=createWeatherWorld(scene,player,sun),{front,back,texture}=checkDisplay(weather.root,'Weather_Display',[weather.root]),counts=disposalCounts(front),version=texture.version;
  const frameBounds=new T.Box3().setFromObject(weather.root.getObjectByName('Weather_Display_Frame'));
  assert.ok(front.getWorldPosition(new T.Vector3()).z>frameBounds.max.z);assert.ok(back.getWorldPosition(new T.Vector3()).z<frameBounds.min.z);
  assert.equal(texture.image.width,2048);assert.equal(texture.image.height,1024);assert.equal(texture.colorSpace,T.SRGBColorSpace);
  const report=parseCurrentWeather({current:{temperature_2m:8.5,apparent_temperature:5.1,weather_code:61,is_day:0,relative_humidity_2m:89,wind_speed_10m:14.2,cloud_cover:92,precipitation:2,time:'2026-09-21T12:00'}});
  weather.set(report);assert.deepEqual(weather.snapshot,report);assert.ok(texture.version>version);assert.equal(back.material.map.version,texture.version);
  assert.ok(texture.image.draws.includes('YOUR LOCAL SKY / NIGHTTIME'));assert.ok(texture.image.draws.includes('RAIN SHOWERS'));assert.ok(texture.image.draws.includes('9\u00b0C'));assert.match(weather.details(),/Humidity 89%/);
  const paintedVersion=texture.version;weather.update(.1,true,true,false);assert.equal(texture.version,paintedVersion);assert.equal(front.material.map,texture);assert.equal(back.material.map,texture);assert.deepEqual(counts(),[0,0,0]);
  disposeScene(scene);assert.deepEqual(counts(),[1,1,1]);
});

test('bulletin data and rear-side paging update shared faces without recreating display resources',()=>{
  const {createBulletinWorld}=require('../app/bulletin-world.ts'),{emptyMarket,emptyNews,quoteFromYahoo}=require('../app/bulletin-data.ts');
  const scene=new T.Scene(),player=new T.Group(),notices=[],world=createBulletinWorld(scene,player,text=>notices.push(text));
  const displays=['Market_Display','News_Display'].map(name=>checkDisplay(world.root,name,[world.root])),counts=displays.map(pair=>disposalCounts(pair.front)),versions=displays.map(pair=>pair.texture.version);
  displays.forEach((pair,index)=>{assert.equal(pair.front,world.boards[index].display);assert.equal(pair.texture,world.boards[index].texture);assert.equal(pair.texture.image,world.boards[index].canvas);assert.equal(pair.texture.image.width,2048);assert.equal(pair.texture.image.height,1152)});
  const quotes=Array.from({length:7},(_,index)=>quoteFromYahoo({symbol:'DISPLAY'+index,quoteType:'EQUITY',longName:'Verified display company '+index,regularMarketPrice:100.5,marketCap:1e11-index,regularMarketChangePercent:1.5,regularMarketTime:1789761600,currency:'USD',marketState:'CLOSED'}));
  const headlines=Array.from({length:2},(_,index)=>({title:'Verified display headline '+index,source:'BBC Business',url:'https://www.bbc.com/news/articles/'+index,publishedAt:'2026-09-21T12:00:00.000Z'}));
  const market={...emptyMarket,quotes,stockCount:7,status:'partial',fetchedAt:'2026-09-21T12:00:00.000Z'},news={...emptyNews,headlines,sources:['BBC Business'],status:'available',fetchedAt:'2026-09-21T12:00:00.000Z'};
  world.setMarket(market);world.setNews(news);assert.equal(world.market,market);assert.equal(world.news,news);
  assert.ok(displays[0].texture.image.draws.includes('100.50 USD'));assert.ok(displays[1].texture.image.draws.includes(headlines[0].title));
  player.position.set(-24,.8,131);assert.match(world.prompt(),/Next market page/);assert.equal(world.interact(),true);assert.equal(world.page,1);
  player.position.set(18,.8,131);assert.match(world.prompt(),/Next business headlines/);assert.equal(world.interact(),true);assert.equal(world.headlineIndex,1);assert.equal(notices.length,2);
  world.update(.1,true,true);
  displays.forEach((pair,index)=>{assert.equal(pair.front.material.map,pair.texture);assert.equal(pair.back.material.map,pair.texture);assert.ok(pair.texture.version>versions[index]);assert.deepEqual(counts[index](),[0,0,0])});
  disposeScene(scene);for(const count of counts)assert.deepEqual(count(),[1,1,1]);
});


