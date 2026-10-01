import * as T from 'three';

export function createWindowInteriorAtlas(){
 const size=32,width=size*4,occlusion=new Uint8Array(width*size*4),emission=new Uint8Array(width*size*4);
 for(let room=0;room<4;room++)for(let row=0;row<size;row++)for(let column=0;column<size;column++){
  const edge=Math.min(column,size-1-column,row,size-1-row),frame=edge<2,ceiling=row>25,curtain=room%2===1&&column<7;
  const desk=row>=6&&row<=8&&column>7&&column<26,shelf=room===2&&column>22&&row<23&&row>10;
  const shade=frame?.22:curtain?.54:desk||shelf?.28:ceiling?.52:.72+row/size*.2;
  const occupied=[0,.16,.82,.55][room],illumination=frame||desk||shelf?0:occupied*(curtain?.28:ceiling?.5:1),offset=(row*width+room*size+column)*4;
  occlusion.set([Math.round(shade*255),255,255,255],offset);emission.set([Math.round(244*illumination),Math.round((room===3?229:208)*illumination),Math.round((room===3?209:163)*illumination),255],offset);
 }
 function texture(data:Uint8Array,name:string){const result=new T.DataTexture(data,width,size,T.RGBAFormat);result.name=name;result.wrapS=result.wrapT=T.RepeatWrapping;result.magFilter=T.LinearFilter;result.minFilter=T.LinearMipmapLinearFilter;result.generateMipmaps=true;result.needsUpdate=true;return result}
 return {occlusion:texture(occlusion,'Window_RecessAtlas'),emission:texture(emission,'Window_OccupiedRooms')};
}

export function windowRoom(seed:string,floor:number,face:number,bay:number){
 let hash=2166136261;for(const character of seed)hash=Math.imul(hash^character.charCodeAt(0),16777619);
 return ((hash>>>0)+floor*7+face*5+bay*3)%4;
}

export function mapWindowRoom(geometry:T.BufferGeometry,width:number,height:number,room:number){
 const positions=geometry.attributes.position,uv=geometry.attributes.uv;
 geometry.userData.windowRoom=room;
 for(let vertex=0;vertex<positions.count;vertex++)uv.setXY(vertex,(room+(positions.getX(vertex)/width+.5)*.9375+.03125)/4,(positions.getY(vertex)/height+.5)*.9375+.03125);
 return geometry;
}
