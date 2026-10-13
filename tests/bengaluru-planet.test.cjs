const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {createLocalFrame,createPlanetProjection,createWrappedPlanetProjection,densifyPolyline,densifyRing,geodeticToEcef,ecefToGeodetic}=require('../app/bengaluru-projection.ts');
const F=require('../app/bengaluru-features.ts'),G=require('../app/bengaluru-geometry.ts'),{encodeGlb,decodeGlb}=require('../app/bengaluru-glb.ts'),{buildPlanet,defaultPlanetConfig,renderFallbackSvg,renderSkySvg,skyTextureSize}=require('../app/bengaluru-pipeline.ts'),{createTileManager}=require('../app/bengaluru-tiles.ts'),{describeHeight}=require('../app/bengaluru-text.ts');
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

test('whole-globe projection covers every hemisphere while retaining source coordinates and metric heights',()=>{
 const bounds=[-10000,-20000,24000,12000],anchor=[620,-150],projection=createWrappedPlanetProjection({localBounds:bounds,anchor});
 const pole=projection.toPlanet(...anchor);assert.ok(Math.abs(pole[0])+Math.abs(pole[2])<1e-8);assert.ok(Math.abs(pole[1]-projection.radius)<1e-8);
 assert.equal(projection.kind,'whole-globe');assert.equal(projection.capAngleDeg,360);
 let oppositeHemisphere=false;
 for(let column=1;column<12;column++)for(let row=1;row<12;row++){
  const east=bounds[0]+(bounds[2]-bounds[0])*column/12,north=bounds[1]+(bounds[3]-bounds[1])*row/12,height=30;
  const point=projection.toPlanet(east,north,height),back=projection.fromPlanet(...point);
  assert.ok(Math.abs(Math.hypot(...point)-projection.radius-height)<1e-8,'building height remains in source metres');
  assert.ok(Math.abs(back.east-east)<1e-7&&Math.abs(back.north-north)<1e-7&&Math.abs(back.height-height)<1e-7,'interior points retain an inverse');
  if(point[1]<-projection.radius*.8)oppositeHemisphere=true;
 }
 assert.ok(oppositeHemisphere,'mapped geography reaches the far hemisphere, not only a cap');
 for(const north of [-19000,-1000,11000]){
  const left=projection.toPlanet(bounds[0],north),right=projection.toPlanet(bounds[2],north);
  assert.ok(Math.hypot(...left.map((value,index)=>value-right[index]))<1e-7,'the longitude seam is closed');
 }
 assert.throws(()=>projection.fromPlanet(0,0,0),RangeError);
 assert.throws(()=>createWrappedPlanetProjection({localBounds:[0,0,0,1]}),RangeError);
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

test('whole-globe builds stream identical tile bytes and retain extract provenance',()=>{
 const snapshot=syntheticSnapshot(),text=JSON.stringify(snapshot),input={sha256:sha256(text),bytes:Buffer.byteLength(text),description:'PBF fixture'};
 snapshot.provenance={format:'osm-pbf',sourceUrl:'https://example.test/extract.osm.pbf',inputSha256:'a'.repeat(64),inputBytes:1234,aoi:{kind:'versioned-custom-bbox',id:'fixture-area',bbox:syntheticConfig.bbox},skipped:[]};
 const config={...syntheticConfig,projectionMode:'whole-globe',anchor:[620,-150],worldUnitsPerMetre:.75},written=new Map(),progress=[];
 const retained=buildPlanet(snapshot,config,input,sha256),streamed=buildPlanet(snapshot,config,input,sha256,{writeFile:(file,content)=>written.set(file,content),onTile:completed=>progress.push(completed)});
 assert.equal(streamed.files.size,0,'binary outputs are released to the sink');assert.equal(written.size,retained.files.size);
 for(const [file,content] of written)assert.equal(sha256(content),sha256(retained.files.get(file)),file);
 assert.equal(streamed.manifest.projection.kind,'whole-globe');assert.equal(streamed.manifest.projection.capAngleDeg,360);
 assert.deepEqual(streamed.manifest.projection.anchor,[620,-150]);assert.equal(streamed.manifest.projection.worldUnitsPerMetre,.75);
 assert.equal(streamed.manifest.source.extract.inputSha256,'a'.repeat(64));assert.equal(streamed.manifest.aoi.id,'fixture-area');assert.equal(progress.at(-1),streamed.manifest.tiles.length);
 const consumed=structuredClone(snapshot),released=buildPlanet(consumed,config,input,sha256,{releaseSourceGeometry:true});
 assert.equal(consumed.elements.length,0);assert.ok(snapshot.elements.length>0,'default builds do not mutate the source');
 assert.deepEqual(released.manifest,retained.manifest,'releasing source geometry leaves provenance and generated output unchanged');
});

test('fallback and distant views preserve mapped courtyards and lake islands',()=>{
 const projection=createPlanetProjection({cityRadiusM:2535,capAngleDeg:110});
 const manifest={name:'Polygon holes',source:{attribution:'OpenStreetMap contributors',license:'ODbL 1.0'},heights:{landmarkHeightBoost:1},landmarks:[],counts:{}};
 const outer=[[-300,-300],[300,-300],[300,300],[-300,300]],hole=[[-100,-100],[-100,100],[100,100],[100,-100]];
 for(const featureClass of ['park','water','building']){
  const feature={id:'way/1',featureClass,subtype:featureClass==='building'?'yes':featureClass,tags:{},areaM2:320000,height:{heightM:8},polygons:[{outer,holes:[hole]}],lonLat:[77.5907,12.9794],local:[0,0]};
  const filled={...feature,polygons:[{outer,holes:[]}]};
  for(const render of [renderFallbackSvg,renderSkySvg]){
   const actual=render([feature],projection,manifest);
   assert.notEqual(actual,render([filled],projection,manifest),featureClass+' hole must affect the rendered geography');
   assert.match(actual,/fill-rule="evenodd"/);
  }
 }
});

test('offline PBF import retains complete crossing ways, nested holes and source provenance',async context=>{
 const {Readable}=require('node:stream'),{pipeline}=require('node:stream/promises'),os=require('node:os');
 const parser=require('osm-pbf-parser'),schemas=require('osm-pbf-parser/lib/parsers'),{importPbf}=require('../scripts/import-bengaluru-osm.cjs');
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'bengaluru-pbf-'));context.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const file=path.join(directory,'fixture.osm.pbf'),strings=[''],indices=new Map([['',0]]);
 const stringIndex=value=>{if(!indices.has(value)){indices.set(value,strings.length);strings.push(value)}return indices.get(value)};
 const tagsOf=tags=>({keys:Object.keys(tags).map(stringIndex),vals:Object.values(tags).map(stringIndex)});
 const delta=values=>values.map((value,index)=>value-(index?values[index-1]:0));
 const coordinates=[[77.57,12.97],[77.61,12.97],[77.584,12.964],[77.596,12.964],[77.596,12.976],[77.584,12.976],[77.588,12.968],[77.592,12.968],[77.592,12.972],[77.588,12.972]];
 const way=(id,refs,tags={})=>({id,refs:delta(refs),...tagsOf(tags)});
 const ways=[way(10,[1,2],{highway:'primary',name:'Crossing Road'}),way(11,[3,4,5,6,3]),way(12,[7,8,9,10,7]),way(13,[7,8,9,10,7],{building:'yes',height:'12'})];
 const relation=(id,members,tags)=>({id,memids:delta(members.map(member=>member.id)),roles_sid:members.map(member=>stringIndex(member.role)),types:members.map(member=>member.type),...tagsOf(tags)});
 const relations=[relation(19,[{id:20,role:'outer',type:2}],{type:'multipolygon',leisure:'park',name:'Nested Garden'}),relation(20,[{id:11,role:'outer',type:1},{id:12,role:'inner',type:1}],{type:'multipolygon',natural:'water',name:'Island Lake'}),relation(30,[{id:999,role:'outer',type:1}],{type:'multipolygon',natural:'water',name:'Incomplete Lake'})];
 const timestamp=Date.parse('2026-10-09T20:21:04Z')/1000;
 const header=schemas.osm.HeaderBlock.encode({required_features:['OsmSchema-V0.6','DenseNodes'],osmosis_replication_timestamp:timestamp});
 const block=schemas.osm.PrimitiveBlock.encode({stringtable:{s:strings.map(value=>Buffer.from(value))},granularity:100,lat_offset:0,lon_offset:0,date_granularity:1000,primitivegroup:[{dense:{id:coordinates.map(()=>1),lat:delta(coordinates.map(point=>Math.round(point[1]*1e7))),lon:delta(coordinates.map(point=>Math.round(point[0]*1e7))),keys_vals:coordinates.map(()=>0)}},{ways},{relations}]});
 await pipeline(Readable.from([{type:'OSMHeader',zlib_data:zlib.deflateSync(header)},{type:'OSMData',zlib_data:zlib.deflateSync(block)}]),new parser.BlobEncoder(),fs.createWriteStream(file));
 const config={bbox:{west:77.58,east:77.60,south:12.96,north:12.98},aoiId:'test-custom-aoi'};
 const options={cacheDir:directory,sourceUrl:'https://example.test/fixture.osm.pbf'};
 const result=await importPbf(file,config,options),again=await importPbf(file,config,options);
 assert.deepEqual(result.snapshot,again.snapshot,'the same source produces the same normalized snapshot');
 assert.equal(result.snapshot.osm3s.timestamp_osm_base,'2026-10-09T20:21:04.000Z');
 assert.equal(result.snapshot.provenance.inputSha256,sha256(fs.readFileSync(file)));
 assert.equal(result.snapshot.provenance.aoi.kind,'versioned-custom-bbox');assert.equal(result.snapshot.provenance.aoi.id,'test-custom-aoi');
 const crossing=result.snapshot.elements.find(element=>element.type==='way'&&element.id===10);
 assert.equal(crossing.geometry.length,2,'endpoints outside the AOI still preserve a crossing road');assert.ok(crossing.geometry[0].lon<config.bbox.west&&crossing.geometry[1].lon>config.bbox.east);
 const nested=result.snapshot.elements.find(element=>element.type==='relation'&&element.id===19);
 assert.deepEqual(nested.members.map(member=>member.role),['outer','inner']);assert.deepEqual(nested.members[0].sourceRelations,[19,20]);
 assert.equal(result.snapshot.elements.find(element=>element.id===13).tags.height,'12');
 assert.equal(result.snapshot.elements.some(element=>element.id===30),false);assert.ok(result.report.skipped.some(entry=>entry.id==='relation/30'&&entry.reason==='missing way 999'));
 assert.equal(fs.readdirSync(directory).some(name=>name.endsWith('.sqlite')),false,'temporary coordinate index is disposed');
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

test('Bengaluru rides the orbital line as a full globe clear of the board and every other planet',()=>{
 const {transitStops,TransitJourney,transitPoint}=require('../app/transit-config.ts'),{motherboardBounds}=require('../app/world-config.ts'),{createPlanetSurface}=require('../app/planet-geography.ts');
 const index=transitStops.findIndex(stop=>stop.id==='bengaluru'),stop=transitStops[index];
 assert.equal(index,transitStops.length-1,'appended so saved and shared station indices keep their meaning');assert.equal(stop.city,'bengaluru');assert.equal(stop.radius,require('../app/bengaluru-city-config.ts').bengaluruRegionRadius);assert.equal(stop.theme,'garden');
 const nearestX=Math.max(motherboardBounds.minX,Math.min(motherboardBounds.maxX,stop.x)),nearestZ=Math.max(motherboardBounds.minZ,Math.min(motherboardBounds.maxZ,stop.z-3));
 assert.ok(Math.hypot(stop.x-nearestX,stop.z-3-nearestZ)-stop.radius-48>30,'board clearance');
 const surface=createPlanetSurface(stop,stop.radius);
 for(const other of transitStops.slice(1)){if(other===stop)continue;assert.ok(Math.hypot(stop.x-other.x,stop.z-other.z)-stop.radius-other.radius-96>30,stop.id+' / '+other.id);assert.ok(surface.center.distanceTo(createPlanetSurface(other,other.radius).center)>surface.radius+other.radius+30,'spheres apart from '+other.id)}
 for(const origin of [0,1,3])for(const mode of ['metro','rocket']){
  const journey=new TransitJourney();journey.current=origin;assert.equal(journey.start(index,mode),true);
  for(let sample=0;sample<=10;sample++)assert.ok(Object.values(transitPoint(transitStops[origin],stop,sample/10,mode)).every(Number.isFinite));
  let arrivals=0;for(let frame=0;frame<170;frame++)arrivals+=Number(journey.tick(.1));assert.equal(arrivals,1);assert.equal(journey.current,index);
 }
});

test('regional city profile preserves metre heights and human walking speed on a whole globe',()=>{
 const {bengaluruRegionCity:city,bengaluruRegionRadius:radius,bengaluruRegionPosition,cityDirection,cityFlat,cityWalkingSpeed,cityArrivalCameraView}=require('../app/bengaluru-city-config.ts');
 assert.ok(radius>7000,'full geography has room for human-scale buildings');assert.equal(city.scale,.75);assert.equal(30*city.scale,22.5);
 const {movementSpeed}=require('../app/character-controller.ts');
 assert.equal(cityWalkingSpeed(city,movementSpeed('walk'))/city.scale,2,'walking is two source metres per second');assert.equal(cityWalkingSpeed(city,movementSpeed('skate'))/city.scale,35,'skating is thirty-five source metres per second');assert.equal(cityWalkingSpeed(null,movementSpeed('walk',false,'planet')),9.6,'other worlds retain their pace');
 const T=require('three'),{createPlanetSurface,planetPoint}=require('../app/planet-geography.ts'),{moveOnPlanet}=require('../app/planet-movement.ts');
 const surface=createPlanetSurface({id:'bengaluru',city:'bengaluru',name:'Bengaluru',subtitle:'',color:'#b7ab8e',theme:'garden',radius,...bengaluruRegionPosition},radius),origin=planetPoint(surface,new T.Vector3(0,1,0));
 for(const mode of ['walk','skate'])for(const frequency of [30,144]){
  const player=new T.Group();player.position.copy(origin);const speed=cityWalkingSpeed(city,movementSpeed(mode));
  for(let frame=0;frame<frequency;frame++)moveOnPlanet(player,surface,1,0,speed/frequency);
  assert.ok(Math.abs(player.position.distanceTo(origin)/city.scale-movementSpeed(mode))<.002,mode+' travels the requested metres in one second');
  player.position.copy(origin);delete player.userData.surfaceFrame;
  moveOnPlanet(player,surface,1,0,speed*.2,point=>point.x>=1&&point.x<=1.3);assert.ok(player.position.x<1,'fast movement does not tunnel through a wall');
 }
 for(const [east,north] of [[620,-150],[17256,-1074],[8465,-15017],[-8000,10000]]){const [x,y,z]=cityDirection(city,radius,east,north),back=cityFlat(city,radius,{x,y,z});assert.ok(Math.abs(back.east-east)<1e-7&&Math.abs(back.north-north)<1e-7)}
 assert.ok(Math.abs(bengaluruRegionPosition.z)-radius>20000,'large city stays clear of the existing orbital worlds');assert.ok(cityArrivalCameraView(.5).zoom<=14);
});

test('city globe projection inverts and keeps the whole mapped sphere free of invented roads and water',()=>{
 const T=require('three'),{transitStops}=require('../app/transit-config.ts'),{createPlanetSurface,planetGeography,planetPoint}=require('../app/planet-geography.ts'),{createPlanetColorizer}=require('../app/planet-biomes.ts');
 const C=require('../app/bengaluru-city-config.ts'),stop=transitStops.find(entry=>entry.id==='bengaluru'),city=C.cityPlanetFor(stop),surface=createPlanetSurface(stop,stop.radius),R=surface.radius;
 assert.ok(city&&C.cityPlanetFor({})===null&&C.cityPlanetFor(transitStops[1])===null);
 const crown=C.cityDirection(city,R,city.anchor.east,city.anchor.north);assert.ok(Math.abs(crown[0])+Math.abs(crown[2])<1e-9&&Math.abs(crown[1]-1)<1e-9);
 for(const [east,north] of [[0,0],[-5.63,35.37],[1500,-150],[620,1400],[-900,-900],[620,-149]]){
  const [x,y,z]=C.cityDirection(city,R,east,north),back=C.cityFlat(city,R,{x,y,z});
  assert.ok(Math.abs(Math.hypot(x,y,z)-1)<1e-9);assert.ok(Math.abs(back.east-east)<1e-6&&Math.abs(back.north-north)<1e-6,`round trip ${east},${north}`);
  assert.ok(back.rho>=0&&back.rho<=Math.PI*R,'arc distance stays within one hemisphere-to-antipode span');
 }
 const eastOfAnchor=C.cityDirection(city,R,city.anchor.east+500,city.anchor.north),northOfAnchor=C.cityDirection(city,R,city.anchor.east,city.anchor.north+500);
 assert.ok(eastOfAnchor[0]>0&&northOfAnchor[2]<0,'east is +x and north is -z near arrival');
 assert.equal(C.cityEdgeAngle(city,R),Math.PI);
 const inside=new T.Vector3(...C.cityDirection(city,R,1000,-800)),outside=new T.Vector3(0,-1,0),rim=new T.Vector3(...C.cityDirection(city,R,city.anchor.east+1700,city.anchor.north));
 assert.equal(C.cityEdgeDistance(city,R,inside),0);assert.equal(C.cityEdgeDistance(city,R,outside),0);assert.equal(C.cityEdgeDistance(city,R,rim),0);
 const flat=planetGeography(surface,inside),country=planetGeography(surface,outside);
 assert.deepEqual([flat.height,flat.road,flat.water,flat.mountain],[0,0,false,flat.mountain]);assert.equal(flat.river,Infinity);assert.equal(country.water,false);assert.equal(country.road,0);
 assert.ok(Math.abs(planetPoint(surface,inside).distanceTo(surface.center)-R)<1e-6,'the mapped disc is a true sphere');
 const colorize=createPlanetColorizer(stop),cityGround=new T.Color(city.ground);
 assert.ok(colorize(inside,flat).equals(cityGround),'earth tone under the tiles');assert.ok(colorize(outside,country).equals(cityGround),'the far side uses mapped styling too');
 assert.equal(createPlanetColorizer(transitStops[1])(inside,{height:0,road:0,river:Infinity}).equals(cityGround),false,'other globes keep their biome');
});

// Speech bubbles and signs draw text into canvases; the same stub the other planet tests use keeps that off the DOM.
const withCanvasDocument=context=>{const previous=global.document;global.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({measureText(text){return {width:text.length*parseFloat(this.font.split(' ')[1])*.55}}},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)})})};context.after(()=>{if(previous===undefined)delete global.document;else global.document=previous})};

test('city globes switch off the procedural network, travellers and shuttles',context=>{
 withCanvasDocument(context);
 const T=require('three'),{transitStops}=require('../app/transit-config.ts'),{createPlanetSurface}=require('../app/planet-geography.ts');
 const stop=transitStops.find(entry=>entry.id==='bengaluru'),surface=createPlanetSurface(stop,stop.radius),scene=new T.Scene();
 const infrastructure=require('../app/planet-infrastructure.ts').createPlanetInfrastructure(scene,surface);
 assert.deepEqual([infrastructure.roads.length,infrastructure.rivers.length,infrastructure.towns.length,infrastructure.buildings.length,infrastructure.pools.length],[0,0,0,0,0]);
 assert.equal(infrastructure.blocked(surface.center.clone().add(new T.Vector3(0,surface.radius,0)),.45),false);assert.equal(infrastructure.root.children.length,0);
 const population=require('../app/planet-population.ts').createPlanetPopulation(scene,surface,infrastructure.towns);
 assert.deepEqual([population.residents.length,population.traffic.length],[0,0]);assert.equal(population.prompt(surface.center),null);
 const forge=createPlanetSurface(transitStops[1],transitStops[1].radius),forgeTowns=require('../app/planet-infrastructure.ts').planetTowns(forge);
 assert.ok(forgeTowns.length>0&&require('../app/planet-population.ts').createPlanetPopulation(scene,forge,forgeTowns).residents.length>18,'other globes are unchanged');
});

const publishedRequest=(root)=>async(url)=>{const file=String(url).replace('/assets/bengaluru-v1/','');const bytes=fs.readFileSync(path.join(root,file));return {ok:true,status:200,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}};

async function loadCivicPayload(city,request){
 const {GLTFLoader}=require('three/addons/loaders/GLTFLoader.js'),{cityPlanetTiles}=require('../app/bengaluru-city-planet.ts'),loader=new GLTFLoader(),tiles=[];let bytes=0;
 for(const record of cityPlanetTiles(city)){
  const lod=record.lods.find(entry=>entry.level===0),buffer=await(await request(city.assetBase+lod.file)).arrayBuffer(),asset=await loader.parseAsync(buffer,city.assetBase);bytes+=buffer.byteLength;tiles.push({record,scene:asset.scene});
 }
 return {city,tiles,bytes};
}

test('city planet bakes the published tiles onto the globe with collision footprints, trees and landmarks',async()=>{
 const T=require('three'),{transitStops}=require('../app/transit-config.ts'),{createPlanetSurface}=require('../app/planet-geography.ts'),{disposeScene}=require('../app/scene-resources.ts');
 const P=require('../app/bengaluru-city-planet.ts'),C=require('../app/bengaluru-city-config.ts'),stop=transitStops.find(entry=>entry.id==='bengaluru'),city=C.bengaluruCity,surface=createPlanetSurface(stop,stop.radius),R=surface.radius;
 const selected=P.cityPlanetTiles(city);assert.ok(selected.length>=30&&selected.length<P.cityPlanetManifest.tiles.length,'only tiles touching the disc are fetched');
 for(const tile of P.cityPlanetManifest.tiles){const [minE,minN,maxE,maxN]=tile.bounds,near=Math.hypot(Math.max(minE,Math.min(maxE,city.anchor.east))-city.anchor.east,Math.max(minN,Math.min(maxN,city.anchor.north))-city.anchor.north);assert.equal(selected.includes(tile),near<=city.radiusM,tile.id)}
 const requests=[],request=publishedRequest(path.resolve(__dirname,'../public/assets/bengaluru-v1')),counting=async(url,init)=>{requests.push(String(url));return request(url,init)};
 const aborted=new AbortController();aborted.abort();assert.equal(await P.loadCityPlanetTiles(surface,aborted.signal,counting),null);assert.equal(requests.length,0);
 assert.equal(await P.loadCityPlanetTiles(createPlanetSurface(transitStops[1],transitStops[1].radius),new AbortController().signal,counting),null,'other globes fetch nothing');
 assert.deepEqual(await P.loadCityPlanetTiles(surface,new AbortController().signal),{city:C.bengaluruRegionCity,tiles:[],bytes:0},'no browser, no fetch: the globe builds bare');
 await assert.rejects(P.loadCityPlanetTiles(surface,new AbortController().signal,async()=>({ok:false,status:503})),/responded 503/);
 const payload=await loadCivicPayload(city,counting);
 assert.equal(payload.tiles.length,selected.length);assert.ok(requests.every(url=>url.endsWith('-l0.glb')),'near detail everywhere; the whole disc is walkable');assert.ok(payload.bytes>2e6);
 const scene=new T.Scene(),builder=P.buildCityPlanetWorld(scene,surface,payload);let steps=0,result=builder.next();while(!result.done){steps++;result=builder.next()}const world=result.value;
 assert.equal(steps,payload.tiles.length,'one scheduler step per tile');assert.equal(world.bakedTiles,payload.tiles.length);assert.ok(world.triangles>60000,'triangles '+world.triangles);assert.ok(world.blockerCount>20000);
 const layers=world.root.children.filter(child=>child.isMesh).map(child=>child.name);assert.ok(layers.includes('Bengaluru_building')&&layers.includes('Bengaluru_ground'));
 const point=new T.Vector3(),discUnits=city.radiusM*city.scale;let vertices=0;
 for(const mesh of world.root.children){
  if(!mesh.isMesh||mesh.isInstancedMesh)continue;const positions=mesh.geometry.attributes.position,index=mesh.geometry.index.array;assert.equal(mesh.geometry.attributes._featureid,undefined);
  for(let i=0;i<index.length;i++){point.fromBufferAttribute(positions,index[i]);const distance=point.distanceTo(surface.center),arc=C.cityFlat(city,R,point.sub(surface.center)).rho;vertices++;
   assert.ok(distance>R-2.6&&distance<R+120*city.scale,mesh.name+' vertex off the globe: '+distance);assert.ok(arc>=city.deckRadius-.05&&arc<=discUnits+.05,mesh.name+' outside the disc or on the deck: '+arc)}
 }
 assert.ok(vertices>100000);
 const prestigeOpal=world.toPlanet(442.33,425.58,0),lawn=world.toPlanet(city.anchor.east+190,city.anchor.north,0);
 assert.equal(world.blocked(prestigeOpal,.45),true,'building roofs block walking');assert.equal(world.blocked(lawn,.45),false,'Cubbon Park lawn stays open');assert.equal(world.blocked(lawn,2.25),false,'the rover reach stays short');
 const flatBack=world.flatAt(prestigeOpal);assert.ok(Math.abs(flatBack.east-442.33)<.01&&Math.abs(flatBack.north-425.58)<.01);
 assert.equal(world.blocked(surface.center.clone().add(new T.Vector3(0,-R,0)),.45),false,'the far side is open country');
 assert.equal(world.landmarks.length,P.cityPlanetManifest.landmarks.length,'every published landmark lies inside the disc');
 const vidhana=world.nearest(world.toPlanet(-5.63,35.37,0));assert.equal(vidhana?.name,'Vidhana Soudha');assert.match(vidhana.description,/Civic building .*30 m \(OpenStreetMap height tag\)/);assert.equal(world.nearest(lawn),undefined);
 assert.ok(world.trees&&world.trees.count>1000&&world.trees.count<=city.trees);
 const matrix=new T.Matrix4(),treePosition=new T.Vector3();world.trees.getMatrixAt(0,matrix);treePosition.setFromMatrixPosition(matrix);assert.ok(Math.abs(treePosition.distanceTo(surface.center)-R)<.2);
 require('../app/static-batching.ts').batchScenery(world.root,{});assert.ok(world.root.children.some(child=>child.name==='SceneryBatch'),'the baked city merges like other scenery');
 disposeScene(world.root);
});

test('a city globe builds through the shared planet landscape with its outposts kept off the map',async context=>{
 withCanvasDocument(context);
 const T=require('three'),{transitStops}=require('../app/transit-config.ts'),{createPlanetSurface}=require('../app/planet-geography.ts'),{createPlanetLandscape}=require('../app/planet-surface.ts');
 const P=require('../app/bengaluru-city-planet.ts'),C=require('../app/bengaluru-city-config.ts'),stop=transitStops.find(entry=>entry.id==='bengaluru'),city=C.bengaluruCity,surface=createPlanetSurface(stop,stop.radius);
 const payload=await loadCivicPayload(city,publishedRequest(path.resolve(__dirname,'../public/assets/bengaluru-v1')));
 const landscape=createPlanetLandscape(new T.Scene(),surface,undefined,payload);
 assert.ok(landscape.city&&landscape.city.landmarks.length===P.cityPlanetManifest.landmarks.length);assert.equal(landscape.infrastructure.towns.length,0);assert.equal(landscape.population.residents.length,0);assert.equal(landscape.publicSpaces.places.length,0);
 assert.equal(landscape.blocked(landscape.city.toPlanet(442.33,425.58,0)),true);assert.equal(landscape.blocked(landscape.city.toPlanet(city.anchor.east+190,city.anchor.north,0)),false);
 const discUnits=city.radiusM*city.scale;for(const outpost of landscape.outposts)assert.ok(C.cityFlat(city,surface.radius,outpost.position.clone().sub(surface.center)).rho>discUnits+5,outpost.name+' keeps clear of the city');
 assert.ok(landscape.distant.rotation.z>1.5,'the orbital silhouette turns the city map toward the landing pole');
 assert.equal(landscape.distant.material.fog,false,'the regional overview remains visible at its physical orbital distance');
 assert.equal(createPlanetLandscape(new T.Scene(),surface).city,null,'no tiles means no city layer rather than a failure');
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
 while(manager.update(high).loading||manager.stats().queued){for(const k of Array.from(open.keys()))open.get(k).resolve();await new Promise(r=>setImmediate(r))}
 const residentCount=manager.resident().length;assert.ok(residentCount>=20);
 manager.update(far);assert.equal(manager.resident().length,3,'eviction keeps only the leftover budget');assert.ok(events.filter(e=>e.startsWith('dispose')).length>=residentCount-3);
 const close={position:projection.toPlanet(250,250,420),viewportHeight:900,fovY:.66};
 manager.update(close);await new Promise(r=>setImmediate(r));
 const nearKeys=[...open.keys()].filter(k=>k.endsWith(':0'));assert.ok(nearKeys.includes('t0_0:0'),'close camera requests the near LOD');
 manager.update(far);manager.update(close);
 while(manager.update(close).loading||manager.stats().queued){for(const k of Array.from(open.keys()))open.get(k).resolve();await new Promise(r=>setImmediate(r))}
 const t00=manager.resident().filter(r=>r.tile.id==='t0_0');assert.deepEqual(t00.map(r=>r.level),[0],'near LOD replaces the far LOD of the same tile');
 manager.update(far);manager.request('t2_2',1);assert.ok(manager.stats().loading+manager.stats().queued>=1,'explicit requests load even when out of view');
 manager.dispose();assert.equal(manager.resident().length,0);assert.equal(open.size,0);
 const afterDispose=manager.update(high);assert.equal(afterDispose.wanted,0);
});

test('regional streaming bounds wanted tiles and resident bytes, and backs off failed requests',async()=>{
 const projection=createPlanetProjection({cityRadiusM:2535,capAngleDeg:110}),radius=projection.radius;
 const tiles=Array.from({length:12},(_value,index)=>({id:'budget-'+index,ix:index,iy:0,bounds:[index*20,0,index*20+20,20],center:[index*20+10,10],radiusM:40,lods:[{level:0,file:'near',bytes:160,sha256:'',triangles:0,vertices:0},{level:1,file:'far',bytes:100,sha256:'',triangles:0,vertices:0}],features:'features',counts:{},trees:0,featureCount:0}));
 let now=0,requests=0;
 const manager=createTileManager({tiles,projection,concurrency:2,maxWantedTiles:3,maxResidentBytes:300,now:()=>now,initial:[{tile:tiles[0],level:1,asset:{id:tiles[0].id,bytes:100}}],load:async(tile,level)=>{requests++;return {id:tile.id,bytes:level?100:160}},bytesOf:asset=>asset.bytes,attach(){},detach(){},dispose(){}});
 assert.equal(manager.stats().resident,1,'preloaded arrival geometry is adopted without fetching it again');
 const view={position:[0,radius*3,0],viewportHeight:900,fovY:.66};
 manager.update(view);await new Promise(resolve=>setImmediate(resolve));
 assert.ok(manager.stats().wanted<=3,'visible requests obey the tile limit');assert.ok(manager.stats().bytes<=300,'active tiles obey the resident budget');
 manager.update({position:projection.toPlanet(200,0,60),viewportHeight:900,fovY:.66});await new Promise(resolve=>setImmediate(resolve));
 assert.ok(manager.stats().bytes<=300,'LOD replacement stays within the budget');manager.dispose();assert.equal(manager.stats().wanted,0);
 requests=0;
 const failing=createTileManager({tiles:[tiles[0]],projection,now:()=>now,load:async()=>{requests++;throw new Error('offline')},attach(){},detach(){},dispose(){}});
 for(let frame=0;frame<10;frame++){failing.update(view);await new Promise(resolve=>setImmediate(resolve))}
 assert.equal(requests,1,'a failed tile is not fetched again on every frame');
 now=2000;failing.update(view);await new Promise(resolve=>setImmediate(resolve));assert.equal(requests,2);failing.dispose();
});

test('cancelled tile decoding retains its concurrency slot until completion',async()=>{
 const projection=createPlanetProjection({cityRadiusM:2535,capAngleDeg:110}),radius=projection.radius;
 const tile={id:'decode',ix:0,iy:0,bounds:[0,0,20,20],center:[10,10],radiusM:40,lods:[{level:1,file:'far',bytes:100,sha256:'',triangles:0,vertices:0}],features:'features',counts:{},trees:0,featureCount:0};
 const completions=[];let inFlight=0,peak=0,disposed=0;
 const manager=createTileManager({tiles:[tile],projection,concurrency:1,load:()=>new Promise(resolve=>{inFlight++;peak=Math.max(peak,inFlight);completions.push(()=>{inFlight--;resolve({bytes:100})})}),attach(){},detach(){},dispose(){disposed++},bytesOf:asset=>asset.bytes});
 const front={position:[0,radius*3,0],viewportHeight:900,fovY:.66},back={...front,position:[0,-radius*3,0]};
 manager.update(front);manager.update(back);manager.update(front);
 assert.equal(completions.length,1,'the cancelled decode still occupies the only slot');
 completions.shift()();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(disposed,1,'cancelled result is released');assert.equal(completions.length,1,'replacement starts after cancellation settles');assert.equal(manager.stats().loading,1,'old completion did not remove the replacement');
 completions.shift()();await new Promise(resolve=>setImmediate(resolve));assert.equal(peak,1);assert.equal(manager.resident().length,1);manager.dispose();
});

test('regional city loads a bounded arrival and focuses the existing character on loaded clear ground',async()=>{
 const T=require('three'),{loadBengaluruRegion,buildBengaluruRegionWorld}=require('../app/bengaluru-region-world.ts');
 const {bengaluruRegionCity:city,bengaluruRegionRadius:radius,bengaluruRegionPosition}=require('../app/bengaluru-city-config.ts');
 const {createPlanetSurface}=require('../app/planet-geography.ts');
 const surface=createPlanetSurface({id:'bengaluru',city:'bengaluru',name:'Bengaluru',theme:'garden',color:'#b7ab8e',subtitle:'',...bengaluruRegionPosition,radius},radius);
 const base=path.resolve(__dirname,'../public/assets/bengaluru-region-v1');let requests=0,advance=()=>{};
 const request=async url=>{requests++;await new Promise(resolve=>setImmediate(()=>{advance();resolve()}));const bytes=fs.readFileSync(path.join(base,String(url).replace(city.assetBase,'')));return {ok:true,status:200,json:async()=>JSON.parse(bytes.toString()),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}};
 const payload=await loadBengaluruRegion(surface,new AbortController().signal,request);
 assert.ok(payload.tiles.length<=9);assert.ok(requests<=19,'arrival does not fetch the whole city');
 const generator=buildBengaluruRegionWorld(new T.Scene(),surface,payload);let result=generator.next();while(!result.done)result=generator.next();const world=result.value;
 try{
  assert.ok(world.bakedTiles<=9);assert.ok(world.bytes<=24*1048576);assert.ok(world.triangles>1000);
  const assertBuildings=()=>{
  let checkedBuildings=0;
  world.root.traverse(mesh=>{
   if(mesh.name!=='Bengaluru_building')return;
   const geometry=mesh.geometry,positions=geometry.attributes.position,local=geometry.attributes.cityMeters,ids=geometry.getAttribute('_featureid'),indices=geometry.index,buildings=new Map(),bottomHeights=new Map();
   for(let vertex=0;vertex<positions.count;vertex++){const id=Math.round(ids.getX(vertex));bottomHeights.set(id,Math.min(bottomHeights.get(id)??Infinity,local.getY(vertex)))}
   for(let offset=0;offset<indices.count;offset+=3){
    const vertices=[indices.getX(offset),indices.getX(offset+1),indices.getX(offset+2)],id=Math.round(ids.getX(vertices[0])),entry=buildings.get(id)??{roofs:0,walls:0,bases:0};buildings.set(id,entry);
    const heights=vertices.map(vertex=>local.getY(vertex));
    if(Math.max(...heights)-Math.min(...heights)<.02){
     const isBase=Math.abs(heights[0]-bottomHeights.get(id))<.02;
     if(isBase)entry.bases++;else entry.roofs++;
     const normal=faceNormal(positions.array,...vertices),point=new T.Vector3().fromBufferAttribute(positions,vertices[0]).sub(surface.center);
    const facing=new T.Vector3(...normal).dot(point);
     assert.ok(isBase?facing<0:facing>0,'building cap faces outward: '+JSON.stringify({tile:mesh.userData.cityTile,id,isBase,facing,normal,vertices:vertices.map(vertex=>[local.getX(vertex),local.getY(vertex),local.getZ(vertex)])}));
    }else entry.walls++;
   }
   for(const [id,entry] of buildings){assert.ok(entry.roofs>0&&entry.bases===entry.roofs&&entry.walls>=6,'building has a roof, base and enclosing walls: '+JSON.stringify({tile:mesh.userData.cityTile,id,...entry}));checkedBuildings++}
  });
  assert.ok(checkedBuildings>50,'validate real buildings across the arrival tiles');
  };
  assertBuildings();
  const groundMesh=world.root.getObjectByName('Bengaluru_Base'),groundPoint=new T.Vector3().fromBufferAttribute(groundMesh.geometry.attributes.position,0);
  assert.ok(Math.abs(groundPoint.distanceTo(surface.center)-(radius-.08*city.scale))<.01,'resident ground follows the sphere at street scale');
  const treeMesh=world.root.getObjectByName('Bengaluru_Trees'),treeMatrix=new T.Matrix4();treeMesh.getMatrixAt(0,treeMatrix);
  assert.ok(Math.abs(new T.Vector3().setFromMatrixPosition(treeMatrix).distanceTo(surface.center)-(radius+.025*city.scale))<.01,'trees meet the park surface instead of floating');
  const lawn=world.toPlanet(city.anchor.east+190,city.anchor.north),building=world.toPlanet(442.33,425.58);
  assert.equal(world.region.readyAt(lawn),true);assert.equal(world.blocked(lawn,.225),false);assert.equal(world.blocked(building,.225),true);
  const rocketSpawn=new T.Vector3(surface.stop.x+13.8,surface.stop.y,surface.stop.z+2),originalSpawn=rocketSpawn.toArray();
  assert.equal(world.blocked(rocketSpawn,.225),true,'the reported rocket exit overlaps mapped geometry');
  assert.equal(typeof world.region.arrivalPosition,'function','mapped arrivals need a collision-safe exit');
  const exit=world.region.arrivalPosition(rocketSpawn);
  assert.ok(exit,'a nearby safe exit is available');assert.equal(world.blocked(exit,.225),false);assert.equal(world.region.readyAt(exit),true);assert.ok(exit.distanceTo(rocketSpawn)<30);
  assert.deepEqual(rocketSpawn.toArray(),originalSpawn,'search does not move the character before committing the arrival');
  assert.equal(world.region.arrivalPosition(rocketSpawn,()=>true),null,'station obstacles must not be bypassed');
  const above=building.clone().sub(surface.center).normalize(),inspection=world.region.select(new T.Raycaster(building.clone().addScaledVector(above,200),above.clone().negate(),0,400));
  assert.equal(inspection?.featureClass,'building');assert.match(inspection.id,/^(way|relation)\//);assert.ok(inspection.heightSource);assert.equal(typeof inspection.heightEstimated,'boolean');
  const whitefield=world.region.manifest.places.find(place=>place.id==='node/377219489');assert.ok(whitefield);
  const player=new T.Group();player.position.copy(lawn);
  advance=()=>world.region.update(.2,player,true);
  assert.equal(await world.region.focus(whitefield.id,player),true);
  assert.equal(world.region.readyAt(player.position),true,'focus waits for collision-ready geometry');assert.equal(world.blocked(player.position,.225),false,'focus never leaves the character inside a building or water');
  assertBuildings();
  let checkedWalls=0;
  world.root.traverse(mesh=>{
   if(mesh.name!=='Bengaluru_building'||mesh.userData.cityTile!=='t35_-2')return;
   const geometry=mesh.geometry,positions=geometry.attributes.position,local=geometry.attributes.cityMeters,ids=geometry.getAttribute('_featureid'),indices=geometry.index,vertices=[];
   for(let vertex=0;vertex<positions.count;vertex++)if(Math.round(ids.getX(vertex))===691)vertices.push(vertex);
   assert.equal(vertices.length,8,'the close-up regression uses the mapped four-wall building');
   const center=vertices.reduce((total,vertex)=>total.add(new T.Vector3().fromBufferAttribute(positions,vertex)),new T.Vector3()).divideScalar(vertices.length);
   for(let offset=0;offset<indices.count;offset+=3){
    const first=indices.getX(offset),second=indices.getX(offset+1),third=indices.getX(offset+2);if(Math.round(ids.getX(first))!==691)continue;
    const heights=[first,second,third].map(vertex=>local.getY(vertex));if(Math.max(...heights)-Math.min(...heights)<.02)continue;
    const outward=[first,second,third].reduce((total,vertex)=>total.add(new T.Vector3().fromBufferAttribute(positions,vertex)),new T.Vector3()).divideScalar(3).sub(center);
    assert.ok(new T.Vector3(...faceNormal(positions.array,first,second,third)).dot(outward)>0,'mapped building walls face outward, not into the building');checkedWalls++;
   }
  });
  assert.equal(checkedWalls,8,'all four walls must be checked');
  assert.ok(world.bytes<=24*1048576);assert.ok(player.userData.surfaceFrame.isQuaternion);
 }finally{world.region.dispose()}
 assert.equal(world.root.children.length,0);assert.equal(world.region.stats().resident,0);
});

test('regional walls enclose concave footprints while courtyard walls face their open void',()=>{
 const T=require('three'),{buildBengaluruRegionWorld}=require('../app/bengaluru-region-world.ts'),{createPlanetSurface}=require('../app/planet-geography.ts');
 const {bengaluruRegionCity:city,bengaluruRegionRadius:radius,bengaluruRegionPosition}=require('../app/bengaluru-city-config.ts'),manifest=require('../app/bengaluru-region-manifest.json');
 const surface=createPlanetSurface({id:'bengaluru',city:'bengaluru',name:'Bengaluru',theme:'garden',color:'#b7ab8e',subtitle:'',...bengaluruRegionPosition,radius},radius);
 const footprint={outer:[[0,0],[40,0],[40,12],[24,12],[24,36],[0,36]].reverse(),holes:[[[4,4],[4,8],[10,8],[10,4]].reverse()]},builder=new G.FlatMeshBuilder();builder.addExtrusion(footprint,2,12,[200,180,150],0,40);
 const buffers=builder.build(),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(buffers.positions,3));geometry.setAttribute('color',new T.BufferAttribute(buffers.colors,4,true));geometry.setAttribute('_featureid',new T.BufferAttribute(buffers.featureIds,1));geometry.setIndex(new T.BufferAttribute(buffers.indices,1));
 const scene=new T.Group(),mesh=new T.Mesh(geometry,new T.MeshStandardMaterial());mesh.name='building';scene.add(mesh);
 const record={...manifest.tiles[0],id:'t0_0',ix:0,iy:0,bounds:[0,0,500,500],center:[250,250],featureCount:1},feature={index:0,id:'way/courtyard-fixture',featureClass:'building',minHeightM:2,heightM:12};
 const payload={city,manifest:{...manifest,tiles:[record],landmarks:[],places:[]},tiles:[{record,level:0,scene,features:[feature],bytes:buffers.positions.byteLength+buffers.indices.byteLength}],loadTile:async()=>{throw new Error('fixture must not fetch')}};
 const generator=buildBengaluruRegionWorld(new T.Scene(),surface,payload);let result=generator.next();while(!result.done)result=generator.next();const world=result.value;
 try{
  const building=world.root.getObjectByName('Bengaluru_building');assert.equal(building.material.side,T.FrontSide);world.root.updateMatrixWorld(true);
  for(const [outside,inside] of [[[20,-2],[20,2]],[[42,6],[38,6]],[[26,20],[22,20]],[[7,6],[2,6]]]){
   const origin=world.toPlanet(...outside,6),target=world.toPlanet(...inside,6),ray=new T.Raycaster(origin,target.clone().sub(origin).normalize(),0,origin.distanceTo(target));
   assert.ok(ray.intersectObject(building,false).length>0,'front faces are visible from outside or the courtyard: '+JSON.stringify(outside));
  }
  const holeTop=world.toPlanet(7,6,20),down=surface.center.clone().sub(holeTop).normalize();
  assert.equal(new T.Raycaster(holeTop,down,0,30).intersectObject(building,false).length,0,'courtyard is open through both roof and base');
  const roofOrigin=world.toPlanet(20,5,20),floorOrigin=world.toPlanet(20,5,0);
  assert.ok(new T.Raycaster(roofOrigin,surface.center.clone().sub(roofOrigin).normalize(),0,20).intersectObject(building,false).length>0,'solid roof is visible from above');
  assert.ok(new T.Raycaster(floorOrigin,floorOrigin.clone().sub(surface.center).normalize(),0,20).intersectObject(building,false).length>0,'solid base is visible from below');
 }finally{world.region.dispose()}
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
