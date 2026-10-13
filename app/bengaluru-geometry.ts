/**
 * Turns local-metre features into flat triangle buffers (x=East, y=height, z=-North).
 * Tiles stay flat on disk; the GPU vertex stage bends them onto the planet. Long edges are
 * densified and large polygons are gridded so the bent surface follows the sphere instead
 * of cutting chords through it. Normals are omitted on purpose: flat shading derives them
 * from the bent positions, which also halves the vertex payload.
 */
import {Color,ShapeUtils,SRGBColorSpace,Vector2} from 'three';
import {densifyPolyline,densifyRing} from './bengaluru-projection';
import type {Polygon,Ring,SourceFeature} from './bengaluru-features';
import {clipRingToRect,parseOsmHeight,ringBounds} from './bengaluru-features';

export type RGB=[number,number,number];
export type MeshBuffers={positions:Float32Array;colors:Uint8Array;featureIds:Float32Array;surfaceKinds:Uint8Array;indices:Uint16Array|Uint32Array;vertexCount:number;triangleCount:number};
export type RoofProfile={shape:'gabled'|'hipped'|'pyramidal'|'skillion'|'dome'|'onion'|'round'|'cone';height:number;across:boolean;source:'osm-roof-height'|'roof-levels'|'inferred'};

/** Lifts above the ground sphere, metres; ordered so every overlay clears the sphere mesh and each other. */
export const surfaceLift={water:.5,park:.9,plaza:1.1,road:1.3,rail:1.4};
/** Interior grid spacing for flat polygons so chords stay within centimetres of the sphere. */
export const overlayGridM=50;

export const palette={
 building:{civic:[221,218,205],commercial:[190,201,206],residential:[219,216,206],worship:[232,227,209],sports:[190,198,196],industrial:[174,182,181],default:[211,213,204]} as Record<string,RGB>,
 landmark:[244,214,150] as RGB,
 park:{park:[111,159,90],garden:[127,174,95],pitch:[134,176,94],playground:[138,176,100],forest:[91,141,76],wood:[91,141,76],scrub:[120,150,90],grass:[141,179,106],meadow:[146,178,104],cemetery:[127,160,102],wetland:[111,154,122],golf_course:[128,172,92],stadium:[134,176,94],grounds:[214,201,170],default:[118,164,96]} as Record<string,RGB>,
 water:[79,143,201] as RGB,
 road:{major:[69,74,79],minor:[82,85,86],path:[175,178,169],plaza:[187,188,181],rail:[119,123,120],waterway:[88,150,205]} as Record<string,RGB>,
};
const buildingCategory:Record<string,string>={public:'civic',government:'civic',civic:'civic',townhall:'civic',courthouse:'civic',hospital:'civic',school:'civic',college:'civic',university:'civic',library:'civic',museum:'civic',commercial:'commercial',retail:'commercial',office:'commercial',supermarket:'commercial',kiosk:'commercial',hotel:'commercial',apartments:'residential',dormitory:'residential',residential:'residential',house:'residential',detached:'residential',semidetached_house:'residential',terrace:'residential',bungalow:'residential',church:'worship',cathedral:'worship',chapel:'worship',temple:'worship',mosque:'worship',synagogue:'worship',shrine:'worship',place_of_worship:'worship',stadium:'sports',sports_centre:'sports',grandstand:'sports',pavilion:'sports',industrial:'industrial',warehouse:'industrial',factory:'industrial',service:'industrial',garage:'industrial',garages:'industrial',shed:'industrial',roof:'industrial',carport:'industrial',parking:'industrial',transportation:'industrial',train_station:'civic'};
const majorRoads=new Set(['motorway','trunk','primary','secondary','tertiary','motorway_link','trunk_link','primary_link','secondary_link','tertiary_link','busway']);
const pathRoads=new Set(['footway','path','cycleway','steps','track','bridleway','pedestrian']);

export function hash32(value:number|string){
 let h=0x811c9dc5;const text=String(value);
 for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193)}
 return h>>>0;
}
const unit=(h:number,salt:number)=>((Math.imul(h^salt,0x9e3779b1)>>>0)%10000)/10000;
export function varyColor(color:RGB,seed:number,amount=.05):RGB{
 const brightness=1+(unit(seed,1)-.5)*2*amount,warm=(unit(seed,2)-.5)*amount*60;
 return [clampByte(color[0]*brightness+warm),clampByte(color[1]*brightness),clampByte(color[2]*brightness-warm)];
}
const clampByte=(v:number)=>Math.max(0,Math.min(255,Math.round(v)));
/** glTF vertex colours are linear; the palette is authored as sRGB bytes. */
const linearByte=Uint8Array.from({length:256},(_,i)=>{const c=i/255;return clampByte((c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4))*255)});

export function mappedColor(value:string|undefined):RGB|undefined{
 if(!value)return undefined;
 const normalized=value.trim().toLowerCase().replace(/[ _-]/g,'');
 if(!/^#(?:[\da-f]{3}|[\da-f]{6})$/.test(normalized)&&Color.NAMES[normalized as keyof typeof Color.NAMES]===undefined)return undefined;
 const color=new Color(normalized).getHex(SRGBColorSpace);return [color>>16&255,color>>8&255,color&255];
}

export function featureRoofColor(feature:SourceFeature):RGB{
 const mapped=mappedColor(feature.tags['roof:colour']);if(mapped)return mapped;
 const material=feature.tags['roof:material'],colors:Record<string,RGB>={concrete:[146,150,148],roof_tiles:[159,88,66],tiles:[159,88,66],metal:[144,155,160],slate:[84,93,100],glass:[87,116,132],grass:[91,126,77]};
 return colors[material??'']??(['gabled','hipped','half-hipped','pyramidal'].includes(feature.tags['roof:shape']??'')?[153,101,79]:[149,152,148]);
}

export function featureRoofProfile(feature:SourceFeature):RoofProfile|undefined{
 const shape=feature.tags['roof:shape'];
 if(!feature.height||!feature.polygons?.length||!['gabled','hipped','pyramidal','skillion','dome','onion','round','cone'].includes(shape))return undefined;
 const bounds=feature.polygons.reduce((result,polygon)=>ringBounds(polygon.outer,result),[Infinity,Infinity,-Infinity,-Infinity]),span=feature.height.heightM-feature.height.minHeightM;
 const explicit=parseOsmHeight(feature.tags['roof:height']),levels=Number(feature.tags['roof:levels']),levelHeight=Number.isFinite(levels)&&levels>0&&levels<10?levels*3:undefined;
 const inferred=Math.min(span*.45,Math.min(bounds[2]-bounds[0],bounds[3]-bounds[1])*.3);
 const height=Math.min(span,explicit??levelHeight??inferred);if(height<.1)return undefined;
 return {shape:shape as RoofProfile['shape'],height,across:feature.tags['roof:orientation']==='across',source:explicit!==undefined?'osm-roof-height':levelHeight!==undefined?'roof-levels':'inferred'};
}

export function featureColor(feature:SourceFeature):RGB{
 const seed=hash32(feature.id);
 switch(feature.featureClass){
  case 'building':{
    const mapped=mappedColor(feature.tags['building:colour']);if(mapped)return mapped;
    const material=feature.tags['building:material'];
    if(material==='brick')return varyColor([168,93,73],seed,.025);
    if(material==='glass')return varyColor([126,157,172],seed,.025);
    if(material==='concrete')return varyColor([184,187,182],seed,.025);
   if(feature.landmark)return varyColor(palette.landmark,seed,.02);
   const category=feature.tags.amenity==='place_of_worship'?'worship':feature.tags.tourism==='museum'?'civic':buildingCategory[feature.subtype]??'default';
   return varyColor(palette.building[category],seed);
  }
  case 'park':return varyColor(palette.park[feature.subtype]??palette.park.default,seed,.04);
  case 'water':return feature.line?palette.road.waterway:palette.water;
  case 'rail':return palette.road.rail;
    case 'road':{
     const surface=feature.tags.surface??'';
     if(['concrete','concrete:plates','concrete:lanes'].includes(surface))return [161,165,163];
     if(['paving_stones','sett','cobblestone'].includes(surface))return [163,158,149];
     if(['unpaved','dirt','earth','ground','gravel','compacted','sand'].includes(surface))return [147,128,102];
     return feature.subtype==='plaza'?palette.road.plaza:majorRoads.has(feature.subtype)?palette.road.major:pathRoads.has(feature.subtype)?palette.road.path:palette.road.minor;
    }
  default:return palette.building.default;
 }
}

export class FlatMeshBuilder{
 private positions:number[]=[];private colors:number[]=[];private ids:number[]=[];private kinds:number[]=[];private indices:number[]=[];
 constructor(private readonly originE=0,private readonly originN=0){}
 get vertexCount(){return this.positions.length/3}
 get triangleCount(){return this.indices.length/3}
 private vertex(east:number,y:number,north:number,color:RGB,id:number,kind=0){
  this.positions.push(east-this.originE,y,this.originN-north);this.colors.push(linearByte[clampByte(color[0])],linearByte[clampByte(color[1])],linearByte[clampByte(color[2])],255);this.ids.push(id);this.kinds.push(kind);return this.ids.length-1;
 }
 /** Emits a triangle wound counter-clockwise in East/North so it faces up in Y-up space; the stored z axis is -North, which flips the sign test. */
 private flatTriangle(a:number,b:number,c:number,down=false){
  const p=this.positions,ax=p[a*3],az=p[a*3+2],area=(p[b*3]-ax)*(p[c*3+2]-az)-(p[c*3]-ax)*(p[b*3+2]-az);
  if(Math.abs(area)<1e-6)return;
  if((area>0)!==down)this.indices.push(a,c,b);else this.indices.push(a,b,c);
 }
 private shade(color:RGB,factor:number):RGB{return [clampByte(color[0]*factor),clampByte(color[1]*factor),clampByte(color[2]*factor)]}

 addExtrusion(polygon:Polygon,base:number,top:number,color:RGB,id:number,densify:number,baseShade=.72,roofColor?:RGB,roof?:RoofProfile){
  if(!(top>base))return;
  const eave=top-(roof?.height??0);
  const rings=[densifyRing(polygon.outer,densify),...polygon.holes.map(hole=>densifyRing(hole,densify))],bottomColor=this.shade(color,baseShade),topIndices:number[][]=[];
  for(const ring of rings){
    if(roof)continue;
   const bottom=ring.map(([e,n])=>this.vertex(e,base,n,bottomColor,id)),upper=ring.map(([e,n])=>this.vertex(e,eave,n,color,id));
   if(!roof)topIndices.push(roofColor?ring.map(([east,north])=>this.vertex(east,eave,north,roofColor,id,1)):upper);
   if(eave>base+.001)for(let i=0;i<ring.length;i++){const j=(i+1)%ring.length,a=bottom[i],b=bottom[j],c=upper[j],d=upper[i];this.indices.push(a,b,c,a,c,d)}
  }
  if(roof){
   const [west,south,east,north]=ringBounds(polygon.outer),width=east-west,depth=north-south,center:[number,number]=[(west+east)/2,(south+north)/2],ridgeEast=roof.across?width<depth:width>=depth;
   const elevation=(east:number,north:number)=>{
    const horizontal=(east-center[0])/(width/2||1),vertical=(north-center[1])/(depth/2||1),cross=ridgeEast?vertical:horizontal;
    const radius=Math.min(1,Math.hypot(horizontal,vertical)),edge=Math.max(Math.abs(horizontal),Math.abs(vertical));
    let rise=0;
    if(roof.shape==='gabled')rise=1-Math.abs(cross);
    else if(roof.shape==='skillion')rise=(1+cross)/2;
    else if(roof.shape==='round')rise=Math.sqrt(Math.max(0,1-cross*cross));
    else if(roof.shape==='dome')rise=Math.sqrt(Math.max(0,1-radius*radius));
    else if(roof.shape==='onion')rise=Math.sqrt(Math.max(0,1-radius*radius))*(1-.45*radius);
    else if(roof.shape==='cone')rise=1-radius;
    else rise=1-edge;
    return eave+Math.max(0,Math.min(1,rise))*roof.height;
   };
  const roofStart=this.indices.length;
  this.addPolygon(polygon,eave,roofColor??color,id,densify,Math.max(.5,Math.min(width,depth)/10),undefined,{elevation,kind:1,origin:center});
  const boundary=new Map<string,{first:number;second:number;count:number}>();
  for(let offset=roofStart;offset<this.indices.length;offset+=3)for(let edge=0;edge<3;edge++){
   const first=this.indices[offset+edge],second=this.indices[offset+(edge+1)%3],key=Math.min(first,second)+':'+Math.max(first,second),entry=boundary.get(key);
   if(entry)entry.count++;else boundary.set(key,{first,second,count:1});
  }
  for(const {first,second,count} of boundary.values()){
   if(count!==1)continue;
   const firstEast=this.positions[first*3]+this.originE,firstNorth=this.originN-this.positions[first*3+2],firstHeight=this.positions[first*3+1];
   const secondEast=this.positions[second*3]+this.originE,secondNorth=this.originN-this.positions[second*3+2],secondHeight=this.positions[second*3+1];
   if(Math.max(firstHeight,secondHeight)<=base+.001)continue;
   const bottomFirst=this.vertex(firstEast,base,firstNorth,bottomColor,id),bottomSecond=this.vertex(secondEast,base,secondNorth,bottomColor,id),topSecond=this.vertex(secondEast,secondHeight,secondNorth,color,id),topFirst=this.vertex(firstEast,firstHeight,firstNorth,color,id);
   this.indices.push(bottomFirst,bottomSecond,topSecond,bottomFirst,topSecond,topFirst);
  }
  }else{
   const flat=topIndices.flat(),contour=rings[0].map(([x,y])=>new Vector2(x,y)),holes=rings.slice(1).map(ring=>ring.map(([x,y])=>new Vector2(x,y)));
   for(const [a,b,c] of ShapeUtils.triangulateShape(contour,holes))this.flatTriangle(flat[a],flat[b],flat[c]);
  }
  if(roofColor||roof)this.addPolygon(polygon,base,bottomColor,id,densify,0,undefined,{kind:2});
 }

 /** Flat polygon at height y: triangulated once, optionally clipped to a tile, then gridded so bending keeps it on the sphere. */
 addPolygon(polygon:Polygon,y:number,color:RGB,id:number,densify:number,grid=overlayGridM,clip?:readonly [number,number,number,number],surface?:{elevation?:(east:number,north:number)=>number;kind?:number;origin?:[number,number]}){
  const rings=[densifyRing(polygon.outer,densify),...polygon.holes.map(hole=>densifyRing(hole,densify))],contour=rings[0].map(([x,z])=>new Vector2(x,z)),holes=rings.slice(1).map(ring=>ring.map(([x,z])=>new Vector2(x,z))),points=rings.flat();
  const cache=new Map<string,number>(),vertexAt=(e:number,n:number)=>{const key=e.toFixed(3)+','+n.toFixed(3);let index=cache.get(key);if(index===undefined){index=this.vertex(e,surface?.elevation?.(e,n)??y,n,color,id,surface?.kind);cache.set(key,index)}return index};
  const fan=(piece:Ring)=>{if(piece.length<3)return;const first=vertexAt(piece[0][0],piece[0][1]);for(let i=1;i<piece.length-1;i++)this.flatTriangle(first,vertexAt(piece[i][0],piece[i][1]),vertexAt(piece[i+1][0],piece[i+1][1]),surface?.kind===2)};
  const [originEast,originNorth]=surface?.origin??[0,0];
  for(const [a,b,c] of ShapeUtils.triangulateShape(contour,holes)){
   const triangle:Ring=clip?clipRingToRect([points[a],points[b],points[c]],clip):[points[a],points[b],points[c]];
   if(triangle.length<3)continue;
   const minX=Math.min(...triangle.map(p=>p[0])),maxX=Math.max(...triangle.map(p=>p[0])),minY=Math.min(...triangle.map(p=>p[1])),maxY=Math.max(...triangle.map(p=>p[1]));
  if(!(grid>0)||(!surface?.elevation&&maxX-minX<=grid&&maxY-minY<=grid)){fan(triangle);continue}
  for(let gy=Math.floor((minY-originNorth)/grid);gy<=Math.floor((maxY-originNorth)/grid);gy++)for(let gx=Math.floor((minX-originEast)/grid);gx<=Math.floor((maxX-originEast)/grid);gx++)fan(clipRingToRect(triangle,[originEast+gx*grid,originNorth+gy*grid,originEast+(gx+1)*grid,originNorth+(gy+1)*grid]));
  }
 }

 /** Centreline ribbon with mitred joints; clipped pieces meet exactly at tile borders because the cut is perpendicular to the same segment. */
 addRibbon(line:Ring,width:number,y:number,color:RGB,id:number,densify:number,clip?:readonly [number,number,number,number]){
  const points=densifyPolyline(line,densify).filter((p,i,all)=>i===0||Math.hypot(p[0]-all[i-1][0],p[1]-all[i-1][1])>1e-6);
  if(points.length<2)return;
    const half=width/2,left:Ring=[],right:Ring=[];
  for(let i=0;i<points.length;i++){
   const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
   let dx=next[0]-prev[0],dy=next[1]-prev[1];const length=Math.hypot(dx,dy)||1;dx/=length;dy/=length;
   let scale=1;
   if(i>0&&i<points.length-1){
    const ax=points[i][0]-prev[0],ay=points[i][1]-prev[1],al=Math.hypot(ax,ay)||1,bx=next[0]-points[i][0],by=next[1]-points[i][1],bl=Math.hypot(bx,by)||1;
        const tangentX=ax/al+bx/bl,tangentY=ay/al+by/bl,tangentLength=Math.hypot(tangentX,tangentY);
        if(tangentLength>1e-6){dx=tangentX/tangentLength;dy=tangentY/tangentLength;scale=Math.min(2,1/Math.max(.5,dx*ax/al+dy*ay/al))}
   }
   const nx=-dy*half*scale,ny=dx*half*scale;
     left.push([points[i][0]+nx,points[i][1]+ny]);right.push([points[i][0]-nx,points[i][1]-ny]);
  }
    if(clip){
     const vertices=new Map<string,number>(),indexAt=([east,north]:[number,number])=>{const key=east+','+north;let index=vertices.get(key);if(index===undefined){index=this.vertex(east,y,north,color,id);vertices.set(key,index)}return index};
     for(let index=0;index<points.length-1;index++){
        const polygon=clipRingToRect([left[index],right[index],right[index+1],left[index+1]],clip);if(polygon.length<3)continue;
        const first=indexAt(polygon[0]);for(let corner=1;corner<polygon.length-1;corner++)this.flatTriangle(first,indexAt(polygon[corner]),indexAt(polygon[corner+1]));
     }
    }else{
     const leftIndices=left.map(([east,north])=>this.vertex(east,y,north,color,id)),rightIndices=right.map(([east,north])=>this.vertex(east,y,north,color,id));
     for(let index=0;index<points.length-1;index++){this.flatTriangle(leftIndices[index],rightIndices[index],rightIndices[index+1]);this.flatTriangle(leftIndices[index],rightIndices[index+1],leftIndices[index+1])}
    }
 }

 build():MeshBuffers|null{
  const vertexCount=this.vertexCount;if(!vertexCount||!this.indices.length)return null;
  return {positions:Float32Array.from(this.positions),colors:Uint8Array.from(this.colors),featureIds:Float32Array.from(this.ids),surfaceKinds:Uint8Array.from(this.kinds),indices:vertexCount<=65535?Uint16Array.from(this.indices):Uint32Array.from(this.indices),vertexCount,triangleCount:this.indices.length/3};
 }
}

/** Deterministic jittered-grid tree placement inside a park polygon; decorative, never surveyed. */
export function placeTrees(feature:SourceFeature,density:number,spacing=13,cap=2500):[number,number][]{
 const out:[number,number][]=[];if(!(density>0)||!feature.polygons)return out;
 const seed=hash32(feature.id);
 for(const polygon of feature.polygons){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const [x,y] of polygon.outer){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
  for(let gy=Math.floor(minY/spacing);gy<=Math.ceil(maxY/spacing);gy++)for(let gx=Math.floor(minX/spacing);gx<=Math.ceil(maxX/spacing);gx++){
   const h=hash32(`${seed}:${gx}:${gy}`);if(unit(h,3)>density)continue;
   const point:[number,number]=[(gx+.5+(unit(h,4)-.5)*.9)*spacing,(gy+.5+(unit(h,5)-.5)*.9)*spacing];
   if(point[0]<minX||point[0]>maxX||point[1]<minY||point[1]>maxY)continue;
   if(pointInside(point,polygon))out.push(point);
  }
 }
 if(out.length>cap){const stride=out.length/cap,picked:[number,number][]=[];for(let i=0;i<cap;i++)picked.push(out[Math.floor(i*stride)]);return picked}
 return out;
}
function pointInside(point:[number,number],polygon:Polygon){
 const inRing=(ring:Ring)=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];if(yi>point[1]!==yj>point[1]&&point[0]<(xj-xi)*(point[1]-yi)/(yj-yi)+xi)inside=!inside}return inside};
 return inRing(polygon.outer)&&!polygon.holes.some(inRing);
}
export const treeDensity:Record<string,number>={park:.5,garden:.45,forest:.8,wood:.8,nature_reserve:.6,orchard:.7,cemetery:.35,common:.3,golf_course:.25,recreation_ground:.2,meadow:.15,grass:.12,scrub:.3,playground:.1,wetland:.1,village_green:.3,greenfield:.1,heath:.2,grassland:.1,grounds:.08};
