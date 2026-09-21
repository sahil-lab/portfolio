import {motherboardBounds} from './world-config';
export type GroundPoint={x:number;z:number};
// Bounded grid search uses the same collision predicate as player movement.
// Only cardinal edges are used, so routes cannot cut diagonally through corners.
export function planWalkingRoute(start:GroundPoint,end:GroundPoint,blocked:(x:number,z:number)=>boolean):GroundPoint[]{
 const legacy=[start,end].every(point=>Math.abs(point.x)<=50&&point.z>=-50&&point.z<=209),scale=legacy?2:1;
 const minX=legacy?-100:Math.floor(Math.max(motherboardBounds.minX+1,Math.min(start.x,end.x)-32)),maxX=legacy?100:Math.ceil(Math.min(motherboardBounds.maxX-1,Math.max(start.x,end.x)+32));
 const minZ=legacy?-100:Math.floor(Math.max(motherboardBounds.minZ+1,Math.min(start.z,end.z)-32)),maxZ=legacy?418:Math.ceil(Math.min(motherboardBounds.maxZ-1,Math.max(start.z,end.z)+32));
 const side=maxX-minX+1,rows=maxZ-minZ+1;
 const inside=(x:number,z:number)=>x>=minX&&x<=maxX&&z>=minZ&&z<=maxZ;
 const id=(x:number,z:number)=>(z-minZ)*side+x-minX;
 const point=(key:number)=>({x:(key%side+minX)/scale,z:(Math.floor(key/side)+minZ)/scale});
 const clear=(a:GroundPoint,b:GroundPoint)=>{const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.1));for(let i=0;i<=steps;i++){const t=i/steps;if(blocked(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false}return true};
 const sx=Math.round(start.x*scale),sz=Math.round(start.z*scale),ex=Math.round(end.x*scale),ez=Math.round(end.z*scale);
 if(!inside(sx,sz)||!inside(ex,ez))return [];
 const target=id(ex,ez),parents=new Int32Array(side*rows).fill(-2),queue:number[]=[];
 for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!inside(sx+dx,sz+dz))continue;const key=id(sx+dx,sz+dz);if(clear(start,point(key))){parents[key]=-1;queue.push(key)}}
 if(!clear(point(target),end))return [];
 let reached=false;
 for(let head=0;head<queue.length;head++){const current=queue[head];if(current===target){reached=true;break}const a=point(current);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=Math.round(a.x*scale)+dx,z=Math.round(a.z*scale)+dz;if(!inside(x,z))continue;const key=id(x,z);if(parents[key]!==-2||!clear(a,point(key)))continue;parents[key]=current;queue.push(key)}}
 if(!reached)return [];
 const path:GroundPoint[]=[end];for(let key=target;key!==-1;key=parents[key])path.push(point(key));path.push(start);path.reverse();
 // Compress straight runs without introducing any new corner-cutting edges.
 return path.filter((p,i)=>{if(!i||i===path.length-1)return true;const a=path[i-1],b=path[i+1];return Math.abs((p.x-a.x)*(b.z-p.z)-(p.z-a.z)*(b.x-p.x))>1e-6});
}
