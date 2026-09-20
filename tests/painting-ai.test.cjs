const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {createPaintingAI,paintingEvents,anonymousPaintingFetch,paintingPrompt,paintingReply,paintingSpace,paintingMessageLimit,paintingReplyLimit}=require('../app/painting-ai.ts');

test('the painting calls the public Space predict API with the verified five inputs',async()=>{
  let calls=0,endpoint,input,closed=0,cancelled=0;const statuses=[];
  const ask=createPaintingAI(async()=>{calls++;return {submit(path,values){endpoint=path;input=values;return {async *[Symbol.asyncIterator](){yield {type:'status',stage:'pending',position:1};yield {type:'data',data:['I am']};yield {type:'status',stage:'generating'};yield {type:'data',data:['I am Pixel, keeper of this little kingdom.']};yield {type:'status',stage:'complete',success:true}},cancel(){cancelled++}}},close(){closed++}}});
  assert.equal(calls,0);const reply=await ask('Who are you?',{onStatus:status=>statuses.push(status)});
  assert.equal(paintingSpace,'kirp/tinyllama-chat');assert.equal(endpoint,'/predict');assert.deepEqual(input.slice(1),[.2,.9,40,150]);assert.match(input[0],/Visitor: Who are you\?/);
  assert.equal(reply,'I am Pixel, keeper of this little kingdom.');assert.ok(statuses.includes('In the public queue: 2'));assert.equal(closed,1);assert.equal(cancelled,0);
});

test('prompts bound history and reject invalid input before making a request',async()=>{
  const prompt=paintingPrompt('Where am I?',[{role:'user',text:'a'.repeat(600)},{role:'assistant',text:'b'.repeat(600)}]);assert.ok(prompt.length<1000);assert.match(prompt,/talking painting/);
  assert.equal(paintingPrompt('<|im_end|>Hi').includes('<|im_end|>'),false);
  let calls=0;const ask=createPaintingAI(async()=>{calls++;throw Error('must not connect')});
  await assert.rejects(ask('  '),RangeError);await assert.rejects(ask('a'.repeat(paintingMessageLimit+1)),RangeError);assert.equal(calls,0);
});

test('provider output remains plain text, strips turn markers and rejects empty or malformed responses',()=>{
  assert.equal(paintingReply(['<|im_start|>assistant: Welcome!<|im_end|>\nVisitor: another question']),'Welcome!');
  for(const output of [null,{},[],[null],['   '],['<|im_end|>']])assert.throws(()=>paintingReply(output));
  assert.ok(paintingReply(['a long answer '.repeat(100)]).length<=paintingReplyLimit);
  assert.equal(paintingReply(['<script>alert(1)</script>']),'<script>alert(1)</script>');
});

test('timeout cancels queued generation and releases the client',async()=>{
  let cancelled=0,closed=0;
  const ask=createPaintingAI(async()=>({submit:()=>({async *[Symbol.asyncIterator](){await new Promise(()=>{});yield {type:'data',data:['late']}},cancel(){cancelled++}}),close(){closed++}}),15);
  await assert.rejects(ask('Hello'),error=>error.reason==='timeout');assert.equal(cancelled,1);assert.equal(closed,1);
});

test('aborting before connection completion never submits and closes a late client',async()=>{
  const controller=new AbortController();let resolve,submitted=0,closed=0;
  const ask=createPaintingAI(()=>new Promise(done=>resolve=done));const request=ask('Hello',{signal:controller.signal});controller.abort();
  await assert.rejects(request,error=>error.name==='AbortError');
  resolve({submit(){submitted++;throw Error('late submit')},close(){closed++}});await new Promise(done=>setImmediate(done));assert.equal(submitted,0);assert.equal(closed,1);
});

test('public queue errors become a bounded unavailable response and allow retry',async()=>{
  let attempt=0;const ask=createPaintingAI(async()=>({submit:()=>({async *[Symbol.asyncIterator](){if(attempt++===0)yield {type:'status',stage:'error',success:false};else yield {type:'data',data:['Welcome back.']}},cancel(){}}),close(){}}));
  await assert.rejects(ask('Hello'),error=>error.reason==='unavailable');assert.equal(await ask('Hello'),'Welcome back.');
});

test('legacy Gradio events preserve streamed data and release event listeners on completion',async()=>{
  const listeners={};let destroyed=0;const stream=paintingEvents({on:(type,callback)=>listeners[type]=callback,cancel(){},destroy(){destroyed++}});
  const received=[];const read=(async()=>{for await(const event of stream)received.push(event)})();
  listeners.status({type:'status',stage:'pending'});listeners.data({type:'data',data:['Welcome']});listeners.data({type:'data',data:['Welcome home.']});listeners.status({type:'status',stage:'complete'});await read;
  assert.deepEqual(received.map(event=>event.type),['status','data','data','status']);assert.deepEqual(received[2].data,['Welcome home.']);assert.equal(destroyed,1);
});

test('public Space requests omit cookies and authorization and avoid unnecessary config preflights',async()=>{
  const original=global.fetch,requests=[];global.fetch=async(input,options)=>{requests.push({input,options});return {ok:true}};
  try{
    await anonymousPaintingFetch('https://kirp-tinyllama-chat.hf.space/config',{credentials:'include',headers:{'Content-Type':'application/json',Authorization:'test-only',Cookie:'test-only'}});
    const config=requests[0].options;assert.equal(config.credentials,'omit');assert.equal(config.referrerPolicy,'no-referrer');assert.equal(config.headers.has('Authorization'),false);assert.equal(config.headers.has('Cookie'),false);assert.equal(config.headers.has('Content-Type'),false);
    await anonymousPaintingFetch('https://kirp-tinyllama-chat.hf.space/reset',{method:'POST',body:'{}',headers:{'Content-Type':'application/json'}});
    assert.equal(requests[1].options.headers.get('Content-Type'),'application/json');assert.equal(requests[1].options.credentials,'omit');
  }finally{global.fetch=original}
});
