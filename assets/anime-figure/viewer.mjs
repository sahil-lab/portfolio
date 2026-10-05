import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

const host=document.querySelector('#viewport'),status=document.querySelector('#status'),rotation=document.querySelector('#rotate');
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Anime figure turntable');host.append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#d9e4e0');scene.fog=new THREE.Fog('#d9e4e0',9,24);
const camera=new THREE.PerspectiveCamera(32,1,.01,80),controls=new OrbitControls(camera,renderer.domElement);
controls.enablePan=false;controls.minDistance=.40;controls.maxDistance=9;controls.maxPolarAngle=Math.PI*.50;controls.autoRotateSpeed=.9;
const studio=new RoomEnvironment(),generator=new THREE.PMREMGenerator(renderer),environment=generator.fromScene(studio,.05);
scene.environment=environment.texture;scene.environmentIntensity=.34;studio.dispose();generator.dispose();
scene.add(new THREE.HemisphereLight('#fff7ef','#6a8f88',1.35));
const key=new THREE.DirectionalLight('#fff5e8',2.45);key.position.set(-3,5,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.normalBias=.003;
Object.assign(key.shadow.camera,{left:-1.4,right:1.4,top:2.1,bottom:-.4,near:.1,far:12});scene.add(key,key.target);
const fill=new THREE.DirectionalLight('#e9f2ff',.65);fill.position.set(3,2,2);scene.add(fill);
const rim=new THREE.DirectionalLight('#ffffff',1.2);rim.position.set(1,3,-3);scene.add(rim);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:'#d9e4e0',roughness:.98}));floor.rotation.x=-Math.PI/2;floor.position.y=-.002;floor.receiveShadow=true;scene.add(floor);
const clay=new THREE.MeshStandardMaterial({color:'#bfceca',roughness:.8});
const bounds=new THREE.Box3(),size=new THREE.Vector3();let model,currentView='three_quarter',dirty=true,disposed=false;
const savedMaterials=new Map(),directions={front:[0,.075,1],three_quarter:[.48,.13,1],side:[1,.08,.025],back:[-.28,.11,-1],portrait:[.16,.035,1]};

function setView(view){
 currentView=view;const target=bounds.getCenter(new THREE.Vector3());
 let frame=bounds;
 if(view==='portrait'){
  target.set(0,bounds.max.y-size.y*.102,bounds.max.z*.24);
  frame=new THREE.Box3(target.clone().add(new THREE.Vector3(-.16,-.21,-.17)),target.clone().add(new THREE.Vector3(.16,.18,.17)));
 }
 const frameSize=frame.getSize(new THREE.Vector3()),direction=new THREE.Vector3(...directions[view]).normalize();
 let distance=Math.max(frameSize.y,frameSize.x/camera.aspect)/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2))*1.18+frameSize.z*.55;
 for(let attempt=0;attempt<6;attempt++){
  camera.position.copy(target).addScaledVector(direction,distance);camera.lookAt(target);camera.updateMatrixWorld(true);
  let extent=0;
  for(const horizontal of [frame.min.x,frame.max.x])for(const vertical of [frame.min.y,frame.max.y])for(const depth of [frame.min.z,frame.max.z]){
   const projected=new THREE.Vector3(horizontal,vertical,depth).project(camera);extent=Math.max(extent,Math.abs(projected.x),Math.abs(projected.y));
  }
  if(extent<.84)break;distance*=extent/.82;
 }
 controls.target.copy(target);controls.update();dirty=true;
 document.querySelectorAll('input[name=view]').forEach(input=>{input.checked=input.value===view});
}
function render(){if(disposed)return;renderer.render(scene,camera);dirty=false}
function resize(){const width=host.clientWidth,height=host.clientHeight;renderer.setSize(width,height);camera.aspect=width/Math.max(height,1);camera.updateProjectionMatrix();if(model)setView(currentView);dirty=true}
controls.addEventListener('change',()=>{dirty=true});
document.querySelectorAll('input[name=view]').forEach(input=>input.addEventListener('change',()=>{rotation.checked=false;controls.autoRotate=false;if(model)setView(input.value)}));
document.querySelectorAll('input[name=material]').forEach(input=>input.addEventListener('change',()=>{for(const [mesh,material] of savedMaterials)mesh.material=input.value==='clay'?clay:material;dirty=true}));
rotation.addEventListener('change',()=>{controls.autoRotate=rotation.checked;dirty=true});
const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
let previous=performance.now();renderer.setAnimationLoop(()=>{const now=performance.now(),delta=Math.min(.08,(now-previous)/1000);previous=now;if(controls.autoRotate)controls.update(delta);if(model&&dirty)render()});
function pixels(){
 render();const canvas=document.createElement('canvas');canvas.width=160;canvas.height=160;const context=canvas.getContext('2d');context.drawImage(renderer.domElement,0,0,160,160);
 const values=context.getImageData(0,0,160,160).data,colors=new Set();let hash=0;
 for(let index=0;index<values.length;index+=4){colors.add(`${values[index]>>3},${values[index+1]>>3},${values[index+2]>>3}`);hash=(Math.imul(hash,31)+values[index]*3+values[index+1]*5+values[index+2]*7)>>>0}
 return {colorBins:colors.size,hash};
}
function extent(){
 let result=0;
 for(const horizontal of [bounds.min.x,bounds.max.x])for(const vertical of [bounds.min.y,bounds.max.y])for(const depth of [bounds.min.z,bounds.max.z]){
  const projected=new THREE.Vector3(horizontal,vertical,depth).project(camera);result=Math.max(result,Math.abs(projected.x),Math.abs(projected.y));
 }
 return result;
}
globalThis.__animeViewer={ready:false,renderer,camera,controls,scene,view:setView,render,pixels,extent};
try{
 const gltf=await new GLTFLoader().loadAsync('/model/anime-figure.glb');model=gltf.scene;scene.add(model);bounds.setFromObject(model);bounds.getSize(size);
 let triangles=0,meshes=0;
 model.traverse(object=>{if(!object.isMesh)return;meshes++;triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3;object.castShadow=object.receiveShadow=true;savedMaterials.set(object,object.material)});
 renderer.shadowMap.needsUpdate=true;resize();render();status.textContent=`${Math.round(triangles/1000)}k triangles`;
 Object.assign(globalThis.__animeViewer,{ready:true,model,triangles,meshes,bounds,size});
}catch(error){status.textContent='Model unavailable';globalThis.__animeViewer.error=String(error);console.error(error)}
addEventListener('pagehide',()=>{
 disposed=true;renderer.setAnimationLoop(null);resizeObserver.disconnect();controls.dispose();
 const geometries=new Set(),materials=new Set();
 for(const [mesh,material] of savedMaterials){geometries.add(mesh.geometry);for(const finish of Array.isArray(material)?material:[material])materials.add(finish)}
 for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();floor.geometry.dispose();floor.material.dispose();clay.dispose();environment.dispose();key.shadow.dispose();renderer.dispose();
},{once:true});
