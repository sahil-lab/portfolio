/**
 * Bengaluru planet renderer: a framework-neutral Three.js module that bends flat OSM tiles
 * onto a fictional sphere on the GPU, streams tiles by visibility and screen size, adapts
 * quality from measured frame times, and exposes a small lifecycle contract so React, Vue
 * or a plain page can host it. The semantic layer (landmark list, search, live details)
 * belongs to the host; this module only owns the canvas and its label overlay.
 */
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createPlanetProjection} from './bengaluru-projection';
import {createTileManager,type TileLevel,type TileManager} from './bengaluru-tiles';
import {createQualityGovernor,type QualityTier} from './quality-tiers';
import type {FeatureRecord,PlanetManifest,TileRecord} from './bengaluru-pipeline';

export type PlanetQuality='high'|'medium'|'low';
export type PlanetQualityChoice=PlanetQuality|'auto';
export type PlanetMode='webgl'|'svg'|'error';
export type PlanetSelection={feature:FeatureRecord;tile:string;origin:'pointer'|'focus'};
export type PlanetStatus={mode:PlanetMode;quality:PlanetQuality;qualityChoice:PlanetQualityChoice;tilesResident:number;tilesLoading:number;tilesWanted:number;bytes:number;drawCalls:number;triangles:number;frameMs:number;failedTiles:number;message?:string;sphereMorph:number;autoRotate:boolean};
export type TileAsset={group:T.Group;geometries:T.BufferGeometry[];materials:T.Material[];features:FeatureRecord[];uniforms:{selected:{value:number}};bytes:number;trees?:T.InstancedMesh;treeTotal:number;tile:TileRecord;level:TileLevel};
export type PlanetMountOptions={
 manifest:PlanetManifest;
 /** Base URL of the published build, e.g. /assets/bengaluru-v1/ */
 assetBase:string;
 quality?:PlanetQualityChoice;
 reducedMotion?:boolean;
 autoRotate?:boolean;
 onSelect?(selection:PlanetSelection|null):void;
 onStatus?(status:PlanetStatus):void;
 /** Injectable tile loader for tests and alternative transports. */
 loadTile?(tile:TileRecord,level:TileLevel,signal:AbortSignal):Promise<TileAsset>;
 fetch?:typeof fetch;
};
export type PlanetHandle={
 readonly mode:PlanetMode;
 setQuality(choice:PlanetQualityChoice):void;
 focusFeature(id:string):boolean;
 /** Camera orbit nudges for keyboard users: azimuth/polar in radians, zoom as a distance factor. */
 orbit(azimuth:number,polar:number):void;
 zoom(factor:number):void;
 resetView():void;
 setAutoRotate(on:boolean):void;
 setCameraTransitions(mode:'instant'|'smooth'):void;
 setSphereMorph(value:number):void;
 /** Schedules one frame; hosts can also dispatch a `blr-request-render` event on the mount element. */
 requestRender():void;
 resize():void;
 getStatus():PlanetStatus;
 getSelection():PlanetSelection|null;
 dispose():void;
};

const qualityByTier:Record<QualityTier,PlanetQuality>={high:'high',balanced:'medium',low:'low'};
const tierByQuality:Record<PlanetQuality,QualityTier>={high:'high',medium:'balanced',low:'low'};
export const qualityProfiles:Record<PlanetQuality,{pixelRatio:number;treeDensity:number;labels:number;lodSwitchPx:number}>={high:{pixelRatio:2,treeDensity:1,labels:14,lodSwitchPx:200},medium:{pixelRatio:1.5,treeDensity:.6,labels:9,lodSwitchPx:280},low:{pixelRatio:1,treeDensity:.3,labels:5,lodSwitchPx:400}};
const maxBuildingHeightM=70;

/** Startup decision: WebGL2 is required by the current Three.js renderer; reduced motion keeps WebGL but disables autorotation and transitions. */
export function chooseRenderer(win:Pick<Window,'document'|'matchMedia'>|undefined=typeof window==='undefined'?undefined:window):'three'|'three-low-motion'|'svg'{
 if(!win)return 'svg';
 try{const canvas=win.document.createElement('canvas');if(!canvas.getContext('webgl2'))return 'svg'}catch{return 'svg'}
 return win.matchMedia('(prefers-reduced-motion: reduce)').matches?'three-low-motion':'three';
}

const bendChunk=`
uniform float uPlanetRadius;uniform float uSphereMorph;uniform float uSelected;
attribute float _featureid;varying float vSelected;
vec3 blrBend(vec3 local){
 float rho=length(local.xz);float theta=rho/uPlanetRadius;float r=uPlanetRadius+local.y;
 vec2 dir=rho>1e-5?local.xz/rho:vec2(0.0);float s=sin(theta);
 vec3 sphere=vec3(r*s*dir.x,r*cos(theta),r*s*dir.y);
 vec3 planar=vec3(local.x,uPlanetRadius+local.y,local.z);
 return mix(planar,sphere,uSphereMorph);
}`;

/** Clones a template material and injects the planar->spherical vertex stage plus the selection tint. */
export function createBentMaterial(template:T.MeshStandardMaterial,shared:{radius:{value:number};morph:{value:number}},selected:{value:number}){
 const material=template.clone();
 material.onBeforeCompile=shader=>{
  shader.uniforms.uPlanetRadius=shared.radius;shader.uniforms.uSphereMorph=shared.morph;shader.uniforms.uSelected=selected;
  shader.vertexShader=shader.vertexShader
   .replace('#include <common>','#include <common>\n'+bendChunk)
   .replace('#include <begin_vertex>','#include <begin_vertex>\nvec3 blrBent=blrBend((modelMatrix*vec4(transformed,1.0)).xyz);vSelected=abs(_featureid-uSelected)<0.5?1.0:0.0;')
   .replace('#include <project_vertex>','vec4 mvPosition=viewMatrix*vec4(blrBent,1.0);gl_Position=projectionMatrix*mvPosition;')
   .replace('#include <worldpos_vertex>','#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0\nvec4 worldPosition=vec4(blrBent,1.0);\n#endif');
  shader.fragmentShader=shader.fragmentShader
   .replace('#include <common>','#include <common>\nvarying float vSelected;')
   .replace('#include <dithering_fragment>','#include <dithering_fragment>\ngl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(1.0,0.72,0.22),vSelected*0.7);');
 };
 material.customProgramCacheKey=()=>'blr-bend-3';
 return material;
}

const groundChunk=`
varying vec3 vBlrDir;uniform float uCapTheta;
float blrHash(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
float blrNoise(vec3 p){vec3 i=floor(p);vec3 f=fract(p);f=f*f*(3.0-2.0*f);
 float n000=blrHash(i),n100=blrHash(i+vec3(1,0,0)),n010=blrHash(i+vec3(0,1,0)),n110=blrHash(i+vec3(1,1,0)),n001=blrHash(i+vec3(0,0,1)),n101=blrHash(i+vec3(1,0,1)),n011=blrHash(i+vec3(0,1,1)),n111=blrHash(i+vec3(1,1,1));
 return mix(mix(mix(n000,n100,f.x),mix(n010,n110,f.x),f.y),mix(mix(n001,n101,f.x),mix(n011,n111,f.x),f.y),f.z);}`;

function createGroundMaterial(capTheta:number){
 const material=new T.MeshStandardMaterial({color:0xffffff,roughness:.95,metalness:0});
 material.onBeforeCompile=shader=>{
  shader.uniforms.uCapTheta={value:capTheta};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vBlrDir;').replace('#include <begin_vertex>','#include <begin_vertex>\nvBlrDir=normalize(position);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+groundChunk).replace('#include <color_fragment>',`#include <color_fragment>
   float theta=acos(clamp(vBlrDir.y,-1.0,1.0));
   float n=blrNoise(vBlrDir*6.0)*0.6+blrNoise(vBlrDir*19.0)*0.4;
   vec3 cap=mix(vec3(0.78,0.69,0.52),vec3(0.70,0.60,0.45),n);
   vec3 sage=vec3(0.30,0.40,0.26);vec3 ochre=vec3(0.55,0.44,0.28);vec3 far=mix(sage,ochre,smoothstep(0.35,0.7,n));
   far=mix(far,vec3(0.80,0.82,0.80),smoothstep(2.75,3.14,theta));
   vec3 base=mix(cap,far,smoothstep(uCapTheta*1.02,uCapTheta*1.45,theta));
   diffuseColor.rgb*=base;`);
 };
 material.customProgramCacheKey=()=>'blr-ground-2';
 return material;
}

function createAtmosphere(radius:number){
 const material=new T.ShaderMaterial({
  uniforms:{uColor:{value:new T.Color(0.42,0.66,1)}},
  vertexShader:'varying vec3 vNormal;void main(){vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'uniform vec3 uColor;varying vec3 vNormal;void main(){float intensity=pow(max(0.0,0.72-dot(vNormal,vec3(0.0,0.0,1.0))),2.4);gl_FragColor=vec4(uColor*intensity,intensity);}',
  side:T.BackSide,blending:T.AdditiveBlending,transparent:true,depthWrite:false,
 });
 const mesh=new T.Mesh(new T.SphereGeometry(radius*1.09,96,48),material);mesh.renderOrder=2;return mesh;
}

function createStars(radius:number,count=2200){
 let seed=1234567;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const positions=new Float32Array(count*3);
 for(let i=0;i<count;i++){const z=random()*2-1,phi=random()*Math.PI*2,r=Math.sqrt(1-z*z);positions.set([r*Math.cos(phi)*radius,z*radius,r*Math.sin(phi)*radius],i*3)}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
 return new T.Points(geometry,new T.PointsMaterial({color:0xdfe6ff,size:1.6,sizeAttenuation:false,depthWrite:false,transparent:true,opacity:.85}));
}

export function createTreeGeometry(){
 const trunk=new T.CylinderGeometry(.32,.45,3.2,5),canopy=new T.ConeGeometry(2.7,6,6);trunk.translate(0,1.6,0);canopy.translate(0,6.1,0);
 canopy.computeBoundingSphere();
 const paint=(geometry:T.BufferGeometry,color:T.Color)=>{const count=geometry.attributes.position.count,colors=new Float32Array(count*3);for(let i=0;i<count;i++)colors.set([color.r,color.g,color.b],i*3);geometry.setAttribute('color',new T.BufferAttribute(colors,3))};
 paint(trunk,new T.Color(0x5a3e2b));paint(canopy,new T.Color(0x3f7a3c));
 const merged=new T.BufferGeometry(),parts=[trunk.toNonIndexed(),canopy.toNonIndexed()],total=parts.reduce((sum,part)=>sum+part.attributes.position.count,0);
 const positions=new Float32Array(total*3),colors=new Float32Array(total*3);let offset=0;
 for(const part of parts){positions.set(part.attributes.position.array as Float32Array,offset*3);colors.set(part.attributes.color.array as Float32Array,offset*3);offset+=part.attributes.position.count;part.dispose()}
 merged.setAttribute('position',new T.BufferAttribute(positions,3));merged.setAttribute('color',new T.BufferAttribute(colors,3));merged.computeVertexNormals();merged.userData.cameraCanopy=canopy.boundingSphere!.clone();
 trunk.dispose();canopy.dispose();return merged;
}

export function mountBengaluruPlanet(element:HTMLElement,options:PlanetMountOptions):PlanetHandle{
 const {manifest}=options,projection=createPlanetProjection({cityRadiusM:manifest.projection.cityRadiusM,capAngleDeg:manifest.projection.capAngleDeg}),R=projection.radius;
 const renderMode=chooseRenderer();
 const reducedMotion=options.reducedMotion??renderMode==='three-low-motion';
 let qualityChoice:PlanetQualityChoice=options.quality??'auto',status:PlanetStatus={mode:'webgl',quality:'medium',qualityChoice,tilesResident:0,tilesLoading:0,tilesWanted:0,bytes:0,drawCalls:0,triangles:0,frameMs:0,failedTiles:0,sphereMorph:1,autoRotate:false};
 const fail=(mode:PlanetMode,message:string):PlanetHandle=>{
  status={...status,mode,message};options.onStatus?.(status);
  const noop=()=>{};
  return {mode,setQuality:noop,focusFeature:()=>false,orbit:noop,zoom:noop,resetView:noop,setAutoRotate:noop,setCameraTransitions:noop,setSphereMorph:noop,requestRender:noop,resize:noop,getStatus:()=>status,getSelection:()=>null,dispose:noop};
 };
 if(renderMode==='svg')return fail('svg','WebGL2 is not available; showing the illustrated fallback.');

 let renderer:T.WebGLRenderer;
 try{renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance',alpha:false})}
 catch(error){return fail('error',error instanceof Error?error.message:'WebGL renderer could not start.')}
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;renderer.setClearColor(0x0b1626,1);
 const canvas=renderer.domElement;canvas.className='blr-canvas';canvas.setAttribute('aria-hidden','true');canvas.style.touchAction='none';element.appendChild(canvas);
 const labelLayer=element.ownerDocument.createElement('div');labelLayer.className='blr-labels';labelLayer.setAttribute('aria-hidden','true');element.appendChild(labelLayer);

 const scene=new T.Scene();
 const camera=new T.PerspectiveCamera(38,1,10,R*60);
 const shared={radius:{value:R},morph:{value:1}};
 const capTheta=manifest.projection.capAngleDeg/2*Math.PI/180;
 const ground=new T.Mesh(new T.SphereGeometry(R,320,160),createGroundMaterial(capTheta));scene.add(ground);
 const atmosphere=createAtmosphere(R);scene.add(atmosphere);const stars=createStars(R*30);scene.add(stars);
 // Flat-map mode: a plain board under the unbent tiles, sized to the mapped area.
 const [b0,b1,b2,b3]=manifest.aoi.localBounds,flatBoard=new T.Mesh(new T.PlaneGeometry(b2-b0+600,b3-b1+600),new T.MeshStandardMaterial({color:0xb9a98a,roughness:1,metalness:0}));
 flatBoard.rotation.x=-Math.PI/2;flatBoard.position.set((b0+b2)/2,R-.2,-(b1+b3)/2);flatBoard.visible=false;scene.add(flatBoard);
 const sun=new T.DirectionalLight(0xfff1dc,1.9);sun.position.set(-.45,.82,.36).multiplyScalar(R*4);scene.add(sun);
 scene.add(new T.HemisphereLight(0xcfe3ff,0x5a4a3a,.75));scene.add(new T.AmbientLight(0xffffff,.1));

 const templates={
  building:new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.82,metalness:0}),
  ground:new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.94,metalness:0}),
  water:new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.3,metalness:.05}),
 };
 const treeGeometry=createTreeGeometry(),treeMaterial=new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.9,metalness:0});
 const tileRoot=new T.Group();scene.add(tileRoot);
 const loader=new GLTFLoader(),featureCache=new Map<string,Promise<FeatureRecord[]>>(),doFetch=options.fetch??((input:RequestInfo|URL,init?:RequestInit)=>fetch(input,init));
 const loadFeatures=(tile:TileRecord,signal:AbortSignal)=>{
  let cached=featureCache.get(tile.id);
  if(!cached){cached=doFetch(options.assetBase+tile.features,{signal}).then(response=>{if(!response.ok)throw new Error(`features ${response.status}`);return response.json() as Promise<FeatureRecord[]>});cached.catch(()=>featureCache.delete(tile.id));featureCache.set(tile.id,cached)}
  return cached;
 };
 const defaultLoadTile=async(tile:TileRecord,level:TileLevel,signal:AbortSignal):Promise<TileAsset>=>{
  const lod=tile.lods.find(entry=>entry.level===level)??tile.lods[0];
  const [buffer,features]=await Promise.all([doFetch(options.assetBase+lod.file,{signal}).then(response=>{if(!response.ok)throw new Error(`tile ${response.status}`);return response.arrayBuffer()}),loadFeatures(tile,signal)]);
  if(signal.aborted)throw new DOMException('aborted','AbortError');
  const gltf=await loader.parseAsync(buffer,'');
  return assembleTile(gltf.scene,tile,level,features,lod.bytes);
 };
 const assembleTile=(sceneRoot:T.Object3D,tile:TileRecord,level:TileLevel,features:FeatureRecord[],bytes:number):TileAsset=>{
  const group=new T.Group(),geometries:T.BufferGeometry[]=[],materials:T.Material[]=[],selected={value:-1};group.name=tile.id;
  let trees:T.InstancedMesh|undefined,treeTotal=0;
  sceneRoot.updateMatrixWorld(true);
  for(const object of sceneRoot.children){
   const layer=String(object.name) as keyof typeof templates|'trees';
   if((object as T.Points).isPoints&&layer==='trees'){
    const positions=(object as T.Points).geometry.attributes.position,count=positions.count;treeTotal=count;
    if(count){
     trees=new T.InstancedMesh(treeGeometry,treeMaterial,count);const matrix=new T.Matrix4(),quaternion=new T.Quaternion(),up=new T.Vector3(),scale=new T.Vector3(),yAxis=new T.Vector3(0,1,0),world=new T.Vector3();
     for(let i=0;i<count;i++){
      world.set(positions.getX(i),0,positions.getZ(i)).applyMatrix4(object.matrixWorld);
      const point=projection.toPlanet(world.x,-world.z,0),normal=projection.up(world.x,-world.z),size=.8+((i*2654435761)>>>0)%1000/1000*.5;
      quaternion.setFromUnitVectors(yAxis,up.set(normal[0],normal[1],normal[2]));scale.set(size,size*(.9+(i%7)/20),size);
      matrix.compose(new T.Vector3(point[0],point[1],point[2]),quaternion,scale);trees.setMatrixAt(i,matrix);
     }
     trees.instanceMatrix.needsUpdate=true;trees.computeBoundingSphere();trees.count=Math.max(1,Math.round(count*qualityProfiles[status.quality].treeDensity));trees.visible=shared.morph.value>.999;group.add(trees);
    }
    (object as T.Points).geometry.dispose();
    continue;
   }
   const mesh=object as T.Mesh;if(!mesh.isMesh||!(layer in templates))continue;
   const material=createBentMaterial(templates[layer as keyof typeof templates],shared,selected);
   const copy=new T.Mesh(mesh.geometry,material);copy.name=layer;copy.position.copy(mesh.position);copy.frustumCulled=false;copy.renderOrder=layer==='building'?1:0;copy.updateMatrix();copy.matrixAutoUpdate=false;
   geometries.push(mesh.geometry);materials.push(material);group.add(copy);
   if(mesh.material instanceof T.Material)mesh.material.dispose();
  }
  return {group,geometries,materials,features,uniforms:{selected},bytes,trees,treeTotal,tile,level};
 };
 let selection:PlanetSelection|null=null,selectedKey:{tile:string;index:number}|null=null;
 // Frame-loop state is declared before controls and tiles because their listeners write to it during setup.
 let needsRender=true,disposed=false,rafId=0,lastStatusAt=0,frameTimes:number[]=[],lastFrameAt=0,viewportWidth=0,viewportHeight=0,contextLost=false;
 const tiles:TileManager<TileAsset>=createTileManager<TileAsset>({
  tiles:manifest.tiles,projection,concurrency:3,budgetBytes:24*1048576,maxLeftoverTiles:16,
  load:(tile,level,signal)=>options.loadTile?options.loadTile(tile,level,signal):defaultLoadTile(tile,level,signal),
  bytesOf:asset=>asset.bytes,
  attach:(tile,_level,asset)=>{
   tileRoot.add(asset.group);needsRender=true;
   if(selectedKey&&selectedKey.tile===tile.id){
    asset.uniforms.selected.value=selectedKey.index;
    const feature=asset.features[selectedKey.index];
    if(feature&&(!selection||selection.tile!==tile.id||selection.feature.index!==selectedKey.index)){selection={feature,tile:tile.id,origin:'focus'};options.onSelect?.(selection)}
   }
  },
  detach:(_tile,_level,asset)=>{tileRoot.remove(asset.group);needsRender=true},
  dispose:asset=>{for(const geometry of asset.geometries)geometry.dispose();for(const material of asset.materials)material.dispose();asset.trees?.dispose()},
  onError:(tile,level,error)=>{status={...status,message:`Tile ${tile.id} level ${level} failed: ${error instanceof Error?error.message:String(error)}`}},
 });

 // Camera and controls: the orbit target always sits on the surface, so camera.up is the local radial direction.
 const crown=new T.Vector3(0,R,0);let controls!:OrbitControls,transitions:'instant'|'smooth'=reducedMotion?'instant':'smooth';
 let flight:{from:T.Vector3;to:T.Vector3;targetFrom:T.Vector3;targetTo:T.Vector3;start:number;duration:number}|null=null;
 const buildControls=(target:T.Vector3)=>{
  controls?.dispose();
  camera.up.copy(target).normalize();
  const next=new OrbitControls(camera,canvas);
  next.target.copy(target);next.enableDamping=!reducedMotion;next.dampingFactor=.08;next.enablePan=false;next.rotateSpeed=.55;next.zoomSpeed=.7;
  next.minDistance=160;next.maxDistance=R*3.6;next.minPolarAngle=.04;next.maxPolarAngle=1.25;
  next.addEventListener('change',()=>{needsRender=true});next.addEventListener('start',()=>{if(next.autoRotate){next.autoRotate=false;status={...status,autoRotate:false}}flight=null});
  controls=next;return next;
 };
 const homeView=()=>{camera.position.set(0,R+R*1.85,R*1.7);buildControls(crown);controls.update()};
 homeView();
 const flyTo=(target:T.Vector3,distance:number)=>{
  const up=target.clone().normalize(),south=new T.Vector3(0,0,1).projectOnPlane(up).normalize();if(south.lengthSq()<1e-6)south.set(0,0,1);
  const destination=target.clone().addScaledVector(up,distance*.78).addScaledVector(south,distance*.62),previousTarget=controls.target.clone();
  buildControls(target);
  if(transitions==='instant'){camera.position.copy(destination);controls.update();needsRender=true;return}
  flight={from:camera.position.clone(),to:destination,targetFrom:previousTarget,targetTo:target.clone(),start:performance.now(),duration:1300};
 };

 // Picking: march the pointer ray through the building shell, then fall back to the ground footprint under the surface hit.
 const raycaster=new T.Raycaster(),pointer=new T.Vector2();
 const featureAt=(east:number,north:number,height:number,groundOnly:boolean):{feature:FeatureRecord;tile:string}|null=>{
  let best:{feature:FeatureRecord;tile:string;score:number}|null=null;
  for(const {asset} of tiles.resident()){
   const b=asset.tile.bounds;if(east<b[0]-60||east>b[2]+60||north<b[1]-60||north>b[3]+60)continue;
   for(const feature of asset.features){
    const box=feature.bbox;if(east<box[0]||east>box[2]||north<box[1]||north>box[3])continue;
    const isBuilding=feature.featureClass==='building';
    if(!groundOnly){if(!isBuilding||height>(feature.displayHeightM??0)||height<(feature.minHeightM??0))continue}
    else if(isBuilding||feature.featureClass==='poi'||feature.featureClass==='place')continue;
    const score=(box[2]-box[0])*(box[3]-box[1])*(feature.featureClass==='road'||feature.featureClass==='rail'?4:1);
    if(!best||score<best.score)best={feature,tile:asset.tile.id,score};
   }
  }
  return best;
 };
 const sphereHit=(origin:T.Vector3,direction:T.Vector3,radius:number)=>{const b=origin.dot(direction),c=origin.lengthSq()-radius*radius,h=b*b-c;if(h<0)return null;const root=Math.sqrt(h),t=-b-root;return t>0?t:-b+root>0?-b+root:null};
 const pick=(clientX:number,clientY:number)=>{
  const rect=canvas.getBoundingClientRect();pointer.set((clientX-rect.left)/rect.width*2-1,-((clientY-rect.top)/rect.height)*2+1);raycaster.setFromCamera(pointer,camera);
  const origin=raycaster.ray.origin,direction=raycaster.ray.direction,shell=sphereHit(origin,direction,R+maxBuildingHeightM);if(shell===null)return;
  const surface=sphereHit(origin,direction,R),end=surface??shell+maxBuildingHeightM*4,point=new T.Vector3();let found:{feature:FeatureRecord;tile:string}|null=null;
  for(let t=shell;t<=end&&!found;t+=5){point.copy(origin).addScaledVector(direction,t);const local=projection.fromPlanet(point.x,point.y,point.z);if(local.height>maxBuildingHeightM)continue;found=featureAt(local.east,local.north,local.height,false)}
  if(!found&&surface!==null){point.copy(origin).addScaledVector(direction,surface);const local=projection.fromPlanet(point.x,point.y,point.z);found=featureAt(local.east,local.north,0,true)}
  if(surface===null&&!found)return;
  if(found)select(found.feature,found.tile,'pointer');else{select(null);const local=projection.fromPlanet(point.x,point.y,point.z),target=projection.toPlanet(local.east,local.north,0);flyTo(new T.Vector3(target[0],target[1],target[2]),Math.max(220,camera.position.distanceTo(controls.target)*.8))}
 };
 const select=(feature:FeatureRecord|null,tile?:string,origin:'pointer'|'focus'='pointer')=>{
  for(const {asset} of tiles.resident())asset.uniforms.selected.value=-1;
  selectedKey=feature&&tile?{tile,index:feature.index}:null;selection=feature&&tile?{feature,tile,origin}:null;
  if(selectedKey)for(const {asset} of tiles.resident())if(asset.tile.id===selectedKey.tile)asset.uniforms.selected.value=selectedKey.index;
  needsRender=true;options.onSelect?.(selection);
 };
 let pointerDown:{x:number;y:number;time:number}|null=null;
 const onPointerDown=(event:PointerEvent)=>{pointerDown={x:event.clientX,y:event.clientY,time:performance.now()}};
 const onPointerUp=(event:PointerEvent)=>{if(pointerDown&&Math.hypot(event.clientX-pointerDown.x,event.clientY-pointerDown.y)<6&&performance.now()-pointerDown.time<450)pick(event.clientX,event.clientY);pointerDown=null};
 canvas.addEventListener('pointerdown',onPointerDown);canvas.addEventListener('pointerup',onPointerUp);

 // Labels: landmarks first, then places by rank; occlusion by facing and a coarse screen grid.
 type LabelSpec={text:string;local:[number,number];height:number;priority:number;className:string};
 const labelSpecs:LabelSpec[]=[...manifest.landmarks.map((landmark,i)=>({text:landmark.label,local:landmark.local,height:(landmark.heightM??0)*manifest.heights.landmarkHeightBoost+18,priority:i,className:'blr-label blr-label-landmark'})),...manifest.places.map(place=>({text:place.name,local:place.local,height:14,priority:100+place.rank*10,className:'blr-label blr-label-place blr-rank-'+Math.min(place.rank,4)}))].sort((a,b)=>a.priority-b.priority);
 const labelElements=labelSpecs.map(spec=>{const node=element.ownerDocument.createElement('span');node.className=spec.className;node.textContent=spec.text;node.style.display='none';labelLayer.appendChild(node);return node});
 const labelWorld=labelSpecs.map(spec=>{const p=projection.toPlanet(spec.local[0],spec.local[1],spec.height),u=projection.up(spec.local[0],spec.local[1]);return {position:new T.Vector3(p[0],p[1],p[2]),up:new T.Vector3(u[0],u[1],u[2])}});
 const projected=new T.Vector3(),toCamera=new T.Vector3();
 const updateLabels=()=>{
  const width=canvas.clientWidth,height=canvas.clientHeight,limit=qualityProfiles[status.quality].labels,occupied:[number,number][]=[];let shown=0;
  labelSpecs.forEach((_,i)=>{
   const node=labelElements[i];
   if(shown>=limit||shared.morph.value<.999){node.style.display='none';return}
   const {position,up}=labelWorld[i];toCamera.copy(camera.position).sub(position).normalize();
   if(toCamera.dot(up)<.12){node.style.display='none';return}
   projected.copy(position).project(camera);
   if(projected.z>1||Math.abs(projected.x)>1||Math.abs(projected.y)>1){node.style.display='none';return}
   const x=(projected.x+1)/2*width,y=(1-projected.y)/2*height;
   if(occupied.some(([ox,oy])=>Math.abs(ox-x)<110&&Math.abs(oy-y)<26)){node.style.display='none';return}
   occupied.push([x,y]);shown++;node.style.display='';node.style.transform=`translate(-50%,-100%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
  });
 };

 // Frame loop: demand-driven; continuous only while animating. Frame-time windows feed the quality governor.
 const governor=createQualityGovernor(qualityChoice==='auto'?'balanced':tierByQuality[qualityChoice]);
 const frustum=new T.Frustum(),projScreen=new T.Matrix4(),sphere=new T.Sphere();
 const applyQuality=(quality:PlanetQuality)=>{
  status={...status,quality};const profile=qualityProfiles[quality];
  renderer.setPixelRatio(Math.min(typeof devicePixelRatio==='number'?devicePixelRatio:1,profile.pixelRatio));
  tiles.setLodSwitchPx(profile.lodSwitchPx);
  for(const {asset} of tiles.resident())if(asset.trees)asset.trees.count=Math.max(1,Math.round(asset.treeTotal*profile.treeDensity));
  resize(true);needsRender=true;
 };
 const resize=(force=false)=>{
  const width=Math.max(1,Math.round(element.clientWidth)),height=Math.max(1,Math.round(element.clientHeight));
  if(!force&&width===viewportWidth&&height===viewportHeight)return;
  viewportWidth=width;viewportHeight=height;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();needsRender=true;
 };
 const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(()=>resize()):null;resizeObserver?.observe(element);
 const emitStatus=(now:number)=>{if(now-lastStatusAt<500)return;lastStatusAt=now;const stats=tiles.stats(),info=renderer.info.render;status={...status,tilesResident:stats.resident,tilesLoading:stats.loading+stats.queued,tilesWanted:stats.wanted,bytes:stats.bytes,drawCalls:info.calls,triangles:info.triangles,failedTiles:stats.failed,qualityChoice,sphereMorph:shared.morph.value,autoRotate:controls.autoRotate};options.onStatus?.(status)};
 const frame=(now:number)=>{
  if(disposed)return;rafId=requestAnimationFrame(frame);
  if(contextLost)return;
  let animating=false;
  if(flight){const t=Math.min(1,(now-flight.start)/flight.duration),eased=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;camera.position.lerpVectors(flight.from,flight.to,eased);controls.target.lerpVectors(flight.targetFrom,flight.targetTo,eased);if(t>=1)flight=null;animating=true}
  const moved=controls.update();animating=animating||moved||controls.autoRotate;
  // Adaptive clip planes keep depth precision for lifted overlays at every altitude.
  const altitude=Math.max(1,camera.position.length()-R);camera.near=Math.max(2,altitude*.02);camera.far=camera.position.length()+R*40;camera.updateProjectionMatrix();camera.updateMatrixWorld();
  projScreen.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projScreen);
  const stats=tiles.update({position:[camera.position.x,camera.position.y,camera.position.z],viewportHeight:viewportHeight||1,fovY:camera.fov*Math.PI/180,inFrustum:(center,radius)=>{sphere.center.set(center[0],center[1],center[2]);sphere.radius=radius;return frustum.intersectsSphere(sphere)}});
  if(stats.loading)animating=true;
  if(!needsRender&&!animating){emitStatus(now);return}
  needsRender=false;
  const started=performance.now();renderer.render(scene,camera);updateLabels();
  const cost=performance.now()-started;status.frameMs=cost;
  if(animating&&lastFrameAt&&now-lastFrameAt<200){frameTimes.push(now-lastFrameAt);if(frameTimes.length>=60){const sorted=[...frameTimes].sort((a,b)=>a-b),p95=sorted[Math.floor(sorted.length*.95)];frameTimes=[];if(qualityChoice==='auto'){const next=governor.sample(p95);if(next)applyQuality(qualityByTier[next])}}}
  lastFrameAt=now;emitStatus(now);
 };
 const onContextLost=(event:Event)=>{event.preventDefault();contextLost=true;status={...status,message:'Graphics context lost; waiting for the browser to restore it.'};options.onStatus?.(status)};
 const onContextRestored=()=>{contextLost=false;status={...status,message:undefined};needsRender=true};
 const onRequestRender=()=>{needsRender=true};
 canvas.addEventListener('webglcontextlost',onContextLost);canvas.addEventListener('webglcontextrestored',onContextRestored);element.addEventListener('blr-request-render',onRequestRender);

 resize(true);applyQuality(qualityChoice==='auto'?qualityByTier[governor.tier]:qualityChoice);
 controls.autoRotate=!!options.autoRotate&&!reducedMotion;controls.autoRotateSpeed=.35;status={...status,autoRotate:controls.autoRotate};
 rafId=requestAnimationFrame(frame);

 const locate=(id:string)=>{
  const known=manifest.landmarks.find(l=>l.id===id)??manifest.named.find(n=>n.id===id)??manifest.places.find(p=>p.id===id);
  for(const {asset} of tiles.resident()){const feature=asset.features.find(f=>f.id===id);if(feature)return {feature,tile:asset.tile.id,local:feature.center,size:Math.hypot(feature.bbox[2]-feature.bbox[0],feature.bbox[3]-feature.bbox[1])}}
  if(!known)return null;
  const tile=('tile' in known?known.tile:undefined)??manifest.tiles.find(t=>known.local[0]>=t.bounds[0]&&known.local[0]<=t.bounds[2]&&known.local[1]>=t.bounds[1]&&known.local[1]<=t.bounds[3])?.id;
  return {feature:null,tile,local:known.local,size:120,index:'index' in known?known.index:undefined};
 };

 return {
  mode:'webgl',
  setQuality(choice){qualityChoice=choice;if(choice==='auto'){governor.reset('balanced');applyQuality('medium')}else applyQuality(choice);status={...status,qualityChoice}},
  focusFeature(id){
   const located=locate(id);if(!located)return false;
   const point=projection.toPlanet(located.local[0],located.local[1],0),distance=Math.min(2600,Math.max(240,located.size*2.4+140));
   if(located.feature&&located.tile)select(located.feature,located.tile,'focus');
   else{selectedKey=located.tile&&located.index!==undefined?{tile:located.tile,index:located.index}:null;selection=null;for(const {asset} of tiles.resident())asset.uniforms.selected.value=asset.tile.id===selectedKey?.tile?selectedKey.index:-1;if(located.tile)tiles.request(located.tile,0)}
   flyTo(new T.Vector3(point[0],point[1],point[2]),distance);return true;
  },
  orbit(azimuth,polar){const offset=camera.position.clone().sub(controls.target),up=controls.target.clone().normalize(),spherical=new T.Spherical().setFromVector3(offset.clone().applyQuaternion(new T.Quaternion().setFromUnitVectors(up,new T.Vector3(0,1,0))));spherical.theta+=azimuth;spherical.phi=Math.max(controls.minPolarAngle,Math.min(controls.maxPolarAngle,spherical.phi+polar));offset.setFromSpherical(spherical).applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),up));camera.position.copy(controls.target).add(offset);controls.update();needsRender=true},
  zoom(factor){const offset=camera.position.clone().sub(controls.target),length=Math.max(controls.minDistance,Math.min(controls.maxDistance,offset.length()*factor));camera.position.copy(controls.target).add(offset.setLength(length));controls.update();needsRender=true},
  resetView(){flight=null;select(null);homeView();needsRender=true},
  setAutoRotate(on){controls.autoRotate=on&&!reducedMotion;status={...status,autoRotate:controls.autoRotate};needsRender=true},
  setCameraTransitions(mode){transitions=mode},
  setSphereMorph(value){shared.morph.value=Math.max(0,Math.min(1,value));for(const {asset} of tiles.resident())if(asset.trees)asset.trees.visible=shared.morph.value>.999;ground.visible=shared.morph.value>.5;atmosphere.visible=shared.morph.value>.999;flatBoard.visible=shared.morph.value<=.5;status={...status,sphereMorph:shared.morph.value};needsRender=true},
  requestRender(){needsRender=true},
  resize:()=>resize(true),
  getStatus:()=>status,
  getSelection:()=>selection,
  dispose(){
   if(disposed)return;disposed=true;cancelAnimationFrame(rafId);resizeObserver?.disconnect();
   canvas.removeEventListener('pointerdown',onPointerDown);canvas.removeEventListener('pointerup',onPointerUp);canvas.removeEventListener('webglcontextlost',onContextLost);canvas.removeEventListener('webglcontextrestored',onContextRestored);element.removeEventListener('blr-request-render',onRequestRender);
   controls.dispose();tiles.dispose();
   for(const object of [ground,stars,flatBoard])object.geometry.dispose();
   scene.traverse(object=>{const mesh=object as T.Mesh;if(mesh.isMesh||(object as T.Points).isPoints){mesh.geometry?.dispose();if(mesh.material instanceof T.Material)mesh.material.dispose()}});
   for(const template of Object.values(templates))template.dispose();treeGeometry.dispose();treeMaterial.dispose();
   renderer.dispose();canvas.remove();labelLayer.remove();
  },
 };
}
