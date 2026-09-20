import * as T from 'three';
import {batchScenery} from './static-batching';
import {craftedBox,createCraftMaterials} from './crafted-surfaces';
import {metroDimensions,type MetroRig} from './transit-motion';
export function createTransitModels(){
 const surface=createCraftMaterials();
 const cream=surface('#e6dbc1'),copper=surface('#b98659',0,.65),navy=surface('#203a45',0,.35),rubber=surface('#253c3c'),glow=surface('#d7ead9',.55);
 const mesh=(g:T.Object3D,geo:T.BufferGeometry,m:T.Material,x=0,y=0,z=0)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o};
 const box=(g:T.Object3D,m:T.Material,x:number,y:number,z:number,w:number,h:number,d:number)=>mesh(g,craftedBox(w,h,d),m,x,y,z);
 function rover(color:string){
  const g=new T.Group();g.name='Rover';const paint=surface(color,0,.24);
  box(g,navy,0,.4,0,2.1,.48,3.25);box(g,paint,0,.8,0,2.25,.68,3.5);box(g,cream,0,1.08,.85,2.05,.23,1.42);
  box(g,navy,0,1.15,-.25,1.7,.18,1.6);box(g,copper,0,.55,1.85,2.35,.23,.18);box(g,copper,0,.55,-1.8,2.35,.23,.18);
  for(const x of [-1.05,1.05]){box(g,paint,x,1.3,-.2,.16,.65,1.8);box(g,copper,x,1.66,.54,.09,.75,.09)}
  box(g,navy,0,1.62,.56,1.95,.64,.08);box(g,copper,0,1.98,.56,2.15,.09,.13);
  for(const x of [-.73,.73]){mesh(g,new T.SphereGeometry(.16,12,8),glow,x,.95,1.75);box(g,copper,x,1,-1.76,.3,.15,.06)}
  const wheels:T.Mesh[]=[];for(const x of [-1.15,1.15])for(const z of [-1.1,1.1]){const tire=mesh(g,new T.CylinderGeometry(.51,.51,.34,20),rubber,x,.45,z);tire.rotation.z=Math.PI/2;wheels.push(tire);const hub=mesh(g,new T.CylinderGeometry(.27,.27,.37,16),copper,x,.45,z);hub.rotation.z=Math.PI/2}
  batchScenery(g,{wheels});return {root:g,wheels};
 }
 function train():MetroRig{
  const root=new T.Group();root.name='NeighborMetro';const carriages:MetroRig['carriages']=[],couplers:T.Mesh[]=[];
  for(let index=0;index<metroDimensions.carCount;index++){
   const body=new T.Group();body.name='MetroCar_'+index;root.add(body);
   box(body,navy,0,.45,0,2.8,.5,4.8);box(body,index===0?copper:cream,0,1,0,2.9,.65,4.6);box(body,navy,0,1.47,0,2.5,.14,4.2);
   for(const side of [-1,1]){box(body,cream,side*1.38,1.62,0,.14,1,4.3);for(let window=0;window<3;window++)box(body,navy,side*1.47,1.78,-1.25+window*1.25,.08,.55,.85);box(body,copper,side*1.48,1.11,0,.09,.13,4.4)}
   if(index>0)box(body,cream,0,2.34,0,3.03,.2,4.6);else box(body,cream,0,2.34,1.55,3.03,.2,1.35);
   if(index!==1){const end=index===0?1:-1;box(body,navy,0,1.82,end*2.16,2.5,.64,.08);for(const side of [-1,1])mesh(body,new T.SphereGeometry(.19,12,8),glow,side*.92,1.16,end*2.34)}
   const axles:T.Group[]=[],wheels:T.Mesh[]=[];
   for(let axleIndex=0;axleIndex<2;axleIndex++){
    const axle=new T.Group();axle.name=`MetroAxle_${index}_${axleIndex}`;root.add(axle);axles.push(axle);
    for(const side of [-1,1]){const wheel=mesh(axle,new T.CylinderGeometry(metroDimensions.wheelRadius,metroDimensions.wheelRadius,.2,20),navy,side*metroDimensions.gauge/2,metroDimensions.wheelRadius+metroDimensions.railRadius,0);wheel.rotation.z=Math.PI/2;wheel.name='MetroWheel';wheels.push(wheel)}
   }
   batchScenery(body,{});carriages.push({body,axles,wheels});
   if(index<metroDimensions.carCount-1){const coupler=mesh(root,new T.CylinderGeometry(.13,.13,1,8),copper);coupler.name='MetroCoupler';couplers.push(coupler)}
  }
  return {root,carriages,couplers};
 }
 function rocket(color:string){
  const g=new T.Group();g.name='DiagnosticRocket';const paint=surface(color,0,.25);
  const profile=[[0,0],[.85,0],[1.2,.6],[1.2,3.1],[1.05,4.2],[.65,5.3],[0,6]].map(([x,y])=>new T.Vector2(x,y));mesh(g,new T.LatheGeometry(profile,40),cream);
  mesh(g,new T.CylinderGeometry(1.22,1.22,.32,40),paint,0,1,0);mesh(g,new T.CylinderGeometry(1.08,1.08,.22,40),copper,0,4.12,0);
  const rim=mesh(g,new T.TorusGeometry(.55,.1,8,32),copper,0,3.1,1.13);rim.name='Rocket_Porthole';mesh(g,new T.SphereGeometry(.48,20,12),navy,0,3.1,1.12).scale.z=.2;
  for(let i=0;i<3;i++){const a=i/3*Math.PI*2,fin=box(g,paint,Math.sin(a)*1.25,.75,Math.cos(a)*1.25,.25,1.8,1.45);fin.rotation.y=a}
  const flame=mesh(g,new T.ConeGeometry(.65,2.5,16),surface('#eeb665',1.4),0,-1.1,0);flame.rotation.z=Math.PI;flame.name='Rocket_Exhaust';flame.visible=false;
  batchScenery(g,{flame});return {root:g,flame};
 }
 return {rover,train,rocket,surface,mesh,box,cream,copper,navy,glow};
}
