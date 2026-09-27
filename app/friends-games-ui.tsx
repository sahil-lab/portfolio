'use client';

import {useEffect,useRef,useState,type PointerEvent as ReactPointerEvent} from 'react';
import {Chess,type Square} from 'chess.js';
import {ArrowUp,ArrowLeft,ArrowRight,Square as Brake,Flag,Eraser,Pencil,Crosshair,Trophy} from 'lucide-react';
import type {FriendsClient} from './friends-client';
import type {Friend,GameRecord,Match,Placing} from '../lib/friends-protocol';

export const gameNames={race:'Orbital Circuit',chess:'Rapid Chess',sudoku:'Sudoku',targets:'Target Range',pong:'Table Tennis'};
export function clockText(milliseconds:number){const seconds=Math.max(0,Math.ceil(milliseconds/1000));return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`}
export function Podium({rows,reason}:{rows:Placing[];reason:string}){
 return <section className="friends-podium" aria-label="Match podium"><h3><Trophy size={17}/>{reason}</h3><ol>{[2,1,3].map(place=>{const row=rows.find(row=>row.place===place);return <li key={place} data-place={place}><span className="podium-name" style={{color:row?.color}}>{row?.name??'Unclaimed'}</span><div className="podium-step"><strong>{place}</strong><small>{row?.draw?'Draw':row?.timeMs!==null&&row?.timeMs!==undefined?clockText(row.timeMs):row?`${row.score} points`:''}</small></div></li>})}</ol>{rows.filter(row=>row.draw).length>1&&<p>{rows.filter(row=>row.draw).map(row=>row.name).join(' / ')} tied</p>}</section>;
}
export function RecordTable({record,title}:{record:GameRecord;title:string}){
 return <section className="friends-record"><h3>{title}</h3><ol>{[0,1,2].map(index=>{const row=record.top[index];return <li key={index}><b>{index+1}</b><span style={{color:row?.color}}>{row?.name??'Unclaimed'}</span><small>{row?`${row.wins} ${row.wins===1?'win':'wins'}`:'No result'}</small>{row?.bestMs!=null&&<time>{clockText(row.bestMs)}</time>}</li>})}</ol><p>Last winner: <strong>{record.last?.podium.filter(row=>row.place===1).map(row=>row.name).join(' / ')||'No completed match'}</strong>{record.last?.podium.some(row=>row.draw)&&' (draw)'}</p></section>;
}
export function RaceControls({client,enabled}:{client:FriendsClient;enabled:boolean}){
 const held=useRef(new Set<string>());
 useEffect(()=>{
  if(!enabled)return;
  const controls=held.current;
  const send=()=>{const active=!document.hidden;client.send({type:'race-input',throttle:active&&(controls.has('gas')||controls.has('KeyW')||controls.has('ArrowUp'))?1:0,steer:active?Number(controls.has('right')||controls.has('KeyD')||controls.has('ArrowRight'))-Number(controls.has('left')||controls.has('KeyA')||controls.has('ArrowLeft')):0,brake:!active||controls.has('brake')||controls.has('Space')||controls.has('KeyS')||controls.has('ArrowDown')})};
  const release=()=>{controls.clear();send()};
  const down=(event:KeyboardEvent)=>{if((event.target as HTMLElement)?.closest('input,select,textarea,[contenteditable=true],button'))return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code)){event.preventDefault();controls.add(event.code)}};
  const up=(event:KeyboardEvent)=>{controls.delete(event.code)};
  const timer=setInterval(send,50);window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',release);document.addEventListener('visibilitychange',release);
  return()=>{clearInterval(timer);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',release);document.removeEventListener('visibilitychange',release);release()};
 },[client,enabled]);
 const pointer=(event:ReactPointerEvent<HTMLButtonElement>,key:string)=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);held.current.add(key)};
 return <fieldset className="friends-race-controls" aria-label="Race controls">{[{key:'left',label:'Steer left',Icon:ArrowLeft},{key:'right',label:'Steer right',Icon:ArrowRight},{key:'brake',label:'Brake',Icon:Brake},{key:'gas',label:'Accelerate',Icon:ArrowUp}].map(({key,label,Icon})=><button key={key} type="button" title={label} aria-label={label} disabled={!enabled} data-control={key} onPointerDown={event=>pointer(event,key)} onPointerUp={()=>held.current.delete(key)} onPointerCancel={()=>held.current.delete(key)} onLostPointerCapture={()=>held.current.delete(key)} onKeyDown={event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();event.stopPropagation();held.current.add(key)}}} onKeyUp={()=>held.current.delete(key)} onBlur={()=>held.current.delete(key)}><Icon size={24}/></button>)}</fieldset>;
}
const glyphs:Record<string,number>={k:0x265a,q:0x265b,r:0x265c,b:0x265d,n:0x265e,p:0x265f};
const pieceNames:Record<string,string>={k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'};
export function ChessGame({match,players,id,client}:{match:Match;players:Friend[];id:string;client:FriendsClient}){
 const [selected,setSelected]=useState<Square|null>(null),[promotion,setPromotion]=useState('q');
 const chess=new Chess(match.fen),seat=match.participants.indexOf(id),own=seat===0?'w':seat===1?'b':null,active=match.phase==='running'&&chess.turn()===own;
 const files=seat===1?'hgfedcba':'abcdefgh',ranks=seat===1?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1];
 const legal=selected&&active?chess.moves({square:selected,verbose:true}):[];
 const choose=(square:Square)=>{
  if(!active)return;
  if(selected&&legal.some(move=>move.to===square)){client.send({type:'chess-move',from:selected,to:square,promotion});setSelected(null)}
  else setSelected(chess.get(square)?.color===own?square:null);
 };
 return <section className="friends-board-game" aria-label="Chess game"><div className="chess-clocks">{match.participants.map((playerId,index)=><div key={playerId} data-active={match.turn===(index===0?'w':'b')}><span>{players.find(player=>player.id===playerId)?.name??'Disconnected'} / {index===0?'White':'Black'}</span><time>{clockText(index===0?match.whiteMs??0:match.blackMs??0)}</time></div>)}</div>
 <fieldset className="chess-board" aria-label="Chess board">{ranks.flatMap((rank,row)=>Array.from(files).map((file,column)=>{const square=(file+rank) as Square,piece=chess.get(square);return <button key={square} type="button" className={(row+column)%2?'chess-dark':'chess-light'} aria-label={`${square}${piece?` ${piece.color==='w'?'white':'black'} ${pieceNames[piece.type]}`:' empty'}`} aria-pressed={selected===square} data-square={square} data-legal={legal.some(move=>move.to===square)} data-piece-color={piece?.color} onClick={()=>choose(square)}><span className="chess-piece">{piece?String.fromCodePoint(glyphs[piece.type]):''}</span>{column===0&&<small className="chess-rank">{rank}</small>}{row===7&&<small className="chess-file">{file}</small>}</button>}))}</fieldset>
 <div className="friends-game-toolbar"><output>{match.phase==='countdown'?'Starting...':match.phase==='finished'?match.reason:chess.isCheck()?'Check':own===null?'Spectating':active?'Your move':'Opponent to move'}</output><label>Promotion<select aria-label="Promotion piece" value={promotion} onChange={event=>setPromotion(event.target.value)}><option value="q">Queen</option><option value="r">Rook</option><option value="b">Bishop</option><option value="n">Knight</option></select></label>{seat>=0&&match.phase==='running'&&<button type="button" title="Resign match" onClick={()=>client.send({type:'resign'})}><Flag size={16}/>Resign</button>}</div>
 </section>;
}
function conflicting(grid:string,index:number){
 const value=grid[index];if(!value||value==='-')return false;
 const row=Math.floor(index/9),column=index%9;
 for(let other=0;other<81;other++)if(other!==index&&grid[other]===value&&(Math.floor(other/9)===row||other%9===column||Math.floor(other/27)===Math.floor(row/3)&&Math.floor(other%9/3)===Math.floor(column/3)))return true;
 return false;
}
export function SudokuGame({match,id,client}:{match:Match;id:string;client:FriendsClient}){
 const [selected,setSelected]=useState(0),[notes,setNotes]=useState(false),[marks,setMarks]=useState<Record<number,string>>({});
 const grid=match.grids?.[id]??match.puzzle??'-'.repeat(81),active=match.phase==='running'&&match.participants.includes(id)&&match.solved?.[id]===undefined;
 const put=(value:string)=>{
  if(!active||match.puzzle?.[selected]!=='-')return;
  if(notes&&value!=='-')setMarks(previous=>{const current=previous[selected]??'';return {...previous,[selected]:current.includes(value)?current.replace(value,''):(current+value).split('').sort().join('')}});
  else {client.send({type:'sudoku-cell',index:selected,value});setMarks(previous=>({...previous,[selected]:''}))}
 };
 return <section className="friends-board-game" aria-label="Sudoku game"><div className="friends-game-toolbar"><output>{match.solved?.[id]!==undefined?`Solved in ${clockText(match.solved[id])}`:match.participants.includes(id)?`${Array.from(grid).filter(value=>value!=='-').length} / 81`:'Spectating'}</output><button type="button" title="Pencil notes" aria-label="Pencil notes" aria-pressed={notes} onClick={()=>setNotes(value=>!value)}><Pencil size={18}/></button></div>
 <fieldset className="sudoku-board" aria-label="Sudoku board">{Array.from(grid).map((value,index)=><button key={index} type="button" data-cell={index} data-given={match.puzzle?.[index]!=='-'} data-conflict={conflicting(grid,index)} aria-label={`Row ${Math.floor(index/9)+1} column ${index%9+1}, ${value==='-'?'empty':value}${match.puzzle?.[index]!=='-'?', given':''}`} aria-pressed={index===selected} onClick={()=>setSelected(index)} onKeyDown={event=>{if(/^[1-9]$/.test(event.key)){event.preventDefault();put(event.key)}else if(['Backspace','Delete'].includes(event.key)){event.preventDefault();put('-')}else if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();const next=Math.max(0,Math.min(80,index+(event.key==='ArrowUp'?-9:event.key==='ArrowDown'?9:event.key==='ArrowLeft'?-1:1)));setSelected(next);event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-cell="${next}"]`)?.focus()}}}>{value!=='-'?value:<small className="sudoku-notes">{marks[index]??''}</small>}</button>)}</fieldset>
 <fieldset className="sudoku-keypad" aria-label="Sudoku digits">{'123456789'.split('').map(digit=><button key={digit} type="button" disabled={!active||match.puzzle?.[selected]!=='-'} onClick={()=>put(digit)}>{digit}</button>)}<button type="button" title="Erase cell" aria-label="Erase cell" disabled={!active||match.puzzle?.[selected]!=='-'} onClick={()=>put('-')}><Eraser size={18}/></button></fieldset></section>;
}
export function TargetGame({match,id,client}:{match:Match;id:string;client:FriendsClient}){
 const canvas=useRef<HTMLCanvasElement>(null),[aim,setAim]=useState({x:.5,y:.5}),active=match.phase==='running'&&match.participants.includes(id);
 const shoot=(position=aim)=>{if(active&&match.target)client.send({type:'target-hit',...position,targetId:match.target.id,frameAt:match.target.at})};
 useEffect(()=>{
  const context=canvas.current?.getContext('2d');if(!context)return;
  const size=720;context.fillStyle='#102d33';context.fillRect(0,0,size,size);context.strokeStyle='#294950';context.lineWidth=1;
  for(let line=0;line<=size;line+=45){context.beginPath();context.moveTo(line,0);context.lineTo(line,size);context.moveTo(0,line);context.lineTo(size,line);context.stroke()}
  const target=match.target;if(target){const radius=target.radius*size;for(const [scale,color] of [[1,'#eecb71'],[.72,'#eb765d'],[.45,'#f7ead0'],[.2,'#284a4c']] as const){context.beginPath();context.arc(target.x*size,target.y*size,radius*scale,0,Math.PI*2);context.fillStyle=color;context.fill()}}
  context.strokeStyle='#ccf4e3';context.lineWidth=2;context.beginPath();context.arc(aim.x*size,aim.y*size,12,0,Math.PI*2);context.moveTo(aim.x*size-20,aim.y*size);context.lineTo(aim.x*size+20,aim.y*size);context.moveTo(aim.x*size,aim.y*size-20);context.lineTo(aim.x*size,aim.y*size+20);context.stroke();
 },[match.target,aim]);
 const point=(event:ReactPointerEvent<HTMLButtonElement>)=>{const rect=event.currentTarget.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))}};
 return <section className="friends-board-game" aria-label="Target shooting game"><div className="friends-game-toolbar"><output>{match.scores?.[id]??0} hits</output><Crosshair size={20}/></div><button type="button" aria-label="Target range" aria-disabled={!active} className="target-trigger" onPointerMove={event=>setAim(point(event))} onPointerDown={event=>{const position=point(event);setAim(position);shoot(position)}} onKeyDown={event=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();setAim(previous=>({x:Math.max(0,Math.min(1,previous.x+(event.key==='ArrowRight'?.025:event.key==='ArrowLeft'?-.025:0))),y:Math.max(0,Math.min(1,previous.y+(event.key==='ArrowDown'?.025:event.key==='ArrowUp'?-.025:0)))}))}else if(event.key===' '||event.key==='Enter'){event.preventDefault();shoot()}}}><canvas ref={canvas} width={720} height={720} aria-hidden="true" className="target-board"/></button><button type="button" disabled={!active} onClick={()=>shoot()}><Crosshair size={17}/>Fire</button></section>;
}
export function PongGame({match,players,id,client}:{match:Match;players:Friend[];id:string;client:FriendsClient}){
 const canvas=useRef<HTMLCanvasElement>(null),seat=match.participants.indexOf(id),active=match.phase==='running'&&seat>=0;
 const move=(value:number)=>{if(active)client.send({type:'paddle',value:Math.max(-1,Math.min(1,value))})};
 useEffect(()=>{
  const context=canvas.current?.getContext('2d');if(!context)return;
  context.fillStyle='#1d675e';context.fillRect(0,0,1100,600);context.strokeStyle='#d9edcf';context.lineWidth=4;context.strokeRect(12,12,1076,576);context.setLineDash([8,12]);context.beginPath();context.moveTo(550,0);context.lineTo(550,600);context.stroke();context.setLineDash([]);
  for(const side of [0,1]){context.fillStyle=players.find(player=>player.id===match.participants[side])?.color??'#eee';context.fillRect(side===0?85:985,300-(match.paddles?.[side]??0)*50-62.5,30,125)}
  context.fillStyle='#fbf4d8';context.shadowColor='#fff7db';context.shadowBlur=10;context.beginPath();context.arc(550+(match.ball?.[0]??0)*50,300-(match.ball?.[1]??0)*50,14,0,Math.PI*2);context.fill();context.shadowBlur=0;
 },[match.ball,match.paddles,match.participants,players]);
 const pointer=(event:ReactPointerEvent<HTMLButtonElement>)=>{const rect=event.currentTarget.getBoundingClientRect();move((.5-(event.clientY-rect.top)/rect.height)*2)};
 return <section className="friends-board-game pong-game" aria-label="Table tennis game"><div className="pong-score">{match.participants.map((playerId,index)=><div key={playerId}><span>{players.find(player=>player.id===playerId)?.name??'Disconnected'}</span><strong>{match.points?.[index]??0}</strong></div>)}</div><button type="button" className="pong-court" aria-label="Table tennis court" aria-disabled={!active} onPointerMove={pointer} onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId);pointer(event)}} onKeyDown={event=>{if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();move((match.paddles?.[seat]??0)/4.6+(event.key==='ArrowUp'?.13:-.13))}}}><canvas ref={canvas} width={1100} height={600} className="pong-board" aria-hidden="true"/></button>{seat>=0&&<label className="paddle-slider">Paddle<input type="range" aria-label="Paddle position" min={-1} max={1} step={.01} value={(match.paddles?.[seat]??0)/4.6} disabled={!active} onChange={event=>move(Number(event.target.value))}/></label>}{seat>=0&&active&&<button type="button" onClick={()=>client.send({type:'resign'})}><Flag size={16}/>Concede</button>}</section>;
}
