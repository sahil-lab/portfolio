const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),output=path.join(root,'outputs/dog-digital-double');
const types={'.html':'text/html; charset=utf-8','.mjs':'application/javascript','.js':'application/javascript','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.mp4':'video/mp4'};
function startServer(port=4319){
 const server=http.createServer((request,response)=>{
  if(request.method!=='GET'&&request.method!=='HEAD'){response.writeHead(405);response.end();return}
  let pathname;
  try{pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname)}catch{response.writeHead(400);response.end();return}
  let base=__dirname,relative=pathname==='/'?'viewer.html':pathname.slice(1);
  if(pathname.startsWith('/vendor/three/')){base=path.join(root,'node_modules/three');relative=pathname.slice('/vendor/three/'.length)}
  else if(pathname.startsWith('/model/')){base=output;relative=pathname.slice('/model/'.length)}
  const filename=path.resolve(base,relative);
  if(!filename.startsWith(path.resolve(base)+path.sep)||!fs.existsSync(filename)||!fs.statSync(filename).isFile()){response.writeHead(404);response.end('Not found');return}
  response.writeHead(200,{'Content-Type':types[path.extname(filename)]??'application/octet-stream','Cache-Control':'no-store'});
  if(request.method==='HEAD')response.end();else fs.createReadStream(filename).pipe(response);
 });
 return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve(server))});
}
module.exports={startServer};
if(require.main===module)startServer(Number(process.env.DOG_PORT??4319)).then(server=>console.log(`Dog digital-double viewer: http://127.0.0.1:${server.address().port}/`)).catch(error=>{console.error(error);process.exitCode=1});
