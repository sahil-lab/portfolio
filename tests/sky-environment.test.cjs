const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createSkyEnvironment,skyEnvironmentSignature,skyEnvironmentShader,skyEnvironmentRadiance}=require('../app/sky-environment.ts');

function lightingFixture(){
  const sun=new T.DirectionalLight('#ffe5c2',2.6);sun.position.set(-40,65,70);sun.target.position.set(0,0,0);
  return {sun,up:new T.Vector3(0,1,0),zenith:new T.Color('#3d8fd6'),horizon:new T.Color('#8fc3e6'),ground:new T.Color('#5f6259')};
}
function stubRenderer(){
  const calls={render:0,targets:[]};let target=null;
  const renderer={coordinateSystem:T.WebGLCoordinateSystem,xr:{enabled:false},autoClear:true,toneMapping:T.NoToneMapping,outputColorSpace:T.SRGBColorSpace,
    getRenderTarget:()=>target,getActiveCubeFace:()=>0,getActiveMipmapLevel:()=>0,setRenderTarget(next){target=next;if(next)calls.targets.push(next)},render(){calls.render++},
    getClearColor:color=>color.set(0,0,0),getClearAlpha:()=>1,setClearColor(){},clear(){},compile(){}};
  return {renderer,calls};
}

function referenceSignature(input){
  const direction=input.sun.position.clone().sub(input.sun.target.position).normalize(),quantize=(value,steps)=>Math.round(value*steps);
  const colors=[input.zenith,input.horizon,input.ground].flatMap(color=>[quantize(color.r,48),quantize(color.g,48),quantize(color.b,48)]);
  return [quantize(direction.x,40),quantize(direction.y,40),quantize(direction.z,40),quantize(input.up.x,40),quantize(input.up.y,40),quantize(input.up.z,40),...colors,quantize(input.sun.color.r,32),quantize(input.sun.color.g,32),quantize(input.sun.color.b,32),quantize(input.sun.intensity,20)].join(',');
}

test('the sky environment signature quantizes slow sky changes and reacts to sun, orientation and palette',()=>{
  const input=lightingFixture(),base=skyEnvironmentSignature(input);
  input.zenith.r+=.004;assert.equal(skyEnvironmentSignature(input),base,'sub-step colour drift does not refresh');
  input.zenith.offsetHSL(0,0,.08);assert.notEqual(skyEnvironmentSignature(input),base);
  const shifted=lightingFixture();shifted.sun.position.set(40,65,70);assert.notEqual(skyEnvironmentSignature(shifted),base);
  const followed=lightingFixture();followed.sun.position.add(new T.Vector3(500,0,-300));followed.sun.target.position.set(500,0,-300);assert.equal(skyEnvironmentSignature(followed),base,'shadow-follow translation keeps the same direction');
  const tilted=lightingFixture();tilted.up.set(1,0,0);assert.notEqual(skyEnvironmentSignature(tilted),base);
  const dim=lightingFixture();dim.sun.intensity=.38;assert.notEqual(skyEnvironmentSignature(dim),base);
});

test('the environment dome shader uses float literals, ordered smoothsteps and a sun glow without a hard disk',()=>{
  const source=skyEnvironmentShader.fragmentShader;
  for(const literal of source.match(/(?<![\w.])\d+(\.\d+)?(?![\w.])/g))assert.match(literal,/\./,`integer literal ${literal}`);
  for(const match of source.matchAll(/smoothstep\(([\d.]+),([\d.]+)/g))assert.ok(Number(match[1])<Number(match[2]),'smoothstep edges must ascend');
  assert.ok(source.includes('pow(toward,6.0)')&&source.includes('pow(toward,48.0)'));assert.doesNotMatch(source,/(?<!smooth)step\(/,'no hard sun disk');
  assert.ok(skyEnvironmentRadiance.highlight>skyEnvironmentRadiance.glow);assert.ok(skyEnvironmentRadiance.ground<skyEnvironmentRadiance.sky);
});

test('skylight pales the sky colour, lifts moonlit nights to a floor and leaves bright days unlifted',()=>{
  const {skylightColor}=require('../app/sky-environment.ts'),day=skylightColor(new T.Color(),new T.Color('#3d8fd6')),source=new T.Color('#3d8fd6');
  const chroma=color=>(Math.max(color.r,color.g,color.b)-Math.min(color.r,color.g,color.b))/Math.max(color.r,color.g,color.b);
  assert.ok(chroma(day)<chroma(source)*.85&&chroma(day)>chroma(source)*.35,'daylight fill keeps part of the sky hue');
  const luminance=color=>color.r*.2126+color.g*.7152+color.b*.0722;
  assert.ok(Math.abs(luminance(day)/skyEnvironmentRadiance.sky-luminance(source))<1e-6,'bright skies keep their luminance');assert.ok(day.b>day.r);
  const night=skylightColor(new T.Color(),new T.Color('#101f2d'));
  assert.ok(Math.abs(luminance(night)/skyEnvironmentRadiance.sky-skyEnvironmentRadiance.floor)<1e-6,'dim skies rise to the moonlit floor');assert.ok(night.b>night.r);
});

test('refreshes reuse one prefiltered target, throttle during cross-fades and re-render after invalidation',()=>{
  const {renderer,calls}=stubRenderer(),environment=createSkyEnvironment(renderer,16),input=lightingFixture();
  assert.equal(environment.texture,null);
  assert.equal(environment.update(input,0,.25),true);const texture=environment.texture;assert.ok(texture);assert.equal(texture.mapping,T.CubeUVReflectionMapping);assert.equal(environment.generations,1);
  const rendersPerRefresh=calls.render;assert.ok(rendersPerRefresh>=6,'six cube faces are captured');
  assert.equal(environment.update(input,.1,.25),false,'an unchanged sky is not re-rendered');assert.equal(calls.render,rendersPerRefresh);
  input.zenith.set('#101f2d');assert.equal(environment.update(input,.15,.25),false,'changes wait for the refresh interval');
  assert.equal(environment.update(input,.3,.25),true);assert.equal(environment.texture,texture,'the environment texture identity is stable so materials keep their programs');assert.equal(environment.generations,2);
  assert.equal(calls.render,rendersPerRefresh*2);
  assert.equal(environment.update(input,.4,.25),false);environment.invalidate();assert.equal(environment.update(input,.41,.25),true);assert.equal(environment.generations,3);
  assert.equal(renderer.xr.enabled,false);assert.equal(renderer.getRenderTarget(),null,'the previous render target is restored');
  environment.dispose();assert.equal(environment.texture,null);
});

test('numeric environment keys retain every refresh decision through fades, planet rotation and invalidation',()=>{
  const {renderer}=stubRenderer(),environment=createSkyEnvironment(renderer,16),input=lightingFixture();let signature='',refreshed=-Infinity,dirty=true,generations=0;
  for(let frame=0;frame<360;frame++){
    const phase=frame/60,interval=frame<180?.25:.5;input.sun.position.set(-40+Math.sin(phase)*10,65,70+Math.cos(phase)*20);
    input.sun.intensity=2.9-frame/150;input.up.set(Math.sin(phase)*.8,1,Math.cos(phase)*.3).normalize();input.zenith.setRGB(.3+Math.sin(phase)*.05,.55,.75);
    input.horizon.setRGB(.6,.7+Math.sin(phase)*.04,.8);input.ground.setRGB(.2,.23,.25+Math.cos(phase)*.03);input.sun.color.setRGB(.9,.7+Math.cos(phase)*.05,.55);
    if(frame===91||frame===241){environment.invalidate();dirty=true}
    const next=referenceSignature(input),expected=dirty||next!==signature&&phase-refreshed>=interval;
    assert.equal(skyEnvironmentSignature(input),next,'public diagnostic key stays identical');assert.equal(environment.update(input,phase,interval),expected,'refresh at frame '+frame);
    if(expected){signature=next;refreshed=phase;dirty=false;generations++}
  }
  assert.equal(environment.generations,generations);environment.dispose();
});

test('unchanged sky updates do not allocate signature strings or arrays through join and flatMap',context=>{
  const {renderer,calls}=stubRenderer(),environment=createSkyEnvironment(renderer,16),input=lightingFixture();environment.update(input,0,.25);const renders=calls.render;
  let joins=0,flattenings=0;const originalJoin=Array.prototype.join,originalFlatMap=Array.prototype.flatMap;
  context.after(()=>{Array.prototype.join=originalJoin;Array.prototype.flatMap=originalFlatMap});
  Array.prototype.join=function(...args){if(this.length===19)joins++;return originalJoin.apply(this,args)};
  Array.prototype.flatMap=function(...args){flattenings++;return originalFlatMap.apply(this,args)};
  for(let frame=0;frame<120;frame++)assert.equal(environment.update(input,10+frame/60,.25),false);
  assert.equal(joins,0);assert.equal(flattenings,0);assert.equal(calls.render,renders);environment.dispose();
});

test('the world sources its reflections from the live sky instead of a downloaded studio HDR',()=>{
  const source=fs.readFileSync('app/world.ts','utf8');
  assert.match(source,/import \{createSkyEnvironment\} from '\.\/sky-environment'/);
  assert.doesNotMatch(source,/HDRLoader|RoomEnvironment|studio_small_03/);
  assert.match(source,/skyEnvironment\.invalidate\(\)/);assert.match(source,/skyEnvironment\.dispose\(\)/);
  assert.match(source,/zenith:scene\.background as T\.Color,horizon:\(scene\.fog as T\.FogExp2\)\.color,ground:hemisphere\.groundColor/);
});
