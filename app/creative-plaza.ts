import * as T from 'three';
import {craftedBox,createCraftMaterials} from './crafted-surfaces';
import {createWoodenSign} from './wooden-sign';
import {PortraitSpeaker} from './portrait-speaker';
import {PaintingInteraction} from './painting-interaction';
import {batchScenery} from './static-batching';

export const commonsSpawn={x:0,y:.8,z:98};
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
  const ink=surface('#243942'),cream=surface('#e3eadb'),copper=surface('#c19058',0,.45),teal=surface('#4da89a'),rose=surface('#d77d99'),blue=surface('#628ec2');
  const speaker=new PortraitSpeaker(callbacks.subtitle);let clock=0,lastMouth=-1,lastText='',lastBlink=false,lastStatus='';const dispensed:{mesh:T.Object3D;until:number}[]=[];
  let available=true;
  const nearPortrait=()=>player.position.y>=0&&player.position.y<3&&player.position.z>73.8&&Math.hypot(player.position.x+24,player.position.z-77)<6;
  const voice=new PaintingInteraction(speaker,{available:()=>available&&nearPortrait()&&globalThis.document?.hidden!==true,enableVoice:()=>{if(callbacks.enableVoice)callbacks.enableVoice();else speaker.sound(true)},notice:callbacks.notice,clearCaption:()=>callbacks.subtitle('')});
  function mesh(parent:T.Object3D,name:string,geometry:T.BufferGeometry,material:T.Material,x=0,y=0,z=0){const object=new T.Mesh(geometry,material);object.name=name;object.position.set(x,y,z);object.castShadow=true;object.receiveShadow=true;object.userData.cameraSolid=/^(Kettle_Body|Sneaker_Upper|Radio_Cabinet|Vending_Cabinet)$/.test(name);parent.add(object);return object}
  function box(parent:T.Object3D,name:string,material:T.Material,x:number,y:number,z:number,width:number,height:number,depth:number){return mesh(parent,name,craftedBox(width,height,depth),material,x,y,z)}
  function title(parent:T.Object3D,text:string,x:number,z:number,width=3.8){const sign=createWoodenSign(text,{width,height:1.7,shape:'arch'});sign.position.set(x,.2,z);parent.add(sign)}
  box(root,'Commons_Boulevard',cream,0,.03,91,7,.13,91);
  for(const z of [73,89,106,126])box(root,'Commons_Crosswalk',cream,-2,.035,z,81,.14,3.8);
  for(let index=0;index<18;index++){const z=53+index*4.7;box(root,'Commons_Path_Inlay',teal,0,.12,z,.2,.035,1.4)}
  for(const side of [-1,1])for(const z of [55,81,97,119,137]){
    const x=side*7.3;mesh(root,'Commons_Lamppost',new T.CylinderGeometry(.09,.16,4.2,8),ink,x,2.1,z);
    mesh(root,'Commons_Lamp',new T.SphereGeometry(.36,12,8),new T.MeshStandardMaterial({color:'#fff0c0',emissive:'#ffdea0',emissiveIntensity:.7}),x,4.25,z);
  }
  const direction=createWoodenSign('WEATHER & COMMONS',{width:4,height:1.5,shape:'arrow'});direction.position.set(7,.15,49);root.add(direction);
  commonsVenues.forEach(venue=>{
    const group=new T.Group();group.name='Shop_'+venue.id;group.position.set(venue.x,0,venue.z);root.add(group);
    box(group,'Shop_Foundation',ink,0,.18,0,venue.width,.4,venue.depth);
    if(venue.id==='kettle'){
      const body=mesh(group,'Kettle_Body',new T.SphereGeometry(5.4,32,20),teal,0,5,0);body.scale.set(1,1,.85);
      mesh(group,'Kettle_Lid',new T.CylinderGeometry(3.1,3.8,.6,32),copper,0,10,0);mesh(group,'Kettle_Knob',new T.SphereGeometry(.7,16,10),ink,0,10.8,0);
      const handle=mesh(group,'Kettle_Handle',new T.TorusGeometry(3.1,.5,10,32,Math.PI*1.65),copper,-5,5.3,0);handle.rotation.z=2.1;
      const spout=new T.CatmullRomCurve3([new T.Vector3(3.8,4,0),new T.Vector3(6.4,4.7,0),new T.Vector3(7.9,7.4,0)]);
      mesh(group,'Kettle_Spout',new T.TubeGeometry(spout,16,.78,12,false),copper);
      box(group,'Kettle_Door',ink,0,2.2,4.35,2.7,3.9,.25);
      for(const side of [-1,1]){const window=mesh(group,'Kettle_Window',new T.TorusGeometry(.85,.16,8,24),cream,side*3,5.3,3.85);window.rotation.y=side*.45;mesh(group,'Kettle_WindowGlass',new T.CircleGeometry(.77,24),blue,side*3,5.3,3.95)}
      title(group,'THE COPPER KETTLE',-5.9,7.9,4.5);
    }else if(venue.id==='shoe'){
      const shape=new T.Shape();shape.moveTo(-6.2,.7);shape.lineTo(6.4,.7);shape.quadraticCurveTo(7.7,1.1,6.5,3);shape.quadraticCurveTo(5.3,4.4,1.6,4.7);shape.lineTo(-.6,8.9);shape.quadraticCurveTo(-3.5,10.2,-5.7,8.5);shape.lineTo(-6.5,2);shape.closePath();
      const geometry=new T.ExtrudeGeometry(shape,{depth:7,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.2,bevelThickness:.2});geometry.translate(0,0,-3.5);
      mesh(group,'Sneaker_Upper',geometry,rose);box(group,'Sneaker_Sole',cream,0,.8,0,14,1.2,8.3);
      for(let stripe=0;stripe<5;stripe++){const lace=box(group,'Sneaker_Lace',cream,-1+stripe*.85,7.9-stripe*.62,3.76,2.7,.23,.3);lace.rotation.z=-.35}
      box(group,'Sneaker_Door',ink,-3.8,2.5,3.85,2.5,3.5,.2);
      for(const x of [1.9,4.5])box(group,'Sneaker_Window',blue,x,2.9,3.88,1.6,1.4,.22);
      title(group,'SOLE STUDIO',3.5,9.6,4.5);
    }else if(venue.id==='radio'){
      box(group,'Radio_Cabinet',blue,0,4.3,0,12,8,6);box(group,'Radio_Bezel',cream,0,4.5,3.15,11.2,6.8,.3);
      mesh(group,'Radio_Speaker',new T.CylinderGeometry(2.3,2.3,.2,32),ink,-2.3,4.8,3.4).rotation.x=Math.PI/2;
      for(let line=0;line<9;line++)box(group,'Radio_Grille',copper,-2.3,3.2+line*.4,3.6,3.5,.08,.12);
      box(group,'Radio_Tuner',ink,3.1,6.2,3.42,3.2,1.2,.2);
      for(const x of [2,4.2])mesh(group,'Radio_Dial',new T.CylinderGeometry(.57,.57,.5,16),teal,x,4.4,3.6).rotation.x=Math.PI/2;
      box(group,'Radio_Door',ink,2.9,1.9,3.45,2.3,3.1,.2);
      const aerial=mesh(group,'Radio_Aerial',new T.CylinderGeometry(.07,.13,7,8),copper,4,11,0);aerial.rotation.z=-.32;
      title(group,'FREQUENCY HOUSE',-5,6.4,4.5);
    }else{
      const paint=venue.id==='books'?blue:venue.id==='juice'?surface('#dfb855'):rose;
      box(group,'Vending_Cabinet',paint,0,2.9,0,3,5.5,2.3);box(group,'Vending_Window',ink,-.4,3.35,1.2,1.6,2.9,.16);
      for(let row=0;row<3;row++)for(let column=0;column<2;column++){
        const product=venue.id==='books'?new T.BoxGeometry(.44,.57,.17):new T.CylinderGeometry(.19,.16,.55,10);
        mesh(group,'Vending_Product',product,venue.id==='juice'?cream:teal,-.84+column*.82,2.5+row*.8,1.34);
      }
      for(let button=0;button<3;button++)mesh(group,'Vending_Button',new T.SphereGeometry(.13,8,6),cream,1,3.8-button*.5,1.3);
      box(group,'Vending_Tray',ink,0,.9,1.3,2,.65,.5);
      const item=mesh(group,'Dispensed_Item',new T.CylinderGeometry(.23,.19,.6,10),cream,0,1.3,1.65);item.visible=false;dispensed.push({mesh:item,until:0});
      title(group,venue.name.toUpperCase(),-2.7,1.8,2.9);
    }
  });
  const portrait=new T.Group();portrait.name='Pixel_Portrait';portrait.position.set(-24,0,73);root.add(portrait);
  box(portrait,'Portrait_Frame',copper,0,7.2,0,9.1,11.2,.65).userData.cameraSolid=true;
  box(portrait,'Portrait_InnerFrame',ink,0,7.2,.36,8.5,10.6,.2);
  for(const x of [-3,3])box(portrait,'Portrait_Post',ink,x,1.8,0,.3,3.6,.5);
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=1024;const context=canvas.getContext('2d')!;
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.NearestFilter;texture.anisotropy=4;
  mesh(portrait,'Portrait_AnimatedCanvas',new T.PlaneGeometry(8,10.2),new T.MeshBasicMaterial({map:texture,toneMapped:false}),0,7.2,.49);
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
    blocked:(x:number,z:number,y:number)=>y<14&&(Math.abs(x+24)<4.9&&Math.abs(z-73)<.8||commonsVenues.some(venue=>Math.abs(x-venue.x)<venue.width/2+.4&&Math.abs(z-venue.z)<venue.depth/2+.4)),
    prompt:()=>nearPortrait()?voice.prompt:nearest()?'E \u00b7 '+nearest()!.name:null,
    interact:()=>{if(nearPortrait())return voice.interact();const venue=nearest();if(!venue)return false;callbacks.notice(venue.name+': '+venue.message);callbacks.sound();const item=dispensed.find(value=>value.mesh.parent?.name==='Shop_'+venue.id);if(item)item.until=clock+6;return true},
    dispose:()=>{available=false;voice.dispose();speaker.dispose()},
  };
}
