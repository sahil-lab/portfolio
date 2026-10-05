export const everydayKinds=['park','playground','mall','market','cinema','clinic','school','library','sports','shop'] as const;
export type EverydayKind=typeof everydayKinds[number];
export const everydayPlaceNames:Record<EverydayKind,string>={park:'Public Park',playground:'Playground',mall:'Shopping Arcade',market:'Town Market',cinema:'Cinema',clinic:'Community Clinic',school:'Neighborhood School',library:'Public Library',sports:'Sports Court',shop:'Loop & Glaze'};
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
 {id:'loop-glaze',kind:'shop',name:'Loop & Glaze Donut Shop',x:250,z:379},
] as const satisfies readonly {id:string;kind:EverydayKind;name:string;x:number;z:number}[];
export type CityEverydayId=typeof cityEverydaySites[number]['id'];
export const signatureShopScale=3;
export function signatureShopCameraView(planet:string,aspect:number){
 const home=planet==='motherboard',foundry=planet==='project-foundry';
 return {yaw:foundry||planet==='skills-technology'?-.5:-.08,pitch:foundry?.7:.28,zoom:signatureShopScale*Math.max(home?56:foundry?50:36,Math.min(home?110:foundry?110:86,(home?42:foundry?33:28)/aspect)),focusHeight:signatureShopScale*(home?12.5:6.5)};
}
const footprints:Record<EverydayKind,[number,number]>={park:[24,20],playground:[20,18],mall:[28,22],market:[24,20],cinema:[22,20],clinic:[20,18],school:[24,20],library:[22,20],sports:[20,24],shop:[20,18]};
export function everydayFootprint(kind:EverydayKind){const [width,depth]=footprints[kind],scale=kind==='shop'?signatureShopScale:1;return {width:width*scale,depth:depth*scale}}

export const signatureShops=[
	{planet:'motherboard',theme:'donut',name:'Loop & Glaze',paint:'#cd738e',accent:'#ed91b0',width:1,height:1},
	{planet:'copper',theme:'pretzel',name:'Copper Crumb',paint:'#bd7258',accent:'#dfb16f',width:1.06,height:.9},
	{planet:'garden',theme:'gelato',name:'Scoop Cache',paint:'#74baa9',accent:'#efb2bd',width:.94,height:.92},
	{planet:'prism',theme:'tea',name:'Paper & Steam',paint:'#739fac',accent:'#dbbc72',width:.92,height:1.16},
	{planet:'petal',theme:'tart',name:'Petal Pantry',paint:'#cf869b',accent:'#e7b96c',width:1.04,height:.9},
	{planet:'solstice',theme:'coffee',name:'Sunrise Roastery',paint:'#d5ae6a',accent:'#7cb7b6',width:1.02,height:1.08},
	{planet:'cloud',theme:'cotton',name:'Nimbus Sugar Works',paint:'#8ebbc8',accent:'#ddb4ce',width:.95,height:1.1},
	{planet:'ai-research',theme:'prism',name:'Prism Optics',paint:'#639b9c',accent:'#b7dbe3',width:.92,height:1.22},
	{planet:'project-foundry',theme:'glider',name:'Fold & Fly',paint:'#c48067',accent:'#e0c488',width:1.1,height:.88},
	{planet:'skills-technology',theme:'kite',name:'Ribbon & Reel',paint:'#8cab70',accent:'#dc9277',width:.94,height:1.13},
] as const;
export type ShopTheme=typeof signatureShops[number]['theme'];
