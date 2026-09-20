'use client';
import {ArrowLeft,ArrowUpRight,Orbit,FileText} from 'lucide-react';
import {transitStops} from './transit-config';
import {civilizationFor,civilizations} from './civilization-config';
import './civilizations.css';

export function CivilizationObservation({destination,close}:{destination:number;close:()=>void}){
  const stop=transitStops[destination],identity=civilizationFor(stop),profile=identity?civilizations[identity]:null;
  return <section className="civilization-observation" aria-label="Orbital observatory">
    <header><span><Orbit size={14}/> ORBITAL OBSERVATORY / {String(destination).padStart(2,'0')}</span>
      <h1>{profile?.name??stop.name}</h1><p>{profile?`${profile.brand} / ${identity==='github'?'sahil-lab':'Sahil Upadhyay'}`:stop.subtitle}</p>
    </header>
    <footer><button onClick={close}><ArrowLeft size={17}/> Return to exploration</button>
      {profile&&<a href={profile.url} target="_blank" rel="noopener noreferrer"><img src={`/assets/brands/${identity}.svg`} alt=""/>{profile.brand} profile <ArrowUpRight size={16}/></a>}
      {identity==='linkedin'&&<a href="/resume" target="_blank" rel="noopener noreferrer"><FileText size={16}/> Orbital resume</a>}
    </footer>
  </section>;
}
