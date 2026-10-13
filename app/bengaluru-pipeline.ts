/**
 * Deterministic OSM snapshot -> planet tile build. Same snapshot, configuration and code
 * produce identical tiles, feature ownership and manifest bytes. Nothing here touches the
 * DOM or the network; the CLI in scripts/build-bengaluru-planet.cjs handles files.
 */
import {createPlanetProjection,createWrappedPlanetProjection,type PlanetProjection,type Vec3} from './bengaluru-projection';
import {buildFeatures,clipLineToRect,ringBounds,simplifyLine,simplifyRing,tileFor,tilesCovering,type FeatureClass,type HeightSource,type LandmarkSpec,type OsmSnapshot,type Polygon,type SourceFeature,type TileAddress} from './bengaluru-features';
import {FlatMeshBuilder,featureColor,palette,placeTrees,surfaceLift,treeDensity,type MeshBuffers,type RGB} from './bengaluru-geometry';
import {encodeGlb,type GlbMeshInput} from './bengaluru-glb';

export type PlanetConfig={
 name:string;
 origin:{lon:number;lat:number;label:string};
 bbox:{south:number;west:number;north:number;east:number};
 projectionMode?:'spherical-cap'|'whole-globe';
 anchor?:[number,number];
 aoiId?:string;
 worldUnitsPerMetre?:number;
 /** Angular diameter of the mapped area on the fictional planet, degrees. */
 capAngleDeg:number;
 tileSizeM:number;
 storeyHeightM:number;
 densifyM:number;
 /** Vertical emphasis for configured landmarks; footprints and positions never move. */
 landmarkHeightBoost:number;
 landmarks:LandmarkSpec[];
 lod1:{simplifyToleranceM:number;minBuildingAreaM2:number};
};

export type FeatureRecord={
 index:number;id:string;name?:string;featureClass:FeatureClass;subtype:string;
 center:[number,number];lonLat:[number,number];bbox:[number,number,number,number];
 heightM?:number;minHeightM?:number;displayHeightM?:number;heightSource?:HeightSource;heightEstimated?:boolean;levels?:number;
 landmark?:string;rank?:number;areaM2?:number;tags:Record<string,string>;
};
export type TileLodRecord={level:0|1;file:string;bytes:number;sha256:string;triangles:number;vertices:number};
export type TileRecord={id:string;ix:number;iy:number;bounds:[number,number,number,number];center:[number,number];radiusM:number;lods:TileLodRecord[];features:string;counts:Record<string,number>;trees:number;featureCount:number};
export type LandmarkRecord={id:string;label:string;name?:string;featureClass:FeatureClass;tile:string;index:number;local:[number,number];lonLat:[number,number];heightM?:number;heightSource?:HeightSource;heightEstimated?:boolean};
export type PlaceRecord={id:string;name:string;subtype:string;rank:number;local:[number,number];lonLat:[number,number]};
export type NamedRecord={id:string;name:string;featureClass:FeatureClass;tile:string;index:number;local:[number,number]};
export type PlanetManifest={
 version:1;generator:string;name:string;
 source:{provider:'OpenStreetMap';license:'ODbL 1.0';licenseUrl:string;attribution:string;snapshotTimestamp?:string;inputSha256:string;inputBytes:number;inputDescription:string;extract?:OsmSnapshot['provenance']};
 origin:{lon:number;lat:number;label:string};
 aoi:{bbox:PlanetConfig['bbox'];localBounds:[number,number,number,number];id?:string;kind?:string};
 projection:{kind:'spherical-cap'|'whole-globe';cityRadiusM:number;capAngleDeg:number;planetRadiusM:number;anchor?:[number,number];worldUnitsPerMetre?:number};
 heights:{storeyHeightM:number;landmarkHeightBoost:number;sources:Record<HeightSource,number>};
 tileSizeM:number;tiles:TileRecord[];landmarks:LandmarkRecord[];places:PlaceRecord[];named:NamedRecord[];
 counts:Record<string,number>;skipped:{total:number;reasons:Record<string,number>};
 fallback:string;
 /** Equirectangular texture (SVG) with the city cap centred on the equator, for distant globe rendering. */
 sky:string;
};
export type BuildInput={sha256:string;bytes:number;description:string};
export type PlanetBuild={manifest:PlanetManifest;files:Map<string,Uint8Array|string>;report:{tiles:number;bytes:number;features:number;trees:number;skipped:{id:string;reason:string}[]}};
export type Hasher=(bytes:Uint8Array)=>string;
export type PlanetBuildOptions={writeFile?:(file:string,content:Uint8Array|string)=>void;onTile?:(completed:number,total:number)=>void;releaseSourceGeometry?:boolean};

export const generatorId='bengaluru-planet-build/1';
export const defaultPlanetConfig:PlanetConfig={
 name:'Bengaluru civic core',origin:{lon:77.5907,lat:12.9794,label:'Vidhana Soudha'},bbox:{south:12.964,west:77.578,north:12.99,east:77.608},
 capAngleDeg:110,tileSizeM:500,storeyHeightM:3,densifyM:40,landmarkHeightBoost:1.2,landmarks:[],lod1:{simplifyToleranceM:1.5,minBuildingAreaM2:25},
};

const lodRoadFilter=(feature:SourceFeature,level:0|1)=>level===0||!feature.lineStyle||feature.lineStyle.lod===1;
const materialIndex={building:0,ground:1,water:2,trees:3} as const;
const glbMaterials=[{name:'building',roughness:.82},{name:'ground',roughness:.94},{name:'water',roughness:.32,metallic:.05},{name:'trees',roughness:1}];
const round=(value:number,digits=3)=>Number(value.toFixed(digits));

export function buildPlanet(snapshot:OsmSnapshot,config:PlanetConfig,input:BuildInput,hash:Hasher,options:PlanetBuildOptions={}):PlanetBuild{
 const built=buildFeatures(snapshot,config.origin,{storeyHeightM:config.storeyHeightM,landmarks:config.landmarks,bbox:config.bbox});
 if(options.releaseSourceGeometry)snapshot.elements.length=0;
 const corners=[[config.bbox.west,config.bbox.south],[config.bbox.east,config.bbox.south],[config.bbox.east,config.bbox.north],[config.bbox.west,config.bbox.north]].map(([lon,lat])=>{const p=built.frame.toLocal(lon,lat);return [p.east,p.north] as [number,number]});
 const localBounds=ringBounds(corners).map(v=>round(v,2)) as [number,number,number,number];
 const cityRadiusM=Math.ceil(Math.max(...corners.map(([e,n])=>Math.hypot(e,n))));
 const wholeGlobe=config.projectionMode==='whole-globe',projection=wholeGlobe?createWrappedPlanetProjection({localBounds,anchor:config.anchor}):createPlanetProjection({cityRadiusM,capAngleDeg:config.capAngleDeg});
 const features=built.features,tiles=tilesCovering(localBounds,config.tileSizeM),files=new Map<string,Uint8Array|string>();
 const writeFile=(file:string,content:Uint8Array|string)=>{if(options.writeFile)options.writeFile(file,content);else files.set(file,content)};
 const byTile=new Map<string,{tile:TileAddress;clip:[number,number,number,number];features:Map<string,SourceFeature>;trees:[number,number][]}>();
 for(const tile of tiles)byTile.set(tile.id,{tile,clip:[Math.max(tile.bounds[0],localBounds[0]),Math.max(tile.bounds[1],localBounds[1]),Math.min(tile.bounds[2],localBounds[2]),Math.min(tile.bounds[3],localBounds[3])],features:new Map(),trees:[]});
 const overlaps=(bounds:readonly [number,number,number,number],rect:readonly [number,number,number,number])=>bounds[0]<rect[2]&&bounds[2]>rect[0]&&bounds[1]<rect[3]&&bounds[3]>rect[1];
 const featureBounds=new Map<string,[number,number,number,number]>(),homeTileOf=new Map<string,string>();
 for(const feature of features){
  const bounds=feature.polygons?feature.polygons.reduce((acc,p)=>ringBounds(p.outer,acc),[Infinity,Infinity,-Infinity,-Infinity] as [number,number,number,number]):feature.line?ringBounds(feature.line):[feature.local[0],feature.local[1],feature.local[0],feature.local[1]] as [number,number,number,number];
    if(feature.lineStyle){const halfWidth=feature.lineStyle.width/2;bounds[0]-=halfWidth;bounds[1]-=halfWidth;bounds[2]+=halfWidth;bounds[3]+=halfWidth}
  featureBounds.set(feature.id,bounds);
  const homeId=tileFor(feature.local[0],feature.local[1],config.tileSizeM).id;homeTileOf.set(feature.id,homeId);
  if(feature.featureClass==='building'||feature.featureClass==='poi'||feature.featureClass==='place'){
   const home=byTile.get(homeId);if(home)home.features.set(feature.id,feature);
  }
    else{
     const intersection:[number,number,number,number]=[Math.max(bounds[0],localBounds[0]),Math.max(bounds[1],localBounds[1]),Math.min(bounds[2],localBounds[2]),Math.min(bounds[3],localBounds[3])];
     for(const candidate of tilesCovering(intersection,config.tileSizeM)){const entry=byTile.get(candidate.id);if(entry&&overlaps(bounds,entry.clip))entry.features.set(feature.id,feature)}
    }
  if(feature.featureClass==='park'){
   for(const point of placeTrees(feature,treeDensity[feature.subtype]??0)){const home=byTile.get(tileFor(point[0],point[1],config.tileSizeM).id);if(home&&point[0]>=home.clip[0]&&point[0]<home.clip[2]&&point[1]>=home.clip[1]&&point[1]<home.clip[3])home.trees.push(point)}
  }
 }
 const tileRecords:TileRecord[]=[],landmarks:LandmarkRecord[]=[],places:PlaceRecord[]=[],named:NamedRecord[]=[];let totalBytes=0,totalTrees=0;
 for(const tile of tiles){
  const entry=byTile.get(tile.id)!,ordered=[...entry.features.values()].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  if(!ordered.length&&!entry.trees.length)continue;
  const records:FeatureRecord[]=ordered.map((feature,index)=>{
   const bounds=featureBounds.get(feature.id)!,record:FeatureRecord={index,id:feature.id,name:feature.name,featureClass:feature.featureClass,subtype:feature.subtype,center:[round(feature.local[0]),round(feature.local[1])],lonLat:[round(feature.lonLat[0],7),round(feature.lonLat[1],7)],bbox:bounds.map(v=>round(v,2)) as [number,number,number,number],tags:feature.tags};
   if(feature.height){record.heightM=round(feature.height.heightM,2);record.minHeightM=round(feature.height.minHeightM,2);record.displayHeightM=round(feature.height.heightM*(feature.landmark?config.landmarkHeightBoost:1),2);record.heightSource=feature.height.source;record.heightEstimated=feature.height.estimated;if(feature.height.levels!==undefined)record.levels=feature.height.levels}
   if(feature.landmark)record.landmark=feature.landmark;if(feature.rank!==undefined)record.rank=feature.rank;if(feature.areaM2!==undefined)record.areaM2=round(feature.areaM2,1);
   return record;
  });
  const counts:Record<string,number>={};
  for(const feature of ordered)counts[feature.featureClass]=(counts[feature.featureClass]??0)+1;
  const lods:TileLodRecord[]=[];
  for(const level of [0,1] as const){
   const meshes=buildTileMeshes(ordered,entry.trees,entry.clip,tile,level,config),glb=encodeGlb({meshes,materials:glbMaterials,generator:generatorId,extras:{tile:tile.id,lod:level,bounds:tile.bounds}});
  const file=`tiles/${tile.id}-l${level}.glb`;writeFile(file,glb);totalBytes+=glb.byteLength;
   const triangles=meshes.reduce((sum,mesh)=>sum+mesh.primitives.reduce((s,p)=>s+(p.mode===0?0:(p.indices?.length??0)/3),0),0),vertices=meshes.reduce((sum,mesh)=>sum+mesh.primitives.reduce((s,p)=>s+p.attributes.POSITION.array.length/3,0),0);
   lods.push({level,file,bytes:glb.byteLength,sha256:hash(glb),triangles,vertices});
  }
  const featureFile=`tiles/${tile.id}.features.json`;writeFile(featureFile,JSON.stringify(records));
  const center:[number,number]=[(entry.clip[0]+entry.clip[2])/2,(entry.clip[1]+entry.clip[3])/2];
  tileRecords.push({id:tile.id,ix:tile.ix,iy:tile.iy,bounds:entry.clip.map(v=>round(v,2)) as [number,number,number,number],center:[round(center[0]),round(center[1])],radiusM:round(Math.hypot(entry.clip[2]-entry.clip[0],entry.clip[3]-entry.clip[1])/2+60),lods,features:featureFile,counts,trees:entry.trees.length,featureCount:records.length});
  totalTrees+=entry.trees.length;
  for(const record of records){
   if(homeTileOf.get(record.id)!==tile.id)continue;
   if(record.landmark)landmarks.push({id:record.id,label:record.landmark,name:record.name,featureClass:record.featureClass,tile:tile.id,index:record.index,local:record.center,lonLat:record.lonLat,heightM:record.heightM,heightSource:record.heightSource,heightEstimated:record.heightEstimated});
   if(record.featureClass==='place')places.push({id:record.id,name:record.name!,subtype:record.subtype,rank:record.rank??9,local:record.center,lonLat:record.lonLat});
   else if(record.name&&record.featureClass!=='road'&&record.featureClass!=='rail')named.push({id:record.id,name:record.name,featureClass:record.featureClass,tile:tile.id,index:record.index,local:record.center});
  }
  options.onTile?.(tileRecords.length,tiles.length);
 }
 const landmarkOrder=new Map(config.landmarks.map((spec,index)=>[spec.label,index]));
 landmarks.sort((a,b)=>(landmarkOrder.get(a.label)??99)-(landmarkOrder.get(b.label)??99));
 places.sort((a,b)=>a.rank-b.rank||a.name.localeCompare(b.name));
 named.sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
 const reasons:Record<string,number>={};for(const skip of built.skipped)reasons[skip.reason]=(reasons[skip.reason]??0)+1;
 const fallback='planet-fallback.svg',sky='planet-sky.svg';
 const manifest:PlanetManifest={
  version:1,generator:generatorId,name:config.name,
  source:{provider:'OpenStreetMap',license:'ODbL 1.0',licenseUrl:'https://www.openstreetmap.org/copyright',attribution:'© OpenStreetMap contributors',snapshotTimestamp:snapshot.osm3s?.timestamp_osm_base,inputSha256:input.sha256,inputBytes:input.bytes,inputDescription:input.description},
  origin:config.origin,aoi:{bbox:config.bbox,localBounds},projection:{kind:wholeGlobe?'whole-globe':'spherical-cap',cityRadiusM,capAngleDeg:wholeGlobe?360:config.capAngleDeg,planetRadiusM:round(projection.radius,3)},
  heights:{storeyHeightM:config.storeyHeightM,landmarkHeightBoost:config.landmarkHeightBoost,sources:built.heightSources},
  tileSizeM:config.tileSizeM,tiles:tileRecords,landmarks,places,named,counts:built.counts,skipped:{total:built.skipped.length,reasons},fallback,sky,
 };
 if(snapshot.provenance){manifest.source.extract=snapshot.provenance;manifest.aoi.id=snapshot.provenance.aoi.id;manifest.aoi.kind=snapshot.provenance.aoi.kind}
 if(wholeGlobe){manifest.projection.anchor=config.anchor??[0,0];manifest.projection.worldUnitsPerMetre=config.worldUnitsPerMetre??.75}
 writeFile(fallback,renderFallbackSvg(features,projection,manifest));
 writeFile(sky,renderSkySvg(features,projection,manifest));
 writeFile('manifest.json',JSON.stringify(manifest));
 return {manifest,files,report:{tiles:tileRecords.length,bytes:totalBytes,features:features.length,trees:totalTrees,skipped:built.skipped}};
}

function buildTileMeshes(features:SourceFeature[],trees:[number,number][],clip:[number,number,number,number],tile:TileAddress,level:0|1,config:PlanetConfig):GlbMeshInput[]{
 const origin:[number,number]=[tile.bounds[0],tile.bounds[1]],buildings=new FlatMeshBuilder(origin[0],origin[1]),ground=new FlatMeshBuilder(origin[0],origin[1]),water=new FlatMeshBuilder(origin[0],origin[1]);
 const densify=config.densifyM,simplify=level===1?config.lod1.simplifyToleranceM:0;
 features.forEach((feature,index)=>{
  const color=featureColor(feature);
  switch(feature.featureClass){
   case 'building':{
    if(!feature.polygons||feature.hasParts||!feature.height)return;
    if(level===1&&(feature.areaM2??0)<config.lod1.minBuildingAreaM2)return;
    const top=feature.height.heightM*(feature.landmark?config.landmarkHeightBoost:1),base=feature.height.minHeightM;
    for(const polygon of feature.polygons)buildings.addExtrusion(simplify?simplifyPolygon(polygon,simplify):polygon,base,top,color,index,densify);
    return;
   }
   case 'park':case 'water':case 'road':case 'rail':{
    if(feature.polygons){
     const target=feature.featureClass==='water'?water:ground,lift=feature.featureClass==='water'?surfaceLift.water:feature.featureClass==='road'?surfaceLift.plaza:surfaceLift.park;
     for(const polygon of feature.polygons)target.addPolygon(simplify?simplifyPolygon(polygon,simplify):polygon,lift,color,index,densify,undefined,clip);
    }
    else if(feature.line&&feature.lineStyle&&lodRoadFilter(feature,level)){
     const target=feature.featureClass==='water'?water:ground,lift=feature.featureClass==='water'?surfaceLift.water+.1:feature.featureClass==='rail'?surfaceLift.rail:surfaceLift.road;
     for(const piece of clipLineToRect(feature.line,clip))target.addRibbon(piece,feature.lineStyle.width,lift,color,index,densify);
    }
    return;
   }
   default:return;
  }
 });
 const meshes:GlbMeshInput[]=[];
 const translation:[number,number,number]=[origin[0],0,-origin[1]];
 const push=(name:keyof typeof materialIndex,buffers:MeshBuffers|null)=>{if(buffers)meshes.push({name,translation,primitives:[{attributes:{POSITION:{array:buffers.positions,type:'VEC3'},COLOR_0:{array:buffers.colors,type:'VEC4',normalized:true},_FEATUREID:{array:buffers.featureIds,type:'SCALAR'}},indices:buffers.indices,material:materialIndex[name]}],extras:{layer:name,lod:level}})};
 push('building',buildings.build());push('ground',ground.build());push('water',water.build());
 if(level===0&&trees.length){
  const positions=new Float32Array(trees.length*3);trees.forEach(([e,n],i)=>{positions[i*3]=e-origin[0];positions[i*3+1]=0;positions[i*3+2]=origin[1]-n});
  meshes.push({name:'trees',translation,primitives:[{attributes:{POSITION:{array:positions,type:'VEC3'}},mode:0,material:materialIndex.trees}],extras:{layer:'trees',lod:level}});
 }
 return meshes;
}

function simplifyPolygon(polygon:Polygon,tolerance:number):Polygon{return {outer:simplifyRing(polygon.outer,tolerance),holes:polygon.holes.map(hole=>simplifyRing(hole,tolerance)).filter(hole=>hole.length>=3)}}

function polygonPaths(polygons:Polygon[],tolerance:number,renderRing:(ring:Polygon['outer'],reference:[number,number])=>string):string{
 return polygons.map(polygon=>{const reference=polygon.outer[0],outline=renderRing(simplifyRing(polygon.outer,tolerance),reference);return outline?outline+polygon.holes.map(hole=>renderRing(simplifyRing(hole,tolerance),reference)).join(''):''}).join('');
}

const svgRoadWidths:Record<string,number>={motorway:4.2,trunk:4,primary:3.6,secondary:3,tertiary:2.4,residential:1.4,unclassified:1.4,busway:2,motorway_link:2,trunk_link:2,primary_link:2,secondary_link:1.6,tertiary_link:1.4};
const escapeXml=(text:string)=>text.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'})[c]!);
const rgb=([r,g,b]:RGB)=>`rgb(${r},${g},${b})`;

/** Orthographic "little planet" render of the same source geometry for no-WebGL and noscript fallbacks. */
export function renderFallbackSvg(features:SourceFeature[],projection:PlanetProjection,manifest:PlanetManifest,size=1024):string{
 const regional=manifest.projection?.kind==='whole-globe',minimumBuildingArea=regional?5000:150,tolerance=regional?18:4;
 const tilt=20*Math.PI/180,forward:Vec3=[0,Math.cos(tilt),Math.sin(tilt)],up:Vec3=normalize([0,1-forward[1]*forward[1],-forward[1]*forward[2]]),right:Vec3=cross(up,forward);
 const R=projection.radius,scale=size/(2*R*1.12),toScreen=(p:Vec3)=>[round((dot(p,right))*scale+size/2,1),round(size/2-dot(p,up)*scale,1)] as [number,number],visible=(p:Vec3)=>dot(p,forward)>0;
 const point=(e:number,n:number,h:number)=>projection.toPlanet(e,n,h);
 const path=(ring:readonly (readonly [number,number])[],h:number,close:boolean)=>{
  const points=ring.map(([e,n])=>point(e,n,h));if(!points.every(visible))return '';
  return 'M'+points.map(toScreen).map(([x,y])=>x+' '+y).join('L')+(close?'Z':'');
 };
 const sorted=[...features].sort((a,b)=>a.id<b.id?-1:1),parts:string[]=[];
 const parks=sorted.filter(f=>f.featureClass==='park'&&f.polygons),waters=sorted.filter(f=>f.featureClass==='water'&&f.polygons),roads=sorted.filter(f=>f.featureClass==='road'&&f.line&&svgRoadWidths[f.subtype]&&(!regional||svgRoadWidths[f.subtype]>=2.4)),buildings=sorted.filter(f=>f.featureClass==='building'&&f.polygons&&!f.hasParts&&(!!f.landmark||(f.areaM2??0)>=minimumBuildingArea));
 parts.push(`<circle cx="${size/2}" cy="${size/2}" r="${round(R*scale,1)}" fill="url(#ground)"/>`);
 for(const feature of parks)parts.push(`<path d="${polygonPaths(feature.polygons!,tolerance,ring=>path(ring,surfaceLift.park,true))}" fill="${rgb(featureColor(feature))}" fill-rule="evenodd"/>`);
 for(const feature of waters)parts.push(`<path d="${polygonPaths(feature.polygons!,tolerance,ring=>path(ring,surfaceLift.water,true))}" fill="${rgb(palette.water)}" fill-rule="evenodd"/>`);
 parts.push('<g fill="none" stroke-linecap="round" stroke-linejoin="round">');
 for(const feature of roads)parts.push(`<path d="${path(simplifyLine(feature.line!,2.5),surfaceLift.road,false)}" stroke="${rgb(featureColor(feature))}" stroke-width="${svgRoadWidths[feature.subtype]*scale*4}"/>`);
 parts.push('</g>');
 for(const feature of buildings){const top=(feature.height?.heightM??0)*(feature.landmark?manifest.heights.landmarkHeightBoost:1);parts.push(`<path d="${polygonPaths(feature.polygons!,2.5,ring=>path(ring,top,true))}" fill="${rgb(featureColor(feature))}" fill-rule="evenodd"${feature.landmark?' stroke="#6b4b1a" stroke-width="1.2"':''}/>`)}
 parts.push(`<circle cx="${size/2}" cy="${size/2}" r="${round(R*scale,1)}" fill="url(#shade)"/>`);
 for(const landmark of manifest.landmarks){const p=point(landmark.local[0],landmark.local[1],(landmark.heightM??0)*manifest.heights.landmarkHeightBoost+20);if(!visible(p))continue;const [x,y]=toScreen(p);parts.push(`<text x="${x}" y="${y}" text-anchor="middle" font-size="15" font-family="Georgia,serif" fill="#1f2a1c" stroke="#f6f1e4" stroke-width="3" paint-order="stroke">${escapeXml(landmark.label)}</text>`)}
 const description=`${escapeXml(manifest.name)}: ${manifest.counts.building??0} building footprints, ${manifest.counts.road??0} roads, ${manifest.counts.park??0} parks and ${manifest.counts.water??0} water bodies from OpenStreetMap mapped onto a small globe. Landmarks: ${manifest.landmarks.map(l=>escapeXml(l.label)).join(', ')}.`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-labelledby="blrPlanetTitle blrPlanetDesc"><title id="blrPlanetTitle">Illustrated planet of Bengaluru</title><desc id="blrPlanetDesc">${description}</desc><defs><radialGradient id="ground" cx="42%" cy="38%" r="68%"><stop offset="0" stop-color="#f3e8d2"/><stop offset=".7" stop-color="#dfcfae"/><stop offset="1" stop-color="#9c8a68"/></radialGradient><radialGradient id="shade" cx="38%" cy="32%" r="75%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#0b1a2a" stop-opacity=".55"/></radialGradient></defs><rect width="${size}" height="${size}" fill="#0d1b2a"/>${parts.join('')}<text x="12" y="${size-12}" font-size="13" font-family="Arial,sans-serif" fill="#d9e3ea">${escapeXml(manifest.source.attribution)} · ${manifest.source.license}</text></svg>`;
}
function dot(a:Vec3,b:Vec3){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function cross(a:Vec3,b:Vec3):Vec3{return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function normalize(v:Vec3):Vec3{const l=Math.hypot(v[0],v[1],v[2])||1;return [v[0]/l,v[1]/l,v[2]/l]}

export const skyTextureSize={width:1536,height:768};
/**
 * Equirectangular texture for Three's SphereGeometry UVs with the city crown at the centre
 * of the image (equator, u=0.5), north up and east to the right as seen from outside.
 * The far side is deliberately non-geographic: soft biome bands and pale poles.
 */
export function renderSkySvg(features:SourceFeature[],projection:PlanetProjection,manifest:PlanetManifest,width=skyTextureSize.width,height=skyTextureSize.height):string{
 const regional=manifest.projection?.kind==='whole-globe',minimumBuildingArea=regional?5000:150,tolerance=regional?18:6;
 const toPixel=(east:number,north:number,h:number)=>{
  const p=normalize(projection.toPlanet(east,north,h)),s:Vec3=[p[1],-p[2],-p[0]],thetaS=Math.acos(Math.max(-1,Math.min(1,s[1])));
  let phi=Math.atan2(s[2],-s[0]);if(phi<0)phi+=Math.PI*2;
  return [round(phi/(Math.PI*2)*width,1),round(thetaS/Math.PI*height,1)] as [number,number];
 };
 const path=(ring:readonly (readonly [number,number])[],h:number,close:boolean,reference=ring[0])=>{
  if(!ring.length)return '';
  const pixels=ring.map(([east,north])=>toPixel(east,north,h));
  if(!regional)return 'M'+pixels.map(([pixelX,pixelY])=>pixelX+' '+pixelY).join('L')+(close?'Z':'');
  let previous=toPixel(reference[0],reference[1],h)[0];
  for(const pixel of pixels){pixel[0]+=Math.round((previous-pixel[0])/width)*width;previous=pixel[0]}
  return [-width,0,width].map(offset=>'M'+pixels.map(([pixelX,pixelY])=>round(pixelX+offset,1)+' '+pixelY).join('L')+(close?'Z':'')).join('');
 };
 const sorted=[...features].sort((a,b)=>a.id<b.id?-1:1),parts:string[]=[];
 const capRing:[number,number][]=[];for(let i=0;i<96;i++){const bearing=i/96*Math.PI*2;capRing.push([Math.sin(bearing)*projection.cityRadiusM,Math.cos(bearing)*projection.cityRadiusM])}
 if(!regional)parts.push(`<path d="${path(capRing,0,true)}" fill="#d9c7a3" opacity=".9"/>`);
 for(const feature of sorted.filter(f=>f.featureClass==='park'&&f.polygons))parts.push(`<path d="${polygonPaths(feature.polygons!,tolerance,(ring,reference)=>path(ring,surfaceLift.park,true,reference))}" fill="${rgb(featureColor(feature))}" fill-rule="evenodd"/>`);
 for(const feature of sorted.filter(f=>f.featureClass==='water'&&f.polygons))parts.push(`<path d="${polygonPaths(feature.polygons!,tolerance,(ring,reference)=>path(ring,surfaceLift.water,true,reference))}" fill="${rgb(palette.water)}" fill-rule="evenodd"/>`);
 parts.push('<g fill="none" stroke-linecap="round" stroke-linejoin="round">');
 for(const feature of sorted.filter(f=>f.featureClass==='road'&&f.line&&svgRoadWidths[f.subtype]&&(!regional||svgRoadWidths[f.subtype]>=2.4)))parts.push(`<path d="${path(simplifyLine(feature.line!,regional?18:4),surfaceLift.road,false)}" stroke="${rgb(featureColor(feature))}" stroke-width="${round(Math.max(.9,svgRoadWidths[feature.subtype]*.45),2)}"/>`);
 parts.push('</g>');
 for(const feature of sorted.filter(f=>f.featureClass==='building'&&f.polygons&&!f.hasParts&&(!!f.landmark||(f.areaM2??0)>=minimumBuildingArea)))parts.push(`<path d="${polygonPaths(feature.polygons!,regional?8:3,(ring,reference)=>path(ring,feature.height?.heightM??0,true,reference))}" fill="${rgb(featureColor(feature))}" fill-rule="evenodd"/>`);
 let seed=0x5eed;const unit=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const blobs:string[]=[];
 for(let i=0;i<34;i++){const x=round(unit()*width,1),y=round(height*(.18+unit()*.64),1),rx=round(40+unit()*160,1),ry=round(18+unit()*60,1),tone=unit()<.5?'#5e7a52':'#8d7a55';if(Math.abs(x-width/2)<width*.19&&Math.abs(y-height/2)<height*.34)continue;blobs.push(`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${tone}" opacity=".28"/>`)}
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Equirectangular surface texture of the Bengaluru planet"><defs><linearGradient id="bands" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8d9d2"/><stop offset=".16" stop-color="#7f8f6c"/><stop offset=".5" stop-color="#8f8a68"/><stop offset=".84" stop-color="#6f8260"/><stop offset="1" stop-color="#d6d8d1"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#bands)"/>${blobs.join('')}${parts.join('')}</svg>`;
}
