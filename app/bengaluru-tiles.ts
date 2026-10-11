/**
 * Renderer-independent tile streaming for the planet: visible-patch selection, screen-space
 * LOD, bounded prioritised requests with cancellation, and least-recently-wanted eviction
 * with explicit disposal. The renderer supplies loading/attachment; tests supply fakes.
 */
import type {PlanetProjection} from './bengaluru-projection';
import type {TileRecord} from './bengaluru-pipeline';

export type TileLevel=0|1;
export type TileView={
 /** Camera position in planet space, metres. */
 position:readonly [number,number,number];
 viewportHeight:number;
 /** Vertical field of view, radians. */
 fovY:number;
 /** Optional frustum test for a bounding sphere; tiles facing the camera pass when omitted. */
 inFrustum?(center:readonly [number,number,number],radius:number):boolean;
};
export type TileManagerOptions<A>={
 tiles:TileRecord[];projection:PlanetProjection;
 load(tile:TileRecord,level:TileLevel,signal:AbortSignal):Promise<A>;
 attach(tile:TileRecord,level:TileLevel,asset:A):void;
 detach(tile:TileRecord,level:TileLevel,asset:A):void;
 dispose(asset:A):void;
 bytesOf?(asset:A):number;
 concurrency?:number;
 /** Resident budget for tiles that are no longer wanted; the wanted set is always kept. */
 budgetBytes?:number;
 /** Count fallback for the same budget when assets report no byte size. */
 maxLeftoverTiles?:number;
 /** Projected tile diameter in pixels above which the near LOD is requested. */
 lodSwitchPx?:number;
 onError?(tile:TileRecord,level:TileLevel,error:unknown):void;
};
export type TileStats={wanted:number;resident:number;loading:number;queued:number;bytes:number;failed:number;loads:number;evictions:number};
export type TileManager<A>={
 update(view:TileView):TileStats;
 setLodSwitchPx(px:number):void;
 /** Tiles currently attached with their level. */
 resident():{tile:TileRecord;level:TileLevel;asset:A}[];
 stats():TileStats;
 /** Ensures a tile is loading or resident, e.g. ahead of a camera transition. */
 request(tileId:string,level?:TileLevel):void;
 dispose():void;
};

type Resident<A>={tile:TileRecord;level:TileLevel;asset:A;bytes:number;lastWanted:number};
type Pending={tile:TileRecord;level:TileLevel;controller:AbortController;priority:number};
const key=(tileId:string,level:TileLevel)=>`${tileId}:${level}`;

export function createTileManager<A>(options:TileManagerOptions<A>):TileManager<A>{
 const {projection}=options,concurrency=Math.max(1,options.concurrency??3),budget=options.budgetBytes??32*1048576,maxLeftovers=options.maxLeftoverTiles??12;
 let lodSwitchPx=options.lodSwitchPx??260,frame=0,disposed=false,failed=0,loads=0,evictions=0;
 const centers=new Map<string,{center:[number,number,number];up:[number,number,number]}>();
 for(const tile of options.tiles)centers.set(tile.id,{center:projection.toPlanet(tile.center[0],tile.center[1],0),up:projection.up(tile.center[0],tile.center[1])});
 const residents=new Map<string,Resident<A>>(),pending=new Map<string,Pending>(),queue:Pending[]=[],wanted=new Map<string,{tile:TileRecord;level:TileLevel;priority:number}>(),pinned=new Map<string,{tile:TileRecord;level:TileLevel}>();
 const stats=():TileStats=>({wanted:wanted.size,resident:residents.size,loading:pending.size,queued:queue.length,bytes:[...residents.values()].reduce((sum,r)=>sum+r.bytes,0),failed,loads,evictions});

 const start=(entry:Pending)=>{
  pending.set(key(entry.tile.id,entry.level),entry);
  options.load(entry.tile,entry.level,entry.controller.signal).then(asset=>{
   pending.delete(key(entry.tile.id,entry.level));
   if(disposed||entry.controller.signal.aborted){options.dispose(asset);return}
   loads++;
   const resident:Resident<A>={tile:entry.tile,level:entry.level,asset,bytes:options.bytesOf?.(asset)??0,lastWanted:frame};
   residents.set(key(entry.tile.id,entry.level),resident);options.attach(entry.tile,entry.level,asset);
   const other=residents.get(key(entry.tile.id,entry.level===0?1:0));
   if(other)evict(other);
   pump();
  },error=>{
   pending.delete(key(entry.tile.id,entry.level));
   if(!entry.controller.signal.aborted&&!disposed){failed++;options.onError?.(entry.tile,entry.level,error)}
   pump();
  });
 };
 const pump=()=>{
  if(disposed)return;
  queue.sort((a,b)=>a.priority-b.priority);
  while(pending.size<concurrency&&queue.length){const next=queue.shift()!,k=key(next.tile.id,next.level);if(wanted.has(k)||pinned.has(k))start(next)}
 };
 const evict=(resident:Resident<A>)=>{residents.delete(key(resident.tile.id,resident.level));options.detach(resident.tile,resident.level,resident.asset);options.dispose(resident.asset);evictions++};
 const enqueue=(tile:TileRecord,level:TileLevel,priority:number)=>{
  const k=key(tile.id,level);if(residents.has(k)||pending.has(k))return;
  const queued=queue.find(entry=>entry.tile.id===tile.id&&entry.level===level);
  if(queued)queued.priority=Math.min(queued.priority,priority);else queue.push({tile,level,controller:new AbortController(),priority});
 };

 return {
  update(view){
   if(disposed)return stats();
   frame++;wanted.clear();
   const [cx,cy,cz]=view.position,pixelsPerMetreAtUnitDistance=view.viewportHeight/(2*Math.tan(view.fovY/2));
   for(const tile of options.tiles){
    const {center,up}=centers.get(tile.id)!,dx=cx-center[0],dy=cy-center[1],dz=cz-center[2],distance=Math.hypot(dx,dy,dz)||1;
    const facing=(dx*up[0]+dy*up[1]+dz*up[2])/distance;
    if(facing<-.12)continue;
    if(view.inFrustum&&!view.inFrustum(center,tile.radiusM))continue;
    const projectedPx=tile.radiusM*2/distance*pixelsPerMetreAtUnitDistance,level:TileLevel=projectedPx>lodSwitchPx?0:1;
    wanted.set(key(tile.id,level),{tile,level,priority:distance});
   }
   for(const [k,pin] of pinned){if(residents.has(k))pinned.delete(k);else if(!wanted.has(k))wanted.set(k,{tile:pin.tile,level:pin.level,priority:-1})}
   // Cancel work that is no longer wanted.
   for(const [k,entry] of pending)if(!wanted.has(k)){entry.controller.abort();pending.delete(k)}
   for(let i=queue.length-1;i>=0;i--)if(!wanted.has(key(queue[i].tile.id,queue[i].level)))queue.splice(i,1);
   for(const entry of wanted.values()){
    const k=key(entry.tile.id,entry.level),resident=residents.get(k);
    if(resident){resident.lastWanted=frame;continue}
    const other=residents.get(key(entry.tile.id,entry.level===0?1:0));if(other)other.lastWanted=frame;
    enqueue(entry.tile,entry.level,entry.priority);
   }
   // Evict least-recently-wanted leftovers beyond the budget.
   const leftovers=[...residents.values()].filter(resident=>resident.lastWanted!==frame).sort((a,b)=>a.lastWanted-b.lastWanted);
   let bytes=leftovers.reduce((sum,r)=>sum+r.bytes,0),count=leftovers.length;
   for(const resident of leftovers){if(bytes<=budget&&count<=maxLeftovers)break;evict(resident);bytes-=resident.bytes;count--}
   pump();
   return stats();
  },
  setLodSwitchPx(px){lodSwitchPx=px},
  resident(){return [...residents.values()].map(({tile,level,asset})=>({tile,level,asset}))},
  stats,
  request(tileId,level=1){const tile=options.tiles.find(t=>t.id===tileId);if(!tile||disposed)return;const k=key(tile.id,level);if(residents.has(k))return;pinned.set(k,{tile,level});enqueue(tile,level,-1);pump()},
  dispose(){
   disposed=true;
   for(const entry of pending.values())entry.controller.abort();
   pending.clear();queue.length=0;
   for(const resident of residents.values())evict(resident);
  },
 };
}
