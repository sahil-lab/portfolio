import type {TransitStop} from './transit-config';

export type ArchitectureStyle='atelier'|'forge'|'conservatory'|'citadel'|'petal'|'solstice'|'cloud'|'research'|'workshop'|'guild';
type ArchitectureProfile={name:string;roof:string;window:'chamfer'|'arch'|'square';wall:string;stone:string;metal:string;wood:string;glass:string;leaf:string;planting:boolean};
export const architectureProfiles:Record<ArchitectureStyle,ArchitectureProfile>={
 atelier:{name:'Atelier Terrace',roof:'Inhabited roof terrace',window:'chamfer',wall:'#167e79',stone:'#e6ece8',metal:'#cfaa60',wood:'#967753',glass:'#195b70',leaf:'#458653',planting:true},
 forge:{name:'Basalt Foundry',roof:'Butterfly furnace roof',window:'arch',wall:'#242c30',stone:'#dde5e4',metal:'#98afb7',wood:'#405b53',glass:'#237789',leaf:'#46745b',planting:false},
 conservatory:{name:'Garden Conservatory',roof:'Glazed barrel vault',window:'arch',wall:'#4b9876',stone:'#e8ede3',metal:'#244c3c',wood:'#886344',glass:'#238d94',leaf:'#367943',planting:true},
 citadel:{name:'Citadel Deco',roof:'Stepped office crown',window:'square',wall:'#e4edf0',stone:'#f5f5ee',metal:'#809ca6',wood:'#185b73',glass:'#0b507c',leaf:'#47776a',planting:false},
 petal:{name:'Petal Garden House',roof:'Swept layered eaves',window:'chamfer',wall:'#cf728c',stone:'#ebe6df',metal:'#243c40',wood:'#603f48',glass:'#356d89',leaf:'#477a4b',planting:true},
 solstice:{name:'Sun Court',roof:'Pergola roof terrace',window:'arch',wall:'#e3b943',stone:'#eeede3',metal:'#1c5358',wood:'#a36e43',glass:'#168c9b',leaf:'#41794a',planting:true},
 cloud:{name:'Cloud Pavilion',roof:'Ribbed pearl dome',window:'chamfer',wall:'#7fb9c9',stone:'#edf1ed',metal:'#38788c',wood:'#b77d68',glass:'#226982',leaf:'#448d7d',planting:true},
 research:{name:'Folded Observatory',roof:'Asymmetric instrument folds',window:'chamfer',wall:'#5eaaa1',stone:'#e5ebe4',metal:'#294d48',wood:'#546d69',glass:'#1a6371',leaf:'#537d58',planting:false},
 workshop:{name:'Fired-Clay Workshop',roof:'Sawtooth and gantry',window:'square',wall:'#b76650',stone:'#d9ded4',metal:'#273d40',wood:'#67463c',glass:'#2d667c',leaf:'#577841',planting:false},
 guild:{name:'Timber Guild Hall',roof:'Shingled gable and dormer',window:'arch',wall:'#a8ba87',stone:'#d0dbbf',metal:'#2e4b3d',wood:'#604b37',glass:'#287577',leaf:'#3c7c45',planting:true},
};
const planetStyles:Record<string,ArchitectureStyle>={motherboard:'atelier',copper:'forge',garden:'conservatory',prism:'citadel',petal:'petal',solstice:'solstice',cloud:'cloud','ai-research':'research','project-foundry':'workshop','skills-technology':'guild'};
export function planetArchitectureFor(stop:Pick<TransitStop,'id'|'theme'|'worldKind'>):ArchitectureStyle{
 return planetStyles[stop.id]??(stop.worldKind==='research'?'research':stop.worldKind==='foundry'?'workshop':stop.worldKind==='skills'?'guild':stop.theme==='garden'?'conservatory':stop.theme==='prism'?'cloud':'forge');
}
export function architectureRecipe(style:ArchitectureStyle,address:string){
 let state=2166136261;
 for(const letter of style+'/'+address){state^=letter.charCodeAt(0);state=Math.imul(state,16777619)>>>0}
 const seed=state;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
 return {
  id:style+'/'+address,style,seed,
  width:.82+random()*.17,depth:.82+random()*.17,height:.88+random()*.23,
  massing:Math.floor(random()*5),roofPitch:.82+random()*.7,roofOffset:(random()-.5)*.22,
  bays:2+Math.floor(random()*2),entry:(random()-.5)*.35,stairSide:random()>.5?1:-1,
  balcony:Math.floor(random()*3),attachment:Math.floor(random()*4),rhythm:random(),
 };
}
export type ArchitectureRecipe=ReturnType<typeof architectureRecipe>;
