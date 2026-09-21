import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {cityBlock,createCityBuilding} from './city-architecture';
import {createCuteResident} from './cute-resident';
import {createCityLandmarks} from './city-landmarks';
import {motherboardBounds} from './world-config';
import {cityBlockPlan,cityDistrictReserved,nearestCityDistrict} from './city-districts';
import {createAuthoredDistricts} from './city-district-world';

type Lot={x:number;z:number;scale:number;variant:number;yaw:number;width:number;depth:number;height:number};
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

export function createCityExpansion(parent:T.Object3D){
  const root=new T.Group();root.name='Motherboard_LivingCity';parent.add(root);
  const authored=createAuthoredDistricts(root);
  const quarter=createCityLandmarks(root),colors=['#f0a18d','#8bc9b0','#89badb','#eccb7c','#dca8ad','#b9d9d3'],heights=[5.6,7.2,8.4,6.5,4.8,7.6];
  const templates=colors.map((accent,index)=>bakeModel(createCityBuilding({width:4.6,height:heights[index],depth:4.2,accent}).root));
  const paint=new T.MeshPhysicalMaterial({color:'#ffffff',roughness:.43,clearcoat:.3}),pearl=new T.MeshStandardMaterial({color:'#f3f1e4',roughness:.57}),glass=new T.MeshPhysicalMaterial({color:'#5bafc7',roughness:.22,clearcoat:.6});
  const lawn=new T.MeshStandardMaterial({color:'#a0c78a',roughness:1}),leaf=new T.MeshStandardMaterial({color:'#87ba8e',roughness:.8}),bark=new T.MeshStandardMaterial({color:'#b7a47b',roughness:.86});lawn.userData.surface=leaf.userData.surface='natural';
  const pavement=new T.MeshStandardMaterial({color:'#a3b3a7',roughness:.89}),asphalt=new T.MeshStandardMaterial({color:'#46595b',roughness:.92}),inlay=new T.MeshStandardMaterial({color:'#dec99e',roughness:.68});
  const cube=new T.BoxGeometry(1,1,1),shell=cityBlock(4.6,1,4.2,.18),roof=cityBlock(5,.18,4.6,.07),windowGeometry=new T.BoxGeometry(3.7,1,.04),treeGeometry=new T.SphereGeometry(1,10,7),trunkGeometry=new T.CylinderGeometry(.25,.4,3.2,6);
  const dummy=new T.Object3D(),lots:Lot[]=[],cells=new Map<string,Lot[]>(),neighborhoods:T.LOD[]=[],cameraBounds:T.Box3[]=[];
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
      const lot={x:centerX+x,z:centerZ+z,scale,variant,yaw,width:(sideways?4.2:4.6)*scale,depth:(sideways?4.6:4.2)*scale,height:heights[variant]*scale+3};lots.push(lot);localLots.push(lot);
      cameraBounds.push(new T.Box3(new T.Vector3(lot.x-lot.width/2,0,lot.z-lot.depth/2),new T.Vector3(lot.x+lot.width/2,lot.height,lot.z+lot.depth/2)));
    }
    for(let variant=0;variant<templates.length;variant++){
      const placements=localLots.filter(lot=>lot.variant===variant).map(lot=>({x:lot.x-centerX,y:.12,z:lot.z-centerZ,sx:lot.scale,sy:lot.scale,sz:lot.scale,yaw:lot.yaw}));
      if(placements.length)for(const skin of templates[variant])instances(near,'City_FullFacade',skin.geometry,skin.material,placements,true);
    }
    cells.set(cellKey(centerX,centerZ),localLots);
    const bodies=localLots.map(lot=>({x:lot.x-centerX,y:.25+heights[lot.variant]*lot.scale/2,z:lot.z-centerZ,sx:lot.scale,sy:heights[lot.variant]*lot.scale,sz:lot.scale,yaw:lot.yaw,color:colors[lot.variant]}));
    instances(middle,'City_MidriseShells',shell,paint,bodies,true);instances(far,'City_DistantRoofscape',shell,paint,bodies);
    instances(middle,'City_RooftopCornices',roof,pearl,localLots.map(lot=>({x:lot.x-centerX,y:heights[lot.variant]*lot.scale+.55,z:lot.z-centerZ,sx:lot.scale,sy:lot.scale,sz:lot.scale})));
    const windows=localLots.flatMap(lot=>[.29,.72].map(level=>({x:lot.x-centerX+Math.sin(lot.yaw)*2.13*lot.scale,y:heights[lot.variant]*lot.scale*level,z:lot.z-centerZ+Math.cos(lot.yaw)*2.13*lot.scale,sx:lot.scale,sy:1.4*lot.scale,sz:1,yaw:lot.yaw})));
    instances(middle,'City_PanoramaWindows',windowGeometry,glass,windows);
    for(const group of [near,middle]){
      instances(group,'City_BlockWalk',cube,pavement,[{x:0,y:-.1,z:0,sx:85,sy:.18,sz:85}]);
      instances(group,'City_PocketGarden',cube,lawn,[{x:0,y:.02,z:0,sx:13,sy:.06,sz:66},{x:0,y:.021,z:0,sx:66,sy:.06,sz:13}]);
      const trees=[-1,1].flatMap(side=>[-1,1].map(end=>({x:side*35,y:4.8,z:end*35,sx:2.5,sy:3.2,sz:2.5})));
      instances(group,'City_RoundedStreetTrees',treeGeometry,leaf,trees,true);
      instances(group,'City_TreeTrunks',trunkGeometry,bark,trees.map(tree=>({...tree,y:1.7,sx:1,sy:1,sz:1})));
    }
    for(const side of [-1,1])pedestrians.push({x:centerX+side*35,z:centerZ,phase:(row+column)*.71+side,variant:(row+column+(side>0?1:0))%3});
  }
  root.userData.staticCameraBounds=cameraBounds;
  const populationSkins=colors.slice(0,3).map((color,index)=>bakeModel(createCuteResident(color,index).root));
  const crowds=populationSkins.map((skins,index)=>skins.map(skin=>{const mesh=new T.InstancedMesh(skin.geometry,skin.material,24);mesh.name='City_StrollingResidents_'+index;mesh.count=0;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.castShadow=true;root.add(mesh);return mesh}));
  let clock=0;
  function update(dt:number,reduced:boolean,player:T.Group,active:boolean){
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
    return (cells.get(cellKey(x,z))??[]).some(lot=>y<lot.height&&Math.abs(x-lot.x)<lot.width/2+.55&&Math.abs(z-lot.z)<lot.depth/2+.55);
  }
  return {root,lots,neighborhoods,quarter,authored,update,blocked,bounds:motherboardBounds,districtAt:nearestCityDistrict,height:authored.height,lowerLevelAt:authored.lowerLevelAt,prompt:authored.prompt,interact:authored.interact};
}
