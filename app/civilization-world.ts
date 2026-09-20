import * as T from 'three';
import {TessellateModifier} from 'three/addons/modifiers/TessellateModifier.js';
import * as outlines from './civilization-logo-outlines.json';
import {civilizationFor,civilizations,careerTimeline,careerCredentials,careerSkills,type Civilization} from './civilization-config';
import {planetPoint,planetUp,planetGeography,type PlanetSurface} from './planet-geography';
import type {ForgeSnapshot} from './forge-feed';

type Contour={outline:number[][];holes:number[][][]};
const logoNormal=new T.Vector3(0,.42,.9075241044).normalize();
const logoRight=new T.Vector3(1,0,0),logoNorth=new T.Vector3().crossVectors(logoNormal,logoRight).normalize();
const up=new T.Vector3(0,1,0);

export function logoContains(brand:Civilization,x:number,y:number){
  const inside=(points:number[][])=>{
    let result=false;
    for(let index=0,previous=points.length-1;index<points.length;previous=index++){
      const first=points[index],second=points[previous];
      if((first[1]>y)!==(second[1]>y)&&x<(second[0]-first[0])*(y-first[1])/(second[1]-first[1])+first[0])result=!result;
    }
    return result;
  };
  return outlines[brand].some(shape=>inside(shape.outline)&&!shape.holes.some(inside));
}

export function civilizationLogoDirection(x:number,y:number,radius:number,width:number){
  return logoNormal.clone().addScaledVector(logoRight,(x-12)*width/(24*radius)).addScaledVector(logoNorth,(12-y)*width/(24*radius)).normalize();
}

export function civilizationLogoReserved(surface:PlanetSurface,direction:T.Vector3){
  if(!civilizationFor(surface.stop))return false;
  return direction.dot(logoNormal)>.74;
}

function shapeFromContour(contour:Contour,holes=true){
  const shape=new T.Shape(contour.outline.map(([x,y])=>new T.Vector2(x,y)));
  if(holes)shape.holes=contour.holes.map(points=>new T.Path(points.map(([x,y])=>new T.Vector2(x,y))));
  return shape;
}

export function createCivilizationWorld(parent:T.Object3D,surface:PlanetSurface){
  const identity=civilizationFor(surface.stop);if(!identity)return null;
  const palette=civilizations[identity],root=new T.Group();root.name='Civilization_'+identity;parent.add(root);
  const width=identity==='github'?89:91;
  const white=new T.MeshPhysicalMaterial({color:palette.stone,roughness:.4,clearcoat:.28,metalness:.12});
  const ink=new T.MeshStandardMaterial({color:identity==='github'?'#242a33':palette.glass,roughness:.35,metalness:.48});
  const trim=new T.MeshStandardMaterial({color:palette.metal,roughness:.33,metalness:.72});
  const beacon=new T.MeshStandardMaterial({color:palette.light,emissive:palette.light,emissiveIntensity:.52,roughness:.3});
  const water=new T.MeshPhysicalMaterial({color:'#0a66c2',roughness:.3,metalness:.2,clearcoat:.65,clearcoatRoughness:.2});
  const buildings:{position:T.Vector3;radius:number}[]=[],cameraBounds:T.Box3[]=[];
  function curvedShape(shape:T.Shape,name:string,material:T.Material,height:number,depth:number){
    const source=new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:false,curveSegments:16});
    const geometry=new TessellateModifier(.7,10).modify(source);source.dispose();
    const positions=geometry.getAttribute('position');
    for(let index=0;index<positions.count;index++){
      const direction=civilizationLogoDirection(positions.getX(index),positions.getY(index),surface.radius,width);
      const point=planetPoint(surface,direction).addScaledVector(direction,height+positions.getZ(index));positions.setXYZ(index,point.x,point.y,point.z);
    }
    const second=new T.Vector3(),third=new T.Vector3();
    for(let index=0;index<positions.count;index+=3){second.fromBufferAttribute(positions,index+1);third.fromBufferAttribute(positions,index+2);positions.setXYZ(index+1,third.x,third.y,third.z);positions.setXYZ(index+2,second.x,second.y,second.z)}
    geometry.computeVertexNormals();const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.receiveShadow=true;root.add(mesh);return mesh;
  }
  if(identity==='github'){
    for(const contour of outlines.github)curvedShape(shapeFromContour(contour),'Forge_ArchitecturalGitHubMark',white,.24,.16);
  }else{
    for(const contour of outlines.linkedin){
      curvedShape(shapeFromContour(contour,false),'Citadel_WhiteLogoPlinth',white,.17,.25);
      curvedShape(shapeFromContour(contour),'Citadel_LinkedInReflectingPool',water,.8,.24);
      contour.holes.forEach((points,index)=>curvedShape(new T.Shape(points.map(([x,y])=>new T.Vector2(x,y))),'Citadel_WhiteLetterIsland_'+index,white,.5,1.2));
    }
  }
  const districtCells:{position:T.Vector3;rotation:T.Quaternion;height:number}[]=[];
  if(identity==='github')for(let row=0;row<44;row++)for(let column=0;column<44;column++){
    const x=(column+.5)*24/44,y=(row+.5)*24/44;
    if(!logoContains(identity,x,y)||!logoContains(identity,x+.18,y+.18)||!logoContains(identity,x-.18,y-.18))continue;
    const direction=civilizationLogoDirection(x,y,surface.radius,width),terrain=planetGeography(surface,direction);
    if(terrain.road<4.8)continue;
    const position=planetPoint(surface,direction),normal=planetUp(surface,position),height=1.5+((column+row*3)%5)*.45;
    const rotation=new T.Quaternion().setFromUnitVectors(up,normal);districtCells.push({position,rotation,height});buildings.push({position:position.clone(),radius:.88});
  }
  const dummy=new T.Object3D(),matrix=new T.Matrix4();
  const factories=new T.InstancedMesh(new T.BoxGeometry(1.4,1,1.4),white,districtCells.length),roofs=new T.InstancedMesh(new T.BoxGeometry(1.22,.07,1.22),beacon,districtCells.length);
  factories.name='Forge_LogoFoundryBlocks';roofs.name='Forge_LogoRoofLights';
  districtCells.forEach((cell,index)=>{
    dummy.quaternion.copy(cell.rotation);dummy.position.set(0,cell.height/2+.4,0).applyQuaternion(cell.rotation).add(cell.position);dummy.scale.set(1,cell.height,1);dummy.updateMatrix();factories.setMatrixAt(index,dummy.matrix);
    cameraBounds.push(new T.Box3(new T.Vector3(-.8,0,-.8),new T.Vector3(.8,cell.height+.6,.8)).applyMatrix4(matrix.compose(cell.position,cell.rotation,new T.Vector3(1,1,1))));
    dummy.position.set(0,cell.height+.45,0).applyQuaternion(cell.rotation).add(cell.position);dummy.scale.set(1,1,1);dummy.updateMatrix();roofs.setMatrixAt(index,dummy.matrix);
  });
  if(districtCells.length){factories.computeBoundingSphere();roofs.computeBoundingSphere();root.add(factories,roofs)}else{factories.geometry.dispose();roofs.geometry.dispose()}
  const landmarks:{name:string;description:string;position:T.Vector3;url?:string}[]=[];
  const recordGroups:T.Group[]=[];
  function placard(parent:T.Object3D,title:string,detail:string,width=7){
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=256;const context=canvas.getContext('2d')!;
    context.fillStyle=identity==='github'?'#20252c':'#f2f7fc';context.fillRect(0,0,768,256);
    context.fillStyle=identity==='github'?'#f2f5fa':'#0a66c2';context.textAlign='center';context.font='700 46px "Trebuchet MS", sans-serif';
    const words=title.split(' ');let line='',rows:string[]=[];
    for(const word of words){const next=line?line+' '+word:word;if(context.measureText(next).width>690&&line){rows.push(line);line=word}else line=next}if(line)rows.push(line);
    rows.slice(0,2).forEach((text,index)=>context.fillText(text,384,rows.length>1?66+index*52:93,690));
    context.font='500 25px "Trebuchet MS", sans-serif';context.fillStyle=identity==='github'?'#adb8c7':'#516c83';context.fillText(detail,384,204,690);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    const previous=parent.getObjectByName('Civilization_RecordPlaque') as T.Mesh<T.PlaneGeometry,T.MeshBasicMaterial>|undefined;
    if(previous){previous.removeFromParent();previous.material.map?.dispose();previous.material.dispose();previous.geometry.dispose()}
    const sign=new T.Mesh(new T.PlaneGeometry(width,width/3),new T.MeshBasicMaterial({map:texture,toneMapped:false}));sign.position.set(0,3.7,3.65);sign.name='Civilization_RecordPlaque';parent.add(sign);
  }
  const names=identity==='github'?palette.districts:careerTimeline.map(record=>record.name);
  names.forEach((name,index)=>{
    const angle=identity==='github'?index/(names.length-1)*2.4-1.2:index/(names.length-1)*2.7-1.35;
    const direction=logoNormal.clone().multiplyScalar(.74).addScaledVector(logoRight,Math.sin(angle)*.78).addScaledVector(logoNorth,Math.cos(angle)*.78).normalize();
    if(direction.y>.82)direction.setY(0).normalize().multiplyScalar(Math.sqrt(1-.82**2)).setY(.82);
    const position=planetPoint(surface,direction);
    const normal=planetUp(surface,position),group=new T.Group();group.name=(identity==='github'?'Forge_':'Citadel_')+name;group.position.copy(position);
    const toward=logoNormal.clone().sub(direction).projectOnPlane(normal).normalize(),right=new T.Vector3().crossVectors(normal,toward).normalize();group.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(right,normal,toward));root.add(group);
    recordGroups.push(group);
    const base=new T.Mesh(new T.CylinderGeometry(5,5.4,.45,32),identity==='github'?ink:white);base.position.y=.23;group.add(base);
    const height=identity==='github'?9+(index%3)*2:11+(index%3)*3;
    if(identity==='github'){
      for(const side of [-1,1]){const block=new T.Mesh(new T.BoxGeometry(2.8,height,3.8),index%2?trim:white);block.position.set(side*1.5,height/2,0);group.add(block);
        for(let floor=1;floor<height;floor+=2.4){const band=new T.Mesh(new T.BoxGeometry(2.9,.12,3.9),beacon);band.position.set(side*1.5,floor,0);group.add(band)}}
    }else{
      for(const side of [-1,1]){const column=new T.Mesh(new T.BoxGeometry(1.6,height,2),white);column.position.set(side*2.25,height/2,0);group.add(column)}
      const glass=new T.Mesh(new T.BoxGeometry(2.7,height*.8,1.4),ink);glass.position.set(0,height*.43,-.3);group.add(glass);
      const crown=new T.Mesh(new T.BoxGeometry(6.4,.55,2.8),white);crown.position.set(0,height,0);group.add(crown);
    }
    const record=identity==='linkedin'?careerTimeline[index]:null,description=record?`${record.role} / ${record.dates}`:'Public source architecture';
    placard(group,name,record?.dates??'SAHIL-LAB');landmarks.push({name,description,position:position.clone(),url:palette.url});buildings.push({position:position.clone(),radius:4.5});
    cameraBounds.push(new T.Box3(new T.Vector3(-3.7,0,-2.8),new T.Vector3(3.7,height+.8,2.8)).applyMatrix4(matrix.compose(position,group.quaternion,new T.Vector3(1,1,1))));
  });
  if(identity==='linkedin'){
    const points=new Float32Array(720*3);
    for(let index=0;index<720;index++){
      const angle=index*2.3999632297,elevation=.12+(index%101)/140,normal=new T.Vector3(Math.cos(angle),elevation,Math.sin(angle)).normalize();
      normal.multiplyScalar(surface.radius*1.24+(index%7)*.42).add(surface.center);points.set(normal.toArray(),index*3);
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(points,3));
    const network=new T.Points(geometry,new T.PointsMaterial({color:'#96b4d0',size:.19,transparent:true,opacity:.34,depthWrite:false}));network.name='Citadel_SymbolicKnowledgeGalaxy';root.add(network);
  }
  const rippleGeometry=new T.TorusGeometry(1,.008,4,48),ripples:T.Mesh[]=[];
  if(identity==='linkedin')for(let index=0;index<4;index++){
    const direction=civilizationLogoDirection(18+index%2*2,3+Math.floor(index/2)*3,surface.radius,width),position=planetPoint(surface,direction).addScaledVector(direction,1.08);
    const ripple=new T.Mesh(rippleGeometry,new T.MeshBasicMaterial({color:'#93cfff',transparent:true,opacity:.28,depthWrite:false}));ripple.position.copy(position);ripple.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),direction);root.add(ripple);ripples.push(ripple);
  }
  root.userData.staticCameraBounds=cameraBounds;
  root.userData.profileUrl=palette.url;root.userData.civilization=identity;root.userData.logoWidth=width;
  let clock=0;
  return {root,identity,landmarks,factories,logoNormal:logoNormal.clone(),
    setRepositories:(snapshot:ForgeSnapshot)=>{if(identity!=='github'||!snapshot.fetchedAt)return;snapshot.repositories.slice(0,recordGroups.length).forEach((repository,index)=>{const group=recordGroups[index];placard(group,repository.name,repository.archived?'ARCHIVED':`${repository.language??'Source'} / ${repository.stars} stars`);landmarks[index].name=repository.name;landmarks[index].description=`${repository.description||'Public repository'} / ${repository.language??'Language unspecified'} / ${repository.stars} stars / ${repository.forks} forks / ${snapshot.status==='stale'?'last verified snapshot':'GitHub public API'}`;landmarks[index].url=repository.url})},
    overview:surface.center.clone().addScaledVector(logoNormal,surface.radius*2.75),
    blocked:(position:T.Vector3,padding=.45)=>buildings.some(building=>position.distanceToSquared(building.position)<(building.radius+padding)**2),
    nearest:(position:T.Vector3)=>landmarks.find(landmark=>position.distanceTo(landmark.position)<8),
    update:(dt:number,reduced:boolean)=>{if(!reduced)clock+=dt;beacon.emissiveIntensity=reduced?.45:.42+Math.sin(clock*.5)*.07;ripples.forEach((ripple,index)=>ripple.scale.setScalar(reduced?1.2:1.1+Math.sin(clock*.45+index)*.16))},
    credentials:identity==='linkedin'?careerCredentials:[],skills:identity==='linkedin'?careerSkills:[],
  };
}