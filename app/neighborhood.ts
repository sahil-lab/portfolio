import * as T from 'three';
import {createTransitModels} from './transit-models';
import {batchScenery} from './static-batching';
import {transitStops} from './transit-config';
import {createSpeechBubble,type SpeechBubbleStyle} from './speech-bubble';
import {createDialogueDeck} from './resident-dialogue';

export type StreetBody={x:number;y:number;z:number;r:number};
export function touchesBody(x:number,y:number,z:number,b:StreetBody,padding=.4){return Math.abs(y-b.y)<2.5&&Math.hypot(x-b.x,z-b.z)<b.r+padding}
/** Test the entire movement segment, not just its endpoint; residents cannot tunnel. */
export function clearStreetSegment(a:StreetBody,x:number,z:number,blocked:(x:number,y:number,z:number)=>boolean){
 const count=Math.max(1,Math.ceil(Math.hypot(x-a.x,z-a.z)/.12));
 for(let i=1;i<=count;i++){const u=i/count;if(blocked(a.x+(x-a.x)*u,a.y,a.z+(z-a.z)*u))return false}return true;
}

export function createNeighborhood(scene:T.Scene,player:T.Group,solid:(x:number,y:number,z:number)=>boolean,notice:(s:string)=>void,playerRadius:()=>number=()=>.5){
 const root=new T.Group();root.name='QuietNeighborhoods';scene.add(root);const kit=createTransitModels();
 const fixtures:StreetBody[]=[],walkers:{root:T.Group;feet:T.Mesh[];body:StreetBody;cx:number;cz:number;angle:number;wait:number;bubble:T.Sprite;animateBubble:ReturnType<typeof createSpeechBubble>['update'];speech:ReturnType<typeof createSpeechBubble>;dialogue:ReturnType<typeof createDialogueDeck>;speaking:boolean;seed:number}[]=[];
 const traffic:{root:T.Group;wheels:T.Mesh[];body:StreetBody;cx:number;cz:number;radius:number;angle:number;stop:number;direction:number}[]=[];
 const stalls:{x:number;y:number;z:number;name:string;dialogue:ReturnType<typeof createDialogueDeck>}[]=[];
 const stallBubbles:ReturnType<typeof createSpeechBubble>[]=[];
 const palette=['#a9b9df','#9cb8a4','#d4a19b','#ddbd84'];
 function resident(color:string){
  const g=new T.Group();g.name='Resident';const paint=kit.surface(color);
  const body=kit.mesh(g,new T.SphereGeometry(.43,14,10),paint,0,.65,0);body.scale.set(1,1.15,.8);
  const head=kit.mesh(g,new T.SphereGeometry(.4,14,10),paint,0,1.2,0);head.scale.set(1,1,.87);
  const face=kit.mesh(g,new T.SphereGeometry(.31,14,10),kit.navy,0,1.22,.23);face.scale.set(1,.72,.35);
  for(const x of [-.11,.11])kit.mesh(g,new T.SphereGeometry(.048,8,6),kit.cream,x,1.25,.342);
  const feet=[-.2,.2].map(x=>{const m=kit.mesh(g,new T.SphereGeometry(.14,10,6),paint,x,.12,.02);m.scale.set(1,1,1.5);return m});
  for(const x of [-.43,.43])kit.mesh(g,new T.SphereGeometry(.12,10,6),paint,x,.66,0).scale.y=1.8;
  kit.mesh(g,new T.SphereGeometry(.12,10,6),paint,0,1.58,0);batchScenery(g,{feet});g.scale.setScalar(.7);return {root:g,feet};
 }
 transitStops.forEach((s,index)=>{
  // A small village square sits inside the driving ring, with generous clear approaches.
  const x=index?s.x+6:-40,z=index?s.z-5:43,y=s.y;
  stalls.push({x,y,z,name:index===1?'Copper Dog':index===2?'Garden Buns':index===3?'Moon Dogs':'Byte-size Buns',dialogue:createDialogueDeck(s.theme,Math.random,['Fresh buns are ready for the road.','One warm snack, coming right up.'])});
  kit.box(root,kit.copper,x,y+.65,z,2.8,1.3,1.4);kit.box(root,kit.cream,x,y+1.35,z+.15,3.1,.13,1.8);
  for(const dx of [-1.3,1.3])kit.box(root,kit.copper,x+dx,y+2.1,z,.08,2.1,.08);
  kit.box(root,kit.surface(palette[index]),x,y+3.1,z,3.5,.17,2.3);
  for(let i=0;i<5;i++)kit.box(root,i%2?kit.cream:kit.copper,x-1.4+i*.7,y+2.9,z+1.1,.69,.3,.1);
  const bun=kit.mesh(root,new T.CapsuleGeometry(.19,.8,4,12),kit.surface('#e8bc76'),x,y+1.57,z+.3);bun.rotation.z=Math.PI/2;
  const dog=kit.mesh(root,new T.CapsuleGeometry(.105,.85,4,12),kit.surface('#ba6953'),x,y+1.72,z+.3);dog.rotation.z=Math.PI/2;
    const sign=createSpeechBubble('HOT DOGS',{style:'burst',width:2.9,height:y+3.35,phase:index});sign.sprite.position.set(x,y+3.35,z);root.add(sign.sprite);stallBubbles.push(sign);
  fixtures.push({x,y,z,r:1.9});
  const vendor=resident(palette[(index+1)%4]);vendor.root.position.set(x,y,z-1.7);root.add(vendor.root);fixtures.push({x,y,z:z-1.7,r:.5});
  // One bench and a planter, rather than filling the landing deck with props.
  kit.box(root,kit.copper,x+4,y+.55,z,2.4,.2,.8);kit.box(root,kit.cream,x+4,y+1.15,z-.4,2.4,.8,.12);
  for(const dx of [3.1,4.9])kit.box(root,kit.navy,x+dx,y+.2,z,.12,.6,.65);fixtures.push({x:x+4,y,z,r:1.4});
  kit.mesh(root,new T.CylinderGeometry(.6,.45,.7,12),kit.copper,x-4,y+.25,z);
  kit.mesh(root,new T.SphereGeometry(.7,12,8),kit.surface('#86a48a'),x-4,y+1,z);fixtures.push({x:x-4,y,z,r:.8});
  const center=index?{x:s.x-6,z:s.z-4}:{x:6,z:31};
  for(let i=0;i<3;i++){
   const actor=resident(palette[(index+i)%4]),a=i*2.1,px=center.x+Math.sin(a)*4,pz=center.z+Math.cos(a)*4;
   const body={x:px,y,z:pz,r:.48};if(solid(px,y,pz)||fixtures.some(b=>touchesBody(px,y,pz,b)))continue;
    const variation=(index+i)%3,style:SpeechBubbleStyle=(['speech','thought','burst'] as const)[variation];
    const dialogue=createDialogueDeck(s.theme);actor.root.position.set(px,y,pz);const speech=createSpeechBubble(dialogue.next(),{style,width:4.6,phase:index*3+i});actor.root.add(speech.sprite);root.add(actor.root);
    walkers.push({...actor,body,cx:center.x,cz:center.z,angle:a,wait:i,bubble:speech.sprite,animateBubble:speech.update,speech,dialogue,speaking:false,seed:index*3+i});
  }
  for(let i=0;i<2;i++){
   const car=kit.rover(palette[(index+i)%4]),driver=resident(palette[(index+i+2)%4]);driver.root.position.set(0,.85,-.25);car.root.add(driver.root);
   const cx=index?s.x:-39,cz=index?s.z-3:30,radius=index?16.5:6,angle=i*Math.PI;
   const body={x:cx+Math.sin(angle)*radius,y,z:cz+Math.cos(angle)*radius,r:2.25};
   if(solid(body.x,y,body.z)||fixtures.some(b=>touchesBody(body.x,y,body.z,b,body.r)))continue;
   car.root.position.set(body.x,y,body.z);car.root.rotation.y=angle+Math.PI/2;car.root.name='ResidentDrivenRover';root.add(car.root);traffic.push({...car,body,cx,cz,radius,angle,stop:0,direction:1});
  }
 });
 batchScenery(root,{actors:[...walkers.map(w=>w.root),...traffic.map(c=>c.root)]});
 let clock=0;
 let activeSpeaker:typeof walkers[number]|undefined;
 let requestedSpeaker:typeof walkers[number]|undefined,requestUntil=0;
 const staticBlocked=(x:number,y:number,z:number,padding=.4)=>solid(x,y,z)||fixtures.some(b=>touchesBody(x,y,z,b,padding));
 const bodyBlocked=(x:number,y:number,z:number,exclude:StreetBody,padding=.4)=>[...walkers,...traffic].some(a=>a.body!==exclude&&touchesBody(x,y,z,a.body,padding));
 function update(dt:number,reduced:boolean){
  clock+=dt;
    stallBubbles.forEach(bubble=>bubble.update(dt,true,reduced));
    let speaker:typeof walkers[number]|undefined,nearestSpeaker=36;
    for(const candidate of walkers){const distance=player.position.distanceToSquared(candidate.root.position);if(distance<nearestSpeaker&&(clock+candidate.seed*3)%18<5){speaker=candidate;nearestSpeaker=distance}}
    if(requestedSpeaker&&clock<requestUntil&&player.position.distanceToSquared(requestedSpeaker.root.position)<64)speaker=requestedSpeaker;
    if(reduced||!activeSpeaker?.bubble.visible)activeSpeaker=speaker;
  for(const car of traffic){
   const next=car.angle+car.direction*dt*2.1/car.radius,x=car.cx+Math.sin(next)*car.radius,z=car.cz+Math.cos(next)*car.radius;
   const blocked=(px:number,y:number,pz:number)=>staticBlocked(px,y,pz,car.body.r)||[[0,0],[1.7,0],[-1.7,0],[0,1.7],[0,-1.7]].some(([ox,oz])=>solid(px+ox,y,pz+oz))||bodyBlocked(px,y,pz,car.body,car.body.r)||touchesBody(px,y,pz,{x:player.position.x,y:player.position.y,z:player.position.z,r:playerRadius()},car.body.r+.7);
   if(clearStreetSegment(car.body,x,z,blocked)){car.stop=0;car.angle=next;car.body.x=x;car.body.z=z;car.root.position.set(x,car.body.y,z);car.root.rotation.y=next+car.direction*Math.PI/2;car.wheels.forEach(w=>w.rotation.x+=dt*4)}else{car.stop+=dt;if(car.stop>3){car.direction*=-1;car.stop=0}}
  }
  for(const w of walkers){
    const speaking=w===speaker&&w===activeSpeaker;if(speaking&&!w.speaking)w.speech.setText(w.dialogue.next());w.speaking=speaking;w.animateBubble(dt,speaking,reduced);
   if(w.wait>0){w.wait-=dt;continue}
   const dx=Math.sin(w.angle)*dt*.65,dz=Math.cos(w.angle)*dt*.65;
   const blocked=(x:number,y:number,z:number)=>staticBlocked(x,y,z)||bodyBlocked(x,y,z,w.body)||Math.hypot(x-w.cx,z-w.cz)>6||touchesBody(x,y,z,{x:player.position.x,y:player.position.y,z:player.position.z,r:playerRadius()},.65);
   if(clearStreetSegment(w.body,w.body.x+dx,w.body.z+dz,blocked)){
    w.body.x+=dx;w.body.z+=dz;w.root.position.set(w.body.x,w.body.y,w.body.z);w.root.rotation.y=w.angle;
    w.feet.forEach((f,i)=>f.rotation.x=reduced?0:Math.sin(clock*6+i*Math.PI)*.3);
   }else{w.angle+=1.2+(w.seed%3)*.4;w.wait=.6}
  }
 }
 const nearest=()=>stalls.find(s=>Math.abs(player.position.y-s.y)<2&&Math.hypot(player.position.x-s.x,player.position.z-s.z)<3.5);
 const nearestWalker=()=>walkers.filter(walker=>player.position.distanceToSquared(walker.root.position)<12).sort((first,second)=>player.position.distanceToSquared(first.root.position)-player.position.distanceToSquared(second.root.position))[0];
 return {update,root,traffic,walkers,
  blocked:(x:number,y:number,z:number)=>fixtures.some(b=>touchesBody(x,y,z,b))||[...traffic,...walkers].some(a=>touchesBody(x,y,z,a.body)),
  prompt:()=>nearest()?'E · Say hello at '+nearest()!.name:nearestWalker()?'E · Talk to a neighbour':null,
  interact:()=>{const s=nearest();if(s){notice(s.name+': '+s.dialogue.next());return true}const walker=nearestWalker();if(!walker)return false;requestedSpeaker=walker;requestUntil=clock+6;walker.speech.setText(walker.dialogue.next());walker.speaking=true;notice('Neighbour: '+walker.speech.text);return true},
 };
}
