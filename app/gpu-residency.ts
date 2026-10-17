import * as T from 'three';

/**
 * GPU residency: once static geometry and decoded images have been uploaded, the
 * CPU copies are released. Three.js keeps them only to re-upload after a WebGL
 * context loss; this world rebuilds itself instead (see page.tsx), so the copies
 * are pure overhead. Hidden-scenery GPU eviction skips released resources because
 * nothing could restore them.
 */

/** Tooling that reads vertex or image data back from the live scene (world export, visual audits) can opt out. */
export function cpuCopiesRetained(){return typeof location!=='undefined'&&new URLSearchParams(location.search).has('keep-cpu-copies')}

/** Immutable scenery that is never picked, sampled or rewritten after construction. */
export const releasableMeshNames=new Set(['SceneryBatch','City_VisibleSilhouettes','Everyday_CraftedBuilding']);
const pickableRoots=new Set(['Golden_Statue_Project_Bulletins','Resume_Books','Friends_CurrentWorld','Sky_Angel']);
const pickableMarkers=['projectIndex','resumeAction','friendsActivity','readableDisplay'];
type ImageSource=T.Source<unknown>;
const releasedSources=new WeakSet<ImageSource>();
let placeholder:HTMLCanvasElement|{width:number;height:number}|undefined;
function placeholderImage(){
 if(!placeholder){if(typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=canvas.height=1;placeholder=canvas}else placeholder={width:1,height:1}}
 return placeholder;
}
function noRaycast(){}
function emptyLike(array:T.TypedArray){return new (array.constructor as new(length:number)=>T.TypedArray)(0)}

function pickable(object:T.Object3D){
 for(let node:T.Object3D|null=object;node;node=node.parent){
  if(pickableRoots.has(node.name))return true;
  if(pickableMarkers.some(key=>node.userData[key]!==undefined))return true;
 }
 return false;
}

export function geometryReleasable(mesh:T.Mesh){
 if(!mesh.isMesh||(mesh as T.InstancedMesh).isInstancedMesh||(mesh as unknown as T.BatchedMesh).isBatchedMesh||(mesh as unknown as T.SkinnedMesh).isSkinnedMesh)return false;
 if(!releasableMeshNames.has(mesh.name)||pickable(mesh))return false;
 const geometry=mesh.geometry;
 if(Object.keys(geometry.morphAttributes).length||!geometry.attributes.position)return false;
 return !Object.values(geometry.attributes).some(attribute=>(attribute as T.InterleavedBufferAttribute).isInterleavedBufferAttribute);
}

export function geometryReleased(geometry:T.BufferGeometry){return geometry.userData.cpuRelease==='released'}
export function imageReleased(texture:T.Texture){return releasedSources.has(texture.source)}

/** Arms static attributes to drop their arrays right after the first upload. Bounds are computed first so culling and boxes never need the data again. */
export function installGeometryRelease(root:T.Object3D){
 let armed=0;
 root.traverse(object=>{
  const mesh=object as T.Mesh;if(!geometryReleasable(mesh))return;
  const geometry=mesh.geometry;if(geometry.userData.cpuRelease)return;
  if(geometry.boundingBox===null)geometry.computeBoundingBox();if(geometry.boundingSphere===null)geometry.computeBoundingSphere();
  geometry.userData.cpuRelease='armed';
  const release=(attribute:T.BufferAttribute)=>{attribute.onUpload(()=>{attribute.array=emptyLike(attribute.array);geometry.userData.cpuRelease='released'})};
  for(const attribute of Object.values(geometry.attributes) as T.BufferAttribute[])if(attribute.usage===T.StaticDrawUsage)release(attribute);
  if(geometry.index&&geometry.index.usage===T.StaticDrawUsage)release(geometry.index);
  mesh.raycast=noRaycast;armed++;
 });
 return armed;
}

/** Mirrors the renderer's texture cache key: textures sharing a source and key share one GL texture, so the image is read only once. */
export function textureCacheKey(texture:T.Texture){
 return [texture.wrapS,texture.wrapT,(texture as T.Texture&{wrapR?:number}).wrapR??0,texture.magFilter,texture.minFilter,texture.anisotropy,texture.internalFormat,texture.format,texture.type,texture.generateMipmaps,texture.premultiplyAlpha,texture.flipY,texture.unpackAlignment,texture.colorSpace].join();
}

function releaseSource(source:ImageSource){
 if(releasedSources.has(source))return;releasedSources.add(source);
 const image=source.data as ImageBitmap;source.data=placeholderImage();image.close();
}

/** Arms decoded ImageBitmap textures to close their bitmap after the first upload, when every texture of that source shares one GL texture. */
export function installImageRelease(root:T.Object3D){
 if(typeof ImageBitmap==='undefined')return 0;
 const bySource=new Map<ImageSource,Set<T.Texture>>();
 root.traverse(object=>{
  const material=(object as T.Mesh).material;if(!material)return;
  for(const entry of Array.isArray(material)?material:[material])for(const value of Object.values(entry)){
   const texture=value as T.Texture|null;if(!texture?.isTexture||!(texture.source.data instanceof ImageBitmap)||releasedSources.has(texture.source))continue;
   const textures=bySource.get(texture.source)??new Set<T.Texture>();textures.add(texture);bySource.set(texture.source,textures);
  }
 });
 let armed=0;
 for(const [source,textures] of bySource){
  if(new Set([...textures].map(textureCacheKey)).size!==1)continue;
  for(const texture of textures){
   if(texture.userData.cpuRelease)continue;texture.userData.cpuRelease='armed';
   const previous=texture.onUpdate;
   texture.onUpdate=value=>{previous?.(value);texture.userData.cpuRelease='released';releaseSource(source)};
  }
  armed++;
 }
 return armed;
}

export function installGpuResidency(root:T.Object3D){
 if(cpuCopiesRetained())return {geometries:0,images:0};
 return {geometries:installGeometryRelease(root),images:installImageRelease(root)};
}
