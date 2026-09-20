export type TransitStop={id:string;name:string;subtitle:string;x:number;y:number;z:number;color:string;theme:'home'|'copper'|'garden'|'prism'};
/** Satellite worlds are computer components; local gravity stays vertical on their landing decks. */
export const transitStops:readonly TransitStop[]=[
 {id:'motherboard',name:'Motherboard Central',subtitle:'Your workshop, projects, and seven living districts.',x:-24,y:.8,z:8,color:'#e9c687',theme:'home'},
 {id:'copper',name:'Copper Dunes',subtitle:'A warm satellite of etched copper and solar ceramic.',x:-95,y:42,z:-140,color:'#d89563',theme:'copper'},
 {id:'garden',name:'Cache Gardens',subtitle:'A quiet green world where temporary memories bloom.',x:0,y:65,z:-190,color:'#9dcab4',theme:'garden'},
 {id:'prism',name:'Prism Moon',subtitle:'A small rendering world beneath a violet aurora ring.',x:95,y:46,z:-140,color:'#b9a3df',theme:'prism'},
];
export type TransitMode='metro'|'rocket';
export type Point3={x:number;y:number;z:number};
export function transitPoint(from:TransitStop,to:TransitStop,t:number,mode:TransitMode='metro'):Point3{
 const u=Math.max(0,Math.min(1,t)),v=1-u,lift=mode==='metro'?65:85;
 // Shared northbound approaches keep rails above the square and away from cars/stalls.
 // A cubic curve joins both stations with matching arrival/departure tangents.
 const cubic=(a:number,b:number,c:number,d:number)=>v*v*v*a+3*v*v*u*b+3*v*u*u*c+u*u*u*d;
 return {x:cubic(from.x,from.x,to.x,to.x),y:cubic(from.y,from.y+lift,to.y+lift,to.y),z:cubic(from.z,from.z-100,to.z-100,to.z)};
}
export class TransitJourney{
 current=0;destination=0;elapsed=0;duration=0;mode:TransitMode|null=null;
 get progress(){return this.mode?Math.min(1,this.elapsed/this.duration):0}
 start(destination:number,mode:TransitMode){if(this.mode||!Number.isInteger(destination)||!transitStops[destination]||destination===this.current)return false;this.destination=destination;this.mode=mode;this.elapsed=0;this.duration=mode==='metro'?15:10;return true}
 tick(dt:number){if(!this.mode)return false;this.elapsed+=Math.max(0,Math.min(dt,.1));if(this.elapsed<this.duration)return false;this.current=this.destination;this.mode=null;this.elapsed=0;return true}
 position(){return this.mode?transitPoint(transitStops[this.current],transitStops[this.destination],this.progress,this.mode):{...transitStops[this.current]}}
 reset(){this.current=this.destination=0;this.mode=null;this.elapsed=this.duration=0}
}
