'use client';

import {useEffect,useEffectEvent,useRef,useState,useSyncExternalStore} from 'react';
import {ExternalLink,LoaderCircle,MapPin,Pause,Play,Radio,Search,SkipBack,SkipForward,Square,Volume2,X} from 'lucide-react';
import {Sheet,SheetContent,SheetDescription,SheetTitle} from '@/components/ui/sheet';
import {nearbyRadioStations,radioDistance,type LocatedRadioStation,type RadioDirectory,type RadioLocation,type RadioStation} from './radio-data';
import {locateRadio} from './radio-location';
import {RadioPlayer} from './radio-player';
import './radio-ui.css';

type Props={open:boolean;close:()=>void;reopen:()=>void;muted:boolean;masterVolume:number;paused:boolean;enableSound:()=>void;onPlayback:(state:{playing:boolean;name:string;tuning:number})=>void};
async function readDirectory(signal:AbortSignal,query=''):Promise<RadioDirectory>{
 const response=await fetch('/api/radio/stations'+(query?'?'+new URLSearchParams({q:query}):''),{signal:AbortSignal.any([signal,AbortSignal.timeout(26000)]),credentials:'omit',headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('The station directory is unavailable. Try again later.');
 const value=await response.json() as Partial<RadioDirectory>|null;
 if(!value||!Array.isArray(value.stations)||value.source!=='Radio Browser'||typeof value.fetchedAt!=='string'||typeof value.stale!=='boolean'||typeof value.limited!=='boolean')throw Error('The station directory returned an invalid response.');
 return {stations:value.stations,source:value.source,fetchedAt:value.fetchedAt,stale:value.stale,limited:value.limited};
}
export function RadioTuner({open,close,reopen,muted,masterVolume,paused,enableSound,onPlayback}:Props){
 const [player]=useState(()=>new RadioPlayer()),playback=useSyncExternalStore(player.subscribe,player.snapshot,player.snapshot);
 const [stations,setStations]=useState<LocatedRadioStation[]>([]),[query,setQuery]=useState(''),[radius,setRadius]=useState(150),[location,setLocation]=useState<RadioLocation|null>(null);
 const [busy,setBusy]=useState<'idle'|'locating'|'searching'>('idle'),[message,setMessage]=useState(''),[error,setError]=useState(''),[warning,setWarning]=useState(''),[nearby,setNearby]=useState(false);
 const request=useRef<AbortController|null>(null),catalog=useRef<RadioDirectory|null>(null),notify=useEffectEvent(onPlayback);
 const selected=stations.findIndex(station=>station.id===playback.station?.id),running=playback.status==='playing'||playback.status==='loading';
 useEffect(()=>{notify({playing:playback.status==='playing',name:playback.station?.name??'',tuning:selected<0?0:selected/Math.max(1,stations.length-1)})},[playback.status,playback.station,selected,stations.length]);
 useEffect(()=>{player.setMasterVolume(masterVolume)},[player,masterVolume]);
 useEffect(()=>{if(muted||paused){request.current?.abort();player.pause()}},[player,muted,paused]);
 useEffect(()=>{
  const visibility=()=>{if(document.hidden){request.current?.abort();player.pause()}};document.addEventListener('visibilitychange',visibility);
  return()=>{document.removeEventListener('visibilitychange',visibility);request.current?.abort();request.current=null;player.stop();notify({playing:false,name:'',tuning:0})};
 },[player]);
 function tune(station:RadioStation){if(paused||document.hidden)return;enableSound();void player.play(station)}
 function toggle(){if(running)player.pause();else if(playback.station)tune(playback.station);else if(stations[0])tune(stations[0])}
 function step(direction:number){if(!stations.length)return;tune(stations[(Math.max(0,selected)+direction+stations.length)%stations.length])}
 function begin(phase:'locating'|'searching'){request.current?.abort();const controller=new AbortController();request.current=controller;setBusy(phase);setError('');setWarning('');return controller}
 function directoryNotice(directory:RadioDirectory){setWarning(directory.stale?'Directory refresh failed. Showing cached station listings.':directory.limited?'The directory is partial. Some stations may not be listed.':'')}
 function showNearby(directory:RadioDirectory,position:RadioLocation,distance:number){
  const choices=nearbyRadioStations(directory.stations,position,distance);setStations(choices);setNearby(true);setMessage(choices.length?`${choices.length} listed stations within ${distance} km`:`No indexed stations within ${distance} km.`);directoryNotice(directory);return choices;
 }
 async function findNearby(){
  const controller=begin('locating');
  try{
   const position=await locateRadio(controller.signal);if(controller.signal.aborted)return;setBusy('searching');
   const directory=catalog.current??await readDirectory(controller.signal);if(controller.signal.aborted)return;catalog.current=directory;setLocation(position);const choices=showNearby(directory,position,radius);if(choices[0])tune(choices[0]);
  }catch(problem){if(!controller.signal.aborted)setError(problem instanceof Error?problem.message:'Station lookup failed.')}
  finally{if(request.current===controller){request.current=null;setBusy('idle')}}
 }
 async function search(){
  const term=query.trim();if(!term)return;const controller=begin('searching');
  try{
   const directory=await readDirectory(controller.signal,term);if(controller.signal.aborted)return;
   setStations(directory.stations.map(station=>({...station,distanceKm:location&&station.latitude!==null&&station.longitude!==null?radioDistance(location,{latitude:station.latitude,longitude:station.longitude}):null})));setNearby(false);setMessage(directory.stations.length?`${directory.stations.length} matching stations`:'No matching stations.');directoryNotice(directory);
  }catch(problem){if(!controller.signal.aborted)setError(problem instanceof Error?problem.message:'Station search failed.')}
  finally{if(request.current===controller){request.current=null;setBusy('idle')}}
 }
 function dismiss(){request.current?.abort();close()}
 const status=playback.status==='playing'?'Live':playback.status==='loading'?'Connecting':playback.status==='paused'?'Paused':playback.status==='error'?'Unavailable':'Off';
 return <>
  <Sheet open={open} onOpenChange={value=>{if(!value)dismiss()}}><SheetContent className="radio-panel" showCloseButton={false}>
   <header className="radio-heading"><div><SheetTitle>Frequency House</SheetTitle><SheetDescription>Live internet radio</SheetDescription></div><button className="radio-icon" aria-label="Close radio tuner" title="Close radio tuner" onClick={dismiss}><X size={20}/></button></header>
   <section className="radio-now" aria-label="Radio playback">
    <div className="radio-status" data-live={playback.status==='playing'}><Radio size={18}/><output>{status}</output>{playback.station?.codec&&<small>{playback.station.codec}{playback.station.bitrate?` / ${playback.station.bitrate} kbps`:''}</small>}</div>
    <h2>{playback.station?.name??'Local airwaves'}</h2><p>{playback.station?[playback.station.state,playback.station.country].filter(Boolean).join(', '):'No station selected'}</p>
    <div className="radio-transport"><button className="radio-icon" title="Previous station" aria-label="Previous station" disabled={paused||stations.length<2} onClick={()=>step(-1)}><SkipBack size={19}/></button><button className="radio-play radio-icon" title={running?'Pause radio':'Play radio'} aria-label={running?'Pause radio':'Play radio'} disabled={paused||!playback.station&&!stations.length} onClick={toggle}>{playback.status==='loading'?<LoaderCircle className="radio-spinner" size={23}/>:running?<Pause size={23}/>:<Play size={23}/>}</button><button className="radio-icon" title="Next station" aria-label="Next station" disabled={paused||stations.length<2} onClick={()=>step(1)}><SkipForward size={19}/></button><button className="radio-icon" title="Turn radio off" aria-label="Turn radio off" disabled={!playback.station} onClick={()=>player.stop()}><Square size={17}/></button></div>
    <label className="radio-volume"><Volume2 size={17}/><input type="range" aria-label="Radio volume" min="0" max="1" step="0.05" value={playback.volume} onChange={event=>player.setVolume(Number(event.target.value))}/><output>{Math.round(playback.volume*100)}%</output></label>
    {playback.error&&<p className="radio-error" role="alert">{playback.error}</p>}
    {playback.station?.homepage&&<a href={playback.station.homepage} target="_blank" rel="noopener noreferrer" className="radio-source">Station website <ExternalLink size={13}/></a>}
   </section>
   <section className="radio-discovery" aria-label="Find radio stations">
    <div className="radio-location"><button className="radio-command" disabled={busy!=='idle'||paused} onClick={()=>void findNearby()}><MapPin size={17}/>{busy==='locating'?'Locating...':'Use my location'}</button><label>Radius<select aria-label="Local station radius" value={radius} disabled={busy!=='idle'} onChange={event=>{const distance=Number(event.target.value);setRadius(distance);if(location&&catalog.current)showNearby(catalog.current,location,distance)}}>{[50,150,300,500].map(distance=><option key={distance} value={distance}>{distance} km</option>)}</select></label></div>
    <p className="radio-privacy">Your approximate location stays in this tab. Playback connects directly to the broadcaster.</p>
    <form onSubmit={event=>{event.preventDefault();void search()}}><label htmlFor="radio-search">Country, region, or station</label><div className="radio-search"><input id="radio-search" value={query} maxLength={80} autoComplete="off" onChange={event=>setQuery(event.target.value)}/><button className="radio-icon" aria-label="Search radio stations" title="Search radio stations" disabled={busy!=='idle'||!query.trim()}><Search size={19}/></button></div></form>
    {busy==='searching'&&<output className="radio-result-status"><LoaderCircle className="radio-spinner" size={15}/> Finding stations...</output>}
    {error&&<p className="radio-error" role="alert">{error}</p>}{warning&&<p className="radio-privacy">{warning}</p>}
   </section>
    <section className="radio-results" aria-label={nearby?'Nearby radio stations':'Radio stations'}>{message&&<output className="radio-result-status">{message}</output>}<ul>{stations.map(station=><li key={station.id}><button type="button" aria-label={'Tune '+station.name} aria-pressed={playback.station?.id===station.id} disabled={paused} onClick={()=>tune(station)}><Radio size={18}/><span><strong>{station.name}</strong><small>{[station.state,station.country,station.distanceKm!==null?`${Math.round(station.distanceKm)} km`:null].filter(Boolean).join(' / ')}</small></span>{playback.station?.id===station.id&&playback.status==='playing'?<span className="radio-live-mark">Live</span>:<Play size={15}/>}</button></li>)}</ul></section>
   <footer className="radio-footer"><a href="https://www.radio-browser.info/" target="_blank" rel="noopener noreferrer">Station directory: Radio Browser <ExternalLink size={12}/></a></footer>
  </SheetContent></Sheet>
    {!open&&playback.station&&<aside className="radio-mini" aria-label="Radio mini player"><button className="radio-mini-title" onClick={reopen} title="Open radio tuner" aria-label="Open radio tuner"><Radio size={18}/><span><small>{status}</small><strong>{playback.station.name}</strong></span></button><button className="radio-icon" onClick={toggle} disabled={paused} title={running?'Pause radio':'Play radio'} aria-label={running?'Pause radio':'Play radio'}>{running?<Pause size={18}/>:<Play size={18}/>}</button><button className="radio-icon" onClick={()=>player.stop()} title="Turn radio off" aria-label="Turn radio off"><X size={17}/></button></aside>}
 </>;
}
