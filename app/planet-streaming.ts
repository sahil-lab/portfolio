import * as T from 'three';
import {planetPoint,type PlanetSurface} from './planet-geography';
import {planetStyles} from './transit-config';
import {createPlanetRotation} from './planet-rotation';
import {createWorkScheduler,type WorkScheduler} from './work-scheduler';
import {disposeScene} from './scene-resources';
import {finishKingdomMaterials} from './kingdom-art';
import type {createPlanetLandscape,buildPlanetLandscape} from './planet-surface';
import type {ForgeSnapshot} from './forge-feed';

type Landscape=ReturnType<typeof createPlanetLandscape>;
type Builder=typeof buildPlanetLandscape;
export type PlanetLoadState='unloaded'|'loading'|'loaded'|'active'|'sleeping'|'failed';
function createOrbitalProxy(surface:PlanetSurface){
 const geometry=new T.SphereGeometry(1,40,28),position=geometry.attributes.position,colors=new Float32Array(position.count*3),normal=new T.Vector3(),point=new T.Vector3(),land=new T.Color(planetStyles[surface.stop.id]?.land??surface.stop.color),patch=land.clone().multiplyScalar(.72),color=new T.Color();
 for(let index=0;index<position.count;index++){normal.fromBufferAttribute(position,index).normalize();planetPoint(surface,normal,point).sub(surface.center);position.setXYZ(index,point.x,point.y,point.z);color.copy(land).lerp(patch,(Math.sin(normal.x*9+normal.z*3)*Math.cos(normal.y*12-normal.x*4)+1)*.22).toArray(colors,index*3)}
 geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.computeVertexNormals();const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));mesh.name='Planet_StreamingSilhouette';mesh.position.copy(surface.center);return mesh;
}
export function createStreamedPlanet(parent:T.Object3D,surface:PlanetSurface,scheduler:WorkScheduler,options:{factory?:()=>Promise<Builder>;now?:()=>number;prepare?:(root:T.Object3D)=>Promise<void>}={}){
 const root=new T.Group();root.name='Globe_'+surface.stop.id;parent.add(root);const proxy=createOrbitalProxy(surface);root.add(proxy);
 const rotation=createPlanetRotation(root,surface.center),now=options.now??(()=>performance.now());let value:Landscape|null=null,pending:Promise<boolean>|null=null,state:PlanetLoadState='unloaded',generation=0,disposed=false,lastUse=0,repositoryData:ForgeSnapshot|undefined,realmState:number|null=null;
 function unload(){
    generation++;rotation.reset();if(value){realmState=value.realm?.demo.snapshot?.index??realmState;disposeScene(value.root);value.root.removeFromParent();value.root.clear();value=null}root.userData.boundsVersion=(root.userData.boundsVersion??0)+1;proxy.visible=true;state='unloaded';
 }
 async function load(priority=1):Promise<boolean>{
  if(disposed)return false;if(value){lastUse=now();return true}if(pending)return pending;
   const token=++generation,staging=new T.Group();state='loading';lastUse=now();
  pending=(async()=>{
   try{
   const factory=await (options.factory??(async()=>{const landscapeModule=await import('./planet-surface');return landscapeModule.buildPlanetLandscape}))();
    const builder=factory(staging,surface);let result:IteratorResult<string,Landscape>;
    do{if(disposed||token!==generation){builder.return(undefined as never);return false}result=await scheduler.run(()=>builder.next(),priority)}while(!result.done);
    if(disposed||token!==generation)return false;
    const landscape=result.value;finishKingdomMaterials(landscape.root);
    if(options.prepare)await options.prepare(landscape.root);if(disposed||token!==generation)return false;
    let world:T.Object3D=root;while(world.parent)world=world.parent;world.updateMatrix();
    landscape.root.traverse(object=>{for(const bound of object.userData.staticCameraBounds??[])bound.applyMatrix4(world.matrix)});
    root.add(landscape.root);landscape.root.name='Planet_LoadedDetail_'+surface.stop.id;value=landscape;proxy.visible=false;lastUse=now();state='loaded';root.userData.boundsVersion=(root.userData.boundsVersion??0)+1;
    if(repositoryData)value.civilization?.setRepositories(repositoryData);if(realmState!==null)value.realm?.restore(realmState);return true;
   }catch{if(!disposed&&token===generation)state='failed';return false}
   finally{disposeScene(staging);staging.clear();pending=null}
  })();return pending;
 }
 return {root,rotation,proxy,load,unload,get loaded(){return value!==null},get state(){return state},get lastUse(){return lastUse},get pending(){return pending},
   get globe(){return value?.globe??proxy},get infrastructure(){return value?.infrastructure},get publicSpaces(){return value?.publicSpaces},get population(){return value?.population},get civilization(){return value?.civilization},get realm(){return value?.realm},get vegetation(){return value?.vegetation},get outposts(){return value?.outposts??[]},get details(){return value?.details},get distant(){return value?.distant??proxy},
  setRepositories(snapshot:ForgeSnapshot){repositoryData=snapshot;value?.civilization?.setRepositories(snapshot)},
  update(delta:number,reduced:boolean,observer:T.Group,active=false){
  const observed=!!root.userData.observed,wasActive=state==='active'||state==='loaded';
   if(active||observed){lastUse=now();if(!value&&state!=='failed')void load(0);state=value?'active':state}
   else if(value)state='sleeping';
  if(value&&(active||observed||wasActive)){value.root.userData.observed=observed;value.update(delta,reduced,observer,active);value.root.visible=active||observed;proxy.visible=!value.root.visible}
  },
  blocked:(position:T.Vector3,padding=.45)=>value?value.blocked(position,padding):true,
  nearest:(position:T.Vector3)=>value?.nearest(position),
  dispose(){if(disposed)return;disposed=true;unload();disposeScene(proxy);root.removeFromParent()},
 };
}
export function createPlanetStreamer(parent:T.Object3D,surfaces:(PlanetSurface|null)[],options:{maxResident?:number;retireAfterMs?:number;now?:()=>number;factory?:()=>Promise<Builder>;prepare?:(root:T.Object3D)=>Promise<void>}={}){
 const scheduler=createWorkScheduler(),now=options.now??(()=>performance.now()),landscapes=surfaces.map(surface=>surface?createStreamedPlanet(parent,surface,scheduler,options):null);let lastSweep=-Infinity;
 const maxResident=options.maxResident??2,retireAfter=options.retireAfterMs??15000;
 function trim(keep:Set<number>){
  const residents=landscapes.flatMap((landscape,index)=>landscape?.loaded?[{landscape,index}]:[]).sort((first,second)=>first.landscape.lastUse-second.landscape.lastUse);let count=residents.length;
  for(const {landscape,index} of residents)if(!keep.has(index)&&(count>maxResident||now()-landscape.lastUse>retireAfter)){landscape.unload();count--}
   landscapes.forEach((landscape,index)=>{if(landscape?.state==='loading'&&!keep.has(index)&&now()-landscape.lastUse>1000)landscape.unload()});
 }
 return {landscapes,ready:(index:number)=>!index||!!landscapes[index]?.loaded,
  load:(index:number)=>index?landscapes[index]?.load(0)??Promise.resolve(false):Promise.resolve(true),prefetch:(index:number)=>{if(index&&landscapes[index]?.state!=='failed')void landscapes[index]?.load(1)},
  update(delta:number,reduced:boolean,observer:T.Group,current:number|null,destination:number|null=null){
   const keep=new Set<number>();if(current)keep.add(current);if(destination)keep.add(destination);
   landscapes.forEach((landscape,index)=>{if(!landscape)return;if(landscape.root.userData.observed)keep.add(index);landscape.update(delta,reduced,observer,current===index)});
   if(destination)void landscapes[destination]?.load(0);
   if(now()-lastSweep>500){lastSweep=now();let nearest=0,distance=160;surfaces.forEach((surface,index)=>{if(!surface)return;const separation=observer.position.distanceTo(surface.center)-surface.radius;if(separation<distance){nearest=index;distance=separation}});if(nearest){keep.add(nearest);void landscapes[nearest]?.load(1)}trim(keep)}
  },
  trim:(keep:number[]=[])=>trim(new Set(keep)),
  snapshot:()=>({resident:landscapes.filter(planet=>planet?.loaded).length,pending:scheduler.pending,zones:landscapes.flatMap(planet=>planet?[{id:planet.root.name,state:planet.state}]:[])}),
  dispose(){scheduler.dispose();landscapes.forEach(planet=>planet?.dispose())},
 };
}
