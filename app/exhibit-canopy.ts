import * as T from 'three';
import {batchScenery} from './static-batching';

export function createExhibitCanopy(x:number,z:number,studio:boolean){
  const root=new T.Group();root.name='Exhibit_CutawayCanopy';
  const shell=new T.MeshStandardMaterial({color:studio?'#4b86a5':'#438e87',roughness:.49,metalness:.22});
  const ivory=new T.MeshStandardMaterial({color:'#e2eced',roughness:.58});
  const metal=new T.MeshStandardMaterial({color:'#30434d',roughness:.4,metalness:.55});
  const glass=new T.MeshPhysicalMaterial({color:'#447c9b',roughness:.23,metalness:.28,clearcoat:.5});
  function box(name:string,x:number,y:number,z:number,width:number,height:number,depth:number,material:T.Material){
    const object=new T.Mesh(new T.BoxGeometry(width,height,depth),material);object.name=name;object.position.set(x,y,z);object.castShadow=object.receiveShadow=true;root.add(object);return object;
  }
  box('Exhibit_RoofDeck',0,3.9,0,11.5,.22,13.6,shell);
  for(const side of [-1,1]){
    box('Exhibit_RoofRim',side*5.75,4.12,0,.18,.42,13.7,ivory);
    box('Exhibit_RoofDrain',side*5.5,4.09,0,.16,.08,13.4,metal);
  }
  for(let bay=0;bay<4;bay++){
    const center=-4.8+bay*3.15;
    box('Exhibit_ClerestoryGlass',0,4.55,center-.94,9.8,.94,.08,glass);
    box('Exhibit_FoldedRoof',0,4.59,center,10.2,.12,2.05,shell).rotation.x=.44;
    for(let seam=0;seam<13;seam++)box('Exhibit_RoofCoolingSeam',-4.76+seam*.79,4.7,center,.038,.025,2.1,ivory).rotation.x=.44;
    box('Exhibit_LightStrip',0,4.12,center-.995,9.65,.045,.03,ivory);
    for(const side of [-1,1])box('Exhibit_ClerestoryFrame',side*5,4.58,center-.96,.09,1.1,.15,metal);
  }
  batchScenery(root,{});root.position.set(x,0,z);
  return {root,update:(position:T.Vector3,inside:boolean)=>{root.visible=!inside&&Math.hypot(position.x-x,position.z-z)>11.5}};
}