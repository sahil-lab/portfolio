const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),output=path.join(root,'outputs/reference-dog');
const types={'.html':'text/html; charset=utf-8','.mjs':'application/javascript','.js':'application/javascript','.glb':'model/gltf-binary','.png':'image/png','.json':'application/json','.mp4':'video/mp4'};
function startServer(port=4318){
 const server=http.createServer((request,response)=>{
  const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
  if(request.method==='POST'&&pathname==='/save-glb'){
   const chunks=[];let length=0;
   request.on('data',chunk=>{length+=chunk.length;if(length>160*1024*1024){response.writeHead(413);response.end();request.destroy();return}chunks.push(chunk)});
   request.on('end',()=>{
    const bytes=Buffer.concat(chunks);if(bytes.length<20||bytes.toString('ascii',0,4)!=='glTF'){response.writeHead(400);response.end('Invalid GLB');return}
    fs.mkdirSync(output,{recursive:true});const temporary=path.join(output,'reference-dog.glb.tmp');fs.writeFileSync(temporary,bytes);fs.renameSync(temporary,path.join(output,'reference-dog.glb'));response.writeHead(200);response.end('saved');
   });return;
  }
  if(request.method!=='GET'&&request.method!=='HEAD'){response.writeHead(405);response.end();return}
  let base=__dirname,relative=pathname==='/'?'preview.html':pathname.slice(1);
  if(pathname.startsWith('/vendor/three/')){base=path.join(root,'node_modules/three');relative=pathname.slice('/vendor/three/'.length)}
  else if(pathname==='/reference-dog.glb'){base=output;relative='reference-dog.glb'}
  const filename=path.resolve(base,relative);
  if(!filename.startsWith(path.resolve(base)+path.sep)||!fs.existsSync(filename)||!fs.statSync(filename).isFile()){response.writeHead(404);response.end('Not found');return}
  response.writeHead(200,{'Content-Type':types[path.extname(filename)]??'application/octet-stream','Cache-Control':'no-store'});
  if(request.method==='HEAD')response.end();else fs.createReadStream(filename).pipe(response);
 });
 return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve(server))});
}
module.exports={startServer};
if(require.main===module)startServer(Number(process.env.DOG_PORT??4318)).then(server=>console.log(`Dog model studio: http://127.0.0.1:${server.address().port}/`)).catch(error=>{console.error(error);process.exitCode=1});
