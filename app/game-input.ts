export class InputState {
  keys=new Set<string>();stick={x:0,y:0};pointers=new Map<number,{x:number;y:number}>();
  clear(){this.keys.clear();this.stick={x:0,y:0};this.pointers.clear()}
  axes(){const x=(this.keys.has('d')||this.keys.has('arrowright')?1:0)-(this.keys.has('a')||this.keys.has('arrowleft')?1:0)+this.stick.x;const z=(this.keys.has('s')||this.keys.has('arrowdown')?1:0)-(this.keys.has('w')||this.keys.has('arrowup')?1:0)+this.stick.y;const n=Math.max(1,Math.hypot(x,z));return {x:x/n,z:z/n}}
}
export function bindGameInput(canvas:HTMLCanvasElement,events:{interact:()=>void;pause:()=>void;look:(x:number,y:number)=>void;zoom:(n:number)=>void;select:(x:number,y:number)=>void;gesture:()=>void}){
  const state=new InputState();let enabled=true;let moved=false;let origin={x:0,y:0};
  const editable=(t:EventTarget|null)=>t instanceof HTMLElement&&!!t.closest('input,select,textarea,[role="dialog"]');
  const keydown=(e:KeyboardEvent)=>{if(editable(e.target))return;if(e.code==='KeyP'||e.code==='Escape'){e.preventDefault();if(!e.repeat)events.pause();return}if(!enabled)return;if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','e','shift'].includes(e.key.toLowerCase()))e.preventDefault();state.keys.add(e.key.toLowerCase());events.gesture();if(e.key.toLowerCase()==='e'&&!e.repeat)events.interact()};
  const keyup=(e:KeyboardEvent)=>state.keys.delete(e.key.toLowerCase());
  const down=(e:PointerEvent)=>{if(!enabled)return;e.preventDefault();events.gesture();canvas.setPointerCapture(e.pointerId);state.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});origin={x:e.clientX,y:e.clientY};moved=false};
  const move=(e:PointerEvent)=>{const previous=state.pointers.get(e.pointerId);if(!previous||!enabled)return;e.preventDefault();const all=[...state.pointers.entries()];const other=all.find(([id])=>id!==e.pointerId)?.[1];if(other){const before=Math.hypot(previous.x-other.x,previous.y-other.y),after=Math.hypot(e.clientX-other.x,e.clientY-other.y);events.zoom((before-after)*.035);moved=true}else{events.look(e.clientX-previous.x,e.clientY-previous.y);if(Math.hypot(e.clientX-origin.x,e.clientY-origin.y)>4)moved=true}state.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY})};
  const up=(e:PointerEvent)=>{if(state.pointers.has(e.pointerId)&&!moved&&e.pointerType!=='touch'&&enabled)events.select(e.clientX,e.clientY);state.pointers.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);moved=true};
  const cancel=(e:PointerEvent)=>{state.pointers.delete(e.pointerId);moved=true};
  const clear=()=>state.clear();const hidden=()=>{if(document.hidden)clear()};
  const wheel=(e:WheelEvent)=>{e.preventDefault();if(enabled)events.zoom(e.deltaY*.02)};
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',hidden);
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);canvas.addEventListener('wheel',wheel,{passive:false});
  return {state,setEnabled:(v:boolean)=>{enabled=v;if(!v)clear()},dispose:()=>{clear();window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',hidden);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('lostpointercapture',cancel);canvas.removeEventListener('wheel',wheel)}};
}
