import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {astraPalette} from './astra-lighting';
import {worldKitGeometry} from './world-kit';

const branchTips=[
  [-4.8,6.4,1.2],[-3.5,8.2,-1.6],[-1.5,9.5,.4],
  [2,8.8,-1.9],[4.4,7.8,.6],[3.3,6.1,2.4],[.2,7.6,3],
];

export type CanopyKind='tree'|'banyan';
export type CanopyDetail='full'|'distant';

function canopyBranchTips(kind:CanopyKind){
  return kind==='banyan'?[...branchTips.map(([horizontal,height,depth])=>[horizontal*1.48,height*.9+.5,depth*1.7]),[0,7.6,-6],[-3.6,6.8,-4.9],[5.4,7.1,-4.1]]:branchTips;
}

export function canopyTrunks(kind:CanopyKind){
  const trunks=[{x:0,z:0,radius:kind==='banyan'?.8:.42,height:7}];
  if(kind==='banyan')for(const [horizontal,height,forward] of canopyBranchTips(kind)){const spread=Math.max(.72,2.25/Math.hypot(horizontal,forward));trunks.push({x:horizontal*spread,z:forward*spread,radius:.26,height:height-.65})}
  return trunks;
}

export function createCanopyFruitGeometry(kind:CanopyKind,detail:CanopyDetail){
  const tips=canopyBranchTips(kind);
  const pieces:T.BufferGeometry[]=[],centers:number[][]=[],color=new T.Color(),radius=kind==='banyan'?.25:.32;
  function painted(source:T.BufferGeometry,paint:string){
    const geometry=source.index?source.toNonIndexed():source;if(geometry!==source)source.dispose();geometry.deleteAttribute('uv');
    const colors=new Float32Array(geometry.attributes.position.count*3);color.set(paint);for(let vertex=0;vertex<geometry.attributes.position.count;vertex++)color.toArray(colors,vertex*3);geometry.setAttribute('color',new T.BufferAttribute(colors,3));pieces.push(geometry);
  }
  tips.forEach(([horizontal,height,depth],branch)=>{
    for(let fruit=0;fruit<3;fruit++){
      const angle=branch*1.7+fruit*2.399963,x=horizontal+Math.cos(angle)*.65,y=height-.63-(fruit%2)*.28,z=depth+Math.sin(angle)*.55;centers.push([x,y,z]);
      const body=detail==='full'?new T.SphereGeometry(radius,6,4):new T.OctahedronGeometry(radius,0);body.scale(1,1.08,1);body.translate(x,y,z);painted(body,(branch+fruit)%3===0?'#e65349':(branch+fruit)%3===1?'#f3b43d':'#e88339');
      if(detail==='full')painted(new T.CylinderGeometry(.023,.028,.24,4).translate(x,y+radius+.06,z),'#696544');
    }
  });
  const geometry=mergeGeometries(pieces)!;pieces.forEach(piece=>piece.dispose());geometry.userData.fruitCount=centers.length;geometry.userData.fruitCenters=centers;return geometry;
}

function taperedBranch(points:T.Vector3[],radius:number,segments=18,sides=7){
  const curve=new T.CatmullRomCurve3(points),geometry=new T.TubeGeometry(curve,segments,radius,sides,false);
  const positions=geometry.getAttribute('position'),center=new T.Vector3(),vertex=new T.Vector3();
  for(let ring=0;ring<=segments;ring++){
    curve.getPointAt(ring/segments,center);const taper=1-ring/segments*.8;
    for(let side=0;side<=sides;side++){
      const index=ring*(sides+1)+side;vertex.fromBufferAttribute(positions,index).sub(center).multiplyScalar(taper).add(center);positions.setXYZ(index,vertex.x,vertex.y,vertex.z);
    }
  }
  geometry.computeVertexNormals();return geometry;
}

export function createAstraCanopy(name:string,scale=1,kind:CanopyKind='tree',detail:CanopyDetail='full'){
  const root=new T.Group();root.name=name;root.scale.setScalar(scale);
  root.userData.canopyStyle='astra-layered-leaf';root.userData.treeKind=kind;
  const fruitGeometry=createCanopyFruitGeometry(kind,detail),fruitMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.65,metalness:0}),fruit=new T.InstancedMesh(fruitGeometry,fruitMaterial,1);fruitMaterial.userData.surface='natural';fruit.name='Canopy_HangingFruit';fruit.setMatrixAt(0,new T.Matrix4());fruit.castShadow=fruit.receiveShadow=true;fruit.computeBoundingSphere();root.add(fruit);root.userData.fruitCount=fruitGeometry.userData.fruitCount;
  const banyan=kind==='banyan',segments=detail==='full'?18:6,sides=detail==='full'?7:5,leavesPerBranch=detail==='full'?42:12;
  const tips=canopyBranchTips(kind),trunks=canopyTrunks(kind);
  const prefix='Kit_'+(banyan?'Banyan':'Tree')+'_'+(detail==='full'?'Full':'Distant'),woodGeometry=worldKitGeometry(prefix+'_Wood',true),crownGeometry=worldKitGeometry(prefix+'_Crown',true);
  if(woodGeometry&&crownGeometry){
    const wood=new T.Mesh(woodGeometry,new T.MeshStandardMaterial({vertexColors:true,roughness:.92,metalness:.035})),leaf=new T.MeshStandardMaterial({vertexColors:true,roughness:.88,metalness:.01}),wind={value:0},time={value:0};wood.name='Astra_TreeLivingTrunk';wood.material.userData.surface=leaf.userData.surface='natural';wood.castShadow=wood.receiveShadow=true;root.add(wood);
    leaf.onBeforeCompile=shader=>{shader.uniforms.astraWind=wind;shader.uniforms.astraTime=time;shader.vertexShader='uniform float astraWind;uniform float astraTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z+=sin(astraTime*.7+position.x*.8+position.z)*astraWind*clamp(position.y/11.0,0.0,1.0);')};leaf.customProgramCacheKey=()=> 'blender-direct-canopy-v1';
    const crown=new T.InstancedMesh(crownGeometry,leaf,1);crown.name='Astra_TreeLayeredCanopy';crown.setMatrixAt(0,new T.Matrix4());crown.castShadow=crown.receiveShadow=true;crown.computeBoundingSphere();if(crown.boundingSphere)crown.boundingSphere.radius+=.2;root.add(crown);root.userData.authoredKit=true;
    return {root,crown,trunks,kind,update:(elapsed:number,reduced:boolean)=>{time.value=reduced?0:elapsed;wind.value=reduced?0:.1}};
  }
  woodGeometry?.dispose();crownGeometry?.dispose();
  const bark=new T.MeshStandardMaterial({color:'#544d40',roughness:.92,metalness:.035});
  bark.userData.surface='natural';
  const brass=new T.MeshStandardMaterial({color:astraPalette.brass,roughness:.43,metalness:.65});
  const trunk=new T.Mesh(taperedBranch([new T.Vector3(0,-.2,0),new T.Vector3(.35,2.2,.15),new T.Vector3(-.25,4.5,0),new T.Vector3(.2,7,.2)],banyan?.74:.39,segments,sides),bark);
  trunk.name='Astra_TreeLivingTrunk';trunk.castShadow=trunk.receiveShadow=true;root.add(trunk);
  const collar=new T.Mesh(new T.TorusGeometry(banyan?.83:.48,.035,5,detail==='full'?32:12).rotateX(Math.PI/2),brass);collar.position.y=.55;root.add(collar);
  const leafGeometry=new T.BufferGeometry();
  leafGeometry.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-.3,.3,.025,-.34,.65,0,0,1.12,.03,.34,.65,0,.3,.3,.025,0,.5,.13],3));
  leafGeometry.setIndex([0,1,6,1,2,6,2,3,6,3,4,6,4,5,6,5,0,6]);leafGeometry.computeVertexNormals();
  const leafMaterial=new T.MeshStandardMaterial({color:'#ffffff',roughness:.73,metalness:.02,side:T.DoubleSide});
  leafMaterial.userData.surface='natural';
  const wind={value:0},time={value:0};
  leafMaterial.onBeforeCompile=shader=>{
    shader.uniforms.astraWind=wind;shader.uniforms.astraTime=time;
    shader.vertexShader='uniform float astraWind;uniform float astraTime;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      transformed.z+=sin(astraTime*.7+instanceMatrix[3].x*.8+instanceMatrix[3].z)*astraWind*position.y*position.y;`);
  };
  leafMaterial.customProgramCacheKey=()=> 'astra-canopy-v1';
  const crown=new T.InstancedMesh(leafGeometry,leafMaterial,tips.length*leavesPerBranch);crown.name='Astra_TreeLayeredCanopy';crown.castShadow=crown.receiveShadow=true;root.add(crown);
  const dummy=new T.Object3D(),leafColor=new T.Color(),dark=new T.Color(astraPalette.leaf),light=new T.Color(astraPalette.leafLight);
  tips.forEach(([x,y,z],branchIndex)=>{
    const start=new T.Vector3(-.12,3.4+branchIndex%3*.5,.12),end=new T.Vector3(x,y,z);
    const branch=new T.Mesh(taperedBranch([start,new T.Vector3(x*.32,y*.74,z*.25),new T.Vector3(x*.7,y-.45,z*.8),end],banyan?.27:.17,segments,sides),bark);branch.name='Astra_TreeBough';branch.castShadow=true;root.add(branch);
    for(let leaf=0;leaf<leavesPerBranch;leaf++){
      const angle=leaf*2.3999632297+branchIndex,spread=Math.sqrt((leaf+.5)/leavesPerBranch),size=(detail==='distant'?1.3:1)*(1.3+(leaf%5)*.16);
      dummy.position.set(x+Math.cos(angle)*spread*2.05,y+Math.sin(leaf*1.7)*.42-spread*.35,z+Math.sin(angle)*spread*1.5);
      dummy.rotation.set(-.8+Math.sin(leaf*2)*.5,Math.sin(angle)*.4,angle);dummy.scale.set(size,size,1);dummy.updateMatrix();crown.setMatrixAt(branchIndex*leavesPerBranch+leaf,dummy.matrix);
      leafColor.copy(dark).lerp(light,.18+((leaf*7+branchIndex*3)%17)/24);crown.setColorAt(branchIndex*leavesPerBranch+leaf,leafColor);
    }
    if(banyan){
      const supportSpread=Math.max(.72,2.25/Math.hypot(x,z)),horizontal=x*supportSpread,depth=z*supportSpread,height=y-.65;
      const prop=new T.Mesh(taperedBranch([new T.Vector3(horizontal,-.35,depth),new T.Vector3(horizontal+.17,1.5,depth-.12),new T.Vector3(horizontal-.12,height*.65,depth+.1),new T.Vector3(horizontal,height,depth)],.22,segments,sides),bark);prop.name='Banyan_RootColumn';prop.castShadow=prop.receiveShadow=true;root.add(prop);
      const buttress=new T.Mesh(taperedBranch([new T.Vector3(horizontal*.22,-.25,depth*.22),new T.Vector3(horizontal*.13,.35,depth*.13),new T.Vector3(0,1.9,0)],.24,detail==='full'?8:4,sides),bark);buttress.name='Banyan_SurfaceRoot';buttress.castShadow=buttress.receiveShadow=true;root.add(buttress);
      if(detail==='full')for(let strand=0;strand<3;strand++){
        const hanging=new T.Mesh(taperedBranch([new T.Vector3(x*.89+strand*.27,y-.18,z*.9),new T.Vector3(x*.89+strand*.27+.12,y-1.6,z*.9+.08),new T.Vector3(x*.89+strand*.27-.1,1.8+strand*.75,z*.9+.2)],.04,8,4),bark);hanging.name='Banyan_HangingRoot';root.add(hanging);
      }
    }
  });
  crown.computeBoundingSphere();if(crown.boundingSphere)crown.boundingSphere.radius+=.2;
  return {root,crown,trunks,kind,update:(elapsed:number,reduced:boolean)=>{time.value=reduced?0:elapsed;wind.value=reduced?0:.1}};
}