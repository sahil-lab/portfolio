import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=.93;
document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#ccd1d0');scene.fog=new THREE.Fog('#ccd1d0',3,9);
const camera=new THREE.PerspectiveCamera(34,innerWidth/innerHeight,.003,300);
const controls=new OrbitControls(camera,renderer.domElement);controls.minDistance=.22;controls.maxDistance=3;controls.maxPolarAngle=Math.PI*.495;
const environment=new RoomEnvironment(),generator=new THREE.PMREMGenerator(renderer),environmentMap=generator.fromScene(environment,.05);
scene.environment=environmentMap.texture;scene.environmentIntensity=.48;environment.dispose();generator.dispose();
scene.add(new THREE.HemisphereLight('#fbf9f2','#a8b7b0',.65));
const key=new THREE.DirectionalLight('#fff7e8',2.3);key.position.set(-.8,1.1,.9);key.castShadow=true;key.shadow.mapSize.set(2048,2048);
Object.assign(key.shadow.camera,{left:-.55,right:.55,top:.55,bottom:-.55,near:.1,far:3});key.shadow.bias=-.00005;key.shadow.normalBias=.0004;key.target.position.set(0,.16,0);scene.add(key,key.target);
const fill=new THREE.DirectionalLight('#edf5ff',1.15);fill.position.set(.7,.6,.8);scene.add(fill);
const rim=new THREE.DirectionalLight('#fff5e2',1.65);rim.position.set(.5,.85,-.7);scene.add(rim);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshStandardMaterial({color:'#bdc7c2',roughness:.98}));ground.rotation.x=-Math.PI/2;ground.position.y=-.001;ground.receiveShadow=true;scene.add(ground);
const urls=['dog_web.glb','dog_web_lod1.glb','dog_web_lod2.glb'];
let model,bounds=new THREE.Box3(),currentView='three_quarter',currentAngle=.62,dirty=true,generation=0;
const status=document.querySelector('#status');
function disposeModel(root){
 const geometries=new Set(),materials=new Set(),textures=new Set();
 root.traverse(object=>{if(!object.isMesh)return;geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material]){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value)}});
 for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();for(const texture of textures)texture.dispose();
}
function setView(view='three_quarter',angle){
 currentView=view;const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
 const angles={three_quarter:.62,front:0,left:Math.PI/2,right:-Math.PI/2,rear:Math.PI,face:.03,top:.04};
 currentAngle=angle??angles[view];controls.target.copy(center);controls.target.y=size.y*.50;
 const elevation=view==='top'?1.05:view==='three_quarter'?.19:.07;
 let distance=(angle===undefined?1.12:1.44)*Math.max(1,.78/camera.aspect),height=elevation;
 if(view==='face'){controls.target.set(0,size.y*.76,bounds.max.z-.062);distance=.43*Math.max(1,.75/camera.aspect);height=.025}
 for(let attempt=0;attempt<5;attempt++){
  camera.position.copy(controls.target).add(new THREE.Vector3(Math.sin(currentAngle)*distance,height,Math.cos(currentAngle)*distance));camera.lookAt(controls.target);camera.updateMatrixWorld(true);
  if(view==='face')break;
  let extent=0;for(const horizontal of [bounds.min.x,bounds.max.x])for(const vertical of [bounds.min.y,bounds.max.y])for(const depth of [bounds.min.z,bounds.max.z]){const point=new THREE.Vector3(horizontal,vertical,depth).project(camera);extent=Math.max(extent,Math.abs(point.x),Math.abs(point.y))}
  if(extent<.87)break;distance*=extent/.86;
 }
 controls.update();dirty=true;
 document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));
}
function render(){renderer.render(scene,camera);dirty=false}
async function load(lod){
 const request=++generation;status.textContent='Loading';document.querySelector('#download').disabled=true;globalThis.__dogViewer.ready=false;
 try{
  const asset=await new GLTFLoader().loadAsync('/model/'+urls[lod]);
  if(request!==generation){disposeModel(asset.scene);return}
  if(model){scene.remove(model);disposeModel(model)}model=asset.scene;
  let triangles=0,fur=0;model.traverse(object=>{if(!object.isMesh)return;object.castShadow=object.receiveShadow=true;triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3;if(object.name.includes('FUR_'))fur++});
  scene.add(model);bounds.setFromObject(model);renderer.shadowMap.needsUpdate=true;setView(currentView);render();
  status.textContent=`LOD ${lod} / ${Math.round(triangles/1000)}k triangles`;
  document.querySelector('#download').disabled=false;Object.assign(globalThis.__dogViewer,{ready:true,lod,triangles,fur,model});
 }catch(error){status.textContent='Model could not load';console.error(error);globalThis.__dogViewer.error=String(error)}
}
controls.addEventListener('change',()=>{dirty=true});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);if(model)setView(currentView)});
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{document.querySelector('#rotate').checked=false;if(model){setView(button.dataset.view);render()}});
document.querySelector('#lod').addEventListener('change',event=>load(Number(event.target.value)));
document.querySelector('#download').addEventListener('click',()=>{const anchor=document.createElement('a');anchor.href='/model/'+urls[Number(document.querySelector('#lod').value)];anchor.download=urls[Number(document.querySelector('#lod').value)];anchor.click()});
let previous=performance.now();renderer.setAnimationLoop(()=>{const now=performance.now(),delta=Math.min(.06,(now-previous)/1000);previous=now;if(model&&document.querySelector('#rotate').checked)setView('three_quarter',currentAngle+delta*.38);if(model&&dirty)render()});
globalThis.__dogViewer={ready:false,load,renderer,camera,view:(view,angle)=>{setView(view,angle);render()},png:()=>{render();return renderer.domElement.toDataURL('image/png').split(',')[1]},pixels:()=>{
 render();const sample=document.createElement('canvas');sample.width=100;sample.height=100;const context=sample.getContext('2d');context.drawImage(renderer.domElement,0,0,100,100);const pixels=context.getImageData(0,0,100,100).data,colors=new Set();let hash=0;
 for(let index=0;index<pixels.length;index+=4){colors.add(`${pixels[index]>>3},${pixels[index+1]>>3},${pixels[index+2]>>3}`);hash=(Math.imul(hash,31)+pixels[index]*3+pixels[index+1]*5+pixels[index+2]*7)>>>0}
 return {colors:colors.size,hash};
}};
await load(0);
