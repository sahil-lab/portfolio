const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
global.ImageBitmap=class ImageBitmap{constructor(width,height){this.width=width;this.height=height;this.closed=false}close(){this.closed=true;this.width=this.height=0}};
const T=require('three');
const {geometryReleasable,installGeometryRelease,installImageRelease,installGpuResidency,geometryReleased,imageReleased,textureCacheKey}=require('../app/gpu-residency.ts');
const {releaseHiddenGpuResources}=require('../app/scene-resources.ts');

function scenery(name='SceneryBatch',{dynamicIndex=false,interleaved=false}={}){
  const geometry=new T.BufferGeometry();
  if(interleaved){const buffer=new T.InterleavedBuffer(new Float32Array([0,0,0,1,1,1,2,2,2]),3);geometry.setAttribute('position',new T.InterleavedBufferAttribute(buffer,3,0))}
  else geometry.setAttribute('position',new T.BufferAttribute(new Float32Array([0,0,0,1,0,0,0,1,0,1,1,0]),3));
  geometry.setAttribute('normal',new T.BufferAttribute(new Float32Array(12).fill(0).map((_,i)=>i%3===2?1:0),3));
  const index=new T.BufferAttribute(new Uint16Array([0,1,2,2,1,3]),1);if(dynamicIndex)index.setUsage(T.DynamicDrawUsage);geometry.setIndex(index);
  const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial());mesh.name=name;return mesh;
}
const upload=geometry=>{for(const attribute of Object.values(geometry.attributes))attribute.onUploadCallback();geometry.index?.onUploadCallback()};

test('only immutable, unpickable scenery is releasable',()=>{
  assert.equal(geometryReleasable(scenery()),true);
  assert.equal(geometryReleasable(scenery('City_VisibleSilhouettes')),true);
  assert.equal(geometryReleasable(scenery('Resident_Sneaker')),false);
  assert.equal(geometryReleasable(scenery('SceneryBatch',{interleaved:true})),false);
  const picked=scenery();picked.userData.projectIndex=2;assert.equal(geometryReleasable(picked),false);
  const books=new T.Group();books.name='Resume_Books';const shelved=scenery();books.add(shelved);assert.equal(geometryReleasable(shelved),false);
  const instanced=new T.InstancedMesh(scenery().geometry,new T.MeshStandardMaterial(),3);instanced.name='SceneryBatch';assert.equal(geometryReleasable(instanced),false);
});

test('armed geometry drops static arrays after upload, keeps counts, bounds and dynamic indices, and ignores rays',()=>{
  const root=new T.Group(),mesh=scenery('City_VisibleSilhouettes',{dynamicIndex:true}),plain=scenery();root.add(mesh,plain);
  assert.equal(installGeometryRelease(root),2);
  for(const object of [mesh,plain]){
    const geometry=object.geometry;assert.equal(geometry.userData.cpuRelease,'armed');assert.ok(geometry.boundingBox&&geometry.boundingSphere);assert.equal(geometryReleased(geometry),false);
    assert.equal(geometry.attributes.position.array.length,12);
    const ray=new T.Raycaster(new T.Vector3(.25,.25,5),new T.Vector3(0,0,-1));assert.equal(ray.intersectObject(object,false).length,0,'released scenery must not be raycast');
    upload(geometry);
    assert.equal(geometryReleased(geometry),true);assert.equal(geometry.attributes.position.array.length,0);assert.equal(geometry.attributes.position.count,4);assert.equal(geometry.attributes.normal.array.length,0);
    assert.ok(geometry.attributes.position.array instanceof Float32Array);
  }
  assert.equal(mesh.geometry.index.array.length,6,'dynamic index data must survive');assert.equal(plain.geometry.index.array.length,0,'static index data is released');
  assert.equal(installGeometryRelease(root),0,'arming is idempotent');
});

test('decoded bitmaps close after the first upload when every texture of a source shares one GL texture',()=>{
  const root=new T.Group(),shared=new T.Texture(new ImageBitmap(8,8)),clone=shared.clone(),odd=new T.Texture(new ImageBitmap(8,8)),oddClone=odd.clone();oddClone.anisotropy=16;
  const add=(...textures)=>{for(const texture of textures){const mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial({map:texture}));root.add(mesh)}};add(shared,clone,odd,oddClone);
  assert.equal(textureCacheKey(shared),textureCacheKey(clone));assert.notEqual(textureCacheKey(odd),textureCacheKey(oddClone));
  assert.equal(installImageRelease(root),1);
  assert.equal(typeof shared.onUpdate,'function');assert.equal(odd.onUpdate,null,'sources with mixed cache keys stay untouched');
  const bitmap=shared.source.data;shared.onUpdate(shared);
  assert.equal(bitmap.closed,true);assert.equal(shared.image.width,1);assert.equal(clone.image,shared.image,'clones share the placeholder source');
  assert.ok(imageReleased(shared)&&imageReleased(clone));assert.equal(imageReleased(odd),false);
  clone.onUpdate(clone);assert.equal(shared.image.width,1,'a second upload is a no-op');
  assert.equal(installImageRelease(root),0,'released and mixed sources are not re-armed');
});

test('hidden-scenery GPU eviction leaves released resources resident',()=>{
  const scene=new T.Scene(),hidden=new T.Group();hidden.visible=false;scene.add(hidden);
  const released=scenery(),kept=scenery('Resident_Hand');hidden.add(released,kept);
  const bitmapTexture=new T.Texture(new ImageBitmap(4,4)),plainTexture=new T.Texture(new ImageBitmap(4,4));plainTexture.userData.skip=true;
  released.material=new T.MeshStandardMaterial({map:bitmapTexture});kept.material=new T.MeshStandardMaterial({map:plainTexture});
  installGeometryRelease(hidden);upload(released.geometry);
  installImageRelease(hidden);bitmapTexture.onUpdate(bitmapTexture);
  const disposed=[];for(const [name,target] of [['releasedGeometry',released.geometry],['keptGeometry',kept.geometry],['releasedTexture',bitmapTexture],['keptTexture',plainTexture]])target.addEventListener('dispose',()=>disposed.push(name));
  const counts=releaseHiddenGpuResources(scene,[hidden]);
  assert.deepEqual(counts,{geometries:1,textures:1});
  assert.deepEqual(disposed.sort(),['keptGeometry','keptTexture']);
});

test('the keep-cpu-copies query opts the whole mechanism out for export tooling',()=>{
  global.location={search:'?keep-cpu-copies'};
  try{const root=new T.Group();root.add(scenery());assert.deepEqual(installGpuResidency(root),{geometries:0,images:0});assert.equal(root.children[0].geometry.userData.cpuRelease,undefined)}
  finally{delete global.location}
  const root=new T.Group();root.add(scenery());assert.deepEqual(installGpuResidency(root),{geometries:1,images:0});
});
