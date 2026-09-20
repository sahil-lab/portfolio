import * as T from 'three';
import {astraPalette} from './astra-lighting';

const branchTips=[
  [-4.8,6.4,1.2],[-3.5,8.2,-1.6],[-1.5,9.5,.4],
  [2,8.8,-1.9],[4.4,7.8,.6],[3.3,6.1,2.4],[.2,7.6,3],
];

function taperedBranch(points:T.Vector3[],radius:number){
  const curve=new T.CatmullRomCurve3(points),geometry=new T.TubeGeometry(curve,18,radius,7,false);
  const positions=geometry.getAttribute('position'),center=new T.Vector3(),vertex=new T.Vector3();
  for(let ring=0;ring<=18;ring++){
    curve.getPointAt(ring/18,center);const taper=1-ring/18*.8;
    for(let side=0;side<=7;side++){
      const index=ring*8+side;vertex.fromBufferAttribute(positions,index).sub(center).multiplyScalar(taper).add(center);positions.setXYZ(index,vertex.x,vertex.y,vertex.z);
    }
  }
  geometry.computeVertexNormals();return geometry;
}

export function createAstraCanopy(name:string,scale=1){
  const root=new T.Group();root.name=name;root.scale.setScalar(scale);
  const bark=new T.MeshStandardMaterial({color:'#605c48',roughness:.8,metalness:.18});
  const brass=new T.MeshStandardMaterial({color:astraPalette.brass,roughness:.43,metalness:.65});
  const trunk=new T.Mesh(taperedBranch([new T.Vector3(),new T.Vector3(.35,2.2,.15),new T.Vector3(-.25,4.5,0),new T.Vector3(.2,7,.2)],.39),bark);
  trunk.name='Astra_TreeLivingTrunk';trunk.castShadow=trunk.receiveShadow=true;root.add(trunk);
  const collar=new T.Mesh(new T.TorusGeometry(.48,.035,5,32).rotateX(Math.PI/2),brass);collar.position.y=.55;root.add(collar);
  const leafGeometry=new T.BufferGeometry();
  leafGeometry.setAttribute('position',new T.Float32BufferAttribute([0,0,0,-.3,.3,.025,-.34,.65,0,0,1.12,.03,.34,.65,0,.3,.3,.025,0,.5,.13],3));
  leafGeometry.setIndex([0,1,6,1,2,6,2,3,6,3,4,6,4,5,6,5,0,6]);leafGeometry.computeVertexNormals();
  const leafMaterial=new T.MeshStandardMaterial({color:'#ffffff',roughness:.73,metalness:.02,side:T.DoubleSide});
  const wind={value:0},time={value:0};
  leafMaterial.onBeforeCompile=shader=>{
    shader.uniforms.astraWind=wind;shader.uniforms.astraTime=time;
    shader.vertexShader='uniform float astraWind;uniform float astraTime;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      transformed.z+=sin(astraTime*.7+instanceMatrix[3].x*.8+instanceMatrix[3].z)*astraWind*position.y*position.y;`);
  };
  leafMaterial.customProgramCacheKey=()=> 'astra-canopy-v1';
  const crown=new T.InstancedMesh(leafGeometry,leafMaterial,branchTips.length*42);crown.name='Astra_TreeLayeredCanopy';crown.castShadow=crown.receiveShadow=true;root.add(crown);
  const dummy=new T.Object3D(),leafColor=new T.Color(),dark=new T.Color(astraPalette.leaf),light=new T.Color(astraPalette.leafLight);
  branchTips.forEach(([x,y,z],branchIndex)=>{
    const start=new T.Vector3(-.12,3.4+branchIndex%3*.5,.12),end=new T.Vector3(x,y,z);
    const branch=new T.Mesh(taperedBranch([start,new T.Vector3(x*.32,y*.74,z*.25),new T.Vector3(x*.7,y-.45,z*.8),end],.17),bark);branch.castShadow=true;root.add(branch);
    for(let leaf=0;leaf<42;leaf++){
      const angle=leaf*2.3999632297+branchIndex,spread=Math.sqrt((leaf+.5)/42),size=1.3+(leaf%5)*.16;
      dummy.position.set(x+Math.cos(angle)*spread*2.05,y+Math.sin(leaf*1.7)*.42-spread*.35,z+Math.sin(angle)*spread*1.5);
      dummy.rotation.set(-.8+Math.sin(leaf*2)*.5,Math.sin(angle)*.4,angle);dummy.scale.set(size,size,1);dummy.updateMatrix();crown.setMatrixAt(branchIndex*42+leaf,dummy.matrix);
      leafColor.copy(dark).lerp(light,.18+((leaf*7+branchIndex*3)%17)/24);crown.setColorAt(branchIndex*42+leaf,leafColor);
    }
  });
  crown.computeBoundingSphere();if(crown.boundingSphere)crown.boundingSphere.radius+=.2;
  return {root,crown,update:(elapsed:number,reduced:boolean)=>{time.value=reduced?0:elapsed;wind.value=reduced?0:.1}};
}