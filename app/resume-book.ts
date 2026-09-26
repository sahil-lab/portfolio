import * as T from 'three';
import resume from '../public/assets/resume-book/pages.json';
import {createReadableDisplay} from './readable-display';
import {goldMonumentSite} from './gold-monument-site';

export const resumeBookSites=[
 {id:'weather',name:'Weather Library',x:42,z:63},
 {id:'statue',name:'Gold Statue Library',x:goldMonumentSite.x+35,z:goldMonumentSite.z+18},
] as const;
export type ResumeBookSiteId=typeof resumeBookSites[number]['id'];
export const resumeBookSize={pageHeight:11.2,pageWidth:11.2*resume.pages[0].aspect,height:14.6,width:17.4,depth:2.4};
export const resumeSpreads=[[0,1],[2,null]] as const;

function labelTexture(lines:string[],background='#193f3b',color='#f4f8ef',aspect=1024/1448){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=Math.round(1024/aspect);
 const context=canvas.getContext('2d')!;context.fillStyle=background;context.fillRect(0,0,canvas.width,canvas.height);
 context.textAlign='center';context.textBaseline='middle';context.fillStyle=color;
 lines.forEach((line,index)=>{context.font=`${index===0?700:500} ${lines.length>2?(index===0?78:48):Math.round(canvas.height*.7)}px "Space Grotesk",sans-serif`;context.fillText(line,canvas.width/2,canvas.height*(index+1)/(lines.length+1),canvas.width*.88)});
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;return texture;
}

export function createResumeBooks(scene:T.Scene,player:T.Group,options:{open:(site:ResumeBookSiteId,page:number)=>void;loadTexture?:(url:string)=>Promise<T.Texture>}){
 const root=new T.Group();root.name='Resume_Books';scene.add(root);
 const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();
 const pageTextures:(T.Texture|null)[]=resume.pages.map(()=>null),loader=new T.TextureLoader();let disposed=false,failed=false;
 const ownTexture=(texture:T.Texture)=>{textures.add(texture);return texture};
 const cover=ownTexture(labelTexture(['SAHIL','UPADHYAY','FULL-STACK & AI','RESUME / 3 PAGES']));
 const loading=ownTexture(labelTexture(['SAHIL','UPADHYAY','RESUME','Loading pages']));
 const heading=ownTexture(labelTexture(['SAHIL UPADHYAY / RESUME'],'#193f3b','#f4f8ef',15.9/.56));
 const previous=ownTexture(labelTexture(['<'], '#193f3b','#e4c891',1.25/.62)),next=ownTexture(labelTexture(['>'], '#193f3b','#e4c891',1.25/.62));
 const ink=new T.MeshStandardMaterial({color:'#173b36',roughness:.58}),brass=new T.MeshStandardMaterial({color:'#c6a55d',metalness:.55,roughness:.38}),paper=new T.MeshStandardMaterial({color:'#edf0e9',roughness:.95});
 [ink,brass,paper].forEach(material=>materials.add(material));
 function box(parent:T.Object3D,name:string,width:number,height:number,depth:number,x:number,y:number,z:number,material:T.Material){
  const geometry=new T.BoxGeometry(width,height,depth);geometries.add(geometry);const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.position.set(x,y,z);mesh.userData.cameraSolid=true;parent.add(mesh);return mesh;
 }
 function display(parent:T.Object3D,name:string,texture:T.Texture,width:number,height:number,depth:number,position:T.Vector3){
  const faces=createReadableDisplay(parent,name,texture,width,height,depth,position);
  for(const face of [faces.front,faces.back]){face.material.fog=false;geometries.add(face.geometry);materials.add(face.material)}return faces;
 }
 const books=resumeBookSites.map(site=>{
  const group=new T.Group();group.name='Resume_Book_'+site.id;group.position.set(site.x,0,site.z);group.userData.resumeBook=site.id;group.userData.worldAnchored=true;root.add(group);
  box(group,'Book_Plinth',18,.5,4,0,.25,0,ink);
  box(group,'Book_Plinth_Inlay',17.6,.07,3.6,0,.535,0,brass);
  for(const sign of [-1,1])box(group,'Book_Support',.5,2.6,.6,sign*5.8,1.8,0,brass);
  const leaves=[-1,1].map((sign,index)=>{
   const x=sign*(resumeBookSize.pageWidth/2+.14),angle=-sign*.09;
   const binding=box(group,'Book_Cover',resumeBookSize.pageWidth+.45,resumeBookSize.pageHeight+.45,.42,x,8.15,0,ink);binding.rotation.y=angle;
   const stack=box(group,'Book_Page_Edges',resumeBookSize.pageWidth+.17,resumeBookSize.pageHeight+.17,.6,x,8.15,0,paper);stack.rotation.y=angle;
   const faces=display(group,'Resume_Page_'+index,loading,resumeBookSize.pageWidth,resumeBookSize.pageHeight,1.46,new T.Vector3(x,8.15,0));
   faces.front.rotation.y=angle;faces.back.position.x=-x;faces.back.rotation.y=Math.PI-angle;
   for(const face of [faces.front,faces.back]){face.userData.resumeAction='read';face.userData.resumeSite=site.id;face.userData.resumePage=index+1}
   return faces;
  });
  box(group,'Book_Spine',.24,11.9,1.7,0,8.15,0,brass);
  box(group,'Book_Title_Rail',17.4,.8,.95,0,14.1,0,ink);
  display(group,'Resume_Title',heading,15.9,.56,1,new T.Vector3(0,14.1,0));
  const controls=[{action:'previous',x:-6.4,texture:previous},{action:'next',x:6.4,texture:next}].map(control=>{
   box(group,'Book_Turn_Plaque',1.45,.8,1.1,control.x,1.65,0,ink);
   const faces=display(group,'Resume_'+control.action,control.texture,1.25,.62,1.15,new T.Vector3(control.x,1.65,0));faces.back.position.x=-control.x;
   for(const face of [faces.front,faces.back]){face.userData.resumeAction=control.action;face.userData.resumeSite=site.id}return faces;
  });
  const state={site,group,leaves,controls,spread:0};
  function setSpread(index:number){
   if(disposed||!Number.isInteger(index)||index<0||index>=resumeSpreads.length)return false;
   state.spread=index;group.userData.spread=index;
   leaves.forEach((faces,slot)=>{const page=resumeSpreads[index][slot],texture=page===null?cover:pageTextures[page]??loading;faces.front.material.map=texture;faces.front.material.needsUpdate=true;for(const face of [faces.front,faces.back])face.userData.resumePage=page===null?3:page+1});return true;
  }
  setSpread(0);return {...state,setSpread,get spread(){return state.spread}};
 });
 const load=options.loadTexture??((url:string)=>loader.loadAsync(url));
 const ready=Promise.all(resume.pages.map(async(page,index)=>{
  const texture=await load(page.image);if(disposed){texture.dispose();return}
  texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;pageTextures[index]=ownTexture(texture);books.forEach(book=>book.setSpread(book.spread));
 })).catch(error=>{if(!disposed){failed=true;console.error('Resume pages could not load',error)}});
 function near(position=player.position){if(disposed||!root.visible||position.y>3)return null;return books.find(book=>Math.abs(position.x-book.site.x)<resumeBookSize.width*.6&&Math.abs(position.z-book.site.z)<9)??null}
 function select(ray:T.Raycaster){
  if(disposed||!root.visible)return false;root.updateWorldMatrix(true,true);
  const hit=ray.intersectObject(root,true).find(intersection=>intersection.object.userData.resumeAction);if(!hit)return false;
  const book=books.find(value=>value.site.id===hit.object.userData.resumeSite)!;
  const action=hit.object.userData.resumeAction;
  if(action==='read')options.open(book.site.id,hit.object.userData.resumePage);
  else book.setSpread((book.spread+(action==='next'?1:-1)+resumeSpreads.length)%resumeSpreads.length);
  return true;
 }
 return {root,books,ready,get loaded(){return pageTextures.every(Boolean)},get failed(){return failed},
  near,select,prompt:()=>near()?'Resume book':null,
  interact:()=>{const book=near();if(!book)return false;options.open(book.site.id,resumeSpreads[book.spread][0]!+1);return true},
  blocked:(x:number,z:number,y:number)=>!disposed&&y>=0&&y<resumeBookSize.height&&books.some(book=>Math.abs(x-book.site.x)<9.4&&Math.abs(z-book.site.z)<2.4),
  dispose:()=>{if(disposed)return;disposed=true;geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());textures.forEach(texture=>texture.dispose());root.clear();root.removeFromParent()},
 };
}
