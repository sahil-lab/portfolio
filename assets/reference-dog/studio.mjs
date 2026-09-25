import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {buildDog,modelStatistics} from './model.mjs';

const query=new URLSearchParams(location.search),status=document.querySelector('#status');
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=.9;
document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#c9cecf');
scene.fog=new THREE.Fog('#c9cecf',3,8);
const camera=new THREE.PerspectiveCamera(32,innerWidth/innerHeight,.005,20);
const controls=new OrbitControls(camera,renderer.domElement);controls.minDistance=.22;controls.maxDistance=2.5;controls.maxPolarAngle=Math.PI*.495;controls.target.set(0,.2,0);
const environment=new RoomEnvironment(),prefilter=new THREE.PMREMGenerator(renderer),environmentMap=prefilter.fromScene(environment,.035);
scene.environment=environmentMap.texture;scene.environmentIntensity=.38;environment.dispose();prefilter.dispose();
const hemisphere=new THREE.HemisphereLight('#f7faf9','#a9b8b7',.4);scene.add(hemisphere);
const key=new THREE.DirectionalLight('#fff8ed',2.0);key.position.set(-.65,1.05,.7);key.castShadow=true;
key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-.55,right:.55,top:.55,bottom:-.55,near:.1,far:3});key.shadow.bias=-.00007;key.shadow.normalBias=.0006;key.shadow.radius=3;
key.target.position.set(0,.18,0);scene.add(key,key.target);
const fill=new THREE.DirectionalLight('#e4eff9',.8);fill.position.set(.8,.5,.9);scene.add(fill);
const rim=new THREE.DirectionalLight('#fff7e9',1.7);rim.position.set(.4,.75,-.65);scene.add(rim);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#bbc5c4',roughness:1}));
ground.rotation.x=-Math.PI/2;ground.position.y=-.001;ground.receiveShadow=true;scene.add(ground);
let model,dirty=true,currentAngle=.60;
const views={
  'three-quarter':{angle:.60,elevation:.17,target:[0,.186,.03],distance:1.04},
  front:{angle:0,elevation:.08,target:[0,.186,.035],distance:.99},
  side:{angle:Math.PI/2,elevation:.08,target:[0,.177,.025],distance:1.08},
  rear:{angle:Math.PI,elevation:.16,target:[0,.183,.005],distance:1.04},
  face:{angle:.03,elevation:.04,target:[0,.256,.267],distance:.43},
  above:{angle:.30,elevation:.80,target:[0,.18,0],distance:1.09},
};
function setView(name='three-quarter',angle){
  const view=views[name];currentAngle=angle??view.angle;
  let distance=(angle===undefined?view.distance:1.48)*Math.max(1,.75/camera.aspect);
  controls.target.fromArray(view.target);
  for(let attempt=0;attempt<5;attempt++){
    camera.position.copy(controls.target).add(new THREE.Vector3(Math.sin(currentAngle)*distance,view.elevation,Math.cos(currentAngle)*distance));
    camera.lookAt(controls.target);camera.updateMatrixWorld(true);
    if(!model||name==='face')break;
    const bounds=new THREE.Box3().setFromObject(model);let extent=0;
    for(const horizontal of [bounds.min.x,bounds.max.x])for(const vertical of [bounds.min.y,bounds.max.y])for(const depth of [bounds.min.z,bounds.max.z]){
      const projected=new THREE.Vector3(horizontal,vertical,depth).project(camera);extent=Math.max(extent,Math.abs(projected.x),Math.abs(projected.y));
    }
    if(extent<.90)break;distance*=extent/.89;
  }
  controls.update();dirty=true;
  document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===name)));
}
function render(){renderer.render(scene,camera);dirty=false}
controls.addEventListener('change',()=>{dirty=true});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);setView('three-quarter')});
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{document.querySelector('#rotate').checked=false;setView(button.dataset.view);render()});
document.querySelector('#download').addEventListener('click',()=>{const anchor=document.createElement('a');anchor.href='/reference-dog.glb';anchor.download='reference-dog.glb';anchor.click()});
let previous=performance.now();
renderer.setAnimationLoop(()=>{
  const now=performance.now(),delta=Math.min(.06,(now-previous)/1000);previous=now;
  if(document.querySelector('#rotate').checked){currentAngle+=delta*.32;setView('three-quarter',currentAngle)}
  if(dirty&&model)render();
});

try{
  model=query.has('build')?buildDog({density:Number(query.get('density')??'1')}):(await new GLTFLoader().loadAsync('/reference-dog.glb')).scene;
  model.traverse(object=>{if(object.isMesh){object.castShadow=object.receiveShadow=true}});
  scene.add(model);renderer.shadowMap.needsUpdate=true;setView();render();
  const statistics=modelStatistics(model);status.textContent='Standing study';
  document.querySelector('#download').disabled=query.has('build');
  globalThis.__dogStudio={
    ready:true,model,camera,renderer,statistics,
    view:(name,angle)=>{setView(name,angle);render()},
    render,
    pixels:()=>{
      render();const canvas=document.createElement('canvas');canvas.width=100;canvas.height=100;
      const context=canvas.getContext('2d');context.drawImage(renderer.domElement,0,0,100,100);
      const pixels=context.getImageData(0,0,100,100).data,colors=new Set();let hash=0;
      for(let index=0;index<pixels.length;index+=4){colors.add(`${pixels[index]>>3},${pixels[index+1]>>3},${pixels[index+2]>>3}`);hash=(Math.imul(hash,31)+pixels[index]*3+pixels[index+1]*5+pixels[index+2]*7)>>>0}
      return {colors:colors.size,hash};
    },
    png:()=>{render();return renderer.domElement.toDataURL('image/png').split(',')[1]},
    exportModel:async()=>{
      const data=await new GLTFExporter().parseAsync(model,{binary:true,onlyVisible:true,maxTextureSize:2048,includeCustomExtensions:false});
      const response=await fetch('/save-glb',{method:'POST',headers:{'Content-Type':'model/gltf-binary'},body:data});
      if(!response.ok)throw Error('GLB write failed');return {bytes:data.byteLength,statistics};
    },
  };
}catch(error){status.textContent='Model could not load';console.error(error);globalThis.__dogStudio={ready:false,error:String(error)}}
