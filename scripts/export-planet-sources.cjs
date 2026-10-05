const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{transitStops}=require('../app/transit-config'),{createPlanetSurface,planetPoint,planetGeography}=require('../app/planet-geography'),{createPlanetColorizer}=require('../app/planet-biomes');
global.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(buffer=>{this.result=buffer;this.onloadend?.()}).catch(error=>this.onerror?.(error))}};

async function main(){
 const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js'),folder=path.resolve(process.env.TERRAIN_OUTPUT??'assets/planets/source');fs.mkdirSync(folder,{recursive:true});const manifest=[];
 for(const stop of transitStops.slice(1)){
  const surface=createPlanetSurface(stop,stop.radius),colorize=createPlanetColorizer(stop),root=new T.Group();root.name='Planet_'+stop.id;
  for(const detail of ['Full','Distant']){
   const width=detail==='Distant'?40:stop.worldKind?128:160,height=detail==='Distant'?28:stop.worldKind?88:112,geometry=new T.SphereGeometry(1,width,height),positions=geometry.attributes.position,colors=new Float32Array(positions.count*3),normal=new T.Vector3(),color=new T.Color();
   for(let index=0;index<positions.count;index++){
    normal.fromBufferAttribute(positions,index).normalize();const point=planetPoint(surface,normal).sub(surface.center).addScaledVector(normal,-.08);positions.setXYZ(index,point.x,point.y,point.z);colorize(normal,planetGeography(surface,normal),color).toArray(colors,index*3);
   }
   geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.computeVertexNormals();geometry.computeBoundingBox();
    const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));mesh.name='Terrain_'+detail;mesh.userData={planet:stop.id,terrainDetail:detail,radius:surface.radius,terrainRevision:surface.terrainRevision,authority:'planetPoint',surfaceOffset:-.08};root.add(mesh);
   assert.ok(positions.array.every(Number.isFinite));manifest.push({planet:stop.id,detail,vertices:positions.count,triangles:geometry.index.count/3,bounds:[geometry.boundingBox.min.toArray(),geometry.boundingBox.max.toArray()]});
  }
  const bytes=await new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:false,trs:true});fs.writeFileSync(path.join(folder,stop.id+'.glb'),Buffer.from(bytes));console.log(stop.id+': '+bytes.byteLength+' bytes');root.traverse(object=>{if(object.isMesh){object.geometry.dispose();object.material.dispose()}});
 }
 fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');assert.equal(manifest.length,18);console.log('PLANET_SOURCES_EXPORTED');
}
main().catch(error=>{console.error(error);process.exitCode=1});
