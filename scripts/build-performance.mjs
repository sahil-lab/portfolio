import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import {createBuilder} from 'vite';
import vinext from 'vinext';
import tailwindcss from '@tailwindcss/vite';

const {values:options}=parseArgs({options:{baseline:{type:'boolean'}}}),workspace=process.cwd(),label=options.baseline?'before':'after';
const source=options.baseline?path.join(workspace,'outputs/performance-source/before'):workspace,output=path.join(source,'dist');
if(options.baseline){
 fs.mkdirSync(source,{recursive:true});const archive=path.join(workspace,'outputs/performance-source/published.tar');
 execFileSync('git',['archive','--format=tar','--output',archive,'40fc5daf4c8a30673413b56e31861df14c7a7487'],{cwd:workspace});
 execFileSync('tar',['-xf',archive,'-C',source]);const modules=path.join(source,'node_modules');if(!fs.existsSync(modules))fs.symlinkSync(path.join(workspace,'node_modules'),modules,'junction');
}
process.chdir(source);
const builder=await createBuilder({configFile:false,root:source,plugins:[tailwindcss(),vinext()],logLevel:'warn'});
await builder.buildApp();if(!fs.existsSync(path.join(output,'server/index.js'))||!fs.existsSync(path.join(output,'client')))throw Error('Production build did not produce the expected Vinext layout');console.log('PERFORMANCE_PRODUCTION_BUILD '+JSON.stringify({label,source,output}));
