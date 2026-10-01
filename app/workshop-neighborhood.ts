import * as T from 'three';
import {craftedBox,createCraftMaterials,createSurfaceRelief} from './crafted-surfaces';
import {batchScenery} from './static-batching';
import {rampHeight,type Ramp} from './traversal';
import {sceneryCollision} from './collision-world';
import {addWorkshopDetails} from './workshop-details';
import {createGroundOcclusion} from './ground-occlusion';
import {createWindowInteriorAtlas} from './window-interiors';

export const workshopPalette={
  chalk:'#e8eff0',plaster:'#e4decd',sage:'#218d8b',deck:'#63a493',oxide:'#ce7666',rail:'#243e4a',
  brass:'#cba660',copper:'#bf8061',timber:'#b59a78',paving:'#d5e0e3',joint:'#76949c',
  glass:'#367b91',window:'#ffe0a6',leaf:'#38795e',newLeaf:'#9ac87b',
};
export const workshopStair:Ramp={id:'workshop-service-stair',x:12.3,width:2.2,startZ:17.8,endZ:8.5,bottom:.8,top:8.6,steps:30};
export const workshopBridge={x:-.5,z:8,width:33,depth:2.8,y:8.6};
type Solid={x:number;y:number;z:number;w:number;h:number;d:number};

export function createWorkshopNeighborhood(scene:T.Scene){
  const root=new T.Group();root.name='Bootloader_AtelierQuarter';scene.add(root);
  const surface=createCraftMaterials(),palette=workshopPalette;
  const finishes={chalk:surface(palette.chalk),plaster:surface(palette.plaster,0,0),sage:surface(palette.sage),deck:surface(palette.deck,0,.025),oxide:surface(palette.oxide),rail:surface(palette.rail,0,.35),brass:surface(palette.brass,0,.6),copper:surface(palette.copper,0,.7),timber:surface(palette.timber),paving:surface(palette.paving),joint:surface(palette.joint),glass:surface(palette.glass,0,.1),window:surface(palette.window,.25),leaf:surface(palette.leaf),newLeaf:surface(palette.newLeaf)};
  const timberRelief=createSurfaceRelief('timber'),stoneRelief=createSurfaceRelief('stone'),metalRelief=createSurfaceRelief('brushed');
  Object.assign(finishes.timber,{name:'Workshop_OiledTimber',metalness:0,roughness:.7,clearcoat:.08,bumpMap:timberRelief,roughnessMap:timberRelief,bumpScale:.032,envMapIntensity:.4});
  Object.assign(finishes.brass,{name:'Workshop_BrushedBrass',metalness:.82,roughness:.32,clearcoat:.08,bumpMap:metalRelief,roughnessMap:metalRelief,bumpScale:.008,envMapIntensity:.88});
  Object.assign(finishes.copper,{name:'Workshop_WoundCopper',roughness:.36,bumpMap:metalRelief,roughnessMap:metalRelief,bumpScale:.006});
  Object.assign(finishes.plaster,{name:'Workshop_LimewashedPlaster',roughness:.92,clearcoat:0,bumpMap:stoneRelief,roughnessMap:stoneRelief,bumpScale:.04,envMapIntensity:.25});
  const rooms=createWindowInteriorAtlas();Object.assign(finishes.glass,{name:'Workshop_InteriorGlazing',roughness:.14,clearcoat:.6,clearcoatRoughness:.12,aoMap:rooms.occlusion,aoMapIntensity:.8,emissiveMap:rooms.emission,emissiveIntensity:.025});
  finishes.glass.userData.surface='glass';finishes.glass.userData.nightIllumination=.24;
  finishes.paving.roughness=.87;finishes.paving.clearcoat=.04;
  finishes.deck.roughness=.84;finishes.deck.clearcoat=.06;finishes.deck.bumpMap=stoneRelief;finishes.deck.roughnessMap=stoneRelief;finishes.deck.bumpScale=.012;
  finishes.chalk.roughness=.62;finishes.chalk.clearcoat=.15;finishes.sage.roughness=.39;finishes.sage.clearcoat=.5;finishes.oxide.roughness=.58;finishes.oxide.clearcoat=.18;
  const solids:Solid[]=[];
  function box(name:string,x:number,y:number,z:number,w:number,h:number,d:number,material:T.Material,solid=false){
    const object=new T.Mesh(craftedBox(w,h,d),material);object.name=name;object.position.set(x,y,z);object.castShadow=object.receiveShadow=true;root.add(object);
    if(solid){solids.push({x,y,z,w,h,d});object.userData.cameraSolid=true}
    return object;
  }
  function rail(x:number,y:number,z:number,length:number,alongX=true){
    box('Atelier_RailCap',x,y+1,z,alongX?length:.095,.09,alongX?.095:length,finishes.rail);
    box('Atelier_RailFoot',x,y+.2,z,alongX?length:.055,.055,alongX?.055:length,finishes.rail);
    const count=Math.ceil(length/.9);
    for(let index=0;index<=count;index++){const offset=-length/2+index/count*length;box('Atelier_RailSpindle',x+(alongX?offset:0),y+.56,z+(alongX?0:offset),.048,.83,.048,finishes.rail)}
  }
  box('Atelier_Forecourt',0,.31,24,26,.8,6,finishes.joint);
  for(const side of [-1,1])box('Atelier_ForecourtEdge',side*12.9,.67,24,.15,.17,6.1,finishes.chalk);
  box('Atelier_EntryDeck',-.8,.5,17.6,15.8,.48,8.4,finishes.rail);
  box('Atelier_EntryThreshold',0,.79,21.75,12,.09,.24,finishes.brass);
  box('Atelier_AtelierFoundation',-4.8,.55,12.35,8.9,.4,1,finishes.chalk);
  box('Atelier_WorkshopBackWall',-4.8,3.4,12.35,8.4,5.8,.3,finishes.plaster,true);
  box('Atelier_WestReturn',-9.15,3.45,13.7,.4,5.8,3.4,finishes.sage,true);
  box('Atelier_BackCornice',-4.8,6.45,12.4,9.15,.36,1.1,finishes.chalk);
  box('Atelier_BackLintel',-4.8,5.95,12.4,8.9,.38,.65,finishes.rail);
  for(const side of [-1,1])box('Atelier_BackPilaster',-4.8+side*4.2,3.4,12.4,.2,5.6,.6,finishes.chalk);
  const wings=[{x:-16,z:10,width:6,depth:7,height:12,finish:finishes.oxide},{x:17,z:10,width:6,depth:7,height:14,finish:finishes.sage}];
  for(const [index,wing] of wings.entries()){
    const masonry=wing.finish.clone();Object.assign(masonry,{name:'Workshop_PaintedMasonry_'+index,roughness:.87,metalness:0,clearcoat:.035,bumpMap:stoneRelief,roughnessMap:stoneRelief,bumpScale:.035});
    box('Atelier_WingShell_'+index,wing.x,wing.height/2+.25,wing.z,wing.width,wing.height,wing.depth,masonry,true);
    box('Atelier_WingSocle',wing.x,.36,wing.z,wing.width+.3,.62,wing.depth+.3,finishes.chalk);
    for(const level of [4.2,8.6,wing.height+.4])box('Atelier_WingCornice',wing.x,level,wing.z,wing.width+.5,.25,wing.depth+.5,finishes.chalk);
    box('Atelier_WingRoof',wing.x,wing.height+.66,wing.z,wing.width+.15,.22,wing.depth+.15,finishes.rail);
    for(const side of [-1,1])box('Atelier_WingCorner',wing.x+side*(wing.width/2-.15),wing.height/2+.25,wing.z+wing.depth/2+.07,.22,wing.height,.18,finishes.chalk);
  }
  const bridge=workshopBridge;
  box('Atelier_ServiceBridge',bridge.x,bridge.y-.25,bridge.z,bridge.width,.34,bridge.depth,finishes.sage).userData.cameraSolid=true;
  for(const side of [-1,1]){
    box('Atelier_BridgeGirder',bridge.x,bridge.y-.64,bridge.z+side*1.28,bridge.width,.52,.16,finishes.rail);
    if(side<0)rail(bridge.x,bridge.y,bridge.z+side*1.3,bridge.width);
    else{rail(-4.1,bridge.y,bridge.z+side*1.3,25.8);rail(15,bridge.y,bridge.z+side*1.3,2.5)}
  }
  const stair=workshopStair,run=(stair.startZ-stair.endZ)/stair.steps;
  for(let index=0;index<stair.steps;index++){
    const elevation=T.MathUtils.lerp(stair.bottom,stair.top,(index+1)/stair.steps),z=stair.startZ-(index+.5)*run;
    box('Atelier_StairTread',stair.x,elevation-.15,z,stair.width,.18,run+.025,finishes.chalk);
    if(index%2===0)for(const side of [-1,1])box('Atelier_StairBaluster',stair.x+side*stair.width/2,elevation+.37,z,.065,1.1,.065,finishes.rail);
  }
  for(const side of [-1,1]){
    const start=new T.Vector3(stair.x+side*stair.width/2,stair.bottom+.97,stair.startZ),end=new T.Vector3(start.x,stair.top+.97,stair.endZ);
    const handrail=box('Atelier_StairHandrail',0,0,0,.1,.1,start.distanceTo(end),finishes.brass);handrail.position.copy(start).add(end).multiplyScalar(.5);handrail.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),end.sub(start).normalize());
  }
  solids.push(...addWorkshopDetails(root,finishes));
  const courierContact=createGroundOcclusion('Atelier_CourierContact',{x:0,z:0,width:2.6,depth:2.2,y:0},[{x:0,z:0,width:1,depth:.65,round:true,strength:.36}],.65,64);
  courierContact.visible=false;root.add(courierContact);
  batchScenery(root,{});
  return {root,solids,
    blocked:sceneryCollision(solids,[]),
    update:(night:boolean,feet?:T.Vector3)=>{
      finishes.window.emissiveIntensity=night?2.4:.16;courierContact.visible=false;
      if(!feet||Math.abs(feet.y-.8)>.2)return;
      const deck=Math.min(feet.x+8.7,7.1-feet.x,feet.z-13.55,21.65-feet.z),forecourt=Math.min(13-Math.abs(feet.x),feet.z-21.7,27-feet.z),clearance=Math.max(deck,forecourt);
      if(clearance<=.2)return;
      courierContact.visible=true;courierContact.position.set(feet.x,deck>forecourt?.816:.784,feet.z);courierContact.material.opacity=T.MathUtils.smoothstep(clearance,.2,1.15);
    },
    height:(x:number,z:number,previous:number):number|null=>{
      const ramp=rampHeight(stair,x,z);if(ramp!==null&&Math.abs(previous-ramp)<.55)return ramp;
      if(Math.abs(x-bridge.x)<bridge.width/2-.24&&Math.abs(z-bridge.z)<bridge.depth/2-.18&&Math.abs(previous-bridge.y)<.55)return bridge.y;
      return null;
    },
  };
}