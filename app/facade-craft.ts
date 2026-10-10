import * as T from 'three';
import {mergeIndexedGeometries} from './static-batching';
import {mapWindowRoom,windowRoom} from './window-interiors';

export type FacadeFloor={bottom:number;top:number;width:number;depth:number;x?:number;z?:number};
export type FacadeFinishes={stone:T.Material;rail:T.Material;metal:T.Material;glass:T.Material;planter:T.Material;leaf:T.Material};
export type FacadeCraftOptions={floors:FacadeFloor[];finishes:FacadeFinishes;windows?:boolean;windowSeed?:string;planting?:boolean;frontBalcony?:boolean;roof?:boolean;profile?:'chamfer'|'arch'|'square';balconies?:boolean;bays?:number;bayOffset?:number;balconyFaces?:number[];entry?:{x:number;width:number}};

function windowShape(width:number,height:number,profile:FacadeCraftOptions['profile']='chamfer',inset=0){
 const halfWidth=width/2-inset,halfHeight=height/2-inset,corner=Math.min(.18,width*.17,height*.1),shape=new T.Shape();
 if(profile==='arch'){
  const radius=Math.min(halfWidth,halfHeight*.7);shape.moveTo(-halfWidth,-halfHeight);shape.lineTo(halfWidth,-halfHeight);shape.lineTo(halfWidth,halfHeight-radius);shape.quadraticCurveTo(halfWidth,halfHeight,0,halfHeight);shape.quadraticCurveTo(-halfWidth,halfHeight,-halfWidth,halfHeight-radius);shape.lineTo(-halfWidth,-halfHeight);
 }else if(profile==='square'){
  shape.moveTo(-halfWidth,-halfHeight);shape.lineTo(halfWidth,-halfHeight);shape.lineTo(halfWidth,halfHeight);shape.lineTo(-halfWidth,halfHeight);
 }else{
  shape.moveTo(-halfWidth+corner,-halfHeight);shape.lineTo(halfWidth-corner,-halfHeight);shape.lineTo(halfWidth,-halfHeight+corner);shape.lineTo(halfWidth,halfHeight-corner);shape.lineTo(halfWidth-corner,halfHeight);shape.lineTo(-halfWidth+corner,halfHeight);shape.lineTo(-halfWidth,halfHeight-corner);shape.lineTo(-halfWidth,-halfHeight+corner);
 }
 shape.closePath();return shape;
}

const windowFrames=new Map<string,T.BufferGeometry>();
export function indexFacadeGeometry(geometry:T.BufferGeometry){
 if(geometry.index)return geometry;
 const attributes=Object.entries(geometry.attributes);if(attributes.some(([,attribute])=>!(attribute.array instanceof Float32Array)||'data' in attribute))return geometry;
 const words=attributes.map(([,attribute])=>new Uint32Array(attribute.array.buffer,attribute.array.byteOffset,attribute.array.length)),unique=new Map<string,number>(),retained:number[]=[],count=geometry.attributes.position.count,indices=count>65535?new Uint32Array(count):new Uint16Array(count),keyParts:number[]=[];
 for(let vertex=0;vertex<count;vertex++){
  keyParts.length=0;for(let attribute=0;attribute<attributes.length;attribute++){const stride=attributes[attribute][1].itemSize;for(let component=0;component<stride;component++)keyParts.push(words[attribute][vertex*stride+component])}
  const key=keyParts.join('/');let index=unique.get(key);if(index===undefined){index=retained.length;unique.set(key,index);retained.push(vertex)}indices[vertex]=index;
 }
 if(retained.length===count)return geometry;
 for(const [name,attribute] of attributes){const source=new Uint32Array(attribute.array.buffer,attribute.array.byteOffset,attribute.array.length),values=new Float32Array(retained.length*attribute.itemSize),bits=new Uint32Array(values.buffer);for(let vertex=0;vertex<retained.length;vertex++)for(let component=0;component<attribute.itemSize;component++)bits[vertex*attribute.itemSize+component]=source[retained[vertex]*attribute.itemSize+component];geometry.setAttribute(name,new T.BufferAttribute(values,attribute.itemSize,attribute.normalized))}
 geometry.setIndex(new T.BufferAttribute(indices,1));return geometry;
}

export function facadeWindowFrame(width:number,height:number,profile:FacadeCraftOptions['profile']='chamfer'){
 const key=JSON.stringify([width,height,profile]),cached=windowFrames.get(key);
 if(cached){windowFrames.delete(key);windowFrames.set(key,cached);return cached.clone()}
 const bevel=Math.min(.012,width*.03,height*.02),shape=windowShape(width-bevel*2,height-bevel*2,profile);shape.holes.push(windowShape(width,height,profile,.085));
 const extruded=new T.ExtrudeGeometry(shape,{depth:.12-bevel*2,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:bevel,bevelThickness:bevel,curveSegments:5}).translate(0,0,bevel),geometry=indexFacadeGeometry(new T.BufferGeometry().copy(extruded));extruded.dispose();geometry.computeBoundingBox();geometry.computeBoundingSphere();windowFrames.set(key,geometry);
 if(windowFrames.size>64){const oldest=windowFrames.keys().next().value!;windowFrames.get(oldest)!.dispose();windowFrames.delete(oldest)}
 return geometry.clone();
}

export function addFacadeCraft(parent:T.Object3D,options:FacadeCraftOptions){
 const root=new T.Group();root.name='Atelier_FacadeCraft';root.userData.architectureStandard='crafted';parent.add(root);
 const parts=new Map<T.Material,T.BufferGeometry[]>(),counts:Record<string,number>={},dummy=new T.Object3D(),finishes=options.finishes;
 function piece(name:string,geometry:T.BufferGeometry,material:T.Material,position:T.Vector3,rotation?:T.Quaternion){
  dummy.position.copy(position);dummy.quaternion.copy(rotation??new T.Quaternion());dummy.scale.set(1,1,1);dummy.updateMatrix();
    geometry.applyMatrix4(dummy.matrix);
    const list=parts.get(material)??[];list.push(geometry);parts.set(material,list);counts[name]=(counts[name]??0)+1;
 }
 function box(name:string,position:T.Vector3,size:[number,number,number],material:T.Material,rotation?:T.Quaternion){piece(name,new T.BoxGeometry(...size),material,position,rotation)}
 function facePoint(floor:FacadeFloor,face:number,horizontal:number,height:number,outward:number){
  const rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),face*Math.PI/2),radius=face%2?floor.width/2:floor.depth/2;
  return {position:new T.Vector3(horizontal,height,radius+outward).applyQuaternion(rotation).add(new T.Vector3(floor.x??0,0,floor.z??0)),rotation};
 }
 function detail(floor:FacadeFloor,face:number,name:string,horizontal:number,height:number,outward:number,size:[number,number,number],material:T.Material){const point=facePoint(floor,face,horizontal,height,outward);box(name,point.position,size,material,point.rotation)}
 options.floors.forEach((floor,index)=>{
  const floorHeight=floor.top-floor.bottom;
  for(let face=0;face<4;face++){
   const span=face%2?floor.depth:floor.width;
   detail(floor,face,'floorBand',0,floor.top-.025,.018,[span+.06,.1,.09],finishes.stone);
   detail(floor,face,'corniceShadow',0,floor.top-.13,.015,[span,.035,.055],finishes.rail);
   for(const side of [-1,1]){
    detail(floor,face,'cornerPier',side*(span/2-.14),(floor.bottom+floor.top)/2,.025,[.095,floorHeight,.08],finishes.stone);
    for(const fraction of [.2,.6])detail(floor,face,'brassQuoin',side*(span/2-.2),floor.bottom+floorHeight*fraction,.072,[.18,.11,.07],finishes.metal);
   }
   if(options.windows!==false){
    const bays=span<3?2:options.bays??(span>5?3:2),bayWidth=Math.min(1.38,span/(bays+1)*.87),bayHeight=Math.min(2.3,floorHeight*.64),elevation=floor.bottom+floorHeight*.53;
    for(let bay=0;bay<bays;bay++){
    const horizontal=(bay-(bays-1)/2)*span/(bays+.65)+(options.bayOffset??0);
    if(index===0&&face===0&&options.entry&&Math.abs(horizontal-options.entry.x)<(bayWidth+options.entry.width)/2+.14)continue;
    counts['windowsFace'+face]=(counts['windowsFace'+face]??0)+1;
    const point=facePoint(floor,face,horizontal,elevation,.055);
     piece('windowReveal',facadeWindowFrame(bayWidth,bayHeight,options.profile),finishes.stone,point.position,point.rotation);
    const pane=new T.ShapeGeometry(windowShape(bayWidth-.14,bayHeight-.14,options.profile),5);if(options.windowSeed)mapWindowRoom(pane,bayWidth-.14,bayHeight-.14,windowRoom(options.windowSeed,index,face,bay));
    piece('windowPane',pane,finishes.glass,point.position.clone().add(new T.Vector3(0,0,.02).applyQuaternion(point.rotation)),point.rotation);
     detail(floor,face,'windowMullion',horizontal,elevation,.108,[.028,bayHeight-.22,.026],finishes.metal);
     detail(floor,face,'windowTransom',horizontal,elevation-bayHeight*.1,.11,[bayWidth-.18,.028,.028],finishes.metal);
     detail(floor,face,'windowSill',horizontal,elevation-bayHeight/2-.055,.12,[bayWidth+.13,.09,.25],finishes.stone);
     for(const side of [-1,1])detail(floor,face,'windowLatch',horizontal+side*bayWidth*.17,elevation,.133,[.035,.11,.04],finishes.metal);
    }
   }
    if(index>0&&options.balconies!==false&&(!options.balconyFaces||options.balconyFaces.includes(face))){
    const ledge=face%2?.19:.48,railWidth=span*.82,elevation=floor.bottom+.04;
    if(face!==0||options.frontBalcony!==false){
     detail(floor,face,'balconySlab',0,elevation,ledge/2,[railWidth,.12,ledge],finishes.stone);
     detail(floor,face,'balconyHandrail',0,elevation+.68,ledge-.025,[railWidth,.055,.055],finishes.rail);
     detail(floor,face,'balconyFootrail',0,elevation+.15,ledge-.025,[railWidth,.035,.035],finishes.rail);
     const posts=Math.max(4,Math.ceil(railWidth/.54));
     for(let post=0;post<=posts;post++)detail(floor,face,'balconySpindle',-railWidth/2+post*railWidth/posts,elevation+.405,ledge-.025,[.035,.56,.035],finishes.rail);
     for(const side of [-1,1]){
      detail(floor,face,'balconyReturn',side*railWidth/2,elevation+.68,ledge/2,[.045,.055,ledge],finishes.rail);
      detail(floor,face,'balconyBracket',side*railWidth*.32,elevation-.14,ledge*.27,[.085,.24,ledge*.72],finishes.metal);
     }
    }
    if(options.planting!==false&&face%2===0)for(const side of [-1,1]){
     detail(floor,face,'windowBox',side*span*.3,elevation+.18,.26,[Math.min(.55,span*.17),.21,.3],finishes.planter);
     const point=facePoint(floor,face,side*span*.3,elevation+.36,.27);piece('balconyPlant',new T.IcosahedronGeometry(.17,0),finishes.leaf,point.position,point.rotation);
    }
   }
  }
 });
 const first=options.floors[0],top=options.floors.at(-1)!;
 for(const side of [-1,1]){
  const x=(first.x??0)+side*(first.width/2-.15),z=(first.z??0)-first.depth/2-.045;
  box('rainPipe',new T.Vector3(x,(first.bottom+top.top)/2,z),[.055,top.top-first.bottom,.055],finishes.metal);
  for(const floor of options.floors)box('pipeClip',new T.Vector3(x,floor.bottom+.34,z),[.13,.045,.08],finishes.rail);
 }
 if(options.roof!==false){
  const elevation=top.top+.28;
  for(let face=0;face<4;face++){
   const span=(face%2?top.depth:top.width)*.82;
   detail(top,face,'roofParapet',0,elevation,.005,[span,.17,.1],finishes.stone);
   detail(top,face,'roofCoping',0,elevation+.11,.015,[span+.08,.055,.17],finishes.metal);
  }
  piece('roofSkylight',new T.BoxGeometry(top.width*.28,.08,top.depth*.24),finishes.glass,new T.Vector3(top.x??0,elevation+.08,top.z??0));
 }
 for(const [material,geometries] of parts){
    const mesh=new T.Mesh(mergeIndexedGeometries(geometries)!,material);mesh.name='Atelier_CraftedDetails';mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);geometries.forEach(geometry=>geometry.dispose());
 }
 root.userData.detailCounts=counts;root.userData.facades=4;root.userData.storeys=options.floors.length;
 parent.userData.architectureStandard='crafted';return root;
}
