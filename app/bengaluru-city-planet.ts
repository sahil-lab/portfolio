/**
 * Bengaluru as a walkable globe on the orbital line. The published city tiles (flat east/north
 * metres from the standalone planet pipeline) are fetched on arrival and baked onto the planet
 * sphere on the CPU, so the kingdom's lighting, static batching and spherical movement treat the
 * city as ordinary scenery. Building roofs and water become the collision footprint.
 */
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as manifestJson from './bengaluru-planet-manifest.json';
import type {LandmarkRecord,PlanetManifest,TileRecord} from './bengaluru-pipeline';
import {cityDirection,cityEdgeAngle,cityFlat,cityPlanetFor,type CityPlanet} from './bengaluru-city-config';
import {planetPoint,type PlanetSurface} from './planet-geography';
import {describeHeight} from './bengaluru-text';
import {disposeScene} from './scene-resources';

export const cityPlanetManifest=manifestJson as unknown as PlanetManifest;
export type CityPlanetTile={record:TileRecord;scene:T.Object3D};
export type CityPlanetTiles={city:CityPlanet;tiles:CityPlanetTile[];bytes:number};
export type CityLandmark={name:string;description:string;kind:string;position:T.Vector3;record:LandmarkRecord};
const cellMetres=25,landmarkReach=14;
const layerNames=['building','ground','water'] as const;
type Layer=typeof layerNames[number];

/** Tiles whose footprint touches the mapped disc; the rest of the survey never leaves the server. */
export function cityPlanetTiles(city:CityPlanet,tiles:readonly TileRecord[]=cityPlanetManifest.tiles){
 return tiles.filter(tile=>{const [minEast,minNorth,maxEast,maxNorth]=tile.bounds,east=Math.max(minEast,Math.min(maxEast,city.anchor.east)),north=Math.max(minNorth,Math.min(maxNorth,city.anchor.north));return Math.hypot(east-city.anchor.east,north-city.anchor.north)<=city.radiusM});
}

/** Fetches the near-detail tiles for a city globe; rejects on a failed tile and resolves null when aborted. */
export async function loadCityPlanetTiles(surface:PlanetSurface,signal:AbortSignal,request:typeof fetch=fetch,concurrency=4):Promise<CityPlanetTiles|null>{
 const city=cityPlanetFor(surface.stop);if(!city||signal.aborted)return null;
 // Like authored terrain, there is nothing to fetch outside a browser; the globe then builds without its city layer.
 if(typeof window==='undefined'&&request===fetch)return {city,tiles:[],bytes:0};
 const loader=new GLTFLoader(),queue=cityPlanetTiles(city),tiles:CityPlanetTile[]=[];let bytes=0;
 const worker=async()=>{
  for(let tile=queue.shift();tile&&!signal.aborted;tile=queue.shift()){
   const lod=tile.lods.find(entry=>entry.level===0)??tile.lods[0];
   const response=await request(city.assetBase+lod.file,{signal:AbortSignal.any([signal,AbortSignal.timeout(30000)]),credentials:'same-origin',cache:'force-cache'});
   if(!response.ok)throw new Error(`Bengaluru tile ${tile.id} responded ${response.status}`);
   const buffer=await response.arrayBuffer();if(signal.aborted)return;
   const gltf=await loader.parseAsync(buffer,city.assetBase);
   if(signal.aborted){disposeScene(gltf.scene);return}
   bytes+=buffer.byteLength;tiles.push({record:tile,scene:gltf.scene});
  }
 };
 try{await Promise.all(Array.from({length:Math.max(1,concurrency)},worker))}
 catch(error){for(const tile of tiles)disposeScene(tile.scene);if(signal.aborted)return null;throw error}
 if(signal.aborted){for(const tile of tiles)disposeScene(tile.scene);return null}
 tiles.sort((first,second)=>first.record.id.localeCompare(second.record.id));
 return {city,tiles,bytes};
}

function createTreeGeometry(){
 const trunk=new T.CylinderGeometry(.3,.42,3,4),crown=new T.ConeGeometry(2.4,5.2,5);trunk.translate(0,1.5,0);crown.translate(0,5.4,0);
 const parts=[trunk.toNonIndexed(),crown.toNonIndexed()],colors=[new T.Color('#5a3e2b'),new T.Color('#2f6b43')],total=parts.reduce((sum,part)=>sum+part.attributes.position.count,0);
 const positions=new Float32Array(total*3),tints=new Float32Array(total*3);let offset=0;
 parts.forEach((part,index)=>{positions.set(part.attributes.position.array as Float32Array,offset*3);for(let vertex=0;vertex<part.attributes.position.count;vertex++)colors[index].toArray(tints,(offset+vertex)*3);offset+=part.attributes.position.count;part.dispose()});
 trunk.dispose();crown.dispose();
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('color',new T.BufferAttribute(tints,3));geometry.computeVertexNormals();return geometry;
}

function insideTriangle(px:number,py:number,ax:number,ay:number,bx:number,by:number,cx:number,cy:number){
 const first=(px-bx)*(ay-by)-(ax-bx)*(py-by),second=(px-cx)*(by-cy)-(bx-cx)*(py-cy),third=(px-ax)*(cy-ay)-(cx-ax)*(py-ay);
 return !((first<0||second<0||third<0)&&(first>0||second>0||third>0));
}

const landmarkKinds:Record<string,string>={building:'Civic building',park:'Park',plaza:'Plaza',water:'Lake',poi:'Place',place:'Locality'};

/** Bakes the loaded tiles onto the globe one tile per step; the planet builder yields between steps. */
export function* buildCityPlanetWorld(parent:T.Object3D,surface:PlanetSurface,payload:CityPlanetTiles){
 const {city}=payload,radius=surface.radius,root=new T.Group();root.name='Planet_City_'+city.id;parent.add(root);
 const materials:Record<Layer,T.MeshStandardMaterial>={
  building:new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.82,metalness:0}),
  ground:new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.94,metalness:0}),
  water:new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.3,metalness:.05}),
 };
 materials.water.userData.surface='water';
 const discUnits=city.radiusM*city.scale,direction=new T.Vector3(),flat=new T.Vector3(),point=new T.Vector3();
 const toPlanet=(east:number,north:number,height:number,target=new T.Vector3())=>{const [x,y,z]=cityDirection(city,radius,east,north);direction.set(x,y,z);planetPoint(surface,direction,target);return target.addScaledVector(direction,height*city.scale)};
 const blockers:number[]=[],cells=new Map<number,number[]>(),treeSpots:number[]=[];
 const cellKey=(east:number,north:number)=>(Math.floor(east/cellMetres)+2048)*8192+Math.floor(north/cellMetres)+2048;
 const addBlocker=(ax:number,ay:number,bx:number,by:number,cx:number,cy:number)=>{
  const triangle=blockers.length/6;blockers.push(ax,ay,bx,by,cx,cy);
  const minEast=Math.floor(Math.min(ax,bx,cx)/cellMetres),maxEast=Math.floor(Math.max(ax,bx,cx)/cellMetres),minNorth=Math.floor(Math.min(ay,by,cy)/cellMetres),maxNorth=Math.floor(Math.max(ay,by,cy)/cellMetres);
  for(let east=minEast;east<=maxEast;east++)for(let north=minNorth;north<=maxNorth;north++){const key=(east+2048)*8192+north+2048,list=cells.get(key);if(list)list.push(triangle);else cells.set(key,[triangle])}
 };
 let triangles=0,bakedTiles=0;
 for(const {scene} of payload.tiles){
  scene.updateMatrixWorld(true);
  for(const object of scene.children){
   if(object.name==='trees'){
    const points=object as T.Points;
    if(points.isPoints){const positions=points.geometry.attributes.position;for(let index=0;index<positions.count;index++){flat.set(positions.getX(index),0,positions.getZ(index)).applyMatrix4(object.matrixWorld);const east=flat.x,north=-flat.z,rho=Math.hypot(east-city.anchor.east,north-city.anchor.north)*city.scale;if(rho<=discUnits-1&&rho>=city.deckRadius+1.5)treeSpots.push(east,north)}points.geometry.dispose();if(points.material instanceof T.Material)points.material.dispose()}
    continue;
   }
   const mesh=object as T.Mesh,layer=object.name as Layer;if(!mesh.isMesh||!layerNames.includes(layer))continue;
   const geometry=mesh.geometry,positions=geometry.attributes.position as T.BufferAttribute,count=positions.count,source=geometry.index?.array??Array.from({length:count},(_,index)=>index);
   const east=new Float32Array(count),north=new Float32Array(count),height=new Float32Array(count),arc=new Float32Array(count);
   for(let index=0;index<count;index++){
    flat.set(positions.getX(index),positions.getY(index),positions.getZ(index)).applyMatrix4(mesh.matrixWorld);
    east[index]=flat.x;north[index]=-flat.z;height[index]=flat.y;arc[index]=Math.hypot(east[index]-city.anchor.east,north[index]-city.anchor.north)*city.scale;
    toPlanet(east[index],north[index],height[index],point);positions.setXYZ(index,point.x,point.y,point.z);
   }
   positions.needsUpdate=true;
   // Keep triangles inside the mapped disc and off the landing deck; roofs and water also become walls for walking.
   const kept:number[]=[];
   for(let start=0;start<source.length;start+=3){
    const a=source[start],b=source[start+1],c=source[start+2];
    if(Math.max(arc[a],arc[b],arc[c])>discUnits||Math.min(arc[a],arc[b],arc[c])<city.deckRadius)continue;
    kept.push(a,b,c);
    if(layer==='water'||layer==='building'&&height[a]>.2&&Math.abs(height[a]-height[b])<.01&&Math.abs(height[a]-height[c])<.01)addBlocker(east[a],north[a],east[b],north[b],east[c],north[c]);
   }
   if(mesh.material instanceof T.Material)mesh.material.dispose();
   if(!kept.length){geometry.dispose();continue}
   geometry.setIndex(count>65535?new T.Uint32BufferAttribute(kept,1):new T.Uint16BufferAttribute(kept,1));
   geometry.deleteAttribute('_featureid');geometry.computeBoundingBox();geometry.computeBoundingSphere();
   const baked=new T.Mesh(geometry,materials[layer]);baked.name='Bengaluru_'+layer;baked.receiveShadow=true;baked.castShadow=false;root.add(baked);triangles+=kept.length/3;
  }
  bakedTiles++;
  yield 'city-tile';
 }
 let trees:T.InstancedMesh|null=null;
 const treeCount=treeSpots.length/2,treeTotal=Math.min(treeCount,city.trees);
 if(treeTotal){
  trees=new T.InstancedMesh(createTreeGeometry(),new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.9,metalness:0}),treeTotal);trees.name='Bengaluru_trees';trees.castShadow=false;trees.receiveShadow=true;
  const matrix=new T.Matrix4(),quaternion=new T.Quaternion(),scale=new T.Vector3(),up=new T.Vector3(0,1,0),stride=treeCount/treeTotal;
  for(let instance=0;instance<treeTotal;instance++){
   const spot=Math.min(treeCount-1,Math.floor(instance*stride)),east=treeSpots[spot*2],north=treeSpots[spot*2+1],size=city.scale*(.8+((spot*2654435761)>>>0)%1000/2000);
   toPlanet(east,north,-.3,point);quaternion.setFromUnitVectors(up,direction);scale.set(size,size*(.9+spot%7/20),size);
   matrix.compose(point,quaternion,scale);trees.setMatrixAt(instance,matrix);
  }
  trees.instanceMatrix.needsUpdate=true;trees.computeBoundingSphere();root.add(trees);
 }
 const landmarks:CityLandmark[]=[];
 for(const record of cityPlanetManifest.landmarks){
  const rho=Math.hypot(record.local[0]-city.anchor.east,record.local[1]-city.anchor.north)*city.scale;if(rho>discUnits-1||rho<city.deckRadius)continue;
  const kind=landmarkKinds[record.featureClass]??'Landmark',heightText=describeHeight({heightM:record.heightM,heightSource:record.heightSource,landmark:record.label});
  landmarks.push({name:record.label,kind,description:heightText?`${kind} \u00b7 ${heightText}`:`${kind} mapped from OpenStreetMap`,position:toPlanet(record.local[0],record.local[1],0),record});
 }
 const blockerList=new Float32Array(blockers),hit=(east:number,north:number)=>{
  const list=cells.get(cellKey(east,north));if(!list)return false;
  for(const triangle of list){const offset=triangle*6;if(insideTriangle(east,north,blockerList[offset],blockerList[offset+1],blockerList[offset+2],blockerList[offset+3],blockerList[offset+4],blockerList[offset+5]))return true}
  return false;
 };
 const probe=new T.Vector3();
 return {root,landmarks,materials,trees,triangles,bakedTiles,bytes:payload.bytes,blockerCount:blockerList.length/6,toPlanet,
  flatAt:(position:T.Vector3)=>cityFlat(city,radius,probe.copy(position).sub(surface.center)),
  blocked(position:T.Vector3,padding=.45){
   const {east,north,rho}=cityFlat(city,radius,probe.copy(position).sub(surface.center));
   if(rho>discUnits+1||rho<city.deckRadius-1)return false;
   // The rover's wide padding would seal most streets; a short reach keeps the city drivable.
   const reach=Math.min(padding,.75)/city.scale;
   return hit(east,north)||hit(east+reach,north)||hit(east-reach,north)||hit(east,north+reach)||hit(east,north-reach);
  },
  nearest(position:T.Vector3){let best:CityLandmark|undefined,bestDistance=landmarkReach;for(const landmark of landmarks){const distance=position.distanceTo(landmark.position);if(distance<bestDistance){best=landmark;bestDistance=distance}}return best},
  edgeAngle:cityEdgeAngle(city,radius),
 };
}
export type CityPlanetWorld=ReturnType<typeof buildCityPlanetWorld> extends Generator<string,infer Result>?Result:never;

const skyTextures=new Map<string,Promise<T.CanvasTexture|null>>();
/** Rasterises the build-time sky SVG once per city; skipped outside browsers so Node stays deterministic. */
function loadSkyTexture(city:CityPlanet,width=1536){
 let pending=skyTextures.get(city.id);
 if(!pending){
  pending=(async()=>{
   if(typeof Image==='undefined'||typeof document==='undefined')return null;
   const image=new Image();image.decoding='async';image.src=city.assetBase+cityPlanetManifest.sky;
   try{await image.decode()}catch{return null}
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=width/2;
   const context=canvas.getContext('2d');if(!context||typeof context.drawImage!=='function')return null;
   context.drawImage(image,0,0,canvas.width,canvas.height);
   const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;return texture;
  })();
  skyTextures.set(city.id,pending);
 }
 return pending;
}

/**
 * Dresses an orbital silhouette of a city globe in the baked city map. The texture centre sits at the
 * sphere's +x, so the mesh turns it toward the landing pole; the flat cap is too shallow to notice.
 */
export function applyCityPlanetTexture(mesh:T.Mesh,city:CityPlanet){
 const material=new T.MeshStandardMaterial({color:city.ground,roughness:.95,metalness:0});mesh.material=material;mesh.rotation.z=Math.PI/2;
 return loadSkyTexture(city).then(texture=>{
  if(!texture)return false;
  material.map=texture;material.color.set('#ffffff');material.needsUpdate=true;return true;
 },()=>false);
}
