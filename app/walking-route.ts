import {motherboardBounds} from './world-config';
export type GroundPoint={x:number;z:number};
// Bounded grid search uses the same collision predicate as player movement.
// Only cardinal edges are used, so routes cannot cut diagonally through corners.
export function planWalkingRoute(start:GroundPoint,end:GroundPoint,blocked:(x:number,z:number)=>boolean,hint?:readonly GroundPoint[]):GroundPoint[]{
 const legacy=[start,end].every(point=>Math.abs(point.x)<=50&&point.z>=-50&&point.z<=209),scale=legacy?2:1;
 const minX=legacy?-100:Math.floor(Math.max(motherboardBounds.minX+1,Math.min(start.x,end.x)-32)),maxX=legacy?100:Math.ceil(Math.min(motherboardBounds.maxX-1,Math.max(start.x,end.x)+32));
 const minZ=legacy?-100:Math.floor(Math.max(motherboardBounds.minZ+1,Math.min(start.z,end.z)-32)),maxZ=legacy?418:Math.ceil(Math.min(motherboardBounds.maxZ-1,Math.max(start.z,end.z)+32));
 const side=maxX-minX+1,rows=maxZ-minZ+1;
 const inside=(x:number,z:number)=>x>=minX&&x<=maxX&&z>=minZ&&z<=maxZ;
 const id=(x:number,z:number)=>(z-minZ)*side+x-minX;
 const point=(key:number)=>({x:(key%side+minX)/scale,z:(Math.floor(key/side)+minZ)/scale});
 const occupancy=new Map<string,boolean>();
 const occupied=(x:number,z:number)=>{const key=x+','+z;let value=occupancy.get(key);if(value===undefined){value=blocked(x,z);occupancy.set(key,value)}return value};
 const clear=(a:GroundPoint,b:GroundPoint)=>{const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.1));for(let i=0;i<=steps;i++){const t=i/steps;if(occupied(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false}return true};
 const sx=Math.round(start.x*scale),sz=Math.round(start.z*scale),ex=Math.round(end.x*scale),ez=Math.round(end.z*scale);
 if(!inside(sx,sz)||!inside(ex,ez))return [];
 if(hint&&hint.length>1&&hint[0].x===start.x&&hint[0].z===start.z&&hint.at(-1)!.x===end.x&&hint.at(-1)!.z===end.z&&hint.every((position,index)=>inside(Math.round(position.x*scale),Math.round(position.z*scale))&&(!index||clear(hint[index-1],position))))return hint.map(position=>({...position}));
 const target=id(ex,ez),parents=new Int32Array(side*rows).fill(-2),costs=new Float64Array(side*rows).fill(Infinity),closed=new Uint8Array(side*rows);
 type Candidate={key:number;cost:number;priority:number;remaining:number};
 const queue:Candidate[]=[],better=(first:Candidate,second:Candidate)=>first.priority<second.priority||first.priority===second.priority&&first.remaining<second.remaining;
 function push(candidate:Candidate){let index=queue.length;queue.push(candidate);while(index>0){const parent=Math.floor((index-1)/2);if(!better(candidate,queue[parent]))break;queue[index]=queue[parent];index=parent}queue[index]=candidate}
 function pop(){const first=queue[0],last=queue.pop()!;if(queue.length){let index=0;while(index*2+1<queue.length){let child=index*2+1;if(child+1<queue.length&&better(queue[child+1],queue[child]))child++;if(!better(queue[child],last))break;queue[index]=queue[child];index=child}queue[index]=last}return first}
 for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!inside(sx+dx,sz+dz))continue;const key=id(sx+dx,sz+dz),position=point(key);if(clear(start,position)){const cost=Math.hypot(position.x-start.x,position.z-start.z)*scale,remaining=Math.abs(sx+dx-ex)+Math.abs(sz+dz-ez);parents[key]=-1;costs[key]=cost;push({key,cost,priority:cost+remaining,remaining})}}
 if(!clear(point(target),end))return [];
 let reached=false;
 while(queue.length){const candidate=pop(),current=candidate.key;if(closed[current]||candidate.cost!==costs[current])continue;if(current===target){reached=true;break}closed[current]=1;const a=point(current);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=Math.round(a.x*scale)+dx,z=Math.round(a.z*scale)+dz;if(!inside(x,z))continue;const key=id(x,z),cost=costs[current]+1;if(closed[key]||cost>=costs[key]||!clear(a,point(key)))continue;parents[key]=current;costs[key]=cost;const remaining=Math.abs(x-ex)+Math.abs(z-ez);push({key,cost,priority:cost+remaining,remaining})}}
 if(!reached)return [];
 const path:GroundPoint[]=[end];for(let key=target;key!==-1;key=parents[key])path.push(point(key));path.push(start);path.reverse();
 // Compress straight runs without introducing any new corner-cutting edges.
 return path.filter((p,i)=>{if(!i||i===path.length-1)return true;const a=path[i-1],b=path[i+1];return Math.abs((p.x-a.x)*(b.z-p.z)-(p.z-a.z)*(b.x-p.x))>1e-6});
}
