/**
 * The Bengaluru planet as a satellite body in the kingdom's orbital sky, alongside the
 * GitHub (Forge) and LinkedIn (Citadel) worlds. It is a single textured globe: the city is
 * baked into an equirectangular texture at build time, so the kingdom pays one draw call and
 * one texture rather than streaming thousands of extruded buildings into an already busy scene.
 * The explorable planet opens from the Orbital Atlas; see bengaluru-planet.ts.
 */
import * as T from 'three';
import {bengaluruSatellite} from './bengaluru-satellite-config';
export {bengaluruSatellite,bengaluruVisitedKey} from './bengaluru-satellite-config';

export type BengaluruSatellite={root:T.Group;globe:T.Mesh;ready:Promise<boolean>;dispose():void};
type Options={position?:{x:number;y:number;z:number};radius?:number;textureUrl?:string;loadTexture?:boolean;textureWidth?:number};

/** Rasterises the build-time SVG into a canvas texture; skipped outside browsers so Node tests stay deterministic. */
async function loadSkyTexture(url:string,width:number):Promise<T.CanvasTexture|null>{
 if(typeof Image==='undefined'||typeof document==='undefined')return null;
 const image=new Image();image.decoding='async';image.src=url;
 try{await image.decode()}catch{return null}
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=width/2;
 const context=canvas.getContext('2d');if(!context||typeof context.drawImage!=='function')return null;
 context.drawImage(image,0,0,canvas.width,canvas.height);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;
 return texture;
}

export function createBengaluruSatellite(parent:T.Object3D,options:Options={}):BengaluruSatellite{
 const position=options.position??bengaluruSatellite,radius=options.radius??bengaluruSatellite.radius,root=new T.Group();root.name='Bengaluru_Satellite';root.position.set(position.x,position.y,position.z);
 // A 1x1 placeholder map keeps the globe out of the kingdom's static batcher (mapped standard materials are left intact) until the city texture arrives.
 const placeholder=new T.DataTexture(new Uint8Array([217,199,163,255]),1,1);placeholder.colorSpace=T.SRGBColorSpace;placeholder.needsUpdate=true;
 const material=new T.MeshStandardMaterial({map:placeholder,roughness:.92,metalness:0});
 const globe=new T.Mesh(new T.SphereGeometry(radius,64,32),material);globe.name='Bengaluru_Globe';globe.userData.bengaluruGlobe=true;
 // The texture centre (city crown) sits at +x of the sphere; turn it toward the kingdom at +z.
 globe.rotation.y=-Math.PI/2;globe.castShadow=false;globe.receiveShadow=false;root.add(globe);
 const haze=new T.Mesh(new T.SphereGeometry(radius*1.07,48,24),new T.ShaderMaterial({
  uniforms:{uColor:{value:new T.Color(.42,.66,1)}},
  vertexShader:'varying vec3 vNormal;void main(){vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'uniform vec3 uColor;varying vec3 vNormal;void main(){float intensity=pow(max(0.0,0.7-dot(vNormal,vec3(0.0,0.0,1.0))),2.6);gl_FragColor=vec4(uColor*intensity,intensity*0.9);}',
  side:T.BackSide,blending:T.AdditiveBlending,transparent:true,depthWrite:false,
 }));haze.name='Bengaluru_Haze';root.add(haze);
 root.userData.satellite=bengaluruSatellite.id;root.userData.route=bengaluruSatellite.route;
 parent.add(root);
 let disposed=false,texture:T.CanvasTexture|null=null;
 const ready=(options.loadTexture??true)?new Promise<boolean>(resolve=>{
  const begin=()=>loadSkyTexture(options.textureUrl??bengaluruSatellite.textureUrl,options.textureWidth??1536).then(loaded=>{
   if(!loaded||disposed){loaded?.dispose();resolve(false);return}
   texture=loaded;material.map=texture;material.needsUpdate=true;placeholder.dispose();resolve(true);
  },()=>resolve(false));
  // Rasterising the SVG costs main-thread time; wait for an idle slot after world start-up.
  if(typeof requestIdleCallback==='function')requestIdleCallback(begin,{timeout:4000});else setTimeout(begin,1500);
 }):Promise.resolve(false);
 return {
  root,globe,ready,
  dispose(){disposed=true;parent.remove(root);globe.geometry.dispose();haze.geometry.dispose();(haze.material as T.Material).dispose();material.dispose();placeholder.dispose();texture?.dispose()},
 };
}
