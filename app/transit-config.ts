import {createMetroPath,metroAxleSpan,metroDistance,rocketFlight} from './transit-motion';
export type TransitStop={id:string;name:string;subtitle:string;x:number;y:number;z:number;color:string;theme:'home'|'copper'|'garden'|'prism';radius?:number};
/** Satellite worlds are computer components; local gravity stays vertical on their landing decks. */
export const transitStops:readonly TransitStop[]=[
 {id:'motherboard',name:'Motherboard Central',subtitle:'Your workshop, projects, and seven living districts.',x:-36.5,y:.8,z:3,color:'#e9c687',theme:'home'},
 {id:'copper',name:'GitHub - The Forge',subtitle:'Black stone, white foundries. The world of things I build.',x:-245,y:110,z:-285,color:'#dce2e9',theme:'copper',radius:78},
 {id:'garden',name:'Cache Gardens',subtitle:'A vast green globe of forests and quiet horizon outposts.',x:0,y:160,z:-470,color:'#9dcab4',theme:'garden',radius:96},
 {id:'prism',name:'LinkedIn - The Citadel',subtitle:'Blue water, white towers. A city shaped by a professional journey.',x:245,y:120,z:-285,color:'#0a66c2',theme:'prism',radius:84},
];
export type TransitMode='metro'|'rocket';
export const resonatorOffset={x:5,z:-11};
export type Point3={x:number;y:number;z:number};
export function transitPoint(from:TransitStop,to:TransitStop,t:number,mode:TransitMode='metro'):Point3{
 if(mode==='rocket'){const point=rocketFlight(from,to,t).position;return {x:point.x,y:point.y,z:point.z}}
 if(t<=0)return {x:from.x,y:from.y,z:from.z};if(t>=1)return {x:to.x,y:to.y,z:to.z};
 const path=createMetroPath(from,to),point=path.sample(metroDistance(path,t)-metroAxleSpan/2).position;
 return {x:point.x,y:point.y,z:point.z};
}
export class TransitJourney{
 current=0;destination=0;elapsed=0;duration=0;mode:TransitMode|null=null;
 get progress(){return this.mode?Math.min(1,this.elapsed/this.duration):0}
 start(destination:number,mode:TransitMode){if(this.mode||!Number.isInteger(destination)||!transitStops[destination]||destination===this.current)return false;this.destination=destination;this.mode=mode;this.elapsed=0;this.duration=mode==='metro'?15:10;return true}
 tick(dt:number){if(!this.mode)return false;this.elapsed+=Math.max(0,Math.min(dt,.1));if(this.elapsed<this.duration)return false;this.current=this.destination;this.mode=null;this.elapsed=0;return true}
 position(){return this.mode?transitPoint(transitStops[this.current],transitStops[this.destination],this.progress,this.mode):{...transitStops[this.current]}}
 reset(){this.current=this.destination=0;this.mode=null;this.elapsed=this.duration=0}
}
