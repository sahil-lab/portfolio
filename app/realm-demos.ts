import {projects,resume} from './portfolio';
import type {PlanetWorldKind} from './transit-config';

export const researchSkills=resume.skills.find(skill=>skill.category==='AI/ML')!.items.split(',').map(skill=>skill.trim());
export const tileClassifierWeights={hidden:[[2,-1],[-1,2],[1,1]],bias:[-.15,-.15,-.9],output:[[1,0,.25],[0,1,.25]]} as const;
export function classifyTile(width:number,height:number){
  if([width,height].some(value=>!Number.isFinite(value)||value<0||value>1))throw new RangeError('Tile dimensions must be finite values from zero to one.');
  const input=[width,height],hidden=tileClassifierWeights.hidden.map((weights,index)=>Math.max(0,weights[0]*width+weights[1]*height+tileClassifierWeights.bias[index]));
  const logits=tileClassifierWeights.output.map(weights=>weights.reduce<number>((total,weight,index)=>total+weight*hidden[index],0));
  const maximum=Math.max(...logits),scores=logits.map(value=>Math.exp(value-maximum)),total=scores.reduce((sum,value)=>sum+value,0),probabilities=scores.map(value=>value/total);
  return {input,hidden,probabilities,label:width===height?'square':probabilities[0]>probabilities[1]?'wide':'tall'};
}
export const dataflowInput=[5,2,8,5] as const;
export function runSkillDataflow(input:readonly number[]=dataflowInput){
  const filtered=input.filter(value=>value>=5),counts=new Map<number,number>();
  for(const value of filtered)counts.set(value,(counts.get(value)??0)+1);
  const groups=[...counts].sort(([left],[right])=>left-right).map(([value,count])=>({value,count}));
  return {source:[...input],filtered,groups,rendered:groups.map(group=>`${group.value}: ${group.count}`)};
}
export type RealmDemoSnapshot={kind:PlanetWorldKind;index:number;title:string;source:string;notice:string;values:number[];labels:string[]};
const samples=[[.9,.2],[.2,.9],[.65,.45],[.45,.7],[.6,.6]] as const;
export const foundryProjects=resume.projects.slice(0,3);
function researchSnapshot(index:number):RealmDemoSnapshot{
  const [width,height]=samples[index],result=classifyTile(width,height);
  return {kind:'research',index,title:'Neural Tile Atelier',source:'Authored fixed-weight example, not a trained model or a claimed research project. Resume AI/ML: '+researchSkills.join(', '),
    notice:`Fixed-weight teaching model: width ${width}, height ${height} -> ReLU [${result.hidden.map(value=>value.toFixed(2)).join(', ')}] -> ${result.label}. Wide / tall scores: ${result.probabilities.map(value=>Math.round(value*100)+'%').join(' / ')}. Hand-set weights; not trained.`,
    values:[...result.input,...result.hidden,...result.probabilities],labels:['width','height','hidden 1','hidden 2','hidden 3','wide','tall']};
}
function foundrySnapshot(index:number):RealmDemoSnapshot{
  const project=foundryProjects[index];let output:string,values:number[],labels:string[];
  if(index===0){
    const rows=[{region:'A',count:7},{region:'B',count:5},{region:'A',count:3}],groups=new Map<string,number>();
    for(const row of rows)groups.set(row.region,(groups.get(row.region)??0)+row.count);
    values=[...groups.values()];labels=[...groups.keys()];output=`Synthetic grouping sample: ${[...groups].map(([region,count])=>region+'='+count).join(', ')}. Not health data.`;
  }else if(index===1){
    const catalog=projects.find(exhibit=>exhibit.id==='request-hall')!,key=catalog.scenario.options[1],record=catalog.scenario.records![key];
    values=[1,1,1,1];labels=[...catalog.flow];output=`${catalog.name} teaching exhibit: GET /catalog/${key} -> 200, ${record}. In-memory records, not the project's service.`;
  }else{
    const before=[40,12],amount=7,after=[before[0]-amount,before[1]+amount];
    values=after;labels=['account A','account B'];output=`Local ledger example: [${before.join(', ')}] - transfer ${amount} -> [${after.join(', ')}]; total ${after.reduce((sum,value)=>sum+value,0)} preserved. No wallet or chain call.`;
  }
  return {kind:'foundry',index,title:project.name,source:project.highlights[0],notice:`${project.name} / Resume: ${project.highlights[0]} Local teaching model: ${output}`,values,labels};
}
function skillsSnapshot(index:number):RealmDemoSnapshot{
  const flow=runSkillDataflow(),titles=['Sample intake','SQL filter','Spark group/count','ReactJS result'],labels=['sample','filter','count','view'];
  const values=[flow.source,flow.filtered,flow.groups.map(group=>group.count),flow.groups.map(group=>group.count)][index];
  const result=[JSON.stringify(flow.source),JSON.stringify(flow.filtered),flow.groups.map(group=>group.value+' -> '+group.count).join(', '),flow.rendered.join(' | ')][index];
  const action=['Read the local input','Keep values >= 5','Count each remaining value','Render the grouped values'][index];
  return {kind:'skills',index,title:titles[index],source:'SQL, Spark and ReactJS are listed in the resume. This is a local teaching model, not those runtimes.',
    notice:`${titles[index]}: ${action} -> ${result}. ${index===3?'Pipeline complete; next activation starts a fresh input.':'Advance the next gate to continue.'} Local teaching model.`,values,labels};
}
export function createRealmDemo(kind:PlanetWorldKind){
  let index=-1,snapshot:RealmDemoSnapshot|null=null;
  return {
    get snapshot(){return snapshot},
    activate(){
      const count=kind==='research'?samples.length:kind==='foundry'?foundryProjects.length:4;index=(index+1)%count;
      snapshot=kind==='research'?researchSnapshot(index):kind==='foundry'?foundrySnapshot(index):skillsSnapshot(index);return snapshot;
    },
  };
}
