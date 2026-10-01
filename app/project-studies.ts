import {projects,type Project} from './portfolio';
import {runSkillDataflow} from './realm-demos';

export const capitalProjects=['MultiAgentOPENAI','Multi-Agent Iterative AI System','Replico AI','NearNest','3DCodePad','Data Lineage Catalog'];
export const studyLayouts=[
 [[-1.5,0],[0,1.05],[1.5,0],[0,-.7]],
 [[-1.2,-.6],[-1.2,.8],[1.2,.8],[1.2,-.6]],
 [[-1.5,0],[0,.7],[0,-.7],[1.5,0]],
 [[0,0],[-1.45,.7],[1.45,.7],[1.45,-.7]],
 [[-1.35,-.65],[-1.35,.75],[1.35,.75],[1.35,-.65]],
 [[-1.5,.7],[-.45,0],[.55,.7],[1.5,0]],
] as const;
export function createProjectStudies():Project[]{
 const counts=runSkillDataflow(),candidates=[{name:'A',x:1,z:1},{name:'B',x:4,z:2},{name:'C',x:-3,z:2}],nearest=[...candidates].sort((first,second)=>Math.hypot(first.x,first.z)-Math.hypot(second.x,second.z))[0];
 const recipes=[
  {title:'Agent handoff',labels:['Brief','Plan','Review','Result'],values:['3 local tasks','3 assigned stages','3 checked outputs','3 / 3 complete'],options:['Brief','Outline'],color:'#477e97'},
  {title:'Refinement loop',labels:['Draft','Check','Revise','Accept'],values:['4 open checks','2 open checks','1 open check','0 open checks'],options:['Draft','Revision'],color:'#b68169'},
  {title:'Memory lookup',labels:['Query','Memory','Match','Recall'],values:['blue / blue / gold','2 unique entries','blue -> found','cached blue'],options:['blue','gold'],color:'#557f66'},
  {title:'Neighborhood search',labels:['Origin','Candidate A','Candidate B','Nearest'],values:['0, 0','distance '+Math.hypot(1,1).toFixed(2),'distance '+Math.hypot(4,2).toFixed(2),'Nearest '+nearest.name],options:['Nearby','Walking'],color:'#bf7f8e'},
  {title:'Component state',labels:['Action','State','Props','View'],values:['Action {input}','State {input}','Props {input}','View {input}'],options:projects[0].scenario.options,color:'#6688b8'},
  {title:'Data lineage',labels:['Source','Filter','Group','Result'],values:[JSON.stringify(counts.source),JSON.stringify(counts.filtered),counts.groups.map(group=>group.value+':'+group.count).join(' / '),counts.rendered.join(' / ')],options:['Sample','Replay'],color:'#6b8d88'},
 ];
 return recipes.map((recipe,index)=>{
  const nodes=recipe.labels.map((label,stage)=>({id:'stage-'+stage,label,explanation:recipe.values[stage],x:studyLayouts[index][stage][0],z:studyLayouts[index][stage][1]}));
  return {id:'garden-study-'+index,name:capitalProjects[index],kind:'LOCAL STUDY / NOT THE PROJECT RUNTIME',district:0,description:recipe.title,contribution:'Project facts remain in the supplied resume.',stack:'Local TypeScript study',decisions:[],links:[],flow:recipe.labels,building:{x:33+(index%3)*6,z:152+Math.floor(index/3)*4,color:recipe.color,style:'studio'},nodes,connections:nodes.slice(1).map((node,stage)=>({from:nodes[stage].id,to:node.id,kind:'call'})),scenario:{mode:index===4?'react':'backend',colors:index===4?projects[0].scenario.colors:undefined,inputLabel:'Local sample',options:recipe.options,initial:recipe.options[0],steps:nodes.map((node,stage)=>({node:node.id,text:recipe.title+': '+recipe.values[stage]+'. Local illustrative data.',result:recipe.values[stage]})),simplification:'A local illustrative study, not this project\'s implementation, an AI response, or a live service. Project information is in the supplied resume.'}};
 });
}
