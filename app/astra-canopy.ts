import * as T from 'three';
import {astraPalette} from './astra-lighting';

const branchTips=[
  [-4.8,6.4,1.2],[-3.5,8.2,-1.6],[-1.5,9.5,.4],
  [2,8.8,-1.9],[4.4,7.8,.6],[3.3,6.1,2.4],[.2,7.6,3],
];

export type CanopyKind='tree'|'banyan';
export type CanopyDetail='full'|'distant';

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
  const banyan=kind==='banyan',segments=detail==='full'?18:6,sides=detail==='full'?7:5,leavesPerBranch=detail==='full'?42:12;
  const tips=banyan?[...branchTips.map(([horizontal,height,depth])=>[horizontal*1.48,height*.9+.5,depth*1.7]),[0,7.6,-6],[-3.6,6.8,-4.9],[5.4,7.1,-4.1]]:branchTips;
  const trunks=[{x:0,z:0,radius:banyan?.8:.42,height:7}];
  const bark=new T.MeshStandardMaterial({color:'#605c48',roughness:.8,metalness:.18});
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
      const prop=new T.Mesh(taperedBranch([new T.Vector3(horizontal,-.35,depth),new T.Vector3(horizontal+.17,1.5,depth-.12),new T.Vector3(horizontal-.12,height*.65,depth+.1),new T.Vector3(horizontal,height,depth)],.22,segments,sides),bark);prop.name='Banyan_RootColumn';prop.castShadow=prop.receiveShadow=true;root.add(prop);trunks.push({x:horizontal,z:depth,radius:.26,height});
      const buttress=new T.Mesh(taperedBranch([new T.Vector3(horizontal*.22,-.25,depth*.22),new T.Vector3(horizontal*.13,.35,depth*.13),new T.Vector3(0,1.9,0)],.24,detail==='full'?8:4,sides),bark);buttress.name='Banyan_SurfaceRoot';buttress.castShadow=buttress.receiveShadow=true;root.add(buttress);
      if(detail==='full')for(let strand=0;strand<3;strand++){
        const hanging=new T.Mesh(taperedBranch([new T.Vector3(x*.89+strand*.27,y-.18,z*.9),new T.Vector3(x*.89+strand*.27+.12,y-1.6,z*.9+.08),new T.Vector3(x*.89+strand*.27-.1,1.8+strand*.75,z*.9+.2)],.04,8,4),bark);hanging.name='Banyan_HangingRoot';root.add(hanging);
      }
    }
  });
  crown.computeBoundingSphere();if(crown.boundingSphere)crown.boundingSphere.radius+=.2;
  return {root,crown,trunks,kind,update:(elapsed:number,reduced:boolean)=>{time.value=reduced?0:elapsed;wind.value=reduced?0:.1}};
}