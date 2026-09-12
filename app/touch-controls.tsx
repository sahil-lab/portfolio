'use client';
import {useEffect,useRef} from 'react';
export function TouchControls({onMove,disabled=false}:{onMove:(x:number,z:number)=>void;disabled?:boolean}){
  const active=useRef<number|null>(null),knob=useRef<HTMLSpanElement>(null),move=useRef(onMove);useEffect(()=>{move.current=onMove},[onMove]);
  const clear=()=>{active.current=null;move.current(0,0);if(knob.current)knob.current.style.transform='translate(0px,0px)'};
  useEffect(()=>{if(disabled)clear()},[disabled]);
  useEffect(()=>{const hidden=()=>{if(document.hidden)clear()};window.addEventListener('blur',clear);document.addEventListener('visibilitychange',hidden);return()=>{window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',hidden);clear()}},[]);
  return <fieldset disabled={disabled} className="touch-joystick" aria-label="Movement joystick" onPointerDown={e=>{if(disabled||active.current!==null)return;e.preventDefault();active.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{if(disabled||active.current!==e.pointerId)return;e.preventDefault();const r=e.currentTarget.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/42,z=(e.clientY-r.top-r.height/2)/42;const length=Math.max(1,Math.hypot(x,z));x/=length;z/=length;move.current(x,z);if(knob.current)knob.current.style.transform=`translate(${x*35}px,${z*35}px)`}} onPointerUp={e=>{if(active.current===e.pointerId)clear()}} onPointerCancel={e=>{if(active.current===e.pointerId)clear()}} onLostPointerCapture={e=>{if(active.current===e.pointerId)clear()}}><span ref={knob}/><small>MOVE</small></fieldset>;
}
