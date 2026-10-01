import {planetArchitectureFor} from './architecture-profiles';
import type {TransitStop} from './transit-config';

export function planetTownComposition(stop:TransitStop,along:number,side:number){
 const column=along/8,edge=Math.abs(column),style=planetArchitectureFor(stop);
 if(style==='forge')return {name:'Foundry courtyards',east:along,north:side*(11+(2-edge)*2),height:1+(2-edge)*.05,woods:49};
 if(style==='conservatory')return {name:'Woodland clusters',east:along+Math.sign(column)*1.8,north:side*(12+(edge===1?4.2:0)),height:.85+edge*.04,woods:34};
 if(style==='citadel')return {name:'Coastal terraces',east:along+side*2,north:side*(11+edge*1.1),height:1.04+(2-edge)*.12,woods:48};
 if(style==='petal')return {name:'Crescent gardens',east:along*.96,north:side*(11.8+4*(1-column*column/4)),height:.9+edge*.05,woods:31};
 if(style==='solstice')return {name:'Sunward terraces',east:along,north:side*(12+(column+2)*1.15),height:.9+(column+2)*.05,woods:41};
 if(style==='cloud')return {name:'Lagoon courts',east:along+side*2.3,north:side*(12+Math.sin((column+2)*Math.PI/2)*1.8),height:edge===1?1.15:.88,woods:45};
 if(style==='research')return {name:'Observatory quadrangles',east:along+side*1.25,north:side*(11.5+(edge===0?4:0)),height:edge===0?1.12:.95,woods:42};
 if(style==='workshop')return {name:'Staggered workshop yards',east:along+side*2.6,north:side*12.3,height:.9+edge*.04,woods:52};
 if(style==='guild')return {name:'Timber garden courts',east:along,north:side*(12.5+Math.cos(column)*1.5),height:1.02-edge*.05,woods:36};
 return {name:'Open atelier rows',east:along,north:side*11,height:1,woods:42};
}
