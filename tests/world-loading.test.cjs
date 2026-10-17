const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.tsx']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
require.extensions['.css']=()=>{};
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{WorldLoading,loadingStage,completedPreparations,greetingLine,bootLog,preparationNames,loadingExitMs,bindLoadingPointer}=require('../app/world-loading.tsx');
function pointerFixture(){
 const frames=new Map(),styles=new Map(),view=new EventTarget(),document=new EventTarget(),preference=new EventTarget(),element=new EventTarget();let next=0,reads=0,writes=0,width=100;
 preference.matches=false;view.matchMedia=()=>preference;view.requestAnimationFrame=callback=>{frames.set(++next,callback);return next};view.cancelAnimationFrame=id=>frames.delete(id);document.defaultView=view;document.hidden=false;element.ownerDocument=document;
 element.getBoundingClientRect=()=>{reads++;return {left:0,top:0,width,height:100}};element.style={setProperty:(name,value)=>{writes++;styles.set(name,value)},removeProperty:name=>styles.delete(name)};
 return {element,view,document,preference,frames,styles,get reads(){return reads},get writes(){return writes},resize(value){width=value;view.dispatchEvent(new Event('resize'))},pointer(horizontal,vertical,type='mouse'){const event=new Event('pointermove');Object.assign(event,{clientX:horizontal,clientY:vertical,pointerType:type});element.dispatchEvent(event)},flush(){for(const [id,callback] of [...frames]){frames.delete(id);callback()}}};
}
test('ready handoff has no fixed pre-fade wait and uses one short shared duration',()=>{
 assert.equal(loadingExitMs,180);const html=renderToStaticMarkup(React.createElement(WorldLoading,{ready:true}));assert.match(html,/--loader-exit-duration:180ms/);
 const css=fs.readFileSync('app/world-loading.css','utf8');assert.match(css,/transition: opacity var\(--loader-exit-duration, 180ms\) ease,/);assert.ok(!css.includes('ease .5s'));
});
test('loader pointer bursts use one layout read and one style update per animation frame',()=>{
 const fixture=pointerFixture(),dispose=bindLoadingPointer(fixture.element);
 for(let event=0;event<100;event++)fixture.pointer(event,event);
 assert.equal(fixture.frames.size,1);assert.equal(fixture.reads,0);assert.equal(fixture.writes,0);fixture.flush();assert.equal(fixture.reads,1);assert.equal(fixture.writes,4);
 fixture.pointer(80,40);fixture.flush();assert.equal(fixture.reads,1);assert.ok(Math.abs(parseFloat(fixture.styles.get('--gaze-x'))-2.4)<1e-8);
 fixture.resize(200);fixture.pointer(100,50);fixture.flush();assert.equal(fixture.reads,2);assert.equal(fixture.styles.get('--gaze-x'),'0px');
 fixture.pointer(20,20);dispose();assert.equal(fixture.frames.size,0);assert.equal(fixture.styles.size,0);fixture.pointer(10,10);assert.equal(fixture.frames.size,0);
});
test('pointer effects stop on touch, reduced motion, hidden documents and pointer leave',()=>{
 const fixture=pointerFixture(),dispose=bindLoadingPointer(fixture.element);
 fixture.pointer(20,20,'touch');assert.equal(fixture.frames.size,0);fixture.preference.matches=true;fixture.pointer(20,20);assert.equal(fixture.frames.size,0);fixture.preference.matches=false;
 fixture.pointer(20,20);fixture.document.hidden=true;fixture.document.dispatchEvent(new Event('visibilitychange'));assert.equal(fixture.frames.size,0);fixture.pointer(20,20);assert.equal(fixture.frames.size,0);
 fixture.document.hidden=false;fixture.pointer(20,20);fixture.element.dispatchEvent(new Event('pointerleave'));fixture.flush();assert.equal(fixture.styles.size,0);dispose();
});
test('loading stages use completed preparations rather than simulated percentages',()=>{
 assert.equal(loadingStage(0).step,0);
 for(const prepared of [1,2,3,4,5])assert.equal(loadingStage(prepared).step,1);
 assert.equal(loadingStage(6).step,2);
 assert.equal(loadingStage(99).step,2);
});
test('loading shell is server-renderable with accessible status, motion control, and HTML exits',()=>{
 const html=renderToStaticMarkup(React.createElement(WorldLoading,{ready:false,prepared:2}));
 for(const value of ['<output','aria-live="polite"','Unpacking the little things','Pause loading animation','href="/projects"','href="/resume"','pocket-kingdom-v2.webp','Send the kingdom a little love'])assert.ok(html.includes(value),value);
 assert.ok(!html.includes('aria-valuenow'));
 assert.ok(!html.includes('<canvas'));
});
test('ready shell is inert immediately and reduced motion starts still',()=>{
 const ready=renderToStaticMarkup(React.createElement(WorldLoading,{ready:true}));
 assert.match(ready,/data-ready="true"/);assert.match(ready,/aria-hidden="true"/);assert.match(ready,/inert=""/);
 const reduced=renderToStaticMarkup(React.createElement(WorldLoading,{ready:false,reducedMotion:true}));
 assert.match(reduced,/data-still="true"/);assert.match(reduced,/disabled=""/);
});
test('preparation milestones use real bounded counts and never simulate percentage completion',()=>{
 for(const [input,expected] of [[-1,0],[0,0],[2.8,2],[6,6],[99,6],[NaN,0],[Infinity,0]])assert.equal(completedPreparations(input),expected);
 for(const prepared of [0,2,6]){
  const html=renderToStaticMarkup(React.createElement(WorldLoading,{ready:false,prepared}));
  assert.match(html,new RegExp('<progress[^>]*value="'+prepared+'"[^>]*max="6"'));
  assert.equal((html.match(/data-complete="true"/g)??[]).length,prepared);
 }
});
test('greeting follows the latest reaction, the real phase, and readiness',()=>{
 const idle={ready:false,reaction:null,boops:0,step:1};
 assert.equal(greetingLine(idle),'Ooh, the traces are lighting!');
 assert.equal(greetingLine({...idle,step:0}),'Zzz... warming up the board.');
 assert.equal(greetingLine({...idle,step:2}),'Almost awake. Hi, hi!');
 assert.equal(greetingLine({...idle,reaction:'love',boops:3}),'Love received!');
 assert.equal(greetingLine({...idle,reaction:'boop',boops:1}),'Eek! Hi there!');
 assert.equal(greetingLine({...idle,reaction:'boop',boops:2}),'Hehe, that tickles!');
 assert.equal(greetingLine({...idle,reaction:'boop',boops:6}),'Eek! Hi there!');
 assert.equal(greetingLine({...idle,ready:true,reaction:'love'}),'Welcome in! Make yourself at home.');
});
test('decorative layers are hidden from assistive technology and the boop control is named',()=>{
 const html=renderToStaticMarkup(React.createElement(WorldLoading,{ready:false,prepared:4}));
 assert.ok(html.includes('aria-label="Boop the little computer"'));
 for(const className of ['kingdom-loader-backdrop','kingdom-loader-board','kingdom-loader-cells','kingdom-loader-zzz'])assert.match(html,new RegExp('class="'+className+'" aria-hidden="true"'),className);
 assert.ok(!html.includes('kingdom-loader-piece'));
 assert.ok(!html.includes('kingdom-loader-burst'));
});
test('the boot log names finished preparations in their real order and never invents completions',()=>{
 assert.deepEqual(bootLog(2,['craft kit','world runtime']).map(row=>row.name+(row.done?'*':'')),['craft kit*','world runtime*','world kit','architecture kit','life kit','city shells']);
 assert.deepEqual(bootLog(0,[]).filter(row=>row.done),[]);
 assert.deepEqual(bootLog(1,['not a real step']).filter(row=>row.done),[]);
 assert.deepEqual(bootLog(6,[...preparationNames].reverse()).map(row=>row.name),[...preparationNames].reverse());
 assert.equal(bootLog(3).filter(row=>row.done).length,3,'without completion names the fixed order is used');
 const html=renderToStaticMarkup(React.createElement(WorldLoading,{ready:false,prepared:2,preparations:['life kit','world kit']}));
 assert.equal((html.match(/data-complete="true"/g)??[]).length,2);
 assert.ok(html.indexOf('life kit')<html.indexOf('world kit')&&html.indexOf('world kit')<html.indexOf('world runtime'));
 for(const trace of ['data-lit="true"'])assert.ok(html.includes(trace));
 assert.equal((html.match(/class="kingdom-loader-trace" data-lit="true"/g)??[]).length,2,'two of six traces are powered');
});
test('the twelve-piece celebration appears only after the real ready signal',()=>{
 const waiting=renderToStaticMarkup(React.createElement(WorldLoading,{ready:false,prepared:6}));
 assert.ok(!waiting.includes('kingdom-loader-piece'));
 const ready=renderToStaticMarkup(React.createElement(WorldLoading,{ready:true,prepared:6}));
 assert.equal((ready.match(/class="kingdom-loader-piece"/g)??[]).length,12);
 assert.ok(ready.includes('Welcome in! Make yourself at home.'));
});