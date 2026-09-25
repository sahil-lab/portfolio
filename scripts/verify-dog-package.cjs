const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const output=path.resolve('outputs/dog-digital-double');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function inspectFile(relative){
 const filename=path.join(output,relative),bytes=fs.readFileSync(filename);assert.ok(bytes.length>32,relative+' is empty');
 if(relative.endsWith('.blend')){
  const source=bytes.readUInt32LE(0)===0xfd2fb528?zlib.zstdDecompressSync(bytes,{maxOutputLength:1024*1024*1024}):bytes;
  assert.equal(source.toString('ascii',0,7),'BLENDER',relative+' is not a Blender file');
 }
 if(relative.endsWith('.png'))assert.ok(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),relative+' is not a PNG');
 return {file:relative,bytes:bytes.length,sha256:digest(bytes)};
}
const files=['dog_master.blend','dog_body_low.obj','dog_00_reference.blend','dog_01_blockout.blend','dog_02_sculpt.blend','dog_03_retopo.blend','dog_04_texture.blend','dog_05_groom.blend','dog_06_final.blend',...['dog_basecolor','dog_roughness','dog_normal','fur_density','fur_length','fur_strand_atlas'].map(name=>'textures/'+name+'.png')];
for(const lod of [0,1,2]){
 const filename=lod===0?'dog_web.glb':`dog_web_lod${lod}.glb`,report=JSON.parse(fs.readFileSync(path.join(output,`glb-validation-lod${lod}.json`)));
 assert.equal(report.sha256,digest(fs.readFileSync(path.join(output,filename))),filename+' validation is stale');
 assert.equal(report.validation.issues.numErrors,0);assert.equal(report.validation.issues.numWarnings,0);files.push(filename);
}
const coreOnly=process.argv.includes('--core');
if(!coreOnly){
 const views=['front','left','right','rear','top','three_quarter','close_face'];
 for(const view of views)files.push('renders/'+view+'.png');
 for(let index=1;index<=8;index++)files.push(`reference-final/REF_${String(index).padStart(2,'0')}.png`);
 files.push('renders/contact-sheet.jpg','reference-final/comparison-sheet.jpg','turntable/dog_turntable.mp4','turntable/dog_turntable.gif');
 const browser=JSON.parse(fs.readFileSync(path.join(output,'web-browser-validation.json')));assert.deepEqual(browser.errors,[]);assert.ok(browser.turntable);
 const media=JSON.parse(fs.readFileSync(path.join(output,'media-validation.json')));assert.ok(media.decoded_without_errors);assert.equal(media.frames,144);
 const renderManifest=JSON.parse(fs.readFileSync(path.join(output,'renders-manifest.json'))),referenceManifest=JSON.parse(fs.readFileSync(path.join(output,'reference-final-manifest.json')));
 assert.equal(renderManifest.length,7);assert.equal(referenceManifest.length,8);
}
const report={status:'Owner likeness review required; not certified as a photo-exact digital double',workflow:'Live Blender 5.2.2 through local MCP, with user-approved native operator, quad-remesh and guide-edit adaptations',technicalChecks:coreOnly?'core files and three current validated GLBs':'core files, three validated GLBs, browser, media and required render sets',files:files.map(inspectFile)};
if(!coreOnly)fs.writeFileSync(path.join(output,'delivery-manifest.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({files:report.files.length,checked:report.technicalChecks,likenessStatus:report.status},null,2));
