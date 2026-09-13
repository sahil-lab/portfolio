const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {scoreBeat,cueNotes}=require('../app/audio-score.ts');
test('original district score is deterministic, distinct, bounded and finite',()=>{
 const phrases=[];for(let d=0;d<8;d++){const notes=Array.from({length:8},(_,b)=>scoreBeat(d,b));assert.deepEqual(notes,Array.from({length:8},(_,b)=>scoreBeat(d,b)));notes.flat().forEach(n=>{assert.ok(n.midi>=24&&n.midi<=100);assert.ok(n.duration>0&&n.duration<3);assert.ok(n.gain>0&&n.gain<.1)});phrases.push(JSON.stringify(notes))}assert.equal(new Set(phrases).size,8);assert.equal(Object.keys(cueNotes).length,6);
});
test('audio stays gesture gated and disposes active sources on mute',()=>{
 let contexts=0,stops=0,closed=0;const param={value:0,setTargetAtTime(){},setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}};
 global.AudioContext=class{currentTime=0;state='running';destination={};constructor(){contexts++}createGain(){return {gain:{...param},connect(){},disconnect(){}}}createDynamicsCompressor(){return {threshold:{},ratio:{},connect(){}}}createOscillator(){return {frequency:{},connect(){},disconnect(){},start(){},stop(){stops++}}}suspend(){this.state='suspended';return Promise.resolve()}resume(){this.state='running';return Promise.resolve()}close(){closed++;return Promise.resolve()}};
 const {KingdomAudio}=require('../app/kingdom-audio.ts'),audio=new KingdomAudio();audio.tick(0);audio.cue('pickup');assert.equal(contexts,0);audio.enable(true);audio.tick(1);audio.cue('pickup');assert.equal(contexts,1);const prior=stops;audio.enable(false);assert.ok(stops>prior);audio.dispose();assert.equal(closed,1);delete global.AudioContext;
});
