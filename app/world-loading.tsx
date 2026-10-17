'use client';

import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import {ArrowUpRight,Cpu,Heart,Pause,Play,Sparkles,Star,Zap} from 'lucide-react';
import './world-loading.css';

export const loadingExitMs=180;
const pieceIcons=[Heart,Sparkles,Star];
const phaseLines=['Zzz... warming up the board.','Ooh, the traces are lighting!','Almost awake. Hi, hi!'];
const boopLines=['Eek! Hi there!','Hehe, that tickles!','Boop! Hello again.','Okay, okay, I am awake!','You found my power button!'];
/** The six real startup preparations, in the order page.tsx starts them. Completion order comes from the `preparations` prop. */
export const preparationNames=['world runtime','world kit','architecture kit','craft kit','life kit','city shells'];
const satellites=[{name:'copper',color:'#f1d9b0',radius:46,delay:'0s'},{name:'garden',color:'#9dcab4',radius:52,delay:'-6s'},{name:'prism',color:'#79b4ff',radius:58,delay:'-12s'},{name:'petal',color:'#f3b6c6',radius:49,delay:'-18s'},{name:'solstice',color:'#f1d58e',radius:55,delay:'-24s'},{name:'cloud',color:'#9ddce6',radius:61,delay:'-30s'}];
/** Copper traces from the board edges into the chip socket, PCB-style with 45° bends. */
const traces=['M0 180H118L198 260H350','M0 440H138L218 380H350','M300 0V118L380 198V240','M700 0V108L620 188V240','M1000 200H882L802 280H650','M1000 460H862L782 380H650'];
const quietTraces=['M0 300H90L150 360H230V420H290','M1000 330H900L840 270H770V220H710','M450 0V90L500 140V180','M560 620V540L600 500V440','M400 620V560L340 500V470','M0 560H160L230 490'];
const pads:[number,number][]=[[0,180],[0,440],[300,0],[700,0],[1000,200],[1000,460]];
const vias=[[118,180],[198,260],[138,440],[218,380],[300,118],[380,198],[700,108],[620,188],[882,200],[802,280],[862,460],[782,380]];
const confetti=Array.from({length:12},(_,index)=>{const angle=(index*30+8)*Math.PI/180,distance=150+(index%3)*24;return {x:Math.round(Math.cos(angle)*distance),y:Math.round(Math.sin(angle)*distance),turn:index%2?150:-120,icon:index%3}});
const boopBurst=Array.from({length:6},(_,index)=>{const angle=(index*60+30)*Math.PI/180;return {x:Math.round(Math.cos(angle)*78),y:Math.round(Math.sin(angle)*78),turn:index%2?120:-100,icon:index%3}});
const junctionSparks=Array.from({length:8},(_,index)=>({x:Math.round(Math.cos(index*Math.PI/4)*70),y:Math.round(Math.sin(index*Math.PI/4)*42)-30,delay:(index%4)*40}));

function pieceStyle(x:number,y:number,turn:number){return {'--x':x+'px','--y':y+'px','--turn':turn+'deg'} as CSSProperties}

export function bindLoadingPointer(element:HTMLElement){
 const document=element.ownerDocument,view=document.defaultView;if(!view)return ()=>{};
 const preference=view.matchMedia('(prefers-reduced-motion: reduce)');let frame=0,bounds:DOMRect|undefined,horizontal=0,vertical=0;
 const invalidate=()=>{bounds=undefined};
 const reset=()=>{if(frame)view.cancelAnimationFrame(frame);frame=0;bounds=undefined;for(const name of ['--gaze-x','--gaze-y','--tilt-x','--tilt-y'])element.style.removeProperty(name)};
 const paint=()=>{
  frame=0;if(document.hidden||preference.matches)return;
  bounds??=element.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
  const across=Math.max(-1,Math.min(1,(horizontal-bounds.left)/bounds.width*2-1)),down=Math.max(-1,Math.min(1,(vertical-bounds.top)/bounds.height*2-1));
  element.style.setProperty('--gaze-x',across*4+'px');element.style.setProperty('--gaze-y',down*3+'px');element.style.setProperty('--tilt-x',across*5+'deg');element.style.setProperty('--tilt-y',down*-4+'deg');
 };
 const look=(event:PointerEvent)=>{if(preference.matches||document.hidden||event.pointerType==='touch')return;horizontal=event.clientX;vertical=event.clientY;if(!frame)frame=view.requestAnimationFrame(paint)};
 const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(invalidate);observer?.observe(element);
 element.addEventListener('pointermove',look,{passive:true});element.addEventListener('pointerleave',reset);
 view.addEventListener('resize',invalidate,{passive:true});document.addEventListener('scroll',invalidate,{passive:true,capture:true});document.addEventListener('visibilitychange',reset);preference.addEventListener('change',reset);
 return()=>{reset();observer?.disconnect();element.removeEventListener('pointermove',look);element.removeEventListener('pointerleave',reset);view.removeEventListener('resize',invalidate);document.removeEventListener('scroll',invalidate,true);document.removeEventListener('visibilitychange',reset);preference.removeEventListener('change',reset)};
}

export function loadingStage(prepared:number){
 if(prepared>=6)return {label:'Waking up the neighborhood',detail:'A place for every little possibility.',step:2};
 if(prepared>0)return {label:'Unpacking the little things',detail:'Every window. Every winding street.',step:1};
 return {label:'Gathering a little wonder',detail:'Your corner of the universe is on its way.',step:0};
}

export function completedPreparations(value:number){return Number.isFinite(value)?Math.max(0,Math.min(6,Math.floor(value))):0}

export function greetingLine({ready,reaction,boops,step}:{ready:boolean;reaction:'love'|'boop'|null;boops:number;step:number}){
 if(ready)return 'Welcome in! Make yourself at home.';
 if(reaction==='love')return 'Love received!';
 if(reaction==='boop')return boopLines[Math.max(0,boops-1)%boopLines.length];
 return phaseLines[step];
}

/** Boot-log rows: finished preparations in the order they really finished, then whatever is still loading. */
export function bootLog(completed:number,preparations?:readonly string[]){
 if(!preparations)return preparationNames.map((name,index)=>({name,done:index<completed}));
 const done=preparations.filter(name=>preparationNames.includes(name)).slice(0,6);
 return [...done.map(name=>({name,done:true})),...preparationNames.filter(name=>!done.includes(name)).map(name=>({name,done:false}))];
}

export function WorldLoading({ready,prepared=0,preparations,reducedMotion=false,onDismiss}:{ready:boolean;prepared?:number;preparations?:readonly string[];reducedMotion?:boolean;onDismiss?:(dismissed:boolean)=>void}){
 const [dismissed,setDismissed]=useState(false),[paused,setPaused]=useState(false),[loves,setLoves]=useState(0),[boops,setBoops]=useState(0),[reaction,setReaction]=useState<'love'|'boop'|null>(null);
 const stageRef=useRef<HTMLDivElement>(null),mascotRef=useRef<HTMLDivElement>(null),completed=completedPreparations(prepared),stage=loadingStage(completed),still=paused||reducedMotion;
 useEffect(()=>{
  const element=stageRef.current;if(!element||paused||reducedMotion||ready)return;
    return bindLoadingPointer(element);
 },[paused,reducedMotion,ready]);
 useLayoutEffect(()=>{
  if(!ready)return;
    const timeout=window.setTimeout(()=>{setDismissed(true);onDismiss?.(true)},reducedMotion||matchMedia('(prefers-reduced-motion: reduce)').matches?0:loadingExitMs);
  return()=>window.clearTimeout(timeout);
   },[ready,reducedMotion,onDismiss]);
 const love=()=>{setLoves(value=>value+1);setReaction('love')};
 const boop=()=>{
  setBoops(value=>value+1);setReaction('boop');
  if(!still)mascotRef.current?.animate([{transform:'scale(1,1)'},{transform:'scale(1.05,.92)',offset:.3},{transform:'scale(.97,1.04)',offset:.6},{transform:'scale(1,1)'}],{duration:520,easing:'ease-out'});
 };
 if(dismissed)return null;
 const greeting=greetingLine({ready,reaction,boops,step:stage.step}),log=bootLog(completed,preparations),firstPending=log.findIndex(row=>!row.done);
 return <section className="kingdom-loader" style={{'--loader-exit-duration':loadingExitMs+'ms'} as CSSProperties} data-ready={ready} data-still={still} data-phase={stage.step} aria-label="Loading the Living Computer Kingdom" aria-hidden={ready||undefined} inert={ready}>
  <div className="kingdom-loader-backdrop" aria-hidden="true"><span className="kingdom-loader-stars"/><span className="kingdom-loader-dawn"/></div>
  <header className="kingdom-loader-header"><span className="kingdom-loader-wordmark"><span className="kingdom-loader-seal"><Cpu size={23} aria-hidden="true"/></span><span>Sahil&apos;s little universe<small>EST. IN CURIOSITY</small></span></span><span className="kingdom-loader-header-right"><span className="kingdom-loader-boot"><span/>KINGDOM OS · {ready?'ONLINE':'BOOTING'}</span><button type="button" className="kingdom-loader-motion" aria-label={paused?'Resume loading animation':'Pause loading animation'} title={paused?'Resume loading animation':'Pause loading animation'} aria-pressed={paused} disabled={reducedMotion} onClick={()=>setPaused(value=>!value)}>{paused||reducedMotion?<Play size={17}/>:<Pause size={17}/>}</button></span></header>
  <div className="kingdom-loader-body">
   <div className="kingdom-loader-heading"><span className="kingdom-loader-eyebrow"><span/>POWERING ON A LITTLE WORLD<span/></span><h2><span className="kingdom-loader-word" style={{'--i':0} as CSSProperties}>The</span> <span className="kingdom-loader-word" style={{'--i':1} as CSSProperties}>Living</span> <span className="kingdom-loader-word" style={{'--i':2} as CSSProperties}>Computer</span><br/><em className="kingdom-loader-word" style={{'--i':3} as CSSProperties}>Kingdom<span className="kingdom-loader-title-star" aria-hidden="true"><Sparkles size={25}/></span></em></h2></div>
   <div className="kingdom-loader-stage" ref={stageRef} data-loved={loves>0}>
    <div className="kingdom-loader-board" aria-hidden="true">
     <div className="kingdom-loader-pcb">
      <svg className="kingdom-loader-traces" viewBox="0 0 1000 620" preserveAspectRatio="none">
       <g className="kingdom-loader-quiet">{quietTraces.map(path=><path key={path} d={path}/>)}</g>
       <g className="kingdom-loader-pads">{pads.map(([x,y],index)=><rect key={index} x={x===0?0:x===1000?976:x-16} y={y===0?0:y-16} width={x===0||x===1000?24:32} height={y===0?24:32} rx="5" data-lit={index<completed}/>)}</g>
       {traces.map((path,index)=><g key={path} className="kingdom-loader-trace" data-lit={index<completed}><path className="kingdom-loader-trace-base" d={path}/><path className="kingdom-loader-trace-glow" d={path} pathLength={1}/><path className="kingdom-loader-trace-core" d={path} pathLength={1}/></g>)}
       <g className="kingdom-loader-vias">{vias.map(([x,y],index)=><circle key={index} cx={x} cy={y} r="7" data-lit={Math.floor(index/2)<completed}/>)}</g>
       <rect className="kingdom-loader-socket" x="350" y="240" width="300" height="180" rx="18"/>
       <rect className="kingdom-loader-socket-inner" x="372" y="262" width="256" height="136" rx="12"/>
       <text className="kingdom-loader-socket-label" x="500" y="338" textAnchor="middle">KINGDOM · 01</text>
      </svg>
      <span className="kingdom-loader-projection"/>
      <span className="kingdom-loader-satellites">{satellites.map(satellite=><span key={satellite.name} className="kingdom-loader-satellite" style={{'--radius':satellite.radius+'%','--glow':satellite.color,animationDelay:satellite.delay} as CSSProperties}><i/></span>)}</span>
     </div>
    </div>
    <div className="kingdom-loader-scene">
     <div className="kingdom-loader-mascot" ref={mascotRef}>
      <img src="/assets/loading/pocket-kingdom-v2.webp" alt="A crowned mint computer, tiny bakery, clock house and tea shop on a floating garden motherboard" width="1200" height="800" fetchPriority="high" decoding="async" draggable="false"/>
      <span className="kingdom-loader-screen" aria-hidden="true"><span className="kingdom-loader-gaze"><span className="kingdom-loader-eyes"><span className="kingdom-loader-eye"/><span className="kingdom-loader-eye"/></span><span className="kingdom-loader-cheeks"/><span className="kingdom-loader-smile"/></span>{boops>0&&!still&&<span key={boops} className="kingdom-loader-burst">{boopBurst.map((item,index)=>{const Icon=pieceIcons[item.icon];return <span key={index} className="kingdom-loader-piece" data-icon={item.icon} style={pieceStyle(item.x,item.y,item.turn)}><Icon size={13}/></span>})}</span>}{ready&&confetti.map((item,index)=>{const Icon=pieceIcons[item.icon];return <span key={index} className="kingdom-loader-piece" data-icon={item.icon} style={pieceStyle(item.x,item.y,item.turn)}><Icon size={18}/></span>})}</span>
      <button type="button" className="kingdom-loader-boop" aria-label="Boop the little computer" title="Boop the little computer" onClick={boop}/>
     </div>
     <span className="kingdom-loader-zzz" aria-hidden="true"><span>z</span><span>z</span><span>Z</span></span>
    </div>
    {completed>0&&!still&&<span key={completed} className="kingdom-loader-junction" aria-hidden="true">{junctionSparks.map((spark,index)=><span key={index} style={{'--x':spark.x+'px','--y':spark.y+'px',animationDelay:spark.delay+'ms'} as CSSProperties}/>)}</span>}
    <span key={greeting} className="kingdom-loader-greeting" aria-hidden="true">{greeting}<Heart size={12} fill={loves?'currentColor':'none'}/></span>
    <button type="button" className="kingdom-loader-love" aria-label="Send the kingdom a little love" title="Send the kingdom a little love" onClick={love}><Heart size={20} fill={loves?'currentColor':'none'}/></button>
    {loves>0&&!still&&<span key={loves} className="kingdom-loader-love-burst" aria-hidden="true"><Heart size={17} fill="currentColor"/><Heart size={12} fill="currentColor"/><Heart size={14} fill="currentColor"/></span>}
   </div>
   <output className="kingdom-loader-status" aria-live="polite" aria-atomic="true"><span className="kingdom-loader-status-label">{ready?'Your little world is ready':stage.label}<span className="kingdom-loader-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></span><span className="kingdom-loader-detail">{stage.detail}</span></output>
   <div className="kingdom-loader-track">
    <div className="kingdom-loader-preparations"><span><Zap size={13}/>{completed===6?'Powering the kingdom':'Lighting the traces'}</span><span>{completed}<span> / 6</span></span></div>
    <progress className="kingdom-loader-progress" value={completed} max={6} aria-label="Startup preparations completed"/>
    <ol className="kingdom-loader-cells" aria-hidden="true">{log.map((row,index)=><li key={row.name} data-complete={row.done} data-active={index===firstPending} style={{'--i':index} as CSSProperties}><span className="kingdom-loader-log-index">{String(index+1).padStart(2,'0')}</span><span className="kingdom-loader-log-name">{row.name}</span><span className="kingdom-loader-log-dots"/><span className="kingdom-loader-log-state">{row.done?'ok':index===firstPending?'loading':'queued'}</span></li>)}</ol>
    <span className="kingdom-loader-track-caption">{completed===6?'Assembling the world. Lighting up your corner of the universe.':'Six real preparations. No pretend percentages.'}</span>
   </div>
  </div>
  <footer className="kingdom-loader-footer"><span><Heart size={12}/>A tiny hello, from me to you.</span><nav aria-label="While the kingdom loads"><a href="/projects">Projects<ArrowUpRight size={14}/></a><a href="/resume">Resume<ArrowUpRight size={14}/></a></nav></footer>
 </section>;
}
