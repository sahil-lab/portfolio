import type {DeliverySnapshot} from './delivery-state';
import {isQualityChoice,type QualityChoice} from './quality-tiers';
export type Settings={muted:boolean;volume:number;stableCamera:boolean;reducedMotion:boolean;quality:QualityChoice};
export const defaultSettings:Settings={muted:true,volume:.6,stableCamera:false,reducedMotion:false,quality:'auto'};
export type SaveData={version:1;settings:Settings;delivery:DeliverySnapshot|null};
export const SAVE_KEY='living-computer-kingdom:v1';
const validRecipients=['owl','chameleon','cloud','tortoises'];
export function validateDelivery(value:unknown):DeliverySnapshot|null {
  if(!value||typeof value!=='object')return null;
  const s=value as DeliverySnapshot;
  if(!Number.isSafeInteger(s.round)||s.round<1||!Number.isSafeInteger(s.completedRounds)||s.completedRounds<0||s.completedRounds>s.round)return null;
  if(!['idle','preparing','ready','complete'].includes(s.phase))return null;
  if(![s.inventory,s.stock].every(n=>Number.isInteger(n)&&n>=0&&n<=4))return null;
  if(!Array.isArray(s.delivered)||s.delivered.some(id=>!validRecipients.includes(id))||new Set(s.delivered).size!==s.delivered.length)return null;
  if(!Array.isArray(s.discoveries)||s.discoveries.length>100||s.discoveries.some(id=>typeof id!=='string'||id.length>80))return null;
  if((s.phase==='ready'||s.phase==='complete')&&s.stock+s.inventory+s.delivered.length!==4)return null;
  if((s.phase==='idle'||s.phase==='preparing')&&(s.stock||s.inventory||s.delivered.length))return null;
  if(s.phase==='complete'&&s.delivered.length!==4||s.phase==='ready'&&s.delivered.length===4)return null;
  // In-flight preparation restarts safely; never duplicate an already collected capsule.
  return {...s,phase:s.phase==='preparing'?'idle':s.phase,discoveries:[...new Set(s.discoveries)],delivered:[...s.delivered],message:'Progress restored. Explore freely or continue your delivery round.'};
}
export function parseSave(raw:string|null):SaveData {
  const fallback:SaveData={version:1,settings:{...defaultSettings},delivery:null};
  try {
    if(!raw)return fallback;const data=JSON.parse(raw);if(data.version!==1)return fallback;
    const s=data.settings??{};
    return {version:1,delivery:validateDelivery(data.delivery),settings:{muted:typeof s.muted==='boolean'?s.muted:true,volume:Number.isFinite(s.volume)?Math.max(0,Math.min(1,s.volume)):.6,stableCamera:s.stableCamera===true,reducedMotion:s.reducedMotion===true,quality:isQualityChoice(s.quality)?s.quality:'auto'}};
  } catch{return fallback;}
}
export function loadSave():SaveData {try{const raw=localStorage.getItem(SAVE_KEY);const saved=parseSave(raw);if(!raw)saved.settings.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;return saved}catch{return parseSave(null)}}
export function writeSave(settings:Settings,delivery:DeliverySnapshot|null):boolean {try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,settings,delivery}));return true}catch{return false}}
