const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {fitWrappedText,fitSingleLine,wrapText}=require('../app/text-fit.ts');

/** Linear fake: width = characters × size × .6, like a monospace face; records every distinct shaped string per font. */
function fakeContext(){
  const shaped=new Set(),context={font:'',calls:0,measureText(text){context.calls++;shaped.add(context.font+'|'+text);return {width:text.length*parseFloat(context.font.split(' ')[1])*.6}}};
  return {context,shaped};
}
const font=size=>`900 ${size}px "Trebuchet MS", sans-serif`;
/** The previous implementation, kept here as the reference for layout equivalence. */
function legacyFit(context,text,maxWidth,maxHeight,lineHeight,maxSize,minSize){
  let lines=[],fontSize=maxSize;
  for(;fontSize>=minSize;fontSize-=2){
    context.font=font(fontSize);lines=[];let line='';
    for(const word of text.trim().split(/\s+/)){const next=line?line+' '+word:word;if(line&&context.measureText(next).width>maxWidth){lines.push(line);line=word}else line=next}
    if(line)lines.push(line);
    if(lines.length*fontSize*lineHeight<=maxHeight&&lines.every(value=>context.measureText(value).width<=maxWidth))break;
  }
  return {fontSize:Math.max(fontSize,minSize),lines};
}

test('wrapped fitting reproduces the previous layouts while shaping far fewer distinct strings',()=>{
  const texts=['HI!','SYSTEM INFORMATION','PUBLIC LIBRARY','E · RAM LIBRARY','MARKETS & NEWS','THE COPPER BAKERY AND TEA ROOM OF THE LANTERN QUARTER','A SINGLEEXTRAORDINARILYLONGWORD HERE','  spaced   out   words  '];
  let referenceShaped=0,candidateShaped=0,referenceCalls=0,candidateCalls=0;
  for(const text of texts)for(const [maxWidth,maxHeight] of [[471,270],[942,540],[554,170],[478,170],[300,120]]){
    const reference=fakeContext(),candidate=fakeContext();
    const expected=legacyFit(reference.context,text.toUpperCase(),maxWidth,maxHeight,1.12,Math.floor(Math.min(200,maxHeight/1.12)),12);
    const actual=fitWrappedText(candidate.context,text.toUpperCase(),{font,maxWidth,maxHeight,lineHeight:1.12,maxSize:Math.floor(Math.min(200,maxHeight/1.12)),minSize:12});
    assert.deepEqual(actual,expected,text+' '+maxWidth+'x'+maxHeight);
    assert.equal(candidate.context.font,font(actual.fontSize));
    referenceShaped+=reference.shaped.size;candidateShaped+=candidate.shaped.size;referenceCalls+=reference.context.calls;candidateCalls+=candidate.context.calls;
  }
  assert.ok(candidateShaped<referenceShaped/4,`distinct strings ${candidateShaped} vs ${referenceShaped}`);
  assert.ok(candidateCalls<referenceCalls/4,`measure calls ${candidateCalls} vs ${referenceCalls}`);
});

test('single-line fitting picks the same size as the shrink loop, including the strict and floor cases',()=>{
  for(const text of ['LANTERN QUARTER','A','THE VERY LONG NAME OF A DISTRICT WITH MANY WORDS IN IT INDEED'])for(const [maxWidth,strict] of [[940,true],[1870,false],[100,false]]){
    const reference=fakeContext();let size=118;do{reference.context.font=font(size);if(strict?reference.context.measureText(text).width<maxWidth:reference.context.measureText(text).width<=maxWidth)break;size-=2}while(size>24);
    const candidate=fakeContext(),chosen=fitSingleLine(candidate.context,text,{font,maxWidth,maxSize:118,minSize:26,strict});
    assert.equal(candidate.context.font,reference.context.font,text+' '+maxWidth);assert.equal(font(chosen),candidate.context.font);
    assert.ok(candidate.context.calls<=4,'single-line fitting should need only a few measurements, got '+candidate.context.calls);
  }
});

test('fixed-size wrapping matches the greedy loop and measures words rather than growing lines',()=>{
  const sentence='The quick brown fox jumps over the lazy dog while the lantern quarter sleeps under a copper sky';
  for(const maxWidth of [200,690,1870]){
    const reference=fakeContext();reference.context.font='700 46px x';const expected=[];let line='';
    for(const word of sentence.split(' ')){const next=line?line+' '+word:word;if(reference.context.measureText(next).width>maxWidth&&line){expected.push(line);line=word}else line=next}if(line)expected.push(line);
    const candidate=fakeContext();candidate.context.font='700 46px x';
    assert.deepEqual(wrapText(candidate.context,sentence,maxWidth),expected);
    assert.ok(Math.max(...[...candidate.shaped].map(entry=>entry.length))<40,'wrapping shaped a long cumulative string');
  }
});
