import {createServer,request as httpRequest} from 'node:http';
import {request as httpsRequest} from 'node:https';
import {lookup} from 'node:dns/promises';
import {BlockList,isIP} from 'node:net';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {server as wisp,logging} from '@mercuryworkshop/wisp-js/server';

const blocked4=new BlockList(),blocked6=new BlockList();
for(const [address,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]])blocked4.addSubnet(address,prefix,'ipv4');
for(const [address,prefix] of [['::',128],['::1',128],['::ffff:0:0',96],['fc00::',7],['fe80::',10],['ff00::',8],['2001:db8::',32],['2001::',32],['2002::',16],['64:ff9b:1::',48]])blocked6.addSubnet(address,prefix,'ipv6');
export function publicGuestAddress(address){const family=isIP(address);return family===4?!blocked4.check(address,'ipv4'):family===6?!blocked6.check(address,'ipv6'):false}
export async function resolveGuestHost(hostname,resolver=lookup){
 const addresses=await resolver(hostname,{all:true,verbatim:true});
 if(!addresses.length||addresses.some(entry=>!publicGuestAddress(entry.address)))throw new Error('The guest network cannot access private or reserved addresses.');
 return (addresses.find(entry=>entry.family===4)??addresses[0]).address;
}
export async function fetchGuestPage(input,redirects=0){
 if(typeof input!=='string'||input.length>4096||redirects>4)throw new Error('Invalid guest web address.');
 const url=new URL(input),hostname=url.hostname.replace(/^\[|\]$/g,'');
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port&&!['80','443'].includes(url.port)||isIP(hostname)&&!publicGuestAddress(hostname))throw new Error('This guest destination is blocked.');
 const request=url.protocol==='https:'?httpsRequest:httpRequest;
 return new Promise((accept,reject)=>{
  const outgoing=request(url,{method:'GET',agent:false,autoSelectFamily:false,headers:{'User-Agent':'OrbitClub-LinuxGuest/1.0',Accept:'*/*'},lookup:(host,options,callback)=>{
   void resolveGuestHost(host).then(address=>{const family=isIP(address);if(options.all)callback(null,[{address,family}]);else callback(null,address,family)},error=>callback(error));
  }},response=>{
   if(response.statusCode>=300&&response.statusCode<400&&response.headers.location){
    response.destroy();void fetchGuestPage(new URL(response.headers.location,url).href,redirects+1).then(accept,reject);return;
   }
   let length=0;const chunks=[];
   response.on('data',chunk=>{length+=chunk.length;if(length>2*1024*1024){response.destroy();reject(new Error('Guest response exceeds 2 MB.'));return}chunks.push(chunk)});
   response.on('error',reject);response.on('end',()=>accept({status:response.statusCode??502,type:response.headers['content-type']??'application/octet-stream',body:Buffer.concat(chunks)}));
  });
  outgoing.setTimeout(10000,()=>outgoing.destroy(new Error('Guest web request timed out.')));outgoing.on('error',reject);outgoing.end();
 });
}
export function createGuestRelay({origins=['http://localhost:3000','http://localhost:3001','http://localhost:3002','http://127.0.0.1:3000','http://127.0.0.1:3001','http://127.0.0.1:3002']}={}){
 Object.assign(wisp.options,{port_whitelist:[80,443],allow_udp_streams:false,allow_tcp_streams:true,allow_direct_ip:false,allow_private_ips:false,allow_loopback_ips:false,parse_real_ip:false,stream_limit_total:24,stream_limit_per_host:-1,dns_method:resolveGuestHost,dns_ttl:120,wisp_version:1,hostname_blacklist:[/^localhost$/i,/\.(localhost|local|internal|home)$/i]});
 logging.set_level(logging.ERROR);
 const connections=new Set();let windowStarted=Date.now(),upgrades=0,activeFetches=0;
 const server=createServer((request,response)=>{
  response.setHeader('Content-Type','application/json');response.setHeader('X-Content-Type-Options','nosniff');response.setHeader('Cache-Control','no-store');
  if(request.url==='/health'){response.end(JSON.stringify({ok:true,loopbackOnly:true,ports:[80,443]}));return}
  const url=new URL(request.url,'http://127.0.0.1');
  if(url.pathname!=='/fetch'||!origins.includes(request.headers.origin)){response.statusCode=403;response.end(JSON.stringify({error:'Not allowed'}));return}
  response.setHeader('Access-Control-Allow-Origin',request.headers.origin);response.setHeader('Vary','Origin');
  if(request.method==='OPTIONS'){response.setHeader('Access-Control-Allow-Methods','GET,HEAD,OPTIONS');response.setHeader('Access-Control-Allow-Headers','accept,content-type,range');response.statusCode=204;response.end();return}
  if(!['GET','HEAD'].includes(request.method)||activeFetches>=12){response.statusCode=429;response.end(JSON.stringify({error:'Guest request limit'}));return}
  activeFetches++;
  void fetchGuestPage(url.searchParams.get('url')).then(result=>{response.statusCode=result.status;response.setHeader('Content-Type',result.type);response.end(request.method==='HEAD'?undefined:result.body)},()=>{response.statusCode=502;response.end(JSON.stringify({error:'Guest web request blocked or unavailable'}))}).finally(()=>{activeFetches--});
 });
 server.on('upgrade',(request,socket,head)=>{
  if(Date.now()-windowStarted>60000){windowStarted=Date.now();upgrades=0}
  if(request.url!=='/'||!origins.includes(request.headers.origin)||++upgrades>30||connections.size>=6){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return}
  connections.add(socket);socket.once('close',()=>connections.delete(socket));socket.setTimeout(300000,()=>socket.destroy());
  wisp.routeRequest(request,socket,head);
 });
 return {
  listen:(port=8788)=>new Promise((accept,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{server.off('error',reject);accept(server.address())})}),
  close:async()=>{for(const socket of connections)socket.destroy();await new Promise(done=>server.close(done))},
 };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const relay=createGuestRelay();const address=await relay.listen(Number(process.env.FRIENDS_RELAY_PORT??8788));
 console.log(`Private Linux guest relay listening on ${address.address}:${address.port}`);
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{void relay.close().then(()=>process.exit(0))});
}
