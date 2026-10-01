import * as T from 'three';

type ArcadeMaterials={structure:T.Material;trim:T.Material};

export function createLanternArcade(parent:T.Object3D,materials:ArcadeMaterials){
  const root=new T.Group();root.name='Lantern_Arcade';parent.add(root);
  const solids:{x:number;z:number;width:number;depth:number;height:number}[]=[];
  const shell=new T.MeshPhysicalMaterial({color:'#98b9ba',roughness:.28,metalness:.08,transparent:true,opacity:.16,depthWrite:false,side:T.DoubleSide});
  const opal=new T.MeshStandardMaterial({color:'#f7e6bd',emissive:'#ffd195',emissiveIntensity:.2,roughness:.72});opal.userData.surface='light';opal.userData.nightIllumination=2.4;
  function mesh(name:string,geometry:T.BufferGeometry,material:T.Material,position:T.Vector3,shadow=true){
    const object=new T.Mesh(geometry,material);object.name=name;object.position.copy(position);object.castShadow=shadow;object.receiveShadow=shadow;root.add(object);return object;
  }
  const archHeight=(horizontal:number)=>5.8+3.3*Math.cos(horizontal/11*Math.PI/2);
  const archPoints=Array.from({length:25},(_,index)=>{const horizontal=-11+index*22/24;return new T.Vector3(horizontal,archHeight(horizontal),0)});
  const archGeometry=new T.TubeGeometry(new T.CatmullRomCurve3(archPoints),48,.13,6,false);
  const columnGeometry=new T.CylinderGeometry(.13,.2,5.8,12),footGeometry=new T.CylinderGeometry(.34,.42,.3,12);
  for(const forward of [-1,10.6]){
    mesh('Arcade_SweptRib',archGeometry,materials.trim,new T.Vector3(0,0,forward));
    for(const horizontal of [-11,11]){
      mesh('Arcade_Column',columnGeometry,materials.structure,new T.Vector3(horizontal,2.9,forward));
      mesh('Arcade_ColumnFoot',footGeometry,materials.trim,new T.Vector3(horizontal,.15,forward));
      solids.push({x:horizontal,z:forward,width:.85,depth:.85,height:5.9});
    }
  }
  const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
  for(let row=0;row<2;row++)for(let column=0;column<=24;column++){
    const horizontal=-10.9+column*21.8/24;positions.push(horizontal,archHeight(horizontal)+.045,row?10.55:-.95);uvs.push(column/24,row);
  }
  for(let column=0;column<24;column++){const next=column+1,back=column+25;indices.push(column,back,next,next,back,back+1)}
  const canopy=new T.BufferGeometry();canopy.setAttribute('position',new T.Float32BufferAttribute(positions,3));canopy.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));canopy.setIndex(indices);canopy.computeVertexNormals();
  mesh('Arcade_TranslucentCanopy',canopy,shell,new T.Vector3(),false);
  for(const horizontal of [-8,-4,0,4,8])mesh('Arcade_LongitudinalRail',new T.CylinderGeometry(.035,.035,11.6,8).rotateX(Math.PI/2),materials.trim,new T.Vector3(horizontal,archHeight(horizontal),4.8));
  const profile=[[0,-.47],[.18,-.45],[.31,-.25],[.34,0],[.31,.25],[.18,.45],[0,.47]].map(([radius,height])=>new T.Vector2(radius,height));
  const lanternGeometry=new T.LatheGeometry(profile,12),capGeometry=new T.CylinderGeometry(.18,.21,.07,12),cordGeometry=new T.CylinderGeometry(.014,.014,1,6);
  const lanterns=new T.InstancedMesh(lanternGeometry,opal,15),caps=new T.InstancedMesh(capGeometry,materials.trim,30),cords=new T.InstancedMesh(cordGeometry,materials.structure,15),pose=new T.Object3D();
  lanterns.name='Arcade_OpalLanterns';caps.name='Arcade_LanternCaps';cords.name='Arcade_SuspensionCords';let index=0;
  for(const forward of [.8,4.8,8.8])for(const horizontal of [-6,-3,0,3,6]){
    const top=archHeight(horizontal)-.06,drop=1.1+((index*7)%3)*.21,center=top-drop-.48;
    pose.position.set(horizontal,center,forward);pose.scale.set(1,1,1);pose.updateMatrix();lanterns.setMatrixAt(index,pose.matrix);
    for(const side of [-1,1]){pose.position.y=center+side*.45;pose.updateMatrix();caps.setMatrixAt(index*2+(side>0?1:0),pose.matrix)}
    pose.position.y=top-drop/2;pose.scale.set(1,drop,1);pose.updateMatrix();cords.setMatrixAt(index,pose.matrix);index++;
  }
  for(const object of [lanterns,caps,cords]){object.computeBoundingSphere();object.castShadow=object.receiveShadow=true;root.add(object)}
  const size=32,data=new Uint8Array(size*size*4);
  for(let row=0;row<size;row++)for(let column=0;column<size;column++){const radius=Math.hypot((column+.5)/size*2-1,(row+.5)/size*2-1),offset=(row*size+column)*4;data[offset]=data[offset+1]=data[offset+2]=255;data[offset+3]=Math.round(Math.pow(Math.max(0,1-radius),2)*255)}
  const texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.name='Arcade_LightPool';texture.magFilter=texture.minFilter=T.LinearFilter;texture.needsUpdate=true;
  const poolMaterial=new T.MeshBasicMaterial({color:'#ffd194',map:texture,transparent:true,opacity:.035,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});
  const pools=new T.InstancedMesh(new T.PlaneGeometry(5.2,4).rotateX(-Math.PI/2),poolMaterial,6);pools.name='Arcade_LightPools';index=0;
  for(const forward of [.8,4.8,8.8])for(const horizontal of [-3,3]){pose.position.set(horizontal,.062,forward);pose.scale.set(1,1,1);pose.updateMatrix();pools.setMatrixAt(index++,pose.matrix)}pools.computeBoundingSphere();root.add(pools);
  return {root,solids,opal,pools,update:()=>{poolMaterial.opacity=T.MathUtils.lerp(.035,.3,T.MathUtils.smoothstep(opal.emissiveIntensity,.2,2.4))}};
}
