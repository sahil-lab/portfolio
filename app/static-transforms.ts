import * as T from 'three';

const caches=new WeakMap<T.Object3D,{invalidate:()=>void}>();

export function cacheStaticTransforms(root:T.Object3D){
 root.traverse(object=>{if(object!==root){object.updateMatrix();object.matrixAutoUpdate=false}});
 const previous=caches.get(root);
 if(previous){previous.invalidate();return}
 const update=root.updateMatrixWorld.bind(root),parentMatrix=new T.Matrix4(),localMatrix=new T.Matrix4(),children:T.Object3D[]=[];
 let parent=root.parent;
 let dirty=true;
 caches.set(root,{invalidate:()=>{dirty=true}});
 root.updateMatrixWorld=function(){
  if(root.matrixAutoUpdate)root.updateMatrix();
  if(!dirty&&root.parent===parent&&(!parent||parent.matrixWorld.equals(parentMatrix))&&root.matrix.equals(localMatrix)&&children.length===root.children.length&&children.every((child,index)=>child===root.children[index])){
   root.matrixWorldNeedsUpdate=false;return;
  }
    update(true);parent=root.parent;if(parent)parentMatrix.copy(parent.matrixWorld);localMatrix.copy(root.matrix);children.length=0;children.push(...root.children);dirty=false;
 };
}
