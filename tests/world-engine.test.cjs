const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createShadowFollow}=require('../app/lighting-rig.ts');
const {createQualityGovernor,qualityTiers,qualityThresholds,tierOrder,isQualityChoice}=require('../app/quality-tiers.ts');
const {createAtmosphereBlend}=require('../app/atmosphere-blend.ts');

function lightSpace(sun,scene,point){
  scene.updateMatrixWorld(true);sun.shadow.updateMatrices(sun);
  return point.clone().applyMatrix4(sun.shadow.matrix);
}

test('shadow frustum follows the courier in whole texel steps so static shadows stay pinned',()=>{
  const scene=new T.Scene();scene.scale.setScalar(2);
  const sun=new T.DirectionalLight('#fff',2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-85,right:85,top:85,bottom:-85,far:900});scene.add(sun,sun.target);
  const follow=createShadowFollow(sun),origin=new T.Vector3(-40,22,-44),landmark=new T.Vector3(12,0,30);
  const texel=follow.texel(2);assert.ok(Math.abs(texel-170/2048/2)<1e-9);
  const samples=[];
  for(const anchor of [[0,.8,24],[.37,.8,24.61],[1.9,.8,26.2],[-3.3,.8,22.7]]){
    sun.position.copy(origin);follow.follow(new T.Vector3(...anchor),scene.scale.x);
    samples.push(lightSpace(sun,scene,landmark));
  }
  // shadow.matrix maps to [0,1] texture space; multiply by map size to count texels.
  for(const sample of samples.slice(1)){
    const dx=(sample.x-samples[0].x)*2048,dy=(sample.y-samples[0].y)*2048;
    assert.ok(Math.abs(dx-Math.round(dx))<1e-3&&Math.abs(dy-Math.round(dy))<1e-3,`landmark moved by ${dx}, ${dy} texels`);
  }
  // Without snapping the same anchors shift the landmark by fractional texels.
  sun.position.copy(origin);sun.target.position.set(.37,.8,24.61);sun.position.add(sun.target.position);
  const raw=lightSpace(sun,scene,landmark),drift=(raw.x-samples[0].x)*2048;
  assert.ok(Math.abs(drift-Math.round(drift))>.05,'control case drifts by a fractional texel');
  // The anchor itself stays within half a texel of where the courier actually is.
  sun.position.copy(origin);const snapped=follow.follow(new T.Vector3(5.123,.8,17.456),scene.scale.x);
  assert.ok(snapped.distanceTo(new T.Vector3(5.123,.8,17.456))<=texel*Math.SQRT1_2+1e-9);
});

test('quality governor demotes at once, promotes only after calm windows and never re-enters a tier it left',()=>{
  const governor=createQualityGovernor('balanced');
  assert.equal(governor.sample(15),null);assert.equal(governor.tier,'balanced');
  assert.equal(governor.sample(qualityThresholds.promoteP95Ms-1),null,'first calm window is not enough');
  assert.equal(governor.sample(qualityThresholds.promoteP95Ms-1),'high');
  assert.equal(governor.sample(qualityThresholds.demoteP95Ms+5),'balanced');
  for(let window=0;window<6;window++)assert.equal(governor.sample(5),null,'high is locked out after stepping down');
  assert.equal(governor.sample(60),'low');assert.equal(governor.sample(60),null,'low is the floor');
  governor.reset();assert.equal(governor.tier,'balanced');assert.equal(governor.ceiling,'high');
  assert.equal(governor.sample(NaN),null);assert.equal(governor.sample(0),null);
  assert.deepEqual(tierOrder,['low','balanced','high']);
  for(const tier of tierOrder)assert.ok(qualityTiers[tier].pixelRatio>=1&&Number.isFinite(qualityTiers[tier].shadowMapSize));
  assert.ok(qualityTiers.high.shadowInterval<qualityTiers.balanced.shadowInterval);
  assert.equal(isQualityChoice('auto'),true);assert.equal(isQualityChoice('ultra'),false);
});

test('saved settings accept every tier and fall back to auto for unknown values',()=>{
  const {parseSave}=require('../app/persistence.ts');
  assert.equal(parseSave(JSON.stringify({version:1,settings:{quality:'high'}})).settings.quality,'high');
  assert.equal(parseSave(JSON.stringify({version:1,settings:{quality:'low'}})).settings.quality,'low');
  assert.equal(parseSave(JSON.stringify({version:1,settings:{quality:'balanced'}})).settings.quality,'balanced');
  assert.equal(parseSave(JSON.stringify({version:1,settings:{quality:'ultra'}})).settings.quality,'auto');
  assert.equal(parseSave(null).settings.quality,'auto');
});

test('atmosphere blend damps numbers and colours independently and settles exactly',()=>{
  const blend=createAtmosphereBlend({fog:.001,sky:'#000000',count:0},{rate:2,rates:{count:.5}});
  const target={fog:.011,sky:'#ffffff',count:100};
  const first=blend.step(target,.1);
  assert.ok(first.fog>.001&&first.fog<.011);assert.ok(first.count>0&&first.count<10);assert.notEqual(first.sky,'#000000');assert.notEqual(first.sky,'#ffffff');
  assert.equal(blend.step(target,0).fog,first.fog,'zero time does not move');
  for(let frame=0;frame<2000;frame++)blend.step(target,1/60);
  assert.ok(Math.abs(blend.current.fog-.011)<1e-6);assert.equal(blend.current.sky,'#ffffff');assert.ok(Math.abs(blend.current.count-100)<.01);
  const settled=blend.settle({fog:.002,sky:'#123456',count:3});assert.deepEqual(settled,{fog:.002,sky:'#123456',count:3});assert.equal(blend.color('sky').getHexString(),'123456');
});
