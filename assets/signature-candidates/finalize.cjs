const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {parseGlb,hash}=require('../../scripts/complete-export-format.cjs');
const atelier=process.argv.includes('--atelier'),prefix=atelier?'atelier-':'',revision=atelier?'signature-v2':'signature-v1';
const themes=['donut','gelato','tea','tart','coffee','cotton','prism','glider','kite'],assets=[];
for(const theme of themes){
 const {document,binary}=parseGlb(fs.readFileSync(path.join(__dirname,prefix+theme+'.raw.glb'))),names=new Set();
 for(const node of document.nodes){if(node.extras?.runtimeName)node.name=node.extras.runtimeName;assert.ok(!names.has(node.name),'Duplicate node '+node.name);names.add(node.name)}
 const root=document.nodes.find(node=>node.name==='Signature_Root');assert.equal(root?.extras.signatureTheme,theme);assert.ok(JSON.parse(root.extras.signatureDetails).length>=35);
 if(atelier){assert.equal(root.extras.signatureVersion,2);assert.equal(root.extras.signatureLettering,'facade-relief');assert.ok(document.nodes.some(node=>node.name==='Signature_BackSignAnchor'));const details=JSON.parse(root.extras.signatureDetails);assert.ok(details.length>=200);assert.equal(details.includes('Enamel_SignHousing'),false);for(const part of ['Sculpted_PatisserieRoof','Tailored_StripedAwning','Continuous_EaveBeading','Fitted_RearRoofInfill','Side_WindowRecess'])assert.ok(details.includes(part),theme+' missing '+part)}
 for(const material of document.materials){if(material.extras?.runtimeName)material.name=material.extras.runtimeName;const color=material.extras?.signatureColor;assert.ok(color?.length===4&&color.every(Number.isFinite));material.pbrMetallicRoughness.baseColorFactor=[...color]}
 const triangles=document.meshes.reduce((total,mesh)=>total+mesh.primitives.reduce((sum,primitive)=>sum+document.accessors[primitive.indices??primitive.attributes.POSITION].count/3,0),0);assert.ok(triangles>8000&&triangles<65000,theme+': '+triangles);
 if(atelier)for(const mesh of document.meshes)for(const primitive of mesh.primitives){assert.ok(primitive.attributes.TEXCOORD_0!==undefined);const material=document.materials[primitive.material];if(material.normalTexture){assert.equal(material.normalTexture.texCoord,1);assert.ok(primitive.attributes.TEXCOORD_1!==undefined)}}
 const json=Buffer.from(JSON.stringify(document)),padding=(4-json.length%4)%4,header=Buffer.alloc(20),binaryHeader=Buffer.alloc(8);
 header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+json.length+padding+8+binary.length,8);header.writeUInt32LE(json.length+padding,12);header.writeUInt32LE(0x4e4f534a,16);binaryHeader.writeUInt32LE(binary.length);binaryHeader.writeUInt32LE(0x004e4942,4);
 const result=Buffer.concat([header,json,Buffer.alloc(padding,32),binaryHeader,binary]);assert.ok(parseGlb(result).binary.equals(binary));assert.ok(result.length<6500000,theme+' download budget');
 const occlusion=fs.readFileSync(path.join(__dirname,prefix+theme+'-ao.png'));assert.equal(occlusion.readUInt32BE(16),atelier?2048:1024);assert.equal(occlusion.readUInt32BE(20),atelier?2048:1024);
 fs.writeFileSync(path.join(__dirname,prefix+theme+'.glb'),result);assets.push({theme,bytes:result.length,sha256:hash(result),occlusionBytes:occlusion.length,occlusionSha256:hash(occlusion),triangles,parts:JSON.parse(root.extras.signatureDetails).length});
}
const report={status:'candidates-awaiting-visual-review',assets,totalBytes:assets.reduce((total,asset)=>total+asset.bytes+asset.occlusionBytes,0)};
fs.writeFileSync(path.join(__dirname,prefix+'manifest.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

if(process.argv.includes('--publish')){
 const root=path.resolve(__dirname,'../..'),reviewFile=atelier?'outputs/playtest/signature-atelier-candidate-checks.json':'outputs/playtest/signature-candidates-v3-checks.json',review=JSON.parse(fs.readFileSync(path.join(root,reviewFile),'utf8'));
 assert.equal(review.checks.length,52);assert.deepEqual(review.errors,[]);
 for(const [file,fingerprint] of Object.entries(review.signatureFingerprints))assert.equal(hash(fs.readFileSync(path.join(root,file))),fingerprint,'Reviewed input changed: '+file);
 const source=atelier?'assets/signature-candidates/signature-atelier-study-20261005.blend':'assets/signature-candidates/signature-shops-study-20261003-r2.blend';
 if(atelier){assert.ok(fs.statSync(path.join(root,source)).size>1000000000);assert.equal(review.checks.filter(check=>check.reviewSubject==='shop-road-clearance').length,2);const views=review.checks.filter(check=>check.theme);assert.equal(new Set(views.map(check=>check.theme)).size,10);for(const view of views){assert.deepEqual(view.signatureScale,[3,3,3]);if(view.theme!=='pretzel'){assert.equal(view.signatureVersion,2);assert.equal(view.facadeLettering,true);assert.equal(view.flatNameBoard,false)}}}
 const destination=path.join(root,'public/assets',revision);fs.mkdirSync(destination,{recursive:true});
 for(const asset of assets)for(const [file,fingerprint] of [[asset.theme+'.glb',asset.sha256],[asset.theme+'-ao.png',asset.occlusionSha256]]){
  const target=path.join(destination,file);if(fs.existsSync(target))assert.equal(hash(fs.readFileSync(target)),fingerprint,'Refusing to overwrite another published version');else fs.copyFileSync(path.join(__dirname,prefix+file),target);assert.equal(hash(fs.readFileSync(target)),fingerprint);
 }
 const manifest={version:atelier?'signature-shops-v2':'signature-shops-v1',source,review:reviewFile,assets,totalBytes:report.totalBytes},file=path.join(destination,'manifest.json');
 if(fs.existsSync(file))assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),manifest);else fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n');
 console.log('NINE_REVIEWED_SIGNATURE_SHOPS_PUBLISHED');
}
