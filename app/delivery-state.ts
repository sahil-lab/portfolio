export const recipients=['owl','chameleon','cloud','tortoises'] as const;
export type DeliverySnapshot={round:number;phase:'idle'|'preparing'|'ready'|'complete';inventory:number;stock:number;delivered:string[];discoveries:string[];completedRounds:number;message:string};
export class DeliveryRound{
 snapshot:DeliverySnapshot={round:1,phase:'idle',inventory:0,stock:0,delivered:[],discoveries:[],completedRounds:0,message:'Optional: visit the Packet Press to prepare four diagnostic capsules.'};
 restore(saved:DeliverySnapshot){this.elapsed=0;this.update({...saved})}
 reset(){this.elapsed=0;this.update({round:1,phase:'idle',inventory:0,stock:0,delivered:[],discoveries:[],completedRounds:0,message:'Local progress reset. Visit the Packet Press or explore freely.'})}
 private elapsed=0;private listeners=new Set<()=>void>();
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn)}};
 getSnapshot=()=>this.snapshot;
 private update(change:Partial<DeliverySnapshot>){this.snapshot={...this.snapshot,...change};this.listeners.forEach(fn=>fn())}
 get progress(){return Math.min(1,this.elapsed/3)}
 prepare(){if(this.snapshot.phase!=='idle')return false;this.elapsed=0;this.update({phase:'preparing',message:'Packet Press: charging four diagnostic capsules…'});return true}
 tick(dt:number){if(this.snapshot.phase!=='preparing')return;this.elapsed+=Math.max(0,dt);if(this.elapsed>=3)this.update({phase:'ready',stock:4,message:'Four capsules are charged. Collect them individually from the dispensing tray.'})}
 collect(){const s=this.snapshot;if(s.phase!=='ready'||s.stock<1||s.inventory>=4)return false;this.update({inventory:s.inventory+1,stock:s.stock-1,message:`Capsule collected · ${s.inventory+1}/4 carried.`});return true}
 deliver(id:string){const s=this.snapshot;if(s.phase!=='ready'||!recipients.some(r=>r===id)||s.delivered.includes(id)||s.inventory<1)return false;const delivered=[...s.delivered,id],complete=delivered.length===4;this.update({inventory:s.inventory-1,delivered,phase:complete?'complete':'ready',completedRounds:s.completedRounds+(complete?1:0),message:complete?'ROUND COMPLETE! All four residents received a capsule. Return to the Packet Press and explicitly start another round.':'Delivered! This resident has received their capsule for this round.'});return true}
 nextRound(){const s=this.snapshot;if(s.phase!=='complete')return false;this.elapsed=0;this.update({round:s.round+1,phase:'idle',inventory:0,stock:0,delivered:[],message:'New round started. Your discoveries and project demonstrations are preserved.'});return true}
 discover(id:string,title:string){if(this.snapshot.discoveries.includes(id))return false;this.update({discoveries:[...this.snapshot.discoveries,id],message:'Discovered: '+title});return true}
}
