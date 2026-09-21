import {projects} from './portfolio';
export const motherboardDimensions={width:1100,depth:2640,centerZ:79,scale:10} as const;
export const motherboardBounds={minX:-550,maxX:550,minZ:-1241,maxZ:1399} as const;
export const cityArrival={x:150,y:.8,z:103};
export const cityCameraView=(aspect:number)=>({yaw:.08,pitch:.26,zoom:Math.max(90,Math.min(180,74/aspect)),focusHeight:12.5});
export type District={name:string;subtitle:string;x:number;z:number;color:string};
export const districts:District[]=[
 {name:'Bootloader Workshop',subtitle:'Somewhere small. At the start of something big.',x:0,z:19,color:'#b3d69d'},
 {name:'CPU Core Cities',subtitle:'A thousand little tasks. A city that never sleeps.',x:-20,z:-6,color:'#ffb65c'},
 {name:'RAM Library',subtitle:'Make a little space for a fleeting thought.',x:20,z:-8,color:'#6cdbc5'},
 {name:'GPU Rendering District',subtitle:'Where geometry learns to dream in color.',x:30,z:18,color:'#d597ef'},
 {name:'Network Railway',subtitle:'Every packet has somewhere to be.',x:-29,z:19,color:'#73b7ee'},
 {name:'Database Vaults',subtitle:'Below the surface, nothing is lost.',x:0,z:39,color:'#e3bc76'},
 {name:'Kubernetes Sky Clusters',subtitle:'Little homes. Resilient neighborhoods.',x:0,z:-28,color:'#91c8f5'},
 {name:'Kafka Conveyor Railway',subtitle:'The world keeps moving. The log remembers.',x:31,z:-30,color:'#e89878'},
];

export const workshopSpawn={x:0,y:.8,z:24};
export const routes=districts.slice(1).map(d=>({id:'workshop-'+d.name,from:{x:0,z:19},to:{x:d.x,z:d.z},width:3}));

export type Destination={id:string;label:string;kind:'district'|'project';x:number;y:number;z:number};
export const districtDestinations:Destination[]=districts.map((d,i)=>({id:'district-'+i,label:d.name,kind:'district',x:d.x,y:.8,z:d.z+5}));
export const destinations:Destination[]=[...districtDestinations,...projects.map(p=>({id:p.id,label:p.name,kind:'project' as const,x:p.building.x,y:.8,z:p.building.z+7.6}))];
