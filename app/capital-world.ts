import * as T from 'three';
import {createCivicKit} from './civic-kit';
import {createCapitalFountain} from './capital-fountain';
import {batchScenery} from './static-batching';
import {planWalkingRoute} from './walking-route';
import {rampHeight,type Ramp} from './traversal';
import {cityEverydaySites,everydayFootprint} from './everyday-places';

export const capitalSite={x:52,z:180,radius:27};
export const capitalArrival={x:52,y:.8,z:201};
export const capitalCameraView=(aspect:number)=>({yaw:0,pitch:.22,zoom:Math.max(66,Math.min(110,32/aspect)),focusHeight:12.5});
export const capitalLookout={x:75,z:178,width:12,depth:14,level:6.2};
export const capitalStair:Ramp={id:'capital-lookout',x:75,width:2.2,startZ:207,endZ:185,bottom:.8,top:6.2,steps:30};
export const capitalProjects=['MultiAgentOPENAI','Multi-Agent Iterative AI System','Replico AI','NearNest','3DCodePad','Data Lineage Catalog'];
export type CapitalDestination='plaza'|'lookout'|'project-garden'|'waterfront';

export function createCapitalWorld(scene:T.Scene,player:T.Group,callbacks:{blocked:(x:number,z:number)=>boolean;notice:(message:string)=>void;portfolio:(page:number)=>void;cue:()=>void}){
 const root=new T.Group();root.name='Sahil_DigitalCapital';scene.add(root);const fixed=new T.Group();fixed.name='Capital_StaticStreetscape';root.add(fixed);
 const kit=createCivicKit(),materials=kit.materials;
 const plaza=new T.Group();plaza.name='Sahil_CentralPlaza';plaza.position.set(capitalSite.x,0,capitalSite.z);fixed.add(plaza);
 const base=new T.Mesh(new T.CylinderGeometry(27,27,.16,96),materials.paving);base.name='Capital_RadialPaving';base.position.y=-.04;plaza.add(base);
 const tiles=new T.InstancedMesh(new T.BoxGeometry(.7,.022,2.2),materials.stone,180),dummy=new T.Object3D();tiles.name='Capital_PavingInlay';
 for(let index=0;index<180;index++){const ring=Math.floor(index/60),angle=index%60*Math.PI/30;dummy.position.set(Math.sin(angle)*(12+ring*5),.055,Math.cos(angle)*(12+ring*5));dummy.rotation.set(0,angle+.5,0);dummy.updateMatrix();tiles.setMatrixAt(index,dummy.matrix)}tiles.computeBoundingSphere();plaza.add(tiles);
 for(const radius of [8.8,16.8,24.5]){const inlay=new T.Mesh(new T.TorusGeometry(radius,.035,5,96),materials.brass);inlay.name='Capital_CircuitPavingRing';inlay.rotation.x=Math.PI/2;inlay.position.y=.075;plaza.add(inlay)}
 const fountain=createCapitalFountain('royal');fountain.root.position.set(capitalSite.x,0,capitalSite.z);root.add(fountain.root);
 kit.plaque(fixed,'SAHIL UPADHYAY','Senior Engineering Lead / Full-Stack & AI',52,6.8,163,16);
 for(const side of [-1,1]){
  kit.box(fixed,'Capital_NamePylon',new T.Vector3(52+side*7.8,3.05,163),[.5,6.1,.65],materials.stone,true);
  kit.beam(fixed,'Capital_PylonInlay',new T.Vector3(52+side*7.8,.2,163.36),new T.Vector3(52+side*7.8,6.6,163.36),materials.brass,.045);
 }
 const plaquePositions=[{x:43,z:198,page:0,title:'THE BUILDER',subtitle:'Java / React / TypeScript / AI'},{x:61,z:198,page:2,title:'SELECTED WORK',subtitle:'Agents / Platforms / Interactive Tools'}];
 for(const info of plaquePositions){kit.plaque(fixed,info.title,info.subtitle,info.x,2.1,info.z,4.4);kit.box(fixed,'Capital_InformationStand',new T.Vector3(info.x,.85,info.z),[.3,1.7,.4],materials.ink,true)}
 for(const [index,angle] of [0,.65,1.3,2.1,2.7,3.8,4.5,5.15,5.8].entries()){
    const originalX=52+Math.sin(angle)*23,z=180+Math.cos(angle)*23,x=Math.abs(originalX-52)<4&&z>196?originalX-7:originalX;
  if(x>67&&z<190)continue;
  kit.tree(fixed,x,z,index%3===0?'blossom':index%3===1?'shade':'column',index);
  if(index%2===0)kit.flowers(fixed,x, z+2.1,3.2,1.1,index);
 }
 for(const [x,z,yaw] of [[40,183,Math.PI/2],[64,183,-Math.PI/2],[46,191,0],[58,191,0],[42,166,Math.PI],[62,166,Math.PI]])kit.bench(fixed,x,z,yaw);
 for(const [index,angle] of [0,.8,1.7,2.6,3.7,4.7,5.6].entries()){
  const originalX=52+Math.sin(angle)*25,z=180+Math.cos(angle)*25,x=Math.abs(originalX-52)<4&&z>196?originalX+6:originalX;
  kit.lamp(fixed,x,x<36&&Math.abs(z-180)<3?z+5:z,index%2?'plaza':'park',-angle);
 }
 kit.utilities(fixed,35,198);kit.utilities(fixed,66,162);
 const projectGarden=new T.Group();projectGarden.name='Capital_ProjectGarden';fixed.add(projectGarden);
 capitalProjects.forEach((name,index)=>{
  const x=33+(index%3)*6,z=152+Math.floor(index/3)*4;
  kit.flowers(projectGarden,x,z,4.5,1.35,index);kit.plaque(projectGarden,name,index<3?'AI / Engineering':'Tools / Data / Experience',x,1.15,z+1.1,4.1);
 });
 const canalCurve=new T.CatmullRomCurve3(Array.from({length:21},(_,index)=>{const angle=Math.PI*.66+index/20*Math.PI*.68;return new T.Vector3(52+Math.cos(angle)*24,.06,180+Math.sin(angle)*24)}));
 const canal=new T.Mesh(new T.TubeGeometry(canalCurve,96,1.35,4,false),new T.MeshPhysicalMaterial({color:'#65aeb7',roughness:.2,metalness:.24,clearcoat:.75,transparent:true,opacity:.86}));canal.name='Capital_CircuitCanal';canal.scale.y=.14;root.add(canal);
 for(const offset of [-1.48,1.48]){
  const path=canalCurve.getPoints(96).map(point=>point.clone().add(new T.Vector3(offset,.12,0)));const coping=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(path),96,.095,6,false),materials.stone);coping.name='Capital_CanalCoping';fixed.add(coping);
 }
 const bridge=new T.Group();bridge.name='Capital_CanalFootbridge';fixed.add(bridge);
 for(let step=0;step<28;step++){const x=23.5+(step+.5)/28*11.5,height=.18+Math.sin((step+.5)/28*Math.PI)*.55;kit.box(bridge,'Capital_BridgeTimber',new T.Vector3(x,height,180),[11.5/28+.015,.12,3.2],materials.wood)}
 for(const side of [-1,1]){
  const points=Array.from({length:25},(_,index)=>new T.Vector3(23.5+index/24*11.5,1.2+Math.sin(index/24*Math.PI)*.55,180+side*1.6));const rail=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),28,.05,6,false),materials.brass);rail.name='Capital_ArchedBridgeRail';bridge.add(rail);
  for(let post=0;post<8;post++){const x=23.5+post/7*11.5,height=Math.sin(post/7*Math.PI)*.55;kit.beam(bridge,'Capital_BridgeBaluster',new T.Vector3(x,.2+height,180+side*1.6),new T.Vector3(x,1.2+height,180+side*1.6),materials.ink,.033)}
 }
 const packets=new T.InstancedMesh(new T.BoxGeometry(.38,.22,.56),materials.warm,6);packets.name='Capital_CanalDataFerries';packets.instanceMatrix.setUsage(T.DynamicDrawUsage);packets.frustumCulled=false;root.add(packets);
 const lookout=capitalLookout,stair=capitalStair;
 kit.box(fixed,'Capital_ObservationDeck',new T.Vector3(lookout.x,lookout.level-.2,lookout.z),[lookout.width,.3,lookout.depth],materials.wood);
 for(const side of [-1,1])for(const end of [-1,1])kit.box(fixed,'Capital_ObservationPier',new T.Vector3(lookout.x+side*5,2.9,lookout.z+end*6),[.42,5.8,.42],materials.stone,true);
 for(let step=0;step<stair.steps;step++){const progress=(step+1)/stair.steps,z=T.MathUtils.lerp(stair.startZ,stair.endZ,(step+.5)/stair.steps),height=T.MathUtils.lerp(stair.bottom,stair.top,progress);kit.box(fixed,'Capital_ClimbableStep',new T.Vector3(stair.x,height-.14,z),[stair.width,.18,(stair.startZ-stair.endZ)/stair.steps+.025],materials.stone)}
 for(const side of [-1,1])kit.beam(fixed,'Capital_LookoutStairRail',new T.Vector3(stair.x+side*1.1,1.8,stair.startZ),new T.Vector3(stair.x+side*1.1,stair.top+1,stair.endZ),materials.brass,.045);
 for(const side of [-1,1])for(let post=0;post<=8;post++)kit.beam(fixed,'Capital_LookoutGuard',new T.Vector3(lookout.x+side*5.9,lookout.level,lookout.z-6.8+post*1.7),new T.Vector3(lookout.x+side*5.9,lookout.level+1,lookout.z-6.8+post*1.7),materials.ink,.033);
 kit.plaque(fixed,'THE LONG VIEW','Sahil\'s Living Computer Kingdom',lookout.x,lookout.level+1.65,lookout.z-5.4,7.8);
 const telescope=new T.Group();telescope.name='Capital_VisitorTelescope';telescope.position.set(lookout.x,lookout.level,lookout.z);root.add(telescope);
 const barrel=new T.Mesh(new T.CylinderGeometry(.16,.27,1.6,12),materials.ink);barrel.position.set(0,1.7,0);barrel.rotation.x=.9;telescope.add(barrel);for(const side of [-1,0,1])kit.beam(telescope,'Capital_TelescopeTripod',new T.Vector3(0,1.1,0),new T.Vector3(side*.55,0,side===0?.6:-.3),materials.brass,.045);
 const routes:{name:string;points:{x:number;z:number}[]}[]=[];
 const canalPoints=canalCurve.getPoints(64),lampProbe=new T.Vector3(),pathProbe=new T.Vector3(),routeLine=new T.Line3();
 const canalBounds=new T.Box3().setFromPoints(canalPoints).expandByScalar(1.3),solidCells=new Map<string,T.Box3[]>();let indexedSolids=0;
 function blocked(x:number,z:number,y:number){
  while(indexedSolids<kit.solids.length){
   const bound=kit.solids[indexedSolids++];
   for(let column=Math.floor((bound.min.x-.35)/12);column<=Math.floor((bound.max.x+.35)/12);column++)for(let row=Math.floor((bound.min.z-.35)/12);row<=Math.floor((bound.max.z+.35)/12);row++){
    const key=column+','+row,bucket=solidCells.get(key);if(bucket)bucket.push(bound);else solidCells.set(key,[bound]);
   }
  }
  return fountain.blocked(x-52,z-180,y)||!!solidCells.get(Math.floor(x/12)+','+Math.floor(z/12))?.some(bound=>y<bound.max.y&&y>bound.min.y-.2&&x>bound.min.x-.35&&x<bound.max.x+.35&&z>bound.min.z-.35&&z<bound.max.z+.35)||y<.9&&x>canalBounds.min.x&&x<canalBounds.max.x&&z>canalBounds.min.z&&z<canalBounds.max.z&&!(x>=23&&x<=36&&Math.abs(z-180)<1.8)&&canalPoints.some(point=>Math.hypot(x-point.x,z-point.z)<1.3);
 }
 const forbidden=(x:number,z:number)=>callbacks.blocked(x,z)||blocked(x,z,.8);
 for(const id of ['willow-park','play-garden','lantern-mall','weekend-market','public-library']){
  const site=cityEverydaySites.find(site=>site.id===id)!,footprint=everydayFootprint(site.kind),goal={x:site.x,z:site.z+footprint.depth/2-2.6};
  const forecourt={x:site.x,z:site.z+footprint.depth/2+2},promenade=planWalkingRoute({x:52,z:209},forecourt,(x,z)=>forbidden(x,z)||[[1.5,0],[-1.5,0],[0,1.5],[0,-1.5]].some(([horizontal,vertical])=>forbidden(x+horizontal,z+vertical))),entrance=planWalkingRoute(forecourt,goal,forbidden);
  if(promenade.length<2||entrance.length<2)continue;const path=[...promenade,...entrance.slice(1)];routes.push({name:site.name,points:path});
  for(let index=1;index<path.length;index++){
   const start=path[index-1],end=path[index],length=Math.hypot(end.x-start.x,end.z-start.z),walk=kit.box(fixed,'Capital_ConnectedPromenade',new T.Vector3((start.x+end.x)/2,.043,(start.z+end.z)/2),[index<promenade.length?3:1.5,.025,length+.05],materials.stone);walk.rotation.y=Math.atan2(end.x-start.x,end.z-start.z);
  if(index%3===0&&length>5){
   lampProbe.set((start.x+end.x)/2+(end.z-start.z)/length*2.5,.8,(start.z+end.z)/2-(end.x-start.x)/length*2.5);
   const crossesPath=routes.some(route=>route.points.some((point,pointIndex)=>{if(!pointIndex)return false;const previous=route.points[pointIndex-1];routeLine.start.set(previous.x,.8,previous.z);routeLine.end.set(point.x,.8,point.z);return routeLine.closestPointToPoint(lampProbe,true,pathProbe).distanceToSquared(lampProbe)<4}));
   if(!crossesPath&&!forbidden(lampProbe.x,lampProbe.z))kit.lamp(fixed,lampProbe.x,lampProbe.z,'street');
  }
  }
 }
 for(const [x,z,yaw] of [[52,229,0],[100,294,Math.PI/2],[-100,250,Math.PI/2]]){
  for(let stripe=0;stripe<8;stripe++){const crossing=kit.box(fixed,'Capital_RaisedCrosswalk',new T.Vector3(x+(stripe-3.5)*.8,.09,z),[.4,.06,10],materials.stone);crossing.rotation.y=yaw}
  for(const side of [-1,1]){const signal=kit.box(fixed,'Capital_TrafficSignal',new T.Vector3(x+side*5.8,2.8,z+3.5),[.28,.9,.25],materials.ink);kit.box(fixed,'Capital_TrafficSignalLamp',signal.position.clone().add(new T.Vector3(0,-.2,.14)),[.16,.16,.03],materials.leaf)}
 }
 batchScenery(fixed,{});
 root.userData.staticCameraBounds=kit.solids.map(bound=>bound.clone());
 let clock=0,night=0,wet=0;
 function height(x:number,z:number,previous:number){
  const stairY=rampHeight(stair,x,z);if(stairY!==null&&Math.abs(previous-stairY)<.6)return stairY;
  if(Math.abs(x-lookout.x)<lookout.width/2-.2&&Math.abs(z-lookout.z)<lookout.depth/2-.2&&Math.abs(previous-lookout.level)<.6)return lookout.level;
  if(x>=23.5&&x<=35&&Math.abs(z-180)<1.38){const bridgeY=.8+Math.sin((x-23.5)/11.5*Math.PI)*.55;if(Math.abs(previous-bridgeY)<.7)return bridgeY}
  return null;
 }
 function nearest(){
  for(const info of plaquePositions)if(Math.hypot(player.position.x-info.x,player.position.z-info.z)<3.5&&player.position.y<3)return {message:info.title,page:info.page};
  if(Math.hypot(player.position.x-41,player.position.z-155)<11&&player.position.y<3)return {message:'Project Garden',page:2};
  if(Math.hypot(player.position.x-lookout.x,player.position.z-lookout.z)<3&&Math.abs(player.position.y-lookout.level)<.7)return {message:'Look through the telescope',page:-1};
  if(Math.hypot(player.position.x-52,player.position.z-180)<11&&player.position.y<3)return {message:'Royal Digital Fountain',page:-2};
  return null;
 }
 return {
  root,fountain,routes,plaquePositions,lookout,stair,
  destination:(kind:CapitalDestination)=>kind==='lookout'?{x:75,y:.8,z:208}:kind==='project-garden'?{x:41,y:.8,z:159}:kind==='waterfront'?{x:24,y:.8,z:185}:capitalArrival,
  height,
  blocked,
  prompt:()=>{const place=nearest();return place?`E \u00b7 ${place.message}`:null},
  interact:()=>{const place=nearest();if(!place)return false;callbacks.cue();if(place.page>=0)callbacks.portfolio(place.page);else callbacks.notice(place.page===-1?'The Forge, the Citadel, and a city full of small ideas.':'The fountain answers with a gentle crown of water.');return true},
  update:(delta:number,reduced:boolean,environment:{night:number;wet:number;wind:number},active:boolean)=>{
   if(!reduced)clock+=Math.max(0,Math.min(delta,.1));night=T.MathUtils.damp(night,environment.night,2,Math.max(0,delta));wet=T.MathUtils.damp(wet,environment.wet,1,Math.max(0,delta));kit.lighting(night,wet);
   if(!active)return;const proximity=Math.max(0,1-Math.hypot(player.position.x-52,player.position.z-180)/18);fountain.update(delta,reduced,proximity,night,wet,environment.wind);
   for(let index=0;index<6;index++){const progress=reduced?index/6:(clock*.025+index/6)%1,point=canalCurve.getPointAt(progress),next=canalCurve.getTangentAt(progress);dummy.position.copy(point).setY(.22);dummy.rotation.set(0,Math.atan2(next.x,next.z),0);dummy.scale.set(1,1,1);dummy.updateMatrix();packets.setMatrixAt(index,dummy.matrix)}packets.instanceMatrix.needsUpdate=true;
  },
 };
}
