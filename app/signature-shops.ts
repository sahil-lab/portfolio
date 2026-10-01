import * as T from 'three';
import {craftedBox} from './crafted-surfaces';
import {createReadableDisplay} from './readable-display';
import {signatureShops,type ShopTheme} from './everyday-config';
export {signatureShops,type ShopTheme} from './everyday-config';
export function signatureShopForPlanet(planet:string){return signatureShops.find(shop=>shop.planet===planet)??signatureShops[0]}

export function createSignatureShop(name='Loop & Glaze',theme:ShopTheme='donut'){
  const design=signatureShops.find(shop=>shop.theme===theme)!,root=new T.Group(),hero=new T.Group();root.name='Signature_'+theme;root.userData.shopTheme=theme;hero.name=theme==='donut'?'Donut_RooftopSculpture':'Shop_Rooftop_'+theme;hero.position.set(0,7.75,-2);root.add(hero);
  const paint=new T.MeshPhysicalMaterial({color:design.paint,roughness:.62,clearcoat:.18}),ceramic=new T.MeshPhysicalMaterial({color:'#f3ead1',roughness:.55,clearcoat:.25});
  const dough=new T.MeshStandardMaterial({color:'#c99658',roughness:.86}),icing=new T.MeshPhysicalMaterial({color:design.accent,roughness:.36,clearcoat:.55});
  const trim=new T.MeshStandardMaterial({color:'#dcb76b',metalness:.55,roughness:.38}),glass=new T.MeshPhysicalMaterial({color:'#497a82',roughness:.19,metalness:.05,clearcoat:.6,emissive:'#ffd495',emissiveIntensity:.025});glass.userData.surface='glass';glass.userData.nightIllumination=.2;
  const solids:T.Box3[]=[],features:Record<string,number>={};
  function mesh(label:string,geometry:T.BufferGeometry,material:T.Material,position:T.Vector3,parent:T.Object3D=root,solid=false){const object=new T.Mesh(geometry,material);object.name=label;object.position.copy(position);object.castShadow=object.receiveShadow=true;parent.add(object);features[label]=(features[label]??0)+1;if(solid){geometry.computeBoundingBox();solids.push(geometry.boundingBox!.clone().translate(position));object.userData.cameraSolid=true}return object}
  function box(label:string,horizontal:number,height:number,forward:number,width:number,tall:number,depth:number,material:T.Material,solid=false){return mesh(label,craftedBox(width,tall,depth),material,new T.Vector3(horizontal,height,forward),root,solid)}
  box('Shop_CastBody',0,2.5,-2,10,5,7,paint,true);box('Shop_StonePlinth',0,.22,-2,10.35,.44,7.3,ceramic);box('Shop_RoundedCornice',0,5.08,-2,10.65,.35,7.55,ceramic);
  box('Shop_RecessedDoor',0,1.58,1.52,1.65,2.95,.08,glass);box('Shop_DoorHeader',0,3.08,1.62,1.95,.17,.2,trim);
  for(const side of [-1,1]){
    box('Shop_DisplayWindow',side*3.05,1.83,1.52,3.55,2.55,.08,glass);
    for(const edge of [-1,1])box('Shop_WindowJamb',side*3.05+edge*1.82,1.83,1.65,.11,2.75,.22,ceramic);
    box('Shop_WindowSill',side*3.05,.52,1.73,3.8,.14,.48,ceramic);box('Shop_DisplayShelf',side*3.05,1.12,1.74,3.5,.12,.38,trim);
    box('Shop_CornerPilaster',side*4.85,2.5,1.6,.22,4.65,.24,ceramic);
  }
  for(let stripe=0;stripe<16;stripe++){const awning=box('Shop_StripedAwning',-4.7+(stripe+.5)*9.4/16,3.75,2.12,9.4/16,.1,1.3,stripe%2?ceramic:icing);awning.rotation.x=.14;box('Shop_AwningValance',-4.7+(stripe+.5)*9.4/16,3.59,2.77,9.4/16,.25,.07,stripe%2?ceramic:icing)}
  const sculpt=(label:string,geometry:T.BufferGeometry,material:T.Material,position=new T.Vector3())=>mesh(label,geometry,material,position,hero);
  let productGeometry:T.BufferGeometry;
  if(theme==='donut'){
    productGeometry=new T.TorusGeometry(1.65,.6,12,40);sculpt('Donut_GoldenDough',productGeometry,dough);const positions:number[]=[],indices:number[]=[];
    for(let ring=0;ring<=48;ring++)for(let cross=0;cross<=8;cross++){
      const around=ring/48*Math.PI*2,drip=.13*Math.sin(around*7)+.065*Math.sin(around*13),across=-.08+cross/8*(Math.PI+.16)+drip;
      const radius=1.65+.615*Math.cos(across);positions.push(Math.cos(around)*radius,Math.sin(around)*radius,.615*Math.sin(across));
      if(ring<48&&cross<8){const vertex=ring*9+cross;indices.push(vertex,vertex+9,vertex+1,vertex+1,vertex+9,vertex+10)}
    }
    const glaze=new T.BufferGeometry();glaze.setAttribute('position',new T.Float32BufferAttribute(positions,3));glaze.setIndex(indices);glaze.computeVertexNormals();sculpt('Donut_DrippingGlaze',glaze,icing,new T.Vector3(0,0,.015));
    const sprinkles=new T.InstancedMesh(new T.CapsuleGeometry(.025,.12,2,5),new T.MeshStandardMaterial({color:'#ffffff',roughness:.7}),56),pose=new T.Object3D(),colors=['#fff0bd','#77c5ba','#ebbd67','#bd7299'];sprinkles.name='Donut_InstancedSprinkles';
    for(let index=0;index<56;index++){const angle=index*2.3999632297,radius=1.36+(index%5)*.145,offset=radius-1.65;pose.position.set(Math.cos(angle)*radius,Math.sin(angle)*radius,Math.sqrt(.63*.63-offset*offset)+.025);pose.rotation.set(0,0,angle*.7);pose.updateMatrix();sprinkles.setMatrixAt(index,pose.matrix);sprinkles.setColorAt(index,new T.Color(colors[index%colors.length]))}sprinkles.computeBoundingSphere();sprinkles.castShadow=true;hero.add(sprinkles);
  }else if(theme==='pretzel'){
    const path=new T.CatmullRomCurve3([[-.6,-1.1,.2],[-1.9,-.65,0],[-1.7,.9,0],[-.6,1.15,.15],[.65,-.9,.3],[1.85,-.6,0],[1.7,.95,0],[.6,1.2,-.15],[-.65,-.9,-.3]].map(point=>new T.Vector3(...point)),true);
    productGeometry=new T.TubeGeometry(path,80,.33,8,true);sculpt('Pretzel_BraidedLoaf',productGeometry,dough);
    for(let grain=0;grain<18;grain++){const point=path.getPointAt(grain/18);point.z+=.32;sculpt('Pretzel_SaltCrystal',new T.BoxGeometry(.065,.065,.04),ceramic,point)}
    const roof=box('Shop_ButterflyRoof',0,5.35,-2,11,.15,7.8,trim);roof.rotation.z=.035;
  }else if(theme==='gelato'){
    productGeometry=new T.ConeGeometry(1.1,2.8,20).rotateZ(Math.PI);sculpt('Gelato_WaffleCone',productGeometry,dough,new T.Vector3(0,-.7,0));
    for(const [horizontal,height,forward,scale] of [[-.55,.85,0,1.08],[.6,.8,.15,1],[0,1.8,-.1,.85]]){const scoop=sculpt('Gelato_Scoop',new T.SphereGeometry(1,16,12),height>1?ceramic:icing,new T.Vector3(horizontal,height,forward));scoop.scale.setScalar(scale)}
    for(let scallop=0;scallop<8;scallop++){const edge=box('Shop_ScallopedCanopy',-4.2+scallop*1.2,4.05,2.45,1.15,.38,1.4,scallop%2?ceramic:icing);edge.rotation.x=.12}
  }else if(theme==='tea'){
    productGeometry=new T.SphereGeometry(1.55,20,14);const pot=sculpt('Tea_PorcelainPot',productGeometry,ceramic);pot.scale.set(1,.78,.85);
    sculpt('Tea_PotLid',new T.CylinderGeometry(.85,1,.18,20),icing,new T.Vector3(0,1.12,0));sculpt('Tea_LidKnob',new T.SphereGeometry(.2,10,8),trim,new T.Vector3(0,1.38,0));
    sculpt('Tea_LoopHandle',new T.TorusGeometry(.83,.15,8,28),trim,new T.Vector3(-1.6,.1,0));
    sculpt('Tea_CurvedSpout',new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(1,0,0),new T.Vector3(1.8,.25,0),new T.Vector3(2.3,.9,0)]),22,.21,10,false),ceramic);
    const roofShape=new T.Shape();roofShape.moveTo(-5.4,0);roofShape.lineTo(0,1.5);roofShape.lineTo(5.4,0);roofShape.closePath();mesh('Shop_FoldedGable',new T.ExtrudeGeometry(roofShape,{depth:7.4,bevelEnabled:false}),icing,new T.Vector3(0,5.15,-5.7));hero.position.y=9.5;
  }else if(theme==='tart'){
    productGeometry=new T.CylinderGeometry(1.85,1.55,.72,24);sculpt('Tart_FlutedCrust',productGeometry,dough,new T.Vector3(0,-.45,0));sculpt('Tart_Custard',new T.CylinderGeometry(1.65,1.65,.12,24),ceramic,new T.Vector3(0,-.04,0));
    for(let fruit=0;fruit<9;fruit++){const angle=fruit/9*Math.PI*2,berry=sculpt('Tart_FruitCrown',new T.SphereGeometry(.39,10,8),icing,new T.Vector3(Math.cos(angle)*1.16,.3,Math.sin(angle)*1.16));berry.scale.y=1.25}
    for(let petal=0;petal<8;petal++){const angle=petal/8*Math.PI*2,roof=mesh('Shop_PetalRoof',new T.SphereGeometry(1,12,8),petal%2?icing:ceramic,new T.Vector3(Math.cos(angle)*3.2,5.3,-2+Math.sin(angle)*2.2));roof.scale.set(2,.35,1.8);roof.rotation.y=-angle}hero.position.y=7;
  }else if(theme==='coffee'){
    productGeometry=new T.LatheGeometry([[0,-1.5],[.95,-1.5],[1.25,1.05],[1.4,1.05],[1.4,1.28],[0,1.28]].map(([radius,height])=>new T.Vector2(radius,height)),24);sculpt('Coffee_TakeawayCup',productGeometry,ceramic);
    sculpt('Coffee_InsulatingSleeve',new T.CylinderGeometry(1.17,1.06,1.05,24),icing,new T.Vector3(0,-.1,0));sculpt('Coffee_FittedLid',new T.CylinderGeometry(1.48,1.52,.24,24),trim,new T.Vector3(0,1.33,0));hero.rotation.z=-.15;
    const dome=mesh('Shop_CafeDome',new T.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI/2),paint,new T.Vector3(0,5.15,-2));dome.scale.set(4.8,1.25,3.6);hero.position.y=8.15;
  }else if(theme==='cotton'){
    productGeometry=new T.ConeGeometry(.65,2.7,14).rotateZ(Math.PI);sculpt('Cotton_PaperCone',productGeometry,ceramic,new T.Vector3(0,-1.15,0));
    for(let puff=0;puff<7;puff++){const angle=puff*2.399,cloud=sculpt('Cotton_SpunSugar',new T.SphereGeometry(1,14,10),puff%2?icing:ceramic,new T.Vector3(Math.cos(angle)*.6,.25+puff*.21,Math.sin(angle)*.45));cloud.scale.set(.95,1.05,.83)}
    for(const side of [-1,1]){const tower=mesh('Shop_RoundedTower',new T.CylinderGeometry(1.25,1.25,5.4,20),ceramic,new T.Vector3(side*4.5,2.7,-2));solids.push(new T.Box3().setFromObject(tower));mesh('Shop_TowerCap',new T.SphereGeometry(1.3,16,10,0,Math.PI*2,0,Math.PI/2),icing,new T.Vector3(side*4.5,5.4,-2))}
  }else if(theme==='prism'){
    productGeometry=new T.CylinderGeometry(1.12,1.12,3.4,12);const telescope=sculpt('Optics_Telescope',productGeometry,icing);telescope.rotation.z=-.55;
    const lens=sculpt('Optics_Lens',new T.CylinderGeometry(1.04,1.04,.08,24),glass,new T.Vector3(.91,1.49,0));lens.rotation.z=-.55;
    for(const side of [-1,1]){const crystal=mesh('Shop_PrismaticPier',new T.CylinderGeometry(.95,.95,5.9,3),icing,new T.Vector3(side*4.6,3,-2));crystal.rotation.y=Math.PI/6}
    const roof=box('Shop_OpticsRoof',0,5.4,-2,10.8,.18,7.6,trim);roof.rotation.z=-.08;
  }else if(theme==='glider'){
    productGeometry=new T.CapsuleGeometry(.28,3.6,4,12);const fuselage=sculpt('Glider_Fuselage',productGeometry,ceramic);fuselage.rotation.x=Math.PI/2;
    const wingShape=new T.Shape();wingShape.moveTo(-2.8,-.5);wingShape.lineTo(0,.55);wingShape.lineTo(2.8,-.5);wingShape.lineTo(0,-.15);wingShape.closePath();const wing=sculpt('Glider_FoldedWing',new T.ExtrudeGeometry(wingShape,{depth:.065,bevelEnabled:false}),icing);wing.rotation.x=Math.PI/2;
    const tail=sculpt('Glider_Tailplane',new T.BoxGeometry(1.45,.06,.58),trim,new T.Vector3(0,.14,-1.75));tail.rotation.z=.1;
    for(const side of [-1,1]){const roof=box('Shop_HangarRoof',side*2.7,5.4,-2,5.6,.18,7.8,side<0?ceramic:icing);roof.rotation.z=-side*.1}hero.rotation.z=-.12;
  }else{
    const shape=new T.Shape();shape.moveTo(0,2);shape.lineTo(1.4,.3);shape.lineTo(0,-1.8);shape.lineTo(-1.4,.3);shape.closePath();productGeometry=new T.ExtrudeGeometry(shape,{depth:.085,bevelEnabled:true,bevelSize:.03,bevelThickness:.025,bevelSegments:1});sculpt('Kite_FoldedSail',productGeometry,icing);
    sculpt('Kite_VerticalSpar',new T.CylinderGeometry(.025,.025,3.85,8),trim,new T.Vector3(0,.08,.13));sculpt('Kite_CrossSpar',new T.CylinderGeometry(.025,.025,2.7,8).rotateZ(Math.PI/2),trim,new T.Vector3(0,.3,.13));
    const ribbon=new T.CatmullRomCurve3([new T.Vector3(0,-1.8,0),new T.Vector3(.5,-2.1,.1),new T.Vector3(-.4,-2.35,.05),new T.Vector3(.15,-2.65,.1)]);sculpt('Kite_RibbonTail',new T.TubeGeometry(ribbon,24,.05,5,false),ceramic);
    for(const side of [-1,1]){const roof=box('Shop_SailCanopy',side*2.7,5.3,-2,5.7,.14,7.9,side<0?icing:ceramic);roof.rotation.z=side*.12}
  }
  features['Shop_Signature_'+theme]=1;
  hero.updateWorldMatrix(true,true);
  const supportSpan=theme==='donut'||theme==='pretzel'?1.1:theme==='tea'||theme==='tart'?.8:theme==='coffee'?.65:.18,supportForward=theme==='prism'?-1.8:-2;
  for(const side of [-1,1]){const horizontal=side*supportSpan,contact=new T.Raycaster(new T.Vector3(horizontal,0,supportForward),new T.Vector3(0,1,0)).intersectObject(hero,true)[0],top=contact?.point.y??5.5;box('Shop_SculptureSupport',horizontal,(5.08+top)/2,supportForward,.14,Math.max(.3,top-5.08+.1),.2,trim)}
  for(const side of [-1,1])for(let pastry=0;pastry<4;pastry++){
    const item=mesh('Shop_DisplayProduct',productGeometry,theme==='donut'||theme==='pretzel'?dough:icing,new T.Vector3(side*3.05-.95+pastry*.63,1.36,1.87));item.scale.setScalar(.115);
  }
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=192;const context=canvas.getContext('2d')!;context.fillStyle='#f3ead1';context.fillRect(0,0,1024,192);context.fillStyle='#63344b';context.textAlign='center';context.textBaseline='middle';context.font='700 86px "Space Grotesk", sans-serif';context.fillText(name.toUpperCase(),512,98,940);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;createReadableDisplay(root,'Shop_Nameplate',texture,8.2,1.15,.2,new T.Vector3(0,4.46,1.7));
  for(const object of root.children)if(object!==hero){object.position.x*=design.width;object.position.y*=design.height;object.scale.x*=design.width;object.scale.y*=design.height}
  for(const solid of solids)solid.applyMatrix4(new T.Matrix4().makeScale(design.width,design.height,1));hero.position.y*=design.height;hero.scale.set(design.width,design.height,1);
  let selection=0,time=0;const flavors=[{name:'strawberry circuit',color:design.accent},{name:'mint cloud',color:'#86caba'},{name:'sunrise lemon',color:'#ecd078'}];
  return {root,hero,solids,features,theme,interact:()=>{selection=(selection+1)%flavors.length;icing.color.set(flavors[selection].color);return theme==='donut'?`${name}: ${flavors[selection].name} glaze is now on display.`:`${name}: display collection ${selection+1} is now featured.`},update:(delta:number,reduced:boolean)=>{time+=reduced?0:Math.max(0,Math.min(delta,.05));hero.rotation.y=reduced?0:Math.sin(time*.35)*.055}};
}
