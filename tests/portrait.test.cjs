const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {PortraitSpeaker}=require('../app/portrait-speaker.ts');

test('portrait chooses varied lines and animates captions without requesting a microphone',()=>{
  const captions=[],speaker=new PortraitSpeaker(text=>captions.push(text),null,undefined,()=>0);
  speaker.talk();const first=speaker.text,frames=new Set();for(let frame=0;frame<60;frame++){speaker.tick(1/60);frames.add(speaker.mouth)}
  assert.ok(frames.size>1);assert.equal(speaker.speaking,true);speaker.talk();assert.notEqual(speaker.text,first);assert.equal(captions.length,2);
  for(let frame=0;frame<200;frame++)speaker.tick(.1);assert.equal(speaker.speaking,false);assert.equal(speaker.mouth,0);speaker.dispose();
});

test('spoken portrait follows voice start and end, respects mute and ignores late callbacks',()=>{
  let spoken,cancelled=0;const engine={getVoices:()=>[],speak:utterance=>spoken=utterance,cancel:()=>cancelled++};
  const speaker=new PortraitSpeaker(()=>{},engine,text=>({text}),()=>0);speaker.sound(true,.4);speaker.talk();assert.equal(speaker.speaking,false);assert.equal(spoken.volume,.4);
  spoken.onstart();speaker.tick(.1);assert.equal(speaker.speaking,true);speaker.sound(false);assert.equal(cancelled,1);assert.equal(speaker.speaking,false);spoken.onstart();assert.equal(speaker.speaking,false);
  speaker.sound(true);speaker.talk();spoken.onstart();speaker.tick(.1,true);assert.equal(speaker.mouth,0);spoken.onend();assert.equal(speaker.mouth,0);speaker.dispose();spoken.onstart();assert.equal(speaker.speaking,false);
});

test('hosted replies use the existing voice and lip animation without selecting a scripted line',()=>{
  let spoken,caption;const speaker=new PortraitSpeaker(text=>caption=text,{getVoices:()=>[],speak:value=>spoken=value,cancel(){}},text=>({text}));speaker.sound(true);
  speaker.say('I am Pixel, your painted guide.');assert.equal(spoken.text,'I am Pixel, your painted guide.');assert.equal(caption,'Pixel: I am Pixel, your painted guide.');spoken.onstart();
  const mouths=new Set();for(let frame=0;frame<30;frame++){speaker.tick(.04);mouths.add(speaker.mouth)}assert.ok(mouths.size>1);speaker.dispose();
});
