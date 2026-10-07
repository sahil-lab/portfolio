import * as T from 'three';
import * as manifest from './architecture-shells-manifest.json';

type Shell={geometry:T.BufferGeometry;materialIndex:number;vertexColors:boolean;authoredArchitecture:boolean};
type ShellSet={skins:Shell[];bounds:T.Box3[]};
type PackedAttribute={type:string;offset:number;length:number;itemSize:number;normalized:boolean};
type PackedShell=Omit<Shell,'geometry'>&{attributes:Record<string,PackedAttribute>;index:PackedAttribute|null};
type PackedSet={key:string;bounds:number[][];skins:PackedShell[]};
const arrayTypes={Float32Array,Uint32Array,Uint16Array,Uint8Array,Int32Array,Int16Array,Int8Array,Float64Array};
const prepared=new Map<string,ShellSet>();
let pending:Promise<boolean>|null=null;

export function clearArchitectureShells(){
 for(const entry of prepared.values())for(const skin of entry.skins)skin.geometry.dispose();
 prepared.clear();
}

export function encodeArchitectureShells(source:T.Group){
 const buffers:Uint8Array[]=[];let offset=0;
 const pack=(attribute:T.BufferAttribute):PackedAttribute=>{
  const bytes=new Uint8Array(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength),padding=(8-offset%8)%8;
  if(padding){buffers.push(new Uint8Array(padding));offset+=padding}
  const result={type:attribute.array.constructor.name,offset,length:attribute.array.length,itemSize:attribute.itemSize,normalized:attribute.normalized};
  buffers.push(bytes);offset+=bytes.byteLength;return result;
 };
 const entries:PackedSet[]=source.children.map(group=>({key:group.userData.shellKey,bounds:group.userData.shellBounds,skins:group.children.map(object=>{
  const mesh=object as T.Mesh;
  return {materialIndex:object.userData.shellMaterial,vertexColors:!!object.userData.shellVertexColors,authoredArchitecture:!!object.userData.shellAuthoredArchitecture,attributes:Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name,attribute])=>[name,pack(attribute as T.BufferAttribute)])),index:mesh.geometry.index?pack(mesh.geometry.index):null};
 })}));
 const json=new TextEncoder().encode(JSON.stringify(entries)),start=Math.ceil((8+json.length)/8)*8,result=new Uint8Array(start+offset),header=new DataView(result.buffer);
 header.setUint32(0,0x31485343,true);header.setUint32(4,json.length,true);result.set(json,8);
 let cursor=start;for(const bytes of buffers){result.set(bytes,cursor);cursor+=bytes.length}return result.buffer;
}

export function installArchitectureShells(source:ArrayBuffer){
 const entries=new Map<string,ShellSet>();
 try{
  const header=new DataView(source);if(header.getUint32(0,true)!==0x31485343)return false;
  const jsonLength=header.getUint32(4,true),start=Math.ceil((8+jsonLength)/8)*8;
  const sets:PackedSet[]=JSON.parse(new TextDecoder().decode(new Uint8Array(source,8,jsonLength)));
  const unpack=(attribute:PackedAttribute)=>{
   const ArrayType=arrayTypes[attribute.type as keyof typeof arrayTypes];
   if(!ArrayType||!Number.isSafeInteger(attribute.offset)||attribute.offset<0||!Number.isSafeInteger(attribute.length)||attribute.length<0||!Number.isInteger(attribute.itemSize)||attribute.itemSize<1)throw new Error('Invalid architecture shell attribute');
   return new T.BufferAttribute(new ArrayType(source,start+attribute.offset,attribute.length),attribute.itemSize,attribute.normalized);
  };
  for(const set of sets){
   if(typeof set.key!=='string'||!Array.isArray(set.bounds))return false;
   const bounds=set.bounds.map(values=>{
    if(values.length!==6||!values.every(Number.isFinite))throw new Error('Invalid architecture shell bounds');
    return new T.Box3(new T.Vector3(...values.slice(0,3)),new T.Vector3(...values.slice(3,6)));
   });
   const skins:Shell[]=[];entries.set(set.key,{skins,bounds});
   for(const skin of set.skins){
    if(!Number.isInteger(skin.materialIndex)||skin.materialIndex<0)throw new Error('Invalid architecture shell material');
    const geometry=new T.BufferGeometry();skins.push({geometry,materialIndex:skin.materialIndex,vertexColors:skin.vertexColors,authoredArchitecture:skin.authoredArchitecture});
    for(const [name,attribute] of Object.entries(skin.attributes))geometry.setAttribute(name,unpack(attribute));
    if(skin.index)geometry.setIndex(unpack(skin.index));
   }
  if(!skins.length&&bounds.length)throw new Error('Empty architecture shell');
  }
  if(!entries.size)return false;
  clearArchitectureShells();for(const [key,entry] of entries)prepared.set(key,entry);entries.clear();return true;
 }finally{for(const entry of entries.values())for(const skin of entry.skins)skin.geometry.dispose()}
}

export function takeArchitectureShells(key:string,materials:T.Material[]):ShellSet|null{
 const entry=prepared.get(key);if(!entry||entry.skins.some(skin=>skin.materialIndex>=materials.length))return null;
 prepared.delete(key);return entry;
}

export async function prepareArchitectureShells(){
 if(prepared.size)return true;
 if(pending)return pending;
 pending=(async()=>{
  try{
    if(typeof DecompressionStream==='undefined')return false;
    const response=await fetch('/assets/world-v1/city-shells.bin?v='+manifest.sha256,{signal:AbortSignal.timeout(20000),credentials:'same-origin',cache:'force-cache'});
    if(!response.ok||!response.body)return false;
    const bytes=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  return installArchitectureShells(bytes);
  }catch{return false}finally{pending=null}
 })();return pending;
}
