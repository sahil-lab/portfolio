import {createLocalFrame} from './bengaluru-projection';
import type {PlanetManifest} from './bengaluru-pipeline';

export type BengaluruPosition={east:number;north:number;character:'main'|'angel'};
export type BengaluruLocation=BengaluruPosition&{longitude:number;latitude:number;label:string;area:string;nearby:string|null;distanceM:number|null;mapX:number;mapY:number};
export type BengaluruRasterCatalog={base:string;tileSize:number;levels:{width:number;height:number;columns:number;rows:number}[]};

export function visibleMapTiles(catalog:BengaluruRasterCatalog,view:{x:number;y:number;width:number;height:number},map:{width:number;height:number},pixels:number){
 const desired=map.width/view.width*pixels*2,level=catalog.levels.find(level=>level.width>=desired)??catalog.levels[catalog.levels.length-1];
 if(!level)return [];
 const tileWidth=map.width*catalog.tileSize/level.width,tileHeight=map.height*catalog.tileSize/level.height;
 const firstColumn=Math.max(0,Math.floor(view.x/tileWidth)-1),lastColumn=Math.min(level.columns-1,Math.floor((view.x+view.width)/tileWidth)+1);
 const firstRow=Math.max(0,Math.floor(view.y/tileHeight)-1),lastRow=Math.min(level.rows-1,Math.floor((view.y+view.height)/tileHeight)+1);
 const tiles=[];
 for(let row=firstRow;row<=lastRow;row++)for(let column=firstColumn;column<=lastColumn;column++)tiles.push({key:level.width+'/'+column+'-'+row,href:catalog.base+level.width+'/'+column+'-'+row+'.webp',x:column*tileWidth,y:row*tileHeight,width:Math.min(tileWidth,map.width-column*tileWidth),height:Math.min(tileHeight,map.height-row*tileHeight)});
 return tiles;
}

export function deviceLocationTarget(manifest:PlanetManifest,latitude:number,longitude:number){
 const {bbox,localBounds}=manifest.aoi;
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude<bbox.south||latitude>bbox.north||longitude<bbox.west||longitude>bbox.east)return null;
 const {east,north}=createLocalFrame(manifest.origin).toLocal(longitude,latitude);
 if(east<localBounds[0]||east>localBounds[2]||north<localBounds[1]||north>localBounds[3])return null;
 return {east,north};
}

export async function requestBengaluruDeviceLocation(manifest:PlanetManifest,provider:Pick<Geolocation,'getCurrentPosition'>|undefined){
    if(!provider) throw new Error('Device location is unavailable. Open this page over HTTPS or localhost.');
    const position = await new Promise<GeolocationPosition>((resolve,reject) => provider.getCurrentPosition(resolve,error => reject(new Error(error.code === 1 ? 'Location permission was denied. Allow location access and try again.' : error.code === 3 ? 'Finding your location timed out. Please try again.' : 'Your device could not determine its location. Please try again.')),{enableHighAccuracy:true,maximumAge:0,timeout:15000}));
    const {latitude,longitude,accuracy} = position.coords;
    if(!deviceLocationTarget(manifest,latitude,longitude)) throw new Error('Your device location is outside the mapped Bengaluru area.');
    return {latitude,longitude,accuracy:Number.isFinite(accuracy) ? Math.max(0,Math.round(accuracy)) : 0};
}

export function mapPoint(bounds:readonly [number,number,number,number],east:number,north:number){
 const [west,south,eastEdge,northEdge]=bounds;
 return {x:(east-west)/(eastEdge-west),y:(northEdge-north)/(northEdge-south)};
}

export function mapCoordinates(bounds:readonly [number,number,number,number],x:number,y:number){
 const [west,south,eastEdge,northEdge]=bounds;
 return {east:west+x*(eastEdge-west),north:northEdge-y*(northEdge-south)};
}

export function createBengaluruLocator(manifest:PlanetManifest){
 const frame=createLocalFrame(manifest.origin),areas=manifest.places.filter(place=>place.rank>=2&&place.rank<=4);
 return (position:BengaluruPosition):BengaluruLocation|null=>{
  if(!Number.isFinite(position.east)||!Number.isFinite(position.north))return null;
  const nearestArea=areas.reduce<typeof areas[number]|undefined>((best,place)=>!best||Math.hypot(place.local[0]-position.east,place.local[1]-position.north)<Math.hypot(best.local[0]-position.east,best.local[1]-position.north)?place:best,undefined);
  const nearestLandmark=manifest.landmarks.reduce<typeof manifest.landmarks[number]|undefined>((best,place)=>!best||Math.hypot(place.local[0]-position.east,place.local[1]-position.north)<Math.hypot(best.local[0]-position.east,best.local[1]-position.north)?place:best,undefined);
  const areaDistance=nearestArea?Math.hypot(nearestArea.local[0]-position.east,nearestArea.local[1]-position.north):Infinity;
  const landmarkDistance=nearestLandmark?Math.hypot(nearestLandmark.local[0]-position.east,nearestLandmark.local[1]-position.north):Infinity;
  const nearby=nearestLandmark&&landmarkDistance<=(nearestLandmark.featureClass==='park'?350:160)?nearestLandmark.label:null;
  const area=nearestArea&&areaDistance<=5000?nearestArea.name:manifest.name;
  const coordinates=frame.toGeodetic(position.east,position.north),point=mapPoint(manifest.aoi.localBounds,position.east,position.north);
  return {...position,longitude:coordinates.lon,latitude:coordinates.lat,label:nearby?'Near '+nearby:area,area,nearby,distanceM:nearby?landmarkDistance:areaDistance===Infinity?null:areaDistance,mapX:point.x,mapY:point.y};
 };
}
