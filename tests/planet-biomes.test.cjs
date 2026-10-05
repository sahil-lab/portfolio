const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{planetBiome,createPlanetColorizer,createRoadMarking}=require('../app/planet-biomes.ts'),{transitStops}=require('../app/transit-config.ts'),{createPlanetLighting}=require('../app/planet-lighting.ts');
test('each planet has a distinct coherent biome with deterministic finite terrain colors and bounded road textures',()=>{
 const names=new Set(),palettes=new Set();for(const stop of transitStops.slice(1)){
  const biome=planetBiome(stop),colorize=createPlanetColorizer(stop),direction=new T.Vector3(.6,.2,.7).normalize(),sample={height:0,road:8,river:20},color=colorize(direction,sample);names.add(biome.name);palettes.add([biome.land,biome.grove,biome.rock,biome.water,biome.leaf].join('/'));
  assert.deepEqual(color.toArray(),colorize(direction,sample).toArray());for(const height of [-2,0,9,18,35])for(const river of [0,3,8,20])assert.ok(colorize(direction,{...sample,height,river}).toArray().every(value=>Number.isFinite(value)&&value>=0&&value<=1));
  const texture=createRoadMarking(stop);assert.equal(texture.image.data.length,1024);assert.ok(texture.image.data.some((value,index)=>index%4===3&&value===0));assert.ok(texture.image.data.some((value,index)=>index%4===3&&value>0));assert.ok(texture.repeat.x>50&&texture.repeat.x<200);texture.dispose();
 }assert.equal(names.size,9);assert.equal(palettes.size,9);
});
test('authored planetary daylight preserves local gravity and does not allocate additional lights',()=>{
 const scene=new T.Scene(),sun=new T.DirectionalLight(),fill=new T.HemisphereLight(),player=new T.Group();scene.add(sun,fill);const lighting=createPlanetLighting(scene,sun);player.up.set(0,-1,0);player.userData.surfaceFrame=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),player.up);
 for(const stop of transitStops.slice(1)){lighting.apply(player,stop);const biome=planetBiome(stop);assert.equal(fill.intensity,biome.fill);assert.equal(scene.environmentIntensity,biome.environment);assert.ok(sun.position.dot(player.up)>50);assert.ok(sun.intensity/fill.intensity>3.5);assert.equal(scene.children.filter(object=>object.isLight).length,2);assert.equal(sun.color.getHexString(),new T.Color(biome.sun).getHexString())}
});
