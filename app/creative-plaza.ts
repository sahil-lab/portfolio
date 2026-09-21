import * as T from 'three';
import {craftedBox,createCraftMaterials} from './crafted-surfaces';
import {createWoodenSign} from './wooden-sign';
import {createReadableDisplay} from './readable-display';
import {PortraitSpeaker} from './portrait-speaker';
import {PaintingInteraction} from './painting-interaction';
import {batchScenery} from './static-batching';
import {addShopArchitecture} from './shop-architecture';

export const commonsSpawn={x:0,y:.8,z:98};
export function commonsArrival(aspect:number){
  const compact=aspect<.85;
  return {position:compact?{x:-28,y:.8,z:121}:commonsSpawn,view:{yaw:compact?-.22:0,pitch:compact?.38:.36,zoom:compact?80:100,focusHeight:10}};
}
export const commonsGardens=[{x:-12,z:97},{x:12,z:97},{x:-12,z:117},{x:12,z:117},{x:-40,z:118},{x:40,z:119},{x:-11,z:140},{x:11,z:143}];
export const commonsVenues=[
  {id:'kettle',name:'The Copper Kettle',x:-27,z:108,width:19,depth:13,message:'A warm circuit chai, brewed just for you.'},
  {id:'shoe',name:'Sole Studio',x:23,z:106,width:15,depth:16,message:'A fresh pair of moonwalkers. Every great journey starts with comfortable shoes.'},
  {id:'radio',name:'Frequency House',x:-17,z:132,width:15,depth:9,message:'Today\'s record: A Small Signal in a Very Big Universe.'},
  {id:'books',name:'Paperback Dispenser',x:-34,z:88,width:3.5,depth:2.8,message:'Your book: A Field Guide to Quiet Planets.'},
  {id:'juice',name:'Citrus Circuit',x:29,z:76,width:3.5,depth:2.8,message:'One chilled orange spark. A little refreshment for the road.'},
  {id:'ice',name:'Cloud Soft Serve',x:18,z:130,width:3.5,depth:2.8,message:'Vanilla cloud, with a little stardust on top.'},
] as const;

export function createCreativePlaza(scene:T.Scene,player:T.Group,callbacks:{notice:(text:string)=>void;subtitle:(text:string)=>void;sound:()=>void;enableVoice?:()=>void}){
  const root=new T.Group();root.name='MotherboardCommons';scene.add(root);const surface=createCraftMaterials();
  const ink=surface('#233c43'),cream=surface('#f1f2e9'),copper=surface('#c9ad7b',0,.65),teal=surface('#198c91'),rose=surface('#e47f87'),blue=surface('#4b91b3');
  const glass=new T.MeshPhysicalMaterial({color:'#1988ba',metalness:.3,roughness:.22,clearcoat:.75,clearcoatRoughness:.2});
  const foliage=surface('#417c5c'),newGrowth=surface('#a3c783'),petal=surface('#efb79a'),soil=surface('#29433b');
  const leafGeometry=new T.SphereGeometry(1,8,6),stemGeometry=new T.CylinderGeometry(.025,.04,1.2,6);
  const speaker=new PortraitSpeaker(callbacks.subtitle);let clock=0,lastMouth=-1,lastText='',lastBlink=false,lastStatus='';const dispensed:{mesh:T.Object3D;until:number}[]=[];
  let available=true;
  const nearPortrait=()=>player.position.y>=0&&player.position.y<3&&player.position.z>73.8&&Math.hypot(player.position.x+24,player.position.z-77)<6;
  const voice=new PaintingInteraction(speaker,{available:()=>available&&nearPortrait()&&globalThis.document?.hidden!==true,enableVoice:()=>{if(callbacks.enableVoice)callbacks.enableVoice();else speaker.sound(true)},notice:callbacks.notice,clearCaption:()=>callbacks.subtitle('')});
  function mesh(parent:T.Object3D,name:string,geometry:T.BufferGeometry,material:T.Material,x=0,y=0,z=0){const object=new T.Mesh(geometry,material);object.name=name;object.position.set(x,y,z);object.castShadow=true;object.receiveShadow=true;object.userData.cameraSolid=/^(Kettle_Body|Sneaker_Upper|Radio_Cabinet|Vending_Cabinet)$/.test(name);parent.add(object);return object}
  function box(parent:T.Object3D,name:string,material:T.Material,x:number,y:number,z:number,width:number,height:number,depth:number){return mesh(parent,name,craftedBox(width,height,depth),material,x,y,z)}
  function title(parent:T.Object3D,text:string,x:number,z:number,width=3.8){const sign=createWoodenSign(text,{width,height:1.7,shape:'arch'});sign.position.set(x,.2,z);parent.add(sign)}
  function plant(parent:T.Object3D,x:number,z:number,raised=0){
    mesh(parent,'Planter_CeramicVessel',new T.CylinderGeometry(.52,.38,.65,16),cream,x,raised+.33,z);
    mesh(parent,'Planter_BrassLip',new T.TorusGeometry(.5,.035,5,24).rotateX(Math.PI/2),copper,x,raised+.67,z);
    mesh(parent,'Planter_Soil',new T.CylinderGeometry(.46,.46,.06,16),soil,x,raised+.63,z);
    for(let leaf=0;leaf<9;leaf++){
      const angle=leaf*2.4,height=.9+(leaf%3)*.3;
      mesh(parent,'Planter_Stem',stemGeometry,foliage,x,raised+1.15,z);
      const blade=mesh(parent,'Planter_Leaf',leafGeometry,leaf%3?foliage:newGrowth,x+Math.sin(angle)*.35,raised+height,z+Math.cos(angle)*.35);
      blade.scale.set(.18,.12,.6);blade.rotation.set(.35,angle,.2);
    }
    const flower=mesh(parent,'Planter_Blossom',new T.IcosahedronGeometry(.18,1),petal,x,raised+1.8,z);flower.scale.set(1,.7,1);
  }
  function mountedPlate(parent:T.Object3D,name:string,texture:T.Texture,x:number,y:number,z:number,width:number,height:number,backZ=-z){
    box(parent,name+'_Housing',copper,x,y,z-.16,width+.2,height+.2,.24);
    box(parent,name+'_Housing_Back',copper,x,y,backZ+.16,width+.2,height+.2,.24);
    createReadableDisplay(parent,name,texture,width,height,z-backZ-.08,new T.Vector3(x,y,(z+backZ)/2));
  }
  function plate(parent:T.Object3D,text:string,x:number,y:number,z:number,width:number,backZ=-z){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const context=canvas.getContext('2d')!;
    context.fillStyle='#203b42';context.fillRect(0,0,512,128);context.strokeStyle='#cfb67e';context.lineWidth=2;context.strokeRect(8,8,496,112);
    context.font='600 41px "Trebuchet MS", sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillStyle='#e9dfba';context.fillText(text,256,65,460);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
    mountedPlate(parent,'Shop_EnamelPlaque',texture,x,y,z,width,width/4,backZ);
  }
  box(root,'Commons_Boulevard',cream,0,.03,91,7,.13,91);
  for(const side of [-1,1])box(root,'Commons_Boulevard_Inlay',copper,side*3.15,.12,91,.055,.025,91);
  for(const z of [73,89,106,126])box(root,'Commons_Crosswalk',cream,-2,.035,z,81,.14,3.8);
  for(let index=0;index<18;index++){const z=53+index*4.7;box(root,'Commons_Path_Inlay',teal,0,.12,z,.2,.035,1.4)}
  for(const side of [-1,1])for(const z of [55,81,97,119,137]){
    const x=side*7.3;mesh(root,'Commons_Lamppost',new T.CylinderGeometry(.09,.16,4.2,8),ink,x,2.1,z);
    mesh(root,'Commons_Lamp_Foot',new T.CylinderGeometry(.34,.46,.18,16),copper,x,.17,z);
    mesh(root,'Commons_Lamp',new T.CylinderGeometry(.2,.2,.6,16),surface('#e6f7d5',.8),x,4.25,z);
    for(const y of [3.91,4.58])mesh(root,'Commons_Lamp_Cap',new T.CylinderGeometry(.36,.36,.09,16),copper,x,y,z);
  }
  for(const garden of commonsGardens){
    box(root,'Commons_PlanterBed',ink,garden.x,.18,garden.z,3.5,.4,2.6);
    box(root,'Commons_PlanterRim',copper,garden.x,.4,garden.z,3.38,.07,2.48);
    box(root,'Commons_PlanterSoil',soil,garden.x,.46,garden.z,3.12,.08,2.22);
    for(const side of [-1,1])plant(root,garden.x+side*.82,garden.z,.45);
  }
  const direction=createWoodenSign('WEATHER & COMMONS',{width:4,height:1.5,shape:'arrow'});direction.position.set(7,.15,49);root.add(direction);
  commonsVenues.forEach(venue=>{
    const group=new T.Group();group.name='Shop_'+venue.id;group.position.set(venue.x,0,venue.z);root.add(group);
    box(group,'Shop_Foundation',ink,0,.18,0,venue.width,.4,venue.depth);
    box(group,'Shop_TerrazzoPlinth',cream,0,.41,0,venue.width-.22,.09,venue.depth-.22);
    for(const side of [-1,1]){
      box(group,'Shop_Foundation_Inlay',copper,side*(venue.width/2-.2),.47,0,.045,.025,venue.depth-.5);
      if(venue.width>10)plant(group,side*(venue.width/2-.85),venue.depth/2-.85,.47);
    }
    if(venue.id==='kettle'){
      const profile=new T.CatmullRomCurve3([[0,.6],[3.2,.6],[4.5,1.2],[5.35,3.6],[5.15,6.5],[4.4,8.2],[3.1,9.6],[0,9.6]].map(([radius,height])=>new T.Vector3(radius,height,0)));
      const body=mesh(group,'Kettle_Body',new T.LatheGeometry(profile.getPoints(40).map(point=>new T.Vector2(Math.max(0,point.x),point.y)),56),teal);body.scale.z=.85;
      mesh(group,'Kettle_Lid',new T.CylinderGeometry(3.1,3.8,.6,32),copper,0,10,0);mesh(group,'Kettle_Knob',new T.SphereGeometry(.7,16,10),ink,0,10.8,0);
      const handle=mesh(group,'Kettle_Handle',new T.TorusGeometry(3.1,.5,10,32,Math.PI*1.65),copper,-5,5.3,0);handle.rotation.z=2.1;
      const spout=new T.CatmullRomCurve3([new T.Vector3(3.8,4,0),new T.Vector3(6.4,4.7,0),new T.Vector3(7.9,7.4,0)]);
      mesh(group,'Kettle_Spout',new T.TubeGeometry(spout,16,.78,12,false),copper);
      for(const [height,radius] of [[2.1,4.57],[8.7,3.95]]){const seam=mesh(group,'Kettle_InlaidBand',new T.TorusGeometry(radius,.045,5,64),copper,0,height,0);seam.rotation.x=Math.PI/2;seam.scale.y=.85}
      const spoutRim=mesh(group,'Kettle_SpoutRim',new T.TorusGeometry(.75,.055,6,32),cream,7.9,7.4,0);spoutRim.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(1.5,2.7,0).normalize());
      box(group,'Kettle_DoorSurround',copper,0,2.2,4.28,3.02,4.19,.16);
      box(group,'Kettle_Door',ink,0,2.2,4.35,2.7,3.9,.25);
      box(group,'Kettle_DoorGlazing',glass,0,2.85,4.5,2.2,2.05,.07);box(group,'Kettle_DoorHandle',copper,.88,1.7,4.55,.055,.5,.08);
      box(group,'Kettle_Threshold',copper,0,.61,4.75,3.2,.16,1);
      for(const side of [-1,1]){const window=mesh(group,'Kettle_Window',new T.TorusGeometry(.85,.12,8,32),cream,side*3,5.3,3.85);window.rotation.y=side*.45;const pane=mesh(group,'Kettle_WindowGlass',new T.CircleGeometry(.77,32),glass,side*3,5.3,3.95);pane.rotation.y=side*.45;const bezel=mesh(group,'Kettle_WindowBezel',new T.TorusGeometry(.69,.027,5,32),copper,side*3,5.3,4.04);bezel.rotation.y=side*.45}
      plate(group,'COPPER KETTLE',0,4.65,4.61,2.7);
      title(group,'THE COPPER KETTLE',-5.9,7.9,4.5);
    }else if(venue.id==='shoe'){
      const shape=new T.Shape();shape.moveTo(-6.2,.7);shape.lineTo(6.4,.7);shape.quadraticCurveTo(7.7,1.1,6.5,3);shape.quadraticCurveTo(5.3,4.4,1.6,4.7);shape.lineTo(-.6,8.9);shape.quadraticCurveTo(-3.5,10.2,-5.7,8.5);shape.lineTo(-6.5,2);shape.closePath();
      const geometry=new T.ExtrudeGeometry(shape,{depth:7,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.23,bevelThickness:.23});geometry.translate(0,0,-3.5);
      mesh(group,'Sneaker_Upper',geometry,rose);box(group,'Sneaker_Sole',cream,0,.8,0,14,1.2,8.3);
      box(group,'Sneaker_Outsole',ink,0,.4,0,14.12,.16,8.4);
      for(let tread=0;tread<15;tread++)box(group,'Sneaker_SoleGroove',ink,-6.4+tread*.9,.64,4.2,.065,.25,.02);
      for(let stripe=0;stripe<5;stripe++){const x=-1+stripe*.85,y=7.9-stripe*.62;const curve=new T.CatmullRomCurve3([new T.Vector3(x-1.2,y+.42,3.87),new T.Vector3(x,y+.12,4.02),new T.Vector3(x+1.2,y-.42,3.87)]);mesh(group,'Sneaker_Lace',new T.TubeGeometry(curve,12,.09,8,false),cream)}
      const seam=new T.CatmullRomCurve3([new T.Vector3(-5.8,1.5,3.73),new T.Vector3(-5.3,7.9,3.73),new T.Vector3(-2.9,8.8,3.73),new T.Vector3(.6,4.1,3.73),new T.Vector3(5.9,2.7,3.73)]);
      mesh(group,'Sneaker_PipedSeam',new T.TubeGeometry(seam,40,.045,5,false),cream);
      for(let eyelet=0;eyelet<5;eyelet++)for(const side of [-1,1])mesh(group,'Sneaker_BrassEyelet',new T.TorusGeometry(.18,.035,5,16),copper,-1+eyelet*.85+side*1.2,7.9-eyelet*.62-side*.42,3.87);
      box(group,'Sneaker_Door',ink,-3.8,2.5,3.85,2.5,3.5,.2);
      for(const x of [1.9,4.5]){box(group,'Sneaker_WindowRim',cream,x,2.9,3.82,1.84,1.64,.2);box(group,'Sneaker_Window',glass,x,2.9,3.98,1.6,1.4,.12)}
      plate(group,'SOLE / 01',-1.2,1.25,4.3,2.4);
      title(group,'SOLE STUDIO',3.5,9.6,4.5);
    }else if(venue.id==='radio'){
      box(group,'Radio_Cabinet',blue,0,4.3,0,12,8,6);box(group,'Radio_Bezel',cream,0,4.5,3.15,11.2,6.8,.3);
      mesh(group,'Radio_Speaker',new T.CylinderGeometry(2.3,2.3,.2,32),ink,-2.3,4.8,3.4).rotation.x=Math.PI/2;
      for(const radius of [2.38,2.53])mesh(group,'Radio_SpeakerRim',new T.TorusGeometry(radius,.045,6,48),copper,-2.3,4.8,3.53);
      for(let line=0;line<9;line++)box(group,'Radio_Grille',copper,-2.3,3.2+line*.4,3.6,3.5,.08,.12);
      box(group,'Radio_Tuner',ink,3.1,6.2,3.42,3.2,1.2,.2);
      for(let tick=0;tick<15;tick++)box(group,'Radio_FrequencyTick',cream,1.74+tick*.19,6.27,3.54,.035,tick%5===0?.36:.18,.02);
      box(group,'Radio_TuningNeedle',rose,3.55,6.3,3.58,.065,.6,.035);
      for(const x of [2,4.2])mesh(group,'Radio_Dial',new T.CylinderGeometry(.57,.57,.5,16),teal,x,4.4,3.6).rotation.x=Math.PI/2;
      for(const x of [2,4.2]){mesh(group,'Radio_DialBezel',new T.TorusGeometry(.6,.045,5,28),copper,x,4.4,3.72);box(group,'Radio_DialIndex',cream,x,4.64,3.88,.065,.24,.025)}
      box(group,'Radio_Door',ink,2.9,1.9,3.45,2.3,3.1,.2);
      const aerial=mesh(group,'Radio_Aerial',new T.CylinderGeometry(.07,.13,7,8),copper,4,11,0);aerial.rotation.z=-.32;
      plate(group,'FREQUENCY HOUSE',-2.2,1.12,3.36,5.1,-3.16);
      title(group,'FREQUENCY HOUSE',-8.6,4.5,4.5);
    }else{
      const paint=venue.id==='books'?blue:venue.id==='juice'?surface('#dfb855'):rose;
      box(group,'Vending_Cabinet',paint,0,2.9,0,3,5.5,2.3);box(group,'Vending_Window',ink,-.4,3.35,1.2,1.6,2.9,.16);
      box(group,'Vending_Crown',cream,0,5.65,0,3.15,.18,2.45);
      for(const side of [-1,1])box(group,'Vending_Trim',copper,side*1.36,2.96,1.2,.035,5.05,.04);
      for(let row=0;row<3;row++)for(let column=0;column<2;column++){
        const product=venue.id==='books'?new T.BoxGeometry(.44,.57,.17):new T.CylinderGeometry(.19,.16,.55,10);
        mesh(group,'Vending_Product',product,venue.id==='juice'?cream:teal,-.84+column*.82,2.5+row*.8,1.34);
      }
      for(let button=0;button<3;button++)mesh(group,'Vending_Button',new T.SphereGeometry(.13,8,6),cream,1,3.8-button*.5,1.3);
      for(let shelf=0;shelf<3;shelf++)box(group,'Vending_Shelf',copper,-.4,2.19+shelf*.8,1.42,1.72,.045,.31);
      plate(group,venue.id==='books'?'PAPERBACK':venue.id==='juice'?'CITRUS':'CLOUD',0,4.99,1.36,2.5,-1.25);
      box(group,'Vending_Tray',ink,0,.9,1.3,2,.65,.5);
      const item=mesh(group,'Dispensed_Item',new T.CylinderGeometry(.23,.19,.6,10),cream,0,1.3,1.65);item.visible=false;dispensed.push({mesh:item,until:0});
      title(group,venue.name.toUpperCase(),-2.7,1.8,2.9);
    }
    if(venue.id==='kettle'||venue.id==='shoe'||venue.id==='radio'){
      const storefront=addShopArchitecture(group,venue.id),wordmark=storefront.getObjectByName('Shop_BuildingWordmark') as T.Mesh<T.PlaneGeometry,T.MeshBasicMaterial>;
      const {x,y,z}=wordmark.position,{width,height}=wordmark.geometry.parameters;
      const displayZ=z+(venue.id==='shoe'?.12:0);
      mountedPlate(storefront,wordmark.name,wordmark.material.map!,x,y,displayZ,width,height,venue.id==='kettle'?-4.61:-displayZ);
      wordmark.removeFromParent();wordmark.geometry.dispose();wordmark.material.dispose();
    }
  });
  const portrait=new T.Group();portrait.name='Pixel_Portrait';portrait.position.set(-24,0,73);root.add(portrait);
  box(portrait,'Portrait_Frame',copper,0,7.2,0,9.1,11.2,.65).userData.cameraSolid=true;
  box(portrait,'Portrait_InnerFrame',ink,0,7.2,.36,8.5,10.6,.2);
  box(portrait,'Portrait_InnerFrame_Back',ink,0,7.2,-.36,8.5,10.6,.2);
  for(const x of [-3,3])box(portrait,'Portrait_Post',ink,x,1.8,0,.3,3.6,.5);
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=1024;const context=canvas.getContext('2d')!;
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.NearestFilter;texture.anisotropy=4;
  createReadableDisplay(portrait,'Portrait_AnimatedCanvas',texture,8,10.2,.9,new T.Vector3(0,7.2,0));
  function paintPortrait(blink:boolean){
    context.fillStyle='#153a53';context.fillRect(0,0,768,1024);
    const pixel=(x:number,y:number,width:number,height:number,color:string)=>{context.fillStyle=color;context.fillRect(x*16,y*16,width*16,height*16)};
    for(let stripe=0;stripe<12;stripe++)pixel(stripe*4,2,2,35,stripe%2?'#1e5063':'#174352');
    pixel(11,29,26,10,'#e7b857');pixel(16,28,16,4,'#c88483');pixel(13,8,22,21,'#c6b3ed');pixel(15,10,18,17,'#dfcef2');
    pixel(12,7,24,6,'#526999');pixel(15,5,18,4,'#7598bf');pixel(12,12,3,6,'#526999');pixel(33,12,3,6,'#526999');
    pixel(17,17,5,blink?1:4,'#f4fbef');pixel(27,17,5,blink?1:4,'#f4fbef');
    if(!blink){pixel(19,18,2,3,'#213645');pixel(28,18,2,3,'#213645')}
    pixel(16,23,4,2,'#cf8b9e');pixel(29,23,4,2,'#cf8b9e');pixel(23,22,2,2,'#b59bcc');
    pixel(21,26,7,speaker.mouth===2?4:speaker.mouth===1?2:1,'#5c3651');if(speaker.mouth){pixel(22,26,5,1,'#fff1db');if(speaker.mouth===2)pixel(23,29,4,1,'#e999a8')}
    pixel(16,33,16,2,'#f8eac2');pixel(21,35,6,3,'#638b9e');
    context.fillStyle='#b0f5df';context.font='900 48px "Trebuchet MS", sans-serif';context.textAlign='center';context.fillText('PIXEL',384,691);
    context.fillStyle='#f0f8ef';context.font='700 30px "Trebuchet MS", sans-serif';let line='',row=0;
    const text=voice.text,excerpt=text.length>180?text.slice(0,177)+'...':text;
    for(const word of excerpt.split(' ')){const next=line?line+' '+word:word;if(line&&context.measureText(next).width>650){context.fillText(line,384,758+row++*42,650);line=word}else line=next}if(line)context.fillText(line,384,758+row*42,650);
    context.fillStyle=voice.speech.snapshot.listening?'#ffcf83':'#99b9c9';context.font='900 22px "Trebuchet MS", sans-serif';context.fillText(voice.status,384,984,650);texture.needsUpdate=true;
  }
  paintPortrait(false);
  batchScenery(root,{portrait,products:dispensed.map(item=>item.mesh)});
  const nearest=()=>player.position.y<3?commonsVenues.find(venue=>Math.hypot(player.position.x-venue.x,player.position.z-(venue.z+venue.depth/2+1))<4.8):undefined;
  function update(dt:number,reduced:boolean,active:boolean){
    available=active;voice.update();clock+=dt;speaker.tick(dt,reduced);
    const blink=!reduced&&clock%6.7<.13,status=voice.status,text=voice.text;if(lastMouth!==speaker.mouth||lastText!==text||lastBlink!==blink||lastStatus!==status){lastMouth=speaker.mouth;lastText=text;lastBlink=blink;lastStatus=status;paintPortrait(blink)}
    dispensed.forEach(item=>{item.mesh.visible=clock<item.until;if(!reduced&&item.mesh.visible)item.mesh.rotation.y+=dt*.7});
  }
  return {root,speaker,voice,portraitCanvas:canvas,update,
    blocked:(x:number,z:number,y:number)=>y<14&&(Math.abs(x+24)<4.9&&Math.abs(z-73)<.8||commonsVenues.some(venue=>Math.abs(x-venue.x)<venue.width/2+.4&&Math.abs(z-venue.z)<venue.depth/2+.4)||y<2.6&&commonsGardens.some(garden=>Math.abs(x-garden.x)<2.1&&Math.abs(z-garden.z)<1.7)),
    prompt:()=>nearPortrait()?voice.prompt:nearest()?'E \u00b7 '+nearest()!.name:null,
    interact:()=>{if(nearPortrait())return voice.interact();const venue=nearest();if(!venue)return false;callbacks.notice(venue.name+': '+venue.message);callbacks.sound();const item=dispensed.find(value=>value.mesh.parent?.name==='Shop_'+venue.id);if(item)item.until=clock+6;return true},
    dispose:()=>{available=false;voice.dispose();speaker.dispose()},
  };
}
