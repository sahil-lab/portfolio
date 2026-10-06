import * as T from 'three';
import {FontLoader,type FontData} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
import * as typeface from '../assets/fonts/helvetiker_regular.typeface.json';

const facadeFont=new FontLoader().parse(('default' in typeface?typeface.default:typeface) as FontData);

export function createFacadeLettering(parent:T.Object3D,name:string,text:string,width:number,height:number,position:T.Vector3,color='#ff73cd'){
  const geometry=new TextGeometry(text,{font:facadeFont,size:1,depth:.035,curveSegments:2,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:1});geometry.computeBoundingBox();
  const bounds=geometry.boundingBox!,size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),scale=Math.min(width/Math.max(size.x,.001),height/Math.max(size.y,.001));
  geometry.translate(-center.x,-center.y,-bounds.min.z);geometry.scale(scale,scale,1);geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const emission=new T.Color(color);emission.multiplyScalar(1/Math.max(emission.r,emission.g,emission.b,.001));
  emission.multiplyScalar(Math.max(1,.7/Math.max(.2126*emission.r+.7152*emission.g+.0722*emission.b,.001)));
  const material=new T.MeshStandardMaterial({color,roughness:.35,metalness:.05,emissive:emission,emissiveIntensity:3.2,toneMapped:false});material.userData.facadeLettering=true;material.userData.surface='light';material.userData.nightIllumination=4;material.userData.preserveEmissiveColor=true;
  const letters=new T.Mesh(geometry,material);letters.name=name;letters.position.copy(position);letters.castShadow=true;letters.userData.facadeLettering=text;letters.userData.readableDisplay=true;parent.add(letters);return letters;
}

export function createReadableDisplay(parent:T.Object3D,name:string,texture:T.Texture,width:number,height:number,depth:number,position:T.Vector3){
  const geometry=new T.PlaneGeometry(width,height),material=new T.MeshBasicMaterial({map:texture,toneMapped:false});
  const faces=[1,-1].map(side=>{
    const face=new T.Mesh(geometry,material);face.name=name+(side<0?'_Back':'');
    face.position.copy(position);face.position.z+=side*(depth/2+.04);face.rotation.y=side<0?Math.PI:0;
    face.userData.readableDisplay=true;face.userData.displaySide=side;parent.add(face);return face;
  });
  return {front:faces[0],back:faces[1]};
}
