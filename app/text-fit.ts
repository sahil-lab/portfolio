/**
 * Canvas text fitting that keeps shaping work small. Measuring progressively longer
 * strings at dozens of candidate font sizes creates a distinct shaped entry per string
 * and per size in the browser's text caches. Instead, each distinct word is measured
 * once at the largest size; candidate layouts are then arithmetic, because advance
 * widths scale linearly with font size, and only the final lines are verified.
 */
export type TextFit={fontSize:number;lines:string[]};
export type FitOptions={font:(size:number)=>string;maxWidth:number;maxHeight:number;lineHeight:number;maxSize:number;minSize:number;step?:number};
export type SingleLineOptions={font:(size:number)=>string;maxWidth:number;maxSize:number;minSize:number;step?:number;strict?:boolean};

function wrap(words:string[],width:(word:string)=>number,space:number,maxWidth:number){
 const lines:string[]=[];let line='',lineWidth=0;
 for(const word of words){
  const wordWidth=width(word);
  if(line&&lineWidth+space+wordWidth>maxWidth){lines.push(line);line=word;lineWidth=wordWidth}
  else{lineWidth=line?lineWidth+space+wordWidth:wordWidth;line=line?line+' '+word:word}
 }
 if(line)lines.push(line);
 return lines;
}

function measureWords(context:CanvasRenderingContext2D,words:string[]){
 const widths=new Map<string,number>();
 for(const word of words)if(!widths.has(word))widths.set(word,context.measureText(word).width);
 return {widths,space:words.length>1?context.measureText(' ').width:0};
}

/** Largest size, stepping down from `maxSize`, whose wrapped lines fit both bounds. Leaves `context.font` at the chosen size. */
export function fitWrappedText(context:CanvasRenderingContext2D,text:string,{font,maxWidth,maxHeight,lineHeight,maxSize,minSize,step=2}:FitOptions):TextFit{
 const words=text.trim().split(/\s+/).filter(Boolean);
 context.font=font(maxSize);
 const {widths,space}=measureWords(context,words);
 let last:TextFit={fontSize:maxSize,lines:wrap(words,word=>widths.get(word)!,space,maxWidth)};
 for(let size=maxSize;size>=minSize;size-=step){
  const scale=size/maxSize;
  last={fontSize:size,lines:wrap(words,word=>widths.get(word)!*scale,space*scale,maxWidth)};
  if(last.lines.length*size*lineHeight>maxHeight)continue;
  context.font=font(size);
  if(last.lines.every(line=>context.measureText(line).width<=maxWidth))return last;
 }
 context.font=font(last.fontSize);
 return last;
}

/** Largest size, stepping down from `maxSize` to `minSize`, at which a single line fits. Leaves `context.font` at the chosen size. */
export function fitSingleLine(context:CanvasRenderingContext2D,text:string,{font,maxWidth,maxSize,minSize,step=2,strict=false}:SingleLineOptions){
 context.font=font(maxSize);
 const fits=(width:number)=>strict?width<maxWidth:width<=maxWidth;
 const measured=context.measureText(text).width;
 if(fits(measured))return maxSize;
 // Jump straight to the first candidate the linear estimate allows, then confirm with real measurements.
 let size=maxSize;
 const estimate=maxSize*maxWidth/Math.max(measured,1e-6);
 while(size-step>=minSize&&size>estimate)size-=step;
 for(;;size-=step){
  context.font=font(size);
  if(fits(context.measureText(text).width)||size-step<minSize)return size;
 }
}

/** Greedy word wrap at the current `context.font`, measuring each distinct word once. */
export function wrapText(context:CanvasRenderingContext2D,text:string,maxWidth:number){
 const words=text.split(' ');
 const {widths,space}=measureWords(context,words);
 return wrap(words,word=>widths.get(word)!,space,maxWidth);
}
