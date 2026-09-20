'use client';
import {useState} from 'react';
import {TrainFront,Rocket,Car,Orbit,Check} from 'lucide-react';
import {transitStops,type TransitMode} from './transit-config';
import type {TransitStatus} from './transit-world';
export function TransitPanel({status,start,hub,arrive}:{status:TransitStatus;start:(destination:number,mode:TransitMode)=>void;hub:()=>void;arrive:()=>void}){
 const [choice,setChoice]=useState(1);const selected=choice===status.current?(status.current+1)%transitStops.length:choice;
 return <section className="transit-panel"><p className="eyebrow">NEIGHBOR WORLDS / ORBITAL LINE</p><h2>The computer is bigger<br/>than you thought.</h2><p>Ride above the motherboard to three satellite worlds. Walk their gardens, drive a rover, and return by metro or ion rocket.</p>
 <div className="transit-current"><Orbit size={20}/><span>{status.mode?'Travelling to '+transitStops[status.destination].name:transitStops[status.current].name}</span><b>{status.mode?status.progress+'%':'STATION '+(status.current+1)}</b></div>
 {status.mode?<><progress max="100" value={status.progress}/><button className="transit-primary" onClick={arrive}>Arrive now · skip travel motion</button></>:<>
 <h3>Choose your next stop</h3><div className="planet-destinations">{transitStops.map((stop,i)=><button key={stop.id} aria-pressed={selected===i} disabled={status.current===i||status.driving} onClick={()=>setChoice(i)} style={{'--planet-color':stop.color} as React.CSSProperties}><span className="planet-number">0{i+1}</span><span><strong>{stop.name}</strong><small>{stop.subtitle}</small></span>{status.current===i?<small>HERE</small>:status.visited.includes(stop.id)?<Check size={17} aria-label="Visited"/>:null}</button>)}</div>
 <div className="boarding-actions"><button className="transit-primary" disabled={!status.nearMetro||status.driving} onClick={()=>start(selected,'metro')}><TrainFront size={20}/> Board metro <small>15 sec · scenic route</small></button><button disabled={!status.nearRocket||status.driving} onClick={()=>start(selected,'rocket')}><Rocket size={20}/> Launch rocket <small>10 sec · express</small></button></div>
 <p className="boarding-help">{status.driving?'Park the rover with E before boarding.':status.nearMetro?'You are at the metro platform. Choose a destination and board.':status.nearRocket?'You are at the rocket pad. Choose a destination and launch.':'Walk to a platform or rocket pad to board. Look for the cream canopy and glowing launch ring.'}</p>
 {status.current===0&&!status.nearMetro&&!status.nearRocket&&<button onClick={hub}>Go to Motherboard Central</button>}
 </>}
 <div className="rover-tip"><Car size={26}/><p><strong>Your rover is waiting.</strong><br/>Press E beside a parked car. WASD, arrow keys, or the joystick drive it; E parks it and lets you step out.</p></div>
 <p className="transit-footnote">These are fictional satellite components inside the living computer. Landing decks use stable local gravity. Your portfolio and delivery progress travel with you.</p></section>
}
