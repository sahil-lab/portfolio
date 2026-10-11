/**
 * Minimal deterministic GLB (glTF 2.0 binary) writer for generated city tiles.
 * Produces exactly the subset Three.js' GLTFLoader needs: float positions, byte colours,
 * float application attributes, indices and one node per mesh with a translation.
 * No timestamps or random identifiers are written, so identical input yields identical bytes.
 */
export type TypedArray=Float32Array|Uint8Array|Uint16Array|Uint32Array|Int8Array|Int16Array;
export type GlbAccessorInput={array:TypedArray;type:'SCALAR'|'VEC2'|'VEC3'|'VEC4';normalized?:boolean};
export type GlbPrimitiveInput={attributes:Record<string,GlbAccessorInput>;indices?:Uint16Array|Uint32Array;mode?:number;material?:number;extras?:Record<string,unknown>};
export type GlbMeshInput={name:string;primitives:GlbPrimitiveInput[];translation?:[number,number,number];extras?:Record<string,unknown>};
export type GlbMaterialInput={name:string;baseColor?:[number,number,number,number];roughness?:number;metallic?:number;doubleSided?:boolean;extras?:Record<string,unknown>};
export type GlbInput={meshes:GlbMeshInput[];materials?:GlbMaterialInput[];extras?:Record<string,unknown>;generator?:string};

const componentTypes=new Map<unknown,{code:number;bytes:number}>([[Int8Array,{code:5120,bytes:1}],[Uint8Array,{code:5121,bytes:1}],[Int16Array,{code:5122,bytes:2}],[Uint16Array,{code:5123,bytes:2}],[Uint32Array,{code:5125,bytes:4}],[Float32Array,{code:5126,bytes:4}]]);
const componentCounts={SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
const GLB_MAGIC=0x46546c67,JSON_CHUNK=0x4e4f534a,BIN_CHUNK=0x004e4942;

type View={buffer:0;byteOffset:number;byteLength:number;byteStride?:number;target:number};

export function encodeGlb(input:GlbInput):Uint8Array{
 const chunks:Uint8Array[]=[],bufferViews:View[]=[],accessors:Record<string,unknown>[]=[];let byteLength=0;
 const align=(n:number)=>(n+3)&~3;
 const addView=(data:Uint8Array,target:number,byteStride?:number)=>{
  const padding=align(byteLength)-byteLength;if(padding){chunks.push(new Uint8Array(padding));byteLength+=padding}
  const view:View={buffer:0,byteOffset:byteLength,byteLength:data.byteLength,target};if(byteStride)view.byteStride=byteStride;
  bufferViews.push(view);chunks.push(data);byteLength+=data.byteLength;return bufferViews.length-1;
 };
 const addAccessor=(accessor:GlbAccessorInput,target:number,withBounds:boolean)=>{
  const component=componentTypes.get(accessor.array.constructor);if(!component)throw new TypeError('unsupported accessor array');
  const components=componentCounts[accessor.type],count=accessor.array.length/components;
  if(!Number.isInteger(count))throw new RangeError(`accessor length ${accessor.array.length} is not a multiple of ${components}`);
  const elementBytes=components*component.bytes,stride=target===34962&&elementBytes%4?align(elementBytes):0;
  let bytes:Uint8Array;
  if(stride){
   bytes=new Uint8Array(stride*count);const source=new Uint8Array(accessor.array.buffer,accessor.array.byteOffset,accessor.array.byteLength);
   for(let i=0;i<count;i++)bytes.set(source.subarray(i*elementBytes,(i+1)*elementBytes),i*stride);
  }
  else bytes=new Uint8Array(accessor.array.buffer,accessor.array.byteOffset,accessor.array.byteLength);
  const record:Record<string,unknown>={bufferView:addView(bytes,target,stride||undefined),componentType:component.code,count,type:accessor.type};
  if(accessor.normalized)record.normalized=true;
  if(withBounds&&count){
   const min=Array.from({length:components},()=>Infinity),max=Array.from({length:components},()=>-Infinity);
   for(let i=0;i<accessor.array.length;i++){const c=i%components,v=accessor.array[i];if(v<min[c])min[c]=v;if(v>max[c])max[c]=v}
   record.min=min;record.max=max;
  }
  accessors.push(record);return accessors.length-1;
 };
 const meshes=input.meshes.map(mesh=>{
  const primitives=mesh.primitives.map(primitive=>{
   const attributes:Record<string,number>={};
   for(const name of Object.keys(primitive.attributes))attributes[name]=addAccessor(primitive.attributes[name],34962,name==='POSITION');
   const record:Record<string,unknown>={attributes};
   if(primitive.indices)record.indices=addAccessor({array:primitive.indices,type:'SCALAR'},34963,false);
   if(primitive.mode!==undefined&&primitive.mode!==4)record.mode=primitive.mode;
   if(primitive.material!==undefined)record.material=primitive.material;
   if(primitive.extras)record.extras=primitive.extras;
   return record;
  });
  const record:Record<string,unknown>={name:mesh.name,primitives};if(mesh.extras)record.extras=mesh.extras;return record;
 });
 const nodes=input.meshes.map((mesh,index)=>{const node:Record<string,unknown>={name:mesh.name,mesh:index};if(mesh.translation&&mesh.translation.some(v=>v!==0))node.translation=mesh.translation;return node});
 const materials=(input.materials??[]).map(material=>{
  const record:Record<string,unknown>={name:material.name,pbrMetallicRoughness:{baseColorFactor:material.baseColor??[1,1,1,1],metallicFactor:material.metallic??0,roughnessFactor:material.roughness??.9}};
  if(material.doubleSided)record.doubleSided=true;if(material.extras)record.extras=material.extras;return record;
 });
 const json:Record<string,unknown>={asset:{version:'2.0',generator:input.generator??'bengaluru-planet-glb'},scene:0,scenes:[{nodes:nodes.map((_,i)=>i)}],nodes,meshes};
 if(materials.length)json.materials=materials;
 json.accessors=accessors;json.bufferViews=bufferViews;json.buffers=[{byteLength:align(byteLength)}];
 if(input.extras)json.extras=input.extras;
 const jsonBytes=new TextEncoder().encode(JSON.stringify(json)),jsonPadded=align(jsonBytes.byteLength),binPadded=align(byteLength),total=12+8+jsonPadded+(binPadded?8+binPadded:0);
 const out=new Uint8Array(total),view=new DataView(out.buffer);
 view.setUint32(0,GLB_MAGIC,true);view.setUint32(4,2,true);view.setUint32(8,total,true);
 view.setUint32(12,jsonPadded,true);view.setUint32(16,JSON_CHUNK,true);out.set(jsonBytes,20);out.fill(0x20,20+jsonBytes.byteLength,20+jsonPadded);
 if(binPadded){
  let offset=20+jsonPadded;view.setUint32(offset,binPadded,true);view.setUint32(offset+4,BIN_CHUNK,true);offset+=8;
  for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.byteLength}
 }
 return out;
}

/** Reads the JSON and binary chunks back; used by the build self-check and tests. */
export function decodeGlb(bytes:Uint8Array):{json:Record<string,unknown>;bin:Uint8Array}{
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(view.getUint32(0,true)!==GLB_MAGIC||view.getUint32(4,true)!==2)throw new Error('not a glTF 2.0 binary');
 const total=view.getUint32(8,true);if(total!==bytes.byteLength)throw new Error('GLB length mismatch');
 const jsonLength=view.getUint32(12,true);if(view.getUint32(16,true)!==JSON_CHUNK)throw new Error('first chunk must be JSON');
 const json=JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+jsonLength)));
 let bin:Uint8Array=bytes.subarray(0,0);const binOffset=20+jsonLength;
 if(binOffset<total){const binLength=view.getUint32(binOffset,true);if(view.getUint32(binOffset+4,true)!==BIN_CHUNK)throw new Error('second chunk must be BIN');bin=bytes.subarray(binOffset+8,binOffset+8+binLength)}
 return {json,bin};
}
