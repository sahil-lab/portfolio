'use client';

import {useEffect,useEffectEvent,useRef,useState} from 'react';
import {LocateFixed,Map as MapIcon,MapPin,Maximize2,Minimize2,Minus,Plus} from 'lucide-react';
import type {PlanetManifest} from './bengaluru-pipeline';
import {createBengaluruLocator,mapPoint,requestBengaluruDeviceLocation,visibleMapTiles,type BengaluruLocation,type BengaluruPosition} from './bengaluru-location';
import rasterCatalog from './bengaluru-map-raster-manifest.json';

export type BengaluruPositionReader=()=>BengaluruPosition|null;

export function useBengaluruLocation(manifest:PlanetManifest|null,readPosition:BengaluruPositionReader){
 const [location,setLocation]=useState<BengaluruLocation|null>(null);
 const read=useEffectEvent(readPosition);
 useEffect(()=>{
  if(!manifest)return;
  const locate=createBengaluruLocator(manifest);
  const update=()=>{
   if(document.hidden)return;
   const position=read(),next=position?locate(position):null;
   setLocation(previous=>previous&&next&&Math.hypot(previous.east-next.east,previous.north-next.north)<.25&&previous.character===next.character?previous:next);
  };
  queueMicrotask(update);const timer=window.setInterval(update,250);document.addEventListener('visibilitychange',update);
  return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',update)};
 },[manifest]);
 return location;
}

export function BengaluruCurrentLocation({manifest,readPosition}:{manifest:PlanetManifest|null;readPosition:BengaluruPositionReader}){
 const location=useBengaluruLocation(manifest,readPosition);
 return <>{location?.label??'Locating...'}</>;
}

export function BengaluruMap({manifest,readPosition,expanded,onExpandedChange,onDeviceLocation}:{manifest:PlanetManifest;readPosition:BengaluruPositionReader;expanded:boolean;onExpandedChange:(open:boolean)=>void;onDeviceLocation:(latitude:number,longitude:number,accuracy:number)=>Promise<boolean>}){
 const location=useBengaluruLocation(manifest,readPosition),[collapsed,setCollapsed]=useState(false),[zoom,setZoom]=useState(16),[pan,setPan]=useState<{x:number;y:number}|null>(null),[imageFailed,setImageFailed]=useState(false),[frameWidth,setFrameWidth]=useState(180);
 const host=useRef<HTMLElement>(null),canvas=useRef<SVGSVGElement>(null),drag=useRef<{id:number;x:number;y:number;scale:number;centerX:number;centerY:number}|null>(null);
 const dragged=useRef(false);
 const [locating,setLocating]=useState(false),[locationMessage,setLocationMessage]=useState(''),locationRequest=useRef(0);
 useEffect(()=>()=>{locationRequest.current++},[]);
 const summon=async()=>{
  if(locating)return;
  const request=++locationRequest.current;setLocating(true);setLocationMessage('Finding your device location...');
  try{
   const position=await requestBengaluruDeviceLocation(manifest,navigator.geolocation);if(request!==locationRequest.current)return;
   setLocationMessage('Preparing nearby safe ground...');
   const moved=await onDeviceLocation(position.latitude,position.longitude,position.accuracy);if(request!==locationRequest.current)return;
   if(moved){setPan(null);setLocationMessage(position.accuracy?'Arrived near your device location. Accuracy: '+position.accuracy+' m.':'Arrived near your device location.')}else{setLocationMessage('No safe loaded arrival was available. Please stop moving and try again.');onExpandedChange(true)}
  }catch(error){if(request===locationRequest.current)setLocationMessage(error instanceof Error?error.message:'Your location could not be used.')}
  finally{if(request===locationRequest.current)setLocating(false)}
 };
 const close=useEffectEvent(()=>{setPan(null);onExpandedChange(false)});
 useEffect(()=>{
  const element=canvas.current;if(!element)return;
  const observer=new ResizeObserver(entries=>{if(entries[0].contentRect.width>0)setFrameWidth(entries[0].contentRect.width)});observer.observe(element);return()=>observer.disconnect();
 },[collapsed]);
 useEffect(()=>{
  if(!expanded)return;
  const previous=document.activeElement as HTMLElement|null;host.current?.querySelector<HTMLButtonElement>('[aria-label="Minimize Bengaluru map"]')?.focus();
  const key=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return}
   if(event.key==='Tab'){
    const buttons=host.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],[tabindex="0"]');if(!buttons?.length)return;
    const first=buttons[0],last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
   }
  };
  document.addEventListener('keydown',key,true);return()=>{document.removeEventListener('keydown',key,true);previous?.focus()};
 },[expanded]);
 const bounds=manifest.aoi.localBounds,mapWidth=1000,mapHeight=mapWidth*(bounds[3]-bounds[1])/(bounds[2]-bounds[0]);
 const aspect=expanded?mapWidth/mapHeight:1.6;
 const center=pan??{x:location?.mapX??.5,y:location?.mapY??.5},viewWidth=mapWidth/zoom,viewHeight=viewWidth/aspect,viewX=center.x*mapWidth-viewWidth/2,viewY=center.y*mapHeight-viewHeight/2;
 const tiles=collapsed&&!expanded?[]:visibleMapTiles(rasterCatalog,{x:viewX,y:viewY,width:viewWidth,height:viewHeight},{width:mapWidth,height:mapHeight},frameWidth);
 const fontSize=viewWidth/frameWidth*(expanded?11:10),markerRadius=viewWidth/frameWidth*5;
 const candidates=[...manifest.landmarks.map(place=>({id:place.id,name:place.label,local:place.local})),...manifest.places.filter(place=>place.rank>=2&&place.rank<=4).map(place=>({id:place.id,name:place.name,local:place.local}))];
 const labels:{id:string;name:string;x:number;y:number;box:{left:number;right:number;top:number;bottom:number}}[]=[];
 candidates.sort((first,second)=>Math.hypot(first.local[0]-(location?.east??0),first.local[1]-(location?.north??0))-Math.hypot(second.local[0]-(location?.east??0),second.local[1]-(location?.north??0)));
 for(const place of candidates){
  const point=mapPoint(bounds,...place.local),x=point.x*mapWidth,y=point.y*mapHeight,width=place.name.length*fontSize*.59;
  if(x<viewX+fontSize||x+width>viewX+viewWidth-fontSize||y<viewY+fontSize*2||y>viewY+viewHeight-fontSize*2)continue;
  const box={left:x-fontSize*.5,right:x+width+fontSize*.5,top:y-fontSize*1.5,bottom:y+fontSize*.5};
  if(labels.some(label=>box.left<label.box.right&&box.right>label.box.left&&box.top<label.box.bottom&&box.bottom>label.box.top))continue;
  if(!expanded&&box.right>viewX+viewWidth-viewWidth/frameWidth*70&&box.top<viewY+viewWidth/frameWidth*38)continue;
  if(location&&Math.hypot(x-location.mapX*mapWidth,y-location.mapY*mapHeight)<fontSize*2)continue;
  labels.push({...place,x,y,box});if(labels.length>=(expanded?16:2))break;
 }
 const movePan=(x:number,y:number)=>setPan({x:Math.max(0,Math.min(1,x)),y:Math.max(0,Math.min(1,y))});
 const coordinate=location?`${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`:'';
 return <>
    {expanded&&<div className="bengaluru-map-backdrop" aria-hidden="true"/>}
  <section ref={host} className={'bengaluru-minimap'+(expanded?' is-expanded':'')+(collapsed&&!expanded?' is-collapsed':'')} role={expanded?'dialog':'region'} aria-modal={expanded?true:undefined} aria-label="Bengaluru map" data-character={location?.character} data-place={location?.label}>
   <header><div><MapIcon size={16}/><strong>Bengaluru</strong></div><div className="bengaluru-map-actions">
    {expanded&&<button type="button" aria-label="Go to my device location" title="Go to my device location" disabled={locating} aria-busy={locating} onClick={()=>void summon()}><MapPin size={18}/></button>}
    {!expanded&&<button type="button" aria-label={collapsed?'Restore Bengaluru minimap':'Minimize Bengaluru minimap'} title={collapsed?'Restore minimap':'Minimize minimap'} onClick={()=>setCollapsed(value=>!value)}>{collapsed?<MapIcon size={15}/>:<Minus size={15}/>}</button>}
    <button type="button" aria-label={expanded?'Minimize Bengaluru map':'Maximize Bengaluru map'} title={expanded?'Minimize map':'Maximize map'} onClick={()=>{setCollapsed(false);setPan(null);onExpandedChange(!expanded)}}>{expanded?<Minimize2 size={18}/>:<Maximize2 size={15}/>}</button>
   </div></header>
  {(!collapsed||expanded)&&<div className="bengaluru-map-frame" style={{aspectRatio:aspect}}>
    <button type="button" className="bengaluru-map-surface" aria-label={`Map view: ${location?.label??'locating'}. Recenter map`} title="Recenter map" onClick={event=>{if(event.detail===0||!dragged.current)setPan(null);dragged.current=false}}
     onPointerDown={event=>{dragged.current=false;if(!expanded||event.button!==0)return;const matrix=canvas.current?.getScreenCTM();if(!matrix)return;event.currentTarget.setPointerCapture(event.pointerId);drag.current={id:event.pointerId,x:event.clientX,y:event.clientY,scale:1/matrix.a,centerX:center.x,centerY:center.y}}}
     onPointerMove={event=>{const current=drag.current;if(!current||current.id!==event.pointerId)return;if(Math.hypot(current.x-event.clientX,current.y-event.clientY)>3)dragged.current=true;movePan(current.centerX+(current.x-event.clientX)*current.scale/mapWidth,current.centerY+(current.y-event.clientY)*current.scale/mapHeight)}}
     onPointerUp={event=>{drag.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}} onPointerCancel={()=>{drag.current=null}}
     onKeyDown={event=>{if(!expanded)return;const offset=.1/zoom;if(event.key==='ArrowLeft'){event.preventDefault();movePan(center.x-offset,center.y)}else if(event.key==='ArrowRight'){event.preventDefault();movePan(center.x+offset,center.y)}else if(event.key==='ArrowUp'){event.preventDefault();movePan(center.x,center.y-offset)}else if(event.key==='ArrowDown'){event.preventDefault();movePan(center.x,center.y+offset)}}}>
    <svg ref={canvas} viewBox={`${viewX} ${viewY} ${viewWidth} ${viewHeight}`} aria-hidden="true">
     <rect x={0} y={0} width={mapWidth} height={mapHeight} fill="#e8ece8"/>
    {tiles.map(tile=><image key={tile.key} href={tile.href} x={tile.x} y={tile.y} width={tile.width} height={tile.height} preserveAspectRatio="none" onError={()=>setImageFailed(true)}/>)}
     {labels.map(label=><text key={label.id} x={label.x} y={label.y} fontSize={fontSize} stroke="#eef2ee" strokeWidth={fontSize*.34} paintOrder="stroke" fill="#30443f">{label.name}</text>)}
     {location&&<g className="bengaluru-map-marker" data-east={location.east} data-north={location.north} transform={`translate(${location.mapX*mapWidth} ${location.mapY*mapHeight})`}><title>{`You are here: ${location.label}`}</title><circle r={markerRadius*1.9} fill="#fff" fillOpacity=".8"/><circle r={markerRadius} fill={location.character==='angel'?'#bd6937':'#187d73'} stroke="#fff" strokeWidth={markerRadius*.38}/></g>}
    </svg>
    </button>
    <span className="bengaluru-map-north" aria-label="North">N</span>
    <div className="bengaluru-map-tools"><button type="button" aria-label="Zoom in Bengaluru map" title="Zoom in" disabled={zoom>=32} onClick={()=>setZoom(value=>Math.min(32,value*2))}><Plus size={17}/></button><button type="button" aria-label="Zoom out Bengaluru map" title="Zoom out" disabled={zoom<=1} onClick={()=>setZoom(value=>Math.max(1,value/2))}><Minus size={17}/></button><button type="button" aria-label="Recenter Bengaluru map" title="Recenter on current position" aria-pressed={pan===null} onClick={()=>setPan(null)}><LocateFixed size={17}/></button></div>
    {imageFailed&&<output className="bengaluru-map-error">Map image unavailable</output>}
   </div>}
  <footer><strong className="bengaluru-map-place" aria-live="polite" title={location?.label}>{location?.label??'Locating...'}</strong>{expanded&&<><span>{location?.character==='angel'?'Angel':'Main'}{coordinate?' / '+coordinate:''}</span>{locationMessage&&<output className="bengaluru-device-location-status">{locationMessage}</output>}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors / ODbL</a></>}</footer>
  </section>
 </>;
}
