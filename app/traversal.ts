import * as T from 'three';
export type Ramp={id:string;x:number;width:number;startZ:number;endZ:number;bottom:number;top:number;steps:number};
export const ramStair:Ramp={id:'ram-reading-stair',x:15,width:2.4,startZ:-1,endZ:-8.4,bottom:.8,top:4.8,steps:20};
export const liftConfig={x:0,z:-21,size:3,bottom:.8,top:8.6,speed:2};
type Surface={id:string;x:number;z:number;width:number;depth:number;y:number};
export const upperSurfaces:Surface[]=[{id:'ram-balcony',x:20,z:-10.2,width:11,depth:4,y:4.8},{id:'sky-service-bridge',x:0,z:-25,width:3,depth:8,y:8.6},{id:'sky-main-walk',x:0,z:-26.4,width:15,depth:2.5,y:8.6}];
export function rampHeight(r:Ramp,x:number,z:number){if(Math.abs(x-r.x)>r.width/2-.2||z>r.startZ+.15||z<r.endZ-.15)return null;return T.MathUtils.lerp(r.bottom,r.top,T.MathUtils.clamp((r.startZ-z)/(r.startZ-r.endZ),0,1))}
export function createTraversal(scene:T.Scene,player:T.Group){
  const root=new T.Group();root.name='TraversableRoutes';scene.add(root);
  const material=new T.MeshStandardMaterial({color:'#b6b398',roughness:.85});const railMat=new T.MeshStandardMaterial({color:'#ae845b',roughness:.75});
  function box(x:number,y:number,z:number,w:number,h:number,d:number,rail=false){const o=new T.Mesh(new T.BoxGeometry(w,h,d),rail?railMat:material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;o.userData.cameraSolid=!rail;root.add(o);return o}
  const r=ramStair,run=(r.startZ-r.endZ)/r.steps;
  for(let i=0;i<r.steps;i++){const y=T.MathUtils.lerp(r.bottom,r.top,(i+1)/r.steps);box(r.x,y-.13,r.startZ-(i+.5)*run,r.width,.26,run+.025)}
  for(const side of [-1,1])for(let i=0;i<=r.steps;i+=2){const z=r.startZ-i*run,y=T.MathUtils.lerp(r.bottom,r.top,i/r.steps);box(r.x+side*r.width/2,y+.5,z,.1,1,.1,true);if(i<r.steps){const a=new T.Vector3(r.x+side*r.width/2,y+1,z),b=new T.Vector3(a.x,y+1+(r.top-r.bottom)*2/r.steps,z-run*2);const rail=box(0,0,0,.1,.1,a.distanceTo(b),true);rail.position.copy(a).add(b).multiplyScalar(.5);rail.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),b.sub(a).normalize())}}
  for(const s of upperSurfaces){box(s.x,s.y-.15,s.z,s.width,.3,s.depth);for(const side of [-1,1]){if(s.id==='ram-balcony'){box(s.x,s.y+.7,s.z+side*s.depth/2,s.width,.12,.12,true)}else if(s.id==='sky-service-bridge'){box(s.x+side*s.width/2,s.y+.65,-23.4,.12,.12,3.4,true)}else if(side===1){box(-4.5,s.y+.65,s.z+s.depth/2,6,.12,.12,true);box(4.5,s.y+.65,s.z+s.depth/2,6,.12,.12,true)}else box(s.x,s.y+.65,s.z+side*s.depth/2,s.width,.12,.12,true)}}
  // Keep a real opening where the stair meets the balcony.
  const front=root.children.find(o=>Math.abs(o.position.z+8.2)<.01&&o.position.y>5);if(front){front.scale.x=.8;front.position.x=21.1}
  const lift=box(0,.65,-21,3,.3,3);lift.name='ServiceLift_Platform';
  for(const x of [-1.65,1.65])box(x,4.5,-22, .15,9,.15,true);
  let y=.8,target=.8,moving=false;
  const aboard=()=>Math.abs(player.position.x)<1.3&&Math.abs(player.position.z+21)<1.3&&Math.abs(player.position.y-y)<.4;
  const near=()=>Math.hypot(player.position.x,player.position.z+21)<3.2;
  return {
    get moving(){return moving&&aboard()},
    interact:()=>{if(!near())return false;if(moving)return true;if(!aboard()){target=player.position.y>4?8.6:.8;moving=true;return true}target=y>4?.8:8.6;moving=true;return true},
    prompt:()=>near()?(moving?'Service lift moving · Please wait':aboard()?'E · Ride service lift':'E · Call service lift'):null,
    update:(dt:number)=>{const riding=aboard();const delta=T.MathUtils.clamp(target-y,-2*dt,2*dt);y+=delta;lift.position.y=y-.15;if(riding)player.position.y=y;moving=Math.abs(y-target)>.001},
    height:(x:number,z:number,previous:number):number|null=>{
      if(Math.abs(x)<1.3&&Math.abs(z+21)<1.3&&Math.abs(previous-y)<.45)return y;
      const ramp=rampHeight(r,x,z);if(ramp!==null&&Math.abs(previous-ramp)<.5)return ramp;
      for(const s of upperSurfaces)if(Math.abs(x-s.x)<s.width/2-.25&&Math.abs(z-s.z)<s.depth/2-.2&&Math.abs(previous-s.y)<.5)return s.y;
      // High edges are guarded: a missing floor cannot become an accidental drop.
      return previous>1.3?null:.8;
    }
  };
}
