import {createSpatialIndex} from './spatial-index';
export type BoxCollider={x:number;y:number;z:number;w:number;h:number;d:number};
export type BuildingCollider={x:number;z:number;w:number;d:number;y:number;h:number};
/** Shared character clearance: 0.4m radius and 2.3m headroom. */
export function sceneryCollision(boxes:BoxCollider[],buildings:BuildingCollider[]){
  const bounds=(value:BoxCollider|BuildingCollider)=>({minX:value.x-value.w/2-.4,maxX:value.x+value.w/2+.4,minZ:value.z-value.d/2-.4,maxZ:value.z+value.d/2+.4});
  let boxCount=boxes.length,buildingCount=buildings.length,boxIndex=createSpatialIndex(boxes,bounds),buildingIndex=createSpatialIndex(buildings,bounds);
  return (x:number,z:number,feet:number)=>{
    if(boxes.length!==boxCount){boxCount=boxes.length;boxIndex=createSpatialIndex(boxes,bounds)}if(buildings.length!==buildingCount){buildingCount=buildings.length;buildingIndex=createSpatialIndex(buildings,bounds)}
    const buildingHit=(object:BuildingCollider)=>Math.abs(x-object.x)<object.w/2+.4&&Math.abs(z-object.z)<object.d/2+.4&&feet+2.3>object.y&&feet<object.y+object.h-.02;
    const boxHit=(object:BoxCollider)=>Math.abs(x-object.x)<object.w/2+.4&&Math.abs(z-object.z)<object.d/2+.4&&feet+2.3>object.y-object.h/2&&feet<object.y+object.h/2-.02;
    return buildingIndex.at(x,z).some(buildingHit)||buildingIndex.broad.some(buildingHit)||boxIndex.at(x,z).some(boxHit)||boxIndex.broad.some(boxHit);
  };
}
