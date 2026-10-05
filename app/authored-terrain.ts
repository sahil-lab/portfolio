import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {disposeScene} from './scene-resources';
import {terrainRevision,legacyTerrainRevision,type PlanetSurface} from './planet-geography';

export type AuthoredTerrain={root:T.Group;full:T.Mesh;distant:T.Mesh};
export function extractAuthoredTerrain(root:T.Group,surface:PlanetSurface):AuthoredTerrain|null{
 const meshes:T.Mesh[]=[];root.traverse(object=>{const mesh=object as T.Mesh;if(mesh.isMesh)meshes.push(mesh)});
 if(meshes.length!==2||meshes.some(mesh=>!mesh.userData.bakedTerrain||mesh.userData.planet!==surface.stop.id||mesh.userData.radius!==surface.radius||!mesh.geometry.attributes.position||!mesh.geometry.attributes.color))return null;
 if(meshes.some(mesh=>(mesh.userData.terrainRevision??legacyTerrainRevision)!==(surface.terrainRevision??terrainRevision)))return null;
 const full=meshes.find(mesh=>mesh.userData.terrainDetail==='Full'),distant=meshes.find(mesh=>mesh.userData.terrainDetail==='Distant');if(!full||!distant)return null;
 root.updateMatrixWorld(true);for(const mesh of meshes){mesh.geometry.applyMatrix4(mesh.matrixWorld);mesh.geometry.userData.authoredTerrain=surface.stop.id;mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();mesh.position.set(0,0,0);mesh.quaternion.identity();mesh.scale.setScalar(1);mesh.userData.authoredTerrain=surface.stop.id;if(mesh.userData.blenderSceneFinish){for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){const surfaceMaterial=material as T.MeshStandardMaterial;if(surfaceMaterial.aoMap)surfaceMaterial.aoMapIntensity=.7}}}
 return {root,full,distant};
}

export async function loadAuthoredTerrain(surface:PlanetSurface,signal:AbortSignal,request:typeof fetch=fetch):Promise<AuthoredTerrain|null>{
 if(signal.aborted||typeof window==='undefined'&&request===fetch)return null;
 let root:T.Group|undefined;
 const directories=(surface.terrainRevision??terrainRevision)===legacyTerrainRevision?['/assets/planets/blender-final/','/assets/planets/']:['/assets/world-v1/terrain/'];
 for(const directory of directories){
  try{
     if(signal.aborted)return null;
     const response=await request(directory+encodeURIComponent(surface.stop.id)+'.glb',{signal:AbortSignal.any([signal,AbortSignal.timeout(15000)]),credentials:'same-origin',cache:'force-cache'});if(!response.ok)continue;
     const bytes=await response.arrayBuffer();if(signal.aborted)return null;root=(await new GLTFLoader().parseAsync(bytes,directory)).scene;
     if(signal.aborted){disposeScene(root);return null}const terrain=extractAuthoredTerrain(root,surface);if(terrain)return terrain;disposeScene(root);root=undefined;
   }catch{if(root)disposeScene(root);root=undefined;if(signal.aborted)return null}
 }
 return null;
}
