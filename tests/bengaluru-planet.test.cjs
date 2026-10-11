const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {createLocalFrame,createPlanetProjection,densifyPolyline,densifyRing,geodeticToEcef,ecefToGeodetic}=require('../app/bengaluru-projection.ts');
const F=require('../app/bengaluru-features.ts'),G=require('../app/bengaluru-geometry.ts'),{encodeGlb,decodeGlb}=require('../app/bengaluru-glb.ts'),{buildPlanet,defaultPlanetConfig,renderSkySvg,skyTextureSize}=require('../app/bengaluru-pipeline.ts'),{createTileManager}=require('../app/bengaluru-tiles.ts'),{describeHeight}=require('../app/bengaluru-text.ts');
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const origin={lon:77.5907,lat:12.9794};

test('local frame is a metric topocentric tangent plane with an exact inverse',()=>{
 const frame=createLocalFrame(origin);
 const north=frame.toLocal(origin.lon,origin.lat+.01),east=frame.toLocal(origin.lon+.01,origin.lat);
 assert.ok(Math.abs(north.north-1106)<3&&Math.abs(north.east)<1e-6,JSON.stringify(north));
 assert.ok(Math.abs(east.east-1084.6)<3&&Math.abs(east.north)<.2,JSON.stringify(east));
 const back=frame.toGeodetic(east.east,east.north,east.up);assert.ok(Math.abs(back.lon-(origin.lon+.01))<1e-9&&Math.abs(back.lat-origin.lat)<1e-9&&Math.abs(back.height)<1e-6);
 const geo=ecefToGeodetic(geodeticToEcef(77.6,12.97,912));assert.ok(Math.abs(geo.lon-77.6)<1e-9&&Math.abs(geo.lat-12.97)<1e-9&&Math.abs(geo.height-912)<1e-5);
});

test('spherical cap preserves distance from the origin, bearing and height, and inverts exactly',()=>{
 const projection=createPlanetProjection({cityRadiusM:2535,capAngleDeg:110});
 assert.ok(Math.abs(projection.radius-2535/(55*Math.PI/180))<1e-9);
 assert.deepEqual(projection.toPlanet(0,0,0),[0,projection.radius,0]);
 for(const [east,north,height] of [[1200,-800,30],[-2535,0,0],[10,2000,7],[-300,-300,0]]){
  const p=projection.toPlanet(east,north,height),rho=Math.hypot(east,north),theta=Math.acos(p[1]/Math.hypot(...p));
  assert.ok(Math.abs(theta*projection.radius-rho)<1e-6,'arc length equals planar distance');
  assert.ok(Math.abs(Math.hypot(...p)-(projection.radius+height))<1e-6,'radius carries height');
  const bearing=Math.atan2(east,north),planetBearing=Math.atan2(p[0],-p[2]);assert.ok(Math.abs(bearing-planetBearing)<1e-9,'bearing preserved with north at -z');
  const local=projection.fromPlanet(...p);assert.ok(Math.abs(local.east-east)<1e-6&&Math.abs(local.north-north)<1e-6&&Math.abs(local.height-height)<1e-6);
  const up=projection.up(east,north);assert.ok(Math.abs(up[0]*p[0]+up[1]*p[1]+up[2]*p[2]-Math.hypot(...p))<1e-6,'up is radial');
 }
 assert.ok(Math.abs(Math.acos(projection.toPlanet(2535,0)[1]/projection.radius)-55*Math.PI/180)<1e-9,'city edge sits at the cap angle');
 assert.throws(()=>createPlanetProjection({cityRadiusM:0,capAngleDeg:90}),RangeError);
});

test('densification is deterministic, bounded and symmetric so shared edges match',()=>{
 const line=[[0,0],[100,0],[100,95]],out=densifyPolyline(line,40);
 assert.equal(out.length,1+3+3);for(let i=1;i<out.length;i++)assert.ok(Math.hypot(out[i][0]-out[i-1][0],out[i][1]-out[i-1][1])<=40+1e-9);
 assert.deepEqual(out[0],[0,0]);assert.deepEqual(out[out.length-1],[100,95]);
 const reverse=densifyPolyline([...line].reverse(),40).reverse();out.forEach((p,i)=>{assert.ok(Math.abs(p[0]-reverse[i][0])<1e-9&&Math.abs(p[1]-reverse[i][1])<1e-9)});
 assert.equal(densifyRing([[0,0],[90,0],[90,90]],45).length,7);
});

test('heights follow height > levels > type default > default and keep provenance',()=>{
 assert.equal(F.parseOsmHeight('12'),12);assert.equal(F.parseOsmHeight('12.5 m'),12.5);assert.ok(Math.abs(F.parseOsmHeight('40 ft')-12.192)<1e-9);assert.ok(Math.abs(F.parseOsmHeight(`40'6"`)-12.3444)<1e-9);
 assert.equal(F.parseOsmHeight('tall'),undefined);assert.equal(F.parseOsmHeight('0'),undefined);assert.equal(F.parseOsmHeight(undefined),undefined);
 assert.deepEqual(F.resolveHeight({height:'30',"building:levels":'4'}),{heightM:30,minHeightM:0,levels:4,source:'osm-height',estimated:false});
 assert.deepEqual(F.resolveHeight({"building:levels":'5'}),{heightM:15,minHeightM:0,levels:5,source:'building-levels',estimated:true});
 assert.deepEqual(F.resolveHeight({building:'hotel'}),{heightM:24,minHeightM:0,source:'type-default',estimated:true});
 assert.deepEqual(F.resolveHeight({building:'yes'}),{heightM:8,minHeightM:0,source:'default',estimated:true});
 assert.equal(F.resolveHeight({building:'yes',"building:min_level":'2',"building:levels":'6'}).minHeightM,6);
 assert.equal(F.resolveHeight({building:'yes',min_height:'40',height:'12'}).minHeightM,10.8,'min height never exceeds the volume');
 assert.equal(describeHeight({heightM:30,heightSource:'osm-height'}),'Height 30 m (OpenStreetMap height tag)');
 assert.equal(describeHeight({heightM:12,heightSource:'building-levels',levels:4}),'About 12 m, estimated from 4 storeys');
 assert.equal(describeHeight({heightM:30,heightSource:'osm-height',landmark:'X',displayHeightM:36}),'Height 30 m (OpenStreetMap height tag); drawn 36 m tall for landmark emphasis');
 assert.equal(describeHeight({}),null);
});

test('classification maps OSM tags to planet classes without inventing geometry',()=>{
 assert.deepEqual(F.classify({building:'yes'},'way',true),{featureClass:'building',subtype:'yes',areaOnly:true});
 assert.deepEqual(F.classify({"building:part":'yes'},'way',true),{featureClass:'building',subtype:'part',areaOnly:true});
 assert.deepEqual(F.classify({highway:'primary'},'way',false),{featureClass:'road',subtype:'primary',lineStyle:{width:12,lod:1}});
 assert.equal(F.classify({highway:'footway'},'way',false).lineStyle.lod,0);
 assert.equal(F.classify({highway:'pedestrian',area:'yes'},'way',true).subtype,'plaza');
 assert.equal(F.classify({highway:'construction'},'way',false),null);
 assert.equal(F.classify({leisure:'park'},'way',true).featureClass,'park');assert.equal(F.classify({leisure:'park'},'way',false),null);
 assert.equal(F.classify({natural:'water'},'way',true).featureClass,'water');assert.deepEqual(F.classify({waterway:'river'},'way',false).lineStyle,{width:12,lod:1});
 assert.deepEqual(F.classify({place:'suburb',name:'Shivajinagar'},'node',false),{featureClass:'place',subtype:'suburb'});
 assert.equal(F.classify({tourism:'museum',name:'Museum'},'node',false).featureClass,'poi');assert.equal(F.classify({tourism:'museum'},'node',false),null);
 assert.equal(F.classify({tourism:'museum',name:'Museum grounds'},'way',true).subtype,'grounds');
 assert.equal(F.classify({railway:'rail'},'way',false).featureClass,'rail');assert.equal(F.classify(undefined,'way',true),null);
});

test('multipolygon assembly chains members, orients rings and nests courtyards by containment',()=>{
 const square=(x,y,s)=>[[x,y],[x+s,y],[x+s,y+s],[x,y+s],[x,y]];
 const outer=square(0,0,100),half1=outer.slice(0,3),half2=outer.slice(2).reverse(),hole=square(30,30,20);
 const {polygons,unclosed}=F.assemblePolygons([half2,hole,half1,[[500,500],[600,600]]]);
 assert.equal(polygons.length,1);assert.equal(unclosed,1);
 assert.ok(F.ringArea(polygons[0].outer)>0,'outer counter-clockwise');assert.equal(polygons[0].holes.length,1);assert.ok(F.ringArea(polygons[0].holes[0])<0,'hole clockwise');
 assert.equal(F.pointInPolygon([10,10],polygons[0]),true);assert.equal(F.pointInPolygon([40,40],polygons[0]),false);
});

function syntheticSnapshot(){
 const frame=createLocalFrame(origin),at=(east,north)=>{const g=frame.toGeodetic(east,north);return {lat:g.lat,lon:g.lon}};
 const ring=(x,y,w,h)=>[at(x,y),at(x+w,y),at(x+w,y+h),at(x,y+h),at(x,y)];
 return {osm3s:{timestamp_osm_base:'2026-10-10T22:53:35Z'},elements:[
  {type:'way',id:10,tags:{building:'public',name:'Civic Hall',height:'30','building:levels':'4'},geometry:ring(-20,-15,60,30)},
  {type:'relation',id:20,tags:{type:'multipolygon',building:'yes',name:'Courtyard Block','building:levels':'3'},members:[{type:'way',ref:1,role:'outer',geometry:ring(200,200,80,80).slice(0,3)},{type:'way',ref:2,role:'outer',geometry:ring(200,200,80,80).slice(2).reverse()},{type:'way',ref:3,role:'inner',geometry:ring(230,230,20,20)}]},
  {type:'way',id:30,tags:{building:'yes',name:'Outline With Parts'},geometry:ring(-300,100,40,40)},
  {type:'way',id:31,tags:{'building:part':'yes',height:'20'},geometry:ring(-298,102,36,36)},
  {type:'way',id:32,tags:{building:'yes',name:'Outline With Dome'},geometry:ring(-400,100,40,40)},
  {type:'way',id:33,tags:{'building:part':'yes',height:'12'},geometry:ring(-395,105,6,6)},
  {type:'way',id:40,tags:{leisure:'park',name:'Big Park'},geometry:ring(-200,-700,900,400)},
  {type:'way',id:41,tags:{natural:'water',name:'Tank'},geometry:ring(100,-600,120,80)},
  {type:'way',id:50,tags:{highway:'primary',name:'Main Road'},geometry:[at(-1200,-100),at(0,-100),at(1200,-120)]},
  {type:'way',id:51,tags:{highway:'footway'},geometry:[at(-50,-650),at(300,-650)]},
  {type:'way',id:52,tags:{highway:'pedestrian',area:'yes',name:'Plaza'},geometry:ring(60,-40,30,30)},
  {type:'way',id:53,tags:{highway:'residential'},geometry:[at(-1200,-100)]},
  {type:'node',id:60,tags:{place:'suburb',name:'Suburb Node'},...at(500,500)},
  {type:'node',id:61,tags:{tourism:'museum',name:'Museum Node'},...at(10,10)},
  {type:'node',id:62,tags:{tourism:'museum',name:'Far Away'},lat:13.5,lon:78},
  {type:'way',id:70,tags:{building:'yes'},geometry:[at(0,0),at(1,0),at(2,0),at(0,0)]},
 ]};
}
const syntheticConfig={...defaultPlanetConfig,name:'Synthetic',origin:{...origin,label:'Origin'},bbox:{south:12.95,west:77.57,north:13.01,east:77.61},tileSizeM:500,landmarks:[{label:'Civic Hall',id:'way/10'},{label:'Big Park',name:'big park',featureClass:'park'},{label:'Missing',id:'way/999'}]};

test('buildFeatures produces deterministic local features with provenance, parts and landmarks',()=>{
 const snapshot=syntheticSnapshot(),built=F.buildFeatures(snapshot,origin,{landmarks:syntheticConfig.landmarks,bbox:syntheticConfig.bbox});
 const ids=built.features.map(f=>f.id);
 assert.deepEqual(ids,['node/60','node/61','relation/20','way/10','way/30','way/31','way/32','way/33','way/40','way/41','way/50','way/51','way/52']);
 const shuffled=F.buildFeatures({...snapshot,elements:[...snapshot.elements].reverse()},origin,{landmarks:syntheticConfig.landmarks,bbox:syntheticConfig.bbox});
 assert.deepEqual(shuffled.features.map(f=>f.id),ids,'input order does not change output order');
 const hall=built.features.find(f=>f.id==='way/10');assert.equal(hall.height.source,'osm-height');assert.equal(hall.landmark,'Civic Hall');assert.ok(Math.abs(hall.areaM2-1800)<1e-6);assert.ok(Math.abs(hall.local[0]-10)<1e-6&&Math.abs(hall.local[1])<1e-6);
 const block=built.features.find(f=>f.id==='relation/20');assert.equal(block.polygons[0].holes.length,1);assert.equal(block.height.source,'building-levels');assert.ok(Math.abs(block.areaM2-6000)<1e-2);
 assert.equal(built.features.find(f=>f.id==='way/30').hasParts,true,'parts covering most of the footprint replace the outline');assert.equal(built.features.find(f=>f.id==='way/31').hasParts,undefined);
 assert.equal(built.features.find(f=>f.id==='way/32').hasParts,undefined,'a small roof detail does not remove the building body');
 assert.equal(built.features.find(f=>f.id==='way/40').landmark,'Big Park');
 assert.equal(built.features.find(f=>f.id==='way/52').subtype,'plaza');
 assert.deepEqual(built.counts,{place:1,poi:1,building:6,park:1,water:1,road:3});
 assert.deepEqual(built.heightSources,{'osm-height':3,'building-levels':1,'type-default':0,default:2});
 assert.deepEqual(built.skipped.map(s=>s.reason).sort(),['degenerate ring','landmark not found in snapshot','no geometry']);
 assert.equal(built.features.some(f=>f.id==='node/62'),false,'outside the AOI');
});

test('rectangle clipping keeps interior area and splits re-entering lines',()=>{
 const clipped=F.clipRingToRect([[-50,-50],[150,-50],[50,150]],[0,0,100,100]);
 assert.ok(clipped.length>=4);assert.ok(Math.abs(F.ringArea(clipped))>0);
 for(const [x,y] of clipped)assert.ok(x>=-1e-9&&x<=100+1e-9&&y>=-1e-9&&y<=100+1e-9);
 assert.deepEqual(F.clipRingToRect([[200,200],[300,200],[300,300]],[0,0,100,100]),[]);
 const pieces=F.clipLineToRect([[-50,50],[50,50],[150,50],[150,20],[50,20]],[0,0,100,100]);
 assert.equal(pieces.length,2);assert.deepEqual(pieces[0][0],[0,50]);assert.deepEqual(pieces[0][pieces[0].length-1],[100,50]);assert.deepEqual(pieces[1][0],[100,20]);assert.deepEqual(pieces[1][1],[50,20]);
 assert.deepEqual(F.clipLineToRect([[10,10],[20,20]],[0,0,100,100]),[[[10,10],[20,20]]]);
 assert.deepEqual(F.tileFor(-1,499,500),{ix:-1,iy:0,id:'t-1_0',bounds:[-500,0,0,500]});
 assert.equal(F.tilesCovering([-10,-10,10,10],500).length,4);
});

const faceNormal=(positions,a,b,c)=>{const p=i=>[positions[i*3],positions[i*3+1],positions[i*3+2]],[ax,ay,az]=p(a),[bx,by,bz]=p(b),[cx,cy,cz]=p(c),ux=bx-ax,uy=by-ay,uz=bz-az,vx=cx-ax,vy=cy-ay,vz=cz-az;return [uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx]};

test('extrusions face outward and up, overlays are gridded and ribbons meet at tile borders',()=>{
 const builder=new G.FlatMeshBuilder(0,0),square={outer:[[0,0],[10,0],[10,10],[0,10]],holes:[]};
 builder.addExtrusion(square,0,12,[200,180,150],7,40);
 const built=builder.build();assert.equal(built.vertexCount,8);assert.equal(built.triangleCount,10);
 const idx=built.indices,pos=built.positions;
 for(let t=0;t<idx.length;t+=3){const n=faceNormal(pos,idx[t],idx[t+1],idx[t+2]),cx=(pos[idx[t]*3]+pos[idx[t+1]*3]+pos[idx[t+2]*3])/3,cz=(pos[idx[t]*3+2]+pos[idx[t+1]*3+2]+pos[idx[t+2]*3+2])/3;
  if(Math.abs(n[1])>1e-6)assert.ok(n[1]>0,'roof faces up');else assert.ok(n[0]*(cx-5)+n[2]*(cz+5)>0,'walls face away from the footprint centre')}
 assert.ok(built.featureIds.every(id=>id===7));assert.ok(built.colors[0]<200,'colours stored as linear bytes');assert.ok(built.colors[4*4]>built.colors[0],'top ring brighter than base');
 assert.ok(pos.every((v,i)=>i%3!==2||v<=0),'north is stored as negative z');
 const overlay=new G.FlatMeshBuilder(0,0);overlay.addPolygon({outer:[[0,0],[300,0],[300,300],[0,300]],holes:[]},.9,[100,150,90],1,40,50);
 const o=overlay.build();for(let t=0;t<o.indices.length;t+=3){const xs=[0,1,2].map(k=>o.positions[o.indices[t+k]*3]),zs=[0,1,2].map(k=>o.positions[o.indices[t+k]*3+2]);assert.ok(Math.max(...xs)-Math.min(...xs)<=50+1e-6&&Math.max(...zs)-Math.min(...zs)<=50+1e-6);assert.ok(faceNormal(o.positions,o.indices[t],o.indices[t+1],o.indices[t+2])[1]>0)}
 const clipped=new G.FlatMeshBuilder(0,0);clipped.addPolygon({outer:[[-100,-100],[400,-100],[400,400],[-100,400]],holes:[]},.9,[1,2,3],0,40,50,[0,0,100,100]);
 const c=clipped.build();for(let i=0;i<c.positions.length;i+=3){assert.ok(c.positions[i]>=-1e-6&&c.positions[i]<=100+1e-6);assert.ok(c.positions[i+2]>=-100-1e-6&&c.positions[i+2]<=1e-6)}
 const line=[[-80,20],[80,-20]],[left]=F.clipLineToRect(line,[-500,-500,0,500]),[right]=F.clipLineToRect(line,[0,-500,500,500]);
 const a=new G.FlatMeshBuilder(0,0),b=new G.FlatMeshBuilder(0,0);a.addRibbon(left,8,1.3,[1,1,1],0,40);b.addRibbon(right,8,1.3,[1,1,1],0,40);
 const endA=a.build().positions,endB=b.build().positions,pts=p=>{const out=[];for(let i=0;i<p.length;i+=3)out.push(p.slice(i,i+3).map(v=>+v.toFixed(6)).join(','));return out};
 const shared=pts(endA).filter(v=>pts(endB).includes(v));assert.equal(shared.length,2,'both ribbon ends share the two border vertices');
});

test('tree placement is deterministic, inside the polygon and capped',()=>{
 const feature={id:'way/40',polygons:[{outer:[[0,0],[400,0],[400,400],[0,400]],holes:[[[100,100],[100,300],[300,300],[300,100]]]}]};
 const trees=G.placeTrees(feature,.5),again=G.placeTrees(feature,.5);
 assert.deepEqual(trees,again);assert.ok(trees.length>100);
 for(const [x,y] of trees){assert.ok(x>=0&&x<=400&&y>=0&&y<=400);assert.ok(!(x>100&&x<300&&y>100&&y<300),'no trees in the courtyard')}
 assert.equal(G.placeTrees(feature,0).length,0);assert.equal(G.placeTrees(feature,1,13,50).length,50);
 const colorA=G.featureColor({id:'way/1',featureClass:'building',subtype:'hotel',tags:{}}),colorB=G.featureColor({id:'way/2',featureClass:'building',subtype:'hotel',tags:{}});
 assert.notDeepEqual(colorA,colorB);assert.deepEqual(G.featureColor({id:'way/1',featureClass:'building',subtype:'hotel',tags:{}}),colorA);
 assert.deepEqual(G.featureColor({id:'x',featureClass:'road',subtype:'primary',tags:{}}),G.palette.road.major);
});

test('GLB encoder writes loader-compatible deterministic binaries',async()=>{
 const positions=new Float32Array([0,0,0,10,0,0,10,0,-10,0,0,-10]),colors=new Uint8Array(16).fill(200),ids=new Float32Array([3,3,3,3]),indices=new Uint16Array([0,1,2,0,2,3]);
 const input={meshes:[{name:'building',translation:[500,0,-1000],primitives:[{attributes:{POSITION:{array:positions,type:'VEC3'},COLOR_0:{array:colors,type:'VEC4',normalized:true},_FEATUREID:{array:ids,type:'SCALAR'}},indices,material:0}],extras:{layer:'building'}},{name:'trees',primitives:[{attributes:{POSITION:{array:new Float32Array([1,0,-1]),type:'VEC3'}},mode:0}]}],materials:[{name:'building',roughness:.8}],extras:{tile:'t0_0'}};
 const bytes=encodeGlb(input),again=encodeGlb(input);
 assert.equal(sha256(bytes),sha256(again));assert.equal(bytes.byteLength%4,0);
 const {json,bin}=decodeGlb(bytes);
 assert.equal(json.asset.version,'2.0');assert.ok(json.bufferViews.every(view=>view.buffer===0&&view.byteOffset%4===0));assert.deepEqual(json.accessors[0].min,[0,0,-10]);assert.deepEqual(json.accessors[0].max,[10,0,0]);
 assert.equal(json.accessors[1].normalized,true);assert.equal(json.meshes[1].primitives[0].mode,0);assert.deepEqual(json.nodes[0].translation,[500,0,-1000]);assert.equal(json.buffers[0].byteLength,bin.byteLength);
 const {GLTFLoader}=require('three/addons/loaders/GLTFLoader.js'),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const mesh=gltf.scene.getObjectByName('building'),points=gltf.scene.getObjectByName('trees');
 assert.ok(mesh.isMesh&&points.isPoints);assert.deepEqual(mesh.position.toArray(),[500,0,-1000]);assert.equal(mesh.geometry.attributes._featureid.getX(2),3);assert.equal(mesh.geometry.attributes.color.itemSize,4);assert.equal(mesh.geometry.index.count,6);assert.equal(mesh.userData.layer,'building');
 const other=encodeGlb({...input,extras:{tile:'t0_1'}});assert.notEqual(sha256(other),sha256(bytes));
 assert.throws(()=>decodeGlb(new Uint8Array(20)),/not a glTF/);
});

test('pipeline builds deterministic tiles whose feature ids match the metadata and LODs differ in detail',async()=>{
 const snapshot=syntheticSnapshot(),text=JSON.stringify(snapshot),input={sha256:sha256(text),bytes:text.length,description:'synthetic'};
 const first=buildPlanet(snapshot,syntheticConfig,input,sha256),second=buildPlanet(snapshot,syntheticConfig,input,sha256);
 assert.deepEqual([...first.files.keys()],[...second.files.keys()]);
 for(const [file,content] of first.files){const other=second.files.get(file);assert.equal(sha256(typeof content==='string'?content:Buffer.from(content)),sha256(typeof other==='string'?other:Buffer.from(other)),file)}
 const {manifest}=first;
 assert.equal(manifest.source.inputSha256,input.sha256);assert.equal(manifest.source.snapshotTimestamp,'2026-10-10T22:53:35Z');assert.equal(manifest.projection.kind,'spherical-cap');
 assert.ok(manifest.projection.cityRadiusM>3000&&manifest.projection.planetRadiusM>manifest.projection.cityRadiusM);
 assert.deepEqual(manifest.landmarks.map(l=>l.label),['Civic Hall','Big Park'],'landmarks deduplicated across tiles and ordered by configuration');
 assert.deepEqual(manifest.places.map(p=>p.name),['Suburb Node']);assert.ok(manifest.named.some(n=>n.name==='Museum Node'));
 assert.equal(manifest.skipped.reasons['landmark not found in snapshot'],1);
 const parkTiles=manifest.tiles.filter(t=>JSON.parse(first.files.get(t.features)).some(f=>f.id==='way/40'));assert.ok(parkTiles.length>=2,'park spans tiles but is listed once');
 const {GLTFLoader}=require('three/addons/loaders/GLTFLoader.js');
 const tileWith=id=>{const tile=manifest.tiles.find(t=>JSON.parse(first.files.get(t.features)).some(f=>f.id===id));return {tile,records:JSON.parse(first.files.get(tile.features))}};
 const {tile:hallTile,records}=tileWith('way/10');assert.equal(hallTile.id,manifest.landmarks[0].tile);
 const hall=records.find(r=>r.id==='way/10');assert.equal(hall.index,records.indexOf(hall));assert.equal(hall.displayHeightM,36);assert.equal(hall.heightM,30);assert.equal(hall.heightSource,'osm-height');assert.equal(hall.landmark,'Civic Hall');
 for(const lod of hallTile.lods){
  const bytes=first.files.get(lod.file);assert.equal(sha256(Buffer.from(bytes)),lod.sha256);assert.equal(bytes.byteLength,lod.bytes);
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''),building=gltf.scene.getObjectByName('building');
  const ids=new Set(Array.from(building.geometry.attributes._featureid.array));assert.ok(ids.has(hall.index));assert.ok([...ids].every(id=>id<records.length));
 }
 const outline=tileWith('way/30'),outlineRecord=outline.records.find(r=>r.id==='way/30'),partRecord=outline.records.find(r=>r.id==='way/31'),domeOutline=outline.records.find(r=>r.id==='way/32'),dome=outline.records.find(r=>r.id==='way/33');
 assert.equal(outlineRecord.heightM,8);assert.equal(outlineRecord.heightSource,'default');assert.equal(partRecord.heightM,20);assert.ok(domeOutline&&dome,'dome fixture shares the tile');
 for(const lod of outline.tile.lods){
  const bytes=first.files.get(lod.file),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''),ids=new Set(Array.from(gltf.scene.getObjectByName('building').geometry.attributes._featureid.array));
  assert.equal(ids.has(outlineRecord.index),false,'outline with covering parts is not extruded');assert.equal(ids.has(partRecord.index),true,'the mapped part is extruded');
  assert.equal(ids.has(domeOutline.index),true,'outline with only a roof detail keeps its body');assert.equal(ids.has(dome.index),true,'the roof detail is extruded too');
 }
 const parkTile=tileWith('way/40').tile;
 for(const lod of parkTile.lods){const gltf=await new GLTFLoader().parseAsync(first.files.get(lod.file).buffer.slice(0),'');assert.equal(!!gltf.scene.getObjectByName('trees'),lod.level===0,'trees only in the near LOD')}
 const footwayTile=manifest.tiles.find(t=>JSON.parse(first.files.get(t.features)).some(f=>f.id==='way/51'));
 const near=first.files.get(footwayTile.lods[0].file),far=first.files.get(footwayTile.lods[1].file);assert.ok(near.byteLength>far.byteLength,'near LOD carries trees and footways');
 const nearGround=(await new GLTFLoader().parseAsync(first.files.get(footwayTile.lods[0].file).buffer.slice(0),'')).scene.getObjectByName('ground'),farGround=(await new GLTFLoader().parseAsync(first.files.get(footwayTile.lods[1].file).buffer.slice(0),'')).scene.getObjectByName('ground');
 const footwayIndex=JSON.parse(first.files.get(footwayTile.features)).find(f=>f.id==='way/51').index;
 assert.ok(Array.from(nearGround.geometry.attributes._featureid.array).includes(footwayIndex));assert.ok(!farGround||!Array.from(farGround.geometry.attributes._featureid.array).includes(footwayIndex),'footways drop out of the far LOD');
 const svg=first.files.get(manifest.fallback);assert.match(svg,/<title id="blrPlanetTitle">Illustrated planet of Bengaluru<\/title>/);assert.match(svg,/OpenStreetMap contributors/);assert.match(svg,/Civic Hall/);assert.match(svg,/aria-labelledby="blrPlanetTitle blrPlanetDesc"/);
 assert.equal(manifest.sky,'planet-sky.svg');const sky=first.files.get(manifest.sky);assert.match(sky,new RegExp(`width="${skyTextureSize.width}" height="${skyTextureSize.height}"`));assert.match(sky,/Equirectangular surface texture/);
 assert.ok(first.report.trees>0&&first.report.tiles>=4);
});

test('sky texture places the crown at the image centre with north up and east right',()=>{
 const projection=createPlanetProjection({cityRadiusM:2535,capAngleDeg:110}),manifest={heights:{landmarkHeightBoost:1},landmarks:[],counts:{}};
 const building=(id,east,north)=>({id,featureClass:'building',subtype:'yes',tags:{},areaM2:400,height:{heightM:8},polygons:[{outer:[[east-10,north-10],[east+10,north-10],[east+10,north+10],[east-10,north+10]],holes:[]}],lonLat:[0,0],local:[east,north]});
 const svg=renderSkySvg([building('way/1',0,0),building('way/2',800,0),building('way/3',0,800)],projection,manifest,1536,768);
 const paths=[...svg.matchAll(/<path d="M([\d.]+) ([\d.]+)/g)].map(match=>[+match[1],+match[2]]);
 const centre=paths.find(([x,y])=>Math.abs(x-768)<12&&Math.abs(y-384)<12),east=paths.find(([x,y])=>x>800&&Math.abs(y-384)<12),north=paths.find(([x,y])=>Math.abs(x-768)<12&&y<360);
 assert.ok(centre,'origin building at the centre');assert.ok(east,'east of the origin maps right');assert.ok(north,'north of the origin maps up');
 assert.equal(renderSkySvg([],projection,manifest),renderSkySvg([],projection,manifest),'deterministic');
});

test('kingdom satellite is a single textured globe that mounts, reports readiness and disposes',async()=>{
 const T=require('three'),{createBengaluruSatellite,bengaluruSatellite}=require('../app/bengaluru-satellite.ts'),scene=new T.Scene();
 const satellite=createBengaluruSatellite(scene);
 assert.equal(satellite.root.parent,scene);assert.deepEqual(satellite.root.position.toArray(),[bengaluruSatellite.x,bengaluruSatellite.y,bengaluruSatellite.z]);
 assert.equal(satellite.globe.geometry.parameters.radius,bengaluruSatellite.radius);assert.equal(scene.getObjectByName('Bengaluru_Globe'),satellite.globe);assert.ok(scene.getObjectByName('Bengaluru_Haze'));
 assert.equal(await satellite.ready,false,'no texture rasterisation outside a browser');
 const material=satellite.globe.material;require('../app/static-batching.ts').batchScenery(scene,{});
 assert.equal(scene.getObjectByName('Bengaluru_Globe'),satellite.globe,'static batching leaves the globe mesh alone');assert.equal(satellite.globe.material,material);assert.equal(satellite.globe.geometry.parameters.radius,bengaluruSatellite.radius);assert.ok(material.map,'placeholder map present until the city texture loads');
 const custom=createBengaluruSatellite(scene,{position:{x:1,y:2,z:3},radius:5,loadTexture:false});assert.deepEqual(custom.root.position.toArray(),[1,2,3]);assert.equal(await custom.ready,false);
 satellite.dispose();custom.dispose();assert.equal(scene.children.length,0);
 assert.equal(bengaluruSatellite.textureUrl,'/assets/bengaluru-v1/planet-sky.svg');assert.ok(Math.abs(bengaluruSatellite.x)<1&&bengaluruSatellite.y>600,'sits above the Forge/Citadel row');
});

test('published build matches its manifest and the stored snapshot hash',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../app/bengaluru-planet-manifest.json'),'utf8')),root=path.resolve(__dirname,'../public/assets/bengaluru-v1');
 assert.equal(manifest.version,1);assert.equal(manifest.source.provider,'OpenStreetMap');assert.equal(manifest.source.license,'ODbL 1.0');
 const config=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../assets/bengaluru/planet-config.json'),'utf8')),raw=zlib.gunzipSync(fs.readFileSync(path.resolve(__dirname,'..',config.snapshot)));
 assert.equal(sha256(raw),manifest.source.inputSha256,'manifest records the exact stored snapshot');
 assert.ok(manifest.tiles.length>=40&&manifest.landmarks.length===config.landmarks.length);
 for(const tile of manifest.tiles){
  for(const lod of tile.lods){const bytes=fs.readFileSync(path.join(root,lod.file));assert.equal(bytes.byteLength,lod.bytes,lod.file);assert.equal(sha256(bytes),lod.sha256,lod.file)}
  const records=JSON.parse(fs.readFileSync(path.join(root,tile.features),'utf8'));assert.equal(records.length,tile.featureCount);records.forEach((record,index)=>assert.equal(record.index,index));
 }
 assert.ok(fs.existsSync(path.join(root,manifest.fallback)));assert.ok(fs.existsSync(path.join(root,manifest.sky)));
 const rebuilt=buildPlanet(JSON.parse(raw.toString('utf8')),config,{sha256:sha256(raw),bytes:raw.length,description:config.snapshot+' (Overpass API JSON, out geom)'},sha256);
 for(const [file,content] of rebuilt.files){const disk=fs.readFileSync(path.join(root,file));assert.equal(sha256(disk),sha256(typeof content==='string'?Buffer.from(content):content),'published '+file+' matches a fresh deterministic build')}
 assert.equal(sha256(JSON.stringify(rebuilt.manifest)),sha256(JSON.stringify(manifest)),'app manifest matches a fresh build');
 const vidhana=manifest.landmarks.find(l=>l.label==='Vidhana Soudha');assert.equal(vidhana.id,'relation/5284317');assert.equal(vidhana.heightSource,'osm-height');assert.ok(Math.abs(vidhana.lonLat[0]-77.5907)<.003&&Math.abs(vidhana.lonLat[1]-12.9794)<.003);
 assert.ok(Math.abs(vidhana.local[0])<300&&Math.abs(vidhana.local[1])<300,'origin landmark sits near the crown');
 const total=Object.values(manifest.heights.sources).reduce((a,b)=>a+b,0);assert.equal(total,manifest.counts.building);
});

test('tile manager streams by visibility and LOD with bounded, cancellable requests and disposal',async()=>{
 const projection=createPlanetProjection({cityRadiusM:2535,capAngleDeg:110}),R=projection.radius;
 const tiles=[];for(let ix=-3;ix<3;ix++)for(let iy=-3;iy<3;iy++)tiles.push({id:`t${ix}_${iy}`,ix,iy,bounds:[ix*500,iy*500,ix*500+500,iy*500+500],center:[ix*500+250,iy*500+250],radiusM:414,lods:[{level:0,file:'a',bytes:1000,sha256:'',triangles:0,vertices:0},{level:1,file:'b',bytes:500,sha256:'',triangles:0,vertices:0}],features:'f',counts:{},trees:0,featureCount:0});
 const open=new Map(),events=[],aborted=[];
 const manager=createTileManager({tiles,projection,concurrency:2,maxLeftoverTiles:3,budgetBytes:10**9,lodSwitchPx:260,
  load:(tile,level,signal)=>new Promise((resolve,reject)=>{const k=tile.id+':'+level;open.set(k,{resolve:()=>{open.delete(k);resolve({k,bytes:level?500:1000})},reject});signal.addEventListener('abort',()=>{aborted.push(k);open.delete(k);reject(new DOMException('aborted','AbortError'))})}),
  attach:(tile,level)=>events.push('attach '+tile.id+':'+level),detach:(tile,level)=>events.push('detach '+tile.id+':'+level),dispose:asset=>events.push('dispose '+asset.k),bytesOf:asset=>asset.bytes});
 const high={position:[0,R*3.5,0],viewportHeight:900,fovY:.66};
 let stats=manager.update(high);
 assert.ok(stats.wanted>=20&&stats.loading===2&&stats.queued===stats.wanted-2,JSON.stringify(stats));
 const firstKeys=[...open.keys()];assert.ok(firstKeys.every(k=>k.endsWith(':1')),'far camera wants the far LOD');
 for(const k of firstKeys)open.get(k).resolve();await new Promise(r=>setImmediate(r));
 assert.equal(manager.resident().length,2);assert.equal(manager.stats().loading,2,'queue refills to the concurrency bound');
 const far={position:[0,-R*3.5,0],viewportHeight:900,fovY:.66};
 stats=manager.update(far);
 assert.equal(stats.wanted,0);assert.equal(stats.loading,0);assert.equal(aborted.length,2,'pending requests cancelled when the camera leaves');
 assert.equal(manager.resident().length,2,'leftovers within the budget stay resident');
 while(manager.update(high).loading){for(const k of Array.from(open.keys()))open.get(k).resolve();await new Promise(r=>setImmediate(r))}
 const residentCount=manager.resident().length;assert.ok(residentCount>=20);
 manager.update(far);assert.equal(manager.resident().length,3,'eviction keeps only the leftover budget');assert.ok(events.filter(e=>e.startsWith('dispose')).length>=residentCount-3);
 const close={position:projection.toPlanet(250,250,420),viewportHeight:900,fovY:.66};
 manager.update(close);await new Promise(r=>setImmediate(r));
 const nearKeys=[...open.keys()].filter(k=>k.endsWith(':0'));assert.ok(nearKeys.includes('t0_0:0'),'close camera requests the near LOD');
 manager.update(far);manager.update(close);
 while(manager.update(close).loading){for(const k of Array.from(open.keys()))open.get(k).resolve();await new Promise(r=>setImmediate(r))}
 const t00=manager.resident().filter(r=>r.tile.id==='t0_0');assert.deepEqual(t00.map(r=>r.level),[0],'near LOD replaces the far LOD of the same tile');
 manager.update(far);manager.request('t2_2',1);assert.ok(manager.stats().loading+manager.stats().queued>=1,'explicit requests load even when out of view');
 manager.dispose();assert.equal(manager.resident().length,0);assert.equal(open.size,0);
 const afterDispose=manager.update(high);assert.equal(afterDispose.wanted,0);
});

test('renderer selection and bend material injection behave without a browser',()=>{
 const P=require('../app/bengaluru-planet.ts');
 assert.equal(P.chooseRenderer(undefined),'svg');
 // Fake documents only need the one DOM factory the renderer probe calls.
 const fakeWindow=(context,matches)=>({document:{createElement:()=>({getContext:()=>context})},matchMedia:()=>({matches})}); // oxlint-disable-line typescript/no-deprecated
 assert.equal(P.chooseRenderer(fakeWindow(null,false)),'svg');
 assert.equal(P.chooseRenderer(fakeWindow({},true)),'three-low-motion');
 assert.equal(P.chooseRenderer(fakeWindow({},false)),'three');
 const T=require('three'),template=new T.MeshStandardMaterial({vertexColors:true,flatShading:true}),shared={radius:{value:2640},morph:{value:1}},selected={value:4};
 const material=P.createBentMaterial(template,shared,selected);
 const shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>\n#include <project_vertex>\n#include <worldpos_vertex>\n',fragmentShader:'#include <common>\n#include <dithering_fragment>\n'};
 material.onBeforeCompile(shader,{});
 assert.equal(shader.uniforms.uPlanetRadius,shared.radius);assert.equal(shader.uniforms.uSelected,selected);
 assert.match(shader.vertexShader,/vec3 blrBend\(vec3 local\)/);assert.match(shader.vertexShader,/viewMatrix\*vec4\(blrBent,1\.0\)/);assert.doesNotMatch(shader.vertexShader,/#include <project_vertex>/);
 assert.match(shader.fragmentShader,/vSelected\*0\.7/);assert.equal(material.customProgramCacheKey(),P.createBentMaterial(template,shared,{value:-1}).customProgramCacheKey());
 assert.equal(material.flatShading,true);assert.equal(material.vertexColors,true);
 const status=[];const handle=P.mountBengaluruPlanet({},{manifest:{projection:{cityRadiusM:2535,capAngleDeg:110},tiles:[],landmarks:[],places:[],named:[],heights:{landmarkHeightBoost:1}},assetBase:'/x/',onStatus:s=>status.push(s)});
 assert.equal(handle.mode,'svg');assert.equal(status[0].mode,'svg');assert.match(status[0].message,/WebGL2/);handle.dispose();
});

test('kingdom input leaves Escape alone inside the native dialog deck instead of toggling pause',context=>{
 const {bindGameInput}=require('../app/game-input.ts'),original={window:global.window,document:global.document,HTMLElement:global.HTMLElement};
 class FakeElement extends EventTarget{constructor(matches){super();this.matches=matches}closest(selector){return selector.split(',').some(part=>this.matches.includes(part.trim()))?this:null}}
 global.window=new EventTarget();global.document=new EventTarget();document.hidden=false;global.HTMLElement=FakeElement;
 class Canvas extends EventTarget{setPointerCapture(){}hasPointerCapture(){return false}releasePointerCapture(){}}
 let pauses=0;const binding=bindGameInput(new Canvas(),{interact(){},pause(){pauses++},look(){},zoom(){},select(){},gesture(){}});
 context.after(()=>{binding.dispose();Object.assign(global,original)});
 const press=target=>{const event=new Event('keydown',{cancelable:true});Object.assign(event,{key:'Escape',code:'Escape',repeat:false});Object.defineProperty(event,'target',{value:target});window.dispatchEvent(event);return event};
 assert.equal(press(new FakeElement(['dialog'])).defaultPrevented,false,'a button inside <dialog> keeps its Escape');assert.equal(pauses,0);
 assert.equal(press(new FakeElement(['[role="dialog"]'])).defaultPrevented,false,'ARIA dialogs are still respected');assert.equal(pauses,0);
 assert.equal(press(new FakeElement(['button'])).defaultPrevented,true,'elsewhere Escape still toggles the kingdom pause');assert.equal(pauses,1);
});
