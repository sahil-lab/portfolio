import { projects, type Project } from './portfolio';
export type ExhibitSnapshot={input:string;committedInput:string;step:number;running:boolean;paused:boolean;result:string;explanation:string;active:string|null};
export class Exhibit {
 private listeners=new Set<()=>void>(); private elapsed=0;
 snapshot:ExhibitSnapshot;
 constructor(public project:Project){this.snapshot=this.initial()}
 private initial():ExhibitSnapshot{return {input:this.project.scenario.initial,committedInput:this.project.scenario.initial,step:-1,running:false,paused:false,result:'Ready to demonstrate',explanation:'Choose an input, then trigger the demonstration.',active:null}}
 get progress(){return Math.min(1,this.elapsed/1.4)}
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return ()=>{this.listeners.delete(fn)}};
 getSnapshot=()=>this.snapshot;
 private update(values:Partial<ExhibitSnapshot>){this.snapshot={...this.snapshot,...values};this.listeners.forEach(fn=>fn())}
 choose=(input:string)=>{if(!this.snapshot.running&&this.project.scenario.options.includes(input))this.update({input})};
 trigger=()=>{this.elapsed=0;this.update({running:true,paused:false,step:0});this.show()};
 pause=()=>{if(this.snapshot.running)this.update({paused:!this.snapshot.paused})};
 reset=()=>{this.elapsed=0;this.snapshot=this.initial();this.listeners.forEach(fn=>fn())};
 private show(){const s=this.project.scenario.steps[this.snapshot.step];const key=this.snapshot.input;const found=this.project.scenario.records?.[key];const record=found??'not found';const response=found?`200 · ${record}`:'404 · Record not found';const format=(t:string)=>t.replaceAll('{input}',key).replaceAll('{record}',record).replaceAll('{response}',response);this.update({...((this.snapshot.step===this.project.scenario.steps.length-1)?{committedInput:key}:{}),active:s.node,result:format(s.result),explanation:format(s.text)})}
 tick=(dt:number)=>{if(!this.snapshot.running||this.snapshot.paused)return;this.elapsed+=dt;if(this.elapsed<1.4)return;this.elapsed-=1.4;if(this.snapshot.step+1>=this.project.scenario.steps.length){this.update({running:false});return}this.update({step:this.snapshot.step+1});this.show()};
}
export const exhibits=projects.map(p=>new Exhibit(p));
