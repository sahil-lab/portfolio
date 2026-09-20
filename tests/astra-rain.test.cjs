const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createAstraRain}=require('../app/astra-rain.ts'),{defaultWeather}=require('../app/weather-state.ts'),{disposeScene}=require('../app/scene-resources.ts');

test('rain mirrors appear only in wet motherboard weather and ripples freeze with reduced motion',()=>{
  const scene=new T.Scene(),rain=createAstraRain(scene),wet={...defaultWeather,kind:'rain'};
  rain.update(2,false,defaultWeather,true);assert.equal(rain.root.visible,false);
  rain.update(2,true,wet,true);assert.equal(rain.root.visible,true);const matrices=Array.from(rain.rings.instanceMatrix.array);
  rain.update(30,true,wet,true);assert.deepEqual(Array.from(rain.rings.instanceMatrix.array),matrices);
  rain.update(30,false,wet,true);assert.notDeepEqual(Array.from(rain.rings.instanceMatrix.array),matrices);
  rain.update(1,false,wet,false);assert.equal(rain.root.visible,false);assert.equal(rain.puddles.count,5);disposeScene(scene);
});
