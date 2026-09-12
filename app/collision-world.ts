export type BoxCollider={x:number;y:number;z:number;w:number;h:number;d:number};
export type BuildingCollider={x:number;z:number;w:number;d:number;y:number;h:number};
/** Shared character clearance: 0.4m radius and 2.3m headroom. */
export function sceneryCollision(boxes:BoxCollider[],buildings:BuildingCollider[]){
  return (x:number,z:number,feet:number)=>buildings.some(o=>Math.abs(x-o.x)<o.w/2+.4&&Math.abs(z-o.z)<o.d/2+.4&&feet+2.3>o.y&&feet<o.y+o.h-.02)||boxes.some(o=>Math.abs(x-o.x)<o.w/2+.4&&Math.abs(z-o.z)<o.d/2+.4&&feet+2.3>o.y-o.h/2&&feet<o.y+o.h/2-.02);
}
