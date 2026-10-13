/**
 * OpenStreetMap feature model for the Bengaluru planet.
 *
 * Geography is factual: footprints, centrelines and named places keep their mapped
 * locations in a local metric frame. Heights carry provenance because OSM distinguishes an
 * actual `height=*` from a storey count, and most Bengaluru buildings have neither.
 */
import {createLocalFrame,type LocalFrame} from './bengaluru-projection';
import {createSpatialIndex} from './spatial-index';

export type OsmCoordinate={lat:number;lon:number};
export type OsmMember={type:'node'|'way'|'relation';ref:number;role?:string;geometry?:OsmCoordinate[];lat?:number;lon?:number};
export type OsmElement={type:'node'|'way'|'relation';id:number;tags?:Record<string,string>;lat?:number;lon?:number;geometry?:(OsmCoordinate|null)[];members?:OsmMember[]};
/** Overpass `[out:json]` + `out geom` document; osmium/other exports can be adapted to this shape. */
export type OsmSnapshot={version?:number;generator?:string;osm3s?:{timestamp_osm_base?:string;copyright?:string};provenance?:{format:string;sourceUrl?:string;inputSha256:string;inputBytes:number;aoi:{kind:string;id:string;bbox:{south:number;west:number;north:number;east:number}};skipped:{id:string;reason:string}[]};elements:OsmElement[]};

export type FeatureClass='building'|'road'|'rail'|'water'|'park'|'poi'|'place';
export type HeightSource='osm-height'|'building-levels'|'type-default'|'default';
export type HeightInfo={heightM:number;minHeightM:number;levels?:number;source:HeightSource;estimated:boolean};
export type Ring=[number,number][];
export type Polygon={outer:Ring;holes:Ring[]};
export type LineStyle={width:number;lod:0|1};

export type SourceFeature={
 id:string;osmType:'node'|'way'|'relation';osmId:number;
 featureClass:FeatureClass;subtype:string;name?:string;tags:Record<string,string>;
 /** Local East/North metres. Polygons for buildings, parks, water and plazas; lines for roads, rail and waterways. */
 polygons?:Polygon[];line?:Ring;lineStyle?:LineStyle;point?:[number,number];
 height?:HeightInfo;areaM2?:number;lonLat:[number,number];local:[number,number];
 landmark?:string;rank?:number;
 /** Building outlines whose parts are mapped separately keep their footprint but are not extruded. */
 hasParts?:boolean;
};

export type BuildOptions={
 storeyHeightM?:number;
 landmarks?:LandmarkSpec[];
 /** Optional AOI in lon/lat; features whose representative point falls outside are skipped. */
 bbox?:{south:number;west:number;north:number;east:number};
};
export type LandmarkSpec={label:string;id?:string;name?:string;featureClass?:FeatureClass};
export type SkippedFeature={id:string;reason:string};
export type FeatureBuild={features:SourceFeature[];skipped:SkippedFeature[];counts:Record<string,number>;heightSources:Record<HeightSource,number>;frame:LocalFrame};

export const defaultStoreyHeightM=3;

const roadStyles:Record<string,LineStyle>={
 motorway:{width:16,lod:1},trunk:{width:14,lod:1},primary:{width:12,lod:1},secondary:{width:10,lod:1},tertiary:{width:8,lod:1},
 motorway_link:{width:8,lod:1},trunk_link:{width:8,lod:1},primary_link:{width:8,lod:1},secondary_link:{width:7,lod:1},tertiary_link:{width:6,lod:1},
 residential:{width:6,lod:1},unclassified:{width:6,lod:1},busway:{width:7,lod:1},living_street:{width:5,lod:0},service:{width:4,lod:0},pedestrian:{width:5,lod:0},
 footway:{width:2,lod:0},path:{width:2,lod:0},cycleway:{width:2.5,lod:0},steps:{width:2.5,lod:0},track:{width:3,lod:0},bridleway:{width:2.5,lod:0},
};
const railStyles:Record<string,LineStyle>={rail:{width:3.2,lod:1},light_rail:{width:3,lod:1},subway:{width:3,lod:0},tram:{width:2.6,lod:0},narrow_gauge:{width:2.6,lod:0}};
const waterwayStyles:Record<string,LineStyle>={river:{width:12,lod:1},canal:{width:6,lod:1},stream:{width:3,lod:0},drain:{width:2.5,lod:0},ditch:{width:2,lod:0}};
const parkLeisure=new Set(['park','garden','pitch','playground','golf_course','nature_reserve','common','recreation_ground','dog_park','stadium','track']);
const parkLanduse=new Set(['grass','forest','recreation_ground','cemetery','meadow','village_green','orchard','greenfield','flowerbed','plant_nursery']);
const parkNatural=new Set(['wood','scrub','grassland','wetland','heath']);
const poiKeys=['tourism','historic','amenity','railway','public_transport','leisure'] as const;
export const placeRank:Record<string,number>={city:0,town:1,suburb:2,quarter:3,neighbourhood:4,square:5,locality:6,hamlet:6,village:2};

/** OSM `height=*` is metres unless a unit is given; feet/inches appear in older data. */
export function parseOsmHeight(value:string|undefined):number|undefined{
 if(!value)return undefined;
 const text=value.trim().toLowerCase().replace(',','.');
 const feet=/^(\d+(?:\.\d+)?)\s*(?:ft|')(?:\s*(\d+(?:\.\d+)?)\s*(?:in|"))?$/.exec(text);
 if(feet)return +feet[1]*.3048+(feet[2]?+feet[2]*.0254:0);
 const metres=/^(\d+(?:\.\d+)?)\s*(?:m|metres?|meters?)?$/.exec(text);
 if(!metres)return undefined;
 const number=+metres[1];return Number.isFinite(number)&&number>0&&number<1000?number:undefined;
}

const typeHeights:Record<string,number>={
 public:14,government:14,civic:14,townhall:14,courthouse:14,hospital:16,school:10,college:12,university:14,library:12,museum:12,
 commercial:15,retail:7,office:18,supermarket:8,kiosk:3,hotel:24,apartments:18,dormitory:14,residential:8,house:7,detached:7,semidetached_house:7,terrace:7,bungalow:5,
 church:14,cathedral:22,chapel:8,temple:12,mosque:12,synagogue:12,shrine:5,place_of_worship:14,
 stadium:22,sports_centre:12,grandstand:12,pavilion:6,industrial:8,warehouse:9,factory:9,service:4,garage:3.5,garages:3.5,shed:3,roof:3.5,carport:3,parking:8,transportation:10,train_station:12,
};
export const defaultBuildingHeightM=8;

/** height > building:levels x storey > deterministic type default > generic default. */
export function resolveHeight(tags:Record<string,string>,storeyHeightM=defaultStoreyHeightM):HeightInfo{
 const levels=tags['building:levels']!==undefined?Number.parseFloat(tags['building:levels']):undefined,validLevels=levels!==undefined&&Number.isFinite(levels)&&levels>0&&levels<200?levels:undefined;
 const minLevel=tags['building:min_level']!==undefined?Number.parseFloat(tags['building:min_level']):undefined;
 const minHeightM=parseOsmHeight(tags.min_height)??(minLevel!==undefined&&Number.isFinite(minLevel)&&minLevel>0?minLevel*storeyHeightM:0);
 const explicit=parseOsmHeight(tags.height);
 if(explicit!==undefined)return {heightM:explicit,minHeightM:Math.min(minHeightM,explicit*.9),levels:validLevels,source:'osm-height',estimated:false};
 if(validLevels!==undefined)return {heightM:validLevels*storeyHeightM,minHeightM:Math.min(minHeightM,validLevels*storeyHeightM*.9),levels:validLevels,source:'building-levels',estimated:true};
 const kind=tags.building&&tags.building!=='yes'?tags.building:tags['building:part']&&tags['building:part']!=='yes'?tags['building:part']:tags.amenity==='place_of_worship'?'place_of_worship':tags.tourism==='museum'?'museum':tags.amenity&&typeHeights[tags.amenity]?tags.amenity:undefined;
 const typed=kind?typeHeights[kind]:undefined;
 if(typed!==undefined)return {heightM:typed,minHeightM:Math.min(minHeightM,typed*.9),source:'type-default',estimated:true};
 return {heightM:defaultBuildingHeightM,minHeightM:Math.min(minHeightM,defaultBuildingHeightM*.9),source:'default',estimated:true};
}

export type Classification={featureClass:FeatureClass;subtype:string;lineStyle?:LineStyle;areaOnly?:boolean};
const isNo=(value:string|undefined)=>value===undefined||value==='no';

export function classify(tags:Record<string,string>|undefined,element:'node'|'way'|'relation',closed:boolean):Classification|null{
 if(!tags)return null;
 if(element==='node'){
  if(tags.place&&tags.name&&placeRank[tags.place]!==undefined)return {featureClass:'place',subtype:tags.place};
  if(!tags.name)return null;
  for(const key of poiKeys){if(tags[key]&&!['information','yes'].includes(tags[key]))return {featureClass:'poi',subtype:tags[key]}}
  return null;
 }
 if(!isNo(tags['building:part']))return {featureClass:'building',subtype:tags['building:part']==='yes'?tags.building??'part':tags['building:part'],areaOnly:true};
 if(!isNo(tags.building))return {featureClass:'building',subtype:tags.building,areaOnly:true};
 if(tags.highway){
  if(tags.area==='yes'&&closed&&['pedestrian','footway','service','living_street','residential','unclassified'].includes(tags.highway))return {featureClass:'road',subtype:'plaza',areaOnly:true};
  const style=roadStyles[tags.highway];return style?{featureClass:'road',subtype:tags.highway,lineStyle:style}:null;
 }
 if(tags.railway){const style=railStyles[tags.railway];return style&&tags.service!=='yard'?{featureClass:'rail',subtype:tags.railway,lineStyle:style}:null}
 const isWaterArea=tags.natural==='water'||(tags.water!==undefined&&tags.water!=='no')||['reservoir','basin'].includes(tags.landuse??'')||['riverbank','dock'].includes(tags.waterway??'');
 if(isWaterArea&&closed)return {featureClass:'water',subtype:tags.water??tags.natural??tags.landuse??tags.waterway??'water',areaOnly:true};
 if(tags.waterway){const style=waterwayStyles[tags.waterway];return style?{featureClass:'water',subtype:tags.waterway,lineStyle:style}:null}
 if(!closed)return null;
 if(tags.leisure&&parkLeisure.has(tags.leisure))return {featureClass:'park',subtype:tags.leisure,areaOnly:true};
 if(tags.landuse&&parkLanduse.has(tags.landuse))return {featureClass:'park',subtype:tags.landuse,areaOnly:true};
 if(tags.natural&&parkNatural.has(tags.natural))return {featureClass:'park',subtype:tags.natural,areaOnly:true};
 if(tags.name&&(['museum','attraction','zoo','theme_park','gallery'].includes(tags.tourism??'')||tags.historic))return {featureClass:'park',subtype:'grounds',areaOnly:true};
 return null;
}

export function ringArea(ring:Ring){let area=0;for(let i=0,j=ring.length-1;i<ring.length;j=i++)area+=(ring[j][0]+ring[i][0])*(ring[j][1]-ring[i][1]);return area/2}
export function ringCentroid(ring:Ring):[number,number]{
 let area=0,cx=0,cy=0;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){const cross=ring[j][0]*ring[i][1]-ring[i][0]*ring[j][1];area+=cross;cx+=(ring[j][0]+ring[i][0])*cross;cy+=(ring[j][1]+ring[i][1])*cross}
 if(Math.abs(area)<1e-9){const n=ring.length;return [ring.reduce((sum,p)=>sum+p[0],0)/n,ring.reduce((sum,p)=>sum+p[1],0)/n]}
 return [cx/(3*area),cy/(3*area)];
}
export function pointInRing([x,y]:readonly [number,number],ring:Ring){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];if(yi>y!==yj>y&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside}
 return inside;
}
export function pointInPolygon(point:readonly [number,number],polygon:Polygon){return pointInRing(point,polygon.outer)&&!polygon.holes.some(hole=>pointInRing(point,hole))}
export function ringBounds(ring:Ring,bounds=[Infinity,Infinity,-Infinity,-Infinity]){for(const [x,y] of ring){bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],x);bounds[3]=Math.max(bounds[3],y)}return bounds as [number,number,number,number]}

/** Removes consecutive duplicates and the closing repeat; orients counter-clockwise when `ccw` is set. */
export function cleanRing(ring:Ring,ccw?:boolean):Ring|null{
 const out:Ring=[];
 for(const point of ring){const last=out[out.length-1];if(!last||Math.abs(last[0]-point[0])>1e-6||Math.abs(last[1]-point[1])>1e-6)out.push([point[0],point[1]])}
 while(out.length>1&&Math.abs(out[0][0]-out[out.length-1][0])<1e-6&&Math.abs(out[0][1]-out[out.length-1][1])<1e-6)out.pop();
 if(out.length<3||Math.abs(ringArea(out))<1)return null;
 if(ccw!==undefined&&ringArea(out)>0!==ccw)out.reverse();
 return out;
}

/** Douglas-Peucker simplification for open polylines; endpoints are always kept. */
export function simplifyLine(line:Ring,tolerance:number):Ring{
 if(line.length<=2||tolerance<=0)return line;
 const keep=new Uint8Array(line.length);keep[0]=1;keep[line.length-1]=1;
 const stack:[number,number][]=[[0,line.length-1]];
 while(stack.length){
  const [start,end]=stack.pop()!,[ax,ay]=line[start],[bx,by]=line[end],dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy);
  let best=-1,bestDistance=tolerance;
  for(let i=start+1;i<end;i++){const [px,py]=line[i],distance=length<1e-9?Math.hypot(px-ax,py-ay):Math.abs(dx*(ay-py)-(ax-px)*dy)/length;if(distance>bestDistance){bestDistance=distance;best=i}}
  if(best>=0){keep[best]=1;stack.push([start,best],[best,end])}
 }
 return line.filter((_,i)=>keep[i]);
}

/** Douglas-Peucker simplification that keeps rings closed and at least triangular. */
export function simplifyRing(ring:Ring,tolerance:number):Ring{
 if(ring.length<=4||tolerance<=0)return ring;
 const keep=new Uint8Array(ring.length);keep[0]=1;
 let far=0,farDistance=-1;for(let i=1;i<ring.length;i++){const d=Math.hypot(ring[i][0]-ring[0][0],ring[i][1]-ring[0][1]);if(d>farDistance){farDistance=d;far=i}}
 keep[far]=1;
 const stack:[number,number][]=[[0,far],[far,ring.length]];
 while(stack.length){
  const [start,end]=stack.pop()!,[ax,ay]=ring[start],[bx,by]=ring[end%ring.length],dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy);
  let best=-1,bestDistance=tolerance;
  for(let i=start+1;i<end;i++){const [px,py]=ring[i],distance=length<1e-9?Math.hypot(px-ax,py-ay):Math.abs(dx*(ay-py)-(ax-px)*dy)/length;if(distance>bestDistance){bestDistance=distance;best=i}}
  if(best>=0){keep[best]=1;stack.push([start,best],[best,end])}
 }
 const out=ring.filter((_,i)=>keep[i]);return out.length>=3?out:ring;
}

type AssembledRing={ring:Ring;area:number};
/** Chains relation member ways into closed rings; roles are ignored in favour of containment so missing or wrong roles still produce courtyards. */
export function assemblePolygons(ways:Ring[]):{polygons:Polygon[];unclosed:number}{
 const used=new Uint8Array(ways.length),rings:AssembledRing[]=[];let unclosed=0;
 const same=(a:[number,number],b:[number,number])=>Math.abs(a[0]-b[0])<1e-7&&Math.abs(a[1]-b[1])<1e-7;
 for(let start=0;start<ways.length;start++){
  if(used[start]||ways[start].length<2)continue;used[start]=1;
  const ring=ways[start].map(p=>[p[0],p[1]] as [number,number]);let guard=0;
  while(!same(ring[0],ring[ring.length-1])&&guard++<ways.length){
   const tail=ring[ring.length-1];let found=false;
   for(let i=0;i<ways.length;i++){
    if(used[i]||ways[i].length<2)continue;const way=ways[i];
    if(same(way[0],tail)){ring.push(...way.slice(1));used[i]=1;found=true;break}
    if(same(way[way.length-1],tail)){ring.push(...way.slice(0,-1).reverse());used[i]=1;found=true;break}
   }
   if(!found)break;
  }
  const cleaned=same(ring[0],ring[ring.length-1])?cleanRing(ring):null;
  if(cleaned)rings.push({ring:cleaned,area:Math.abs(ringArea(cleaned))});else unclosed++;
 }
 rings.sort((a,b)=>b.area-a.area);
 const polygons:Polygon[]=[],owner:number[]=[];
 rings.forEach((candidate,index)=>{
  let depth=0,parent=-1;
  for(let i=index-1;i>=0;i--){if(pointInRing(candidate.ring[0],rings[i].ring)){depth++;if(parent<0)parent=i}}
  if(depth%2===0){owner[index]=polygons.length;polygons.push({outer:cleanRing(candidate.ring,true)!,holes:[]})}
  else{owner[index]=-1;const outerIndex=owner[parent];if(outerIndex!==undefined&&outerIndex>=0)polygons[outerIndex].holes.push(cleanRing(candidate.ring,false)!)}
 });
 return {polygons,unclosed};
}

const geometryToLonLat=(geometry:(OsmCoordinate|null)[]|undefined)=>(geometry??[]).filter((p):p is OsmCoordinate=>!!p).map(p=>[p.lon,p.lat] as [number,number]);
const curatedTagKeys=['name','name:kn','building','building:part','building:levels','height','min_height','amenity','tourism','leisure','landuse','natural','highway','railway','waterway','water','place','historic','wikidata','wikipedia','addr:street'];
export const curateTags=(tags:Record<string,string>)=>Object.fromEntries(curatedTagKeys.filter(key=>tags[key]!==undefined).map(key=>[key,tags[key]]));

const lineLength=(line:Ring)=>{let total=0;for(let i=1;i<line.length;i++)total+=Math.hypot(line[i][0]-line[i-1][0],line[i][1]-line[i-1][1]);return total};
const lineMidpoint=(line:Ring):[number,number]=>{
 const half=lineLength(line)/2;let walked=0;
 for(let i=1;i<line.length;i++){const segment=Math.hypot(line[i][0]-line[i-1][0],line[i][1]-line[i-1][1]);if(walked+segment>=half){const t=segment>0?(half-walked)/segment:0;return [line[i-1][0]+(line[i][0]-line[i-1][0])*t,line[i-1][1]+(line[i][1]-line[i-1][1])*t]}walked+=segment}
 return line[line.length-1];
};

/** Converts an OSM snapshot into local-metre features around the given origin. Deterministic for identical input. */
export function buildFeatures(snapshot:OsmSnapshot,origin:{lon:number;lat:number},options:BuildOptions={}):FeatureBuild{
 const frame=createLocalFrame(origin),storey=options.storeyHeightM??defaultStoreyHeightM,features:SourceFeature[]=[],skipped:SkippedFeature[]=[];
 const counts:Record<string,number>={},heightSources:Record<HeightSource,number>={'osm-height':0,'building-levels':0,'type-default':0,default:0};
 const toLocal=([lon,lat]:[number,number]):[number,number]=>{const p=frame.toLocal(lon,lat);return [p.east,p.north]};
 const inside=(lonLat:[number,number])=>!options.bbox||(lonLat[0]>=options.bbox.west&&lonLat[0]<=options.bbox.east&&lonLat[1]>=options.bbox.south&&lonLat[1]<=options.bbox.north);
 const elements=[...snapshot.elements].sort((a,b)=>a.type===b.type?a.id-b.id:a.type.localeCompare(b.type));
 for(const element of elements){
  const id=element.type+'/'+element.id,tags=element.tags??{};
  if(element.type==='node'){
   if(element.lat===undefined||element.lon===undefined)continue;
   const kind=classify(tags,'node',false);if(!kind)continue;
   const lonLat:[number,number]=[element.lon,element.lat];if(!inside(lonLat))continue;
   const local=toLocal(lonLat);
   features.push({id,osmType:'node',osmId:element.id,featureClass:kind.featureClass,subtype:kind.subtype,name:tags.name,tags:curateTags(tags),point:local,lonLat,local,rank:kind.featureClass==='place'?placeRank[kind.subtype]:undefined});
   continue;
  }
  let polygons:Polygon[]|undefined,line:Ring|undefined,kind:Classification|null=null;
  if(element.type==='way'){
   const coords=geometryToLonLat(element.geometry);if(coords.length<2){skipped.push({id,reason:'no geometry'});continue}
   const closed=coords.length>=4&&Math.abs(coords[0][0]-coords[coords.length-1][0])<1e-9&&Math.abs(coords[0][1]-coords[coords.length-1][1])<1e-9;
   kind=classify(tags,'way',closed);if(!kind)continue;
   const localRing=coords.map(toLocal);
   if(kind.areaOnly){
    if(!closed){skipped.push({id,reason:'open way for area feature'});continue}
    const outer=cleanRing(localRing,true);if(!outer){skipped.push({id,reason:'degenerate ring'});continue}
    polygons=[{outer,holes:[]}];
   }
   else line=localRing;
  }
  else{
   if(tags.type!=='multipolygon'&&tags.type!=='boundary')continue;
   kind=classify(tags,'relation',true);if(!kind||!kind.areaOnly)continue;
   const ways=(element.members??[]).filter(member=>member.type==='way'&&member.geometry).map(member=>geometryToLonLat(member.geometry).map(toLocal));
   const assembled=assemblePolygons(ways);
   if(!assembled.polygons.length){skipped.push({id,reason:assembled.unclosed?'unclosed multipolygon rings':'no polygon members'});continue}
   polygons=assembled.polygons;
  }
  const representative=polygons?ringCentroid(polygons.reduce((largest,p)=>Math.abs(ringArea(p.outer))>Math.abs(ringArea(largest.outer))?p:largest).outer):lineMidpoint(line!);
  const geo=frame.toGeodetic(representative[0],representative[1]),lonLat:[number,number]=[geo.lon,geo.lat];
  if(!inside(lonLat))continue;
  const feature:SourceFeature={id,osmType:element.type,osmId:element.id,featureClass:kind.featureClass,subtype:kind.subtype,name:tags.name,tags:curateTags(tags),polygons,line,lineStyle:kind.lineStyle,lonLat,local:representative};
  if(polygons)feature.areaM2=polygons.reduce((sum,p)=>sum+Math.abs(ringArea(p.outer))-p.holes.reduce((h,hole)=>h+Math.abs(ringArea(hole)),0),0);
  if(kind.featureClass==='building'){feature.height=resolveHeight(tags,storey);heightSources[feature.height.source]++}
  features.push(feature);
 }
 markBuildingParts(features);
 for(const spec of options.landmarks??[]){
  const match=features.find(feature=>spec.id?feature.id===spec.id:feature.name?.toLowerCase()===spec.name?.toLowerCase()&&(!spec.featureClass||feature.featureClass===spec.featureClass));
  if(match)match.landmark=spec.label;else skipped.push({id:spec.id??spec.name??spec.label,reason:'landmark not found in snapshot'});
 }
 for(const feature of features)counts[feature.featureClass]=(counts[feature.featureClass]??0)+1;
 return {features,skipped,counts,heightSources,frame};
}

/**
 * Outlines whose mapped parts cover most of their footprint are not extruded, so volumes
 * are not doubled. Outlines with only roof details mapped as parts (domes, towers) keep
 * their body; the parts rise through it.
 */
export function markBuildingParts(features:SourceFeature[],coverage=.6){
 const parts=features.filter(f=>f.featureClass==='building'&&f.tags['building:part']!==undefined&&f.tags.building===undefined),outlines=features.filter(f=>f.featureClass==='building'&&f.tags.building!==undefined&&f.polygons);
 if(!parts.length)return;
 const bounds=outlines.map(outline=>ringBounds(outline.polygons![0].outer)),covered=new Float64Array(outlines.length);
 const spatial=createSpatialIndex(outlines.map((_outline,index)=>index),index=>({minX:bounds[index][0],minZ:bounds[index][1],maxX:bounds[index][2],maxZ:bounds[index][3]}),128),candidates=new Set<number>();
 for(const part of parts){
  const [x,y]=part.local;
    spatial.query({minX:x,maxX:x,minZ:y,maxZ:y},candidates);
    for(const index of [...candidates].sort((first,second)=>first-second)){const bound=bounds[index];if(x<bound[0]||x>bound[2]||y<bound[1]||y>bound[3])continue;if(outlines[index].polygons!.some(polygon=>pointInPolygon([x,y],polygon))){covered[index]+=part.areaM2??0;break}}
 }
 outlines.forEach((outline,i)=>{if(covered[i]>0&&covered[i]>=(outline.areaM2??Infinity)*coverage)outline.hasParts=true});
}

/** Sutherland-Hodgman clip of a convex or concave ring against an axis-aligned rectangle. */
export function clipRingToRect(ring:Ring,[minX,minY,maxX,maxY]:readonly [number,number,number,number]):Ring{
 let output=ring;
 const edges:[(p:[number,number])=>boolean,(a:[number,number],b:[number,number])=>[number,number]][]=[
  [p=>p[0]>=minX,(a,b)=>[minX,a[1]+(b[1]-a[1])*(minX-a[0])/(b[0]-a[0])]],
  [p=>p[0]<=maxX,(a,b)=>[maxX,a[1]+(b[1]-a[1])*(maxX-a[0])/(b[0]-a[0])]],
  [p=>p[1]>=minY,(a,b)=>[a[0]+(b[0]-a[0])*(minY-a[1])/(b[1]-a[1]),minY]],
  [p=>p[1]<=maxY,(a,b)=>[a[0]+(b[0]-a[0])*(maxY-a[1])/(b[1]-a[1]),maxY]],
 ];
 for(const [insideEdge,intersect] of edges){
  if(!output.length)return [];
  const input=output;output=[];
  for(let i=0;i<input.length;i++){
   const current=input[i],previous=input[(i+input.length-1)%input.length],currentIn=insideEdge(current),previousIn=insideEdge(previous);
   if(currentIn){if(!previousIn)output.push(intersect(previous,current));output.push(current)}
   else if(previousIn)output.push(intersect(previous,current));
  }
 }
 return output;
}

/** Liang-Barsky clip of a polyline against a rectangle, returning the inside pieces. */
export function clipLineToRect(line:Ring,[minX,minY,maxX,maxY]:readonly [number,number,number,number]):Ring[]{
 const pieces:Ring[]=[];let current:Ring=[];
 const flush=()=>{if(current.length>=2)pieces.push(current);current=[]};
 for(let i=1;i<line.length;i++){
  const [x0,y0]=line[i-1],[x1,y1]=line[i],dx=x1-x0,dy=y1-y0;let t0=0,t1=1,accept=true;
  for(const [p,q] of [[-dx,x0-minX],[dx,maxX-x0],[-dy,y0-minY],[dy,maxY-y0]] as const){
   if(p===0){if(q<0){accept=false;break}continue}
   const r=q/p;if(p<0){if(r>t1){accept=false;break}if(r>t0)t0=r}else{if(r<t0){accept=false;break}if(r<t1)t1=r}
  }
  if(!accept){flush();continue}
  const start:[number,number]=[x0+dx*t0,y0+dy*t0],end:[number,number]=[x0+dx*t1,y0+dy*t1];
  if(!current.length)current.push(start);
  else if(t0>0){flush();current.push(start)}
  current.push(end);
  if(t1<1)flush();
 }
 flush();
 return pieces;
}

export type TileAddress={ix:number;iy:number;id:string;bounds:[number,number,number,number]};
export const tileId=(ix:number,iy:number)=>`t${ix}_${iy}`;
export function tileFor(east:number,north:number,tileSizeM:number):TileAddress{
 const ix=Math.floor(east/tileSizeM),iy=Math.floor(north/tileSizeM);
 return {ix,iy,id:tileId(ix,iy),bounds:[ix*tileSizeM,iy*tileSizeM,(ix+1)*tileSizeM,(iy+1)*tileSizeM]};
}
export function tilesCovering(bounds:readonly [number,number,number,number],tileSizeM:number):TileAddress[]{
 const out:TileAddress[]=[];
 for(let iy=Math.floor(bounds[1]/tileSizeM);iy<Math.ceil(bounds[3]/tileSizeM);iy++)for(let ix=Math.floor(bounds[0]/tileSizeM);ix<Math.ceil(bounds[2]/tileSizeM);ix++)out.push(tileFor((ix+.5)*tileSizeM,(iy+.5)*tileSizeM,tileSizeM));
 return out;
}
