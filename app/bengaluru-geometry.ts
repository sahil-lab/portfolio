/**
 * Turns local-metre features into flat triangle buffers (x=East, y=height, z=-North).
 * Tiles stay flat on disk; the GPU vertex stage bends them onto the planet. Long edges are
 * densified and large polygons are gridded so the bent surface follows the sphere instead
 * of cutting chords through it. Normals are omitted on purpose: flat shading derives them
 * from the bent positions, which also halves the vertex payload.
 */
import {ShapeUtils,Vector2} from 'three';
import {densifyPolyline,densifyRing} from './bengaluru-projection';
import type {Polygon,Ring,SourceFeature} from './bengaluru-features';
import {clipRingToRect} from './bengaluru-features';

export type RGB=[number,number,number];
export type MeshBuffers={positions:Float32Array;colors:Uint8Array;featureIds:Float32Array;indices:Uint16Array|Uint32Array;vertexCount:number;triangleCount:number};

/** Lifts above the ground sphere, metres; ordered so every overlay clears the sphere mesh and each other. */
export const surfaceLift={water:.5,park:.9,plaza:1.1,road:1.3,rail:1.4};
/** Interior grid spacing for flat polygons so chords stay within centimetres of the sphere. */
export const overlayGridM=50;

export const palette={
 building:{civic:[232,215,179],commercial:[239,230,212],residential:[227,201,174],worship:[241,233,220],sports:[216,210,196],industrial:[212,207,197],default:[233,220,198]} as Record<string,RGB>,
 landmark:[244,214,150] as RGB,
 park:{park:[111,159,90],garden:[127,174,95],pitch:[134,176,94],playground:[138,176,100],forest:[91,141,76],wood:[91,141,76],scrub:[120,150,90],grass:[141,179,106],meadow:[146,178,104],cemetery:[127,160,102],wetland:[111,154,122],golf_course:[128,172,92],stadium:[134,176,94],grounds:[214,201,170],default:[118,164,96]} as Record<string,RGB>,
 water:[79,143,201] as RGB,
 road:{major:[233,220,195],minor:[215,201,174],path:[207,191,159],plaza:[221,208,182],rail:[139,131,120],waterway:[88,150,205]} as Record<string,RGB>,
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

export function featureColor(feature:SourceFeature):RGB{
 const seed=hash32(feature.id);
 switch(feature.featureClass){
  case 'building':{
   if(feature.landmark)return varyColor(palette.landmark,seed,.02);
   const category=feature.tags.amenity==='place_of_worship'?'worship':feature.tags.tourism==='museum'?'civic':buildingCategory[feature.subtype]??'default';
   return varyColor(palette.building[category],seed);
  }
  case 'park':return varyColor(palette.park[feature.subtype]??palette.park.default,seed,.04);
  case 'water':return feature.line?palette.road.waterway:palette.water;
  case 'rail':return palette.road.rail;
  case 'road':return feature.subtype==='plaza'?palette.road.plaza:majorRoads.has(feature.subtype)?palette.road.major:pathRoads.has(feature.subtype)?palette.road.path:palette.road.minor;
  default:return palette.building.default;
 }
}

export class FlatMeshBuilder{
 private positions:number[]=[];private colors:number[]=[];private ids:number[]=[];private indices:number[]=[];
 constructor(private readonly originE=0,private readonly originN=0){}
 get vertexCount(){return this.positions.length/3}
 get triangleCount(){return this.indices.length/3}
 private vertex(east:number,y:number,north:number,color:RGB,id:number){
  this.positions.push(east-this.originE,y,this.originN-north);this.colors.push(linearByte[clampByte(color[0])],linearByte[clampByte(color[1])],linearByte[clampByte(color[2])],255);this.ids.push(id);return this.ids.length-1;
 }
 /** Emits a triangle wound counter-clockwise in East/North so it faces up in Y-up space; the stored z axis is -North, which flips the sign test. */
 private flatTriangle(a:number,b:number,c:number){
  const p=this.positions,ax=p[a*3],az=p[a*3+2],area=(p[b*3]-ax)*(p[c*3+2]-az)-(p[c*3]-ax)*(p[b*3+2]-az);
  if(Math.abs(area)<1e-6)return;
  if(area>0)this.indices.push(a,c,b);else this.indices.push(a,b,c);
 }
 private shade(color:RGB,factor:number):RGB{return [clampByte(color[0]*factor),clampByte(color[1]*factor),clampByte(color[2]*factor)]}

 addExtrusion(polygon:Polygon,base:number,top:number,color:RGB,id:number,densify:number,baseShade=.72){
  if(!(top>base))return;
  const rings=[densifyRing(polygon.outer,densify),...polygon.holes.map(hole=>densifyRing(hole,densify))],bottomColor=this.shade(color,baseShade),topIndices:number[][]=[];
  for(const ring of rings){
   const bottom=ring.map(([e,n])=>this.vertex(e,base,n,bottomColor,id)),upper=ring.map(([e,n])=>this.vertex(e,top,n,color,id));
   topIndices.push(upper);
   for(let i=0;i<ring.length;i++){const j=(i+1)%ring.length,a=bottom[i],b=bottom[j],c=upper[j],d=upper[i];this.indices.push(a,b,c,a,c,d)}
  }
  const flat=topIndices.flat(),contour=rings[0].map(([x,y])=>new Vector2(x,y)),holes=rings.slice(1).map(ring=>ring.map(([x,y])=>new Vector2(x,y)));
  for(const [a,b,c] of ShapeUtils.triangulateShape(contour,holes))this.flatTriangle(flat[a],flat[b],flat[c]);
 }

 /** Flat polygon at height y: triangulated once, optionally clipped to a tile, then gridded so bending keeps it on the sphere. */
 addPolygon(polygon:Polygon,y:number,color:RGB,id:number,densify:number,grid=overlayGridM,clip?:readonly [number,number,number,number]){
  const rings=[densifyRing(polygon.outer,densify),...polygon.holes.map(hole=>densifyRing(hole,densify))],contour=rings[0].map(([x,z])=>new Vector2(x,z)),holes=rings.slice(1).map(ring=>ring.map(([x,z])=>new Vector2(x,z))),points=rings.flat();
  const cache=new Map<string,number>(),vertexAt=(e:number,n:number)=>{const key=e.toFixed(3)+','+n.toFixed(3);let index=cache.get(key);if(index===undefined){index=this.vertex(e,y,n,color,id);cache.set(key,index)}return index};
  const fan=(piece:Ring)=>{if(piece.length<3)return;const first=vertexAt(piece[0][0],piece[0][1]);for(let i=1;i<piece.length-1;i++)this.flatTriangle(first,vertexAt(piece[i][0],piece[i][1]),vertexAt(piece[i+1][0],piece[i+1][1]))};
  for(const [a,b,c] of ShapeUtils.triangulateShape(contour,holes)){
   const triangle:Ring=clip?clipRingToRect([points[a],points[b],points[c]],clip):[points[a],points[b],points[c]];
   if(triangle.length<3)continue;
   const minX=Math.min(...triangle.map(p=>p[0])),maxX=Math.max(...triangle.map(p=>p[0])),minY=Math.min(...triangle.map(p=>p[1])),maxY=Math.max(...triangle.map(p=>p[1]));
   if(!(grid>0)||(maxX-minX<=grid&&maxY-minY<=grid)){fan(triangle);continue}
   for(let gy=Math.floor(minY/grid);gy<=Math.floor(maxY/grid);gy++)for(let gx=Math.floor(minX/grid);gx<=Math.floor(maxX/grid);gx++)fan(clipRingToRect(triangle,[gx*grid,gy*grid,(gx+1)*grid,(gy+1)*grid]));
  }
 }

 /** Centreline ribbon with mitred joints; clipped pieces meet exactly at tile borders because the cut is perpendicular to the same segment. */
 addRibbon(line:Ring,width:number,y:number,color:RGB,id:number,densify:number){
  const points=densifyPolyline(line,densify).filter((p,i,all)=>i===0||Math.hypot(p[0]-all[i-1][0],p[1]-all[i-1][1])>1e-6);
  if(points.length<2)return;
  const half=width/2,left:number[]=[],right:number[]=[];
  for(let i=0;i<points.length;i++){
   const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
   let dx=next[0]-prev[0],dy=next[1]-prev[1];const length=Math.hypot(dx,dy)||1;dx/=length;dy/=length;
   let scale=1;
   if(i>0&&i<points.length-1){
    const ax=points[i][0]-prev[0],ay=points[i][1]-prev[1],al=Math.hypot(ax,ay)||1,bx=next[0]-points[i][0],by=next[1]-points[i][1],bl=Math.hypot(bx,by)||1;
    const cos=(ax*bx+ay*by)/(al*bl);scale=Math.min(2,1/Math.max(.5,Math.sqrt((1+cos)/2)));
   }
   const nx=-dy*half*scale,ny=dx*half*scale;
   left.push(this.vertex(points[i][0]+nx,y,points[i][1]+ny,color,id));right.push(this.vertex(points[i][0]-nx,y,points[i][1]-ny,color,id));
  }
  for(let i=0;i<points.length-1;i++){this.flatTriangle(left[i],right[i],right[i+1]);this.flatTriangle(left[i],right[i+1],left[i+1])}
 }

 build():MeshBuffers|null{
  const vertexCount=this.vertexCount;if(!vertexCount||!this.indices.length)return null;
  return {positions:Float32Array.from(this.positions),colors:Uint8Array.from(this.colors),featureIds:Float32Array.from(this.ids),indices:vertexCount<=65535?Uint16Array.from(this.indices):Uint32Array.from(this.indices),vertexCount,triangleCount:this.indices.length/3};
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
