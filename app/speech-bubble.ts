import * as T from 'three';

export type SpeechBubbleStyle='speech'|'thought'|'burst';
type BubbleOptions={style?:SpeechBubbleStyle;width?:number;height?:number;phase?:number};
const ink='#17212b';
const colors:Record<SpeechBubbleStyle,string>={speech:'#ff91b1',thought:'#73e4df',burst:'#ffe36b'};

function bubbleTexture(text:string,style:SpeechBubbleStyle){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=384;
  const context=canvas.getContext('2d')!;
  function contour(){
    context.beginPath();
    if(style==='speech'){
      context.moveTo(114,30);context.lineTo(646,30);context.quadraticCurveTo(720,30,720,102);
      context.lineTo(720,222);context.quadraticCurveTo(720,292,646,292);
      context.lineTo(432,292);context.lineTo(374,354);context.lineTo(382,292);
      context.lineTo(114,292);context.quadraticCurveTo(40,292,40,222);
      context.lineTo(40,102);context.quadraticCurveTo(40,30,114,30);
    }else if(style==='thought'){
      context.moveTo(94,104);context.bezierCurveTo(68,42,184,14,230,60);
      context.bezierCurveTo(260,4,390,4,428,57);context.bezierCurveTo(483,11,606,32,612,87);
      context.bezierCurveTo(715,67,752,164,699,206);context.bezierCurveTo(751,277,638,328,585,284);
      context.bezierCurveTo(537,330,435,324,402,290);context.bezierCurveTo(342,336,230,317,220,278);
      context.bezierCurveTo(151,325,53,273,74,216);context.bezierCurveTo(3,180,27,104,94,104);
    }else{
      for(let point=0;point<24;point++){
        const angle=-Math.PI/2+point*Math.PI/12,radius=point%2?.83:1;
        const x=384+Math.cos(angle)*342*radius,y=167+Math.sin(angle)*145*radius;
        if(point===0)context.moveTo(x,y);else context.lineTo(x,y);
      }
    }
    context.closePath();
  }
  context.lineJoin='round';context.lineCap='round';context.lineWidth=13;context.strokeStyle=ink;
  context.save();context.translate(6,9);contour();context.fillStyle=ink;context.fill();context.restore();
  contour();context.fillStyle=colors[style];context.fill();context.stroke();
  if(style==='thought'){
    for(const [x,y,radius] of [[379,336,14],[358,368,7]]){
      context.beginPath();context.arc(x,y,radius,0,Math.PI*2);context.fill();context.lineWidth=6;context.stroke();
    }
  }else if(style==='burst'){
    context.beginPath();context.moveTo(403,298);context.lineTo(374,346);context.lineTo(386,357);context.lineTo(433,312);
    context.closePath();context.fill();context.lineWidth=9;context.stroke();
  }
  if(style!=='burst'){
    context.beginPath();context.moveTo(92,110);context.quadraticCurveTo(106,66,177,64);
    context.strokeStyle='#fff9ef';context.lineWidth=9;context.stroke();
  }
  const maximumWidth=style==='speech'?554:478,maximumHeight=170;
  let fontSize=120,lines:string[]=[];
  for(;fontSize>=18;fontSize-=2){
    context.font=`900 ${fontSize}px "Trebuchet MS", sans-serif`;lines=[];let line='';
    for(const word of text.toUpperCase().trim().split(/\s+/)){
      const next=line?line+' '+word:word;
      if(line&&context.measureText(next).width>maximumWidth){lines.push(line);line=word}else line=next;
    }
    if(line)lines.push(line);
    if(lines.length*fontSize*1.06<=maximumHeight&&lines.every(value=>context.measureText(value).width<=maximumWidth))break;
  }
  context.fillStyle=ink;context.textAlign='center';context.textBaseline='middle';
  lines.forEach((line,index)=>context.fillText(line,384,163+(index-(lines.length-1)/2)*fontSize*1.06));
  const texture=new T.CanvasTexture(canvas);texture.name='ComicSpeech: '+text;
  texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;
  return texture;
}

export function createSpeechBubble(text:string,{style='speech',width=3.4,height=1.85,phase=0}:BubbleOptions={}){
  const material=new T.SpriteMaterial({map:bubbleTexture(text,style),transparent:true,depthTest:true,depthWrite:false,toneMapped:false});
  const sprite=new T.Sprite(material);sprite.name='SpeechBubble: '+text;sprite.userData.bubbleStyle=style;
  sprite.userData.text=text;
  sprite.center.set(.5,0);sprite.scale.set(width,width/2,1);sprite.position.y=height;sprite.visible=false;
  let progress=0,age=0,showing=false;
  function update(dt:number,show:boolean,reducedMotion:boolean){
    const step=Number.isFinite(dt)?T.MathUtils.clamp(dt,0,.1):0;
    if(show&&!showing)age=0;else age+=step;
    showing=show;
    progress=reducedMotion?(show?1:0):T.MathUtils.clamp(progress+step*(show?1/.24:-1/.16),0,1);
    sprite.visible=progress>0;
    const remaining=progress-1,pop=1+2.70158*remaining**3+1.70158*remaining**2;
    const scale=reducedMotion?1:show?.55+.45*pop:.75+.25*progress;
    sprite.scale.set(width*scale,width*.5*scale,1);
    sprite.position.y=height+(reducedMotion?0:Math.sin(age*2.4+phase)*.045*progress);
    material.rotation=reducedMotion?0:Math.sin(age*10)*.055*Math.max(0,1-age/.55);
    material.opacity=progress*progress*(3-2*progress);
  }
  return {sprite,update,setText:(value:string)=>{if(value===text)return;const previous=material.map;material.map=bubbleTexture(value,style);text=value;sprite.name='SpeechBubble: '+value;sprite.userData.text=value;previous?.dispose()},get text(){return text}};
}
