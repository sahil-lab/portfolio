const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),threeRoot=path.resolve(path.dirname(require.resolve('three')),'..');
const modulePath=process.argv.find(argument=>argument.startsWith('--playwright='))?.slice(13)??'playwright';
const {chromium}=require(modulePath),sharp=require('sharp');
const output=path.join(root,'public/assets/loading/pocket-kingdom-v2.webp');
const html='<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="data:,"><style>html,body{margin:0;background:transparent}canvas{display:block}</style><script type="importmap">{"imports":{"three":"/vendor/three.module.js","three/addons/":"/addons/"}}</script></head><body></body></html>';
const server=http.createServer((request,response)=>{
 const pathname=new URL(request.url,'http://localhost').pathname;
 if(pathname==='/'){response.setHeader('Content-Type','text/html');response.end(html);return}
 const base=pathname.startsWith('/vendor/')?path.join(threeRoot,'build'):path.join(threeRoot,'examples/jsm');
 const filename=path.resolve(base,'.'+pathname.replace(/^\/(vendor|addons)/,''));
 if(path.relative(base,filename).startsWith('..')||!filename.endsWith('.js')||!fs.existsSync(filename)){response.writeHead(404);response.end();return}
 response.setHeader('Content-Type','text/javascript');fs.createReadStream(filename).pipe(response);
});
async function main(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:800},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  const sceneInfo=await page.evaluate(async()=>{
   const T=await import('three'),{RoundedBoxGeometry}=await import('three/addons/geometries/RoundedBoxGeometry.js'),{RoomEnvironment}=await import('three/addons/environments/RoomEnvironment.js');
    const renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(1200,800);renderer.setPixelRatio(2);renderer.setClearColor(0x000000,0);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.NeutralToneMapping;renderer.toneMappingExposure=.97;document.body.append(renderer.domElement);
   const scene=new T.Scene(),camera=new T.OrthographicCamera(-7.65,7.65,5.1,-5.1,.1,80);camera.position.set(8,10,17);camera.lookAt(0,1.4,0);
   const room=new RoomEnvironment(),environment=new T.PMREMGenerator(renderer);scene.environment=environment.fromScene(room,.05).texture;scene.environmentIntensity=.5;room.dispose();environment.dispose();
    scene.add(new T.HemisphereLight(0xf7fbff,0x789c89,.65));
    const sun=new T.DirectionalLight(0xfff1dc,2.75);sun.position.set(-6,12,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.1,far:40});sun.shadow.bias=-.0003;sun.shadow.normalBias=.035;sun.shadow.radius=4;scene.add(sun);
   const materials=new Map();
    function material(color,roughness=.65){const key=color+':'+roughness;if(!materials.has(key))materials.set(key,new T.MeshPhysicalMaterial({color,roughness,clearcoat:.16,clearcoatRoughness:.45}));return materials.get(key)}
   function mesh(geometry,color,position,parent=scene){const object=new T.Mesh(geometry,material(color));object.position.set(...position);object.castShadow=true;object.receiveShadow=true;parent.add(object);return object}
   function box(size,color,position,radius=.12,parent=scene){return mesh(new RoundedBoxGeometry(...size,4,Math.min(radius,...size.map(value=>value*.45))),color,position,parent)}
   function ball(size,color,position,parent=scene){const object=mesh(new T.SphereGeometry(1,24,16),color,position,parent);object.scale.set(...size);return object}
   function cylinder(radius,height,color,position,parent=scene){return mesh(new T.CylinderGeometry(radius,radius,height,32),color,position,parent)}
   function line(points,color,radius=.022,parent=scene){const curve=new T.CatmullRomCurve3(points.map(point=>new T.Vector3(...point)));return mesh(new T.TubeGeometry(curve,32,radius,8,false),color,[0,0,0],parent)}
    box([8.1,.68,5.35],'#388977',[0,-.10,0],.38);
    box([7.94,.17,5.18],'#d6bf77',[0,.29,0],.35);
    box([7.75,.07,5.01],'#c6dda8',[0,.405,0],.28);
   for(let pin=0;pin<8;pin++)for(const side of [-1,1])box([.2,.18,.5],'#d3b46a',[-3.35+pin*.95,-.05,side*2.79],.07);
   for(let pin=0;pin<4;pin++)for(const side of [-1,1])box([.5,.18,.2],'#d3b46a',[side*4.18,-.05,-1.8+pin*1.2],.06);
   line([[-3.65,.455,1.75],[-1.85,.455,1.75],[-1.2,.455,2.05],[.3,.455,2.05],[1.3,.455,1.75],[3.55,.455,1.75]],'#faf0d3',.12);
   line([[-3.5,.455,-1.15],[-1.7,.455,-1.15],[-.7,.455,-1.9],[1.5,.455,-1.9],[3.4,.455,-.8]],'#faf0d3',.1);
   for(let stone=0;stone<11;stone++)box([.27,.025,.14],'#fff9e7',[-3.1+stone*.57,.47,1.68],.025);
   function house(position,wall,roofColor,scale=1){
    const group=new T.Group();group.position.set(...position);group.scale.setScalar(scale);scene.add(group);
    box([1.1,.98,.92],wall,[0,.93,0],.09,group);
    const roofShape=new T.Shape();roofShape.moveTo(-.72,0);roofShape.lineTo(0,.65);roofShape.lineTo(.72,0);roofShape.closePath();
    mesh(new T.ExtrudeGeometry(roofShape,{depth:1.16,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:3,steps:1}),roofColor,[0,1.43,-.58],group);
    box([.29,.51,.08],'#376b5f',[0,.74,.5],.12,group);
    for(const side of [-1,1]){box([.21,.25,.08],'#f9e8a7',[side*.32,1.09,.495],.045,group);box([.24,.04,.13],'#e7f5df',[side*.32,.955,.52],.015,group)}
    box([.16,.38,.18],wall,[.32,1.91,-.15],.035,group);
    return group;
   }
    const bakery=house([-2.65,0,-.9],'#f5ceb5','#d6637d',1.15);bakery.rotation.y=.16;
    for(let stripe=0;stripe<7;stripe++){const awning=box([.17,.13,.4],stripe%2?'#f4e8d3':'#d9758c',[-.51+stripe*.17,1.2,.67],.04,bakery);awning.rotation.x=.12}
    const donut=mesh(new T.TorusGeometry(.24,.092,16,40),'#d69b66',[0,1.84,.65],bakery);
    const icing=mesh(new T.TorusGeometry(.24,.075,12,40),'#efb0c4',[0,1.85,.70],bakery);icing.scale.y=.92;
    for(let sprinkle=0;sprinkle<9;sprinkle++){const angle=sprinkle*Math.PI*2/9;const sugar=box([.045,.025,.02],sprinkle%2?'#fff1c5':'#adcecd',[Math.cos(angle)*.24,1.85+Math.sin(angle)*.22,.778],.008,bakery);sugar.rotation.z=angle+.7}
    donut.castShadow=true;
    const clockHouse=house([2.65,0,-1.1],'#c6dce2','#6393b5',1.12);clockHouse.rotation.y=-.3;
    const clock=cylinder(.23,.065,'#fff3ce',[0,1.1,.54],clockHouse);clock.rotation.x=Math.PI/2;
    mesh(new T.TorusGeometry(.23,.025,10,40),'#c99c54',[0,1.1,.584],clockHouse);
    const hour=box([.033,.15,.025],'#35596b',[-.036,1.145,.59],.01,clockHouse);hour.rotation.z=.65;
    const minute=box([.025,.18,.025],'#35596b',[.047,1.15,.60],.008,clockHouse);minute.rotation.z=-.8;
    const teaHouse=house([3.02,0,.9],'#f1d495','#81ab95',.78);teaHouse.rotation.y=-.28;
    ball([.27,.23,.22],'#55a095',[0,2.2,0],teaHouse);cylinder(.18,.07,'#f1d7a0',[0,2.43,0],teaHouse);ball([.055,.065,.055],'#d1a35c',[0,2.49,0],teaHouse);
    line([[.2,2.18,0],[.42,2.29,0],[.47,2.4,0]],'#55a095',.07,teaHouse);
    const handle=mesh(new T.TorusGeometry(.16,.04,10,30),'#55a095',[-.3,2.2,0],teaHouse);handle.scale.y=1.15;
   house([-3.02,0,1.08],'#f0c3cd','#c77990',.65).rotation.y=.1;
   function tree(position,scale=1,color='#87b89d'){
    const group=new T.Group();group.position.set(...position);group.scale.setScalar(scale);scene.add(group);
    cylinder(.075,.78,'#c49671',[0,.83,0],group);
    for(const [horizontal,height,depth,size] of [[-.18,1.31,0,.37],[.18,1.47,0,.39],[0,1.75,.02,.34]])ball([size,size*1.16,size],color,[horizontal,height,depth],group);
   }
   tree([-3.45,0,-1.95],.95);tree([3.4,0,-2.03],1.08,'#a6c592');tree([-1.63,0,-2.01],.72,'#dca4b5');tree([1.46,0,-2.07],.72);tree([-3.54,0,.02],.7);
   const computer=new T.Group();computer.position.set(0,.44,.35);computer.rotation.y=.39;scene.add(computer);
   for(const side of [-1,1]){box([.53,.28,.78],'#62aa99',[side*.53,.18,.31],.13,computer);box([.2,.35,.2],'#8fc6b4',[side*.51,.37,.16],.08,computer)}
   box([1.65,.76,.93],'#99cfb6',[0,.74,.03],.2,computer);
   box([2.4,1.81,1.28],'#a5ddcb',[0,1.91,0],.26,computer);
   box([2.12,1.54,.17],'#d7eade',[0,1.94,.63],.19,computer);
   box([1.8,1.21,.1],'#eaf7dd',[0,1.98,.747],.2,computer);
   box([.45,.075,.08],'#7bbaa8',[.49,1.215,.743],.028,computer);
   ball([.065,.065,.04],'#ecad9d',[-.72,1.245,.74],computer);
   for(const side of [-1,1]){
    line([[side*.83,.92,.02],[side*1.16,.85,.08],[side*1.22,1.13,.21]],'#94c7b3',.13,computer);
    ball([.2,.2,.19],'#d6ebcc',[side*1.22,1.12,.22],computer);
   }
   box([1.44,.14,.61],'#e4ece0',[0,.54,.68],.08,computer);
   for(let row=0;row<2;row++)for(let key=0;key<7;key++)box([.14,.04,.15],key===6?'#e8acb5':'#9bc9b6',[-.55+key*.18,.632,.52+row*.21],.028,computer);
   box([.94,.2,.69],'#f0c86c',[0,2.86,-.02],.065,computer);
   for(const [horizontal,height] of [[-.35,.31],[0,.5],[.35,.31]]){box([.18,height,.49],'#f0c86c',[horizontal,2.94+height/2,-.02],.065,computer);ball([.12,.12,.12],'#ffe5a0',[horizontal,3.01+height,-.02],computer)}
   const envelope=box([.65,.46,.11],'#fff3dc',[-1.31,1.23,.32],.04,computer);envelope.rotation.z=-.22;
   line([[-1.58,1.41,.39],[-1.28,1.19,.39],[-1.01,1.41,.39]],'#d8a17b',.015,computer);
   ball([.058,.06,.022],'#da7b90',[-1.3,1.2,.4],computer);
   for(const [horizontal,depth,color] of [[-2.1,1.08,'#e8adc0'],[-1.7,1.47,'#f2c663'],[1.58,1.5,'#f1b9ba'],[2.1,1.69,'#f6d47a'],[3.5,1.59,'#e5aac0'],[-2.17,-1.89,'#ecb17c'],[.79,-1.77,'#d9accc']]){
    cylinder(.026,.32,'#639d78',[horizontal,.59,depth]);
    for(let petal=0;petal<5;petal++){const angle=petal*Math.PI*2/5;ball([.11,.075,.11],color,[horizontal+Math.sin(angle)*.115,.79,depth+Math.cos(angle)*.115])}
    ball([.067,.06,.067],'#f6d98b',[horizontal,.815,depth]);
    ball([.14,.065,.075],'#83b283',[horizontal+.1,.58,depth]);
   }
   for(const [horizontal,depth] of [[-1.52,-.92],[1.77,-.88],[-2.6,1.77],[2.81,-2.08]])ball([.3,.2,.24],'#a0be89',[horizontal,.52,depth]);
    for(let trace=0;trace<4;trace++){
     const horizontal=-2.4+trace*1.55;
     line([[horizontal,-.13,2.699],[horizontal+.18,-.13,2.699],[horizontal+.32,.04,2.699],[horizontal+.64,.04,2.699]],'#acd2b5',.014);
     ball([.035,.035,.025],'#edca7b',[horizontal,-.13,2.711]);
    }
    box([1.58,.24,.07],'#246957',[0,-.12,2.718],.05);
    for(let light=0;light<6;light++)box([.11,.075,.03],light<4?'#c5e7a6':'#67957f',[-.54+light*.21,-.12,2.763],.02);
    for(const [horizontal,depth] of [[-3.05,-2.23],[2.4,-2.23]])for(let post=0;post<4;post++)box([.095,.42,.095],'#f0e8cf',[horizontal+post*.22,.63,depth],.03);
    const balloon=new T.Group();balloon.position.set(3.9,3.2,-2.2);scene.add(balloon);
    ball([.42,.60,.42],'#e9929e',[0,.7,0],balloon);ball([.10,.54,.43],'#f5d5bd',[0,.72,.015],balloon);
    box([.32,.26,.26],'#c89964',[0,-.35,0],.045,balloon);
    for(const side of [-1,1])line([[side*.16,.16,0],[side*.13,-.21,0]],'#b5a087',.012,balloon);
    for(const [horizontal,height,depth,scale] of [[-4.35,2.4,-2.3,.65],[4.5,1.3,-.3,.5],[-1.75,4.05,-3.1,.42]]){
     const cloud=new T.Group();cloud.position.set(horizontal,height,depth);cloud.scale.setScalar(scale);scene.add(cloud);
     for(const [offset,level,radius] of [[-.5,0,.48],[0,.22,.61],[.57,.04,.44]])ball([radius,radius*.55,radius*.64],'#f5f8f3',[offset,level,0],cloud);
    }
   const flag=new T.Group();flag.position.set(1.85,.44,.04);scene.add(flag);cylinder(.035,1.5,'#aa9879',[0,.75,0],flag);box([.69,.43,.065],'#eaa5b7',[.3,1.38,0],.035,flag);ball([.07,.065,.07],'#efd184',[0,1.56,0],flag);
   const heart=new T.Shape();heart.moveTo(0,-.16);heart.bezierCurveTo(-.35,.05,-.24,.3,0,.15);heart.bezierCurveTo(.24,.3,.35,.05,0,-.16);const badge=mesh(new T.ShapeGeometry(heart,16),'#fff0e7',[.32,1.36,.036],flag);badge.scale.setScalar(.55);
   camera.updateMatrixWorld();scene.updateMatrixWorld(true);renderer.render(scene,camera);
   const project=point=>{const screen=new T.Vector3(...point).applyMatrix4(computer.matrixWorld).project(camera);return {left:(screen.x*.5+.5)*100,top:(-.5*screen.y+.5)*100}};
    const context=renderer.getContext(),pixels=new Uint8Array(context.drawingBufferWidth*context.drawingBufferHeight*4);context.readPixels(0,0,context.drawingBufferWidth,context.drawingBufferHeight,context.RGBA,context.UNSIGNED_BYTE,pixels);let visiblePixels=0;for(let index=3;index<pixels.length;index+=4)if(pixels[index]>10)visiblePixels++;
   return {visiblePixels,triangles:renderer.info.render.triangles,screen:{topLeft:project([-.9,2.57,.81]),topRight:project([.9,2.57,.81]),bottomLeft:project([-.9,1.39,.81]),bottomRight:project([.9,1.39,.81])}};
  });
  assert.deepEqual(errors,[]);assert.ok(sceneInfo.visiblePixels>120000,'Art render is blank or too small');
  const image=await page.screenshot({omitBackground:true});fs.mkdirSync(path.dirname(output),{recursive:true});await sharp(image).webp({quality:92,alphaQuality:100,effort:6}).toFile(output);
  const metadata=await sharp(output).metadata();assert.equal(metadata.width,1200);assert.equal(metadata.height,800);assert.ok(fs.statSync(output).size<250000,'Loading art exceeds 250 KB');
  console.log('LOADING_ART_RENDERED '+JSON.stringify({output,bytes:fs.statSync(output).size,...sceneInfo}));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
}
main().catch(error=>{console.error(error);server.close();process.exitCode=1});
