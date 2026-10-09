export const gameInputResetEvent='kingdom-input-reset';
function releaseCapture(element:HTMLElement,pointerId:number){try{if(element.hasPointerCapture(pointerId))element.releasePointerCapture(pointerId)}catch{}}

export class InputState {
  keys=new Set<string>();stick={x:0,y:0};pointers=new Map<number,{x:number;y:number}>();
  constructor(private readonly onClear?:(pointers:number[])=>void){}
  clear(){const pointers=[...this.pointers.keys()];this.keys.clear();this.stick={x:0,y:0};this.pointers.clear();this.onClear?.(pointers)}
  axes(){const x=(this.keys.has('d')||this.keys.has('arrowright')?1:0)-(this.keys.has('a')||this.keys.has('arrowleft')?1:0)+this.stick.x;const z=(this.keys.has('s')||this.keys.has('arrowdown')?1:0)-(this.keys.has('w')||this.keys.has('arrowup')?1:0)+this.stick.y;const n=Math.max(1,Math.hypot(x,z));return {x:x/n,z:z/n}}
}

export function bindMovementJoystick(element:HTMLFieldSetElement,knob:HTMLElement,onMove:(x:number,z:number)=>void){
  const owner=element.ownerDocument,view=owner.defaultView!,scope=element.closest('.kingdom')??element;
  let active:number|null=null,enabled=!element.disabled,suspended=false,disposed=false;
  const reset=()=>{const pointerId=active;active=null;knob.style.transform='translate(0px,0px)';if(pointerId!==null)releaseCapture(element,pointerId);onMove(0,0)};
  const publish=(event:PointerEvent)=>{const bounds=element.getBoundingClientRect();let horizontal=(event.clientX-bounds.left-bounds.width/2)/42,vertical=(event.clientY-bounds.top-bounds.height/2)/42;const length=Math.max(1,Math.hypot(horizontal,vertical));horizontal/=length;vertical/=length;knob.style.transform=`translate(${horizontal*35}px,${vertical*35}px)`;onMove(horizontal,vertical)};
  const down=(event:PointerEvent)=>{
    if(disposed||!enabled||element.disabled||suspended||owner.hidden||active!==null||event.button>0)return;
    event.preventDefault();event.stopPropagation();active=event.pointerId;
    try{element.setPointerCapture(event.pointerId)}catch{reset();return}
    publish(event);
  };
  const move=(event:PointerEvent)=>{
    if(active!==event.pointerId)return;
    if(!enabled||element.disabled||suspended||owner.hidden||event.buttons===0){reset();return}
    event.preventDefault();event.stopPropagation();publish(event);
  };
  const end=(event:PointerEvent)=>{if(active===event.pointerId)reset()};
  const hidden=()=>{if(owner.hidden)reset()},lost=()=>{suspended=true;reset()},restored=()=>{suspended=false;reset()};
  const resetEvents=['blur','resize','pagehide','pageshow','orientationchange'] as const;
  element.addEventListener('pointerdown',down,{passive:false});element.addEventListener('lostpointercapture',end);
  view.addEventListener('pointermove',move,{passive:false,capture:true});view.addEventListener('pointerup',end,true);view.addEventListener('pointercancel',end,true);
  for(const event of resetEvents)view.addEventListener(event,reset);owner.addEventListener('visibilitychange',hidden);view.visualViewport?.addEventListener('resize',reset);
  scope.addEventListener(gameInputResetEvent,reset);scope.addEventListener('webglcontextlost',lost,true);scope.addEventListener('webglcontextrestored',restored,true);
  reset();
  return {reset,setEnabled(value:boolean){enabled=value;if(!enabled)reset()},dispose(){
    if(disposed)return;disposed=true;enabled=false;reset();
    element.removeEventListener('pointerdown',down);element.removeEventListener('lostpointercapture',end);
    view.removeEventListener('pointermove',move,true);view.removeEventListener('pointerup',end,true);view.removeEventListener('pointercancel',end,true);
    for(const event of resetEvents)view.removeEventListener(event,reset);owner.removeEventListener('visibilitychange',hidden);view.visualViewport?.removeEventListener('resize',reset);
    scope.removeEventListener(gameInputResetEvent,reset);scope.removeEventListener('webglcontextlost',lost,true);scope.removeEventListener('webglcontextrestored',restored,true);
  }};
}

export function bindGameInput(canvas:HTMLCanvasElement,events:{interact:()=>void;pause:()=>void;look:(x:number,y:number)=>void;zoom:(n:number)=>void;select:(x:number,y:number)=>void;touchSelect?:(x:number,y:number)=>void;flight?:()=>boolean;gesture:()=>void}){
  let enabled=true,moved=false,contextLost=false,disposed=false;let origin={x:0,y:0};
  const state=new InputState(pointers=>{moved=true;for(const pointerId of pointers)releaseCapture(canvas,pointerId);canvas.dispatchEvent(new Event(gameInputResetEvent,{bubbles:true}))});
  const editable=(t:EventTarget|null)=>t instanceof HTMLElement&&!!t.closest('input,select,textarea,[role="dialog"]');
  const keydown=(e:KeyboardEvent)=>{if(editable(e.target))return;if(e.code==='KeyP'||e.code==='Escape'){e.preventDefault();if(!e.repeat)events.pause();return}if(!enabled||contextLost)return;if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','e','shift'].includes(e.key.toLowerCase())||events.flight?.()&&[' ','q','control'].includes(e.key.toLowerCase()))e.preventDefault();state.keys.add(e.key.toLowerCase());events.gesture();if(e.key.toLowerCase()==='e'&&!e.repeat)events.interact()};
  const keyup=(e:KeyboardEvent)=>state.keys.delete(e.key.toLowerCase());
  const down=(e:PointerEvent)=>{if(!enabled||contextLost)return;e.preventDefault();events.gesture();try{canvas.setPointerCapture(e.pointerId)}catch{return}state.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});origin={x:e.clientX,y:e.clientY};moved=false};
  const move=(e:PointerEvent)=>{const previous=state.pointers.get(e.pointerId);if(!previous||!enabled||contextLost)return;e.preventDefault();const all=[...state.pointers.entries()];const other=all.find(([id])=>id!==e.pointerId)?.[1];if(other){const before=Math.hypot(previous.x-other.x,previous.y-other.y),after=Math.hypot(e.clientX-other.x,e.clientY-other.y);events.zoom((before-after)*.035);moved=true}else{events.look(e.clientX-previous.x,e.clientY-previous.y);if(Math.hypot(e.clientX-origin.x,e.clientY-origin.y)>4)moved=true}state.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY})};
  const up=(e:PointerEvent)=>{if(state.pointers.has(e.pointerId)&&!moved&&enabled&&!contextLost){if(e.pointerType==='touch')events.touchSelect?.(e.clientX,e.clientY);else events.select(e.clientX,e.clientY)}state.pointers.delete(e.pointerId);releaseCapture(canvas,e.pointerId);moved=true};
  const cancel=(e:PointerEvent)=>{if(!state.pointers.has(e.pointerId))return;state.pointers.delete(e.pointerId);releaseCapture(canvas,e.pointerId);moved=true};
  const clear=()=>state.clear();const hidden=()=>{if(document.hidden)clear()};
  const lost=()=>{contextLost=true;clear()},restored=()=>{contextLost=false;clear()},outside=(event:PointerEvent)=>{if(event.target!==canvas)cancel(event)};
  const wheel=(e:WheelEvent)=>{e.preventDefault();if(enabled&&!contextLost)events.zoom(e.deltaY*.02)};
  const resetEvents=['blur','resize','pagehide','pageshow','orientationchange'] as const;
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);for(const event of resetEvents)window.addEventListener(event,clear);document.addEventListener('visibilitychange',hidden);
  window.addEventListener('pointerup',outside,true);window.addEventListener('pointercancel',cancel,true);canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored);
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);canvas.addEventListener('wheel',wheel,{passive:false});
  return {state,setEnabled:(v:boolean)=>{enabled=v;if(!v)clear()},dispose:()=>{if(disposed)return;disposed=true;enabled=false;clear();window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);for(const event of resetEvents)window.removeEventListener(event,clear);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pointerup',outside,true);window.removeEventListener('pointercancel',cancel,true);canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('lostpointercapture',cancel);canvas.removeEventListener('wheel',wheel)}};
}
