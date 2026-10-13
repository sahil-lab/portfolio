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
 maxDistance?:number;
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
 maxWantedTiles?:number;
 maxResidentBytes?:number;
 estimateBytes?(tile:TileRecord,level:TileLevel):number;
 now?():number;
 initial?:readonly {tile:TileRecord;level:TileLevel;asset:A}[];
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
 request(tileId:string,level?:TileLevel,retain?:boolean):void;
 releaseRequest(tileId:string):void;
 dispose():void;
};

type Resident<A>={tile:TileRecord;level:TileLevel;asset:A;bytes:number;lastWanted:number};
type Pending={tile:TileRecord;level:TileLevel;controller:AbortController;priority:number};
const key=(tileId:string,level:TileLevel)=>`${tileId}:${level}`;

export function createTileManager<A>(options:TileManagerOptions<A>):TileManager<A>{
 const {projection}=options,concurrency=Math.max(1,options.concurrency??3),budget=options.budgetBytes??32*1048576,maxLeftovers=options.maxLeftoverTiles??12;
 const maxWanted=options.maxWantedTiles??Infinity,residentBudget=options.maxResidentBytes??Infinity,now=()=>options.now?.()??performance.now();
 const failures=new Map<string,{attempts:number;retryAt:number}>();
 const estimate=(tile:TileRecord,level:TileLevel)=>options.estimateBytes?.(tile,level)??tile.lods.find(lod=>lod.level===level)?.bytes??0;
 let lodSwitchPx=options.lodSwitchPx??260,frame=0,disposed=false,failed=0,loads=0,evictions=0;
 const centers=new Map<string,{center:[number,number,number];up:[number,number,number]}>();
 for(const tile of options.tiles)centers.set(tile.id,{center:projection.toPlanet(tile.center[0],tile.center[1],0),up:projection.up(tile.center[0],tile.center[1])});
 const residents=new Map<string,Resident<A>>(),pending=new Map<string,Pending>(),queue:Pending[]=[],wanted=new Map<string,{tile:TileRecord;level:TileLevel;priority:number}>(),pinned=new Map<string,{tile:TileRecord;level:TileLevel;retain?:boolean}>();
 const stats=():TileStats=>({wanted:wanted.size,resident:residents.size,loading:[...pending.values()].filter(entry=>!entry.controller.signal.aborted).length,queued:queue.length,bytes:[...residents.values()].reduce((sum,r)=>sum+r.bytes,0),failed,loads,evictions});

 const recordFailure=(entry:Pending,error:unknown)=>{
    const requestKey=key(entry.tile.id,entry.level),attempts=(failures.get(requestKey)?.attempts??0)+1;
    failures.set(requestKey,{attempts,retryAt:now()+Math.min(30000,1000*2**(attempts-1))});failed++;options.onError?.(entry.tile,entry.level,error);
 };

 const start=(entry:Pending)=>{
    const requestKey=key(entry.tile.id,entry.level);pending.set(requestKey,entry);
  options.load(entry.tile,entry.level,entry.controller.signal).then(asset=>{
     if(pending.get(requestKey)===entry)pending.delete(requestKey);
     if(disposed||entry.controller.signal.aborted){options.dispose(asset);pump();return}
     const bytes=options.bytesOf?.(asset)??0;
     if(bytes>residentBudget){options.dispose(asset);recordFailure(entry,new Error('Tile exceeds the resident byte budget'));pump();return}
     const other=residents.get(key(entry.tile.id,entry.level===0?1:0));if(other)evict(other);
     let total=[...residents.values()].reduce((sum,resident)=>sum+resident.bytes,0);
     for(const resident of [...residents.values()].sort((first,second)=>Number(wanted.has(key(first.tile.id,first.level)))-Number(wanted.has(key(second.tile.id,second.level)))||first.lastWanted-second.lastWanted)){
        if(total+bytes<=residentBudget)break;total-=resident.bytes;evict(resident);
     }
   loads++;
     failures.delete(requestKey);
     const resident:Resident<A>={tile:entry.tile,level:entry.level,asset,bytes,lastWanted:frame};
     residents.set(requestKey,resident);options.attach(entry.tile,entry.level,asset);
   pump();
  },error=>{
     if(pending.get(requestKey)===entry)pending.delete(requestKey);
     if(!entry.controller.signal.aborted&&!disposed)recordFailure(entry,error);
   pump();
  });
 };
 const pump=()=>{
  if(disposed)return;
  queue.sort((a,b)=>a.priority-b.priority);
    while(pending.size<concurrency&&queue.length){
     const index=queue.findIndex(entry=>!pending.has(key(entry.tile.id,entry.level)));if(index<0)break;
     const next=queue.splice(index,1)[0],requestKey=key(next.tile.id,next.level);if(wanted.has(requestKey)||pinned.has(requestKey))start(next);
    }
 };
 const evict=(resident:Resident<A>)=>{residents.delete(key(resident.tile.id,resident.level));options.detach(resident.tile,resident.level,resident.asset);options.dispose(resident.asset);evictions++};
 const enqueue=(tile:TileRecord,level:TileLevel,priority:number)=>{
    const k=key(tile.id,level),failure=failures.get(k);if(residents.has(k)||pending.has(k)&&!pending.get(k)!.controller.signal.aborted||failure&&(failure.attempts>=3||now()<failure.retryAt))return;
  const queued=queue.find(entry=>entry.tile.id===tile.id&&entry.level===level);
  if(queued)queued.priority=Math.min(queued.priority,priority);else queue.push({tile,level,controller:new AbortController(),priority});
 };

 let initialBytes=0;
 for(const entry of options.initial??[]){
  const requestKey=key(entry.tile.id,entry.level),bytes=options.bytesOf?.(entry.asset)??0;
  if(residents.has(requestKey)||initialBytes+bytes>residentBudget){options.dispose(entry.asset);continue}
  initialBytes+=bytes;residents.set(requestKey,{...entry,bytes,lastWanted:frame});options.attach(entry.tile,entry.level,entry.asset);loads++;
 }

 return {
  update(view){
   if(disposed)return stats();
   frame++;wanted.clear();
   const [cx,cy,cz]=view.position,pixelsPerMetreAtUnitDistance=view.viewportHeight/(2*Math.tan(view.fovY/2));
   for(const tile of options.tiles){
    const {center,up}=centers.get(tile.id)!,dx=cx-center[0],dy=cy-center[1],dz=cz-center[2],distance=Math.hypot(dx,dy,dz)||1;
    if(view.maxDistance!==undefined&&distance-tile.radiusM>view.maxDistance)continue;
    const facing=(dx*up[0]+dy*up[1]+dz*up[2])/distance;
    if(facing<-.12)continue;
    if(view.inFrustum&&!view.inFrustum(center,tile.radiusM))continue;
    const projectedPx=tile.radiusM*2/distance*pixelsPerMetreAtUnitDistance,level:TileLevel=projectedPx>lodSwitchPx?0:1;
    wanted.set(key(tile.id,level),{tile,level,priority:distance});
   }
  for(const [k,pin] of pinned){if(residents.has(k)&&!pin.retain)pinned.delete(k);else wanted.set(k,{tile:pin.tile,level:pin.level,priority:-1})}
    const ordered=[...wanted.values()].sort((first,second)=>first.priority-second.priority||first.tile.id.localeCompare(second.tile.id)),selectedTiles=new Set<string>();let estimatedBytes=0;
    wanted.clear();
    for(const entry of ordered){
     if(wanted.size>=maxWanted)break;if(selectedTiles.has(entry.tile.id))continue;
     let level=entry.level,bytes=estimate(entry.tile,level);
     if(estimatedBytes+bytes>residentBudget&&level===0){level=1;bytes=estimate(entry.tile,level)}
     if(estimatedBytes+bytes>residentBudget)continue;
     wanted.set(key(entry.tile.id,level),{...entry,level});selectedTiles.add(entry.tile.id);estimatedBytes+=bytes;
    }
   // Cancel work that is no longer wanted.
    for(const [k,entry] of pending)if(!wanted.has(k))entry.controller.abort();
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
    request(tileId,level=1,retain=false){
     const tile=options.tiles.find(entry=>entry.id===tileId);if(!tile||disposed)return;
     if(estimate(tile,level)>residentBudget)level=1;if(estimate(tile,level)>residentBudget)return;
    const requestKey=key(tile.id,level);if(residents.has(requestKey)&&!retain)return;
     if(pinned.size>=maxWanted)pinned.delete(pinned.keys().next().value!);
    failures.delete(requestKey);pinned.set(requestKey,{tile,level,retain});enqueue(tile,level,-1);pump();
    },
    releaseRequest(tileId){pinned.delete(key(tileId,0));pinned.delete(key(tileId,1))},
  dispose(){
   disposed=true;
   for(const entry of pending.values())entry.controller.abort();
    pending.clear();queue.length=0;wanted.clear();pinned.clear();failures.clear();
   for(const resident of residents.values())evict(resident);
  },
 };
}
