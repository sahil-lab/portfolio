import type {TransitStop} from './transit-config';

export type ArchitectureStyle='atelier'|'forge'|'conservatory'|'citadel'|'petal'|'solstice'|'cloud'|'research'|'workshop'|'guild';
type ArchitectureProfile={name:string;roof:string;window:'chamfer'|'arch'|'square';wall:string;stone:string;metal:string;wood:string;glass:string;leaf:string;planting:boolean};
export const architectureProfiles:Record<ArchitectureStyle,ArchitectureProfile>={
 atelier:{name:'Atelier Terrace',roof:'Inhabited roof terrace',window:'chamfer',wall:'#218d8b',stone:'#e8eff0',metal:'#cba660',wood:'#b59a78',glass:'#367b91',leaf:'#73a76b',planting:true},
 forge:{name:'Basalt Foundry',roof:'Butterfly furnace roof',window:'arch',wall:'#39464b',stone:'#d9e0df',metal:'#9aaeb4',wood:'#667b75',glass:'#598a9a',leaf:'#83a291',planting:false},
 conservatory:{name:'Garden Conservatory',roof:'Glazed barrel vault',window:'arch',wall:'#87b5a1',stone:'#e5e8d5',metal:'#658b73',wood:'#987558',glass:'#60aeb0',leaf:'#629c59',planting:true},
 citadel:{name:'Citadel Deco',roof:'Stepped office crown',window:'square',wall:'#e7eff3',stone:'#fcf9ec',metal:'#9fbec6',wood:'#397f93',glass:'#176c9f',leaf:'#81a3a1',planting:false},
 petal:{name:'Petal Garden House',roof:'Swept layered eaves',window:'chamfer',wall:'#e4b5c3',stone:'#e6e4dc',metal:'#536e6e',wood:'#795c64',glass:'#648aa1',leaf:'#7d9c72',planting:true},
 solstice:{name:'Sun Court',roof:'Pergola roof terrace',window:'arch',wall:'#eed071',stone:'#f3eee0',metal:'#467e83',wood:'#bb8560',glass:'#32a4b0',leaf:'#78a26c',planting:true},
 cloud:{name:'Cloud Pavilion',roof:'Ribbed pearl dome',window:'chamfer',wall:'#b8dce4',stone:'#edf1ed',metal:'#6ea6b4',wood:'#dcac97',glass:'#488fae',leaf:'#84afb0',planting:true},
 research:{name:'Folded Observatory',roof:'Asymmetric instrument folds',window:'chamfer',wall:'#a9c8c2',stone:'#e3e7de',metal:'#66847d',wood:'#788c8d',glass:'#387f8d',leaf:'#8ba78f',planting:false},
 workshop:{name:'Fired-Clay Workshop',roof:'Sawtooth and gantry',window:'square',wall:'#c68c78',stone:'#d9d4bf',metal:'#5d7678',wood:'#795951',glass:'#557e8e',leaf:'#93a480',planting:false},
 guild:{name:'Timber Guild Hall',roof:'Shingled gable and dormer',window:'arch',wall:'#d8dec5',stone:'#b2c4a0',metal:'#687e73',wood:'#765f4d',glass:'#699696',leaf:'#7ba56c',planting:true},
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
