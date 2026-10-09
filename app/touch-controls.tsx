'use client';
import {useLayoutEffect,useRef} from 'react';
import {bindMovementJoystick} from './game-input';
export function TouchControls({onMove,disabled=false}:{onMove:(x:number,z:number)=>void;disabled?:boolean}){
  const surface=useRef<HTMLFieldSetElement>(null),knob=useRef<HTMLSpanElement>(null),move=useRef(onMove),binding=useRef<ReturnType<typeof bindMovementJoystick>|null>(null);
  useLayoutEffect(()=>{move.current=onMove},[onMove]);
  useLayoutEffect(()=>{
    if(!surface.current||!knob.current)return;
    const input=bindMovementJoystick(surface.current,knob.current,(x,z)=>move.current(x,z));binding.current=input;
    return()=>{binding.current=null;input.dispose()};
  },[]);
  useLayoutEffect(()=>{binding.current?.setEnabled(!disabled)},[disabled]);
  return <fieldset ref={surface} disabled={disabled} className="touch-joystick" aria-label="Movement joystick"><span ref={knob}/><small>MOVE</small></fieldset>;
}
