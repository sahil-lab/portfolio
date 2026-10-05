import * as T from 'three';
import {architectureProfiles,architectureRecipe,type ArchitectureStyle} from './architecture-profiles';
import {architectureMaterials,createCraftedBuilding,bakeArchitecture} from './building-craft';
import {createWoodenSign} from './wooden-sign';
import {batchScenery} from './static-batching';
import {createCivicKit} from './civic-kit';
import {createCapitalFountain} from './capital-fountain';
import {rampHeight,type Ramp} from './traversal';
import {createSpatialIndex} from './spatial-index';
import {cacheStaticTransforms} from './static-transforms';
import {createSignatureShop,signatureShops,type ShopTheme} from './signature-shops';
import {createTetheredBalloon} from './storybook-street';
import {craftedBox} from './crafted-surfaces';
import {createPocketGarden} from './city-gardens';
import {craftGeometry,type CraftPart} from './craft-kit';

const venueProfiles:Partial<Record<string,CraftPart>>={Park_BenchSlat:'BenchSlat',Park_BenchBack:'BenchBack',Park_BenchLeg:'BenchFoot',Park_BenchBackPost:'BenchBack',Park_BenchBrace:'BenchSlat',Park_BenchArm:'BenchSlat',Park_BenchArmPost:'BenchSlat',PublicPlace_Lantern:'Lantern',Playground_TowerRoof:'PlayRoof',Playground_SwingSeat:'BenchSlat',Playground_SeesawSeat:'BenchSlat',Playground_Sandbox:'FlowerBedRim',Mall_AtriumCanopy:'MallCanopy',Mall_ShopAwning:'MarketCanopy',Mall_StreetAwning:'MarketCanopy',Mall_CafeTable:'TableTop',Mall_CafeSeat:'BenchSlat',Mall_CafeSeatLeg:'BenchBack',Mall_CafeSeatBack:'BenchBack',Market_Counter:'TicketBooth',Market_RoundedCanopy:'MarketCanopy',Sports_Backboard:'PlaqueBacking',Cinema_Marquee:'MetroRoof',Cinema_TicketBooth:'TicketBooth',School_Bell:'Bell',Library_OutdoorShelf:'ShelfCarcass',Clinic_ReceptionCanopy:'MarketCanopy'};

export {everydayKinds,everydayPlaceNames,cityEverydaySites,everydayFootprint,type EverydayKind,type CityEverydayId} from './everyday-config';
import {everydayPlaceNames,everydayFootprint,signatureShopScale,type EverydayKind} from './everyday-config';

export function createEverydayPlace(options:{kind:EverydayKind;style:ArchitectureStyle;address:string;name?:string;shopTheme?:ShopTheme;ground?:(point:T.Vector3)=>number}){
 const {kind,style,address}=options,recipe=architectureRecipe(style,address),name=options.name??everydayPlaceNames[kind],profile=architectureProfiles[style],material=architectureMaterials(style),{width,depth}=everydayFootprint(kind);
 const root=new T.Group();root.name='Everyday_'+address;root.userData.placeKind=kind;root.userData.architectureStyle=style;root.userData.architectureRecipe=recipe;
 const fixed=new T.Group(),moving=new T.Group();fixed.name='Everyday_StaticCraft';moving.name='Everyday_ActiveProps';root.add(fixed,moving);
 const solids:T.Box3[]=[],features:Record<string,number>={},motions:{object:T.Object3D;axis:'x'|'y'|'z';amplitude:number;speed:number;rest:number}[]=[];
 const turf=new T.MeshStandardMaterial({color:profile.leaf,roughness:1});
 const paving=material.stone.clone();paving.color.lerp(new T.Color(profile.wall),.18);paving.roughness=.94;
 if(kind==='shop')paving.color.set('#849795');
 paving.userData.cityPaving=true;
 const civic=createCivicKit();civic.materials.stone.color.set(profile.stone);civic.materials.brass.color.set(profile.metal);civic.materials.leaf.color.set(profile.leaf);civic.materials.wood.color.set(profile.wood);
 const ramps:Ramp[]=[],decks:{x:number;z:number;width:number;depth:number;y:number}[]=[],fountains:ReturnType<typeof createCapitalFountain>[]=[],steam:T.Points[]=[];
 let film:{texture:T.CanvasTexture;paint:(time:number)=>void}|null=null,lastFilmFrame=-1;
 let signature:ReturnType<typeof createSignatureShop>|null=null;
 let balloon:ReturnType<typeof createTetheredBalloon>|null=null;
 let time=0,activeUntil=0,visits=0;
 function mesh(part:string,geometry:T.BufferGeometry,finish:T.Material,x:number,y:number,z:number,parent:T.Object3D=fixed,solid=false){
  const profile=venueProfiles[part];if(profile&&!geometry.userData.authoredCraft){geometry.computeBoundingBox();const bounds=geometry.boundingBox!,size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),authored=craftGeometry(profile,size.x,size.y,size.z);if(authored){authored.translate(center.x,center.y,center.z);geometry.dispose();geometry=authored}}
  const surface=finish as T.MeshStandardMaterial;if(surface.isMeshStandardMaterial&&!surface.vertexColors){surface.vertexColors=true;surface.needsUpdate=true}if(surface.vertexColors&&!geometry.attributes.color)geometry.setAttribute('color',new T.BufferAttribute(new Float32Array(geometry.attributes.position.count*3).fill(1),3));if(geometry.userData.authoredCraft){surface.userData.authoredCraft=true;const parts:string[]=root.userData.craftParts??=[];if(!parts.includes(geometry.userData.authoredCraft))parts.push(geometry.userData.authoredCraft)}
  const object=new T.Mesh(geometry,finish);object.name=part;object.position.set(x,y,z);object.castShadow=object.receiveShadow=true;parent.add(object);features[part]=(features[part]??0)+1;
  if(solid){geometry.computeBoundingBox();solids.push(geometry.boundingBox!.clone().translate(object.position));object.userData.cameraSolid=true}return object;
 }
 function box(part:string,x:number,y:number,z:number,w:number,h:number,d:number,finish:T.Material,parent:T.Object3D=fixed,solid=false){const profile=venueProfiles[part],fitted=kind==='shop'&&options.ground&&['PublicPlace_Ground','PublicPlace_Walkway','PublicPlace_Border'].includes(part);return mesh(part,fitted?new T.BoxGeometry(w,h,d,Math.ceil(w/2),1,Math.ceil(d/2)):(profile?craftGeometry(profile,w,h,d):null)??craftedBox(w,h,d),finish,x,y,z,parent,solid)}
 function beam(part:string,from:T.Vector3,to:T.Vector3,finish:T.Material,radius=.085,parent:T.Object3D=fixed){const offset=to.clone().sub(from),object=mesh(part,new T.CylinderGeometry(radius,radius,offset.length(),8),finish,0,0,0,parent);object.position.copy(from).add(to).multiplyScalar(.5);object.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),offset.normalize());return object}
 function bench(x:number,z:number,yaw=0){
  const group=new T.Group();group.position.set(x,0,z);group.rotation.y=yaw;fixed.add(group);
  for(let slat=0;slat<4;slat++)box('Park_BenchSlat',0,.8,-.3+slat*.19,2.6,.1,.15,material.wood,group);
  for(let slat=0;slat<3;slat++)box('Park_BenchBack',0,1.12+slat*.18,-.45,2.6,.12,.1,material.wood,group);
  for(const side of [-1,1]){box('Park_BenchLeg',side*.95,.4,0,.13,.8,.65,material.metal,group);box('Park_BenchArm',side*1.2,1.1,0,.07,.065,.8,material.metal,group)}
  for(const side of [-1,1]){box('Park_BenchBackPost',side*.95,1.14,-.51,.12,.9,.1,material.metal,group);box('Park_BenchBrace',side*.95,.73,-.25,.12,.08,.5,material.metal,group);box('Park_BenchArmPost',side*1.2,.95,.23,.055,.32,.055,material.metal,group)}
  group.updateMatrix();solids.push(new T.Box3(new T.Vector3(-1.4,0,-.58),new T.Vector3(1.4,1.65,.55)).applyMatrix4(group.matrix));
 }
 function tree(x:number,z:number,height=4.8){
    civic.tree(fixed,x,z,style==='petal'?'blossom':height>5.3?'column':'shade',Math.round(height*9+recipe.rhythm*13));features.Park_TreeCanopy=(features.Park_TreeCanopy??0)+1;
 }
 function building(label:string,x:number,z:number,w:number,d:number,height:number,yaw=0){
  const building=createCraftedBuilding({style,address:address+'/'+label,width:w,depth:d,height,materials:material,stairs:false});
  const bounds=new T.Box3().setFromObject(building.root);const skins=bakeArchitecture(building.root);
  for(const skin of skins){if(!skin.geometry.attributes.color)skin.geometry.setAttribute('color',new T.BufferAttribute(new Float32Array(skin.geometry.attributes.position.count*3).fill(1),3));const part=new T.Mesh(skin.geometry,skin.material);part.name='Everyday_CraftedBuilding';part.castShadow=part.receiveShadow=true;building.root.add(part)}
  building.root.position.set(x,.13,z);building.root.rotation.y=yaw;building.root.updateMatrix();fixed.add(building.root);solids.push(bounds.applyMatrix4(building.root.matrix));return building.root;
 }
 function placard(label:string,x:number,z:number,w=4,parent:T.Object3D=fixed){const sign=createWoodenSign(label,{width:Math.min(w,4.8),height:.9,shape:'arch'});sign.position.set(x,.12,z);parent.add(sign);sign.updateMatrixWorld(true);solids.push(new T.Box3().setFromObject(sign));return sign}
 if(!(kind==='shop'&&options.shopTheme==='pretzel')){
 box('PublicPlace_Ground',0,-.065,0,width,.12,depth,kind==='park'||kind==='playground'?turf:paving);
 box('PublicPlace_Walkway',0,.018,1.2,4,.04,depth-2.4,paving);
 for(const side of [-1,1]){
  box('PublicPlace_Border',side*(width/2-.1),.03,0,.14,.1,depth,material.metal);
  const lampZ=depth/2-(kind==='shop'?6*signatureShopScale:2);mesh('PublicPlace_LampPost',new T.CylinderGeometry(.11,.17,2.35,10),material.metal,side*(width/2-1.5),1.175,lampZ,fixed,true);mesh('PublicPlace_Lantern',craftedBox(.5,.62,.5),material.stone,side*(width/2-1.5),2.5,lampZ);
 }
 placard(name,-width*.25,depth/2-(kind==='shop'?4*signatureShopScale:.8),Math.min(5.5,width*.38));
 }
 if(kind==='park'){
  for(const [x,z] of [[-8,-5],[8,-5],[-8,5],[8,5]])tree(x,z,4+recipe.rhythm*2);
  for(const side of [-1,1])bench(side*5.8,1.5,-side*Math.PI/2);
    const fountain=createCapitalFountain('garden');fountain.root.position.set(0,0,-4);fountain.water.color.set(profile.glass);moving.add(fountain.root);fountains.push(fountain);features.Park_FountainBasin=1;
    solids.push(new T.Box3(new T.Vector3(-3.3,0,-7.3),new T.Vector3(3.3,1.1,-.7)));
    const path=new T.CatmullRomCurve3([[-6,-6],[0,-8],[6,-6],[8,0],[6,6],[0,7],[-6,6],[-8,0]].map(([x,z])=>new T.Vector3(x,.045,z)),true),positions:number[]=[],indices:number[]=[];
    for(let index=0;index<=96;index++){const point=path.getPointAt(index/96),tangent=path.getTangentAt(index/96),side=new T.Vector3(-tangent.z,0,tangent.x);for(const sign of [-1,1])positions.push(...point.clone().addScaledVector(side,sign*.75).toArray());if(index<96){const vertex=index*2;indices.push(vertex,vertex+2,vertex+1,vertex+1,vertex+2,vertex+3)}}
    const pathGeometry=new T.BufferGeometry();pathGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));pathGeometry.setAttribute('uv',new T.Float32BufferAttribute(Array.from({length:positions.length/3},(_,index)=>[positions[index*3]/10,positions[index*3+2]/10]).flat(),2));pathGeometry.setIndex(indices);pathGeometry.computeVertexNormals();mesh('Park_CurvedWalkingLoop',pathGeometry,paving,0,0,0);
    for(const side of [-1,1]){civic.flowers(fixed,side*9.8,0,1.2,7,side);civic.lamp(fixed,side*10,7,'park');civic.flowers(fixed,side*4,-8.7,3.4,.8,side+2)}
    civic.utilities(fixed,10,-7);features.Park_CurvedWalkingLoop=1;
 }else if(kind==='playground'){
  const rubber=new T.MeshStandardMaterial({color:'#d59479',roughness:.97});box('Playground_SoftSurface',0,.03,-1,16,.07,12,rubber);
  const tower=new T.Group();tower.position.set(-4,0,-4);fixed.add(tower);
  for(const side of [-1,1])for(const back of [-1,1])box('Playground_ClimbingPost',side*.9,1.45,back*.9,.15,2.9,.15,material.wood,tower);
  box('Playground_TowerDeck',0,2.15,0,2.4,.18,2.4,material.stone,tower);const playRoof=mesh('Playground_TowerRoof',new T.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2),material.wall,0,2.94,0,tower);playRoof.scale.set(1.7,.65,1.7);
  for(let rung=0;rung<8;rung++)box('Playground_LadderRung',0,.2+rung*.27,-1.11,.85,.09,.12,material.metal,tower);
  const slideCurve=new T.CatmullRomCurve3([new T.Vector3(-4,2.18,-2.8),new T.Vector3(-4,1.5,-.8),new T.Vector3(-4,.4,1.5),new T.Vector3(-4,.24,2.8)]);
    const slidePositions:number[]=[],slideIndices:number[]=[];
    for(let section=0;section<=32;section++){const point=slideCurve.getPoint(section/32);for(let edge=0;edge<9;edge++){const across=-1+edge/4;slidePositions.push(point.x+across*.5,point.y+Math.pow(Math.abs(across),4)*.33,point.z)}if(section<32)for(let edge=0;edge<8;edge++){const vertex=section*9+edge;slideIndices.push(vertex,vertex+9,vertex+1,vertex+1,vertex+9,vertex+10)}}
    const slideGeometry=new T.BufferGeometry();slideGeometry.setAttribute('position',new T.Float32BufferAttribute(slidePositions,3));slideGeometry.setIndex(slideIndices);slideGeometry.computeVertexNormals();const slideFinish=material.metal.clone();slideFinish.side=T.DoubleSide;mesh('Playground_CurvedSlide',slideGeometry,slideFinish,0,0,0);features.Playground_CurvedSlide=1;
    for(const side of [-1,1]){const cable=slideCurve.getPoints(32).map(point=>point.clone().add(new T.Vector3(side*.53,.34,0)));mesh('Playground_RibbonCableEdge',new T.TubeGeometry(new T.CatmullRomCurve3(cable),32,.035,5,false),material.wall,0,0,0)}
  for(const side of [-1,1])for(const back of [-1,1])beam('Playground_SwingAFrame',new T.Vector3(4+side*1.9,.08,-3+back*1.35),new T.Vector3(4+side*1.9,3.6,-3),material.wood,.12);
  beam('Playground_SwingCrossbar',new T.Vector3(2,3.6,-3),new T.Vector3(6,3.6,-3),material.metal,.12);
  const swing=new T.Group();swing.name='Playground_WorkingSwing';swing.position.set(4,3.55,-3);moving.add(swing);
  for(const side of [-1,1])beam('Playground_SwingChain',new T.Vector3(side*.52,0,0),new T.Vector3(side*.52,-2.6,0),material.metal,.025,swing);
  box('Playground_SwingSeat',0,-2.6,0,1.3,.13,.65,material.wood,swing);motions.push({object:swing,axis:'x',amplitude:.48,speed:2.3,rest:0});
  const seesaw=new T.Group();seesaw.name='Playground_Seesaw';seesaw.position.set(3,.8,3.5);moving.add(seesaw);box('Playground_SeesawBeam',0,0,0,4.8,.15,.48,material.wall,seesaw);for(const side of [-1,1])box('Playground_SeesawSeat',side*1.95,.13,0,.75,.12,.66,material.stone,seesaw);motions.push({object:seesaw,axis:'z',amplitude:.16,speed:1.6,rest:0});
  mesh('Playground_SeesawPivot',new T.ConeGeometry(.6,.9,4),material.wood,3,.44,3.5);bench(-7,5.5);
    const sandbox=box('Playground_Sandbox',-1,.15,4,3.8,.3,2.3,material.wood),nativeSandbox=!!sandbox.geometry.userData.authoredCraft;box('Playground_Sand',-1,nativeSandbox?.255:.32,4,nativeSandbox?2.75:3.55,.035,nativeSandbox?1.67:2.05,new T.MeshStandardMaterial({color:'#e4d8b1',roughness:1}));
    for(const side of [-1,1]){tree(side*8,-7,4.5);civic.flowers(fixed,side*8,1,1.1,5.4,side)}
  solids.push(new T.Box3(new T.Vector3(-5.3,0,-5.3),new T.Vector3(-2.7,2.3,-2.7)));
 }else if(kind==='mall'){
  building('west-shops',-8,-2.5,7.8,7.2,7.6,Math.PI/2);building('east-shops',8,-2.5,7.8,7.2,8.6,-Math.PI/2);
    const glass=new T.MeshPhysicalMaterial({color:profile.glass,roughness:.12,metalness:.12,transparent:true,opacity:.25,side:T.DoubleSide,depthWrite:false}),positions:number[]=[],indices:number[]=[];
    for(let row=0;row<=8;row++)for(let column=0;column<=24;column++){const angle=column/24*Math.PI;positions.push(Math.cos(angle)*4.4,7.1+Math.sin(angle)*2,-7+row);if(row<8&&column<24){const vertex=row*25+column;indices.push(vertex,vertex+25,vertex+1,vertex+1,vertex+25,vertex+26)}}
    const canopy=new T.BufferGeometry();canopy.setAttribute('position',new T.Float32BufferAttribute(positions,3));canopy.setIndex(indices);canopy.computeVertexNormals();mesh('Mall_AtriumCanopy',canopy,glass,0,0,0);
    for(let rib=0;rib<6;rib++){const points=Array.from({length:17},(_,index)=>new T.Vector3(Math.cos(index/16*Math.PI)*4.4,7.1+Math.sin(index/16*Math.PI)*2,-7+rib*1.6));mesh('Mall_AtriumRoofRib',new T.TubeGeometry(new T.CatmullRomCurve3(points),18,.045,6,false),material.metal,0,0,0)}
    for(const side of [-1,1])for(const back of [-1,1])box('Mall_CanopyColumn',side*4.5,3.55,-3+back*3.6,.13,7.1,.13,material.metal,fixed,true);
    for(const side of [-1,1]){box('Mall_UpperGallery',side*3,3.6,-1.7,1.65,.24,9.6,material.stone);decks.push({x:side*3,z:-1.7,width:1.65,depth:9.6,y:3.8});
    for(let post=0;post<=11;post++)beam('Mall_GalleryBaluster',new T.Vector3(side*2.18,3.8,-5.5+post*.78),new T.Vector3(side*2.18,4.72,-5.5+post*.78),material.metal,.025);
    beam('Mall_GalleryHandrail',new T.Vector3(side*2.18,4.72,-5.55),new T.Vector3(side*2.18,4.72,3.1),material.wood,.04);
    solids.push(new T.Box3(new T.Vector3(side*2.18-.04,3.8,-5.6),new T.Vector3(side*2.18+.04,4.76,3.05)));
    }
    box('Mall_SkyBridge',0,3.6,-6.65,7.6,.24,1.6,material.stone);decks.push({x:0,z:-6.65,width:7.6,depth:1.6,y:3.8});
    const stair:Ramp={id:address+'/gallery-stair',x:3,width:1.65,startZ:9.4,endZ:3.1,bottom:.8,top:3.8,steps:18};ramps.push(stair);
    for(let step=0;step<stair.steps;step++){const elevation=T.MathUtils.lerp(stair.bottom,stair.top,(step+1)/stair.steps),z=T.MathUtils.lerp(stair.startZ,stair.endZ,(step+.5)/stair.steps);box('Mall_GalleryStair',stair.x,elevation-.13,z,stair.width,.17,(stair.startZ-stair.endZ)/stair.steps+.025,material.stone)}
    for(const edge of [-1,1])beam('Mall_StairHandrail',new T.Vector3(stair.x+edge*.82,1.8,stair.startZ),new T.Vector3(stair.x+edge*.82,4.8,stair.endZ),material.metal,.04);
    const shops=['Code Cafe','Git Gift Shop','Pixel Toy Store','Digital Bookstore','Robot Repair','Keyboard Shop','AI Lab','Byte Bakery'];
    const shopFinishes=['#c98270','#b89b5e','#567d92','#799467'].map(color=>new T.MeshStandardMaterial({color,roughness:.82,metalness:.04}));
    const interior=new T.MeshStandardMaterial({color:'#213b42',roughness:.6,emissive:'#ffcc91',emissiveIntensity:.025});interior.userData.surface='glass';
    shops.forEach((label,index)=>{const side=index%2?1:-1,upper=index>=4,z=-4.6+(Math.floor(index/2)%2)*4,elevation=upper?5.1:1.35;
     const sign=civic.plaque(fixed,label,upper?'UPPER GALLERY':'OPEN ARCADE',side*4.03,elevation+1,z,2.3);sign.rotation.y=-side*Math.PI/2;
     box('Mall_StorefrontRecess',side*4.34,elevation,z,.08,1.75,2.7,interior);
     for(const edge of [-1,1])box('Mall_StorefrontJamb',side*4.2,elevation,z+edge*1.4,.19,1.9,.12,material.stone);
     box('Mall_StorefrontHeader',side*4.16,elevation+.92,z,.26,.12,2.92,material.stone);
     for(let stripe=0;stripe<8;stripe++){const awning=box('Mall_ShopAwning',side*3.95,elevation+1.8,z-1.4+(stripe+.5)*.35,.9,.08,.35,stripe%2?material.stone:shopFinishes[index%4]);awning.rotation.z=side*.16}
     box('Mall_DisplayShelf',side*4.2,elevation-.65,z,.4,.08,2.5,material.wood);
     for(let item=0;item<4;item++){
      const across=z-.87+item*.58,finish=shopFinishes[(index+item)%4],shelf=elevation-.58;
      box('Mall_ShopDisplay',side*4.03,shelf,across,.35,.08,.46,material.stone);
      if(index===0){mesh('Mall_CafeMug',new T.CylinderGeometry(.12,.095,.23,10),material.stone,side*4.03,shelf+.16,across);const handle=mesh('Mall_CafeMugHandle',new T.TorusGeometry(.065,.02,5,10),material.metal,side*3.88,shelf+.17,across);handle.rotation.y=Math.PI/2}
      else if(index===1){box('Mall_WrappedGift',side*4.03,shelf+.2,across,.28,.3,.33,finish);box('Mall_GiftRibbon',side*3.87,shelf+.2,across,.025,.31,.055,material.metal)}
      else if(index===2){box('Mall_ToyBody',side*4.03,shelf+.18,across,.2,.24,.24,finish);mesh('Mall_ToyHead',new T.SphereGeometry(.13,8,6),material.stone,side*4.03,shelf+.43,across);box('Mall_ToyVisor',side*3.91,shelf+.43,across,.035,.065,.15,material.rail)}
      else if(index===3){for(let book=0;book<3;book++)box('Mall_BookSpine',side*4.03,shelf+.25,across-.15+book*.15,.3,.36+(book%2)*.12,.105,shopFinishes[(item+book)%4])}
      else if(index===4){beam('Mall_RepairTool',new T.Vector3(side*4.03,shelf+.08,across),new T.Vector3(side*4.03,shelf+.46,across),material.metal,.04);box('Mall_RepairToolHead',side*4.03,shelf+.44,across,.13,.09,.24,finish)}
      else if(index===5){box('Mall_KeyboardCase',side*4.03,shelf+.1,across,.3,.09,.46,material.rail);for(let row=0;row<3;row++)for(let key=0;key<4;key++)box('Mall_KeyboardKey',side*4.03+(row-1)*.08,shelf+.16,across-.15+key*.1,.055,.025,.065,key===3?finish:material.stone)}
      else if(index===6){box('Mall_LabInstrument',side*4.03,shelf+.24,across,.25,.4,.34,material.rail);box('Mall_LabDisplay',side*3.89,shelf+.28,across,.025,.2,.24,finish);for(let dial=0;dial<2;dial++)mesh('Mall_LabDial',new T.SphereGeometry(.035,6,4),material.metal,side*3.87,shelf+.12,across-.08+dial*.16)}
      else{const loaf=mesh('Mall_BakeryLoaf',new T.SphereGeometry(.15,10,6),shopFinishes[1],side*4.03,shelf+.14,across);loaf.scale.set(1.25,.6,1);for(let score=0;score<3;score++)box('Mall_BreadScore',side*4.03+(score-1)*.065,shelf+.23,across,.018,.01,.15,material.stone)}
     }
    });root.userData.shops=shops;
    for(const side of [-1,1]){
     box('Mall_StreetWindow',side*8,1.45,1.58,5.3,1.85,.08,interior);
     for(const edge of [-1,1])box('Mall_StreetWindowFrame',side*8+edge*2.7,1.45,1.68,.14,2,.18,material.stone);
     civic.plaque(fixed,side<0?shops[0]:shops[3],side<0?'COFFEE / PASTRIES':'BOOKS / FIELD NOTES',side*8,3,1.8,5.3);
     for(let stripe=0;stripe<12;stripe++){const awning=box('Mall_StreetAwning',side*8-2.8+(stripe+.5)*5.6/12,3.9,2.15,5.6/12,.1,1.2,stripe%2?material.stone:shopFinishes[side<0?0:2]);awning.rotation.x=.15}
     box('Mall_StreetDisplayShelf',side*8,.76,1.78,5.1,.1,.38,material.wood);
     for(let item=0;item<7;item++){const horizontal=side*8-2.1+item*.7;if(side<0)mesh('Mall_CafeFrontCup',new T.CylinderGeometry(.16,.12,.29,10),item%2?material.stone:shopFinishes[0],horizontal,.95,1.82);else box('Mall_BookFrontDisplay',horizontal,1.08,1.82,.43,.5+(item%3)*.1,.25,shopFinishes[item%4])}
    }
    for(const side of [-1,1]){
     bench(side*10,5.2,side<0?Math.PI/2:-Math.PI/2);tree(side*11,8.5,3.9);civic.flowers(fixed,side*5.7,4.3,1.6,1.6,side);
     const tableX=side*6.7;mesh('Mall_CafeTable',new T.CylinderGeometry(.85,.85,.1,20),material.wood,tableX,1.12,7.8,fixed,true);mesh('Mall_CafeTablePedestal',new T.CylinderGeometry(.075,.18,1.05,8),material.metal,tableX,.54,7.8);
    for(const chair of [-1,1]){const horizontal=tableX+chair*1.12;box('Mall_CafeSeat',horizontal,.55,7.8,.58,.12,.66,material.stone);for(const side of [-1,1])for(const back of [-1,1])box('Mall_CafeSeatLeg',horizontal+side*.23,back<0?.59:.245,7.8+back*.24,.07,back<0?1.18:.49,.08,material.metal);box('Mall_CafeSeatBack',horizontal,.95,7.5,.58,.5,.1,material.wood)}
     mesh('Mall_CoffeeCup',new T.CylinderGeometry(.09,.065,.18,10),material.stone,tableX,1.27,7.8);
     const vaporGeometry=new T.BufferGeometry();vaporGeometry.setAttribute('position',new T.Float32BufferAttribute(Array.from({length:12},(_,index)=>[tableX,1.42+index*.055,7.8]).flat(),3));const vapor=new T.Points(vaporGeometry,new T.PointsMaterial({color:'#e0e9db',size:.075,transparent:true,opacity:.4,depthWrite:false}));vapor.name='Cafe_CupSteam';moving.add(vapor);steam.push(vapor);
    }
  root.userData.openArcade={width:8,depth:depth-2};
 }else if(kind==='market'){
  for(const side of [-1,1])for(let stall=0;stall<3;stall++){
   const x=side*6.5,z=-6+stall*5.3;box('Market_Counter',x,.8,z,3.7,1.5,1.8,material.wood,fixed,true);
   for(const end of [-1,1])box('Market_CanopyPost',x+end*1.65,1.8,z-.65,.1,3.6,.1,material.metal);
  const roof=mesh('Market_RoundedCanopy',new T.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2),stall%2?material.wall:material.stone,x,3.6,z);roof.scale.set(2.45,.42,1.75);
   for(let product=0;product<5;product++)mesh('Market_Produce',new T.IcosahedronGeometry(.19,0),product%2?material.leaf:material.stone,x-1.1+product*.5,1.71,z);
  }
 }else if(kind==='shop'){
  signature=createSignatureShop(name,options.shopTheme);moving.add(signature.root);if(signature.root.userData.authoredVenue)root.userData.authoredVenue=signature.root.userData.authoredVenue;solids.push(...signature.solids);Object.assign(features,signature.features);root.userData.shopTheme=signature.theme;
  const design=signatureShops.find(shop=>shop.theme===signature!.theme)!;balloon=createTetheredBalloon(design.accent,signatureShops.indexOf(design));balloon.root.position.set(7.1*signatureShopScale,0,-4*signatureShopScale);balloon.root.scale.setScalar(signatureShopScale);moving.add(balloon.root);features.Shop_TetheredBalloon=1;
  if(!root.userData.authoredVenue)for(const side of [-1,1]){bench(side*6.9*signatureShopScale,3.8*signatureShopScale,side<0?Math.PI/2:-Math.PI/2);tree(side*7.5*signatureShopScale,-2*signatureShopScale,4.1);civic.flowers(fixed,side*7.8*signatureShopScale,4*signatureShopScale,1.3,1.3,side)}
 }else if(kind==='sports'){
  const court=new T.MeshStandardMaterial({color:'#328b82',roughness:.93});box('Sports_CourtSurface',0,.025,-1,15,.045,20,court);
  for(const side of [-1,1]){box('Sports_Sideline',side*7.15,.056,-1,.08,.018,19.1,material.stone);box('Sports_Baseline',0,.057,-1+side*9.5,14.3,.018,.08,material.stone);box('Sports_HoopPost',0,1.6,-1+side*9,.15,3.2,.15,material.metal,fixed,true);box('Sports_Backboard',0,3.2,-1+side*8.8,1.8,1,.12,material.stone);const ring=mesh('Sports_BasketRim',new T.TorusGeometry(.35,.025,5,18),material.wood,0,2.93,-1+side*8.2);ring.rotation.x=Math.PI/2}
  mesh('Sports_CenterCircle',new T.TorusGeometry(1.55,.035,5,32),material.stone,0,.067,-1).rotation.x=Math.PI/2;
  const ball=mesh('Sports_Ball',new T.SphereGeometry(.25,12,8),material.wood,1,.28,2,moving);motions.push({object:ball,axis:'y',amplitude:.55,speed:3,rest:.75});bench(-8.6,1,Math.PI/2);
 }else{
  building('main-hall',0,-4,width*.69,depth*.46,kind==='school'?6.2:kind==='library'?8.2:7.3);
  if(kind==='cinema'){
   box('Cinema_Marquee',0,3.9,1.25,12,.6,1.4,material.rail);for(let bulb=0;bulb<17;bulb++)mesh('Cinema_MarqueeLamp',new T.SphereGeometry(.09,8,5),material.stone,-5.5+bulb*.69,3.92,2);
    box('Cinema_OutdoorScreen',-6,3.6,3.1,4,2.5,.16,material.rail);
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const context=canvas.getContext('2d')!,texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    const paint=(clock:number)=>{context.fillStyle='#1c3948';context.fillRect(0,0,640,360);for(let star=0;star<32;star++){context.fillStyle=star%3?'#b8d1c1':'#eac88c';context.fillRect((star*137)%640,(star*79)%240,2,2)}
     context.fillStyle='#96b9aa';context.beginPath();context.ellipse(320,278,245,48,0,0,Math.PI*2);context.fill();for(let house=0;house<9;house++){const x=135+house*43,height=25+(house*17)%65;context.fillStyle=house%2?'#deb59f':'#78a9a2';context.fillRect(x,264-height,31,height);context.fillStyle='#f1e3b0';for(let level=0;level<3;level++)context.fillRect(x+8,255-height+level*15,6,7)}
     const orbit=clock*.4;context.fillStyle='#e8ce85';context.beginPath();context.arc(320+Math.cos(orbit)*220,130+Math.sin(orbit)*48,16,0,Math.PI*2);context.fill();context.fillStyle='#e7efe1';context.font='500 26px "Space Grotesk", sans-serif';context.textAlign='center';context.fillText('THE LIVING COMPUTER KINGDOM',320,42);context.font='500 15px "Space Grotesk", sans-serif';context.fillText('An original miniature-world short',320,330);texture.needsUpdate=true};
    const projection=new T.Mesh(new T.PlaneGeometry(3.8,2.14),new T.MeshBasicMaterial({map:texture,toneMapped:false}));projection.name='Cinema_OriginalShort';projection.position.set(-6,3.6,3.2);moving.add(projection);film={texture,paint};paint(0);placard('NOW SHOWING',-6,4.2,3);bench(5.8,5);
    box('Cinema_TicketBooth',5.8,1.3,2.2,1.8,2.6,1.8,material.wood,fixed,true);box('Cinema_TicketWindow',5.8,1.75,3.12,1.2,.8,.06,material.glass);for(const offset of [-1,1])beam('Cinema_QueuePost',new T.Vector3(3.7+offset,0,5),new T.Vector3(3.7+offset,1.1,5),material.metal,.035);
  }else if(kind==='clinic'){
   box('Clinic_MedicalEmblem',0,4,1.1,1.6,.48,.12,material.stone);box('Clinic_MedicalEmblem',0,4,1.11,.48,1.6,.14,material.stone);
    box('Clinic_ReceptionCanopy',0,5.1,1.8,4.5,.48,2,material.wall);for(const side of [-1,1])box('Clinic_CanopyPost',side*1.85,2.44,2.1,.14,4.88,.14,material.metal,fixed,true);
   bench(-4.5,4.8);bench(4.5,4.8);placard('RECEPTION',0,2.3,3.3);
  }else if(kind==='school'){
   const bell=mesh('School_Bell',new T.CylinderGeometry(.3,.46,.5,12),material.metal,0,3.8,1.3,moving);motions.push({object:bell,axis:'z',amplitude:.24,speed:5,rest:0});
   for(let tile=0;tile<7;tile++)box('School_Hopscotch',-5+(tile%2)*.8,.055,2+tile*.65,.65,.024,.6,tile%2?material.wood:material.stone);
   placard('LEARNING COURT',0,1.8,4);tree(7,5.5,4.2);
  }else{
   for(const side of [-1,1]){
    const cabinet=box('Library_OutdoorShelf',side*5.5,1.25,3,2.8,2.5,.55,material.wood,fixed,true),nativeShelf=!!cabinet.geometry.userData.authoredCraft;
    for(let shelf=0;shelf<3;shelf++)for(let book=0;book<8;book++){const bookHeight=.4+book%3*.06;box('Library_BookSpine',side*5.5-1.15+book*.32,(nativeShelf?.31+bookHeight/2:.52)+shelf*.68,3.32,.2,bookHeight,.14,book%2?material.wall:material.stone)}
   }
   bench(0,5);placard('OPEN SHELF',0,1.8,3.5);
  }
 }
 solids.push(...civic.solids);
 const gardens:{x:number;z:number;width:number;depth:number}[]=[];
 if(kind==='shop'&&!root.userData.authoredVenue)for(const [horizontal,forward,gardenWidth,gardenDepth] of [[-width/2+4,-1.5*signatureShopScale,2.7,3.2*signatureShopScale],[width/2-4,-1.5*signatureShopScale,2.7,3.2*signatureShopScale],[0,-6*signatureShopScale,8.2*signatureShopScale,1.3]]){const garden=createPocketGarden(gardenWidth,gardenDepth,recipe.rhythm*13+horizontal,'#d9a3b4');garden.root.position.set(horizontal,0,forward);fixed.add(garden.root);gardens.push({x:horizontal,z:forward,width:gardenWidth,depth:gardenDepth});features.PublicPlace_PocketGarden=(features.PublicPlace_PocketGarden??0)+1}
 if(kind!=='sports'&&!root.userData.authoredVenue)for(const side of [-1,1])for(const end of [-1,1]){const horizontal=side*(width/2-4),forward=end*(depth/2-(kind==='shop'?7*signatureShopScale:2.7)),gardenWidth=2.8,gardenDepth=2.6,padding=.3;
  const area=new T.Box3(new T.Vector3(horizontal-gardenWidth/2-padding,-.2,forward-gardenDepth/2-padding),new T.Vector3(horizontal+gardenWidth/2+padding,1,forward+gardenDepth/2+padding));
  if(Math.abs(horizontal)<gardenWidth/2+2.5||solids.some(solid=>solid.intersectsBox(area))||gardens.some(garden=>Math.abs(horizontal-garden.x)<(gardenWidth+garden.width)/2&&Math.abs(forward-garden.z)<(gardenDepth+garden.depth)/2)||ramps.some(ramp=>Math.abs(horizontal-ramp.x)<gardenWidth/2+2.5&&forward>Math.min(ramp.startZ,ramp.endZ)-gardenDepth&&forward<Math.max(ramp.startZ,ramp.endZ)+gardenDepth))continue;
  const garden=createPocketGarden(gardenWidth,gardenDepth,recipe.rhythm*9+side*3+end,style==='petal'?'#d996b5':style==='forge'?'#e4ba7f':'#e1bbad');garden.root.position.set(horizontal,0,forward);fixed.add(garden.root);gardens.push({x:horizontal,z:forward,width:gardenWidth,depth:gardenDepth});features.PublicPlace_PocketGarden=(features.PublicPlace_PocketGarden??0)+1;
 }
 const ground=options.ground;
 if(kind==='shop'&&ground&&signature){
  fixed.updateMatrixWorld(true);
  for(const object of fixed.children){
   if(['PublicPlace_Ground','PublicPlace_Walkway','PublicPlace_Border'].includes(object.name)){
    const surface=object as T.Mesh,positions=surface.geometry.attributes.position,point=new T.Vector3(),inverse=surface.matrix.clone().invert();
    for(let vertex=0;vertex<positions.count;vertex++){point.fromBufferAttribute(positions,vertex).applyMatrix4(surface.matrix);point.y+=ground(point);point.applyMatrix4(inverse);positions.setXYZ(vertex,point.x,point.y,point.z)}
    surface.geometry.computeVertexNormals();surface.geometry.computeBoundingBox();surface.geometry.computeBoundingSphere();
   }else{object.position.y+=ground(object.position);object.updateMatrix()}
  }
  for(const solid of solids)if(!signature.solids.includes(solid)){const offset=ground(solid.getCenter(new T.Vector3()));solid.min.y+=offset;solid.max.y+=offset}
  if(balloon)balloon.root.position.y+=ground(balloon.root.position);
  if('setGround' in signature)signature.setGround(ground);
  const bounds=signature.solids[0],positions:number[]=[],indices:number[]=[],corners=[[bounds.min.x,bounds.min.z],[bounds.max.x,bounds.min.z],[bounds.max.x,bounds.max.z],[bounds.min.x,bounds.max.z]];
  for(let edge=0;edge<4;edge++)for(let section=0;section<=16;section++){
   const first=corners[edge],last=corners[(edge+1)%4],horizontal=first[0]+(last[0]-first[0])*section/16,forward=first[1]+(last[1]-first[1])*section/16,bottom=Math.min(.02,ground(new T.Vector3(horizontal,0,forward))-.08),vertex=positions.length/3;
   positions.push(horizontal,.12,forward,horizontal,bottom,forward);bounds.min.y=Math.min(bounds.min.y,bottom);
   if(section<16)indices.push(vertex,vertex+1,vertex+2,vertex+2,vertex+1,vertex+3);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(positions.flatMap((_,index)=>index%3===0?[positions[index]*.08,positions[index+1]*.08]:[]),2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const stone=material.stone.clone();stone.side=T.DoubleSide;mesh('Shop_FittedFoundation',geometry,stone,0,0,0);
  root.userData.fittedShopGround=true;
 }
 root.userData.gardens=gardens;fixed.userData.staticCameraBounds=solids.map(solid=>solid.clone());batchScenery(fixed,{});root.userData.features=features;
 cacheStaticTransforms(fixed);
 const collisionIndex=createSpatialIndex(solids,solid=>({minX:solid.min.x,maxX:solid.max.x,minZ:solid.min.z,maxZ:solid.max.z}),8),collisionCandidates=new Set<T.Box3>(),collisionBounds=new T.Box3();for(const solid of solids)collisionBounds.union(solid);
 const approach=new T.Vector3(0,.8,depth/2-2.6*(kind==='shop'?signatureShopScale:1)),point=new T.Vector3();if(kind==='shop'&&ground)approach.y+=ground(approach);
 const actions:Record<EverydayKind,string[]>={park:['Fountain on.','A quiet seat by the fountain.'],playground:['Swings and seesaw moving.','Another turn at the playground.'],mall:['Shops open: Books / Fashion / Groceries / Cafe.','The arcade is open.'],market:['Today: fresh produce, flowers, and handmade goods.'],cinema:['Tonight at the Picture House: A Journey Around the Planets.'],clinic:['Reception is open.'],school:['The school bell rings.'],library:['On the open shelf: Planet Atlas / Field Notes / Stories of the City.'],sports:['Court ready. The ball is in play.'],shop:['The pastry display is open.']};
 return {
    root,kind,style,name,width,depth,approach,solids,features,moving,ramps,decks,assetReady:signature&&'ready' in signature?signature.ready:Promise.resolve(true),setGround:(project:(point:T.Vector3)=>number)=>{if(signature&&'setGround' in signature){signature.setGround(project);collisionBounds.makeEmpty();for(const solid of solids)collisionBounds.union(solid);fixed.userData.staticCameraBounds=solids.map(solid=>solid.clone())}},
    height(x:number,z:number,previous:number){for(const ramp of ramps){const elevation=rampHeight(ramp,x,z);if(elevation!==null&&Math.abs(previous-elevation)<.6)return elevation}for(const deck of decks)if(Math.abs(x-deck.x)<deck.width/2-.08&&Math.abs(z-deck.z)<deck.depth/2&&Math.abs(previous-deck.y)<.6)return deck.y;return null},
  blocked(local:T.Vector3,padding=.4){
   if(local.x<=collisionBounds.min.x-padding||local.x>=collisionBounds.max.x+padding||local.z<=collisionBounds.min.z-padding||local.z>=collisionBounds.max.z+padding||local.y<collisionBounds.min.y-.4||local.y>collisionBounds.max.y+.4)return false;
   collisionIndex.query({minX:local.x-padding,maxX:local.x+padding,minZ:local.z-padding,maxZ:local.z+padding},collisionCandidates);
   for(const solid of collisionCandidates)if(local.y<solid.max.y+.4&&local.y>solid.min.y-.4&&local.x>solid.min.x-padding&&local.x<solid.max.x+padding&&local.z>solid.min.z-padding&&local.z<solid.max.z+padding)return true;return false;
  },
  near(local:T.Vector3){return Math.abs(local.y-approach.y)<3&&Math.hypot(local.x-approach.x,local.z-approach.z)<3.5},
  prompt(local:T.Vector3){return this.near(local)?`E \u00b7 ${name}`:null},
  interact(local:T.Vector3){if(!this.near(local))return null;activeUntil=time+12;if(signature)return signature.interact();return actions[kind][visits++%actions[kind].length]},
    update(delta:number,reduced:boolean,environment={night:0,wet:0,wind:0}){if(!reduced)time+=Math.max(0,Number.isFinite(delta)?delta:0);signature?.update(delta,reduced);balloon?.update(delta,reduced);civic.lighting(environment.night,environment.wet);for(const fountain of fountains)fountain.update(delta,reduced,time<activeUntil?1:0,environment.night,environment.wet,environment.wind);for(const motion of motions){const value=!reduced&&(time<activeUntil||kind==='playground'&&time%24>10&&time%24<16)?Math.sin(time*motion.speed)*motion.amplitude:0;if(motion.object.name==='Playground_WorkingSwing'||motion.axis==='z')motion.object.rotation[motion.axis]=motion.rest+value;else motion.object.position[motion.axis]=motion.rest+value}for(const vapor of steam){const positions=vapor.geometry.attributes.position;for(let index=0;index<positions.count;index++)positions.setY(index,1.42+(reduced?index/12:(time*.25+index/12)%1)*.65);positions.needsUpdate=true}if(film&&Math.floor(time*8)!==lastFilmFrame){film.paint(time);lastFilmFrame=Math.floor(time*8)}},
  localPoint(position:T.Vector3,origin:T.Vector3,inverse:T.Quaternion,scale=1){return point.copy(position).sub(origin).applyQuaternion(inverse).divideScalar(scale)},
 };
}
