const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createCivicKit}=require('../app/civic-kit.ts'),{disposeScene}=require('../app/scene-resources.ts');
test('civic lamp families use different silhouettes without adding real-time lights',()=>{
 const kit=createCivicKit(),root=new T.Group();for(const [index,style] of ['plaza','park','street'].entries())kit.lamp(root,index*7,0,style);
 assert.ok(root.getObjectByName('Civic_CurvedLampMast'));assert.ok(root.getObjectByName('Civic_ProcessorLampFin'));let lights=0;root.traverse(object=>{if(object.isLight)lights++});assert.equal(lights,0);kit.lighting(1,1);assert.ok(kit.materials.warm.emissiveIntensity>1);assert.ok(kit.materials.paving.roughness<.6);disposeScene(root);
});
test('trees, seating, and ordinary street utilities share geometry and keep bounded colliders',()=>{
 const kit=createCivicKit(),root=new T.Group();for(const [index,kind] of ['shade','blossom','column'].entries())kit.tree(root,index*8,0,kind,index);kit.bench(root,0,8);kit.utilities(root,8,8);kit.flowers(root,0,14,5,1.5);
 assert.equal(kit.solids.length,5);assert.ok(root.getObjectByName('Civic_BenchSlat'));assert.ok(root.getObjectByName('Civic_RecyclingBin'));assert.ok(root.getObjectByName('Civic_PlantedFlowers'));const crowns=[];root.traverse(object=>{if(object.name==='Civic_OrganicCrown')crowns.push(object.geometry)});assert.equal(new Set(crowns).size,1);assert.ok(crowns.every(geometry=>geometry.attributes.canopyWeight&&geometry.attributes.canopyPhase));assert.equal(root.getObjectByName('Civic_Tree_shade').userData.canopyStyle,'astra-layered-leaf');disposeScene(root);
});
test('night light pools clear the plaza paving and do not cast their own shadows',()=>{
 const kit=createCivicKit(),root=new T.Group();kit.lamp(root,0,0);const pool=root.getObjectByName('Civic_LightPool');
 assert.ok(pool.position.y>.075);assert.equal(pool.castShadow,false);assert.equal(pool.receiveShadow,false);assert.equal(pool.material.toneMapped,false);assert.equal(pool.material.map.magFilter,T.LinearFilter);
 kit.lighting(0,0);assert.equal(pool.material.opacity,0);kit.lighting(1,0);assert.equal(pool.material.opacity,1);
 assert.equal(kit.materials.stone.userData.surface,'ceramic');assert.equal(kit.materials.paving.userData.surface,'natural');disposeScene(root);
});
test('contact shading shares one tiny texture and adds no walking obstacles or dynamic lights',()=>{
 const kit=createCivicKit(),root=new T.Group(),first=kit.contact(root,0,0,4,2),second=kit.contact(root,7,0,4,2);
 assert.equal(first.geometry,second.geometry);assert.equal(first.material,second.material);assert.equal(first.material.map.image.width,32);assert.equal(first.material.map.magFilter,T.LinearFilter);assert.equal(first.material.depthWrite,false);assert.equal(first.castShadow,false);assert.equal(kit.solids.length,0);assert.ok(first.position.y>.075);disposeScene(root);
});
test('civic plaques retain both readable faces and use high-contrast title and secondary lettering',()=>{
 const draws=[],context=new Proxy({fillText(text){draws.push({text,color:this.fillStyle,font:this.font})}},{get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)});
 const previous=global.document;global.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
 const kit=createCivicKit(),root=new T.Group();
 try{kit.plaque(root,'SAHIL UPADHYAY','Senior Engineering Lead / Full-Stack & AI',0,4,0,16);const faces=[];root.traverse(object=>{if(object.userData.readableDisplay)faces.push(object)});assert.equal(faces.length,2);assert.equal(faces[0].material.toneMapped,false);assert.equal(draws[0].color,'#f3f4eb');assert.equal(draws[1].color,'#d0ddd9');assert.ok(parseFloat(draws[1].font.split(' ')[1])>=54)}finally{global.document=previous;disposeScene(root)}
});
