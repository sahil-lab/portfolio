import type {TransitMode} from './transit-config';
export type TransitStatus={current:number;mode:TransitMode|null;destination:number;progress:number;driving:boolean;nearMetro:boolean;nearRocket:boolean;visited:string[]};
export const emptyTransit:TransitStatus={current:0,mode:null,destination:1,progress:0,driving:false,nearMetro:false,nearRocket:false,visited:['motherboard']};
