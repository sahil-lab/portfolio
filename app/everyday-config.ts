export const everydayKinds=['park','playground','mall','market','cinema','clinic','school','library','sports'] as const;
export type EverydayKind=typeof everydayKinds[number];
export const everydayPlaceNames:Record<EverydayKind,string>={park:'Public Park',playground:'Playground',mall:'Shopping Arcade',market:'Town Market',cinema:'Cinema',clinic:'Community Clinic',school:'Neighborhood School',library:'Public Library',sports:'Sports Court'};
export const cityEverydaySites=[
 {id:'willow-park',kind:'park',name:'Willow Park',x:-50,z:279},
 {id:'play-garden',kind:'playground',name:'Play Garden',x:50,z:279},
 {id:'lantern-mall',kind:'mall',name:'Lantern Shopping Arcade',x:150,z:279},
 {id:'weekend-market',kind:'market',name:'Weekend Market',x:-150,z:179},
 {id:'picture-house',kind:'cinema',name:'The Picture House',x:250,z:279},
 {id:'community-clinic',kind:'clinic',name:'Community Clinic',x:250,z:179},
 {id:'neighborhood-school',kind:'school',name:'Neighborhood School',x:-150,z:79},
 {id:'public-library',kind:'library',name:'Open Shelf Library',x:-150,z:-21},
 {id:'sports-court',kind:'sports',name:'Community Sports Court',x:50,z:379},
] as const satisfies readonly {id:string;kind:EverydayKind;name:string;x:number;z:number}[];
export type CityEverydayId=typeof cityEverydaySites[number]['id'];
const footprints:Record<EverydayKind,[number,number]>={park:[24,20],playground:[20,18],mall:[28,22],market:[24,20],cinema:[22,20],clinic:[20,18],school:[24,20],library:[22,20],sports:[20,24]};
export function everydayFootprint(kind:EverydayKind){const [width,depth]=footprints[kind];return {width,depth}}
