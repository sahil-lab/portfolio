const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {PaintingConversation}=require('../app/painting-conversation.ts'),{PaintingUnavailableError}=require('../app/painting-ai.ts');

test('a completed model response is shown and spoken once with bounded chat context',async()=>{
  const spoken=[],history=[];const chat=new PaintingConversation({say:text=>spoken.push(text),stop(){}},async(text,options)=>{history.push(options.history);options.onStatus('Pixel is thinking...');return 'Welcome to the kingdom.'});
  await chat.send('Where am I?');assert.equal(chat.snapshot.pending,false);assert.equal(chat.snapshot.messages[1].source,'tinyllama');assert.deepEqual(spoken,['Welcome to the kingdom.']);
  await chat.send('What is nearby?');assert.equal(history[1].length,2);chat.clear();assert.equal(chat.snapshot.messages.length,0);
});

test('cancellation ignores late answers and never speaks after the interaction ends',async()=>{
  let finish,signal;const spoken=[];const chat=new PaintingConversation({say:text=>spoken.push(text),stop(){}},(text,options)=>{signal=options.signal;return new Promise(resolve=>finish=resolve)});
  const pending=chat.send('Hello');assert.equal(await chat.send('A duplicate'),false);chat.cancel();assert.equal(signal.aborted,true);finish('A late response');await pending;
  assert.equal(chat.snapshot.messages.length,1);assert.equal(chat.snapshot.pending,false);assert.deepEqual(spoken,[]);
});

test('provider failure is explicitly marked as scripted and retry does not include fallback as model context',async()=>{
  let attempts=0;const history=[],spoken=[];const chat=new PaintingConversation({say:text=>spoken.push(text),stop(){}},async(text,options)=>{history.push(options.history);if(attempts++===0)throw new PaintingUnavailableError('timeout');return 'I am back.'},()=>0);
  await chat.send('Hello');assert.equal(chat.snapshot.messages[1].source,'scripted');assert.match(chat.snapshot.error,/too long/);assert.match(spoken[0],/public AI is unavailable/);
  await chat.send('Try again');assert.equal(chat.snapshot.messages.at(-1).source,'tinyllama');assert.deepEqual(history[1],[]);
});
