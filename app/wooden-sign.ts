import * as T from 'three';

export type WoodenSignShape = 'arch' | 'arrow' | 'shield';
type SignOptions = {width?:number;height?:number;postHeight?:number;shape?:WoodenSignShape};

function outline(width:number,height:number,kind:WoodenSignShape){
  const shape=new T.Shape(),left=-width/2,right=width/2,bottom=-height/2,top=height/2;
  if(kind==='arch'){
    shape.moveTo(left,bottom+.1);shape.lineTo(left,top-height*.3);
    shape.bezierCurveTo(left,top+height*.1,right,top+height*.1,right,top-height*.3);
    shape.lineTo(right,bottom+.1);shape.lineTo(right-.1,bottom);shape.lineTo(left+.1,bottom);
  }else if(kind==='arrow'){
    shape.moveTo(left,bottom+.12);shape.lineTo(left,top-.12);shape.lineTo(left+.12,top);
    shape.lineTo(right-width*.23,top);shape.lineTo(right,0);shape.lineTo(right-width*.23,bottom);
    shape.lineTo(left+.12,bottom);
  }else{
    shape.moveTo(left,top-height*.12);shape.lineTo(left+width*.13,top);
    shape.lineTo(right-width*.13,top);shape.lineTo(right,top-height*.12);
    shape.lineTo(right,bottom+height*.22);shape.lineTo(0,bottom);shape.lineTo(left,bottom+height*.22);
  }
  shape.closePath();return shape;
}

function woodGrain(){
  const width=128,height=64,data=new Uint8Array(width*height*4);let seed=1947;
  for(let row=0;row<height;row++)for(let column=0;column<width;column++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const grain=Math.sin(row*.83+Math.sin(column*.047)*1.8);
    const fine=Math.sin(row*2.8+column*.13),value=204+grain*19+fine*5+(seed>>>24)/24;
    const offset=(row*width+column)*4;
    data[offset]=value;data[offset+1]=value*.91;data[offset+2]=value*.76;data[offset+3]=255;
  }
  const texture=new T.DataTexture(data,width,height,T.RGBAFormat);
  texture.name='CarvedWood_Grain';texture.colorSpace=T.SRGBColorSpace;
  texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=T.LinearFilter;
  texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
  return texture;
}

function lettering(text:string,width:number,height:number){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=Math.round(1024*height/width);
  const context=canvas.getContext('2d')!;
  const maximumWidth=canvas.width*.92,maximumHeight=canvas.height*.88;
  let lines:string[]=[],fontSize=Math.floor(Math.min(200,maximumHeight/1.12));
  for(;fontSize>=12;fontSize-=2){
    context.font=`900 ${fontSize}px "Trebuchet MS", sans-serif`;lines=[];let line='';
    for(const word of text.toUpperCase().trim().split(/\s+/)){
      const next=line?line+' '+word:word;
      if(line&&context.measureText(next).width>maximumWidth){lines.push(line);line=word}else line=next;
    }
    if(line)lines.push(line);
    if(lines.length*fontSize*1.12<=maximumHeight&&lines.every(value=>context.measureText(value).width<=maximumWidth))break;
  }
  context.textAlign='center';context.textBaseline='middle';
  lines.forEach((line,index)=>{
    const baseline=canvas.height/2+(index-(lines.length-1)/2)*fontSize*1.12;
    context.fillStyle='#fff0cf';context.fillText(line,canvas.width/2+1,baseline+2);
    context.fillStyle='#20150e';context.fillText(line,canvas.width/2,baseline);
  });
  const texture=new T.CanvasTexture(canvas);texture.name='EngravedWood_Lettering';
  texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;
  return texture;
}

export function createWoodenSign(text:string,{width=2.6,height=1.75,postHeight=.75,shape='arch'}:SignOptions={}){
  const root=new T.Group();root.name='WoodenSign: '+text;
  root.userData.woodenSign=true;root.userData.signShape=shape;
  const grain=woodGrain();
  const timber=new T.MeshStandardMaterial({color:'#a97845',map:grain,bumpMap:grain,bumpScale:.018,roughness:.88,metalness:0});
  const edge=new T.MeshStandardMaterial({color:'#48301e',map:grain,roughness:.9,metalness:0});
  const face=new T.MeshStandardMaterial({color:'#f2d49b',bumpMap:grain,bumpScale:.002,emissive:'#f2d49b',emissiveIntensity:.18,roughness:.92,metalness:0});
  const centerY=postHeight+height/2,depth=.18,bevel=.035,faceDepth=depth/2+bevel;
  function mesh(name:string,geometry:T.BufferGeometry,material:T.Material,x:number,y:number,z:number){
    const object=new T.Mesh(geometry,material);object.name=name;object.position.set(x,y,z);
    object.castShadow=true;object.receiveShadow=true;root.add(object);return object;
  }
  for(const position of width>3?[-width*.32,width*.32]:[0]){
    mesh('TimberFoot',new T.BoxGeometry(.68,.14,.78),edge,position,.07,0);
    mesh('TimberPost',new T.BoxGeometry(.19,centerY,.2),timber,position,centerY/2,-.02);
    mesh('PostCollar',new T.BoxGeometry(.29,.15,.3),edge,position,postHeight*.6,0);
  }
  const boardGeometry=new T.ExtrudeGeometry(outline(width,height,shape),{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:16});
  boardGeometry.translate(0,0,-depth/2);
  mesh('CarvedBoard',boardGeometry,timber,0,centerY,0);
  const panelGeometry=new T.ShapeGeometry(outline(width*.9,height*.86,shape),16);
  const border=outline(width*.96,height*.94,shape);
  border.holes.push(new T.Path(outline(width*.86,height*.79,shape).getPoints(16)));
  const borderGeometry=new T.ExtrudeGeometry(border,{depth:.035,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.012,bevelThickness:.012,curveSegments:16});
  const textWidth=width*(shape==='arrow'?.62:.76),textHeight=height*.66;
  const textGeometry=new T.PlaneGeometry(textWidth,textHeight);
  const textMaterial=new T.MeshBasicMaterial({map:lettering(text,textWidth,textHeight),transparent:true,depthWrite:false,toneMapped:false});
  for(const side of [1,-1]){
    const panel=mesh('RecessedFace',panelGeometry,face,0,centerY,side*(faceDepth+.008));panel.rotation.y=side<0?Math.PI:0;
    const rim=mesh('CarvedBorder',borderGeometry,edge,0,centerY,side*(faceDepth+.012));rim.rotation.y=panel.rotation.y;
    panel.scale.x=rim.scale.x=side;
    const letters=mesh('EngravedLettering',textGeometry,textMaterial,shape==='arrow'?-width*.065:0,centerY+(shape==='shield'?height*.04:-height*.03),side*(faceDepth+.014));
    letters.rotation.y=panel.rotation.y;letters.castShadow=false;
  }
  return root;
}
