'use client';

import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,Cpu,Heart,Pause,Play,Sparkles,Package,Orbit} from 'lucide-react';
import './world-loading.css';

export function loadingStage(prepared:number){
 if(prepared>=6)return {label:'Waking up the neighborhood',detail:'A place for every little possibility.',step:2};
 if(prepared>0)return {label:'Unpacking the little things',detail:'Every window. Every winding street.',step:1};
 return {label:'Gathering a little wonder',detail:'Your corner of the universe is on its way.',step:0};
}

export function completedPreparations(value:number){return Number.isFinite(value)?Math.max(0,Math.min(6,Math.floor(value))):0}

export function WorldLoading({ready,prepared=0,reducedMotion=false}:{ready:boolean;prepared?:number;reducedMotion?:boolean}){
 const [dismissed,setDismissed]=useState(false),[paused,setPaused]=useState(false),[love,setLove]=useState(0);
 const stageRef=useRef<HTMLDivElement>(null),completed=completedPreparations(prepared),stage=loadingStage(completed);
 useEffect(()=>{
  const element=stageRef.current;if(!element||paused||reducedMotion||ready)return;
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const reset=()=>{element.style.setProperty('--gaze-x','0px');element.style.setProperty('--gaze-y','0px')};
  const look=(event:PointerEvent)=>{
   if(preference.matches||event.pointerType==='touch')return;
   const bounds=element.getBoundingClientRect();
   element.style.setProperty('--gaze-x',String(Math.max(-1,Math.min(1,(event.clientX-bounds.left)/bounds.width*2-1))*4)+'px');
   element.style.setProperty('--gaze-y',String(Math.max(-1,Math.min(1,(event.clientY-bounds.top)/bounds.height*2-1))*3)+'px');
  };
  element.addEventListener('pointermove',look,{passive:true});element.addEventListener('pointerleave',reset);
  return()=>{element.removeEventListener('pointermove',look);element.removeEventListener('pointerleave',reset);reset()};
 },[paused,reducedMotion,ready]);
 useEffect(()=>{
  if(!ready)return;
  const timeout=window.setTimeout(()=>setDismissed(true),reducedMotion?0:380);
  return()=>window.clearTimeout(timeout);
 },[ready,reducedMotion]);
 if(dismissed)return null;
 return <section className="kingdom-loader" data-ready={ready} data-still={paused||reducedMotion} data-phase={stage.step} aria-label="Loading the Living Computer Kingdom" aria-hidden={ready||undefined} inert={ready}>
  <header className="kingdom-loader-header"><span className="kingdom-loader-wordmark"><span className="kingdom-loader-seal"><Cpu size={23} aria-hidden="true"/></span><span>Sahil&apos;s little universe<small>EST. IN CURIOSITY</small></span></span><span className="kingdom-loader-header-right"><span className="kingdom-loader-boot"><span/>KINGDOM OS</span><button type="button" className="kingdom-loader-motion" aria-label={paused?'Resume loading animation':'Pause loading animation'} title={paused?'Resume loading animation':'Pause loading animation'} aria-pressed={paused} disabled={reducedMotion} onClick={()=>setPaused(value=>!value)}>{paused||reducedMotion?<Play size={17}/>:<Pause size={17}/>}</button></span></header>
  <div className="kingdom-loader-body">
  <div className="kingdom-loader-heading"><span className="kingdom-loader-eyebrow"><span/>A LITTLE WORLD, COMING TO LIFE<span/></span><h2>The Living Computer<br/><em>Kingdom<span className="kingdom-loader-title-star" aria-hidden="true"><Sparkles size={25}/></span></em></h2></div>
  <div className="kingdom-loader-stage" ref={stageRef} data-loved={love>0}>
    <div className="kingdom-loader-orbit" aria-hidden="true"/>
  <div className="kingdom-loader-scene"><img src="/assets/loading/pocket-kingdom-v2.webp" alt="A crowned mint computer, tiny bakery, clock house and tea shop on a floating garden motherboard" width="1200" height="800" fetchPriority="high" decoding="async" draggable="false"/><span className="kingdom-loader-screen" aria-hidden="true"><span className="kingdom-loader-gaze"><span className="kingdom-loader-eyes"><span/><span/></span><span className="kingdom-loader-cheeks"/><span className="kingdom-loader-smile"/></span></span></div>
   <span className="kingdom-loader-greeting" aria-hidden="true">{love?'Love received!':'Oh, hello there.'}<Heart size={12} fill={love?'currentColor':'none'}/></span>
   <span className="kingdom-loader-postmark" aria-hidden="true"><Orbit size={22}/><em>Big dreams.<br/>Tiny world.</em></span>
   <span className="kingdom-loader-letter" aria-hidden="true"><span><Heart size={10} fill="currentColor"/></span></span>
    <span className="kingdom-loader-spark kingdom-loader-spark-one" aria-hidden="true"><Sparkles size={25}/></span><span className="kingdom-loader-spark kingdom-loader-spark-two" aria-hidden="true"><Sparkles size={18}/></span>
    <button type="button" className="kingdom-loader-love" aria-label="Send the kingdom a little love" title="Send the kingdom a little love" onClick={()=>setLove(value=>value+1)}><Heart size={20} fill={love?'currentColor':'none'}/></button>
    {love>0&&<span key={love} className="kingdom-loader-love-burst" aria-hidden="true"><Heart size={17} fill="currentColor"/><Heart size={12} fill="currentColor"/><Heart size={14} fill="currentColor"/></span>}
   </div>
    <output className="kingdom-loader-status" aria-live="polite" aria-atomic="true"><span className="kingdom-loader-status-label">{ready?'Your little world is ready':stage.label}<span className="kingdom-loader-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></span><span className="kingdom-loader-detail">{stage.detail}</span></output>
    <div className="kingdom-loader-track"><div className="kingdom-loader-preparations"><span><Package size={13}/>{completed===6?'World assembly in progress':'Unpacking the kingdom'}</span><span>{completed}<span> / 6</span></span></div><progress className="kingdom-loader-progress" value={completed} max={6} aria-label="Startup preparations completed"/><div className="kingdom-loader-cells" aria-hidden="true">{Array.from({length:6},(_,index)=><span key={index} data-complete={index<completed}><span/></span>)}</div><span className="kingdom-loader-track-caption">{completed===6?'Lighting up your corner of the universe.':'Every little piece has a place.'}</span></div>
  </div>
  <footer className="kingdom-loader-footer"><span><Heart size={12}/>A tiny hello, from me to you.</span><nav aria-label="While the kingdom loads"><a href="/projects">Projects<ArrowUpRight size={14}/></a><a href="/resume">Resume<ArrowUpRight size={14}/></a></nav></footer>
 </section>;
}
