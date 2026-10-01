/** Original 80 BPM pentatonic composition. Shared by live playback and offline trailer mix. */
export type Note={midi:number;duration:number;gain:number;wave:'sine'|'triangle'};
export type SoundCue='footstep'|'machine'|'pickup'|'delivery'|'demo'|'creature';
export function scoreBeat(district:number,beat:number):Note[]{
 const phrase=[0,7,9,4,2,7,4,2],roots=[48,45,50,53,48,43,50,45];
 const root=roots[district]??48,k=((beat%8)+8)%8;
 const notes:Note[]=[{midi:root+12+phrase[k],duration:district===2?1.25:.55,gain:district===2?.026:.023,wave:'sine'}];
 if(beat%4===0)notes.push({midi:root,duration:2.6,gain:.028,wave:'sine'});
 if(district===1&&beat%2===0)notes.push({midi:root-12,duration:.3,gain:.05,wave:'triangle'});
 if(district===3)notes.push({midi:root+24+phrase[(k+3)%8],duration:.85,gain:.014,wave:'triangle'});
 if(district===4||district===7)notes.push({midi:76+(beat%2)*7,duration:.055,gain:.016,wave:'triangle'});
 return notes;
}
const planetaryPhrases:Record<string,{root:number;phrase:number[];pulse:number;wave:'sine'|'triangle'}>={
 copper:{root:41,phrase:[0,7,0,10,7,3,0,7],pulse:2,wave:'triangle'},
 garden:{root:48,phrase:[0,4,7,9,7,4,2,0],pulse:4,wave:'sine'},
 prism:{root:50,phrase:[0,7,12,9,7,4,7,2],pulse:4,wave:'triangle'},
 petal:{root:53,phrase:[9,7,4,2,0,4,7,4],pulse:4,wave:'sine'},
 solstice:{root:45,phrase:[0,4,9,7,12,9,4,7],pulse:2,wave:'triangle'},
 cloud:{root:55,phrase:[12,9,7,4,7,9,4,2],pulse:8,wave:'sine'},
 'ai-research':{root:46,phrase:[0,2,7,9,2,4,9,7],pulse:4,wave:'sine'},
 'project-foundry':{root:43,phrase:[0,0,7,3,0,7,10,7],pulse:2,wave:'triangle'},
 'skills-technology':{root:47,phrase:[0,4,7,4,9,7,2,4],pulse:4,wave:'triangle'},
};
export function planetScoreBeat(id:string,beat:number):Note[]{
 const score=planetaryPhrases[id];if(!score)return scoreBeat(0,beat);const phase=((Math.trunc(beat)%8)+8)%8;
 const notes:Note[]=[{midi:score.root+12+score.phrase[phase],duration:id==='cloud'?1.7:.8,gain:.017,wave:score.wave}];
 if(phase%score.pulse===0)notes.push({midi:score.root,duration:2.4,gain:.022,wave:'sine'});
 return notes;
}
export const cueNotes:Record<SoundCue,Note[]>={
 footstep:[{midi:37,duration:.055,gain:.038,wave:'triangle'}],
 machine:[45,52,57,64].map(midi=>({midi,duration:.2,gain:.055,wave:'triangle'})),
 pickup:[76,83].map(midi=>({midi,duration:.22,gain:.07,wave:'sine'})),
 delivery:[69,73,76,81].map(midi=>({midi,duration:.4,gain:.065,wave:'sine'})),
 demo:[64,71].map(midi=>({midi,duration:.13,gain:.04,wave:'triangle'})),
 creature:[88,91].map(midi=>({midi,duration:.09,gain:.018,wave:'sine'})),
};
