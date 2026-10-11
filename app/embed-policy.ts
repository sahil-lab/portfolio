export const portfolioEmbedMessage='living-computer-kingdom:embedded-preview';

export function notifyEmbeddedPortfolio(browser:Pick<Window,'self'|'top'|'parent'>){
  if(browser.self===browser.top)return false;
  try{browser.parent.postMessage({type:portfolioEmbedMessage},'*')}catch{}
  return true;
}

export const projectPreviewMessage='living-computer-kingdom:project-preview';
export const projectPreviewVersion=1;

export function projectPreviewUrl(destination:string,parentOrigin:string,token:string){
  const url=new URL(destination);
  url.searchParams.set('portfolio-preview','1');
  url.searchParams.set('preview-parent',parentOrigin);
  url.searchParams.set('preview-token',token);
  return url.href;
}

export function readProjectPreviewRequest(browser:Pick<Window,'self'|'top'|'location'>=window){
  if(browser.self===browser.top)return null;
  try{
    const params=new URL(browser.location.href).searchParams,parent=params.get('preview-parent'),token=params.get('preview-token');
    if(params.get('portfolio-preview')!=='1'||!parent||!token||!/^[a-z0-9-]{8,64}$/i.test(token))return null;
    const origin=new URL(parent);
    if(!['http:','https:'].includes(origin.protocol)||origin.origin!==parent)return null;
    return {parentOrigin:parent,token};
  }catch{return null}
}

export function registerProjectPreview(dispose:()=>void|Promise<void>,browser:Window=window){
  const request=readProjectPreviewRequest(browser);if(!request)return ()=>{};
  let closed=false;
  const send=(action:string)=>{try{browser.parent.postMessage({type:projectPreviewMessage,version:projectPreviewVersion,action,token:request.token},request.parentOrigin)}catch{}};
  const close=()=>{
    if(closed)return;closed=true;browser.removeEventListener('message',message);browser.removeEventListener('pagehide',close);
    void Promise.resolve().then(dispose).then(()=>send('closed'),()=>send('failed'));
  };
  const message=(event:MessageEvent)=>{
    if(event.source!==browser.parent||event.origin!==request.parentOrigin)return;
    const data=event.data;
    if(data?.type!==projectPreviewMessage||data.version!==projectPreviewVersion||data.token!==request.token||data.action!=='close')return;
    close();
  };
  browser.addEventListener('message',message);browser.addEventListener('pagehide',close);send('ready');
  return close;
}
