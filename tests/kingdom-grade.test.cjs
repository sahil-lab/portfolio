const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{kingdomGrade,kingdomToneMappingGlsl,installKingdomToneMapping,gradeDisplayColor}=require('../app/kingdom-grade.ts');

test('the finishing grade replaces the shared custom tone mapping hook exactly once',()=>{
  const before=T.ShaderChunk.tonemapping_pars_fragment;
  assert.equal(installKingdomToneMapping(),T.CustomToneMapping);
  const patched=T.ShaderChunk.tonemapping_pars_fragment;
  assert.notEqual(patched,before);assert.equal(patched.match(/vec3 CustomToneMapping\(/g).length,1);assert.equal(patched.match(/vec3 NeutralToneMapping\(/g).length,1);
  assert.ok(patched.includes('color = NeutralToneMapping( color );'));assert.ok(patched.indexOf('vec3 NeutralToneMapping(')<patched.indexOf('vec3 CustomToneMapping('));
  assert.equal(installKingdomToneMapping(),T.CustomToneMapping);assert.equal(T.ShaderChunk.tonemapping_pars_fragment,patched);
  const stronger=installKingdomToneMapping({...kingdomGrade,midtone:1.3});assert.equal(stronger,T.CustomToneMapping);assert.notEqual(T.ShaderChunk.tonemapping_pars_fragment,patched);assert.equal(T.ShaderChunk.tonemapping_pars_fragment.match(/vec3 CustomToneMapping\(/g).length,1);
  installKingdomToneMapping();assert.equal(T.ShaderChunk.tonemapping_pars_fragment,patched);
});

test('generated GLSL uses float literals only and omits the midtone power when neutral',()=>{
  const source=kingdomToneMappingGlsl();
  for(const literal of source.match(/\b\d+(\.\d+)?\b/g))assert.match(literal,/\./,`integer literal ${literal} in GLSL grade`);
  assert.ok(source.includes(kingdomGrade.vibrance.toFixed(5)));assert.equal(source.includes('pow('),false);
  assert.ok(kingdomToneMappingGlsl({...kingdomGrade,midtone:1.2}).includes(`pow( color, vec3( ${(1/1.2).toFixed(5)} ) )`));
});

test('the grade keeps a faint warm black floor, revives muted colours and preserves saturated paint and highlights',()=>{
  const neutralGrade={lift:[0,0,0],saturation:1,vibrance:0,warmth:0,midtone:1},black=gradeDisplayColor([0,0,0]);
  for(const [index,channel] of black.entries())assert.ok(Math.abs(channel-kingdomGrade.lift[index])<1e-9);
  assert.ok(black[0]>black[1]&&black[1]>black[2],'shadow floor is slightly warm');assert.ok(black[0]<.005,'the floor stays faint');
  const grey=gradeDisplayColor([.18,.18,.18]),plainGrey=gradeDisplayColor([.18,.18,.18],1,neutralGrade);
  assert.ok(Math.abs(grey[1]-plainGrey[1])<.004,'neutral greys keep their Neutral-curve midtone');
  const white=gradeDisplayColor([4,4,4]);for(const channel of white)assert.ok(channel>.95&&channel<=1);
  const bright=gradeDisplayColor([.6,.6,.6]),brightPlain=gradeDisplayColor([.6,.6,.6],1,neutralGrade),dim=gradeDisplayColor([.04,.04,.04]),dimPlain=gradeDisplayColor([.04,.04,.04],1,neutralGrade);
  assert.ok(bright[0]>bright[2]&&bright[0]-brightPlain[0]>.005&&bright[0]-brightPlain[0]<.02,'highlights lean slightly warm');assert.ok(Math.abs(dim[0]-dim[2]-(dimPlain[0]-dimPlain[2]))<.0015,'shadows stay neutral apart from the floor');
  let previous=-1;for(let step=0;step<=40;step++){const value=gradeDisplayColor([step/20,step/20,step/20])[1];assert.ok(value>previous);previous=value}
  const chroma=([r,g,b])=>(Math.max(r,g,b)-Math.min(r,g,b))/Math.max(r,g,b);
  const muted=[.3,.33,.36],mutedGraded=gradeDisplayColor(muted),mutedPlain=gradeDisplayColor(muted,1,neutralGrade);
  assert.ok(chroma(mutedGraded)>chroma(mutedPlain)*1.08,'muted surfaces gain colour');
  const vivid=[.5,.05,.04],vividGraded=gradeDisplayColor(vivid),vividPlain=gradeDisplayColor(vivid,1,neutralGrade);
  assert.ok(vividGraded[0]>vividGraded[1]&&vividGraded[1]>vividGraded[2]);assert.ok(chroma(vividGraded)<chroma(vividPlain)*1.1,'saturated paint is left mostly alone');
  assert.ok(chroma(mutedGraded)/chroma(mutedPlain)>chroma(vividGraded)/chroma(vividPlain),'vibrance favours muted surfaces over saturated ones');
  for(const channel of vividGraded)assert.ok(channel>=0&&channel<=1);
  const opened=gradeDisplayColor([.05,.05,.05],1,{...kingdomGrade,midtone:1.2});assert.ok(opened[1]>gradeDisplayColor([.05,.05,.05])[1]);
});

test('the world renderer adopts the shared grade through the custom tone mapping hook',()=>{
  const source=fs.readFileSync('app/world.ts','utf8');
  assert.match(source,/import \{installKingdomToneMapping\} from '\.\/kingdom-grade'/);
  assert.match(source,/renderer\.toneMapping=installKingdomToneMapping\(\)/);
  assert.doesNotMatch(source,/renderer\.toneMapping=T\.NeutralToneMapping/);
});

test('authored vertex shading retains distinct paint, trim and metal responses instead of becoming foliage',()=>{
 const {finishKingdomMaterials}=require('../app/kingdom-art.ts'),{disposeScene}=require('../app/scene-resources.ts'),scene=new T.Scene(),geometry=new T.BoxGeometry();geometry.setAttribute('color',new T.BufferAttribute(new Float32Array(geometry.attributes.position.count*3).fill(.85),3));
 const paint=new T.MeshPhysicalMaterial({color:'#d4a329',vertexColors:true,roughness:.8,metalness:.02,clearcoat:.05,envMapIntensity:.55}),trim=new T.MeshPhysicalMaterial({color:'#edf1ee',vertexColors:true,roughness:.48,metalness:.06,clearcoat:.22,envMapIntensity:.85}),metal=new T.MeshPhysicalMaterial({color:'#287e7e',vertexColors:true,roughness:.34,metalness:.7,envMapIntensity:.88}),leaf=new T.MeshStandardMaterial({vertexColors:true,roughness:.95,envMapIntensity:1});
 for(const material of [paint,trim,metal])material.userData.authoredArchitecture=true;leaf.userData.surface='natural';for(const material of [paint,trim,metal,leaf])scene.add(new T.Mesh(geometry,material));
 finishKingdomMaterials(scene);assert.equal(metal.envMapIntensity,.88);assert.equal(trim.envMapIntensity,.85);assert.equal(paint.envMapIntensity,.55);assert.equal(leaf.envMapIntensity,.5);assert.ok(paint.roughness>trim.roughness&&trim.roughness>metal.roughness);assert.equal(trim.clearcoat,.22);assert.equal(paint.color.getHexString(),'d4a329');disposeScene(scene);
});
