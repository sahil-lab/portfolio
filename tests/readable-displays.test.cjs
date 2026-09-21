const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{disposeScene}=require('../app/scene-resources.ts');
global.document={createElement:()=>{
  const canvas={width:0,height:0,draws:[]};
  const context={font:'',fillRect(){},strokeRect(){},fillText(text){canvas.draws.push(text)},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){},save(){},restore(){},translate(){},rotate(){},closePath(){},roundRect(){},
    measureText(text){return {width:text.length*(Number(this.font.match(/([\d.]+)px/)?.[1])||16)*.6}},createLinearGradient(){return {addColorStop(){}}}};
  canvas.getContext=()=>context;return canvas;
}};

function readablePair(root,name,casing,elevation=0,clearance=Infinity){
  root.updateMatrixWorld(true);
  const front=root.getObjectByName(name),back=root.getObjectByName(name+'_Back');
  assert.ok(front,name+' front');assert.ok(back,name+' back');
  assert.equal(front.geometry,back.geometry);assert.equal(front.material,back.material);assert.equal(front.material.map,back.material.map);
  for(const [face,side] of [[front,1],[back,-1]]){
    assert.equal(face.material.side,T.FrontSide);assert.equal(face.userData.displaySide,side);
    assert.ok(face.matrixWorld.determinant()>0);
    const normal=new T.Vector3(0,0,1).transformDirection(face.matrixWorld),right=new T.Vector3(1,0,0).transformDirection(face.matrixWorld);
    assert.ok(right.dot(new T.Vector3(0,1,0).cross(normal).normalize())>.99,'text advances to the viewer right');
    const {width,height}=face.geometry.parameters;
    for(const [horizontal,vertical] of [[0,0],[-.38,-.32],[-.38,.32],[.38,-.32],[.38,.32]])for(const distance of [4,18])for(const angle of [-Math.PI/4,0,Math.PI/4]){
      const sample=new T.Vector3(horizontal*width,vertical*height,0),target=face.localToWorld(sample.clone());
      const origin=face.localToWorld(sample.clone().add(new T.Vector3(Math.sin(angle)*distance,elevation*distance,Math.cos(angle)*distance))),targetDistance=origin.distanceTo(target);
      const ray=new T.Raycaster(origin,target.clone().sub(origin).normalize(),Math.max(0,targetDistance-clearance));
      const hits=ray.intersectObjects([front,back,...casing],true),description=root.name+'/'+name+' side '+side+' at '+distance+' units, '+angle+' radians, sample '+horizontal+','+vertical+': hit '+hits[0]?.object.name;
      assert.ok(!hits.length||hits[0].distance>=targetDistance-1e-6,description);
      if(horizontal||vertical)assert.equal(hits[0]?.object===face,true,description);
    }
  }
  return {front,back};
}

test('display visibility rejects real casing obstruction on either face',()=>{
  const {createReadableDisplay}=require('../app/readable-display.ts');
  for(const side of [1,-1]){
    const root=new T.Group();createReadableDisplay(root,'Blocked',new T.Texture(),4,2,.4,new T.Vector3());
    const casing=new T.Mesh(new T.BoxGeometry(5,3,.2),new T.MeshBasicMaterial());casing.position.z=side*.5;root.add(casing);
    assert.throws(()=>readablePair(root,'Blocked',[casing]),{code:'ERR_ASSERTION'});disposeScene(root);
  }
});

test('Pixel shares its live animated canvas on outward faces clear of both portrait bezels',()=>{
  const {createCreativePlaza}=require('../app/creative-plaza.ts'),scene=new T.Scene(),player=new T.Group();player.position.set(-24,.8,79);
  const plaza=createCreativePlaza(scene,player,{notice(){},subtitle(){},sound(){}}),portrait=scene.getObjectByName('Pixel_Portrait');
  const casing=['Portrait_Frame','Portrait_InnerFrame','Portrait_InnerFrame_Back'].map(name=>portrait.getObjectByName(name));
  assert.ok(casing.every(Boolean));
  const {front,back}=readablePair(portrait,'Portrait_AnimatedCanvas',casing),texture=front.material.map;
  assert.equal(texture.image,plaza.portraitCanvas);
  const bounds=new T.Box3();casing.forEach(object=>bounds.expandByObject(object));
  assert.ok(front.getWorldPosition(new T.Vector3()).z>bounds.max.z);assert.ok(back.getWorldPosition(new T.Vector3()).z<bounds.min.z);
  const version=texture.version;plaza.update(.1,false,true);assert.ok(texture.version>version);assert.equal(back.material.map.version,texture.version);
  const counts=new Map([front.geometry,front.material,texture].map(resource=>[resource,0]));
  for(const resource of counts.keys())resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));
  plaza.dispose();disposeScene(scene);assert.deepEqual([...counts.values()],[1,1,1]);
});

test('shop badges retain their artwork with readable mounts outside the front and rear cabinets',()=>{
  const {createCreativePlaza}=require('../app/creative-plaza.ts'),scene=new T.Scene(),player=new T.Group();
  const plaza=createCreativePlaza(scene,player,{notice(){},subtitle(){},sound(){}});
  const badges=[['kettle','COPPER KETTLE',4.61,-4.61],['shoe','SOLE / 01',4.3,-4.3],['radio','FREQUENCY HOUSE',3.36,-3.16],['books','PAPERBACK',1.36,-1.25],['juice','CITRUS',1.36,-1.25],['ice','CLOUD',1.36,-1.25]];
  for(const [shop,text,frontZ,backZ] of badges){
    const group=scene.getObjectByName('Shop_'+shop),{front,back}=readablePair(group,'Shop_EnamelPlaque',[plaza.root],0,1);
    readablePair(group,'Shop_EnamelPlaque',[plaza.root],.35);
    assert.ok(Math.abs(front.position.z-frontZ)<1e-8);assert.ok(Math.abs(back.position.z-backZ)<1e-8);
    assert.deepEqual(front.material.map.image.draws,[text]);assert.equal(front.material.map.image.width,512);assert.equal(front.material.map.image.height,128);
  }
  for(const [shop,text] of [['kettle','COPPER KETTLE'],['shoe','SOLE STUDIO'],['radio','FREQUENCY']]){
    const storefront=scene.getObjectByName('City_Storefront_'+shop),{front}=readablePair(storefront,'Shop_BuildingWordmark',[plaza.root],0,1);
    readablePair(storefront,'Shop_BuildingWordmark',[plaza.root],.35);
    assert.deepEqual(front.material.map.image.draws,[text]);assert.equal(front.material.map.image.width,1024);
  }
  plaza.dispose();disposeScene(scene);
});

