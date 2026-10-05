const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),output=path.join(root,'outputs/anime-figure');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.glb':'model/gltf-binary'};
function startServer(port=4321){
 const server=http.createServer((request,response)=>{
  if(!['GET','HEAD'].includes(request.method)){response.writeHead(405);response.end();return}
  let pathname;
  try{pathname=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname)}catch{response.writeHead(400);response.end();return}
  let base,relative;
  if(pathname.startsWith('/vendor/three/')){base=path.join(root,'node_modules/three');relative=pathname.slice('/vendor/three/'.length)}
  else if(pathname==='/model/anime-figure.glb'){base=output;relative='anime-figure.glb'}
  else if(['/','/viewer.html','/viewer.css','/viewer.mjs'].includes(pathname)){base=__dirname;relative=pathname==='/'?'viewer.html':pathname.slice(1)}
  else{response.writeHead(404);response.end('Not found');return}
  const filename=path.resolve(base,relative);
  if(!filename.startsWith(path.resolve(base)+path.sep)||!fs.existsSync(filename)||!fs.statSync(filename).isFile()){response.writeHead(404);response.end('Not found');return}
  const length=fs.statSync(filename).size;response.writeHead(200,{'Content-Type':types[path.extname(filename)]??'application/octet-stream','Content-Length':length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  if(request.method==='HEAD')response.end();else fs.createReadStream(filename).pipe(response);
 });
 return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve(server))});
}
module.exports={startServer};
if(require.main===module)startServer(Number(process.env.ANIME_PORT??4321)).then(server=>console.log(`Anime figure studio: http://127.0.0.1:${server.address().port}/`)).catch(error=>{console.error(error);process.exitCode=1});
