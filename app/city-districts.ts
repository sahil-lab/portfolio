import {goldMonumentSite} from './gold-monument-site';

export type CityDistrictKind='lantern'|'harbor'|'archive'|'foundry'|'garden'|'observatory';
export type CityDistrict={id:CityDistrictKind;name:string;x:number;z:number;accent:string;role:string;landmark:string};

export const cityDistricts:readonly CityDistrict[]=[
  {id:'lantern',name:'Lantern Quarter',x:150,z:79,accent:'#d29778',role:'The inhabited heart of the motherboard',landmark:'The Signal House'},
  {id:'harbor',name:'Portside Exchange',x:-250,z:279,accent:'#74aaa4',role:'Packets arrive, get sorted, and find their next connection',landmark:'The Connector Hall'},
  {id:'archive',name:'Memory Terraces',x:150,z:-421,accent:'#94ac86',role:'Reading rooms above a quiet reservoir of temporary thoughts',landmark:'The Reading Aqueduct'},
  {id:'foundry',name:'Copperworks',x:-250,z:-621,accent:'#c68b70',role:'Repair courts and workshops beneath the cooling chimneys',landmark:'The Assembly Crane'},
  {id:'garden',name:'Cache Gardens Promenade',x:250,z:679,accent:'#9bb584',role:'Pocket gardens, conservatories, and slower streets',landmark:'The Seed Library'},
  {id:'observatory',name:'Clockwork Heights',x:-150,z:1079,accent:'#8eafbe',role:'A high walking circuit overlooking the lower neighborhoods',landmark:'The Orrery Terrace'},
];

export const lowerWorks={x:-250,z:-639,width:14,depth:36,floor:-3.2,startZ:-619,endZ:-639} as const;
export const inLowerWorks=(x:number,z:number)=>Math.abs(x-lowerWorks.x)<lowerWorks.width/2&&Math.abs(z-lowerWorks.z)<lowerWorks.depth/2;

export function nearestCityDistrict(x:number,z:number){
  return cityDistricts.reduce((nearest,district)=>Math.hypot(x-district.x,z-district.z)<Math.hypot(x-nearest.x,z-nearest.z)?district:nearest,cityDistricts[0]);
}

export function cityBlockPlan(column:number,row:number){
  const kind=(column*7+row*3)%4;
  const courtyard=[[-27,-23],[0,-27],[27,-23],[-27,7],[27,7],[-27,29],[0,29],[27,29]];
  const lane=[[-28,-28],[-28,-4],[-28,23],[27,-28],[27,-4],[27,23],[0,-30],[0,30]];
  const crescent=[[-28,-25],[-5,-29],[22,-25],[-29,1],[29,3],[-20,28],[9,29],[29,26]];
  const terraces=[[-26,-25],[0,-25],[26,-25],[-27,1],[26,2],[-26,28],[0,29],[27,28]];
  return [courtyard,lane,crescent,terraces][kind].map(([x,z],index)=>({
    x,z,scale:1.45+((column*3+row+index)%4)*.14,
    yaw:Math.abs(x)>Math.abs(z)?(x<0?Math.PI/2:-Math.PI/2):(z<0?0:Math.PI),
    variant:(column*3+row+index)%6,
  }));
}

export function cityDistrictReserved(x:number,z:number){
  return Math.abs(goldMonumentSite.x-x)<1&&Math.abs(goldMonumentSite.z-z)<1||cityDistricts.some(district=>Math.abs(district.x-x)<1&&Math.abs(district.z-z)<1);
}