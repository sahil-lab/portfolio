'use client';

import {useDeferredValue,useEffect,useMemo,useState} from 'react';
import {Feather,MapPin,Orbit,Search,UserRound,X} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type {FeatureRecord,PlanetManifest} from './bengaluru-pipeline';
import {describeHeight} from './bengaluru-text';
import {BengaluruCurrentLocation,type BengaluruPositionReader} from './bengaluru-map';
import './bengaluru.css';

export function BengaluruControls({open,close,manifest,selection,busy,disabled,angel,failed,visit,changeCharacter,overview,readPosition}:{open:boolean;close:()=>void;manifest:PlanetManifest|null;selection:FeatureRecord|null;busy:boolean;disabled:boolean;angel:boolean;failed:boolean;visit:(id?:string)=>Promise<boolean>;changeCharacter:(angel:boolean)=>void;overview:()=>void;readPosition:BengaluruPositionReader}){
 const [query,setQuery]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{
  if(!open)return;
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close()}};
  document.addEventListener('keydown',escape,true);return()=>document.removeEventListener('keydown',escape,true);
 },[open,close]);
 const deferred=useDeferredValue(query);
 const entries=useMemo(()=>{
  if(!manifest)return [];
  const values=new Map<string,{id:string;name:string;kind:string}>();
  for(const entry of manifest.landmarks)values.set(entry.id,{id:entry.id,name:entry.label,kind:entry.featureClass});
  for(const entry of manifest.places)if(!values.has(entry.id))values.set(entry.id,{id:entry.id,name:entry.name,kind:entry.subtype});
  for(const entry of manifest.named)if(!values.has(entry.id))values.set(entry.id,{id:entry.id,name:entry.name,kind:entry.featureClass});
  return [...values.values()];
 },[manifest]);
 const matches=entries.filter(entry=>entry.name.toLowerCase().includes(deferred.trim().toLowerCase())).slice(0,12);
 const popular=entries.filter(entry=>/^(Cubbon Park|Vidhana Soudha|Whitefield|Electronic City|Indiranagar|Koramangala|Jayanagar|Malles?hwara?m)$/i.test(entry.name)).slice(0,8);
 const go=async(id:string)=>{setMessage('');const moved=await visit(id);if(moved)setQuery('');else setMessage('This location is not ready or has no clear arrival point.')};
 return <>
  {failed&&<div className="bengaluru-fallback"><Image src="/assets/bengaluru-region-v1/planet-fallback.svg" alt="Bengaluru globe drawn from the same OpenStreetMap roads, lakes, parks and buildings." width={1024} height={1024} unoptimized loading="eager"/><Link href="/">Return to the kingdom</Link></div>}
  {open&&<section className="bengaluru-controls" aria-label="Bengaluru city controls">
    <header><div><span className="bengaluru-kicker">GARDEN CITY</span><h1>Bengaluru</h1></div><div className="bengaluru-tools-actions"><button type="button" onClick={overview} disabled={disabled||busy||!manifest||angel} aria-label="View the whole Bengaluru globe" title="View the whole globe"><Orbit size={21}/></button><button type="button" onClick={close} aria-label="Close city controls" title="Close city controls"><X size={19}/></button></div></header>
  <fieldset className="bengaluru-character" aria-label="City character"><button type="button" aria-pressed={!angel} disabled={disabled||busy||!manifest} onClick={()=>changeCharacter(false)}><UserRound size={16}/> Main</button><button type="button" aria-pressed={angel} disabled={disabled||busy||!manifest} onClick={()=>changeCharacter(true)}><Feather size={16}/> Angel</button></fieldset>
  <output className="bengaluru-current" aria-live="polite">{busy?'Preparing mapped streets...':<BengaluruCurrentLocation manifest={manifest} readPosition={readPosition}/>}</output>
   <details className="bengaluru-places">
    <summary><MapPin size={16}/> Places</summary>
    <search><form onSubmit={event=>{event.preventDefault();const match=entries.find(entry=>entry.name.toLowerCase()===query.trim().toLowerCase())??matches[0];if(match)void go(match.id)}}>
     <label htmlFor="bengaluru-place">Mapped place</label><div><input id="bengaluru-place" type="search" value={query} onChange={event=>setQuery(event.target.value)} disabled={busy||!manifest} autoComplete="off" placeholder="Whitefield, Lalbagh..."/><button type="submit" aria-label="Go to mapped place" title="Go to mapped place" disabled={disabled||busy||!query.trim()}><Search size={17}/></button></div>
    </form></search>
    <ul>{(query.trim()?matches:popular).map(entry=><li key={entry.id}><button type="button" disabled={disabled||busy} onClick={()=>void go(entry.id)}><span>{entry.name}</span><small>{entry.kind}</small></button></li>)}</ul>
   </details>
  {message&&<output className="bengaluru-status">{message}</output>}
  {selection&&<section className="bengaluru-feature" aria-label="Selected mapped feature" aria-live="polite"><h2>{selection.name??selection.featureClass}</h2>{describeHeight(selection)&&<p>{describeHeight(selection)}</p>}<a href={'https://www.openstreetmap.org/'+selection.id} target="_blank" rel="noopener noreferrer">OpenStreetMap {selection.id}</a></section>}
  <details className="bengaluru-source"><summary>Map source</summary><p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> / ODbL 1.0</p>{manifest&&<><p>Snapshot {manifest.source.snapshotTimestamp?.slice(0,10)}. {manifest.counts.building.toLocaleString()} building footprints.</p><p>Whole-globe projection. Distances are distorted; heights without source measurements are estimates. Facade windows and trees are decorative.</p></>}</details>
   <a className="bengaluru-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">Map data: OpenStreetMap contributors</a>
  </section>}
 </>;
}
