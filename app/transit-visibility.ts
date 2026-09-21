import {transitStops,type Point3} from './transit-config';

export function visibleTransitStops(position:Point3,current:number|null=null,observed:Iterable<number>=[]):Set<number>{
 const visible=new Set(observed);
 if(current!==null)visible.add(current);
 transitStops.forEach((stop,index)=>{
  if((position.x-stop.x)**2+(position.y-stop.y)**2+(position.z-stop.z)**2<200**2)visible.add(index);
 });
 return visible;
}
