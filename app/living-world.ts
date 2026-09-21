import type {SoundCue} from './audio-score';
import {createPacketPress} from './packet-press-asset';
import * as T from 'three';
import {DeliveryRound,type DeliverySnapshot} from './delivery-state';
import {createCourier} from './courier';
import {KingdomVoices} from './kingdom-voices';
import {encounters,type Encounter} from './encounter-config';
import {createDialogueDeck} from './resident-dialogue';
import {cityBlock} from './city-architecture';
export {encounters,type Encounter} from './encounter-config';
export function createLivingWorld(scene:T.Scene,player:T.Group,courier:ReturnType<typeof createCourier>,callbacks:{initialDelivery?:DeliverySnapshot|null;onDelivery?:(s:DeliverySnapshot)=>void;onEncounter?:(e:Encounter|null)=>void;onSubtitle?:(s:string)=>void;onSound?:(cue:SoundCue)=>void}){
 const round=new DeliveryRound();if(callbacks.initialDelivery)round.restore(callbacks.initialDelivery);const voices=new KingdomVoices(),root=new T.Group();scene.add(root);let time=0,current:Encounter|null=null,lastId='',reaction='',reactionRemaining=0;const talks=new Map<string,ReturnType<typeof createDialogueDeck>>();
 const materialCache=new Map<string,T.MeshStandardMaterial>();const sphere=new T.SphereGeometry(1,16,12);
 const material=(color:string,glow=0)=>{const key=color+'/'+glow;let m=materialCache.get(key);if(!m){m=new T.MeshPhysicalMaterial({color,roughness:.48,metalness:.015,clearcoat:.22,emissive:color,emissiveIntensity:glow});materialCache.set(key,m)}return m};
 function orb(g:T.Object3D,name:string,x:number,y:number,z:number,sx:number,sy:number,sz:number,color:string,glow=0){const m=new T.Mesh(sphere,material(color,glow));m.name=name;m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;g.add(m);return m}
 function box(g:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,color:string,glow=0){const m=new T.Mesh(cityBlock(w,h,d,.08),material(color,glow));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m}
 function tube(g:T.Object3D,points:T.Vector3[],color:string,r=.08){const m=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),24,r,8,false),material(color));g.add(m);return m}
 const labels:T.Sprite[]=[];
 function sign(text:string,x:number,y:number,z:number){const canvas=document.createElement('canvas');canvas.width=768;canvas.height=100;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#edf6e7';ctx.font='600 30px "Trebuchet MS", sans-serif';ctx.textAlign='center';ctx.fillText(text,384,62);const m=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(canvas),depthTest:true,depthWrite:false,transparent:true}));m.position.set(x,y,z);m.scale.set(6.8,.884,1);labels.push(m);root.add(m);return m}
 const metal=material('#b9c1bd');metal.metalness=.65;metal.roughness=.48;
 const glintGeometry=new T.SphereGeometry(1,8,6),artistColors=['#9bae98','#8b9fb9','#c59184'].map(color=>new T.Color(color));
 const actors=new Map<string,{group:T.Group;limbs:T.Object3D[];brows:T.Object3D[];eyes:{mesh:T.Mesh;height:number}[];phase:number;skin?:T.Mesh}>();
 for(const e of encounters.filter(e=>e.kind==='resident')){const g=new T.Group();g.name='Resident_'+e.id;g.position.set(e.x,.55,e.z);root.add(g);const limbs:T.Object3D[]=[],brows:T.Object3D[]=[];let skin:T.Mesh|undefined;
 if(e.id==='owl'){
  orb(g,'owl body',0,1,0,.68,.9,.6,'#aeb9c8');orb(g,'owl head',0,1.9,0,.8,.68,.6,'#899db9');
  for(const x of [-.3,.3]){orb(g,'eye disc',x,1.95,.52,.33,.35,.1,'#e9dfc8');orb(g,'pupil',x,1.95,.62,.1,.16,.05,'#303f49');limbs.push(orb(g,'wing',Math.sign(x)*.7,.95,0,.25,.65,.25,'#7c91ab'));const glasses=new T.Mesh(new T.TorusGeometry(.235,.018,5,20),metal);glasses.name='Librarian_ReadingGlasses';glasses.position.set(x,1.95,.64);g.add(glasses)}
  orb(g,'beak',0,1.68,.7,.15,.21,.22,'#c7aa7f');box(g,0,.55,.65,.8,.12,.55,'#829a8b').name='Librarian_Ledger';box(g,0,.619,.65,.68,.025,.44,'#eee5d3').name='Librarian_LedgerPages';
  box(g,-.15,1.1,.58,.085,.4,.035,'#c79385').name='Librarian_Ribbon';
 }
 if(e.id==='chameleon'){
  skin=orb(g,'color changing body',0,1,0,.7,.7,.95,'#9bae98');orb(g,'head',0,1.55,.55,.62,.5,.55,'#9fb89e');for(const x of [-.48,.48]){orb(g,'eye turret',x,1.7,.73,.23,.25,.23,'#d5d7b2');orb(g,'pupil',x,1.72,.94,.07,.1,.03,'#303f49');limbs.push(orb(g,'hand',x,.5,.45,.21,.3,.25,'#91a38d'))}
  tube(g,[new T.Vector3(0,.7,-.7),new T.Vector3(.8,.8,-1.1),new T.Vector3(1,.95,-.4),new T.Vector3(.6,1,-.3)],'#93ab91',.16);box(g,.9,1,.3,.1,1.5,.1,'#b5a587');box(g,.9,1.71,.3,.11,.15,.105,'#b9c1bd').name='Painter_BrushFerrule';orb(g,'Painter_BrushTip',.9,1.85,.3,.065,.16,.065,'#eee5d3');
  box(g,0,.98,.946,.36,.31,.025,'#eee5d3').name='Painter_Apron';orb(g,'Painter_PaintMark',-.1,1.03,.966,.032,.026,.012,'#c59184');
 }
 if(e.id==='cloud'){
  for(let i=0;i<5;i++)orb(g,'cloud lobe',Math.cos(i*1.26)*.65,1.65+Math.sin(i*1.26)*.3,0,.65,.58,.45,'#bec7cf');for(const x of [-.3,.3]){orb(g,'eye',x,1.65,.46,.08,.11,.05,'#303f49');const brow=box(g,x,1.9,.45,.3,.07,.1,'#303f49');brow.name='Cloud_Brow';brow.rotation.z=-Math.sign(x)*.25;brows.push(brow)}box(g,0,1.36,.48,.38,.06,.08,'#303f49').name='Cloud_Frown';
  orb(g,'Cloud_WeatherBadge',.67,1.5,.445,.085,.085,.02,'#b9c1bd');for(let i=0;i<3;i++)limbs.push(orb(g,'rain bead',-.5+i*.5,.7,0,.06,.18,.06,'#a6bdc9',.04));
 }
 if(e.id==='gopher'){
  orb(g,'burrow',0,.05,0,1,.12,.8,'#303f39');skin=orb(g,'gopher body',0,.75,0,.55,.7,.48,'#b7a18a');orb(g,'snout',0,1,.4,.35,.3,.3,'#dbc9ad');for(const x of [-.25,.25]){orb(g,'eye',x,1.2,.43,.06,.09,.04,'#303f49');orb(g,'ear',x,1.42,0,.15,.2,.12,'#a18f7b')}limbs.push(orb(g,'paw',.55,.6,.1,.18,.25,.18,'#a18f7b'));
  orb(g,'Cache_WorkCap',0,1.4,.04,.34,.105,.29,'#899e92');orb(g,'Cache_Headlamp',-.12,1.42,.322,.055,.05,.024,'#dbe5d8',.04);box(g,.25,.72,.43,.19,.18,.045,'#899e92').name='Cache_Pocket';
 }
 if(e.id==='tortoises'){for(let i=0;i<3;i++){const family=new T.Group();family.name='Ledger_Family_'+i;family.position.x=(i-1)*1.3;family.scale.setScalar(i===1?1:.57);g.add(family);orb(family,'shell',0,.65,0,.8,.63,.95,i===1?'#92a58a':'#b7c3a3');for(let j=0;j<3;j++)box(family,-.45+j*.45,.98,0,.035,.05,1.2,'#647f6d');orb(family,'head',0,.45,.95,.3,.3,.4,'#c4ccab');for(const x of [-.16,.16])orb(family,'eye',x,.52,1.28,.035,.06,.03,'#303f49');for(const x of [-.6,.6])for(const z of [-.5,.5])limbs.push(orb(family,'foot',x,.12,z,.2,.18,.28,'#a8b397'));const band=new T.Mesh(new T.TorusGeometry(.75,.014,5,24).rotateX(Math.PI/2),metal);band.name='Ledger_ShellBand';band.position.y=.83;band.scale.z=1.23;family.add(band)}}
 if(e.id==='birds'){for(let i=0;i<5;i++){const bird=new T.Group();bird.name='Bit_Bird_'+i;bird.position.set((i-2)*.55,1.8+i*.18,Math.sin(i));g.add(bird);box(bird,0,0,0,.22,.22,.3,'#93b3a4',.06);const left=box(bird,-.22,0,0,.35,.07,.18,'#d5e2d6',.04),right=box(bird,.22,0,0,.35,.07,.18,'#d5e2d6',.04);limbs.push(left,right);for(const side of [-1,1])orb(bird,'eye',side*.046,.019,.153,.015,.021,.008,'#303f49')}}
 const eyes:{mesh:T.Mesh;height:number}[]=[];g.traverse(object=>{
  if(!(object instanceof T.Mesh))return;
  if(object.material instanceof T.MeshPhysicalMaterial){object.material.roughness=object.material===metal?.48:.6;object.material.clearcoat=.18;object.material.clearcoatRoughness=.48}
  if(['eye','pupil'].includes(object.name))eyes.push({mesh:object,height:object.scale.y});
 });
 for(const {mesh:eye} of eyes){const glint=new T.Mesh(glintGeometry,material('#eee5d3'));glint.name='Resident_EyeCatchlight';glint.position.set(-.24,.27,.87);glint.scale.set(.24,.22,.13);eye.add(glint)}
 if(skin)skin.material=(skin.material as T.Material).clone();actors.set(e.id,{group:g,limbs,brows,eyes,phase:encounters.indexOf(e)*.73,skin});sign(e.name,e.x,4,e.z)
 }
 materialCache.clear();
 // Each curiosity stop has a short ground-level connection to the existing hub.
 const curios=new Map<string,T.Group>();const bells:T.Mesh[]=[];const crystals:T.Mesh[]=[];
 for(const e of encounters.filter(e=>e.kind==='curiosity')){const g=new T.Group();g.position.set(e.x,.2,e.z);root.add(g);curios.set(e.id,g);sign(e.name,e.x,4,e.z);const a=new T.Vector3(0,.1,19),b=new T.Vector3(e.x,.1,e.z);tube(root,[a,a.clone().lerp(b,.5),b],'#a9bc88',.09);
 if(e.id==='capacitors'){for(let i=0;i<5;i++){const m=orb(g,'musical capacitor',i*.65-1.3,.6+i*.17,0,.25,.6+i*.17,.25,['#a8c2ed','#96d9c3','#e4bc8d','#c5a8e0','#a4d49c'][i]);bells.push(m);orb(g,'metal top',i*.65-1.3,1.2+i*.34,0,.27,.08,.27,'#e0e8cb')}}
 if(e.id==='baths'){orb(g,'bath rim',0,.15,0,2,.3,1.4,'#81aa9d');orb(g,'cooling water',0,.32,0,1.7,.06,1.15,'#7bcbe3',.25);for(let i=0;i<4;i++){const ring=new T.Mesh(new T.TorusGeometry(.3+i*.28,.025,6,32),material('#b6f0ed',.3));ring.rotation.x=Math.PI/2;ring.position.y=.4;g.add(ring)}}
 if(e.id==='kiln'){box(g,0,.9,0,2.2,1.8,1.8,'#aa7d65');box(g,0,.8,.92,1.4,1,.1,'#f2b16c',.8);box(g,.7,2,0,.5,1.2,.6,'#796856');const artifact=orb(g,'compiled object',0,.3,1.7,.35,.35,.35,'#bfffe1',.5);artifact.name='output'}
 if(e.id==='woodland'){for(let i=0;i<5;i++){const x=(i-2)*.85;tube(g,[new T.Vector3(x,0,0),new T.Vector3(x+.3,1.8,.2),new T.Vector3(x*.6,3,.5)],'#8dac82',.1);for(let j=0;j<3;j++)orb(g,'cable leaf',x+(j%2?.35:-.35),1+j*.55,0,.48,.17,.25,'#76ba9d')}}
 if(e.id==='crystals'){for(let i=0;i<8;i++){const m=new T.Mesh(new T.OctahedronGeometry(.4,0),material('#a3dbe5',.3));m.position.set((i%2?1:-1)*.9,.5,-2+i*.6);m.scale.y=1.7;g.add(m);crystals.push(m)}}
 if(e.id==='cinema'){box(g,0,1.8,0,4.8,3,.3,'#333b62');box(g,0,1.8,.2,4.3,2.5,.1,'#122844');for(let i=0;i<3;i++)box(g,-1.2+i*1.2,.3,2,.8,.5,.7,'#8d7baf');const film=new T.Mesh(new T.IcosahedronGeometry(.6,0),material('#d9b1f2',.5));film.name='film';film.position.set(0,1.8,.5);g.add(film);for(let i=0;i<3;i++){const star=orb(g,'orbit bit '+i,0,1.8,.5,.14,.14,.14,['#f0d58c','#b3f5d3','#b8b7fa'][i],.6);star.name='orbit bit '+i}}
 }
 const press=createPacketPress(root);
 const announce=(text:string,seed:number,gesture='greeting',celebrate=false)=>{callbacks.onSubtitle?.(text);callbacks.onSound?.(gesture==='pickup'?'pickup':gesture==='delivery'?'delivery':gesture==='curiosity'?'machine':'creature');voices.speak(seed,celebrate);courier.gesture(gesture)};
 const unsubscribe=round.subscribe(()=>callbacks.onDelivery?.(round.snapshot));callbacks.onDelivery?.(round.snapshot);
 function nearest(){
  for(const label of labels){const distance=Math.hypot(label.position.x-player.position.x,label.position.z-player.position.z);label.material.opacity=1-T.MathUtils.smoothstep(distance,6,16);label.visible=label.material.opacity>.01}
  return encounters.filter(e=>Math.hypot(e.x-player.position.x,e.z-player.position.z)<(e.id==='press'?4:3.2)).sort((a,b)=>Math.hypot(a.x-player.position.x,a.z-player.position.z)-Math.hypot(b.x-player.position.x,b.z-player.position.z))[0]??null;
 }
 function interact(){const e=nearest();if(!e)return false;reaction=e.id;reactionRemaining=3;if(e.id==='press'){if(round.snapshot.phase==='idle'){round.prepare();announce('Packet Press: charging four diagnostic capsules.',1,'curiosity')}else if(round.snapshot.phase==='ready'&&round.collect()){announce(round.snapshot.message,1,'pickup')}else announce(round.snapshot.phase==='complete'?'Round complete. Use Start another round when you are ready.':round.snapshot.phase==='preparing'?'Charging… watch the four indicators.':'Tray empty. Your remaining capsules are with you or their recipients.',1);return true}let dialogue=talks.get(e.id);if(!dialogue){dialogue=createDialogueDeck('home',Math.random,e.dialogue);talks.set(e.id,dialogue)}round.discover(e.id,e.name);announce(e.name+': '+(e.kind==='curiosity'?e.dialogue[Math.floor(Math.random()*e.dialogue.length)]:dialogue.next()),encounters.indexOf(e),e.kind==='curiosity'?'curiosity':'greeting');return true}
 function deliver(){const e=nearest();if(!e?.recipient)return;round.discover(e.id,e.name);if(round.deliver(e.id)){reaction=e.id;reactionRemaining=3;announce(e.name+': Diagnostic received. Thank you, little courier! '+(round.snapshot.phase==='complete'?'All four deliveries complete!':'One capsule is plenty for this round.'),encounters.indexOf(e),'delivery',round.snapshot.phase==='complete')}else announce(e.name+': '+(round.snapshot.delivered.includes(e.id)?'Already received mine this round. Stay and chat!':'You have no capsule to deliver. You are still welcome here.'),encounters.indexOf(e))}
 return {round,volume:(v:number)=>voices.setVolume(v),blocked:(x:number,z:number)=>{if(player.position.y>3)return false;if(press.blocked(x,z))return true;return encounters.some(e=>{if(e.id==='press'||e.id==='birds'||e.id==='woodland'||e.id==='crystals'||e.id==='baths')return false;const w=e.id==='cinema'?2.8:e.id==='capacitors'?1.8:e.id==='kiln'?1.5:.9;const depth=e.id==='cinema'?.6:1.1;return Math.abs(x-e.x)<w&&Math.abs(z-e.z)<depth})},interact,deliver,nextRound:()=>{if(nearest()?.id==='press'&&round.nextRound())announce(round.snapshot.message,1,'greeting')},sound:(enabled:boolean)=>voices.enable(enabled),dispose:()=>{unsubscribe();voices.dispose();press.dispose()},update:(dt:number,inside:boolean,reduced=false)=>{const delta=Number.isFinite(dt)?Math.max(0,dt):0;time+=reduced?0:delta;reactionRemaining=Math.max(0,reactionRemaining-delta);round.tick(delta);courier.update(delta,round.snapshot.inventory,reduced);current=inside?null:nearest();if((current?.id??'')!==lastId){lastId=current?.id??'';callbacks.onEncounter?.(current)}const phase=round.snapshot.phase;press.update(round.snapshot,round.progress);
 actors.forEach((actor,id)=>{
  actor.group.visible=Math.hypot(actor.group.position.x-player.position.x,actor.group.position.z-player.position.z)<38;if(!actor.group.visible)return;
  const active=reaction===id&&reactionRemaining>0,poseTime=reduced?0:time,period=4.2+actor.phase*.18;
  const bearing=Math.atan2(player.position.x-actor.group.position.x,player.position.z-actor.group.position.z),gaze=active?T.MathUtils.clamp(bearing,-.16,.16):Math.sin(poseTime*.6+actor.phase)*.07;
  actor.group.rotation.y=reduced?0:T.MathUtils.damp(actor.group.rotation.y,gaze,5,delta);actor.group.position.y=.55+(reduced?0:Math.sin(poseTime*(active?6:2)+actor.phase)*(active?.035:.015));
  actor.eyes.forEach(({mesh,height},index)=>{const blink=reduced?1:1-Math.max(0,1-Math.abs((poseTime+actor.phase+Math.floor(index/2)*.17)%period-(period-.12))/.11)*.88;mesh.scale.y=height*blink});
  actor.limbs.forEach((limb,index)=>limb.rotation.z=reduced?0:id==='birds'?Math.sin(poseTime*10+index)*.38:Math.sin(poseTime*(active?6:2)+actor.phase+index)*(active?.16:.035));
  actor.brows.forEach(brow=>brow.rotation.z=-Math.sign(brow.position.x)*(active?.08:.25));
  if(id==='chameleon'&&actor.skin){const hue=(time*.075+(active?.75:0))%artistColors.length,index=Math.floor(hue);(actor.skin.material as T.MeshStandardMaterial).color.copy(artistColors[index]).lerp(artistColors[(index+1)%artistColors.length],hue-index)}
  if(id==='gopher')actor.group.scale.y=!reduced&&!active&&time%9>6?.08:1;
  if(id==='cloud'&&!reduced)actor.group.position.y+=Math.sin(poseTime+actor.phase)*.06;
 });
 curios.forEach((g,id)=>{g.visible=Math.hypot(g.position.x-player.position.x,g.position.z-player.position.z)<42;if(!g.visible)return;const active=reaction===id&&reactionRemaining>0;if(id==='baths')g.children.forEach((m,i)=>{if(m instanceof T.Mesh&&m.geometry instanceof T.TorusGeometry){m.scale.setScalar(1+Math.sin(time*2+i)*.12+(active?.3:0))}});if(id==='woodland')g.rotation.z=Math.sin(time)*(active?.06:.01);if(id==='kiln'){const output=g.getObjectByName('output')!;output.position.y=.35+(active?Math.sin(time*4)*.2:0);output.visible=round.snapshot.discoveries.includes(id)}if(id==='cinema'){const film=g.getObjectByName('film')!;film.rotation.set(time*.7,time*.9,time*.3);film.position.x=Math.sin(time)*1.2;film.scale.setScalar(.65+Math.sin(time*.7)*.25);film.visible=time%16<8;for(let i=0;i<3;i++){const star=g.getObjectByName('orbit bit '+i)!;star.visible=!film.visible;star.position.set(Math.cos(time+i*2.1)*1.4,1.8+Math.sin(time+i*2.1)*.8,.5)}}});bells.forEach((m,i)=>m.scale.y=(.6+i*.17)*(1+(reaction==='capacitors'&&reactionRemaining>0?Math.sin(time*12+i)*.15:0)));crystals.forEach((m,i)=>(m.material as T.MeshStandardMaterial).emissiveIntensity=.3+(reaction==='crystals'&&reactionRemaining>0?(.5+Math.sin(time*6+i)*.3):0));
 return current?current.id==='press'?(phase==='idle'?'E · Prepare diagnostic capsules':phase==='ready'&&round.snapshot.stock?'E · Collect a capsule':phase==='complete'?'Round complete · Start another round at the press':'E · Inspect Packet Press'):'E · '+(current.kind==='resident'?'Talk to ':'Discover ')+current.name:null}};
}
