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
export const cueNotes:Record<SoundCue,Note[]>={
 footstep:[{midi:37,duration:.055,gain:.038,wave:'triangle'}],
 machine:[45,52,57,64].map(midi=>({midi,duration:.2,gain:.055,wave:'triangle'})),
 pickup:[76,83].map(midi=>({midi,duration:.22,gain:.07,wave:'sine'})),
 delivery:[69,73,76,81].map(midi=>({midi,duration:.4,gain:.065,wave:'sine'})),
 demo:[64,71].map(midi=>({midi,duration:.13,gain:.04,wave:'triangle'})),
 creature:[88,91].map(midi=>({midi,duration:.09,gain:.018,wave:'sine'})),
};
