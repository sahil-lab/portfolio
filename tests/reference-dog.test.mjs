import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDog,coatColor,modelStatistics,MODEL_SPEC} from '../assets/reference-dog/model.mjs';

test('reference dog is a finite UV-mapped four-paw model with distinct editable coat regions',()=>{
  const model=buildDog({density:.04}),statistics=modelStatistics(model);
  assert.equal(MODEL_SPEC.referenceCount,8);
  assert.ok(statistics.bounds.size[0]>.19&&statistics.bounds.size[0]<.4);
  assert.ok(statistics.bounds.size[1]>.34&&statistics.bounds.size[1]<.5);
  assert.ok(statistics.bounds.size[2]>.5&&statistics.bounds.size[2]<.8);
  assert.ok(Math.abs(statistics.bounds.min[1])<.00001);
  assert.ok(model.getObjectByName('Dog_Continuous_QuadDerived_Skin'));
  assert.ok(model.getObjectByName('Groom_Curled_Brown_Root_White_Tail_Plume'));
  let furRegions=0;
  model.traverse(object=>{
    if(!object.isMesh)return;
    const geometry=object.geometry,position=geometry.getAttribute('position');
    assert.equal(geometry.getAttribute('uv').count,position.count,object.name+' lacks UVs');
    assert.equal(geometry.getAttribute('normal').count,position.count,object.name+' lacks normals');
    for(const key of ['position','normal','uv','color']){
      const values=geometry.getAttribute(key)?.array;
      if(values)for(const value of values)assert.ok(Number.isFinite(value),object.name+' has invalid '+key);
    }
    for(const index of geometry.index.array)assert.ok(index>=0&&index<position.count);
    if(object.userData.strands)furRegions++;
    geometry.dispose();
  });
  assert.equal(furRegions,7);
});

test('coat pattern combines brown saddle, white chest, forehead blaze, dark eye surrounds and ear tips',()=>{
  const lightness=tint=>tint.r+tint.g+tint.b;
  const chest=coatColor({x:0,y:-.13,z:.20}),saddle=coatColor({x:0,y:.10,z:.265});
  const blaze=coatColor({x:0,y:-.28,z:.34}),brow=coatColor({x:.052,y:-.28,z:.34});
  const eye=coatColor({x:.039,y:-.305,z:.309});
  assert.ok(lightness(chest)>lightness(saddle)*2);
  assert.ok(lightness(blaze)>lightness(brow)*2);
  assert.ok(lightness(eye)<lightness(brow));
  assert.ok(lightness(coatColor({x:0,y:0,z:.17},'ear'))<lightness(coatColor({x:0,y:0,z:.29},'ear')));
});
