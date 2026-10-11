'use client';

import './bengaluru.css';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import * as manifestJson from './bengaluru-planet-manifest.json';
import type {PlanetManifest} from './bengaluru-pipeline';
import type {PlanetHandle,PlanetQualityChoice,PlanetSelection,PlanetStatus} from './bengaluru-planet';
import {describeHeight} from './bengaluru-text';

export const planetManifest=manifestJson as unknown as PlanetManifest;
export const planetAssetBase='/assets/bengaluru-v1/';
const fallbackImage=planetAssetBase+planetManifest.fallback;
const qualityLabels:Record<PlanetQualityChoice,string>={auto:'Auto (measured)',high:'High',medium:'Medium',low:'Low'};
const classLabels:Record<string,string>={building:'Building',road:'Road',rail:'Railway',water:'Water',park:'Green space',poi:'Place of interest',place:'Neighbourhood'};

export function BengaluruPlanetView(){
 const host=useRef<HTMLDivElement>(null),handle=useRef<PlanetHandle|null>(null);
 const [status,setStatus]=useState<PlanetStatus|null>(null),[selection,setSelection]=useState<PlanetSelection|null>(null),[stage,setStage]=useState<'loading'|'ready'|'fallback'>('loading'),[message,setMessage]=useState<string|null>(null),[query,setQuery]=useState(''),[quality,setQuality]=useState<PlanetQualityChoice>('auto'),[morph,setMorph]=useState(1),[autoRotate,setAutoRotate]=useState(false);
 const named=useMemo(()=>{
  const seen=new Set<string>(),entries:{id:string;name:string;kind:string}[]=[];
  for(const entry of [...planetManifest.landmarks.map(l=>({id:l.id,name:l.label,kind:classLabels[l.featureClass]})),...planetManifest.places.map(p=>({id:p.id,name:p.name,kind:classLabels.place})),...planetManifest.named.map(n=>({id:n.id,name:n.name,kind:classLabels[n.featureClass]??n.featureClass}))])if(!seen.has(entry.id)){seen.add(entry.id);entries.push(entry)}
  return entries;
 },[]);
 useEffect(()=>{
  const element=host.current;if(!element)return;
  let cancelled=false,planet:PlanetHandle|null=null;
  const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  import('./bengaluru-planet').then(({mountBengaluruPlanet})=>{
   if(cancelled)return;
   planet=mountBengaluruPlanet(element,{manifest:planetManifest,assetBase:planetAssetBase,quality:'auto',autoRotate:!reduced,reducedMotion:reduced,onStatus:next=>{setStatus(next);if(next.message)setMessage(next.message)},onSelect:setSelection});
   handle.current=planet;
   if(planet.mode!=='webgl'){setStage('fallback');setMessage(planet.getStatus().message??null);return}
   setAutoRotate(!reduced);setStage('ready');
  }).catch(error=>{if(!cancelled){setStage('fallback');setMessage(error instanceof Error?error.message:'The planet renderer could not load.')}});
  return ()=>{cancelled=true;planet?.dispose();handle.current=null};
 },[]);
 const focus=useCallback((id:string)=>{const ok=handle.current?.focusFeature(id)??false;if(!ok)setMessage('That place is not in the current snapshot.');return ok},[]);
 const submitSearch=(event:{preventDefault():void})=>{
  event.preventDefault();const text=query.trim().toLowerCase();if(!text)return;
  const match=named.find(entry=>entry.name.toLowerCase()===text)??named.find(entry=>entry.name.toLowerCase().includes(text));
  if(match)focus(match.id);else setMessage(`No mapped place matches “${query}”.`);
 };
 const feature=selection?.feature,heightText=feature?describeHeight(feature):null;
 return <main className="blr-page">
  <header className="blr-header">
   <nav className="blr-breadcrumbs" aria-label="Site"><a href="/">← Enter the kingdom</a><a href="/projects">Project directory</a><a href="/resume">System Information</a></nav>
   <h1>Bengaluru, as a planet</h1>
   <p>{planetManifest.counts.building} building footprints, {planetManifest.counts.road} roads, {planetManifest.counts.park} green spaces and {planetManifest.counts.water} water bodies from OpenStreetMap, kept at their mapped positions and bent onto a {Math.round(planetManifest.projection.planetRadiusM/100)/10} km-radius world. Civic core around {planetManifest.origin.label}; the far side is deliberately non-geographic.</p>
  </header>
  <div className="blr-layout">
   <section className="blr-stage" aria-label="Bengaluru planet view">
    <div ref={host} className="blr-host" data-stage={stage}>
     {stage!=='ready'&&<img className="blr-poster" src={fallbackImage} alt={stage==='fallback'?'Illustrated planet built from the geography of Bengaluru: parks, roads, water and building footprints on a small globe.':''} />}
    </div>
    <noscript><img className="blr-poster" src={fallbackImage} alt="Illustrated planet built from the geography of Bengaluru." /></noscript>
    <output className="blr-stage-note">{stage==='loading'?'Loading the planet renderer…':stage==='fallback'?(message??'Showing the illustrated fallback.'):'Drag to orbit, scroll or pinch to zoom, click a building or park to inspect it.'}</output>
   </section>
   <aside className="blr-panel">
    <nav aria-label="Bengaluru planet landmarks" className="blr-landmarks">
     <h2>Landmarks</h2>
     <ul>{planetManifest.landmarks.map(landmark=><li key={landmark.id}><button type="button" onClick={()=>focus(landmark.id)} aria-pressed={selection?.feature.id===landmark.id} disabled={stage!=='ready'}>{landmark.label}</button></li>)}</ul>
    </nav>
    <search className="blr-search"><form onSubmit={submitSearch}>
     <label htmlFor="blr-search-input">Find a mapped place</label>
     <div><input id="blr-search-input" type="search" list="blr-places" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Cubbon Park, Shivajinagar…" disabled={stage!=='ready'} autoComplete="off" /><button type="submit" disabled={stage!=='ready'}>Go</button></div>
     <datalist id="blr-places">{named.slice(0,400).map(entry=><option key={entry.id} value={entry.name}>{entry.kind}</option>)}</datalist>
    </form></search>
    <section className="blr-details" aria-live="polite" aria-label="Selected place details">
     <h2>Selected place</h2>
     {feature?<dl>
      <dt>Name</dt><dd>{feature.name??'Unnamed '+(classLabels[feature.featureClass]??feature.featureClass).toLowerCase()}</dd>
      <dt>Type</dt><dd>{classLabels[feature.featureClass]??feature.featureClass}{feature.subtype&&feature.subtype!=='yes'?` · ${feature.subtype.replace(/_/g,' ')}`:''}</dd>
      {heightText&&<><dt>Height</dt><dd>{heightText}</dd></>}
      {feature.areaM2!==undefined&&<><dt>Footprint</dt><dd>{feature.areaM2>=10000?`${(feature.areaM2/10000).toFixed(1)} ha`:`${Math.round(feature.areaM2)} m²`}</dd></>}
      <dt>Source</dt><dd><a href={`https://www.openstreetmap.org/${feature.id}`} rel="noopener noreferrer" target="_blank">OpenStreetMap {feature.id}</a> · {feature.lonLat[1].toFixed(5)}, {feature.lonLat[0].toFixed(5)}</dd>
     </dl>:<p>Nothing selected. Choose a landmark, search, or click the planet.</p>}
    </section>
    <section className="blr-view" aria-label="View controls">
     <h2>View</h2>
     <div className="blr-buttons">
      <button type="button" onClick={()=>handle.current?.orbit(-.25,0)} disabled={stage!=='ready'} aria-label="Rotate left">⟲</button>
      <button type="button" onClick={()=>handle.current?.orbit(.25,0)} disabled={stage!=='ready'} aria-label="Rotate right">⟳</button>
      <button type="button" onClick={()=>handle.current?.orbit(0,-.15)} disabled={stage!=='ready'} aria-label="Tilt up">↑</button>
      <button type="button" onClick={()=>handle.current?.orbit(0,.15)} disabled={stage!=='ready'} aria-label="Tilt down">↓</button>
      <button type="button" onClick={()=>handle.current?.zoom(.75)} disabled={stage!=='ready'} aria-label="Zoom in">+</button>
      <button type="button" onClick={()=>handle.current?.zoom(1.33)} disabled={stage!=='ready'} aria-label="Zoom out">−</button>
      <button type="button" onClick={()=>{handle.current?.resetView();setSelection(null)}} disabled={stage!=='ready'}>Reset view</button>
     </div>
     <label className="blr-toggle"><input type="checkbox" checked={autoRotate} disabled={stage!=='ready'} onChange={event=>{setAutoRotate(event.target.checked);handle.current?.setAutoRotate(event.target.checked)}} /> Slow auto-rotation</label>
     <label className="blr-range">Flat map ↔ planet<input type="range" min={0} max={1} step={.01} value={morph} disabled={stage!=='ready'} onChange={event=>{const value=Number(event.target.value);setMorph(value);handle.current?.setSphereMorph(value)}} aria-valuetext={morph>=1?'planet':morph<=0?'flat map':`${Math.round(morph*100)}% bent`} /></label>
     <label className="blr-select">Graphics quality<select value={quality} disabled={stage!=='ready'} onChange={event=>{const value=event.target.value as PlanetQualityChoice;setQuality(value);handle.current?.setQuality(value)}}>{(Object.keys(qualityLabels) as PlanetQualityChoice[]).map(choice=><option key={choice} value={choice}>{qualityLabels[choice]}</option>)}</select></label>
     {status&&<p className="blr-status">{status.tilesResident} tiles resident{status.tilesLoading?`, ${status.tilesLoading} loading`:''} · {status.quality} quality{status.qualityChoice==='auto'?' (auto)':''} · {status.drawCalls} draw calls · {(status.triangles/1000).toFixed(0)}k triangles</p>}
     {message&&stage==='ready'&&<output className="blr-message">{message}</output>}
    </section>
    <footer className="blr-credits">
     <p>Map data <a href={planetManifest.source.licenseUrl} rel="noopener noreferrer" target="_blank">{planetManifest.source.attribution}</a>, {planetManifest.source.license}. Snapshot {planetManifest.source.snapshotTimestamp?.slice(0,10)}; input SHA-256 {planetManifest.source.inputSha256.slice(0,12)}…</p>
     <p>{planetManifest.heights.sources['osm-height']} buildings carry a mapped height, {planetManifest.heights.sources['building-levels']} are estimated from storey counts and {planetManifest.heights.sources['type-default']+planetManifest.heights.sources.default} use deterministic defaults. Trees are decorative, not surveyed.</p>
    </footer>
   </aside>
  </div>
 </main>;
}
