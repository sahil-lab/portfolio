import * as T from 'three';
import type {WeatherSnapshot} from './weather-state';

export function createAstraRain(parent:T.Object3D){
  const root=new T.Group();root.name='Astra_RainOnStone';root.visible=false;parent.add(root);
  const shape=new T.Shape();shape.moveTo(1,0);
  for(let index=1;index<=48;index++){
    const angle=index/48*Math.PI*2,radius=.86+Math.sin(angle*3+.3)*.09+Math.cos(angle*5)*.05;
    shape.lineTo(Math.cos(angle)*radius,Math.sin(angle)*radius);
  }
  shape.closePath();
  const water=new T.MeshPhysicalMaterial({color:'#557b79',roughness:.095,metalness:.58,clearcoat:1,clearcoatRoughness:.08,transparent:true,opacity:.64,depthWrite:false});
  const geometry=new T.ShapeGeometry(shape).rotateX(-Math.PI/2);
  const patches=[{x:-4,z:26,y:.15,sx:1.4,sz:.6},{x:12,z:20,y:-.15,sx:1.65,sz:.55},{x:-3,z:89,y:.115,sx:2.7,sz:1.1},{x:4,z:106,y:.115,sx:2.3,sz:.85},{x:-4,z:126,y:.115,sx:1.8,sz:.85}];
  const puddles=new T.InstancedMesh(geometry,water,patches.length),dummy=new T.Object3D();puddles.name='Astra_ShallowRainMirrors';root.add(puddles);
  patches.forEach((patch,index)=>{dummy.position.set(patch.x,patch.y,patch.z);dummy.rotation.set(0,index*.83,0);dummy.scale.set(patch.sx,1,patch.sz);dummy.updateMatrix();puddles.setMatrixAt(index,dummy.matrix)});puddles.computeBoundingSphere();
  const rings=new T.InstancedMesh(new T.RingGeometry(.97,1,40).rotateX(-Math.PI/2),new T.MeshBasicMaterial({color:'#c6d6cb',transparent:true,opacity:.16,depthWrite:false}),patches.length*2);rings.name='Astra_RainRipples';rings.frustumCulled=false;root.add(rings);
  return {root,puddles,rings,update:(elapsed:number,reduced:boolean,weather:WeatherSnapshot,active:boolean)=>{
    root.visible=active&&['rain','drizzle','storm','sleet'].includes(weather.kind);if(!root.visible)return;
    water.opacity=weather.isDay?.55:.7;
    patches.forEach((patch,index)=>{
      for(let ring=0;ring<2;ring++){
        const phase=reduced?.45:((elapsed*.22+index*.31+ring*.5)%1),size=.06+phase*.46;
        dummy.position.set(patch.x+(ring?-.3:.4),patch.y+.008,patch.z);dummy.rotation.set(0,0,0);dummy.scale.set(size,1,size*.5);dummy.updateMatrix();rings.setMatrixAt(index*2+ring,dummy.matrix);
      }
    });rings.instanceMatrix.needsUpdate=true;
  }};
}