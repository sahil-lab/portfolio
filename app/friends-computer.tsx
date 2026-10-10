'use client';

import 'setimmediate';
import {useEffect,useRef,useState} from 'react';
import {Power,Pause,Play,Download,Upload,Terminal,Send,Square,Monitor,Network} from 'lucide-react';
import type {V86} from 'v86';
import {diagnosticError,recordDiagnostic} from './client-diagnostics';

export function FriendsComputer({visible}:{visible:boolean}){
 const screen=useRef<HTMLDivElement>(null),consoleView=useRef<HTMLTextAreaElement>(null),emulator=useRef<V86|null>(null),buffer=useRef(''),alive=useRef(true);
 const [status,setStatus]=useState('Powered off'),[running,setRunning]=useState(false),[powered,setPowered]=useState(false),[busy,setBusy]=useState(false),[network,setNetwork]=useState(false),[command,setCommand]=useState(''),[display,setDisplay]=useState<'console'|'screen'>('console');
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;void emulator.current?.destroy();emulator.current=null}},[]);
 useEffect(()=>{if(!emulator.current)return;if(!visible)void emulator.current.stop().then(()=>{if(alive.current)setRunning(false)})},[visible]);
 useEffect(()=>{const timer=setInterval(()=>{if(consoleView.current&&consoleView.current.value!==buffer.current){consoleView.current.value=buffer.current;consoleView.current.scrollTop=consoleView.current.scrollHeight}},100);return()=>clearInterval(timer)},[]);
 async function boot(){
  if(busy)return;setBusy(true);
  recordDiagnostic('service_state',{phase:'linux-pc',action:'boot',bytes:132*1024*1024});
  try{
    if(emulator.current){await emulator.current.destroy();emulator.current=null;setPowered(false)}
  const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname),relay=process.env.NEXT_PUBLIC_GUEST_RELAY||(local?'http://127.0.0.1:8788/fetch?url=':'');
   if(network&&!relay)throw new Error('A private guest network relay is not configured.');
  if(network&&!/^https?:\/\//.test(relay))throw new Error('The guest web relay must use HTTP or HTTPS.');
  if(network&&location.protocol==='https:'&&!relay.startsWith('https://'))throw new Error('HTTPS requires a secure guest relay.');
   setStatus('Loading Linux...');buffer.current='';
   const manifest=await fetch('/assets/friends-pc/manifest.json');if(!manifest.ok)throw new Error('Linux assets are not prepared. Run npm run friends:prepare.');
  const {V86:Emulator}=await import('v86');if(!alive.current)return;
    const machine=new Emulator({wasm_path:'/assets/friends-pc/v86.wasm',bios:{url:'/assets/friends-pc/seabios.bin'},vga_bios:{url:'/assets/friends-pc/vgabios.bin'},bzimage:{url:'/assets/friends-pc/buildroot-bzimage68.bin'},memory_size:128*1024*1024,vga_memory_size:4*1024*1024,screen:{container:screen.current!,use_graphical_text:false},disable_keyboard:true,disable_mouse:true,disable_speaker:true,filesystem:{},cmdline:'console=tty0 console=ttyS0,115200 tsc=reliable mitigations=off random.trust_cpu=on',net_device:{type:'virtio',relay_url:network?'fetch':undefined,cors_proxy:network?relay:undefined,dns_method:'static'},autostart:true});
    emulator.current=machine;setPowered(true);
   machine.add_listener('serial0-output-byte',byte=>{if(byte===8)buffer.current=buffer.current.slice(0,-1);else if(byte!==13)buffer.current=(buffer.current+String.fromCharCode(byte)).slice(-64000)});
  machine.add_listener('emulator-ready',()=>{if(alive.current){recordDiagnostic('service_state',{phase:'linux-pc',action:'ready'});setRunning(true);setBusy(false);setStatus('Linux running')}});
  machine.add_listener('download-error',()=>{if(alive.current){recordDiagnostic('asset_failed',{phase:'linux-pc'});setBusy(false);setStatus('A Linux asset failed to load.')}});
  }catch(error){if(alive.current){recordDiagnostic('service_failed',{phase:'linux-pc',action:'boot',...diagnosticError(error)});setStatus(error instanceof Error?error.message:'Linux could not start.');setBusy(false);setRunning(false)}}
 }
 async function toggle(){if(!emulator.current)return;if(running)await emulator.current.stop();else await emulator.current.run();setRunning(!running);setStatus(running?'Linux paused':'Linux running')}
 async function save(){
  if(!emulator.current)return;setBusy(true);
  try{const state=await emulator.current.save_state(),url=URL.createObjectURL(new Blob([state],{type:'application/octet-stream'})),link=document.createElement('a');link.href=url;link.download='orbit-linux-state.bin';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus('State exported')}catch{recordDiagnostic('service_failed',{phase:'linux-pc',action:'save'});setStatus('Could not export the guest state.')}finally{setBusy(false)}
 }
 async function restore(file:File|undefined){
  if(!file||!emulator.current)return;
  if(file.size>256*1024*1024){setStatus('The state file exceeds 256 MB.');return}
    setBusy(true);try{recordDiagnostic('service_state',{phase:'linux-pc',action:'restore',bytes:file.size});await emulator.current.stop();await emulator.current.restore_state(await file.arrayBuffer());await emulator.current.run();setRunning(true);setStatus('Guest state restored')}catch{recordDiagnostic('service_failed',{phase:'linux-pc',action:'restore'});setStatus('This state does not match the Linux PC configuration.')}finally{setBusy(false)}
 }
 return <section className="friends-computer" aria-label="Linux PC"><header className="friends-game-toolbar"><h2><Monitor size={21}/>Linux PC</h2><output>{status}</output></header><div className="pc-toolbar">
 <button type="button" title={powered?'Restart Linux':'Boot Linux'} aria-label={powered?'Restart Linux':'Boot Linux'} disabled={busy} onClick={()=>void boot()}><Power size={18}/><span>{powered?'Restart':'Boot'}</span></button>
 <button type="button" title={running?'Pause Linux':'Resume Linux'} aria-label={running?'Pause Linux':'Resume Linux'} disabled={!powered||busy} onClick={()=>void toggle()}>{running?<Pause size={18}/>:<Play size={18}/>}</button>
 <button type="button" title="Export guest state" aria-label="Export guest state" disabled={!powered||busy} onClick={()=>void save()}><Download size={18}/></button>
 <label className="pc-restore" title="Restore guest state"><Upload size={18}/><input type="file" accept=".bin" aria-label="Restore guest state" disabled={!powered||busy} onChange={event=>void restore(event.target.files?.[0])}/></label>
 <label className="pc-network"><Network size={17}/><input type="checkbox" checked={network} disabled={powered||busy} onChange={event=>setNetwork(event.target.checked)}/>Internet</label>
 <fieldset className="friends-segmented" aria-label="PC display"><button type="button" title="Serial console" aria-label="Serial console" aria-pressed={display==='console'} onClick={()=>setDisplay('console')}><Terminal size={17}/></button><button type="button" title="VGA display" aria-label="VGA display" aria-pressed={display==='screen'} onClick={()=>setDisplay('screen')}><Monitor size={17}/></button></fieldset>
 </div><div className="pc-display"><textarea ref={consoleView} className="pc-console" aria-label="Linux serial console" readOnly hidden={display!=='console'}/><div ref={screen} className="pc-vga" hidden={display!=='screen'}><div style={{whiteSpace:'pre',fontFamily:'monospace',fontSize:14,lineHeight:'14px'}}/><canvas style={{display:'none'}}/></div>{!powered&&!busy&&<div className="pc-off"><Monitor size={48}/><span>Buildroot Linux 6.8</span><small>128 MB / x86</small></div>}</div>
 <form className="pc-command" onSubmit={event=>{event.preventDefault();if(emulator.current&&running&&command.trim()){emulator.current.serial0_send(command+'\n');setCommand('')}}}><Terminal size={18}/><input aria-label="Linux command" placeholder="Command" value={command} disabled={!running} autoComplete="off" spellCheck={false} onChange={event=>setCommand(event.target.value)}/><button type="submit" title="Send command" aria-label="Send command" disabled={!running}><Send size={17}/></button><button type="button" title="Interrupt command" aria-label="Interrupt command" disabled={!running} onClick={()=>emulator.current?.serial0_send('\x03')}><Square size={15}/></button></form>
 </section>;
}
