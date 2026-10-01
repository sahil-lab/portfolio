import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createArchitectureNeighborhood} from './architecture-neighborhood';
import {architectureMaterials} from './building-craft';
import {createCuteResident} from './cute-resident';
import {createCityLandmarks} from './city-landmarks';
import {motherboardBounds} from './world-config';
import {cityBlockPlan,cityDistrictReserved,nearestCityDistrict} from './city-districts';
import {cityEverydaySites,everydayFootprint} from './everyday-config';
import {createAuthoredDistricts} from './city-district-world';
import {createCanopyAsset,createCanopyGrove,createCanopyMaterials,type CanopyPlacement} from './canopy-grove';
import {createWorkScheduler} from './work-scheduler';
import {cacheStaticTransforms} from './static-transforms';
import {createVisibleGeometry,type VisibleGeometryPart,type GeometryVisibility} from './visible-geometry';

type Lot={address:string;x:number;z:number;scale:number;variant:number;yaw:number;width:number;depth:number;height:number};
type Skin={geometry:T.BufferGeometry;material:T.Material};
function bakeModel(root:T.Object3D):Skin[]{
  root.updateMatrixWorld(true);const groups=new Map<T.Material,T.BufferGeometry[]>(),originals=new Set<T.BufferGeometry>();
  root.traverse(object=>{
    if(!(object instanceof T.Mesh)||Array.isArray(object.material))return;
    const geometry=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();geometry.applyMatrix4(object.matrixWorld);
    const list=groups.get(object.material)??[];list.push(geometry);groups.set(object.material,list);originals.add(object.geometry);
  });
  const skins=[...groups].map(([material,geometries])=>{const geometry=mergeGeometries(geometries)!;geometries.forEach(part=>part.dispose());return {geometry,material}});
  originals.forEach(geometry=>geometry.dispose());return skins;
}

export function createCityExpansion(parent:T.Object3D,prepare?:(root:T.Object3D)=>Promise<void>){
  const root=new T.Group();root.name='Motherboard_LivingCity';parent.add(root);
  const authored=createAuthoredDistricts(root);
  const quarter=createCityLandmarks(root),colors=['#f0a18d','#8bc9b0','#89badb','#eccb7c','#dca8ad','#b9d9d3'],heights=[5.6,7.2,8.4,6.5,4.8,7.6];
  const pearl=new T.MeshStandardMaterial({color:'#f3f1e4',roughness:.57});
  const lawn=new T.MeshStandardMaterial({color:'#a0c78a',roughness:1});lawn.userData.surface='natural';
  const pavement=new T.MeshStandardMaterial({color:'#a3b3a7',roughness:.89}),asphalt=new T.MeshStandardMaterial({color:'#46595b',roughness:.92}),inlay=new T.MeshStandardMaterial({color:'#dec99e',roughness:.68});
  pavement.userData.cityPaving=asphalt.userData.cityPaving=true;
  const cube=new T.BoxGeometry(1,1,1),treeShapes={full:createCanopyAsset('tree','full'),distant:createCanopyAsset('tree','distant')},treeMaterials=createCanopyMaterials();
  const dummy=new T.Object3D(),lots:Lot[]=[],cells=new Map<string,Lot[]>(),neighborhoods:T.LOD[]=[],cameraBounds:T.Box3[]=[];
  const streetTrees:{x:number;z:number;height:number}[]=[],treeCells=new Map<string,typeof streetTrees>();
  const architecture:{town:ReturnType<typeof createArchitectureNeighborhood>;x:number;z:number}[]=[];
  const scheduler=createWorkScheduler();
  const sharedFinishes={materials:architectureMaterials('atelier'),paints:new Map<string,T.MeshStandardMaterial>()};
  const farRegions=new Map<string,{root:T.Group;blocks:{lod:T.LOD;far:T.Group;town:ReturnType<typeof createArchitectureNeighborhood>;state:GeometryVisibility}[];consolidated:boolean}>(),silhouettes:VisibleGeometryPart[]=[];
  const cellKey=(x:number,z:number)=>Math.floor((x+500)/100)+','+Math.floor((z+1171)/100);
  function instances(group:T.Object3D,name:string,geometry:T.BufferGeometry,material:T.Material,placements:{x:number;y:number;z:number;sx?:number;sy?:number;sz?:number;yaw?:number;color?:string}[],shadows=false){
    const mesh=new T.InstancedMesh(geometry,material,placements.length);mesh.name=name;
    placements.forEach((placement,index)=>{dummy.position.set(placement.x,placement.y,placement.z);dummy.rotation.set(0,placement.yaw??0,0);dummy.scale.set(placement.sx??1,placement.sy??1,placement.sz??1);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);if(placement.color)mesh.setColorAt(index,new T.Color(placement.color))});
    mesh.castShadow=shadows;mesh.receiveShadow=true;mesh.computeBoundingSphere();mesh.updateMatrix();mesh.matrixAutoUpdate=false;group.add(mesh);return mesh;
  }
  const roadSites:{x:number;y:number;z:number;sx:number;sy:number;sz:number}[]=[],curbs:typeof roadSites=[],dashes:typeof roadSites=[];
  for(let column=0;column<=10;column++){
    const x=-500+column*100;
    for(const [north,south] of x===0?[[-1171,-63],[222,1329]]:[[-1171,1329]]){
      roadSites.push({x,y:-.055,z:(north+south)/2,sx:11,sy:.12,sz:south-north});
      for(const side of [-1,1])curbs.push({x:x+side*5.8,y:.01,z:(north+south)/2,sx:.3,sy:.2,sz:south-north});
      for(let z=north+8;z<south-8;z+=18)dashes.push({x,y:.014,z,sx:.17,sy:.016,sz:5});
    }
  }
  for(let row=0;row<=25;row++){
    const z=-1171+row*100;
    for(const [west,east] of z>-63&&z<222?[[-525,-64],[72,525]]:[[-525,525]]){
      roadSites.push({x:(west+east)/2,y:-.05,z,sx:east-west,sy:.13,sz:11});
      for(const side of [-1,1])curbs.push({x:(west+east)/2,y:.01,z:z+side*5.8,sx:east-west,sy:.2,sz:.3});
      for(let x=west+8;x<east-8;x+=18)dashes.push({x,y:.018,z,sx:5,sy:.016,sz:.17});
    }
  }
  instances(root,'City_ConnectedStreets',cube,asphalt,roadSites);instances(root,'City_ContinuousCurbs',cube,pearl,curbs);instances(root,'City_LaneMarkings',cube,inlay,dashes);
  const pedestrians:{x:number;z:number;phase:number;variant:number}[]=[];
  for(let column=0;column<10;column++)for(let row=0;row<25;row++){
    const centerX=-450+column*100,centerZ=-1121+row*100;
    if(Math.abs(centerX)<60&&centerZ>-65&&centerZ<222||centerX===150&&centerZ>28&&centerZ<230||cityDistrictReserved(centerX,centerZ))continue;
    const lod=new T.LOD();lod.name='City_Neighborhood_'+column+'_'+row;lod.position.set(centerX,0,centerZ);lod.updateMatrix();lod.matrixAutoUpdate=false;root.add(lod);neighborhoods.push(lod);
    const near=new T.Group(),middle=new T.Group(),far=new T.Group();lod.addLevel(near,0);lod.addLevel(middle,250);lod.addLevel(far,720);
    const localLots:Lot[]=[];
    for(const {variant,scale,x,z,yaw} of cityBlockPlan(column,row)){
      const sideways=Math.abs(Math.sin(yaw))>.5;
      const lot={address:`motherboard/block-${column}-${row}/lot-${x}-${z}`,x:centerX+x,z:centerZ+z,scale,variant,yaw,width:(sideways?4.2:4.6)*scale,depth:(sideways?4.6:4.2)*scale,height:heights[variant]*scale+3};lots.push(lot);localLots.push(lot);
      cameraBounds.push(new T.Box3(new T.Vector3(lot.x-lot.width/2,0,lot.z-lot.depth/2),new T.Vector3(lot.x+lot.width/2,lot.height,lot.z+lot.depth/2)));
    }
    const town=createArchitectureNeighborhood(near,'atelier',localLots.map(lot=>({address:lot.address,position:new T.Vector3(lot.x-centerX,.12,lot.z-centerZ),rotation:new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),lot.yaw),width:4.6,depth:4.2,height:heights[lot.variant],scale:lot.scale,accent:colors[lot.variant]})),105,sharedFinishes,{scheduler,prepare});
    architecture.push({town,x:centerX,z:centerZ});
    const regionKey=Math.floor(centerX/300)+','+Math.floor(centerZ/300);let region=farRegions.get(regionKey);
    if(!region){region={root:new T.Group(),blocks:[],consolidated:false};region.root.name='City_RegionalSkyline_'+regionKey;region.root.visible=false;root.add(region.root);farRegions.set(regionKey,region)}
    const state={visible:true,castShadow:true};region.blocks.push({lod,far,town,state});
    for(const source of town.shells.children){const mesh=source as T.Mesh;silhouettes.push({geometry:mesh.geometry,material:mesh.material as T.Material,matrix:new T.Matrix4().makeTranslation(centerX,0,centerZ),state})}
    cells.set(cellKey(centerX,centerZ),localLots);
    const trees=[-1,1].flatMap(side=>[-1,1].map(end=>({x:side*35,y:.05,z:end*35,sx:.39+(row%3)*.025,sy:.51+(column%3)*.035,sz:.39+(row%3)*.025,yaw:(row+column+side)*.71})));
    const trunks=trees.map(tree=>({x:centerX+tree.x,z:centerZ+tree.z,height:tree.sy*7}));streetTrees.push(...trunks);treeCells.set(cellKey(centerX,centerZ),trunks);
    for(const group of [near,middle]){
      instances(group,'City_BlockWalk',cube,pavement,[{x:0,y:-.1,z:0,sx:85,sy:.18,sz:85}]);
      instances(group,'City_PocketGarden',cube,lawn,[{x:0,y:.02,z:0,sx:13,sy:.06,sz:66},{x:0,y:.021,z:0,sx:66,sy:.06,sz:13}]);
      const shapes=group===near?treeShapes.full:treeShapes.distant;
      instances(group,'City_LayeredLeafCanopies',shapes.crown,treeMaterials.leaf,trees,group===near);
      instances(group,'City_BranchingStreetTrunks',shapes.wood,treeMaterials.wood,trees,group===near);
    }
    for(const side of [-1,1])pedestrians.push({x:centerX+side*35,z:centerZ,phase:(row+column)*.71+side,variant:(row+column+(side>0?1:0))%3});
    cacheStaticTransforms(middle);cacheStaticTransforms(far);
  }
  const banyanAssets=new Map<string,ReturnType<typeof createCanopyAsset>>();for(const detail of ['full','distant'] as const)banyanAssets.set('banyan/'+detail,createCanopyAsset('banyan',detail));
  const banyanScale=1.45,banyanRadius=Math.max(...[...banyanAssets.values()].map(asset=>asset.radius))*banyanScale;
  const banyanRecords:CanopyPlacement[]=[[-150,279],[350,379],[-250,-121],[350,779]].filter(([x,z])=>architecture.some(block=>block.x===x&&block.z===z)&&lots.every(lot=>Math.hypot(Math.max(0,Math.abs(lot.x-x)-lot.width/2),Math.max(0,Math.abs(lot.z-z)-lot.depth/2))>banyanRadius+.5)&&cityEverydaySites.every(site=>{const footprint=everydayFootprint(site.kind);return Math.hypot(Math.max(0,Math.abs(site.x-x)-footprint.width/2),Math.max(0,Math.abs(site.z-z)-footprint.depth/2))>banyanRadius+.5})).map(([x,z],index)=>({id:'motherboard/banyan-'+index,kind:'banyan',position:new T.Vector3(x,.04,z),rotation:new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),index*.9),scale:banyanScale,stretch:1.1,patch:x+','+z}));
  const banyanGroves=createCanopyGrove(banyanRecords,undefined,banyanAssets);banyanGroves.root.name='City_BanyanCourtyards';root.add(banyanGroves.root);
  root.userData.staticCameraBounds=cameraBounds;
  const roofscape=createVisibleGeometry(root,silhouettes);for(const part of silhouettes)part.geometry.dispose();silhouettes.length=0;
  for(const {town} of architecture)town.shells.clear();
  const populationSkins=colors.slice(0,3).map((color,index)=>bakeModel(createCuteResident(color,index).root));
  const crowds=populationSkins.map((skins,index)=>skins.map(skin=>{const mesh=new T.InstancedMesh(skin.geometry,skin.material,24);mesh.name='City_StrollingResidents_'+index;mesh.count=0;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=true;root.add(mesh);return mesh}));
  let clock=0;const architectureObserver=new T.Vector3(),cameraPosition=new T.Vector3(),blockPosition=new T.Vector3();
  function update(dt:number,reduced:boolean,player:T.Group,active:boolean,camera?:T.Camera){
    banyanGroves.update(dt,reduced,player.position,active);treeMaterials.update(clock,reduced||!active);
    for(const {town,x,z} of architecture)town.update(architectureObserver.set(player.position.x-x,player.position.y,player.position.z-z),active);
    root.updateWorldMatrix(true,false);
    if(camera)camera.getWorldPosition(cameraPosition);else player.getWorldPosition(cameraPosition);
    for(const region of farRegions.values()){
      const consolidated=active&&region.blocks.every(({lod})=>blockPosition.copy(lod.position).applyMatrix4(root.matrixWorld).distanceToSquared(cameraPosition)>760*760);
      if(consolidated!==region.consolidated){
        region.consolidated=consolidated;region.root.visible=consolidated;
        for(const {lod,far} of region.blocks){lod.visible=!consolidated;for(const mesh of far.children)mesh.visible=!consolidated}
      }
      for(const {lod,town,state} of region.blocks){
        const distance=blockPosition.copy(lod.position).applyMatrix4(root.matrixWorld).distanceToSquared(cameraPosition);
        state.visible=!(town.detailed&&distance<250*250);state.castShadow=distance<720*720;
      }
    }
    root.visible=active;if(!active)return;quarter.update(dt,reduced,player);authored.update(dt,reduced,player,active);if(!reduced)clock+=dt;
    const counts=[0,0,0];
    for(const person of pedestrians){
      if(Math.hypot(person.x-player.position.x,person.z-player.position.z)>82||counts[person.variant]>=24)continue;
      dummy.position.set(person.x,.1,person.z+Math.sin(clock*.1+person.phase)*25);dummy.rotation.set(0,Math.cos(clock*.1+person.phase)>0?0:Math.PI,0);dummy.scale.setScalar(1.15);dummy.updateMatrix();
      for(const mesh of crowds[person.variant])mesh.setMatrixAt(counts[person.variant],dummy.matrix);counts[person.variant]++;
    }
    crowds.forEach((group,index)=>group.forEach(mesh=>{mesh.count=counts[index];mesh.instanceMatrix.needsUpdate=true}));
  }
  function blocked(x:number,z:number,y:number){
    if(authored.blocked(x,z,y))return true;
    if(quarter.blocked(x,z,y))return true;
    if(banyanGroves.blocked(blockPosition.set(x,y,z))||(treeCells.get(cellKey(x,z))??[]).some(tree=>y<tree.height&&y>-.2&&Math.hypot(x-tree.x,z-tree.z)<.65))return true;
    return (cells.get(cellKey(x,z))??[]).some(lot=>y<lot.height&&Math.abs(x-lot.x)<lot.width/2+.55&&Math.abs(z-lot.z)<lot.depth/2+.55);
  }
  return {root,lots,neighborhoods,architecture,farRegions,roofscape,quarter,authored,streetTrees,banyanGroves,update,blocked,streaming:()=>({loaded:architecture.filter(({town})=>town.detailed).length,loading:architecture.filter(({town})=>town.loading).length,pending:scheduler.pending,total:architecture.length}),dispose:()=>{scheduler.dispose();architecture.forEach(({town})=>town.dispose())},bounds:motherboardBounds,districtAt:nearestCityDistrict,height:authored.height,lowerLevelAt:authored.lowerLevelAt,prompt:authored.prompt,interact:authored.interact};
}
