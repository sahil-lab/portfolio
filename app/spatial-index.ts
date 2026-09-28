export type SpatialBounds={minX:number;maxX:number;minZ:number;maxZ:number};
export function createSpatialIndex<Value>(values:readonly Value[],bounds:(value:Value)=>SpatialBounds,cellSize=16){
 if(!Number.isFinite(cellSize)||cellSize<=0)throw Error('Spatial cells need a positive size');
 const cells=new Map<string,Value[]>(),broad:Value[]=[],empty:readonly Value[]=[];
 for(const value of values){
  const box=bounds(value),minX=Math.floor(box.minX/cellSize),maxX=Math.floor(box.maxX/cellSize),minZ=Math.floor(box.minZ/cellSize),maxZ=Math.floor(box.maxZ/cellSize);
  if(![minX,maxX,minZ,maxZ].every(Number.isFinite))continue;
  if((maxX-minX+1)*(maxZ-minZ+1)>256){broad.push(value);continue}
  for(let column=minX;column<=maxX;column++)for(let row=minZ;row<=maxZ;row++){const key=column+','+row,list=cells.get(key);if(list)list.push(value);else cells.set(key,[value])}
 }
 return {at:(x:number,z:number):readonly Value[]=>cells.get(Math.floor(x/cellSize)+','+Math.floor(z/cellSize))??empty,broad,get cellCount(){return cells.size},
  query(box:SpatialBounds,result:Set<Value>){result.clear();for(const value of broad)result.add(value);for(let column=Math.floor(box.minX/cellSize);column<=Math.floor(box.maxX/cellSize);column++)for(let row=Math.floor(box.minZ/cellSize);row<=Math.floor(box.maxZ/cellSize);row++)for(const value of cells.get(column+','+row)??empty)result.add(value);return result},
 };
}
