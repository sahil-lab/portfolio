import * as T from 'three';

function createRegistry(root:T.Object3D){
 const objects=new Set<T.Object3D>(),meshes=new Set<T.Mesh>();let version=0;
 const visit=(object:T.Object3D,callback:(object:T.Object3D)=>void)=>{const pending=[object];while(pending.length){const current=pending.pop()!;callback(current);for(let index=current.children.length-1;index>=0;index--)pending.push(current.children[index])}};
 const add=(object:T.Object3D)=>visit(object,entry=>{if(objects.has(entry))return;objects.add(entry);if(entry instanceof T.Mesh)meshes.add(entry);entry.addEventListener('childadded',added);entry.addEventListener('childremoved',removed)});
 const remove=(object:T.Object3D)=>visit(object,entry=>{objects.delete(entry);if(entry instanceof T.Mesh)meshes.delete(entry);entry.removeEventListener('childadded',added);entry.removeEventListener('childremoved',removed)});
 function added(event:{child:T.Object3D}){add(event.child);version++}
 function removed(event:{child:T.Object3D}){let parent:T.Object3D|null=event.child;while(parent){if(parent===root){version++;return}parent=parent.parent}remove(event.child);version++}
 add(root);
 return {objects,meshes,users:0,get version(){return version},dispose(){remove(root);objects.clear();meshes.clear()}};
}

const registries=new WeakMap<T.Object3D,ReturnType<typeof createRegistry>>();

export function acquireSceneRegistry(root:T.Object3D){
 let registry=registries.get(root);if(!registry){registry=createRegistry(root);registries.set(root,registry)}registry.users++;const held=registry;let released=false;
 return {objects:held.objects,meshes:held.meshes,get version(){return held.version},release(){if(released)return;released=true;if(--held.users===0){held.dispose();registries.delete(root)}}};
}
