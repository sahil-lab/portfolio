const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {PaintingInteraction}=require('../app/painting-interaction.ts'),{PortraitSpeaker}=require('../app/portrait-speaker.ts');
function setup(ask=async()=> 'Welcome to the kingdom.'){
  const captures=[],questions=[],spoken=[],notices=[],state={near:true,enabled:0,stopped:0};
  const speaker=new PortraitSpeaker(()=>{},{getVoices:()=>[],speak:utterance=>{spoken.push(utterance.text);utterance.onstart?.()},cancel:()=>state.stopped++},text=>({text}));
  const interaction=new PaintingInteraction(speaker,{available:()=>state.near,enableVoice:()=>{state.enabled++;speaker.sound(true)},notice:text=>notices.push(text),clearCaption(){}},()=>{
    const capture={start(){this.onstart?.()},stop(){this.onend?.()},abort(){this.aborted=true}};captures.push(capture);return capture;
  },async(text,options)=>{questions.push(text);return ask(text,options)});
  return {interaction,speaker,captures,questions,spoken,notices,state};
}
function words(capture,text){capture.onresult({results:[{isFinal:true,0:{transcript:text}}]})}

test('nearby E interactions start capture then send once and speak directly through the painting',async()=>{
  const fixture=setup(),{interaction,captures,state,questions,spoken}=fixture;
  assert.equal(captures.length,0);assert.equal(interaction.interact(),true);assert.equal(captures.length,1);assert.equal(state.enabled,1);assert.equal(interaction.status,'LISTENING');assert.match(interaction.prompt,/Stop and send/);
  words(captures[0],'Who are you?');assert.equal(interaction.text,'Who are you?');assert.deepEqual(questions,[]);
  interaction.interact();await new Promise(done=>setImmediate(done));assert.deepEqual(questions,['Who are you?']);assert.deepEqual(spoken,['Welcome to the kingdom.']);assert.equal(interaction.text,'Welcome to the kingdom.');assert.match(interaction.status,/ON AIR/);
  interaction.dispose();fixture.speaker.dispose();
});

test('proximity alone never records and walking away cancels unsent speech',()=>{
  const {interaction,captures,state,questions,speaker}=setup();interaction.update();assert.equal(captures.length,0);
  state.near=false;assert.equal(interaction.interact(),false);state.near=true;interaction.interact();const receive=captures[0].onresult,end=captures[0].onend;
  state.near=false;interaction.update();assert.equal(captures[0].aborted,true);receive({results:[{isFinal:true,0:{transcript:'Do not send'}}]});end();assert.deepEqual(questions,[]);assert.equal(interaction.busy,false);interaction.dispose();speaker.dispose();
});

test('a third E cancels pending inference and ignores a late reply',async()=>{
  let finish,signal;const {interaction,captures,spoken,speaker}=setup((text,options)=>{signal=options.signal;return new Promise(resolve=>finish=resolve)});
  interaction.interact();words(captures[0],'What is nearby?');interaction.interact();assert.match(interaction.prompt,/Cancel Pixel/);interaction.interact();assert.equal(signal.aborted,true);
  finish('A late answer');await new Promise(done=>setImmediate(done));assert.deepEqual(spoken,[]);interaction.dispose();speaker.dispose();
});

test('stepping out of range blocks a resolved reply even before the next animation frame',async()=>{
  let finish;const {interaction,captures,state,spoken,speaker}=setup(()=>new Promise(resolve=>finish=resolve));
  interaction.interact();words(captures[0],'Hello');interaction.interact();state.near=false;finish('Do not speak here');await new Promise(done=>setImmediate(done));assert.deepEqual(spoken,[]);interaction.dispose();speaker.dispose();
});

test('pause or disposal aborts speech and hosted work without sending partial words',()=>{
  const {interaction,captures,questions,speaker}=setup();interaction.interact();words(captures[0],'Still speaking');interaction.cancel();assert.equal(captures[0].aborted,true);assert.deepEqual(questions,[]);
  interaction.interact();interaction.dispose();assert.equal(captures[1].aborted,true);assert.equal(interaction.interact(),false);speaker.dispose();
});

test('asking again interrupts the painting before opening the microphone',async()=>{
  const {interaction,captures,state,spoken,speaker}=setup();interaction.interact();words(captures[0],'Hello');interaction.interact();await new Promise(done=>setImmediate(done));assert.equal(spoken.length,1);
  interaction.interact();assert.equal(state.stopped,1);assert.equal(captures.length,2);assert.equal(speaker.active,false);interaction.dispose();speaker.dispose();
});
