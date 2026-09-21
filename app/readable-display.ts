import * as T from 'three';

export function createReadableDisplay(parent:T.Object3D,name:string,texture:T.Texture,width:number,height:number,depth:number,position:T.Vector3){
  const geometry=new T.PlaneGeometry(width,height),material=new T.MeshBasicMaterial({map:texture,toneMapped:false});
  const faces=[1,-1].map(side=>{
    const face=new T.Mesh(geometry,material);face.name=name+(side<0?'_Back':'');
    face.position.copy(position);face.position.z+=side*(depth/2+.04);face.rotation.y=side<0?Math.PI:0;
    face.userData.readableDisplay=true;face.userData.displaySide=side;parent.add(face);return face;
  });
  return {front:faces[0],back:faces[1]};
}
