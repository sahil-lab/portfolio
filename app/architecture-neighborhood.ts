import * as T from 'three';
import {architectureMaterials,bakeArchitecture,createCraftedBuilding,type BuildingCraftOptions,type ArchitectureMaterials} from './building-craft';
import {architectureRecipe,type ArchitectureStyle} from './architecture-profiles';

export type BuildingPlacement={address:string;position:T.Vector3;rotation:T.Quaternion;width:number;height:number;depth:number;accent?:string;scale?:number};
export function releaseArchitectureGeometry(root:T.Object3D){const geometries=new Set<T.BufferGeometry>();root.traverse(object=>{if(object instanceof T.Mesh)geometries.add(object.geometry)});geometries.forEach(geometry=>geometry.dispose());root.clear()}
export function createArchitectureNeighborhood(parent:T.Object3D,style:ArchitectureStyle,placements:BuildingPlacement[],detailDistance=82,sharedFinishes?:{materials:ArchitectureMaterials;paints:Map<string,T.MeshStandardMaterial>}){
 const root=new T.Group();root.name='Architecture_Neighborhood_'+style;root.userData.architectureStyle=style;parent.add(root);
 const shells=new T.Group(),details=new T.Group();shells.name='Architecture_UniqueSilhouettes';details.name='Architecture_NearbyFacades';root.add(shells,details);
 const shared=sharedFinishes?.materials??architectureMaterials(style),paints=sharedFinishes?.paints??new Map<string,T.MeshStandardMaterial>();
 const records=placements.map(placement=>{
  let wall=shared.wall;
  if(placement.accent){wall=paints.get(placement.accent)??shared.wall.clone();wall.color.set(placement.accent);paints.set(placement.accent,wall)}
  const options:BuildingCraftOptions={...placement,style,materials:{...shared,wall}};
  return {...placement,options,recipe:architectureRecipe(style,placement.address)};
 });
 function batch(target:T.Group){
  const skins=bakeArchitecture(target);
  for(const skin of skins){const mesh=new T.Mesh(skin.geometry,skin.material);mesh.name='Architecture_MaterialBatch';mesh.castShadow=mesh.receiveShadow=true;target.add(mesh)}
 }
 const bounds:T.Box3[]=[];
 for(const record of records){
    const building=createCraftedBuilding({...record.options,detail:false});building.root.position.copy(record.position);building.root.quaternion.copy(record.rotation);building.root.scale.setScalar(record.scale??1);shells.add(building.root);
  const local=new T.Box3(new T.Vector3(-building.width/2-.7,0,-building.depth/2-.65),new T.Vector3(building.width/2+.7,building.height+3,building.depth/2+.65));
    bounds.push(local.applyMatrix4(new T.Matrix4().compose(record.position,record.rotation,new T.Vector3().setScalar(record.scale??1))));
 }
 batch(shells);root.userData.buildingAddresses=records.map(record=>record.address);root.userData.recipes=records.map(record=>record.recipe);
 let ready=false;
 function loadDetail(){
  for(const record of records){
   const building=createCraftedBuilding(record.options);releaseArchitectureGeometry(building.envelope);
    building.details.position.copy(record.position);building.details.quaternion.copy(record.rotation);building.details.scale.setScalar(record.scale??1);details.add(building.details);
  }
  batch(details);ready=true;
 }
 return {
  root,shells,details,records,bounds,get detailed(){return ready},
  update(observer:T.Vector3,active=true){
   const distance=records.reduce((nearest,record)=>Math.min(nearest,record.position.distanceToSquared(observer)),Infinity);
   if(active&&distance<detailDistance**2&&!ready)loadDetail();
   else if(ready&&(!active||distance>(detailDistance*1.35)**2)){releaseArchitectureGeometry(details);ready=false}
   details.visible=ready;
  },
 };
}
