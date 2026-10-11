'use client';

import {useEffect,useRef} from 'react';
import {X} from 'lucide-react';
import {BengaluruPlanetView} from './bengaluru-planet-view';

/** Full-screen in-world deck for the Bengaluru planet; the kingdom pauses underneath while it is open. */
export function BengaluruPanel({close}:{close:()=>void}){
 const closeButton=useRef<HTMLButtonElement>(null),latestClose=useRef(close);
 useEffect(()=>{latestClose.current=close},[close]);
 // Registered once: a trusted keydown runs microtasks between window listeners, so a listener that is
 // re-registered on every parent render could be removed mid-dispatch and never see the Escape press.
 useEffect(()=>{
  const focus=()=>{const overlay=closeButton.current?.closest('.blr-overlay');if(overlay&&!overlay.contains(document.activeElement))closeButton.current?.focus()};
  focus();
  // The HUD sheet restores focus to its trigger after its exit animation; take it back once that has happened.
  const timer=setTimeout(focus,400);
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')latestClose.current()};
  addEventListener('keydown',onKey);return()=>{clearTimeout(timer);removeEventListener('keydown',onKey)};
 },[]);
 return <dialog open className="blr-overlay" aria-modal="true" aria-labelledby="blr-overlay-title">
  <div className="blr-overlay-bar"><span id="blr-overlay-title">Orbital deck · Bengaluru - The Garden City</span><button ref={closeButton} type="button" onClick={close}><X size={18} aria-hidden="true"/> Return to the kingdom</button></div>
  <BengaluruPlanetView embedded/>
 </dialog>;
}

export default BengaluruPanel;
