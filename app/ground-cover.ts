import * as T from 'three';

export type GroundCoverPlacement={position:T.Vector3;rotation:T.Quaternion;scale:number;patch:string;flower?:boolean};
export type GroundCoverColors={base:string;tip:string;flower:string};
const meadowColors:GroundCoverColors={base:'#347449',tip:'#8dab54',flower:'#f0d88b'};

function tuftGeometry(blades:number,colors:GroundCoverColors){
 const positions:number[]=[],paints:number[]=[],base=new T.Color(colors.base),tip=new T.Color(colors.tip),color=new T.Color();
 const triangle=(first:T.Vector3,second:T.Vector3,third:T.Vector3)=>{for(const point of [first,second,third]){positions.push(point.x,point.y,point.z);color.copy(base).lerp(tip,T.MathUtils.clamp(point.y/.6,0,1)).toArray(paints,paints.length)}};
 for(let blade=0;blade<blades;blade++){
  const angle=blade*2.3999632297,spread=.1+(blade%3)*.13,height=.3+(blade%4)*.09,side=new T.Vector3(Math.cos(angle),0,Math.sin(angle)),bend=new T.Vector3(-Math.sin(angle),0,Math.cos(angle));
  const foot=bend.clone().multiplyScalar(spread),middle=foot.clone().addScaledVector(bend,.09);middle.y=height*.55;
  const peak=foot.clone().addScaledVector(bend,.2);peak.y=height;
   const width=.025+(blade%3)*.009,left=foot.clone().addScaledVector(side,-width),right=foot.clone().addScaledVector(side,width),upperLeft=middle.clone().addScaledVector(side,-width*.45),upperRight=middle.clone().addScaledVector(side,width*.45);
  triangle(left,right,upperLeft);triangle(right,upperRight,upperLeft);triangle(upperLeft,upperRight,peak);
 }
 for(let leaf=0;leaf<3;leaf++){
   const angle=leaf*Math.PI*2/3,center=new T.Vector3(Math.cos(angle)*.12,.035,Math.sin(angle)*.12),side=new T.Vector3(-Math.sin(angle)*.075,0,Math.cos(angle)*.075),end=new T.Vector3(Math.cos(angle)*.21,.025,Math.sin(angle)*.21),foot=new T.Vector3(0,.018,0);
  triangle(foot,center.clone().add(side),end);triangle(foot,end,center.clone().sub(side));
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(paints,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();if(geometry.boundingSphere)geometry.boundingSphere.radius+=.12;return geometry;
}

function flowerGeometry(colors:GroundCoverColors){
 const geometry=new T.IcosahedronGeometry(.075,0),positions=geometry.attributes.position,paints=new Float32Array(positions.count*3),color=new T.Color(colors.flower);
 geometry.scale(1,.48,1);geometry.translate(.15,.39,0);for(let vertex=0;vertex<positions.count;vertex++)color.toArray(paints,vertex*3);geometry.setAttribute('color',new T.BufferAttribute(paints,3));return geometry;
}

export function createMeadowLawn(cells:T.Vector3[],spacing:number){
 const positions:number[]=[],colors:number[]=[],indices:number[]=[],dark=new T.Color('#437847'),light=new T.Color('#69944f'),color=new T.Color(),half=spacing/2;
 for(const cell of cells){
  const start=positions.length/3;
  for(const [offsetX,offsetZ] of [[-half,-half],[-half,half],[half,half],[half,-half]]){
   const x=cell.x+offsetX,z=cell.z+offsetZ;positions.push(x,cell.y,z);color.copy(dark).lerp(light,.45+.16*Math.sin(x*.17)*Math.cos(z*.19)).toArray(colors,colors.length);
  }
  indices.push(start,start+1,start+2,start,start+2,start+3);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
 const material=new T.MeshStandardMaterial({vertexColors:true,roughness:1});material.userData.surface='natural';const lawn=new T.Mesh(geometry,material);lawn.name='Meadow_Lawn';lawn.receiveShadow=true;return lawn;
}

export function createGroundCover(placements:GroundCoverPlacement[],colors:GroundCoverColors=meadowColors,capacityPerPatch=0){
 const root=new T.Group();root.name='Living_GroundCover';root.userData.groundCover=true;
 const full=tuftGeometry(7,colors),distant=tuftGeometry(2,colors),flowers=flowerGeometry(colors),material=new T.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,side:T.DoubleSide});material.userData.surface='natural';
 const time={value:0},wind={value:0};
 material.onBeforeCompile=shader=>{
  shader.uniforms.meadowTime=time;shader.uniforms.meadowWind=wind;
  shader.vertexShader='uniform float meadowTime;uniform float meadowWind;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 float meadowPhase=0.;
 #ifdef USE_INSTANCING
 meadowPhase=instanceMatrix[3].x*.37+instanceMatrix[3].z*.29;
 #endif
 transformed.x+=sin(meadowTime*1.15+meadowPhase)*meadowWind*position.y*position.y;`);
 };
 material.customProgramCacheKey=()=> 'living-meadow-v1';
 const buckets=new Map<string,GroundCoverPlacement[]>();for(const placement of placements){const bucket=buckets.get(placement.patch);if(bucket)bucket.push(placement);else buckets.set(placement.patch,[placement])}
 const matrix=new T.Matrix4(),size=new T.Vector3(),tint=new T.Color();
 function write(mesh:T.InstancedMesh,records:GroundCoverPlacement[]){
  if(records.length>mesh.instanceMatrix.count)throw new RangeError('Ground cover patch capacity exceeded');mesh.count=records.length;
  records.forEach((record,index)=>{size.setScalar(record.scale);matrix.compose(record.position,record.rotation,size);mesh.setMatrixAt(index,matrix);tint.setScalar(.78+(index*17%23)/100);mesh.setColorAt(index,tint)});
  mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();if(mesh.boundingSphere)mesh.boundingSphere.radius+=.15;
 }
 const patches=[...buckets.entries()].map(([name,records])=>{
  const group=new T.Group();group.name='Meadow_Patch_'+name;root.add(group);
  const center=records.reduce((point,record)=>point.add(record.position),new T.Vector3()).divideScalar(records.length),radius=Math.max(...records.map(record=>record.position.distanceTo(center)))+1;
  function instances(geometry:T.BufferGeometry,selected:GroundCoverPlacement[],name:string){
     const mesh=new T.InstancedMesh(geometry,material,Math.max(capacityPerPatch,selected.length));mesh.name=name;mesh.receiveShadow=true;if(capacityPerPatch)mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
     write(mesh,selected);group.add(mesh);return mesh;
  }
    const near=instances(full,records,'Meadow_Grass'),far=instances(distant,records,'Meadow_LowCover'),bloomRecords=records.filter(record=>record.flower),blooms=bloomRecords.length||capacityPerPatch?instances(flowers,bloomRecords,'Meadow_Wildflowers'):null;
    near.visible=false;return {root:group,near,far,blooms,center,radius,records};
 });
 if(!placements.length){full.dispose();distant.dispose();flowers.dispose();material.dispose()}else if(!capacityPerPatch&&!placements.some(record=>record.flower))flowers.dispose();
 let clock=0;
 return {root,get placements(){return patches.flatMap(patch=>patch.records)},patches,
 replacePatch(index:number,records:GroundCoverPlacement[]){
    const patch=patches[index];patch.records=records;patch.center.set(0,0,0);for(const record of records)patch.center.add(record.position);if(records.length)patch.center.divideScalar(records.length);
    patch.radius=records.length?Math.max(...records.map(record=>record.position.distanceTo(patch.center)))+1:0;
    write(patch.near,records);write(patch.far,records);if(patch.blooms)write(patch.blooms,records.filter(record=>record.flower));
 },
 update(delta:number,reduced:boolean,observer:T.Vector3,active=true){
  root.visible=active;if(!active)return;
  if(!reduced&&Number.isFinite(delta))clock+=T.MathUtils.clamp(delta,0,.1);time.value=clock;wind.value=reduced?0:.2;
    for(const patch of patches){const distance=observer.distanceTo(patch.center),near=distance<patch.radius+(patch.near.visible?65:52);patch.root.visible=patch.records.length>0&&distance<patch.radius+190;patch.near.visible=near;patch.far.visible=!near;if(patch.blooms)patch.blooms.visible=near}
 }};
}

export function createGroundCoverWindow(options:{sample:(x:number,z:number,seed:number,domain:number)=>Omit<GroundCoverPlacement,'patch'>|null;locate?:(observer:T.Vector3)=>{x:number;z:number;domain:number};colors?:GroundCoverColors;spacing?:number;patchSize?:number}){
 const patchSize=options.patchSize??24,rows=Math.ceil(patchSize/(options.spacing??1.3)),step=patchSize/rows,capacity=rows*rows;
 const cover=createGroundCover(Array.from({length:9},(_,index)=>({position:new T.Vector3(),rotation:new T.Quaternion(),scale:0,patch:String(index),flower:true})),options.colors,capacity),keys=Array<string>(9).fill('');
 for(let index=0;index<9;index++)cover.replacePatch(index,[]);cover.root.visible=false;let previous='';
 return {root:cover.root,patches:cover.patches,get placements(){return cover.placements},capacity:capacity*9,
    update(delta:number,reduced:boolean,observer:T.Vector3,active=true){
     if(!active){cover.update(delta,reduced,observer,false);return}
     const location=options.locate?.(observer)??{x:observer.x,z:observer.z,domain:0},column=Math.floor(location.x/patchSize),row=Math.floor(location.z/patchSize),current=location.domain+'/'+column+'/'+row;
     if(current!==previous){
        previous=current;const needed:{key:string;column:number;row:number}[]=[];
        for(let across=-1;across<=1;across++)for(let along=-1;along<=1;along++)needed.push({key:location.domain+'/'+(column+across)+'/'+(row+along),column:column+across,row:row+along});
        const keep=new Set(needed.map(cell=>cell.key)),free=keys.flatMap((key,index)=>keep.has(key)?[]:[index]);
        for(const cell of needed){
         if(keys.includes(cell.key))continue;const slot=free.shift()!,records:GroundCoverPlacement[]=[];keys[slot]=cell.key;
         for(let across=0;across<rows;across++)for(let along=0;along<rows;along++){
            const latticeX=cell.column*rows+across,latticeZ=cell.row*rows+along,seed=(Math.imul(latticeX,73856093)^Math.imul(latticeZ,19349663)^Math.imul(location.domain+1,83492791))>>>0;
            const x=cell.column*patchSize+(across+.5)*step+((seed%101)/100-.5)*step*.45,z=cell.row*patchSize+(along+.5)*step+(((seed>>>8)%101)/100-.5)*step*.45,record=options.sample(x,z,seed,location.domain);
            if(record)records.push({...record,patch:String(slot)});
         }
         cover.replacePatch(slot,records);
        }
     }
     cover.update(delta,reduced,observer,true);
    },
 };
}
