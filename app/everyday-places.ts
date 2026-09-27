import * as T from 'three';
import {architectureProfiles,architectureRecipe,type ArchitectureStyle} from './architecture-profiles';
import {architectureMaterials,createCraftedBuilding,bakeArchitecture} from './building-craft';
import {createWoodenSign} from './wooden-sign';
import {batchScenery} from './static-batching';
import {createCivicKit} from './civic-kit';
import {createCapitalFountain} from './capital-fountain';
import {rampHeight,type Ramp} from './traversal';

export const everydayKinds=['park','playground','mall','market','cinema','clinic','school','library','sports'] as const;
export type EverydayKind=typeof everydayKinds[number];
export const everydayPlaceNames:Record<EverydayKind,string>={park:'Public Park',playground:'Playground',mall:'Shopping Arcade',market:'Town Market',cinema:'Cinema',clinic:'Community Clinic',school:'Neighborhood School',library:'Public Library',sports:'Sports Court'};
export const cityEverydaySites=[
 {id:'willow-park',kind:'park',name:'Willow Park',x:-50,z:279},
 {id:'play-garden',kind:'playground',name:'Play Garden',x:50,z:279},
 {id:'lantern-mall',kind:'mall',name:'Lantern Shopping Arcade',x:150,z:279},
 {id:'weekend-market',kind:'market',name:'Weekend Market',x:-150,z:179},
 {id:'picture-house',kind:'cinema',name:'The Picture House',x:250,z:279},
 {id:'community-clinic',kind:'clinic',name:'Community Clinic',x:250,z:179},
 {id:'neighborhood-school',kind:'school',name:'Neighborhood School',x:-150,z:79},
 {id:'public-library',kind:'library',name:'Open Shelf Library',x:-150,z:-21},
 {id:'sports-court',kind:'sports',name:'Community Sports Court',x:50,z:379},
] as const satisfies readonly {id:string;kind:EverydayKind;name:string;x:number;z:number}[];
export type CityEverydayId=typeof cityEverydaySites[number]['id'];
const footprints:Record<EverydayKind,[number,number]>={park:[24,20],playground:[20,18],mall:[28,22],market:[24,20],cinema:[22,20],clinic:[20,18],school:[24,20],library:[22,20],sports:[20,24]};
export function everydayFootprint(kind:EverydayKind){const [width,depth]=footprints[kind];return {width,depth}}

export function createEverydayPlace(options:{kind:EverydayKind;style:ArchitectureStyle;address:string;name?:string}){
 const {kind,style,address}=options,recipe=architectureRecipe(style,address),name=options.name??everydayPlaceNames[kind],profile=architectureProfiles[style],material=architectureMaterials(style),{width,depth}=everydayFootprint(kind);
 const root=new T.Group();root.name='Everyday_'+address;root.userData.placeKind=kind;root.userData.architectureStyle=style;root.userData.architectureRecipe=recipe;
 const fixed=new T.Group(),moving=new T.Group();fixed.name='Everyday_StaticCraft';moving.name='Everyday_ActiveProps';root.add(fixed,moving);
 const solids:T.Box3[]=[],features:Record<string,number>={},motions:{object:T.Object3D;axis:'x'|'y'|'z';amplitude:number;speed:number;rest:number}[]=[];
 const turf=new T.MeshStandardMaterial({color:profile.leaf,roughness:1});
 const paving=material.stone.clone();paving.color.lerp(new T.Color(profile.wall),.18);paving.roughness=.94;
 paving.userData.cityPaving=true;
 const civic=createCivicKit();civic.materials.stone.color.set(profile.stone);civic.materials.brass.color.set(profile.metal);civic.materials.leaf.color.set(profile.leaf);civic.materials.wood.color.set(profile.wood);
 const ramps:Ramp[]=[],decks:{x:number;z:number;width:number;depth:number;y:number}[]=[],fountains:ReturnType<typeof createCapitalFountain>[]=[],steam:T.Points[]=[];
 let film:{texture:T.CanvasTexture;paint:(time:number)=>void}|null=null,lastFilmFrame=-1;
 let time=0,activeUntil=0,visits=0;
 function mesh(part:string,geometry:T.BufferGeometry,finish:T.Material,x:number,y:number,z:number,parent:T.Object3D=fixed,solid=false){
  const object=new T.Mesh(geometry,finish);object.name=part;object.position.set(x,y,z);object.castShadow=object.receiveShadow=true;parent.add(object);features[part]=(features[part]??0)+1;
  if(solid){geometry.computeBoundingBox();solids.push(geometry.boundingBox!.clone().translate(object.position));object.userData.cameraSolid=true}return object;
 }
 function box(part:string,x:number,y:number,z:number,w:number,h:number,d:number,finish:T.Material,parent:T.Object3D=fixed,solid=false){return mesh(part,new T.BoxGeometry(w,h,d),finish,x,y,z,parent,solid)}
 function beam(part:string,from:T.Vector3,to:T.Vector3,finish:T.Material,radius=.085,parent:T.Object3D=fixed){const offset=to.clone().sub(from),object=mesh(part,new T.CylinderGeometry(radius,radius,offset.length(),8),finish,0,0,0,parent);object.position.copy(from).add(to).multiplyScalar(.5);object.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),offset.normalize());return object}
 function bench(x:number,z:number,yaw=0){
  const group=new T.Group();group.position.set(x,0,z);group.rotation.y=yaw;fixed.add(group);
  for(let slat=0;slat<4;slat++)box('Park_BenchSlat',0,.8,-.3+slat*.19,2.6,.1,.15,material.wood,group);
  for(let slat=0;slat<3;slat++)box('Park_BenchBack',0,1.12+slat*.18,-.45,2.6,.12,.1,material.wood,group);
  for(const side of [-1,1]){box('Park_BenchLeg',side*.95,.4,0,.13,.8,.65,material.metal,group);box('Park_BenchArm',side*1.2,1.1,0,.07,.065,.8,material.metal,group)}
  group.updateMatrix();solids.push(new T.Box3(new T.Vector3(-1.4,0,-.58),new T.Vector3(1.4,1.65,.55)).applyMatrix4(group.matrix));
 }
 function tree(x:number,z:number,height=4.8){
    civic.tree(fixed,x,z,style==='petal'?'blossom':height>5.3?'column':'shade',Math.round(height*9+recipe.rhythm*13));features.Park_TreeCanopy=(features.Park_TreeCanopy??0)+1;
 }
 function building(label:string,x:number,z:number,w:number,d:number,height:number,yaw=0){
  const building=createCraftedBuilding({style,address:address+'/'+label,width:w,depth:d,height,materials:material,stairs:false});
  const bounds=new T.Box3().setFromObject(building.root);const skins=bakeArchitecture(building.root);
  for(const skin of skins){const part=new T.Mesh(skin.geometry,skin.material);part.name='Everyday_CraftedBuilding';part.castShadow=part.receiveShadow=true;building.root.add(part)}
  building.root.position.set(x,.13,z);building.root.rotation.y=yaw;building.root.updateMatrix();fixed.add(building.root);solids.push(bounds.applyMatrix4(building.root.matrix));return building.root;
 }
 function placard(label:string,x:number,z:number,w=4,parent:T.Object3D=fixed){const sign=createWoodenSign(label,{width:w,height:1.05,shape:style==='research'?'shield':style==='petal'?'arch':'arrow'});sign.position.set(x,.12,z);parent.add(sign);return sign}
 box('PublicPlace_Ground',0,-.065,0,width,.12,depth,kind==='park'||kind==='playground'?turf:paving);
 box('PublicPlace_Walkway',0,.018,1.2,4,.04,depth-2.4,paving);
 for(const side of [-1,1]){
  box('PublicPlace_Border',side*(width/2-.1),.03,0,.14,.1,depth,material.metal);
  const lampZ=depth/2-2;mesh('PublicPlace_LampPost',new T.CylinderGeometry(.085,.13,3.6,8),material.metal,side*(width/2-1.5),1.8,lampZ,fixed,true);mesh('PublicPlace_Lantern',new T.BoxGeometry(.38,.65,.38),material.stone,side*(width/2-1.5),3.5,lampZ);
 }
 placard(name,-width*.25,depth/2-.8,Math.min(5.5,width*.38));
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
  box('Playground_TowerDeck',0,2.15,0,2.4,.18,2.4,material.stone,tower);mesh('Playground_TowerRoof',new T.ConeGeometry(1.8,1.2,4).rotateY(Math.PI/4),material.wall,0,3.9,0,tower);
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
    box('Playground_Sandbox',-1,.15,4,3.8,.3,2.3,material.wood);box('Playground_Sand',-1,.32,4,3.55,.035,2.05,new T.MeshStandardMaterial({color:'#e4d8b1',roughness:1}));
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
    shops.forEach((label,index)=>{const side=index%2?1:-1,upper=index>=4,z=-4.6+(Math.floor(index/2)%2)*4,elevation=upper?5.1:1.35;
     const sign=civic.plaque(fixed,label,upper?'UPPER GALLERY':'OPEN ARCADE',side*4.03,elevation+1,z,2.3);sign.rotation.y=-side*Math.PI/2;
     box('Mall_DisplayShelf',side*4.2,elevation-.65,z,.4,.08,2.5,material.wood);
     for(let item=0;item<4;item++)box('Mall_ShopDisplay',side*4.03,elevation-.42,z-.87+item*.58,.2,.32+item%2*.15,.36,index%3?material.wall:material.stone);
    });root.userData.shops=shops;
    for(const side of [-1,1]){
     bench(side*10,5.2,side<0?Math.PI/2:-Math.PI/2);tree(side*11,8.5,3.9);civic.flowers(fixed,side*5.7,4.3,1.6,1.6,side);
     const tableX=side*6.7;mesh('Mall_CafeTable',new T.CylinderGeometry(.85,.85,.1,20),material.wood,tableX,1.12,7.8,fixed,true);mesh('Mall_CafeTablePedestal',new T.CylinderGeometry(.075,.18,1.05,8),material.metal,tableX,.54,7.8);
     for(const chair of [-1,1])box('Mall_CafeSeat',tableX+chair*1.12,.55,7.8,.58,.12,.66,material.stone);
     mesh('Mall_CoffeeCup',new T.CylinderGeometry(.09,.065,.18,10),material.stone,tableX,1.27,7.8);
     const vaporGeometry=new T.BufferGeometry();vaporGeometry.setAttribute('position',new T.Float32BufferAttribute(Array.from({length:12},(_,index)=>[tableX,1.42+index*.055,7.8]).flat(),3));const vapor=new T.Points(vaporGeometry,new T.PointsMaterial({color:'#e0e9db',size:.075,transparent:true,opacity:.4,depthWrite:false}));vapor.name='Cafe_CupSteam';moving.add(vapor);steam.push(vapor);
    }
  root.userData.openArcade={width:8,depth:depth-2};
 }else if(kind==='market'){
  for(const side of [-1,1])for(let stall=0;stall<3;stall++){
   const x=side*6.5,z=-6+stall*5.3;box('Market_Counter',x,.8,z,3.7,1.5,1.8,material.wood,fixed,true);
   for(const end of [-1,1])box('Market_CanopyPost',x+end*1.65,1.8,z-.65,.1,3.6,.1,material.metal);
   const roof=mesh('Market_FoldedCanopy',new T.ConeGeometry(2.8,.8,4).rotateY(Math.PI/4),stall%2?material.wall:material.stone,x,3.6,z);roof.scale.z=.63;
   for(let product=0;product<5;product++)mesh('Market_Produce',new T.IcosahedronGeometry(.19,0),product%2?material.leaf:material.stone,x-1.1+product*.5,1.71,z);
  }
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
   bench(-4.5,4.8);bench(4.5,4.8);placard('RECEPTION',0,2.3,3.3);
  }else if(kind==='school'){
   const bell=mesh('School_Bell',new T.CylinderGeometry(.3,.46,.5,12),material.metal,0,3.8,1.3,moving);motions.push({object:bell,axis:'z',amplitude:.24,speed:5,rest:0});
   for(let tile=0;tile<7;tile++)box('School_Hopscotch',-5+(tile%2)*.8,.055,2+tile*.65,.65,.024,.6,tile%2?material.wood:material.stone);
   placard('LEARNING COURT',0,1.8,4);tree(7,5.5,4.2);
  }else{
   for(const side of [-1,1]){
    box('Library_OutdoorShelf',side*5.5,1.25,3,2.8,2.5,.55,material.wood,fixed,true);
    for(let shelf=0;shelf<3;shelf++)for(let book=0;book<8;book++)box('Library_BookSpine',side*5.5-1.15+book*.32,.52+shelf*.68,3.32,.2,.4+book%3*.06,.14,book%2?material.wall:material.stone);
   }
   bench(0,5);placard('OPEN SHELF',0,1.8,3.5);
  }
 }
 solids.push(...civic.solids);fixed.userData.staticCameraBounds=solids.map(solid=>solid.clone());batchScenery(fixed,{});root.userData.features=features;
 const approach=new T.Vector3(0,.8,depth/2-2.6),point=new T.Vector3();
 const actions:Record<EverydayKind,string[]>={park:['Fountain on.','A quiet seat by the fountain.'],playground:['Swings and seesaw moving.','Another turn at the playground.'],mall:['Shops open: Books / Fashion / Groceries / Cafe.','The arcade is open.'],market:['Today: fresh produce, flowers, and handmade goods.'],cinema:['Tonight at the Picture House: A Journey Around the Planets.'],clinic:['Reception is open.'],school:['The school bell rings.'],library:['On the open shelf: Planet Atlas / Field Notes / Stories of the City.'],sports:['Court ready. The ball is in play.']};
 return {
    root,kind,style,name,width,depth,approach,solids,features,moving,ramps,decks,
    height(x:number,z:number,previous:number){for(const ramp of ramps){const elevation=rampHeight(ramp,x,z);if(elevation!==null&&Math.abs(previous-elevation)<.6)return elevation}for(const deck of decks)if(Math.abs(x-deck.x)<deck.width/2-.08&&Math.abs(z-deck.z)<deck.depth/2&&Math.abs(previous-deck.y)<.6)return deck.y;return null},
  blocked(local:T.Vector3,padding=.4){return solids.some(solid=>local.y<solid.max.y+.4&&local.y>solid.min.y-.4&&local.x>solid.min.x-padding&&local.x<solid.max.x+padding&&local.z>solid.min.z-padding&&local.z<solid.max.z+padding)},
  near(local:T.Vector3){return Math.abs(local.y-.8)<3&&Math.hypot(local.x-approach.x,local.z-approach.z)<3.5},
  prompt(local:T.Vector3){return this.near(local)?`E \u00b7 ${name}`:null},
  interact(local:T.Vector3){if(!this.near(local))return null;activeUntil=time+12;return actions[kind][visits++%actions[kind].length]},
    update(delta:number,reduced:boolean,environment={night:0,wet:0,wind:0}){if(!reduced)time+=Math.max(0,Number.isFinite(delta)?delta:0);civic.lighting(environment.night,environment.wet);for(const fountain of fountains)fountain.update(delta,reduced,time<activeUntil?1:0,environment.night,environment.wet,environment.wind);for(const motion of motions){const value=!reduced&&(time<activeUntil||kind==='playground'&&time%24>10&&time%24<16)?Math.sin(time*motion.speed)*motion.amplitude:0;if(motion.object.name==='Playground_WorkingSwing'||motion.axis==='z')motion.object.rotation[motion.axis]=motion.rest+value;else motion.object.position[motion.axis]=motion.rest+value}for(const vapor of steam){const positions=vapor.geometry.attributes.position;for(let index=0;index<positions.count;index++)positions.setY(index,1.42+(reduced?index/12:(time*.25+index/12)%1)*.65);positions.needsUpdate=true}if(film&&Math.floor(time*8)!==lastFilmFrame){film.paint(time);lastFilmFrame=Math.floor(time*8)}},
  localPoint(position:T.Vector3,origin:T.Vector3,inverse:T.Quaternion,scale=1){return point.copy(position).sub(origin).applyQuaternion(inverse).divideScalar(scale)},
 };
}
