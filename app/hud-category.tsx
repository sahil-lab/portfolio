'use client';

import type {ReactNode} from 'react';
import {ChevronDown, X, type LucideIcon} from 'lucide-react';
import {Popover, PopoverContent, PopoverTitle, PopoverTrigger} from '@/components/ui/popover';

export function HudCategory({label,icon:Icon,open,change,children}:{label:string;icon:LucideIcon;open:boolean;change:(open:boolean)=>void;children:ReactNode}){
 return <Popover open={open} onOpenChange={change}>
  <PopoverTrigger className="hud-category-trigger" aria-label={`${label} controls`} title={`${label} controls`} onKeyDown={event=>{if([' ','Enter','Escape','ArrowDown','ArrowUp'].includes(event.key))event.stopPropagation()}}>
   <Icon size={17}/><span>{label}</span><ChevronDown className="hud-category-chevron" size={12}/>
  </PopoverTrigger>
    {open&&<PopoverContent className="hud-category-panel" aria-label={`${label} controls panel`} align="end" sideOffset={10} onKeyDown={event=>event.stopPropagation()}>
   <div className="hud-category-heading"><PopoverTitle><Icon size={17}/>{label}</PopoverTitle><button type="button" className="hud-icon-button" aria-label={`Close ${label} controls`} title="Close" onClick={()=>change(false)}><X size={17}/></button></div>
   <div className="hud-category-body">{children}</div>
    </PopoverContent>}
 </Popover>;
}
