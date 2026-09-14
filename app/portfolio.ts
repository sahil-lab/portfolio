// Résumé facts are separate from the explicitly illustrative architecture exhibits.
import * as resume from './resume-data.json';
export {resume};
export type Project = {
 id:string; name:string; kind:string; district:number; description:string; contribution:string;
 stack:string; decisions:string[]; links:{label:string;url:string}[]; flow:string[];
 building:{x:number;z:number;color:string;style:'studio'|'vault'};
 nodes:{id:string;label:string;explanation:string;x:number;z:number}[];
 connections:{from:string;to:string;kind:'call'|'return'|'render'}[];
 scenario:{mode:'react'|'backend';records?:Record<string,string>;colors?:Record<string,string>;inputLabel:string;options:string[];initial:string;steps:{node:string;text:string;result:string}[];simplification:string};
};
export const portfolio={name:resume.name,role:resume.role,summary:resume.summary,experience:resume.experience.map(e=>`${e.name} · ${e.role} · ${e.dates}`).join('\n'),education:`${resume.education.name} · ${resume.education.degree} · ${resume.education.year}`,contact:[resume.email,...resume.phones].join(' · ')};
export const projects:Project[]=[{
 id:'react-studio',name:'Component Studio',kind:'DEMONSTRATION · NOT A CLAIMED PROJECT',district:0,
 description:'An illustrative React interface that changes the color of a rendered card.',contribution:'Not supplied. This exhibit is an authored teaching example.',stack:'React · TypeScript · HTML/CSS',
 decisions:['Keep selected color in the owning component state.','Pass the selected color to the preview through props.','The example has no network requests or message broker.'],links:[],flow:['Action','State owner','Preview component','DOM result'],
 building:{x:13,z:34,color:'#97dcca',style:'studio'},
 nodes:[{id:'action',label:'1 · Interface action',explanation:'Choose a color and trigger the action.',x:-3,z:2},{id:'state',label:'2 · State owner',explanation:'The owning component receives a state update.',x:-3,z:-2},{id:'preview',label:'3 · Preview props',explanation:'The new color is passed to the preview component.',x:3,z:-2},{id:'dom',label:'4 · Rendered card',explanation:'React commits the resulting DOM update.',x:3,z:2}],
 connections:[{from:'action',to:'state',kind:'call'},{from:'state',to:'preview',kind:'render'},{from:'preview',to:'dom',kind:'render'}],
 scenario:{mode:'react',colors:{Mint:'#97dcca',Amber:'#e7b778',Lilac:'#c09aea'},inputLabel:'Card color',options:['Mint','Amber','Lilac'],initial:'Mint',steps:[{node:'action',text:'The interface action requests {input}.',result:'Action accepted'},{node:'state',text:'The state owner sets selectedColor to {input}.',result:'State: {input}'},{node:'preview',text:'Preview receives color={input}; its output is recalculated.',result:'Preview props: {input}'},{node:'dom',text:'The DOM card now displays {input}.',result:'Rendered card: {input}'}],simplification:'A slowed teaching model of one update, not a React profiler or a complete reconciliation trace.'}
},{
 id:'request-hall',name:'Request Hall',kind:'DEMONSTRATION · NOT A CLAIMED PROJECT',district:5,
 description:'An illustrative synchronous catalog lookup through an HTTP handler, service, and in-memory data store.',contribution:'Not supplied. This exhibit is an authored teaching example.',stack:'HTTP concepts · TypeScript · in-memory records',
 decisions:['Validate the key before querying the catalog.','Keep lookup logic in a service.','Return the response along the call chain; no asynchronous message bus is modeled.'],links:[],flow:['HTTP handler','Catalog service','Record store','Response'],
 building:{x:-13,z:34,color:'#e7b778',style:'vault'},
 nodes:[{id:'entry',label:'1 · HTTP entry',explanation:'GET /catalog/{key} enters the handler.',x:-3,z:2},{id:'service',label:'2 · Catalog service',explanation:'The service requests the matching record.',x:-1,z:-1},{id:'store',label:'3 · Record store',explanation:'A local map stands in for a database.',x:3,z:-3},{id:'response',label:'4 · HTTP response',explanation:'The handler returns a status and body.',x:3,z:2}],
 connections:[{from:'entry',to:'service',kind:'call'},{from:'service',to:'store',kind:'call'},{from:'store',to:'service',kind:'return'},{from:'service',to:'response',kind:'return'}],
 scenario:{mode:'backend',records:{'101':'Copper coil','202':'Memory crystal'},inputLabel:'Catalog key',options:['101','202','404'],initial:'101',steps:[{node:'entry',text:'Handler accepts GET /catalog/{input}.',result:'Request accepted'},{node:'service',text:'Catalog service looks up key {input}.',result:'Lookup requested'},{node:'store',text:'The local store resolves key {input}: {record}.',result:'Store result: {record}'},{node:'service',text:'The result returns to the service: {record}.',result:'Service result: {record}'},{node:'response',text:'The handler returns {response}.',result:'{response}'}],simplification:'Entirely local and intentionally slowed. No real server, disk, network latency, authentication, or asynchronous messaging is represented.'}
}];

