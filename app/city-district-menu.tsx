'use client';
import {ArrowUpRight,Building2} from 'lucide-react';
import {cityDistricts,type CityDistrictKind} from './city-districts';

export function CityDistrictMenu({visit,disabled=false}:{visit:(id:CityDistrictKind)=>void;disabled?:boolean}){
  return <section className="city-district-menu" aria-label="Motherboard districts"><h3>Motherboard Districts</h3>
    {cityDistricts.map(district=><button key={district.id} disabled={disabled} onClick={()=>visit(district.id)}><Building2 size={17}/><span><strong>{district.name}</strong><small>{district.landmark}</small></span><ArrowUpRight size={15}/></button>)}
  </section>;
}