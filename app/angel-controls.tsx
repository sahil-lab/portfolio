'use client';
import {useEffect,useRef,type KeyboardEvent,type ReactNode} from 'react';
import {ArrowDown,ArrowUp,ArrowDownToLine,ArrowUpFromLine,Feather,Footprints,Navigation,UserRound,Zap} from 'lucide-react';
import {transitStops} from './transit-config';
import type {AngelFlightStatus} from './angel-flight';

function HoldControl({label,children,disabled,onHold,pressed}:{label:string;children:ReactNode;disabled:boolean;onHold:(active:boolean)=>void;pressed?:boolean}){
 const callback=useRef(onHold);useEffect(()=>{callback.current=onHold},[onHold]);
 useEffect(()=>{const release=()=>callback.current(false);addEventListener('blur',release);return()=>{release();removeEventListener('blur',release)}},[]);
 useEffect(()=>{if(disabled)callback.current(false)},[disabled]);
 return <button type="button" title={label} aria-label={label} aria-pressed={pressed} disabled={disabled}
  onPointerDown={event=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);callback.current(true)}}
  onPointerUp={()=>callback.current(false)} onPointerCancel={()=>callback.current(false)} onLostPointerCapture={()=>callback.current(false)} onBlur={()=>callback.current(false)}
  onKeyDown={event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();event.stopPropagation();callback.current(true)}}} onKeyUp={event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();callback.current(false)}}}>{children}</button>;
}
function keepButtonActivation(event:KeyboardEvent<HTMLButtonElement>){if(event.key===' '||event.key==='Enter')event.stopPropagation()}
export function AngelControls({status,disabled,canEnter,switchMode,lift,boost,roam,travel,land,takeoff,groundMode,destination,setDestination}:{status:AngelFlightStatus;disabled:boolean;canEnter:boolean;switchMode:(enabled:boolean)=>void;lift:(value:number)=>void;boost:(enabled:boolean)=>void;roam:(enabled:boolean)=>void;travel:(destination:number)=>void;land:()=>void;takeoff:()=>void;groundMode:(mode:'walk'|'run')=>void;destination:number;setDestination:(destination:number)=>void}){
 const grounded=status.locomotion==='grounded',transitioning=status.locomotion==='landing'||status.locomotion==='taking-off';
 return <section className="angel-controls" aria-label="Character and flight controls">
  <fieldset className="character-modes" aria-label="Character mode">
   <button type="button" aria-label="Main character mode" title="Main character" aria-pressed={!status.controlled} disabled={disabled||!status.controlled} onKeyDown={keepButtonActivation} onClick={event=>{switchMode(false);if(event.detail>0)event.currentTarget.blur()}}><UserRound size={17}/><span>Main</span></button>
   <button type="button" aria-label="Angel mode" title={status.error?'Angel unavailable':!status.ready?'Angel loading':'Control the angel'} aria-pressed={status.controlled} disabled={disabled||!status.ready||!canEnter&&!status.controlled} onKeyDown={keepButtonActivation} onClick={event=>{switchMode(true);if(event.detail>0)event.currentTarget.blur()}}><Feather size={17}/><span>Angel</span></button>
  </fieldset>
  {!status.ready&&<output className="angel-load-status">{status.error?'Angel unavailable':'Loading angel'}</output>}
  {status.controlled&&<>
  <div className="angel-location"><span>{transitStops[status.destination??status.current]?.name}</span><output>{status.locomotion==='landing'?'Landing':status.locomotion==='taking-off'?'Taking off':grounded?status.pace==='idle'?'Standing':status.pace==='run'?'Running':'Walking':status.destination!==null?`${status.progress}%`:status.roaming?'Free roam':`${status.speed} u/s`}</output></div>
  <fieldset className="angel-ground-modes" aria-label="Angel locomotion">
  <button type="button" className="angel-land" aria-label={grounded?'Take off':'Land angel'} title={grounded?'Take off':status.canLand?'Land on nearby ground':'Move above land to land'} disabled={disabled||transitioning||!grounded&&!status.canLand} onKeyDown={keepButtonActivation} onClick={event=>{if(grounded)takeoff();else land();if(event.detail>0)event.currentTarget.blur()}}>{grounded?<ArrowUpFromLine size={16}/>:<ArrowDownToLine size={16}/>}<span>{grounded?'Take off':'Land'}</span></button>
  {grounded&&<><button type="button" aria-label="Angel walk" title="Walk" aria-pressed={status.groundMode==='walk'} disabled={disabled} onKeyDown={keepButtonActivation} onClick={event=>{groundMode('walk');if(event.detail>0)event.currentTarget.blur()}}><Footprints size={16}/><span>Walk</span></button><button type="button" aria-label="Angel run" title="Run" aria-pressed={status.groundMode==='run'} disabled={disabled} onKeyDown={keepButtonActivation} onClick={event=>{groundMode('run');if(event.detail>0)event.currentTarget.blur()}}><Zap size={16}/><span>Run</span></button></>}
  </fieldset>
  {!grounded&&<fieldset className="angel-flight-buttons" aria-label="Flight controls" disabled={transitioning}>
    <HoldControl label="Ascend" disabled={disabled} onHold={active=>lift(active?1:0)}><ArrowUp size={18}/></HoldControl>
    <HoldControl label="Descend" disabled={disabled} onHold={active=>lift(active?-1:0)}><ArrowDown size={18}/></HoldControl>
    <HoldControl label="Boost" disabled={disabled} onHold={boost} pressed={status.boosting}><Zap size={18}/></HoldControl>
    <label className="angel-roam"><input type="checkbox" checked={status.roaming} disabled={disabled} onChange={event=>roam(event.target.checked)}/>Free roam</label>
  </fieldset>}
   <div className="angel-destination"><select aria-label="Angel destination" value={destination} disabled={disabled||transitioning} onChange={event=>setDestination(Number(event.target.value))}>{transitStops.map((stop,index)=><option key={stop.id} value={index}>{stop.name}</option>)}</select><button type="button" aria-label="Fly to selected planet" title="Fly to selected planet" disabled={disabled||transitioning} onClick={()=>travel(destination)}><Navigation size={18}/></button></div>
  </>}
 </section>;
}