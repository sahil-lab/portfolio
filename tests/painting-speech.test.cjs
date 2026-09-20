const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {PaintingSpeechInput}=require('../app/painting-speech.ts'),{PaintingConversation}=require('../app/painting-conversation.ts');
function setup(){const calls={start:0,stop:0,abort:0},recognition={start(){calls.start++;this.onstart?.()},stop(){calls.stop++;this.onend?.()},abort(){calls.abort++}};return {recognition,calls}}
const result=(text,isFinal)=>({isFinal,0:{transcript:text}});

test('microphone starts only on command and sends the final transcript only after explicit stop',()=>{
  const {recognition,calls}=setup(),submitted=[],heard=[];const voice=new PaintingSpeechInput({submit:text=>submitted.push(text),transcript:text=>heard.push(text)},()=>recognition,'en-IN');
  assert.equal(calls.start,0);voice.start();assert.equal(calls.start,1);assert.equal(recognition.lang,'en-IN');assert.equal(recognition.continuous,true);
  recognition.onresult({results:[result('Who',false)]});assert.deepEqual(submitted,[]);
  recognition.onresult({results:[result('Who are you?',true)]});assert.equal(voice.snapshot.transcript,'Who are you?');assert.deepEqual(submitted,[]);
  const end=recognition.onend;voice.stop();end();assert.deepEqual(submitted,['Who are you?']);assert.equal(calls.stop,1);assert.equal(voice.snapshot.listening,false);assert.equal(voice.snapshot.finishing,false);voice.cancel();
});

test('permission errors, unsupported browsers and empty recordings explain why nothing was sent',()=>{
  const {recognition}=setup();let submitted=0;const voice=new PaintingSpeechInput({submit:()=>submitted++,transcript(){}},()=>recognition);voice.start();recognition.onerror({error:'not-allowed'});
  assert.equal(voice.snapshot.listening,false);assert.match(voice.snapshot.error,/permission was denied/);assert.equal(submitted,0);
  const unsupported=new PaintingSpeechInput({submit(){},transcript(){}},null);assert.equal(unsupported.snapshot.supported,false);unsupported.start();assert.match(unsupported.snapshot.error,/Chrome or Edge/);
  voice.start();voice.stop();assert.match(voice.snapshot.error,/No speech/);voice.cancel();
});

test('closing or cancelling aborts recognition and prevents late transcripts from reaching the model',()=>{
  const {recognition,calls}=setup();let submitted=0;const voice=new PaintingSpeechInput({submit:()=>submitted++,transcript(){}},()=>recognition);voice.start();const receive=recognition.onresult,end=recognition.onend;
  voice.cancel();receive({results:[result('Late words',true)]});end();assert.equal(calls.abort,1);assert.equal(submitted,0);assert.equal(voice.snapshot.listening,false);
});

test('spoken question becomes model text and the model reply is passed to the painting voice',async()=>{
  const {recognition}=setup(),questions=[],spoken=[];let request;
  const chat=new PaintingConversation({say:text=>spoken.push(text),stop(){}},async text=>{questions.push(text);return 'I am Pixel, your painted guide.'});
  const voice=new PaintingSpeechInput({transcript(){},submit:text=>{request=chat.send(text)}},()=>recognition);
  voice.start();recognition.onresult({results:[result('Tell me',true),result('who you are',true)]});voice.stop();await request;
  assert.deepEqual(questions,['Tell me who you are']);assert.deepEqual(spoken,['I am Pixel, your painted guide.']);voice.cancel();chat.cancel();
});

test('overlong voice input is not silently truncated or sent',()=>{
  const {recognition}=setup();let submitted=0;const voice=new PaintingSpeechInput({submit:()=>submitted++,transcript(){}},()=>recognition);voice.start();recognition.onresult({results:[result('hello '.repeat(90),true)]});voice.stop();
  assert.equal(submitted,0);assert.match(voice.snapshot.error,/too long/);assert.ok(voice.snapshot.transcript.length>360);voice.cancel();
});

test('browser silence never sends a question; the next explicit stop sends the retained transcript',()=>{
  const {recognition}=setup(),submitted=[];const voice=new PaintingSpeechInput({submit:text=>submitted.push(text),transcript(){}},()=>recognition);
  voice.start();recognition.onresult({results:[result('Where is the train?',true)]});recognition.onend();
  assert.deepEqual(submitted,[]);assert.equal(voice.snapshot.listening,true);voice.stop();assert.deepEqual(submitted,['Where is the train?']);voice.cancel();
});

test('a restarted recognition session retains earlier speech until the second interaction',async context=>{
  context.mock.timers.enable({apis:['setTimeout']});const sessions=[],submitted=[];
  const voice=new PaintingSpeechInput({submit:text=>submitted.push(text),transcript(){}},()=>{const {recognition}=setup();sessions.push(recognition);return recognition});
  voice.start();sessions[0].onresult({results:[result('Tell me about',true)]});sessions[0].onend();context.mock.timers.tick(150);
  assert.equal(sessions.length,2);sessions[1].onresult({results:[result('the kingdom',true)]});assert.deepEqual(submitted,[]);
  voice.stop();assert.deepEqual(submitted,['Tell me about the kingdom']);voice.cancel();
});

test('recording safety timeout aborts without auto-submitting',context=>{
  context.mock.timers.enable({apis:['setTimeout']});const {recognition,calls}=setup(),submitted=[];
  const voice=new PaintingSpeechInput({submit:text=>submitted.push(text),transcript(){}},()=>recognition);voice.start();recognition.onresult({results:[result('A question',true)]});context.mock.timers.tick(30000);
  assert.equal(voice.snapshot.listening,false);assert.equal(calls.abort,1);assert.deepEqual(submitted,[]);assert.match(voice.snapshot.error,/Nothing was sent/);voice.cancel();
});
