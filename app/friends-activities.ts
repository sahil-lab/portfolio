import * as T from 'three';
import {createRaceCar,createRaceTrack,createShip} from './friends-scene';
import {createCourier} from './courier';
import {createWoodenSign} from './wooden-sign';
import {createReadableDisplay} from './readable-display';
import {disposeScene} from './scene-resources';
import {batchScenery} from './static-batching';
import {sampleWorldCourse} from '../lib/orbit-course';
import type {FriendsClient} from './friends-client';
import type {PlayView,RoomSnapshot} from '../lib/friends-protocol';
import {transitStops} from './transit-config';

export const friendsSites=[
 {id:'lobby',name:'Friends & Games',x:0,z:152,width:3,depth:1.5},
 {id:'chess',name:'Rapid Chess',x:-16,z:158,width:5,depth:5},
 {id:'sudoku',name:'Sudoku',x:16,z:158,width:4,depth:2},
 {id:'pong',name:'Table Tennis',x:-16,z:171,width:6,depth:9},
 {id:'targets',name:'Target Range',x:16,z:173,width:7,depth:3},
 {id:'computer',name:'Linux PC',x:-16,z:186,width:4,depth:2.5},
 {id:'race',name:'Orbital Circuit',x:16,z:190,width:7,depth:3},
 {id:'records',name:'Winners Podium',x:0,z:202,width:11,depth:4},
 {id:'ship',name:'Crew Starship',x:0,z:225,width:12,depth:14},
] as const;
export type FriendsActivityStatus={active:boolean;kind:'race'|'ship'|null;cabin:boolean;planet:number};
const idleStatus:FriendsActivityStatus={active:false,kind:null,cabin:false,planet:0};
export type FriendsActivities=ReturnType<typeof createFriendsActivities>;

export function worldRaceView(distance:number,lane:number,aspect:number){
 const pose=sampleWorldCourse(distance,lane),back=aspect<.8?17:14,height=aspect<.8?9:7;
 return {position:pose.position.clone().addScaledVector(pose.forward,-back).addScaledVector(pose.up,height),target:pose.position.clone().addScaledVector(pose.forward,3),up:pose.up};
}

function panelTexture(title:string,lines:string[],accent='#e6c774'){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const context=canvas.getContext('2d')!;
 context.fillStyle='#183b3d';context.fillRect(0,0,1024,512);context.strokeStyle=accent;context.lineWidth=5;context.strokeRect(16,16,992,480);
 context.fillStyle=accent;context.textAlign='center';context.font='500 60px "Space Grotesk", sans-serif';context.fillText(title,512,98,950);
 context.font='500 42px "Space Grotesk", sans-serif';context.fillStyle='#eff6e7';lines.slice(0,4).forEach((line,index)=>context.fillText(line,512,196+index*83,950));
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;return texture;
}
export function sharedShipPose(current:number,destination:number|null,progress:number){
 const berth=(index:number)=>index===0?new T.Vector3(0,5,225):new T.Vector3(transitStops[index].x+5,transitStops[index].y+10,transitStops[index].z+7);
 const start=berth(current);
 if(destination===null)return {position:start,rotation:new T.Quaternion()};
 const end=berth(destination),middle=start.clone().lerp(end,.5);middle.y+=start.distanceTo(end)*.45+130;
 const path=new T.QuadraticBezierCurve3(start,middle,end),amount=T.MathUtils.clamp(progress,0,1),position=path.getPoint(amount),forward=path.getTangent(amount);
 return {position,rotation:new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(position,position.clone().add(forward),new T.Vector3(0,1,0)))};
}
export function createFriendsActivities(scene:T.Scene,camera:T.PerspectiveCamera,player:T.Group,callbacks:{open:(view:PlayView)=>void;change:(status:FriendsActivityStatus)=>void;arrive:(planet:number)=>boolean;notice:(message:string)=>void}){
 const root=new T.Group();root.name='Friends_CurrentWorld';scene.add(root);
 const stations=new T.Group();stations.name='Friends_CommonsStations';root.add(stations);
 const materials=new Map<string,T.MeshStandardMaterial>();
 const material=(color:string)=>{let found=materials.get(color);if(!found){found=new T.MeshStandardMaterial({color,roughness:.55,metalness:.15});materials.set(color,found)}return found};
 const mint=material('#b4deca'),ink=material('#204448'),brass=material('#d7bb78'),cream=material('#e7eddd');
 function box(parent:T.Object3D,name:string,size:[number,number,number],position:[number,number,number],paint:T.Material){
  const mesh=new T.Mesh(new T.BoxGeometry(...size),paint);mesh.name=name;mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.cameraSolid=true;parent.add(mesh);return mesh;
 }
 const displays=new Map<PlayView,{group:T.Group;texture:T.Texture;title:string}>(),boards=new Map<PlayView,T.Group>();
 function board(parent:T.Group,view:PlayView,title:string,lines:string[],width=4,height=2){
  const texture=panelTexture(title,lines),group=new T.Group();group.name=`Friends_Display_${view}`;parent.add(group);createReadableDisplay(group,group.name,texture,width,height,.18,new T.Vector3(0,3.8,0));displays.set(view,{group,texture,title});
  return group;
 }
 for(const site of friendsSites){
  const group=new T.Group();group.name=`Friends_Station_${site.id}`;group.position.set(site.x,0,site.z);group.userData.friendsActivity=site.id;stations.add(group);boards.set(site.id,group);
  if(site.id==='ship')continue;
  box(group,'Friends_StationBase',[site.width+.8,.18,site.depth+.8],[0,.03,0],cream);
  const sign=createWoodenSign(site.name,{width:Math.max(3,Math.min(5.8,site.width)),height:1.35,shape:'arch'});sign.position.set(0,.12,site.depth/2+1.6);group.add(sign);
  if(site.id==='chess'){
   box(group,'Chess_Table',[4.8,.35,4.8],[0,1.8,0],ink);box(group,'Chess_TableStand',[1.1,1.8,1.1],[0,.9,0],brass);
   for(let row=0;row<8;row++)for(let column=0;column<8;column++)box(group,'Chess_Square',[.5,.04,.5],[(column-3.5)*.5,2,(row-3.5)*.5],(row+column)%2?ink:cream);
   for(const row of [0,1,6,7])for(let column=0;column<8;column++){
    const piece=new T.Mesh(new T.CylinderGeometry(row===1||row===6?.07:.13,.18,row===1||row===6?.28:.55,12),row<4?ink:cream);piece.position.set((column-3.5)*.5,2.18+(row===1||row===6?0:.13),(row-3.5)*.5);group.add(piece);
   }
  }else if(site.id==='pong'){
   box(group,'PingPong_Table',[5,.25,8],[0,1.5,0],material('#3d907b'));for(const side of [-1,1])box(group,'PingPong_WhiteEdge',[.05,.03,8],[side*2.42,1.64,0],cream);
   box(group,'PingPong_Net',[5,.6,.06],[0,1.95,0],cream);for(const side of [-1,1])box(group,'PingPong_Leg',[.25,1.5,6],[side*1.7,.75,0],ink);
   const ball=new T.Mesh(new T.SphereGeometry(.16,12,8),cream);ball.name='Friends_PongBall';ball.position.set(1,1.9,2);group.add(ball);
  }else if(site.id==='records'){
   for(const stand of [{place:2,x:-3,height:1.4},{place:1,x:0,height:2.2},{place:3,x:3,height:.85}]){
    box(group,`Friends_Podium_${stand.place}`,[2.8,stand.height,2.7],[stand.x,stand.height/2,0],stand.place===1?brass:cream);
   }
   const display=board(group,'records','ROOM RECORDS',['1  Unclaimed','2  Unclaimed','3  Unclaimed'],8,4);display.position.set(0,2.3,-2.3);
  }else if(site.id==='race'){
   const car=createRaceCar('comet');car.root.position.set(0,.18,0);car.root.rotation.y=Math.PI/2;group.add(car.root);
   const display=board(group,'race','ORBITAL CIRCUIT',['1 - 10 laps','Comet / Vector / Ion'],5,2.5);display.position.z=-2;
  }else if(site.id==='computer'){
   box(group,'Friends_ComputerDesk',[4,.22,2],[0,1.6,0],cream);box(group,'Friends_ComputerStand',[.4,1.8,.4],[0,.8,0],ink);
   box(group,'Friends_ComputerHousing',[3.1,2,.3],[0,3,0],brass);
   const display=board(group,'computer','LINUX PC',['Buildroot 6.8','128 MB / x86'],2.85,1.65);display.position.y=-.8;
   box(group,'Friends_Keyboard',[2.3,.08,.7],[0,1.8,.55],ink);
  }else if(site.id==='targets'){
   box(group,'Friends_RangeBacking',[7,4,.3],[0,3,0],ink);
   for(const side of [-1,0,1])for(const [radius,color] of [[.82,'#edc96c'],[.58,'#e27459'],[.32,'#edf1de']] as const){const target=new T.Mesh(new T.CircleGeometry(radius,32),material(color));target.position.set(side*2.1,3,.22+(1-radius)*.1);group.add(target)}
  }else{
   box(group,'Friends_ConsolePedestal',[site.width,2.1,site.depth],[0,1.05,0],ink);
   board(group,site.id,site.id==='sudoku'?'SUDOKU':'FRIENDS & GAMES',site.id==='sudoku'?['1 2 3 / 4 5 6 / 7 8 9','Shared puzzle races']:['Private rooms / 5 players','Games / Voice / Starship'],site.width+1,2);
  }
 }
 const dock=boards.get('ship')!;box(dock,'Friends_StarshipPad',[15,.25,17],[0,.04,0],ink);
 const dockSign=createWoodenSign('CREW STARSHIP',{width:6,height:1.8,shape:'arrow'});dockSign.position.set(-8,.2,7);dock.add(dockSign);
 const ship=createShip();ship.name='Friends_SharedStarship';ship.scale.setScalar(1.2);ship.userData.friendsActivity='ship';root.add(ship);
 const cabin=new T.Group();cabin.name='Friends_SharedCabin';root.add(cabin);
 box(cabin,'Crew_CabinDeck',[9,.3,14],[0,-.2,0],cream);
 for(const side of [-1,1]){box(cabin,'Crew_CabinWall',[.18,3.8,14],[side*4.4,1.65,0],mint);box(cabin,'Crew_Console',[2.2,1.1,1.5],[side*2.7,.6,-4.3],ink)}
 box(cabin,'Crew_WindscreenHeader',[9,.25,.3],[0,3.6,-6.9],brass);
 const racingRoot=new T.Group();racingRoot.name='Friends_Racers';root.add(racingRoot);
 const carVisuals=new Map<string,ReturnType<typeof createRaceCar>>(),crewVisuals=new Map<string,ReturnType<typeof createCourier>>(),winners=new T.Group();winners.name='Friends_PodiumWinners';boards.get('records')!.add(winners);
 for(const group of boards.values())batchScenery(group,{displays:Array.from(displays.values(),display=>display.group),winners,pongBall:boards.get('pong')?.getObjectByName('Friends_PongBall')});
 const track=createRaceTrack(sampleWorldCourse,12);root.add(track);
 let client:FriendsClient|null=null,unsubscribe:(()=>void)|null=null,room:RoomSnapshot|null=null,id='',status={...idleStatus},cabinView=false,enabled=true,leavingShip=false,endingId='',recordsKey='',matchId='';
 let returnPose:{position:T.Vector3;quaternion:T.Quaternion;up:T.Vector3;surfaceFrame:T.Quaternion|undefined;visible:boolean}|null=null;
 const observer=new T.Group();observer.name='Friends_ActivityObserver';const cameraPosition=new T.Vector3(),cameraTarget=new T.Vector3();let cameraFresh=true;
 function emit(next:FriendsActivityStatus){const changed=JSON.stringify(next)!==JSON.stringify(status);status=next;if(changed){cameraFresh=true;callbacks.change({...status})}}
 function remember(){if(returnPose)return;returnPose={position:player.position.clone(),quaternion:player.quaternion.clone(),up:player.up.clone(),surfaceFrame:player.userData.surfaceFrame?.clone(),visible:player.visible}}
 function restore(){if(!returnPose)return;player.position.copy(returnPose.position);player.quaternion.copy(returnPose.quaternion);player.up.copy(returnPose.up);if(returnPose.surfaceFrame)player.userData.surfaceFrame=returnPose.surfaceFrame;else delete player.userData.surfaceFrame;player.visible=returnPose.visible;returnPose=null}
 function setTexture(view:PlayView,lines:string[]){const display=displays.get(view);if(!display)return;const texture=panelTexture(display.title,lines);display.group.traverse(object=>{if(object instanceof T.Mesh&&object.material instanceof T.MeshBasicMaterial&&object.material.map===display.texture)object.material.map=texture});display.texture.dispose();display.texture=texture}
 function receive(){
  const state=client?.getState();room=state?.status==='connected'?state.room:null;id=state?.id??'';
    if(!room){leavingShip=false;if(status.active){restore();emit({...idleStatus})}return}
    if(!room.ship.crew.includes(id))leavingShip=false;
  if(room.match?.id!==matchId){matchId=room.match?.id??'';cameraFresh=true}
  const record=room.records[room.match?.kind??room.setup.kind],key=JSON.stringify(record);
    if(recordsKey!==key){
     recordsKey=key;setTexture('records',record.top.length?record.top.map((row,index)=>`${index+1}  ${row.name} / ${row.wins} wins`):['1  Unclaimed','2  Unclaimed','3  Unclaimed']);
     disposeScene(winners);winners.clear();
     for(const row of record.last?.podium??[]){const figure=createCourier(row.color);figure.root.name=`Winner_${row.place}_${row.name}`;figure.root.scale.setScalar(.6);figure.root.position.set(row.place===1?0:row.place===2?-3:3,row.place===1?2.2:row.place===2?1.4:.85,0);figure.update(0,0,true);winners.add(figure.root)}
    }
 }
 function near(){return friendsSites.find(site=>Math.abs(player.position.y-.8)<3&&Math.hypot(player.position.x-site.x,player.position.z-(site.z+site.depth/2+3.1))<4)}
 function finishRide(planet:number){restore();const arrived=callbacks.arrive(planet);emit({...idleStatus,planet});return arrived}
 function update(delta:number){
  const now=client?.serverNow()??Date.now(),match=room?.match;
  const racers=match?.kind==='race'?match.racers??[]:[];
  for(const [playerId,car] of carVisuals)if(!racers.some(racer=>racer.id===playerId)){car.root.removeFromParent();disposeScene(car.root);carVisuals.delete(playerId)}
  for(const racer of racers){
   let car=carVisuals.get(racer.id);if(!car){car=createRaceCar(racer.car,room?.players.find(player=>player.id===racer.id)?.color);car.root.name=`WorldRacer_${racer.id}`;car.root.scale.setScalar(1.25);racingRoot.add(car.root);carVisuals.set(racer.id,car)}
   const extrapolate=match?.phase==='running'&&racer.finishMs===null&&!racer.dnf?Math.min(.15,Math.max(0,(now-room!.serverTime)/1000))*racer.speed:0;
   const pose=sampleWorldCourse(racer.distance+extrapolate,racer.lane);car.root.position.copy(pose.position).addScaledVector(pose.up,-.5);car.root.quaternion.copy(pose.rotation);car.wheels.forEach(wheel=>wheel.rotateY(-racer.speed*delta));
  }
  const shared=room?.ship??{current:0,destination:null,startsAt:0,duration:12000,crew:[],captain:null},progress=shared.destination===null?0:(now-shared.startsAt)/shared.duration,shipPose=sharedShipPose(shared.current,shared.destination,progress);
  ship.position.copy(shipPose.position);ship.quaternion.copy(shipPose.rotation);cabin.position.copy(shipPose.position);cabin.quaternion.copy(shipPose.rotation);
    const boarding=shared.crew.includes(id)&&!leavingShip,localRacer=racers.find(racer=>racer.id===id),racing=!!localRacer&&!localRacer.dnf&&match?.phase!=='finished';
  for(const [crewId,visual] of crewVisuals)if(!shared.crew.includes(crewId)){visual.root.removeFromParent();disposeScene(visual.root);crewVisuals.delete(crewId)}
  shared.crew.forEach((crewId,index)=>{
   let visual=crewVisuals.get(crewId);if(!visual){visual=createCourier(room?.players.find(player=>player.id===crewId)?.color);visual.root.scale.setScalar(.6);cabin.add(visual.root);crewVisuals.set(crewId,visual)}
   visual.root.position.set(index%2?2.3:-2.3,.2,.5+Math.floor(index/2)*1.8);visual.root.rotation.y=Math.PI;visual.update(delta,0);
  });
  cabin.visible=boarding&&cabinView;ship.visible=!cabin.visible;
  ship.traverse(object=>{if(object.name==='Ship_Thruster')object.visible=shared.destination!==null});
  if(enabled&&racing){
    const distance=localRacer.distance+(match?.phase==='running'&&localRacer.finishMs===null?Math.min(.15,Math.max(0,(now-room!.serverTime)/1000))*localRacer.speed:0);
    remember();const pose=sampleWorldCourse(distance,localRacer.lane),view=worldRaceView(distance,localRacer.lane,camera.aspect);observer.position.copy(pose.position);observer.quaternion.copy(pose.rotation);player.position.copy(observer.position);player.visible=false;
    cameraPosition.copy(view.position);cameraTarget.copy(view.target);camera.up.copy(view.up);emit({active:true,kind:'race',cabin:false,planet:0});
  }else if(enabled&&boarding){
   remember();observer.position.copy(shipPose.position);observer.quaternion.copy(shipPose.rotation);player.position.copy(observer.position);player.visible=false;
   const offset=cabinView?new T.Vector3(0,2.5,5.8):new T.Vector3(15,10,24),look=cabinView?new T.Vector3(0,2,-25):new T.Vector3(0,1,0);
   cameraPosition.copy(shipPose.position).add(offset.applyQuaternion(shipPose.rotation));cameraTarget.copy(shipPose.position).add(look.applyQuaternion(shipPose.rotation));camera.up.set(0,1,0);emit({active:true,kind:'ship',cabin:cabinView,planet:shared.current});
  }else if(status.active){
   const wasShip=status.kind==='ship';restore();
   if(wasShip&&room&&shared.destination===null)callbacks.arrive(shared.current);
   if(!wasShip&&match?.phase==='finished'&&match.id!==endingId){endingId=match.id;callbacks.arrive(0);player.position.set(0,.8,211);callbacks.open('records')}
   emit({...idleStatus,planet:shared.current});
  }
  const ping=boards.get('pong')?.getObjectByName('Friends_PongBall');if(ping&&match?.kind==='pong'){ping.position.set((match.ball?.[1]??0)*.34,1.86,(match.ball?.[0]??0)*.32)}
  return status.active;
 }
 return {
  root,stations,ship,cabin,observer,carVisuals,crewVisuals,
  get track(){return track},get status(){return status},get active(){return status.active},get room(){return room},
  attach(value:FriendsClient|null){unsubscribe?.();client=value;unsubscribe=client?.subscribe(receive)??null;receive()},
  setEnabled(value:boolean){enabled=value},
  cabinView(value:boolean){cabinView=value;cameraFresh=true},
  open(view:PlayView){callbacks.open(view)},
  prompt(){const site=near();return site?`E \u00b7 ${site.name}`:null},
  interact(){const site=near();if(!site)return false;callbacks.open(site.id);return true},
  select(ray:T.Raycaster){for(const hit of ray.intersectObjects([stations,ship],true)){let object:T.Object3D|null=hit.object;while(object&&object!==root){if(object.userData.friendsActivity){callbacks.open(object.userData.friendsActivity);return true}object=object.parent}}return false},
  visit(view:PlayView){
   if(status.active){callbacks.open(view);return true}
    if(view==='ship'&&room&&room.ship.current>0)return callbacks.arrive(room.ship.current);
   const site=friendsSites.find(site=>site.id===view);if(!site||!callbacks.arrive(0))return false;
   player.position.set(site.x,.8,site.z+site.depth/2+3.1);return true;
  },
  blocked(x:number,z:number,y:number){return y>=-.5&&y<5&&friendsSites.some(site=>site.id!=='ship'&&Math.abs(x-site.x)<site.width/2+.5&&Math.abs(z-site.z)<site.depth/2+.5)},
  update,
  camera(delta:number){if(!status.active)return false;const scale=scene.scale.x,target=cameraPosition.clone().multiplyScalar(scale);if(cameraFresh||status.kind==='race'){camera.position.copy(target);cameraFresh=false}else camera.position.lerp(target,1-Math.exp(-delta*12));camera.lookAt(cameraTarget.clone().multiplyScalar(scale));return true},
    disembark(){if(!room||!room.ship.crew.includes(id)||room.ship.destination!==null)return false;leavingShip=true;client?.send({type:'ship-leave'});return finishRide(room.ship.current)},
  stop(){restore();enabled=false;emit({...idleStatus})},
  dispose(){unsubscribe?.();restore();root.removeFromParent();disposeScene(root)},
 };
}
