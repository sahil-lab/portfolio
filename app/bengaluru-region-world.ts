import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createTreeGeometry} from './bengaluru-planet';
import {createTileManager,type TileLevel} from './bengaluru-tiles';
import {createWrappedPlanetProjection} from './bengaluru-projection';
import {bengaluruRegionCity,cityDirection,cityFlat,type CityPlanet} from './bengaluru-city-config';
import type {FeatureRecord,PlanetManifest,TileRecord} from './bengaluru-pipeline';
import type {PlanetSurface} from './planet-geography';
import {disposeScene} from './scene-resources';
import {describeHeight} from './bengaluru-text';

export type RegionalTile={record:TileRecord;level:TileLevel;scene:T.Object3D;features:FeatureRecord[];bytes:number};
export type RegionPayload={city:CityPlanet;manifest:PlanetManifest;tiles:RegionalTile[];loadTile:(record:TileRecord,level:TileLevel,signal:AbortSignal)=>Promise<RegionalTile>};
type RegionAsset={root:T.Group;record:TileRecord;level:TileLevel;bytes:number;triangles:number;cells:Map<string,number[]>;surfaces:Float32Array;features:FeatureRecord[];cameraCanopies:T.Sphere[]};
export type RegionControls={
 update(delta:number,observer:T.Group,active:boolean):void;
 dispose():void;
 readyAt(position:T.Vector3):boolean;
 arrivalPosition(position:T.Vector3,blocked?:(candidate:T.Vector3)=>boolean):T.Vector3|null;
 projectGround(direction:T.Vector3,target:T.Vector3,lift?:number):T.Vector3;
 sampleGround(position:T.Vector3):{point:T.Vector3;normal:T.Vector3}|null;
 cameraDistance(origin:T.Vector3,direction:T.Vector3,distance:number):number;
 focus(id:string|{east:number;north:number},player:T.Group):Promise<boolean>;
 select(ray:T.Raycaster):FeatureRecord|null;
 stats():ReturnType<ReturnType<typeof createTileManager>['stats']>;
 manifest:PlanetManifest;
};

export async function loadBengaluruRegion(surface:PlanetSurface,signal:AbortSignal,request:typeof fetch=fetch):Promise<RegionPayload|null>{
 const city=bengaluruRegionCity,loader=new GLTFLoader();
 const response=await request(city.assetBase+'manifest.json',{signal,credentials:'same-origin',cache:'no-cache'});
 if(!response.ok)throw new Error('Bengaluru manifest responded '+response.status);
 const manifest=await response.json() as PlanetManifest;
 if(manifest.projection.kind!=='whole-globe'||!manifest.tiles.length)throw new Error('Bengaluru regional manifest is invalid');
 const loadTile=async(record:TileRecord,level:TileLevel,abort:AbortSignal):Promise<RegionalTile>=>{
  const lod=record.lods.find(entry=>entry.level===level)??record.lods[0],options={signal:AbortSignal.any([abort,AbortSignal.timeout(30000)]),credentials:'same-origin' as const,cache:'force-cache' as const};
  const [geometryResponse,featureResponse]=await Promise.all([request(city.assetBase+lod.file+'?v='+lod.sha256,options),request(city.assetBase+record.features+'?v='+encodeURIComponent(record.featuresSha256??manifest.generator),options)]);
  if(!geometryResponse.ok||!featureResponse.ok)throw new Error('Bengaluru tile '+record.id+' is unavailable');
  const [buffer,features]=await Promise.all([geometryResponse.arrayBuffer(),featureResponse.json() as Promise<FeatureRecord[]>]);
  abort.throwIfAborted();
  if(!Array.isArray(features)||features.length!==record.featureCount)throw new Error('Bengaluru feature metadata does not match '+record.id);
  const asset=await loader.parseAsync(buffer,city.assetBase);
  if(abort.aborted){disposeScene(asset.scene);abort.throwIfAborted()}
  return {record,level,scene:asset.scene,features,bytes:buffer.byteLength};
 };
 const ordered=[...manifest.tiles].sort((first,second)=>Math.hypot(first.center[0]-city.anchor.east,first.center[1]-city.anchor.north)-Math.hypot(second.center[0]-city.anchor.east,second.center[1]-city.anchor.north)).slice(0,9);
 const controller=new AbortController(),combined=AbortSignal.any([signal,controller.signal]),tiles:RegionalTile[]=[];
 const worker=async()=>{for(let record=ordered.shift();record&&!combined.aborted;record=ordered.shift())tiles.push(await loadTile(record,0,combined))};
 const settled=await Promise.allSettled(Array.from({length:3},()=>worker().catch(error=>{controller.abort();throw error})));
 const failure=settled.find(result=>result.status==='rejected');
 if(failure||signal.aborted){for(const tile of tiles)disposeScene(tile.scene);if(signal.aborted)return null;throw failure?.reason??new Error('Bengaluru arrival tiles failed')}
 return {city,manifest,tiles,loadTile};
}

function insideTriangle(east:number,north:number,values:ArrayLike<number>,offset:number){
 const first=(east-values[offset+2])*(values[offset+1]-values[offset+3])-(values[offset]-values[offset+2])*(north-values[offset+3]);
 const second=(east-values[offset+4])*(values[offset+3]-values[offset+5])-(values[offset+2]-values[offset+4])*(north-values[offset+5]);
 const third=(east-values[offset])*(values[offset+5]-values[offset+1])-(values[offset+4]-values[offset])*(north-values[offset+1]);
 return !((first<0||second<0||third<0)&&(first>0||second>0||third>0));
}

const surfaceStride=11;
function triangleHeight(east:number,north:number,values:Float32Array,offset:number){
 const firstEast=values[offset],firstNorth=values[offset+1],secondEast=values[offset+2],secondNorth=values[offset+3],thirdEast=values[offset+4],thirdNorth=values[offset+5];
 const denominator=(secondNorth-thirdNorth)*(firstEast-thirdEast)+(thirdEast-secondEast)*(firstNorth-thirdNorth);
 const first=((secondNorth-thirdNorth)*(east-thirdEast)+(thirdEast-secondEast)*(north-thirdNorth))/denominator;
 const second=((thirdNorth-firstNorth)*(east-thirdEast)+(firstEast-thirdEast)*(north-thirdNorth))/denominator;
 return first*values[offset+7]+second*values[offset+9]+(1-first-second)*values[offset+10];
}

function facadeMaterial(){
 const material=new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.82,metalness:0});
 material.userData.authoredArchitecture=true;
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 cityMeters;attribute vec3 cityFacade;attribute float cityRoof;varying vec3 vCityMeters;varying vec3 vCityFacade;varying float vCityRoof;').replace('#include <begin_vertex>','#include <begin_vertex>\nvCityMeters=cityMeters;vCityFacade=cityFacade;vCityRoof=cityRoof;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vCityMeters;varying vec3 vCityFacade;varying float vCityRoof;').replace('#include <color_fragment>',`#include <color_fragment>
   vec3 cityFace=normalize(cross(dFdx(vCityMeters),dFdy(vCityMeters)));
   float cityWall=(1.0-step(0.55,abs(cityFace.y)))*(1.0-step(0.5,vCityRoof));
   float cityBay=fract((abs(cityFace.x)>abs(cityFace.z)?vCityMeters.z:vCityMeters.x)/max(1.0,vCityFacade.y));
   float cityFloor=fract((vCityMeters.y-vCityFacade.z)/max(1.0,vCityFacade.x));
   float cityWindow=step(0.22,cityBay)*(1.0-step(0.74,cityBay))*step(0.26,cityFloor)*(1.0-step(0.79,cityFloor))*cityWall*step(vCityFacade.z+1.1,vCityMeters.y);
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.16,0.27,0.31),cityWindow*0.76);
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.72,0.78,0.75),cityWall*(1.0-step(0.035,cityFloor))*0.24);`);
 };
 material.customProgramCacheKey=()=>'bengaluru-regional-facades-2';return material;
}

export function* buildBengaluruRegionWorld(parent:T.Object3D,surface:PlanetSurface,payload:RegionPayload){
 const {city,manifest}=payload,root=new T.Group();root.name='Planet_City_bengaluru';parent.add(root);
 const materials={building:facadeMaterial(),ground:new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.94}),water:new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.34,metalness:0}),base:new T.MeshStandardMaterial({color:city.ground,roughness:1,metalness:0})};
 materials.water.userData.surface='water';
 const treeGeometry=createTreeGeometry(),treeMaterial=new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.9});
 const direction=new T.Vector3(),point=new T.Vector3(),flat=new T.Vector3(),vertical=new T.Vector3(0,1,0);
 const cameraRay=new T.Ray(),cameraHit=new T.Vector3();
 const projection=createWrappedPlanetProjection({localBounds:manifest.aoi.localBounds,anchor:manifest.projection.anchor,radius:surface.radius});
 const records=new Map(manifest.tiles.map(record=>[record.id,record])),attached=new Map<string,RegionAsset>();
 const waiters=new Map<string,{promise:Promise<boolean>;resolve:(ready:boolean)=>void}>();
 const focusPins=new Set<string>();
 let disposed=false,clock=0,lastActive=true,focusEpoch=0;
 const toPlanet=(east:number,north:number,height=0,target=new T.Vector3())=>{const normal=cityDirection(city,surface.radius,east,north);return target.set(...normal).multiplyScalar(surface.radius+height*city.scale).add(surface.center)};
 const flatAt=(position:T.Vector3)=>cityFlat(city,surface.radius,direction.copy(position).sub(surface.center));
 const recordAt=(east:number,north:number)=>records.get('t'+Math.floor(east/manifest.tileSizeM)+'_'+Math.floor(north/manifest.tileSizeM));
 const cellKey=(east:number,north:number)=>Math.floor(east/25)+','+Math.floor(north/25);
 const bake=(tile:RegionalTile):RegionAsset=>{
  const tileRoot=new T.Group();tileRoot.name='Bengaluru_Tile_'+tile.record.id;
  const underground=new Set(tile.features.filter(feature=>feature.tags?.location==='underground'||feature.subtype==='train_station'&&Number(feature.tags?.layer)<0).map(feature=>feature.index));
  const cells=new Map<string,number[]>(),surfaces:number[]=[],cameraCanopies:T.Sphere[]=[];let triangles=0,extraBytes=0;
  const [west,south,east,north]=tile.record.bounds,width=east-west,depth=north-south;
  const groundGeometry=new T.PlaneGeometry(width,depth,Math.max(1,Math.ceil(width/25)),Math.max(1,Math.ceil(depth/25))),groundPositions=groundGeometry.attributes.position;
  for(let index=0;index<groundPositions.count;index++){toPlanet((west+east)/2+groundPositions.getX(index),(south+north)/2+groundPositions.getY(index),-.08,point);groundPositions.setXYZ(index,point.x,point.y,point.z)}
  groundGeometry.computeVertexNormals();groundGeometry.computeBoundingSphere();
  const base=new T.Mesh(groundGeometry,materials.base);base.name='Bengaluru_Base';base.receiveShadow=true;base.matrixAutoUpdate=false;tileRoot.add(base);
  triangles+=(groundGeometry.index?.count??0)/3;extraBytes+=(groundPositions.array.byteLength+groundGeometry.attributes.normal.array.byteLength+(groundGeometry.index?.array.byteLength??0))*2;
  tile.scene.updateMatrixWorld(true);
  const sourceChildren=tile.scene.children.slice();
  for(const child of sourceChildren){
   const mesh=child as T.Mesh,sourceMaterial=mesh.material;
   if((child as T.Points).isPoints&&child.name==='trees'){
    const positions=mesh.geometry.attributes.position,total=Math.min(64,positions.count);
    if(total){
     const trees=new T.InstancedMesh(treeGeometry,treeMaterial,total),matrix=new T.Matrix4(),quaternion=new T.Quaternion(),scale=new T.Vector3();trees.name='Bengaluru_Trees';
     for(let index=0;index<total;index++){
      const source=Math.floor(index*positions.count/total);flat.fromBufferAttribute(positions,source).applyMatrix4(child.matrixWorld);toPlanet(flat.x,-flat.z,.025,point);
      direction.copy(point).sub(surface.center).normalize();quaternion.setFromUnitVectors(vertical,direction);scale.setScalar(city.scale*(.8+(source%7)*.04));matrix.compose(point,quaternion,scale);trees.setMatrixAt(index,matrix);
      cameraCanopies.push((treeGeometry.userData.cameraCanopy as T.Sphere).clone().applyMatrix4(matrix));extraBytes+=128;
     }
     trees.computeBoundingSphere();trees.receiveShadow=true;tileRoot.add(trees);extraBytes+=trees.instanceMatrix.array.byteLength*2;
    }
    mesh.geometry.dispose();
   }else if(mesh.isMesh&&(child.name==='building'||child.name==='ground'||child.name==='water')){
    const layer=child.name as keyof typeof materials,geometry=mesh.geometry,positions=geometry.attributes.position,featureIds=geometry.getAttribute('_featureid'),surfaceKinds=geometry.getAttribute('_surface');
    const local=new Float32Array(positions.count*3);
    for(let index=0;index<positions.count;index++){
    flat.fromBufferAttribute(positions,index).applyMatrix4(child.matrixWorld);
    if(layer==='ground')flat.y=flat.y>=1.1?.06:.025;else if(layer==='water')flat.y=-.04;
    local[index*3]=flat.x;local[index*3+1]=flat.y;local[index*3+2]=-flat.z;
     toPlanet(flat.x,-flat.z,flat.y,point);positions.setXYZ(index,point.x,point.y,point.z);
    }
    positions.needsUpdate=true;
    if(layer==='building'){
     const facade=new Float32Array(positions.count*3);
     for(let vertex=0;vertex<positions.count;vertex++){
      const feature=featureIds?tile.features[Math.round(featureIds.getX(vertex))]:undefined,base=feature?.minHeightM??0,span=(feature?.displayHeightM??feature?.heightM??8)-base;
      facade[vertex*3]=Math.max(2,span/Math.max(1,feature?.levels??Math.round(span/3)));facade[vertex*3+1]=feature?.subtype==='office'?4.2:feature?.subtype==='house'?2.8:3.2;facade[vertex*3+2]=base;
     }
     geometry.setAttribute('cityMeters',new T.BufferAttribute(local,3));geometry.setAttribute('cityFacade',new T.BufferAttribute(facade,3));geometry.setAttribute('cityRoof',surfaceKinds??new T.BufferAttribute(new Uint8Array(positions.count),1));extraBytes+=(local.byteLength+facade.byteLength+(surfaceKinds?0:positions.count))*2;
    }
    if(layer==='building'&&geometry.index){
     const original=geometry.index,kept:number[]=[];
     for(let offset=0;offset<original.count;offset+=3){
      const first=original.getX(offset),second=original.getX(offset+1),third=original.getX(offset+2);
      if(featureIds&&underground.has(Math.round(featureIds.getX(first))))continue;
      point.fromBufferAttribute(positions,first);direction.fromBufferAttribute(positions,second).sub(point);flat.fromBufferAttribute(positions,third).sub(point);
      if(direction.cross(flat).lengthSq()>1e-12)kept.push(first,second,third);
     }
     if(kept.length!==original.count)geometry.setIndex(kept);
    }
    const indices=geometry.index;
    const bottomVertices=new Map<string,number>(),baseCaps:number[]=[],roofFeatures:number[]=[];
    const vertexKey=(index:number)=>`${featureIds?.getX(index)??0}:${local[index*3]}:${local[index*3+2]}`;
    if(layer==='building'&&!surfaceKinds)for(let index=0;index<positions.count;index++){
     const key=vertexKey(index),previous=bottomVertices.get(key);
     if(previous===undefined||local[index*3+1]<local[previous*3+1])bottomVertices.set(key,index);
    }
    for(let offset=0;offset<(indices?.count??positions.count);offset+=3){
     const first=indices?indices.getX(offset):offset,second=indices?indices.getX(offset+1):offset+1,third=indices?indices.getX(offset+2):offset+2;
     const firstHeight=local[first*3+1],secondHeight=local[second*3+1],thirdHeight=local[third*3+1];
    const faceKind=surfaceKinds?.getX(first);
    if(layer==='building'&&surfaceKinds&&faceKind!==1){
     if(faceKind===2&&indices){point.fromBufferAttribute(positions,first);direction.fromBufferAttribute(positions,second).sub(point);flat.fromBufferAttribute(positions,third).sub(point);if(direction.cross(flat).dot(point.sub(surface.center))>0){indices.setX(offset+1,third);indices.setX(offset+2,second)}}
     continue;
    }
    if(!surfaceKinds&&(Math.abs(firstHeight-secondHeight)>.02||Math.abs(firstHeight-thirdHeight)>.02))continue;
     const area=(local[second*3]-local[first*3])*(local[third*3+2]-local[first*3+2])-(local[third*3]-local[first*3])*(local[second*3+2]-local[first*3+2]);
    if(layer==='building'&&indices){
     point.fromBufferAttribute(positions,first);direction.fromBufferAttribute(positions,second).sub(point);flat.fromBufferAttribute(positions,third).sub(point);
     if(direction.cross(flat).dot(point.sub(surface.center))<0){indices.setX(offset+1,third);indices.setX(offset+2,second)}
      const bottom=surfaceKinds?[]:[first,second,third].map(vertex=>bottomVertices.get(vertexKey(vertex))!);
      if(bottom.length&&bottom.every(vertex=>local[vertex*3+1]<firstHeight-.02)){
       point.fromBufferAttribute(positions,bottom[0]);direction.fromBufferAttribute(positions,bottom[1]).sub(point);flat.fromBufferAttribute(positions,bottom[2]).sub(point);
       if(direction.cross(flat).dot(point.sub(surface.center))>0)baseCaps.push(bottom[0],bottom[2],bottom[1]);else baseCaps.push(...bottom);
      }
    }
     if(Math.abs(area)<.0001)continue;
    const feature=featureIds?tile.features[Math.round(featureIds.getX(first))]:undefined,triangle=surfaces.length/surfaceStride;
    if(layer==='building')roofFeatures[triangle]=featureIds?Math.round(featureIds.getX(first)):0;
    surfaces.push(local[first*3],local[first*3+2],local[second*3],local[second*3+2],local[third*3],local[third*3+2],feature?.minHeightM??0,firstHeight,layer==='building'?1:layer==='water'?2:0,secondHeight,thirdHeight);
     const minEast=Math.floor(Math.min(local[first*3],local[second*3],local[third*3])/25),maxEast=Math.floor(Math.max(local[first*3],local[second*3],local[third*3])/25),minNorth=Math.floor(Math.min(local[first*3+2],local[second*3+2],local[third*3+2])/25),maxNorth=Math.floor(Math.max(local[first*3+2],local[second*3+2],local[third*3+2])/25);
     for(let east=minEast;east<=maxEast;east++)for(let north=minNorth;north<=maxNorth;north++){const key=east+','+north,entries=cells.get(key);if(entries)entries.push(triangle);else cells.set(key,[triangle]);extraBytes+=8}
    }
    if(layer==='building'&&indices)for(let offset=0;offset<indices.count;offset+=3){
     const first=indices.getX(offset),second=indices.getX(offset+1),third=indices.getX(offset+2);
    if(surfaceKinds&&surfaceKinds.getX(first)!==0)continue;
     if(Math.abs(local[first*3+1]-local[second*3+1])<=.02&&Math.abs(local[first*3+1]-local[third*3+1])<=.02)continue;
     const eastEdge=local[second*3]-local[first*3],heightEdge=local[second*3+1]-local[first*3+1],northEdge=local[second*3+2]-local[first*3+2];
     const eastOther=local[third*3]-local[first*3],heightOther=local[third*3+1]-local[first*3+1],northOther=local[third*3+2]-local[first*3+2];
     const normalEast=northEdge*heightOther-heightEdge*northOther,normalNorth=heightEdge*eastOther-eastEdge*heightOther,length=Math.hypot(normalEast,normalNorth);
     if(length<.0001)continue;
     const centerEast=(local[first*3]+local[second*3]+local[third*3])/3,centerNorth=(local[first*3+2]+local[second*3+2]+local[third*3+2])/3,id=featureIds?Math.round(featureIds.getX(first)):0;
    const underRoof=(east:number,north:number)=>(cells.get(cellKey(east,north))??[]).some(triangle=>roofFeatures[triangle]===id&&insideTriangle(east,north,surfaces,triangle*surfaceStride));
     for(const inset of [.02,.005,.1]){
      const east=normalEast/length*inset,north=normalNorth/length*inset,front=underRoof(centerEast+east,centerNorth+north),back=underRoof(centerEast-east,centerNorth-north);
      if(front===back)continue;
      if(front){indices.setX(offset+1,third);indices.setX(offset+2,second)}
      break;
     }
    }
    if(indices&&baseCaps.length){
     const sealed=new (positions.count<=65535?Uint16Array:Uint32Array)(indices.count+baseCaps.length);
     sealed.set(indices.array);sealed.set(baseCaps,indices.count);geometry.setIndex(new T.BufferAttribute(sealed,1));extraBytes+=baseCaps.length*sealed.BYTES_PER_ELEMENT*2;
    }
    geometry.computeBoundingSphere();geometry.computeBoundingBox();
    const rendered=new T.Mesh(geometry,materials[layer]);rendered.name='Bengaluru_'+layer;rendered.userData.cityTile=tile.record.id;rendered.receiveShadow=true;rendered.castShadow=false;rendered.matrixAutoUpdate=false;tileRoot.add(rendered);triangles+=(geometry.index?.count??positions.count)/3;
   }
   for(const material of Array.isArray(sourceMaterial)?sourceMaterial:[sourceMaterial])material?.dispose();
   tile.scene.remove(child);
  }
  const surfaceBuffer=Float32Array.from(surfaces);
  return {root:tileRoot,record:tile.record,level:tile.level,bytes:tile.bytes*2+extraBytes+surfaceBuffer.byteLength+JSON.stringify(tile.features).length*2,triangles,cells,surfaces:surfaceBuffer,features:tile.features,cameraCanopies};
 };
 const release=(asset:RegionAsset)=>{asset.root.traverse(child=>{const mesh=child as T.Mesh;if((child as T.InstancedMesh).isInstancedMesh)(child as T.InstancedMesh).dispose();else if(mesh.isMesh)mesh.geometry.dispose()});asset.root.clear();asset.cells.clear()};
 const initial:{tile:TileRecord;level:TileLevel;asset:RegionAsset}[]=[];
 for(const tile of payload.tiles){initial.push({tile:tile.record,level:tile.level,asset:bake(tile)});yield 'regional-arrival-tile'}
 payload.tiles.length=0;
 const manager=createTileManager<RegionAsset>({tiles:manifest.tiles,projection,concurrency:2,maxWantedTiles:12,maxResidentBytes:24*1048576,budgetBytes:0,maxLeftoverTiles:0,estimateBytes:(record,level)=>(record.lods.find(lod=>lod.level===level)?.bytes??0)*8,initial,
  load:async(record,level,signal)=>bake(await payload.loadTile(record,level,signal)),
  attach:(record,level,asset)=>{attached.set(record.id,asset);root.add(asset.root);if(level===0){waiters.get(record.id)?.resolve(true);waiters.delete(record.id)}},
  detach:(record,_level,asset)=>{if(attached.get(record.id)===asset)attached.delete(record.id);asset.root.removeFromParent()},dispose:release,bytesOf:asset=>asset.bytes,
  onError:record=>{waiters.get(record.id)?.resolve(false);waiters.delete(record.id)},
 });
 const ensureNeighborhood=async(east:number,north:number)=>{
  const nearby=[...manifest.tiles].sort((first,second)=>Math.hypot(first.center[0]-east,first.center[1]-north)-Math.hypot(second.center[0]-east,second.center[1]-north)).slice(0,9);
  const ready=await Promise.all(nearby.map(record=>{
   focusPins.add(record.id);
   if(attached.get(record.id)?.level===0){manager.request(record.id,0,true);return Promise.resolve(true)}
   const waiting=waiters.get(record.id);if(waiting)return waiting.promise;
   let resolve!:(ready:boolean)=>void;const promise=new Promise<boolean>(done=>resolve=done);waiters.set(record.id,{promise,resolve});manager.request(record.id,0,true);return promise;
  }));return ready.every(Boolean);
 };
 const releaseFocusPins=()=>{for(const id of focusPins)manager.releaseRequest(id);focusPins.clear()};
 const surfaceAt=(east:number,north:number,ceiling=Infinity,roofs=false)=>{
  let height=0,water=false;
  for(const asset of attached.values())for(const triangle of asset.cells.get(cellKey(east,north))??[]){const offset=triangle*surfaceStride,values=asset.surfaces;if(!insideTriangle(east,north,values,offset))continue;const kind=values[offset+8],top=triangleHeight(east,north,values,offset);if(kind===2)water=true;else if((kind===0||roofs)&&top<=ceiling+.12)height=Math.max(height,top)}
  return {height,water:water&&height<.05};
 };
 const readyAt=(position:T.Vector3)=>{const local=flatAt(position),record=recordAt(local.east,local.north);return !record||attached.get(record.id)?.level===0};
 const collides=(position:T.Vector3,padding=.45,bodyHeight=1.8,requireLoaded=true)=>{
  const local=flatAt(position),elevation=(position.distanceTo(surface.center)-surface.radius)/city.scale;
  if(requireLoaded&&!readyAt(position))return true;
  const reach=padding/city.scale;
  for(const [east,north] of [[local.east,local.north],[local.east+reach,local.north],[local.east-reach,local.north],[local.east,local.north+reach],[local.east,local.north-reach]]){
  for(const asset of attached.values())for(const triangle of asset.cells.get(cellKey(east,north))??[]){const offset=triangle*surfaceStride,values=asset.surfaces;if(values[offset+8]!==1||!insideTriangle(east,north,values,offset))continue;if(elevation+bodyHeight>values[offset+6]+.03&&elevation<triangleHeight(east,north,values,offset)-.03)return true}
   if(bodyHeight>0&&surfaceAt(east,north).water)return true;
  }
  return false;
 };
 const landmarks=manifest.landmarks.map(record=>({name:record.label,description:describeHeight({heightM:record.heightM,heightSource:record.heightSource,landmark:record.label})??'Mapped OpenStreetMap place',kind:record.featureClass,position:toPlanet(record.local[0],record.local[1]),record}));
 const region:RegionControls={manifest,stats:()=>manager.stats(),readyAt,
  arrivalPosition(position,blocked=()=>false){
   const local=flatAt(position),padding=city.scale*.3;
   const clear=(east:number,north:number)=>{
    const floor=surfaceAt(east,north),candidate=toPlanet(east,north,floor.height+.025/city.scale);
    if(!readyAt(candidate)||collides(candidate,padding)||blocked(candidate))return null;
    return candidate;
   };
   const current=clear(local.east,local.north);if(current)return current;
   for(let radius=1;radius<=24;radius++)for(let sample=0;sample<16;sample++){
    const angle=sample*Math.PI/8,candidate=clear(local.east+Math.cos(angle)*radius/city.scale,local.north+Math.sin(angle)*radius/city.scale);
    if(candidate)return candidate;
   }
   return null;
  },
  select(ray){
   root.updateWorldMatrix(true,true);
   for(const hit of ray.intersectObject(root,true)){
    const mesh=hit.object as T.Mesh,asset=attached.get(mesh.userData.cityTile),ids=mesh.geometry?.getAttribute('_featureid');
    if(!asset||!ids||!hit.face)continue;
    const feature=asset.features[Math.round(ids.getX(hit.face.a))];if(feature)return feature;
   }
   return null;
  },
  update(delta,observer,active){
   if(disposed)return;clock+=delta;if(active===lastActive&&clock<.12)return;clock=0;lastActive=active;
   if(!active){manager.update({position:[0,-surface.radius*3,0],viewportHeight:1,fovY:1,maxDistance:-Infinity});return}
   const local=observer.position.clone().sub(surface.center);manager.update({position:local.toArray(),viewportHeight:900,fovY:.87,maxDistance:800});
  },
  projectGround(normal,target,lift=.025){
   const local=cityFlat(city,surface.radius,normal),floor=surfaceAt(local.east,local.north);return target.copy(normal).normalize().multiplyScalar(surface.radius+floor.height*city.scale+lift).add(surface.center);
  },
  sampleGround(position){
   if(!readyAt(position))return null;
   const local=flatAt(position),elevation=(position.distanceTo(surface.center)-surface.radius)/city.scale,floor=surfaceAt(local.east,local.north,elevation,true);
   if(floor.water)return null;const normal=position.clone().sub(surface.center).normalize();return {point:normal.clone().multiplyScalar(surface.radius+floor.height*city.scale).add(surface.center),normal};
  },
  cameraDistance(origin,heading,distance){
    cameraRay.set(origin,heading);
    for(const asset of attached.values())for(const canopy of asset.cameraCanopies){
     if(canopy.containsPoint(origin)){distance=Math.min(distance,.3);continue}
     if(cameraRay.intersectSphere(canopy,cameraHit))distance=Math.min(distance,Math.max(.3,origin.distanceTo(cameraHit)-.18));
    }
   const probe=new T.Vector3(),step=Math.max(.08,city.scale*.2);
   for(let travelled=step;travelled<=distance;travelled+=step){probe.copy(origin).addScaledVector(heading,travelled);if(probe.distanceTo(surface.center)<surface.radius+.03||collides(probe,.1,0,false))return Math.max(.3,travelled-step)}return distance;
  },
  async focus(id,player){
    const coordinate=typeof id==='string'?null:id;
    if(coordinate&&(!Number.isFinite(coordinate.east)||!Number.isFinite(coordinate.north)||coordinate.east<manifest.aoi.localBounds[0]||coordinate.east>manifest.aoi.localBounds[2]||coordinate.north<manifest.aoi.localBounds[1]||coordinate.north>manifest.aoi.localBounds[3]))return false;
    const destination=coordinate?{local:[coordinate.east,coordinate.north]}:manifest.landmarks.find(entry=>entry.id===id)??manifest.places.find(entry=>entry.id===id)??manifest.named.find(entry=>entry.id===id);if(!destination||disposed)return false;
    const epoch=++focusEpoch,start=player.position.clone();for(const waiting of waiters.values())waiting.resolve(false);waiters.clear();
  releaseFocusPins();
  try{
    let east=destination.local[0],north=destination.local[1];
    if(!await ensureNeighborhood(east,north)||disposed||epoch!==focusEpoch)return false;
    const feature=coordinate?undefined:[...attached.values()].flatMap(asset=>asset.features).find(entry=>entry.id===id);
    if(feature?.featureClass==='water'){east=feature.bbox[0]-10;north=(feature.bbox[1]+feature.bbox[3])/2;if(!await ensureNeighborhood(east,north))return false}
    if(disposed||epoch!==focusEpoch||player.position.distanceToSquared(start)>.04)return false;
    let arrival:T.Vector3|undefined,fallback:T.Vector3|undefined;
    for(let radius=0;radius<=180&&!arrival;radius+=6)for(let angle=0;angle<(radius?16:1);angle++){
     const candidateEast=east+Math.cos(angle*Math.PI/8)*radius,candidateNorth=north+Math.sin(angle*Math.PI/8)*radius,floor=surfaceAt(candidateEast,candidateNorth),candidate=toPlanet(candidateEast,candidateNorth,floor.height+.025/city.scale);
     if(!readyAt(candidate)||collides(candidate,city.scale*.3))continue;
    fallback??=candidate;if(coordinate||floor.height>=.05||feature?.featureClass==='park'){arrival=candidate;break}
    }
    arrival??=fallback;if(!arrival)return false;
    player.position.copy(arrival);player.up.copy(arrival).sub(surface.center).normalize();player.userData.surfaceFrame=new T.Quaternion().setFromUnitVectors(vertical,player.up);player.quaternion.copy(player.userData.surfaceFrame);return true;
    }finally{if(epoch===focusEpoch)releaseFocusPins()}
  },
    dispose(){if(disposed)return;disposed=true;focusEpoch++;for(const waiting of waiters.values())waiting.resolve(false);waiters.clear();releaseFocusPins();manager.dispose();for(const material of Object.values(materials))material.dispose();treeGeometry.dispose();treeMaterial.dispose();root.clear()},
 };
 return {root,region,landmarks,materials,trees:null,toPlanet,flatAt,blocked:collides,
  get triangles(){return manager.resident().reduce((sum,entry)=>sum+entry.asset.triangles,0)},get bakedTiles(){return manager.stats().resident},get bytes(){return manager.stats().bytes},get blockerCount(){return manager.resident().reduce((sum,entry)=>sum+entry.asset.surfaces.length/9,0)},
  nearest(position:T.Vector3){let nearest:typeof landmarks[number]|undefined,distance=14;for(const landmark of landmarks){const separation=position.distanceTo(landmark.position);if(separation<distance){nearest=landmark;distance=separation}}return nearest},edgeAngle:Math.PI,
 };
}
