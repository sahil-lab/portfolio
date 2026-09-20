import * as T from 'three';
import {emptyMarket,emptyNews,quoteFreshness,type MarketBulletin,type NewsBulletin,type MarketQuote} from './bulletin-data';
import {createWoodenSign} from './wooden-sign';

export const bulletinSites={markets:{x:-24,z:156,width:30,height:16.875},news:{x:18,z:156,width:30,height:16.875}};
export const bulletinView={x:-24,y:.8,z:181};
export const bulletinCameraView=(aspect:number)=>({yaw:0,pitch:.2,zoom:Math.max(48,Math.min(160,50/aspect)),focusHeight:14});
const stamp=(value:string|null)=>value?new Date(value).toISOString().slice(5,16).replace('T',' ')+' UTC':'Not received';
const compact=new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1});
function price(quote:MarketQuote){return new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:Math.abs(quote.price)<1?4:2}).format(quote.price)}
export function fitBoardText(context:CanvasRenderingContext2D,text:string,x:number,y:number,width:number,size:number,color:string){
  let font=size;context.fillStyle=color;while(font>18){context.font=`700 ${font}px "Trebuchet MS", sans-serif`;if(context.measureText(text).width<=width)break;font-=2}context.fillText(text,x,y,width);
}
export function createBulletinWorld(scene:T.Scene,player:T.Group,notice:(text:string)=>void){
  const root=new T.Group();root.name='MarketNewsSquare';scene.add(root);
  let market={...emptyMarket},news={...emptyNews},stocks:MarketQuote[]=[],commodities:MarketQuote[]=[],page=0,newsIndex=0,commodityIndex=0,scroll=0,tickerWidth=2000,marketClock=0,newsClock=0,paintClock=0,dirty=true,lastMinute=-1;
  let previousReduced=false;
  const metal=new T.MeshStandardMaterial({color:'#263c42',metalness:.4,roughness:.56}),trim=new T.MeshStandardMaterial({color:'#a6b3ab',metalness:.28,roughness:.62});
  function box(name:string,x:number,y:number,z:number,width:number,height:number,depth:number,material:T.Material=metal){const mesh=new T.Mesh(new T.BoxGeometry(width,height,depth),material);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh}
  const boards=Object.entries(bulletinSites).map(([kind,site])=>{
    const frame=box(kind+'_BoardFrame',site.x,12,site.z,site.width+1.4,site.height+1.4,1);frame.userData.cameraSolid=true;
    for(const side of [-1,1]){box(kind+'_BoardPost',site.x+side*12.5,1.85,site.z,.8,3.7,1.1).userData.cameraSolid=true;box(kind+'_BoardFoot',site.x+side*12.5,.16,site.z,2.8,.32,3.4,trim)}
    const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1152;const context=canvas.getContext('2d')!;
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;
    const display=new T.Mesh(new T.PlaneGeometry(site.width,site.height),new T.MeshBasicMaterial({map:texture,toneMapped:false}));display.name=kind==='markets'?'Market_Display':'News_Display';display.position.set(site.x,12,site.z+.54);root.add(display);
    box(kind+'_StatusTrim',site.x,12+site.height/2+.5,site.z+.25,site.width,.13,.3,new T.MeshBasicMaterial({color:kind==='markets'?'#9ce1c6':'#e9bc83'}));
    return {kind,site,canvas,context,texture,display};
  });
  const pathMaterial=new T.MeshStandardMaterial({color:'#c4cebb',roughness:.96});
  box('Bulletin_Boulevard',0,.025,171,7,.12,75,pathMaterial);box('Bulletin_ReadingWalk',-3,.03,181,82,.13,4,pathMaterial);
  const sign=createWoodenSign('MARKETS & NEWS',{width:4,height:1.5,shape:'arrow'});sign.position.set(7,.12,141);root.add(sign);
  const accessible=()=>player.position.y<3&&player.position.y>=0;
  const near=(site:typeof bulletinSites.markets)=>accessible()&&Math.abs(player.position.x-site.x)<13&&player.position.z>site.z+1&&player.position.z<site.z+29;
  function base(context:CanvasRenderingContext2D,title:string,kicker:string,color:string){
    context.fillStyle='#0c252c';context.fillRect(0,0,2048,1152);context.fillStyle='#25444a';
    for(let x=0;x<2048;x+=32)for(let y=0;y<1152;y+=32)context.fillRect(x,y,2,2);
    context.textAlign='left';context.textBaseline='alphabetic';fitBoardText(context,title,70,106,1600,70,color);fitBoardText(context,kicker,74,168,1900,30,'#bbd3d9');
    context.fillStyle='#456069';context.fillRect(72,195,1904,2);
  }
  function footer(context:CanvasRenderingContext2D,status:string,fetchedAt:string|null,warning:string){
    const old=!!fetchedAt&&Date.now()-Date.parse(fetchedAt)>45*60*1000;
    context.fillStyle='#29464d';context.fillRect(72,1018,1904,2);
    fitBoardText(context,status==='stale'||old?'STALE / LAST REPORT':status==='unavailable'?'FEED UNAVAILABLE':'AUTO-REFRESH / SNAPSHOT',72,1070,700,28,'#ecc884');
    context.textAlign='right';fitBoardText(context,'Fetched '+stamp(fetchedAt),1976,1070,1000,27,'#c2d5d6');context.textAlign='left';
    fitBoardText(context,warning,72,1120,1904,23,'#bbced2');
  }
  function paintMarket(){
    const {context,texture}=boards[0],count=stocks.length,pages=Math.max(1,Math.ceil(count/6));page%=pages;
    base(context,'MARKET WATCH',`${count.toLocaleString('en-US')} / 10,000 TARGET LISTINGS  |  USD MARKET-CAP RANKING WITHIN AVAILABLE COVERAGE`,'#9ce1c6');
    const columns=[['LISTING',86],['LAST PRICE',1010],['CHANGE',1350],['CAP (USD)',1710]] as const;
    columns.forEach(([label,x])=>fitBoardText(context,label,x,240,300,27,'#8daab4'));
    if(!count){fitBoardText(context,'Awaiting verified stock quotes',90,415,1830,56,'#e1ecec');fitBoardText(context,market.warning,90,492,1830,30,'#beced0')}
    stocks.slice(page*6,page*6+6).forEach((quote,index)=>{
      const y=302+index*90;context.fillStyle=index%2?'#143038':'#112b33';context.fillRect(72,y-38,1904,86);
      fitBoardText(context,String(page*6+index+1).padStart(2,'0'),86,y,75,28,'#819eaa');fitBoardText(context,quote.symbol,186,y,290,42,'#f0f6f0');fitBoardText(context,quote.name,186,y+31,740,25,'#aec8ca');
      fitBoardText(context,price(quote)+' '+quote.currency,1010,y,290,39,'#f0f6f0');
      const change=quote.changePercent===null?'--':(quote.changePercent>0?'+':'')+quote.changePercent.toFixed(2)+'%';fitBoardText(context,change,1350,y,300,39,quote.changePercent===null?'#b9c9cd':quote.changePercent>=0?'#95e1b9':'#ff9d9d');
      fitBoardText(context,quote.marketCap===null?'--':compact.format(quote.marketCap),1710,y,230,36,'#e5dbc2');fitBoardText(context,quoteFreshness(quote)+' / '+stamp(quote.quotedAt),1010,y+31,920,22,'#a9bec8');
    });
    fitBoardText(context,`PAGE ${page+1} / ${pages}   |   US LISTINGS + INTERNATIONAL ADRs; LIMITED GLOBAL COVERAGE`,78,858,1900,27,'#b7d0d4');
    fitBoardText(context,'MAJOR COMMODITY FUTURES',78,905,880,30,'#edc184');
    if(!commodities.length)fitBoardText(context,'Commodity feed unavailable',78,958,1800,32,'#bac9cf');
    commodities.slice(commodityIndex,commodityIndex+2).forEach((quote,index)=>{const x=78+index*950;fitBoardText(context,quote.name.toUpperCase()+'  '+price(quote),x,953,890,34,'#f0eadb');fitBoardText(context,quote.unit+' / '+stamp(quote.quotedAt),x,990,890,23,'#b1c6cb')});
    footer(context,market.status,market.fetchedAt,'Yahoo Finance / Quotes may be delayed or last-close. Futures units vary. '+(market.status==='stale'?'Refresh failed.':'Informational only.'));texture.needsUpdate=true;
  }
  function paintNews(reduced:boolean){
    const {context,texture}=boards[1],count=news.headlines.length;newsIndex%=Math.max(1,count);
    base(context,'WORLD BUSINESS',news.sources.length?news.sources.join('  /  ').toUpperCase():'CONNECTING TO BUSINESS NEWS','#edc184');
    if(!count){fitBoardText(context,'Awaiting verified headlines',80,425,1870,64,'#edf2e6');fitBoardText(context,news.warning,80,496,1870,30,'#b9cdd0')}
    for(let row=0;row<Math.min(3,count);row++){
      const headline=news.headlines[(newsIndex+row)%count],top=256+row*214;
      fitBoardText(context,headline.source.toUpperCase()+'  /  '+stamp(headline.publishedAt),80,top,1890,26,'#93d9c2');
      context.font='700 51px "Trebuchet MS", sans-serif';const lines:string[]=[];let line='';
      for(const word of headline.title.split(' ')){const next=line?line+' '+word:word;if(line&&context.measureText(next).width>1870){lines.push(line);line=word}else line=next}if(line)lines.push(line);
      lines.slice(0,2).forEach((text,index)=>fitBoardText(context,text+(index===1&&lines.length>2?'...':''),80,top+70+index*61,1870,51,'#f0f3e6'));
    }
    context.fillStyle='#9cdcc0';context.fillRect(72,884,1904,100);context.save();context.beginPath();context.rect(84,890,1880,87);context.clip();
    const headline=news.headlines[newsIndex];if(headline){
      const text=headline.source.toUpperCase()+' / '+headline.title;context.font='700 48px "Trebuchet MS", sans-serif';context.fillStyle='#153a31';
      tickerWidth=context.measureText(text).width+120;
      if(reduced)fitBoardText(context,text,94,953,1850,43,'#153a31');else{const offset=scroll%tickerWidth;context.fillText(text,94-offset,953);context.fillText(text,94-offset+tickerWidth,953)}
    }context.restore();
    footer(context,news.status,news.fetchedAt,news.warning);texture.needsUpdate=true;
  }
  function paint(reduced=false){paintMarket();paintNews(reduced);dirty=false}
  paint();
  function update(dt:number,reduced:boolean,active:boolean){
    const step=Number.isFinite(dt)?Math.max(0,Math.min(dt,.1)):0;
    if(previousReduced!==reduced){previousReduced=reduced;dirty=true}
    const nearby=active&&accessible()&&player.position.z>110&&player.position.z<225;
    if(nearby&&!reduced){marketClock+=step;newsClock+=step;scroll+=step*75;if(marketClock>=12){marketClock%=12;page++;commodityIndex=commodities.length?(commodityIndex+2)%commodities.length:0;dirty=true}if(newsClock>=Math.max(24,tickerWidth/75)){newsClock=0;newsIndex++;scroll=0;dirty=true}}
    paintClock+=step;
    const minute=Math.floor(Date.now()/60000);
    if(dirty||nearby&&lastMinute!==minute){lastMinute=minute;paintClock=0;paint(reduced)}else if(nearby&&!reduced&&paintClock>=.125){paintClock=0;paintNews(reduced)}
  }
  return {root,boards,update,
    setMarket:(value:MarketBulletin)=>{market=value;stocks=value.quotes.filter(quote=>quote.kind==='stock');commodities=value.quotes.filter(quote=>quote.kind==='commodity');page=0;commodityIndex=0;dirty=true;paint(previousReduced)},
    setNews:(value:NewsBulletin)=>{news=value;newsIndex=0;scroll=0;dirty=true;paint(previousReduced)},
    get market(){return market},get news(){return news},get page(){return page},get headlineIndex(){return newsIndex},
    blocked:(x:number,z:number,y:number)=>Object.values(bulletinSites).some(site=>Math.abs(z-site.z)<1.1&&(y>3&&y<22&&Math.abs(x-site.x)<site.width/2+1||[-12.5,12.5].some(post=>Math.abs(x-site.x-post)<1.8))),
    prompt:()=>near(bulletinSites.markets)?'E \u00b7 Next market page':near(bulletinSites.news)?'E \u00b7 Next business headlines':null,
    interact:()=>{if(near(bulletinSites.markets)){page++;marketClock=0;commodityIndex=commodities.length?(commodityIndex+2)%commodities.length:0;paint(previousReduced);notice(market.coverage+' '+market.warning);return true}if(near(bulletinSites.news)){newsIndex=(newsIndex+1)%Math.max(1,news.headlines.length);scroll=0;newsClock=0;paint(previousReduced);const headline=news.headlines[newsIndex];notice(headline?headline.source+': '+headline.title+' / '+stamp(headline.publishedAt):news.warning);return true}return false},
  };
}
