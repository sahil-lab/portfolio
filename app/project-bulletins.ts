import * as T from 'three';
import {goldMonumentSite} from './gold-monument-site';
import {createReadableDisplay} from './readable-display';
import {fitBoardText} from './bulletin-world';
import {cityBlock} from './city-architecture';
import {weatherScreenSite} from './weather-world';

export const projectBulletins=[
  {id:'sahil-resume',name:'Sahil Resume',destination:'Live project',color:'#6bd0b6',url:'https://portfolio-resume-lake.vercel.app/'},
  {id:'ecofusion-frontend',name:'EcoFusion',destination:'Live project',color:'#b3cf75',url:'https://ecofusion.vercel.app/'},
  {id:'cosmic-wellness',name:'Cosmic Wellness',destination:'Live project',color:'#aba5e1',url:'https://cosmic-wellness.vercel.app/'},
  {id:'mindful-goal',name:'Mindful Goal',destination:'Live project',color:'#e7a19c',url:'https://mindful-goal-seven.vercel.app/'},
  {id:'3d-code-pad',name:'3D Code Pad',destination:'Live project',color:'#efcb7a',url:'https://3d-code-pad-jp5m.vercel.app/'},
] as const;
export type ProjectBulletin=typeof projectBulletins[number];
export const projectBulletinSize={width:weatherScreenSite.width,height:weatherScreenSite.height};
export const projectBulletinArrival={x:goldMonumentSite.x,y:.8,z:goldMonumentSite.z+42};
export const projectBulletinCameraView=(aspect:number)=>({yaw:0,pitch:aspect<.8?.68:.4,zoom:Math.max(140,210/aspect),focusHeight:18});
const projectBulletinLayout=[{x:-30,z:32,yaw:0},{x:0,z:32,yaw:0},{x:30,z:32,yaw:0},{x:-36,z:-10,yaw:Math.PI/2},{x:36,z:-10,yaw:-Math.PI/2}];

export function createProjectBulletins(parent:T.Object3D,player:T.Group,open:(project:ProjectBulletin)=>void,allowed:()=>boolean=()=>true){
  const root=new T.Group();root.name='Golden_Statue_Project_Bulletins';root.position.set(goldMonumentSite.x,0,goldMonumentSite.z);parent.add(root);
  const pearl=new T.MeshStandardMaterial({color:'#d4ded9',roughness:.68,metalness:.12}),metal=new T.MeshStandardMaterial({color:'#526563',roughness:.5,metalness:.35});let enabled=true;
  const solids:T.Box3[]=[],localPlayer=new T.Vector3(),localPoint=new T.Vector3(),matrix=new T.Matrix4(),{width,height}=projectBulletinSize;
  function box(group:T.Group,name:string,width:number,height:number,depth:number,y:number,material:T.Material){const mesh=new T.Mesh(cityBlock(width,height,depth,.12),material);mesh.name=name;mesh.position.y=y;mesh.castShadow=mesh.receiveShadow=true;mesh.userData.cameraSolid=true;group.add(mesh);return mesh}
  const entries=projectBulletins.map((project,index)=>{
    const site=projectBulletinLayout[index],group=new T.Group();group.name='Project_Bulletin_'+project.id;group.position.set(site.x,0,site.z);group.rotation.y=site.yaw;root.add(group);
    const structure=[box(group,'Project_Bulletin_Frame',width+1.4,height+1.4,.9,10,pearl)];
    for(const side of [-1,1]){const post=box(group,'Project_Bulletin_Post',.75,4,1,2,metal),foot=box(group,'Project_Bulletin_Foot',2.8,.5,3.5,.25,pearl);post.position.x=foot.position.x=side*11.5;structure.push(post,foot)}
    const accent=new T.MeshBasicMaterial({color:project.color,toneMapped:false});box(group,'Project_Bulletin_Accent',width,.10,1,16.45,accent);
    const canvas=document.createElement('canvas');canvas.width=1440;canvas.height=640;const context=canvas.getContext('2d')!;
    context.fillStyle='#142a2b';context.fillRect(0,0,1440,640);context.fillStyle='#264443';for(let column=0;column<1440;column+=32)for(let row=0;row<640;row+=32)context.fillRect(column,row,2,2);
    context.fillStyle=project.color;context.fillRect(48,22,9,52);context.textAlign='left';context.textBaseline='alphabetic';
    fitBoardText(context,project.name,82,62,920,48,'#ffffff');context.textAlign='right';fitBoardText(context,'SAHIL UPADHYAY',1392,59,365,27,project.color);context.textAlign='left';
    context.fillStyle='#52716e';context.fillRect(48,95,1344,2);fitBoardText(context,project.name,72,325,1296,116,'#ffffff');fitBoardText(context,'PROJECT WEBSITE',76,401,1296,32,project.color);
    context.fillStyle='#52716e';context.fillRect(48,591,1344,2);fitBoardText(context,new URL(project.url).hostname,48,626,1344,29,'#d5e8e3');
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;
    const faces=createReadableDisplay(group,'Project_Bulletin_Display',texture,width,height,.9,new T.Vector3(0,10,0));
    for(const face of [faces.front,faces.back])face.userData.projectBulletin=project.id;
    group.updateMatrix();for(const mesh of structure){mesh.updateMatrix();mesh.geometry.computeBoundingBox();solids.push(mesh.geometry.boundingBox!.clone().applyMatrix4(matrix.multiplyMatrices(group.matrix,mesh.matrix)))}
    const bounds=new T.Box3(new T.Vector3(-width/2-.7,0,-1.75),new T.Vector3(width/2+.7,16.7,1.75)).applyMatrix4(group.matrix);
    const approach=new T.Vector3(0,.8,7).applyMatrix4(group.matrix).add(root.position);group.userData.previewState='fallback';group.userData.projectUrl=project.url;
    return {project,group,faces,texture,canvas,approach,bounds};
  });
  function active(){if(!enabled||!allowed())return false;for(let ancestor:T.Object3D|null=root;ancestor;ancestor=ancestor.parent)if(!ancestor.visible)return false;return true}
  function near(entry:typeof entries[number]){localPlayer.copy(player.position).sub(root.position).applyMatrix4(matrix.copy(entry.group.matrix).invert());return localPlayer.y>=0&&localPlayer.y<3&&Math.abs(localPlayer.x)<width/2&&Math.abs(localPlayer.z)>1.9&&Math.abs(localPlayer.z)<13}
  function activate(entry:typeof entries[number]){if(!active())return false;open(entry.project);return true}
  function select(ray:T.Raycaster){
    if(!active())return false;root.updateWorldMatrix(true,true);const hit=ray.intersectObjects(entries.flatMap(entry=>[entry.faces.front,entry.faces.back]),false)[0];if(!hit)return false;
    const entry=entries.find(entry=>entry.project.id===hit.object.userData.projectBulletin);if(!entry||player.position.distanceToSquared(entry.approach)>90**2)return false;
    const meshes:T.Object3D[]=[];parent.traverseVisible(object=>{if((object as T.Mesh).isMesh)meshes.push(object)});const obstruction=ray.intersectObjects(meshes,false).find(candidate=>{const material=(candidate.object as T.Mesh).material;return (Array.isArray(material)?material:[material]).some(value=>value.visible&&(!value.transparent||value.opacity>.4))});
    if(obstruction&&obstruction.distance<hit.distance-.025)return false;return activate(entry);
  }
  return {root,entries,solids,select,setEnabled:(value:boolean)=>{enabled=value},
    near:()=>active()&&player.position.y<6&&Math.hypot(player.position.x-root.position.x,player.position.z-root.position.z)<70,
    blocked:(x:number,z:number,y:number)=>solids.some(bounds=>bounds.clone().expandByScalar(.45).containsPoint(localPoint.set(x-root.position.x,y-root.position.y,z-root.position.z))),
    prompt:()=>{if(!active())return null;const entry=entries.find(near);return entry?'E \u00b7 Open '+entry.project.name:null},
    interact:()=>{if(!active())return false;const entry=entries.find(near);return entry?activate(entry):false},
  };
}
