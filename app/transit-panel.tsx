'use client';
import {useState} from 'react';
import {TrainFront,Rocket,Car,Orbit,Check,ChartNoAxesCombined,Newspaper} from 'lucide-react';
import {transitStops,type TransitMode} from './transit-config';
import type {TransitStatus} from './transit-world';
import {civilizationFor,civilizations} from './civilization-config';
import {CityDistrictMenu} from './city-district-menu';
import type {CityDistrictKind} from './city-districts';
export function TransitPanel({status,start,hub,arrive,bulletins,observe,city}:{status:TransitStatus;start:(destination:number,mode:TransitMode)=>void;hub:()=>void;arrive:()=>void;bulletins?:(kind:'markets'|'news')=>void;observe?:(destination:number)=>void;city?:(id:CityDistrictKind)=>void}){
 const [choice,setChoice]=useState(1);const selected=choice===status.current?(status.current+1)%transitStops.length:choice;
 return <section className="transit-panel"><p className="eyebrow">NEIGHBOR WORLDS / ORBITAL LINE</p><h2>Orbital Atlas</h2><p>{transitStops.length-1} satellite worlds / Motherboard Central</p>
 <div className="transit-current"><Orbit size={20}/><span>{status.mode?'Travelling to '+transitStops[status.destination].name:transitStops[status.current].name}</span><b>{status.mode?status.progress+'%':'STATION '+(status.current+1)}</b></div>
 {city&&!status.mode&&<CityDistrictMenu visit={city} disabled={status.driving}/>}
 {status.mode?<><progress max="100" value={status.progress}/><button className="transit-primary" onClick={arrive}>Arrive now · skip travel motion</button></>:<>
 <h3>Choose your next stop</h3><div className="planet-destinations">{transitStops.map((stop,i)=><button key={stop.id} aria-pressed={selected===i} disabled={status.current===i||status.driving} onClick={()=>setChoice(i)} style={{'--planet-color':stop.color} as React.CSSProperties}><span className="planet-number">{String(i+1).padStart(2,'0')}</span><span><strong>{stop.name}</strong><small>{stop.subtitle}</small></span>{status.current===i?<small>HERE</small>:status.visited.includes(stop.id)?<Check size={17} aria-label="Visited"/>:null}</button>)}</div>
 {selected>0&&observe&&<button className="civilization-observe" onClick={()=>observe(selected)}><Orbit size={19}/> Observe from orbit</button>}
 {civilizationFor(transitStops[selected])&&<a className="civilization-profile" href={civilizations[civilizationFor(transitStops[selected])!].url} target="_blank" rel="noopener noreferrer">{civilizations[civilizationFor(transitStops[selected])!].brand} / {selected===1?'sahil-lab':'Sahil Upadhyay'} <span aria-hidden="true">↗</span></a>}
 <div className="boarding-actions"><button className="transit-primary" disabled={!status.nearMetro||status.driving} onClick={()=>start(selected,'metro')}><TrainFront size={20}/> Board metro <small>15 sec · scenic route</small></button><button disabled={!status.nearRocket||status.driving} onClick={()=>start(selected,'rocket')}><Rocket size={20}/> Launch rocket <small>10 sec · express</small></button></div>
 <p className="boarding-help">{status.driving?'Park the rover with E before boarding.':status.nearMetro?'You are at the metro platform. Choose a destination and board.':status.nearRocket?'You are at the rocket pad. Choose a destination and launch.':'Walk to a platform or rocket pad to board. Look for the cream canopy and glowing launch ring.'}</p>
 {!status.nearMetro&&!status.nearRocket&&<button onClick={hub}>{status.current===0?'Go to Motherboard Central':'Return to landing station'}</button>}
 </>}
 <div className="rover-tip"><Car size={26}/><p><strong>Your rover is waiting.</strong><br/>Press E beside a parked car. WASD, arrow keys, or the joystick drive it; E parks it and lets you step out.</p></div>
 {bulletins&&!status.mode&&<><h3>Motherboard Commons</h3><div className="boarding-actions"><button disabled={status.driving} onClick={()=>bulletins('markets')}><ChartNoAxesCombined size={20}/> Market board</button><button disabled={status.driving} onClick={()=>bulletins('news')}><Newspaper size={20}/> News board</button></div></>}
 <section className="civilization-passport"><h3>Kingdom Passport</h3>{(['github','linkedin'] as const).map((brand,index)=><span key={brand} data-stamped={status.visited.includes(index===0?'copper':'prism')}>{status.visited.includes(index===0?'copper':'prism')?<Check size={14}/>:<Orbit size={14}/>} {status.visited.includes(index===0?'copper':'prism')?civilizations[brand].badge:civilizations[brand].name.toUpperCase()}</span>)}</section>
 <p className="transit-footnote">Motherboard Central / Orbital transit authority</p></section>
}
