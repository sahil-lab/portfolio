import * as T from 'three';
import {createReadableDisplay} from './readable-display';
import {createCanopyAsset,createCanopyMaterials} from './canopy-grove';
import {craftedBox,createSurfaceRelief} from './crafted-surfaces';
import {craftGeometry,type CraftPart} from './craft-kit';

const civicProfiles:Partial<Record<string,CraftPart>>={Civic_BenchSlat:'BenchSlat',Civic_BenchBack:'BenchBack',Civic_BenchFoot:'BenchFoot',Civic_BenchBackPost:'BenchBack',Civic_BenchBackBrace:'BenchSlat',Civic_LampLantern:'Lantern',Civic_LampCrown:'LanternCap',Civic_LanternCap:'LanternCap',Civic_RoundedLanternCrown:'LanternCap',Civic_RecyclingBin:'Bin',Civic_WasteBin:'Bin',Civic_BinLid:'BinLid',Civic_FlowerBedRim:'FlowerBedRim',Civic_PlaqueBacking:'PlaqueBacking'};

export function createCivicKit(){
 const finish=(color:string,roughness=.7,metalness=.1)=>new T.MeshStandardMaterial({color,roughness,metalness,vertexColors:true});
 const materials={stone:finish('#ccd5ce'),ink:finish('#263e46'),brass:finish('#b1935c',.46,.65),wood:finish('#9c785c',.91),leaf:finish('#477e60',.96),tip:finish('#8aac76',.96),petal:finish('#dca4af',.88),warm:finish('#f6e5bd',.35),paving:finish('#899d99',.96)};
 materials.warm.emissive.set('#ffe0a3');materials.warm.emissiveIntensity=.12;materials.leaf.userData.surface=materials.tip.userData.surface=materials.wood.userData.surface='natural';
 materials.stone.userData.surface='ceramic';materials.paving.userData.surface='natural';
 const stoneRelief=createSurfaceRelief('stone'),woodRelief=createSurfaceRelief('timber'),metalRelief=createSurfaceRelief('brushed');
 for(const [material,texture,depth] of [[materials.stone,stoneRelief,.035],[materials.paving,stoneRelief,.018],[materials.wood,woodRelief,.045],[materials.brass,metalRelief,.008]] as const){material.bumpMap=material.roughnessMap=texture;material.bumpScale=depth}
 const geometries=new Map<string,T.BufferGeometry>(),solids:T.Box3[]=[],glows:T.Mesh[]=[];
 function geometry(key:string,create:()=>T.BufferGeometry){let value=geometries.get(key);if(!value){value=create();if(!value.attributes.color)value.setAttribute('color',new T.BufferAttribute(new Float32Array(value.attributes.position.count*3).fill(1),3));geometries.set(key,value)}return value}
 function mesh(parent:T.Object3D,name:string,shape:T.BufferGeometry,material:T.Material,position:T.Vector3,solid=false){const surface=material as T.MeshStandardMaterial;if(shape.userData.authoredCraft){if(!surface.vertexColors){surface.vertexColors=true;surface.needsUpdate=true}surface.userData.authoredCraft=true}if(surface.vertexColors&&!shape.attributes.color)shape.setAttribute('color',new T.BufferAttribute(new Float32Array(shape.attributes.position.count*3).fill(1),3));const object=new T.Mesh(shape,material);object.name=name;object.position.copy(position);object.castShadow=object.receiveShadow=true;parent.add(object);if(solid){shape.computeBoundingBox();solids.push(shape.boundingBox!.clone().translate(position));object.userData.cameraSolid=true}return object}
 function box(parent:T.Object3D,name:string,position:T.Vector3,size:[number,number,number],material:T.Material,solid=false){const part=civicProfiles[name];return mesh(parent,name,geometry((part??'box')+'/'+size.join('/'),()=>part?craftGeometry(part,...size)??craftedBox(...size):craftedBox(...size)),material,position,solid)}
 function beam(parent:T.Object3D,name:string,from:T.Vector3,to:T.Vector3,material=materials.brass,radius=.06){const delta=to.clone().sub(from),object=mesh(parent,name,geometry('beam/'+radius,()=>new T.CylinderGeometry(radius,radius,1,8)),material,from.clone().add(to).multiplyScalar(.5));object.scale.y=delta.length();object.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return object}
 let canopy:{shape:ReturnType<typeof createCanopyAsset>;finishes:ReturnType<typeof createCanopyMaterials>}|null=null;
 function tree(parent:T.Object3D,x:number,z:number,kind:'shade'|'blossom'|'column'='shade',seed=0){
  const group=new T.Group();group.name='Civic_Tree_'+kind;group.position.set(x,0,z);parent.add(group);
  const {shape,finishes}=canopy??={shape:createCanopyAsset('tree','distant'),finishes:createCanopyMaterials()},height=kind==='column'?5.6:4.4+(seed%4)*.32,width=kind==='column'?.2:.34;
  group.userData.canopyStyle='astra-layered-leaf';
  const trunk=mesh(group,'Civic_BranchingTrunk',shape.wood,finishes.wood,new T.Vector3()),crown=mesh(group,'Civic_OrganicCrown',shape.crown,finishes.leaf,new T.Vector3());
  for(const object of [trunk,crown]){object.scale.set(width,height/shape.height,width);object.rotation.y=seed*.71}
  const rim=mesh(group,'Civic_TreeGrate',geometry('tree-grate',()=>new T.TorusGeometry(.69,.055,6,24)),materials.brass,new T.Vector3(0,.045,0));rim.rotation.x=Math.PI/2;
  contact(group,0,0,2.2,2.2);
  solids.push(new T.Box3(new T.Vector3(x-.36,0,z-.36),new T.Vector3(x+.36,height*.7,z+.36)));return group;
 }
 function bench(parent:T.Object3D,x:number,z:number,yaw=0){
  const group=new T.Group();group.name='Civic_JoinedBench';group.position.set(x,0,z);group.rotation.y=yaw;parent.add(group);
  for(let slat=0;slat<4;slat++)box(group,'Civic_BenchSlat',new T.Vector3(0,.74,-.3+slat*.18),[2.9,.09,.14],materials.wood);
  for(let slat=0;slat<3;slat++)box(group,'Civic_BenchBack',new T.Vector3(0,1.03+slat*.17,-.42),[2.9,.1,.09],materials.wood);
  for(const side of [-1,1]){box(group,'Civic_BenchFoot',new T.Vector3(side*1.05,.35,0),[.13,.7,.61],materials.ink);beam(group,'Civic_BenchArm',new T.Vector3(side*1.38,1.03,-.37),new T.Vector3(side*1.38,1.03,.38),materials.brass,.035)}
  for(const side of [-1,1]){box(group,'Civic_BenchBackPost',new T.Vector3(side*1.05,1.065,-.455),[.12,.85,.08],materials.ink);box(group,'Civic_BenchBackBrace',new T.Vector3(side*1.05,.67,-.235),[.12,.08,.4],materials.ink);beam(group,'Civic_BenchArmPost',new T.Vector3(side*1.38,.74,.24),new T.Vector3(side*1.38,1.03,.24),materials.brass,.03)}
  contact(group,0,0,3.9,1.65);
  group.updateMatrix();solids.push(new T.Box3(new T.Vector3(-1.48,0,-.5),new T.Vector3(1.48,1.6,.47)).applyMatrix4(group.matrix));return group;
 }
 const glowData=new Uint8Array(32*32*4);for(let row=0;row<32;row++)for(let column=0;column<32;column++){const amount=Math.max(0,1-Math.hypot(column-15.5,row-15.5)/16);glowData.set([255,218,154,Math.round(amount*amount*165)],(row*32+column)*4)}
 const glowTexture=new T.DataTexture(glowData,32,32,T.RGBAFormat);glowTexture.magFilter=glowTexture.minFilter=T.LinearFilter;glowTexture.needsUpdate=true;glowTexture.colorSpace=T.SRGBColorSpace;
 const glowMaterial=new T.MeshBasicMaterial({map:glowTexture,transparent:true,opacity:0,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending});
 const shadeData=new Uint8Array(32*32*4);for(let row=0;row<32;row++)for(let column=0;column<32;column++){const amount=Math.max(0,1-Math.hypot(column-15.5,row-15.5)/16);shadeData.set([20,34,38,Math.round(amount*amount*145)],(row*32+column)*4)}
 const shadeTexture=new T.DataTexture(shadeData,32,32,T.RGBAFormat);shadeTexture.magFilter=shadeTexture.minFilter=T.LinearFilter;shadeTexture.needsUpdate=true;shadeTexture.colorSpace=T.SRGBColorSpace;
 const shadeMaterial=new T.MeshBasicMaterial({map:shadeTexture,transparent:true,depthWrite:false,toneMapped:false});
 function contact(parent:T.Object3D,horizontal:number,forward:number,width:number,depth:number){const shadow=mesh(parent,'Civic_ContactShade',geometry('contact-shade',()=>new T.PlaneGeometry(1,1)),shadeMaterial,new T.Vector3(horizontal,.082,forward));shadow.rotation.x=-Math.PI/2;shadow.scale.set(width,depth,1);shadow.castShadow=shadow.receiveShadow=false;return shadow}
 function lamp(parent:T.Object3D,x:number,z:number,style:'plaza'|'park'|'street'='plaza',yaw=0){
  const group=new T.Group();group.name='Civic_Lamp_'+style;group.position.set(x,0,z);group.rotation.y=yaw;parent.add(group);
  const height=style==='park'?3.05:4.2;mesh(group,'Civic_LampBase',geometry('lamp-base',()=>new T.CylinderGeometry(.2,.34,.3,12)),materials.stone,new T.Vector3(0,.15,0));
  if(style==='plaza'){
   const curve=new T.CatmullRomCurve3([new T.Vector3(0,.2,0),new T.Vector3(0,4.1,0),new T.Vector3(.35,5.35,0),new T.Vector3(1.4,5.6,0)]);
   mesh(group,'Civic_CurvedLampMast',geometry('curved-lamp',()=>new T.TubeGeometry(curve,18,.075,7,false)),materials.brass,new T.Vector3());
   box(group,'Civic_LampLantern',new T.Vector3(1.4,5.3,0),[.66,.5,.54],materials.warm);box(group,'Civic_LampCrown',new T.Vector3(1.4,5.59,0),[.85,.12,.73],materials.ink);
  }else{
   mesh(group,'Civic_LampMast',geometry('lamp-mast-'+height,()=>new T.CylinderGeometry(.065,.105,height,10)),materials.ink,new T.Vector3(0,height/2,0));
   box(group,'Civic_LampLantern',new T.Vector3(0,height,0),[.48,.7,.48],materials.warm);
   for(const side of [-1,1])box(group,'Civic_LanternCap',new T.Vector3(0,height+side*.4,0),[.7,.1,.7],materials.brass);
  if(style==='street')box(group,'Civic_RoundedLanternCrown',new T.Vector3(0,height+.49,0),[.72,.24,.72],materials.stone);
  }
  const pool=mesh(group,'Civic_LightPool',geometry('lamp-glow',()=>new T.PlaneGeometry(7,7)),glowMaterial,new T.Vector3(style==='plaza'?1.1:0,.095,0));pool.rotation.x=-Math.PI/2;pool.castShadow=pool.receiveShadow=false;glows.push(pool);
  solids.push(new T.Box3(new T.Vector3(x-.28,0,z-.28),new T.Vector3(x+.28,height,z+.28)));return group;
 }
 function flowers(parent:T.Object3D,x:number,z:number,width:number,depth:number,seed=0){
  const rim=box(parent,'Civic_FlowerBedRim',new T.Vector3(x,.16,z),[width,.32,depth],materials.stone),authored=!!rim.geometry.userData.authoredCraft;
  box(parent,'Civic_FlowerSoil',new T.Vector3(x,authored?.28:.33,z),[authored?width*.73:width-.2,.035,authored?depth*.73:depth-.2],materials.wood);
  const count=Math.min(56,Math.ceil(width*depth*4)),instances=new T.InstancedMesh(geometry('flower',()=>new T.SphereGeometry(.1,6,4)),seed%2?materials.petal:materials.warm,count),dummy=new T.Object3D();
  instances.name='Civic_PlantedFlowers';for(let index=0;index<count;index++){dummy.position.set(x+((index*1.618)%1-.5)*(authored?width*.66:width-.4),.48+(index%4)*.045,z+((index*.754877)%1-.5)*(authored?depth*.66:depth-.4));dummy.scale.set(1.15,.6,1.15);dummy.updateMatrix();instances.setMatrixAt(index,dummy.matrix)}instances.computeBoundingSphere();parent.add(instances);
 }
 function utilities(parent:T.Object3D,x:number,z:number){
  const group=new T.Group();group.name='Civic_Utilities';group.position.set(x,0,z);parent.add(group);
  for(const side of [-1,1]){box(group,side<0?'Civic_RecyclingBin':'Civic_WasteBin',new T.Vector3(side*.5,.65,0),[.65,1.2,.62],side<0?materials.leaf:materials.ink);box(group,'Civic_BinLid',new T.Vector3(side*.5,1.29,0),[.72,.12,.68],materials.brass);box(group,'Civic_BinSlot',new T.Vector3(side*.5,1,.32),[.4,.13,.025],materials.stone)}
  solids.push(new T.Box3(new T.Vector3(x-.87,0,z-.38),new T.Vector3(x+.87,1.4,z+.38)));return group;
 }
 function plaque(parent:T.Object3D,title:string,subtitle:string,x:number,y:number,z:number,width=6,facade=false){
    const canvas=document.createElement('canvas');canvas.width=width>=8?1536:width>=5?1024:768;canvas.height=canvas.width/4;const context=canvas.getContext('2d')!;context.scale(canvas.width/1536,canvas.width/1536);
  if(!facade){context.fillStyle='#18333d';context.fillRect(0,0,1536,384);context.strokeStyle='#b79558';context.lineWidth=6;context.strokeRect(13,13,1510,358)}context.textAlign='center';context.textBaseline='middle';context.fillStyle='#f3f4eb';context.font=(facade?'500 108px':'700 118px')+' "Space Grotesk", sans-serif';context.fillText(title,768,143,1410);context.fillStyle='#d0ddd9';context.font='500 54px "Space Grotesk", sans-serif';context.fillText(subtitle,768,277,1390);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;const group=new T.Group();group.name='Civic_Plaque_'+title;group.position.set(x,y,z);parent.add(group);if(!facade)box(group,'Civic_PlaqueBacking',new T.Vector3(),[width+.16,width/4+.16,.22],materials.ink);const display=createReadableDisplay(group,'Civic_PlaqueText',texture,width,width/4,.25,new T.Vector3());if(facade){display.front.material.alphaTest=.3;display.front.material.transparent=true;display.front.material.depthWrite=false;group.userData.architecturalLettering=true}return group;
 }
 return {materials,solids,box,beam,tree,bench,lamp,flowers,utilities,plaque,contact,
  lighting(night:number,wet:number){materials.warm.emissiveIntensity=.12+night*1.6;glowMaterial.opacity=night;materials.paving.roughness=.96-wet*.48;materials.stone.roughness=.7-wet*.22},
 };
}
