import * as T from 'three';

export type GroundOccluder={x:number;z:number;width:number;depth:number;strength?:number;round?:boolean};
export const blenderGroundArea={x:0,z:79,width:1070,depth:2560,y:.035} as const;
type FinishTextureLoader=(url:string,ready:(texture:T.Texture)=>void,failed:()=>void)=>void;

export function createBlenderGroundFinish(parent:T.Object3D,prepare?:(root:T.Object3D)=>Promise<void>,load?:FinishTextureLoader){
 const root=new T.Group();root.name='Blender_HomeSceneFinish';parent.add(root);
 const geometry=new T.PlaneGeometry(blenderGroundArea.width,blenderGroundArea.depth).rotateX(-Math.PI/2),material=new T.MeshBasicMaterial({color:'#203734',transparent:true,opacity:.65,depthWrite:false,toneMapped:false}),mesh=new T.Mesh(geometry,material);
 mesh.name='Blender_BakedGroundContact';mesh.position.set(blenderGroundArea.x,blenderGroundArea.y,blenderGroundArea.z);mesh.visible=false;mesh.userData.surface='baked-contact';root.add(mesh);
 let alive=true,resolveReady!:(value:boolean)=>void;const ready=new Promise<boolean>(resolve=>resolveReady=resolve),disposed=()=>{alive=false;resolveReady(false);material.removeEventListener('dispose',disposed)};material.addEventListener('dispose',disposed);
 if(typeof window==='undefined'&&!load){resolveReady(false);return {root,ready}}
 const request=load??((url,onReady,onFailure)=>{new T.TextureLoader().load(url,onReady,undefined,onFailure)});
 request('/assets/world-finish/motherboard-contact.png',texture=>{
  if(!alive){texture.dispose();resolveReady(false);return}
  texture.name='Blender_MotherboardSceneContact';texture.colorSpace=T.NoColorSpace;texture.anisotropy=4;material.map=texture;material.needsUpdate=true;
  const preparation=new T.Group();preparation.add(new T.Mesh(geometry,material));
  Promise.resolve(prepare?.(preparation)).then(()=>{preparation.clear();if(alive){mesh.visible=true;root.userData.blenderSceneFinish='scene-ao-v1';resolveReady(true)}else resolveReady(false)},()=>{preparation.clear();if(alive){material.map=null;texture.dispose()}resolveReady(false)});
 },()=>resolveReady(false));
 return {root,ready};
}

export function createGroundOcclusion(name:string,area:{x:number;z:number;width:number;depth:number;y:number},occluders:GroundOccluder[],feather=1.2,size=256){
 const data=new Uint8Array(size*size*4),falloff=Math.max(.05,feather);
 for(let row=0;row<size;row++)for(let column=0;column<size;column++){
  const horizontal=area.x+((column+.5)/size-.5)*area.width,forward=area.z+((row+.5)/size-.5)*area.depth;let shade=0;
  for(const occluder of occluders){
   const offsetX=Math.abs(horizontal-occluder.x),offsetZ=Math.abs(forward-occluder.z);
   const distance=occluder.round?Math.max(0,Math.hypot(offsetX/occluder.width,offsetZ/occluder.depth)*2-1)*Math.min(occluder.width,occluder.depth)/2:Math.hypot(Math.max(0,offsetX-occluder.width/2),Math.max(0,offsetZ-occluder.depth/2));
   const contact=Math.max(0,1-distance/falloff);shade=Math.max(shade,contact*contact*T.MathUtils.clamp(occluder.strength??.45,0,.8));
  }
  const offset=(row*size+column)*4;data[offset]=data[offset+1]=data[offset+2]=255;data[offset+3]=Math.round(shade*255);
 }
 const texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.name=name+'_Occlusion';texture.magFilter=texture.minFilter=T.LinearFilter;texture.needsUpdate=true;
 const material=new T.MeshBasicMaterial({color:'#132426',map:texture,transparent:true,depthWrite:false,toneMapped:false});
 const geometry=new T.PlaneGeometry(area.width,area.depth).rotateX(-Math.PI/2);geometry.attributes.uv.setY(0,1-geometry.attributes.uv.getY(0));
 for(let vertex=1;vertex<geometry.attributes.uv.count;vertex++)geometry.attributes.uv.setY(vertex,1-geometry.attributes.uv.getY(vertex));
 const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.position.set(area.x,area.y,area.z);mesh.castShadow=mesh.receiveShadow=false;mesh.userData.surface='baked-contact';return mesh;
}
