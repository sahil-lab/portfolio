import * as T from 'three';
import {planetArchitectureFor,type ArchitectureStyle} from './architecture-profiles';
import type {TransitStop} from './transit-config';

type Biome={name:string;land:string;grove:string;rock:string;crest:string;bank:string;water:string;road:string;line:string;leaf:string;tip:string;sky:string;ground:string;sun:string;fill:number;environment:number;marking:'dashes'|'stitches'|'paired';snow:boolean};
const profiles:Record<ArchitectureStyle,Biome>={
 atelier:{name:'Ceramic commons',land:'#75897c',grove:'#486954',rock:'#788382',crest:'#d7ded7',bank:'#b7c4ba',water:'#54919b',road:'#526563',line:'#d7dbce',leaf:'#285e46',tip:'#6e985f',sky:'#c7dae1',ground:'#506557',sun:'#ffe7c5',fill:.54,environment:.3,marking:'dashes',snow:false},
 forge:{name:'Basalt terraces',land:'#637273',grove:'#334747',rock:'#4d555d',crest:'#abb9bd',bank:'#a1b4b3',water:'#427e87',road:'#303a3f',line:'#d5e1df',leaf:'#315648',tip:'#728f70',sky:'#bacfdb',ground:'#394b48',sun:'#f5e7d6',fill:.48,environment:.26,marking:'paired',snow:false},
 conservatory:{name:'River forest',land:'#608451',grove:'#214d3a',rock:'#677b70',crest:'#c6d3c2',bank:'#96af80',water:'#3c8d89',road:'#a7b8a2',line:'#edf0cf',leaf:'#245b3f',tip:'#86a862',sky:'#c4ddd8',ground:'#3c5f47',sun:'#ffe9be',fill:.53,environment:.28,marking:'stitches',snow:false},
 citadel:{name:'Limestone coast',land:'#c0ced0',grove:'#749ea3',rock:'#667d91',crest:'#ecf1ef',bank:'#d9e2d8',water:'#277fa6',road:'#627f96',line:'#e5edf1',leaf:'#3d6960',tip:'#8fb59d',sky:'#c7e0f1',ground:'#5c727c',sun:'#f0f1e0',fill:.54,environment:.31,marking:'paired',snow:true},
 petal:{name:'Blossom terraces',land:'#94ad83',grove:'#50765a',rock:'#85817b',crest:'#e0d8d0',bank:'#c0c6a0',water:'#6aa7a3',road:'#9b8c91',line:'#f2ddd8',leaf:'#66825b',tip:'#e4b1ba',sky:'#e0dce2',ground:'#657258',sun:'#ffe3cc',fill:.55,environment:.3,marking:'stitches',snow:false},
 solstice:{name:'Spring meadows',land:'#b4b978',grove:'#71865c',rock:'#ab8b69',crest:'#e5d4a2',bank:'#d2d0a0',water:'#399f9f',road:'#8f9e98',line:'#f1dfa9',leaf:'#688150',tip:'#b8b868',sky:'#c7dee0',ground:'#7c805b',sun:'#ffe0a6',fill:.49,environment:.28,marking:'dashes',snow:false},
 cloud:{name:'Alpine lagoons',land:'#a6c6c5',grove:'#698d8e',rock:'#899da7',crest:'#edf4f2',bank:'#d5e2df',water:'#639ec1',road:'#8ea8b3',line:'#e9f1f0',leaf:'#557d75',tip:'#bdcfc1',sky:'#c4dfec',ground:'#63767b',sun:'#edf3f4',fill:.57,environment:.32,marking:'stitches',snow:true},
 research:{name:'Chalk escarpments',land:'#9aada3',grove:'#547b75',rock:'#aeb8ad',crest:'#e5e5d5',bank:'#bacaba',water:'#398d96',road:'#496c73',line:'#c4e4db',leaf:'#3c7469',tip:'#9abd9f',sky:'#bcd6dc',ground:'#49675e',sun:'#fff0da',fill:.48,environment:.27,marking:'paired',snow:false},
 workshop:{name:'Volcanic foothills',land:'#8f8170',grove:'#566b58',rock:'#485358',crest:'#b5aaa0',bank:'#b3b394',water:'#438f94',road:'#414d52',line:'#dcaf84',leaf:'#416353',tip:'#9b9d69',sky:'#c6d4d6',ground:'#5b6253',sun:'#ffddae',fill:.46,environment:.25,marking:'dashes',snow:false},
 guild:{name:'Aqueduct woodlands',land:'#779357',grove:'#385940',rock:'#747e66',crest:'#c9c8a8',bank:'#adb883',water:'#4a9290',road:'#718574',line:'#e1d6ad',leaf:'#345e39',tip:'#99b36b',sky:'#d3dfd5',ground:'#485d3e',sun:'#ffedc0',fill:.51,environment:.28,marking:'stitches',snow:false},
};
export const planetBiome=(stop:TransitStop)=>profiles[planetArchitectureFor(stop)];
export function createPlanetColorizer(stop:TransitStop){
 const biome=planetBiome(stop),land=new T.Color(biome.land),grove=new T.Color(biome.grove),rock=new T.Color(biome.rock),crest=new T.Color(biome.crest),bank=new T.Color(biome.bank);
 return (direction:T.Vector3,geography:{height:number;road:number;river:number},target=new T.Color())=>{
  const patch=.5+(Math.sin(direction.x*4+direction.z*3)+Math.cos(direction.y*5-direction.x*2))*.25;
  target.copy(land).lerp(grove,T.MathUtils.smoothstep(patch,.22,.8)*.78);
  target.lerp(bank,(1-T.MathUtils.smoothstep(geography.river,3,10))*.5);
  target.lerp(rock,T.MathUtils.smoothstep(geography.height,2.5,stop.worldKind?19:9));
  target.lerp(crest,T.MathUtils.smoothstep(geography.height,biome.snow?10:17,biome.snow?18:34)*(biome.snow?.88:.65));return target;
 };
}
export function createRoadMarking(stop:TransitStop){
 const biome=planetBiome(stop),data=new Uint8Array(64*4*4);
 for(let row=0;row<4;row++)for(let column=0;column<64;column++){
  const lit=biome.marking==='paired'?column<18||column>=26&&column<44:biome.marking==='stitches'?column<10:column<36;
  data.set([255,255,255,lit?220:0],(row*64+column)*4);
 }
 const texture=new T.DataTexture(data,64,4,T.RGBAFormat);texture.name='RoadMarking_'+biome.marking;texture.wrapS=T.RepeatWrapping;texture.repeat.x=(stop.radius??82)*Math.PI*2/6;texture.magFilter=texture.minFilter=T.LinearFilter;texture.needsUpdate=true;return texture;
}
