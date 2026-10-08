import * as T from 'three';
import type {PlanetWorldKind,TransitStop} from './transit-config';

export type RealmSite={id:string;name:string;direction:T.Vector3;radius:number};
export type RealmDesign={
  landmark:string;mood:string;towns:string[];sites:RealmSite[];
  land:string;terrain:string;rock:string;stone:string;wood:string;metal:string;glass:string;growth:string;water:string;homes:string[];
};
const direction=(latitude:number,longitude:number)=>new T.Vector3(Math.cos(latitude)*Math.cos(longitude),Math.sin(latitude),Math.cos(latitude)*Math.sin(longitude));
function sites(names:string[]):RealmSite[]{
  return names.map((name,index)=>({id:['atelier','archive','lookout'][index],name,direction:direction([1.05,.82,-.94][index],[.48,2.62,4.72][index]),radius:index===0?21:13}));
}
export const realmDesigns:Record<PlanetWorldKind,RealmDesign>={
  research:{
    landmark:'Folded Light Observatory',mood:'Quiet chalk escarpments, jade glazing, and warm paper lanterns.',
    towns:['Inference Court','Tensor Terrace','Gradient Walk','Model Library','Feature Garden','Validation Reach'],
    sites:sites(['Neural Tile Atelier','Model Archive','Southern Lens Observatory']),
    land:'#ccd1bd',terrain:'#a5b9b0',rock:'#a6aaa0',stone:'#d6dfd7',wood:'#6b523b',metal:'#b69957',glass:'#215b58',growth:'#3f7c67',water:'#3a9d9e',homes:['#e3e9df','#4e9b86','#cba44d','#8ca99b'],
  },
  foundry:{
    landmark:'Portfolio Assembly Works',mood:'Basalt steps, fired-clay workshops, and a measured mechanical rhythm.',
    towns:['Pattern Yard','Catalog Row','Analytics Kiln','Contract Works','Assembly Terrace','Release Quay'],
    sites:sites(['Project Pattern Press','Portfolio Pattern Archive','Southern Counterweight Works']),
    land:'#737c78',terrain:'#515e5b',rock:'#939990',stone:'#c5cbc3',wood:'#8f543f',metal:'#9d987a',glass:'#255b55',growth:'#78914f',water:'#3d9e93',homes:['#bd654b','#738d7c','#d5bb79','#386d70'],
  },
  skills:{
    landmark:'Dataflow Aqueduct Conservatory',mood:'Layered green terraces, timber joinery, and slowly turning water gates.',
    towns:['SQL Orchard','Spark Weir','React Grove','Java Court','Cloud Terrace','Observability Reach'],
    sites:sites(['Dataflow Gatehouse','Technology Seed Library','Southern Waterwheel Conservatory']),
    land:'#9caf7b',terrain:'#718e70',rock:'#929b83',stone:'#ced5bc',wood:'#6d5238',metal:'#637c64',glass:'#245c65',growth:'#337041',water:'#238fa1',homes:['#91af66','#d4b66d','#438d79','#87b6b9'],
  },
};
export function realmDesign(stop:Pick<TransitStop,'worldKind'>){return stop.worldKind?realmDesigns[stop.worldKind]:null}
export function realmSiteDistance(stop:Pick<TransitStop,'worldKind'>,radius:number,normal:T.Vector3){
  const design=realmDesign(stop);if(!design)return Infinity;
  return Math.min(...design.sites.map(site=>Math.acos(T.MathUtils.clamp(normal.dot(site.direction),-1,1))*radius-site.radius));
}
export function realmApproachDistance(stop:Pick<TransitStop,'worldKind'>,radius:number,normal:T.Vector3){
  if(!stop.worldKind)return Infinity;
  const latitude=T.MathUtils.clamp(Math.atan2(normal.y,normal.x*Math.cos(.48)+normal.z*Math.sin(.48)),1.05,Math.PI/2);
  return Math.acos(T.MathUtils.clamp(normal.dot(direction(latitude,.48)),-1,1))*radius;
}
const peaks={
  research:[[.72,1.57],[-1.12,2.68],[.94,4.7],[-.26,3.65]],
  foundry:[[.86,1.55],[-.97,2.6],[.83,4.75],[-.25,.55]],
  skills:[[.89,1.48],[-1.05,2.64],[.91,4.72],[-.22,3.69]],
} as const;
const ridges=Object.fromEntries(Object.entries(peaks).map(([kind,positions])=>[kind,positions.map(([latitude,longitude])=>({
  normal:direction(latitude,longitude),east:new T.Vector3(-Math.sin(longitude),0,Math.cos(longitude)),north:direction(latitude+Math.PI/2,longitude),
}))])) as Record<PlanetWorldKind,{normal:T.Vector3;east:T.Vector3;north:T.Vector3}[]>;
export function realmRelief(kind:PlanetWorldKind,normal:T.Vector3){
  let height=0;
  for(const peak of ridges[kind]){
    if(normal.dot(peak.normal)<.75)continue;
    if(kind==='research'){
      const ridge=Math.max(0,1-Math.hypot(normal.dot(peak.east)/.2,normal.dot(peak.north)/.48));
      height+=38*ridge**1.35;
    }else{
      const ridge=Math.max(0,1-Math.acos(T.MathUtils.clamp(normal.dot(peak.normal),-1,1))/.48);
      height+=kind==='foundry'
        ?7*T.MathUtils.smoothstep(ridge,0,.18)+10*T.MathUtils.smoothstep(ridge,.35,.53)+13*T.MathUtils.smoothstep(ridge,.72,.9)
        :5*T.MathUtils.smoothstep(ridge,0,.26)+6*T.MathUtils.smoothstep(ridge,.34,.59)+9*T.MathUtils.smoothstep(ridge,.66,.96);
    }
  }
  return height;
}
