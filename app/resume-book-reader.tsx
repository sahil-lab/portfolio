'use client';

import {useEffect,useRef,useState} from 'react';
import Image from 'next/image';
import {AlignLeft,BookOpen,ChevronLeft,ChevronRight,Download,Scan,ZoomIn,ZoomOut,X} from 'lucide-react';
import {Dialog,DialogContent,DialogDescription,DialogTitle} from '@/components/ui/dialog';
import resume from '../public/assets/resume-book/pages.json';
import './resume-book.css';

export function ResumeBookReader({initialPage=1,close,turn}:{initialPage?:number;close:()=>void;turn:(page:number)=>void}){
 const [page,setPage]=useState(Math.max(1,Math.min(3,initialPage))),[zoom,setZoom]=useState(1),[text,setText]=useState(false),[imageFailed,setImageFailed]=useState(false);
 const scroll=useRef<HTMLDivElement>(null),spread=page===3?resume.pages.slice(2):resume.pages.slice(0,2);
 const go=(next:number)=>{const number=Math.max(1,Math.min(3,next));setPage(number);turn(number)};
 useEffect(()=>{scroll.current?.scrollTo({top:0,left:0})},[page,text]);
 return <Dialog open onOpenChange={open=>{if(!open)close()}}>
    <DialogContent className="resume-reader" showCloseButton={false} onKeyDown={event=>{event.stopPropagation();if(event.key==='ArrowRight'){event.preventDefault();go(page+1)}else if(event.key==='ArrowLeft'){event.preventDefault();go(page-1)}}}>
   <header className="resume-reader-header"><BookOpen size={22}/><div><DialogTitle>{resume.title}</DialogTitle><DialogDescription>Resume / 3 pages</DialogDescription></div><button type="button" aria-label="Close resume" title="Close resume" onClick={close}><X size={20}/></button></header>
   <div className="resume-reader-toolbar">
    <fieldset aria-label="Resume pages" className="resume-page-picker"><button type="button" aria-label="Previous resume page" title="Previous page" disabled={page===1} onClick={()=>go(page-1)}><ChevronLeft size={18}/></button>{resume.pages.map(value=><button key={value.number} type="button" aria-label={`Resume page ${value.number}`} aria-current={page===value.number?'page':undefined} onClick={()=>go(value.number)}>{value.number}</button>)}<button type="button" aria-label="Next resume page" title="Next page" disabled={page===3} onClick={()=>go(page+1)}><ChevronRight size={18}/></button></fieldset>
    <fieldset aria-label="Resume view" className="resume-view-picker"><button type="button" aria-label="Book view" title="Book view" aria-pressed={!text} onClick={()=>setText(false)}><BookOpen size={18}/></button><button type="button" aria-label="Text view" title="Text view" aria-pressed={text} onClick={()=>setText(true)}><AlignLeft size={18}/></button></fieldset>
    <div className="resume-zoom"><button type="button" aria-label="Zoom out resume" title="Zoom out" disabled={text||zoom<=1} onClick={()=>setZoom(value=>Math.max(1,value-.25))}><ZoomOut size={18}/></button><output aria-label="Resume zoom">{Math.round(zoom*100)}%</output><button type="button" aria-label="Zoom in resume" title="Zoom in" disabled={text||zoom>=2.5} onClick={()=>setZoom(value=>Math.min(2.5,value+.25))}><ZoomIn size={18}/></button><button type="button" aria-label="Fit resume pages" title="Fit pages" disabled={text} onClick={()=>setZoom(1)}><Scan size={18}/></button></div>
    <a href="/assets/resume-book/resume.pdf" download="Sahil_Upadhyay_Resume.pdf" aria-label="Download resume PDF" title="Download PDF"><Download size={18}/></a>
   </div>
   <div className="resume-reader-scroll" ref={scroll}>
    {text?<article className="resume-text" aria-label={`Resume page ${page} text`}><h2>Page {page} / 3</h2><p>{resume.pages[page-1].text}</p></article>:<div className="resume-spread" style={{width:`${zoom*100}%`}}>
     {spread.map(value=><figure key={value.number} className="resume-paper" data-active={page===value.number} aria-label={`Printed resume page ${value.number}`}><Image src={value.image} alt={`Sahil Upadhyay resume, page ${value.number} of 3`} width={value.width} height={value.height} unoptimized onError={()=>setImageFailed(true)}/></figure>)}
     {page===3&&<div className="resume-endpaper" aria-hidden="true"><BookOpen size={38}/><strong>Sahil Upadhyay</strong><span>Full-stack &amp; AI</span><small>3 / 3</small></div>}
    </div>}
   {imageFailed&&!text&&<p className="resume-image-error">Page image unavailable. <button type="button" onClick={()=>setText(true)}>Text view</button><a href="/assets/resume-book/resume.pdf" download="Sahil_Upadhyay_Resume.pdf">PDF</a></p>}
   </div>
  </DialogContent>
 </Dialog>;
}
