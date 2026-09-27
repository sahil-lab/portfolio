import {validRadioLocation,type RadioLocation} from './radio-data';

export function locateRadio(signal:AbortSignal,geolocation:Pick<Geolocation,'getCurrentPosition'>|null=globalThis.navigator?.geolocation??null):Promise<RadioLocation>{
 return new Promise((resolve,reject)=>{
  if(signal.aborted){reject(new DOMException('Location cancelled','AbortError'));return}
  if(!geolocation){reject(Error('Location is unavailable. Search by country, region, or station.'));return}
  const cancel=()=>reject(new DOMException('Location cancelled','AbortError'));signal.addEventListener('abort',cancel,{once:true});
  geolocation.getCurrentPosition(position=>{
   signal.removeEventListener('abort',cancel);if(signal.aborted)return;
   const location={latitude:position.coords.latitude,longitude:position.coords.longitude};
   if(!validRadioLocation(location)){reject(Error('A valid location could not be found.'));return}
   resolve({latitude:Number(location.latitude.toFixed(2)),longitude:Number(location.longitude.toFixed(2))});
  },error=>{
   signal.removeEventListener('abort',cancel);if(signal.aborted)return;
   reject(Error(error.code===1?'Location permission was denied. Search by country, region, or station.':error.code===3?'Location timed out. Try again or search for a station.':'Location is unavailable. Search by country, region, or station.'));
  },{enableHighAccuracy:false,timeout:8000,maximumAge:900000});
 });
}
