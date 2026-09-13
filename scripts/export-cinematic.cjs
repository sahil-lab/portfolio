/* Export actual runtime meshes and sampled simulation to an editable Blender scene. */
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const T=require('three');
// Labels become Blender typography; texture downloads are replaced with local asset imports.
global.document={createElement:()=>({width:0,height:0,getContext:()=>({font:'',fillStyle:'',textAlign:'',fillRect(){},fillText(){},measureText:s=>({width:s.length*17})})})};
const pressPath=require.resolve('../app/packet-press-asset.ts');require.cache[pressPath]={id:pressPath,filename:pressPath,loaded:true,exports:{addWorkshopMural:()=>()=>false,createPacketPress:()=>({blocked:()=>false,dispose(){},update(){}})}};
const {buildWorldScenery}=require('../app/world-scenery.ts'),{createCourier}=require('../app/courier.ts'),{createLivingWorld}=require('../app/living-world.ts'),{addProjectBuildings}=require('../app/project-world.ts'),{exhibits}=require('../app/exhibit-state.ts'),{scoreBeat,cueNotes}=require('../app/audio-score.ts');
const scene=new T.Scene(),scenery=buildWorldScenery(scene),courier=createCourier();scene.add(courier.root);require('../app/traversal.ts').createTraversal(scene,courier.root);courier.root.position.set(13,.8,41.6);
createLivingWorld(scene,courier.root,courier,{});const projects=addProjectBuildings(scene,courier.root,{});projects.interact();projects.update(0);
const geometries={},objects=[],ids=new Map();let n=0;
scene.updateMatrixWorld(true);
scene.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;const id='Asset_'+n++;ids.set(o,id);let g=o.geometry;if(!geometries[g.uuid]){const ix=g.index?.array??Array.from({length:g.attributes.position.count},(_,i)=>i);geometries[g.uuid]={v:Array.from(g.attributes.position.array),i:Array.from(ix)}}objects.push({id,name:o.name||id,geo:g.uuid,matrix:o.matrixWorld.toArray(),color:o.material.color?.toArray()??[.5,.5,.5],emission:o.material.emissiveIntensity||0,visible:o.visible});});
const frames=[],projectTrace=[],previous=new Map();const fps=24;function visible(o){for(let p=o;p;p=p.parent)if(!p.visible)return false;return true}const round=new (require('../app/delivery-state.ts').DeliveryRound)();round.prepare();
function position(t){if(t<5)return [0,.8,23];if(t<8.5)return [-23+(t-5)*1.6,.8,-3];if(t<12)return [18+(t-8.5)*1,.8,-4];if(t<14)return [13,.8,42-(t-12)*3];if(t<20)return [13,.8,36];return [0,.8,23]}
for(let f=0;f<720;f++){const t=f/fps,p=position(t);courier.root.position.fromArray(p);courier.root.rotation.y=t<5?0:t<8.5?Math.PI/2:t<12?Math.PI/2:Math.PI;
 round.tick(1/fps);if([78,86,94,102].includes(f)){round.collect();courier.gesture('pickup')}if(f===0)courier.gesture('curiosity');if(f===110)courier.gesture('greeting');courier.update(1/fps,round.snapshot.inventory);if(t<1)courier.parts.leftEye.scale.y=courier.parts.rightEye.scale.y=.015+.13*t;
 if(f===336){exhibits[0].choose('Amber');exhibits[0].trigger()};projects.update(1/fps);
 scenery.animated.fans.forEach(o=>o.rotation.y=t*.5);scenery.animated.gpu.rotation.y=t*.35;
 scenery.animated.packet.position.x=-33+(t*2%16);scenery.animated.packet.position.z=17+(scenery.animated.packet.position.x+33)*.13;
 scene.updateMatrixWorld(true);const changes=[];ids.forEach((id,o)=>{const data={id,m:o.matrixWorld.toArray(),v:visible(o),c:o.material.color?.toArray()};const key=JSON.stringify(data);if(previous.get(id)!==key){changes.push(data);previous.set(id,key)}});frames.push(changes);projectTrace.push(exhibits[0].snapshot);
}
const shots=[
 {start:0,end:5,from:[-7,5,32],to:[-4,3.8,29],look:[0,1.8,21],label:'A small awakening'},
 {start:5,end:8.5,from:[-31,9,5],to:[-26,6,1],look:[-21,2,-7],label:'Warm pulses · CPU City'},
 {start:8.5,end:12,from:[12,10,3],to:[17,8,0],look:[22,3,-9],label:'Room for a fleeting thought · RAM'},
 {start:12,end:14,from:[16,6,48],to:[15,5,42],look:[13,2,35],label:'Enter an idea'},
 {start:14,end:20,from:[13,13,41],to:[16,12,38],look:[13,1,34],lens:28,label:'React: action → state → props → render'},
 {start:20,end:22,from:[-37,7,26],to:[-30,5,25],look:[-27,1,18],label:'Every packet has somewhere to be'},
 {start:22,end:24,from:[-9,9,48],to:[-6,7,46],look:[0,1,39],label:'The vault keeps its records'},
 {start:24,end:26,from:[-13,16,-17],to:[-8,14,-19],look:[0,9,-29],label:'Little homes above the board'},
 {start:26,end:30,from:[-44,65,74],to:[-52,79,88],look:[0,2,0],label:'THE LIVING COMPUTER KINGDOM'},
];
const audio=[];for(let beat=0;beat<40;beat++){const t=beat*.75,d=t<5?0:t<8.5?1:t<12?2:t<20?3:t<22?4:t<24?5:t<26?6:0;for(const note of scoreBeat(d,beat))audio.push({t,...note})}
for(const [t,cue] of [[.1,'machine'],[3.25,'pickup'],[3.5833,'pickup'],[3.9167,'pickup'],[4.25,'pickup'],[14,'demo'],[15.4,'demo'],[16.8,'demo'],[18.2,'delivery'],[20,'creature'],[26,'delivery']])cueNotes[cue].forEach((note,i)=>audio.push({t:t+i*.09,...note}));
fs.mkdirSync('assets/cinematic',{recursive:true});fs.writeFileSync('assets/cinematic/scene.json',JSON.stringify({fps,frames,objects,geometries,shots,audio,projectTrace,projectColors:exhibits[0].project.scenario.colors}));console.log(`${objects.length} actual game meshes, ${Object.keys(geometries).length} geometries, ${frames.length} simulation frames`);
