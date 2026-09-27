import * as T from 'three';
import {createCourier} from './courier';
import {disposeScene} from './scene-resources';
import type {FriendsClient} from './friends-client';
import type {Friend,Pose} from '../lib/friends-protocol';

function nameplate(name:string,color:string){
 if(typeof document==='undefined')return new T.Group();
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
 const context=canvas.getContext('2d')!;context.fillStyle='#11282de0';context.fillRect(0,0,512,96);
 context.fillStyle=color;context.fillRect(0,88,512,8);context.fillStyle='#ffffff';context.textAlign='center';context.textBaseline='middle';context.font='500 36px "Space Grotesk", sans-serif';context.fillText(name,256,44,480);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:true}));sprite.scale.set(3.4,.64,1);sprite.position.y=3.3;return sprite;
}
export function createFriendsWorld(scene:T.Scene,local:ReturnType<typeof createCourier>){
 const root=new T.Group();root.name='Friends_Presence';scene.add(root);
 const avatars=new Map<string,{courier:ReturnType<typeof createCourier>;friend:Friend;position:T.Vector3;rotation:T.Quaternion;label:T.Object3D}>();
 let client:FriendsClient|null=null,unsubscribe:(()=>void)|null=null,clock=0,active=false;
 function remove(id:string){const avatar=avatars.get(id);if(avatar){root.remove(avatar.courier.root);disposeScene(avatar.courier.root);avatars.delete(id)}}
 function receive(){
  const state=client?.getState(),connected=state?.status==='connected';
  const self=connected?state.room?.players.find(player=>player.id===state.id):null;
  local.setColor(self?.color??'#769fc5');
  const peers=connected?state.room?.players.filter(player=>player.id!==state.id&&player.connected)??[]:[];
  for(const id of avatars.keys())if(!peers.some(peer=>peer.id===id))remove(id);
  for(const friend of peers){
   let avatar=avatars.get(friend.id);
   if(!avatar){
    const courier=createCourier(friend.color);courier.root.name=`Friend_${friend.id}`;courier.root.position.fromArray(friend.pose.position);courier.root.quaternion.fromArray(friend.pose.quaternion);root.add(courier.root);
    const label=nameplate(friend.name,friend.color);courier.root.add(label);
    avatar={courier,friend,position:new T.Vector3(),rotation:new T.Quaternion(),label};avatars.set(friend.id,avatar);
   }
   if(avatar.friend.name!==friend.name||avatar.friend.color!==friend.color){avatar.courier.root.remove(avatar.label);disposeScene(avatar.label);avatar.label=nameplate(friend.name,friend.color);avatar.courier.root.add(avatar.label)}
   avatar.friend=friend;avatar.courier.setColor(friend.color);avatar.position.fromArray(friend.pose.position);avatar.rotation.fromArray(friend.pose.quaternion);
   avatar.courier.root.scale.setScalar(.5*friend.pose.scale);avatar.courier.setSkating(friend.pose.skating);
   if(avatar.courier.root.position.distanceTo(avatar.position)>70)avatar.courier.root.position.copy(avatar.position);
  }
 }
 return {
  root,avatars,
  attach(value:FriendsClient|null){unsubscribe?.();client=value;unsubscribe=client?.subscribe(receive)??null;receive()},
  activity(value:boolean){active=value},
  update(delta:number,pose:Pose){
   const blend=1-Math.exp(-Math.max(0,delta)*14);
   for(const avatar of avatars.values()){
    avatar.courier.root.position.lerp(avatar.position,blend);avatar.courier.root.quaternion.slerp(avatar.rotation,blend);
    avatar.courier.root.visible=avatar.friend.pose.mode!=='activity'&&avatar.friend.pose.planet===pose.planet;
    avatar.courier.update(delta,0);
   }
   clock+=delta;if(clock>=.1){clock=0;client?.send({type:'pose',pose:{...pose,mode:active?'activity':pose.mode}})}
  },
  dispose(){unsubscribe?.();for(const id of avatars.keys())remove(id);root.removeFromParent()},
 };
}
