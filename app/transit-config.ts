import {createMetroPath,metroAxleSpan,metroDistance,rocketFlight} from './transit-motion';
export type PlanetWorldKind='research'|'foundry'|'skills';
export type TransitStop={id:string;name:string;subtitle:string;x:number;y:number;z:number;color:string;theme:'home'|'copper'|'garden'|'prism';radius?:number;worldKind?:PlanetWorldKind};
/** Satellite worlds share spherical gravity and a flat landing deck. */
export const transitStops:readonly TransitStop[]=[
 {id:'motherboard',name:'Motherboard Central',subtitle:'Lantern Quarter, nine hundred homes, and the original workshop districts.',x:-36.5,y:.8,z:3,color:'#e9c687',theme:'home'},
 {id:'copper',name:'GitHub - The Forge',subtitle:'Black stone, white foundries. The world of things I build.',x:-750,y:300,z:-1430,color:'#dce2e9',theme:'copper',radius:78},
 {id:'garden',name:'Cache Gardens',subtitle:'A green globe of forests and quiet horizon outposts.',x:0,y:380,z:-1650,color:'#9dcab4',theme:'garden',radius:96},
 {id:'prism',name:'LinkedIn - The Citadel',subtitle:'Blue water, white towers. A city shaped by a professional journey.',x:750,y:320,z:-1430,color:'#0a66c2',theme:'prism',radius:84},
 {id:'petal',name:'Petal Park',subtitle:'Blossom canopies, rose-colored village houses, and garden walks.',x:-750,y:310,z:260,color:'#eab0bf',theme:'garden',radius:76},
 {id:'solstice',name:'Solstice Springs',subtitle:'Butter-yellow terraces, turquoise rivers, and sunny little courtyards.',x:760,y:360,z:220,color:'#f1d58e',theme:'copper',radius:82},
 {id:'cloud',name:'Cloud Nine',subtitle:'Pearl domes, blue lagoons, and a sky full of quiet possibilities.',x:740,y:420,z:1170,color:'#9ddce6',theme:'prism',radius:88},
 {id:'ai-research',name:'AI Research Planet',subtitle:'Chalk ridges, folded observatories, and a working neural classification atelier.',x:-2550,y:650,z:-2600,color:'#78bdb7',theme:'prism',radius:128,worldKind:'research'},
 {id:'project-foundry',name:'Project Foundry Planet',subtitle:'Basalt mesas, terracotta workshops, and portfolio projects on a working assembly line.',x:2550,y:580,z:-2250,color:'#d08c71',theme:'copper',radius:144,worldKind:'foundry'},
 {id:'skills-technology',name:'Skills / Technology Planet',subtitle:'Verdant terraces, timber aqueducts, and a hands-on dataflow conservatory.',x:0,y:740,z:3400,color:'#94b96c',theme:'garden',radius:136,worldKind:'skills'},
];
export const planetStyles:Record<string,{land:string;terrain:string;growth:string;homes:string[];towns:string[]}>= {
 petal:{land:'#cfdfb5',terrain:'#92b888',growth:'#eeb6c7',homes:['#f1b5be','#f2ddbc','#acd2c4','#d8b4c9'],towns:['Petal Promenade','Blossom Bakery','Rosewater Row','Orchard Market','Peony Place','Garden Observatory']},
 solstice:{land:'#ead9a5',terrain:'#b9c893',growth:'#e7c978',homes:['#efd080','#92c9c4','#f0b098','#f4edd3'],towns:['Sunbeam Square','Citrine Court','Lemon Grove','Turquoise Springs','Sundial Village','Solstice Observatory']},
 cloud:{land:'#c4e5e7',terrain:'#8dbfc9',growth:'#f5f4e7',homes:['#f0f3e6','#9dcedd','#eab9b5','#b9d8ce'],towns:['Cloudbank','Pearl Pier','Bluebell Terrace','Daydream Bay','Silverwater','Skyglass Observatory']},
};
export type TransitMode='metro'|'rocket';
export const rocketJourneySeconds=10;
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
 start(destination:number,mode:TransitMode){if(this.mode||!Number.isInteger(destination)||!transitStops[destination]||destination===this.current)return false;this.destination=destination;this.mode=mode;this.elapsed=0;this.duration=mode==='metro'?15:rocketJourneySeconds;return true}
 tick(dt:number){if(!this.mode)return false;this.elapsed+=Math.max(0,Math.min(dt,.1));if(this.elapsed<this.duration)return false;this.current=this.destination;this.mode=null;this.elapsed=0;return true}
 position(){return this.mode?transitPoint(transitStops[this.current],transitStops[this.destination],this.progress,this.mode):{...transitStops[this.current]}}
 reset(){this.current=this.destination=0;this.mode=null;this.elapsed=this.duration=0}
}
