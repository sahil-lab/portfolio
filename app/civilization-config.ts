import * as resume from './resume-data.json';
import type {TransitStop} from './transit-config';

export type Civilization='github'|'linkedin';
export const civilizations={
  github:{
    name:'The Forge',brand:'GitHub',url:resume.links.find(link=>link.label==='GitHub')!.url,
    ground:'#17191d',terrain:'#353941',stone:'#e9edf1',metal:'#8e99a5',glass:'#303943',water:'#788997',
    light:'#eff8ff',accent:'#d4b36b',badge:'FORGE VISITED',
    districts:['Repository Foundries','Branch Junction','Release Harbor','Archive Quarter','Issue Workshop','Source Observatory'],
  },
  linkedin:{
    name:'The Citadel',brand:'LinkedIn',url:resume.links.find(link=>link.label==='LinkedIn')!.url,
    ground:'#dce9f2',terrain:'#a5c3dd',stone:'#f7fbff',metal:'#aabfce',glass:'#0a66c2',water:'#167fc4',
    light:'#cbeaff',accent:'#0a66c2',badge:'CITADEL VISITED',
    districts:['Academy Quarter','Career Promenade','Knowledge Spires','Credential Court','Collaboration Forum','Horizon Observatory'],
  },
} as const;

export function civilizationFor(stop:Pick<TransitStop,'id'>):Civilization|null{
  return stop.id==='copper'?'github':stop.id==='prism'?'linkedin':null;
}

export const careerTimeline=[
  {name:resume.education.name,role:resume.education.degree,dates:resume.education.year,kind:'education' as const},
  ...resume.experience.slice().reverse().map(entry=>({name:entry.name,role:entry.role,dates:entry.dates,kind:'experience' as const})),
];
export const careerCredentials=resume.certifications;
export const careerSkills=resume.skills;
export const careerSource='Portfolio resume / curated, not a live LinkedIn feed';