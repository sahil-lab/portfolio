'use client';
import {useSyncExternalStore,type KeyboardEvent} from 'react';
import {BookOpen,Pause,Play,RotateCcw,X} from 'lucide-react';
import type {Exhibit} from './exhibit-state';

export function ProjectStudyControls({study,close,source}:{study:Exhibit;close:()=>void;source:()=>void}){
 const state=useSyncExternalStore(study.subscribe,study.getSnapshot,study.getSnapshot),project=study.project;
 const closeOnEscape=(event:KeyboardEvent<HTMLButtonElement|HTMLSelectElement>)=>{if(event.key==='Escape'){event.stopPropagation();close()}};
 return <section className="project-study-dock" aria-label="Project study">
    <header><div><span>LOCAL STUDY</span><h2>{project.name}</h2></div><button type="button" aria-label="Close project study" title="Close project study" onKeyDown={closeOnEscape} onClick={close}><X size={18}/></button></header>
  <ol aria-label="Study stages">{project.nodes.map((node,index)=><li key={node.id} data-active={state.active===node.id} data-complete={state.step>index}><span>{String(index+1).padStart(2,'0')}</span>{node.label}</li>)}</ol>
  <output aria-live="polite">{state.step<0?project.description:state.result}</output>
    {project.scenario.mode==='react'&&<label>Color<select aria-label="Study color" value={state.input} disabled={state.running} onKeyDown={closeOnEscape} onChange={event=>study.choose(event.target.value)}>{project.scenario.options.map(option=><option key={option}>{option}</option>)}</select></label>}
    <div className="study-commands"><button type="button" aria-label={state.running&&!state.paused?'Pause study':'Run study'} title={state.running&&!state.paused?'Pause study':'Run study'} onKeyDown={closeOnEscape} onClick={()=>state.running?study.pause():study.trigger()}>{state.running&&!state.paused?<Pause size={18}/>:<Play size={18}/>}</button><button type="button" aria-label="Reset study" title="Reset study" onKeyDown={closeOnEscape} onClick={study.reset}><RotateCcw size={18}/></button><span>{state.running?(state.paused?'Paused':'Running'):state.step<0?'Ready':'Complete'}</span><button className="study-source" type="button" onKeyDown={closeOnEscape} onClick={source}><BookOpen size={16}/>Project source</button></div>
  <small>Illustrative data, not the project runtime.</small>
 </section>;
}
