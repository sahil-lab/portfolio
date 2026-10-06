import * as T from 'three';
import {createStreetPerformer,streetPerformerKinds,performerRadii} from './street-performers';
import {lifeGeometry,lifeKitReady,type LifePart} from './life-kit';
import {createStreetBirds,streetBirdPopulation,mainlandBirdPopulation,streetBirdSpecies,type StreetBird} from './street-birds';
export {jugglingPosition} from './street-performers';

export type StreetLifeEnvironment={morning:number;night:number;wet?:number};
export type StreetLifeQuality='low'|'balanced'|'high';
export const streetLifeBudget={butterflies:8,ambientButterflies:mainlandBirdPopulation,fireflies:24,birds:mainlandBirdPopulation,bats:mainlandBirdPopulation,performers:3} as const;

export function streetLifeDensity(environment:StreetLifeEnvironment,quality:StreetLifeQuality='balanced',birdPopulation:number=streetBirdPopulation){
  const unit=(value:number)=>Number.isFinite(value)?T.MathUtils.clamp(value,0,1):0;
  const night=unit(environment.night),weather=1-unit(environment.wet??0)*.8,detail=quality==='low'?.5:1;
  return {
    butterflies:Math.round(streetLifeBudget.butterflies*(1-T.MathUtils.smoothstep(night,.05,.3))*weather*detail),
    ambientButterflies:Math.round(birdPopulation*(1-T.MathUtils.smoothstep(night,.05,.3))*weather*detail),
    fireflies:Math.round(streetLifeBudget.fireflies*T.MathUtils.smoothstep(night,.45,.9)*weather*detail),
    birds:Math.round(birdPopulation*(1-T.MathUtils.smoothstep(night,.2,.8))*weather*detail),
    bats:Math.round(birdPopulation*T.MathUtils.smoothstep(night,.2,.8)*weather*detail),
  };
}

export type StreetLifeAnchor={id:string;position:T.Vector3;rotation:T.Quaternion};
type StreetLifeOptions={id:string;anchors:StreetLifeAnchor[];seed?:number;project?:(point:T.Vector3)=>T.Vector3;up?:(point:T.Vector3)=>T.Vector3;blocked?:(point:T.Vector3,padding:number)=>boolean};

export function createStreetLife(parent:T.Object3D,options:StreetLifeOptions){
  const root=new T.Group();root.name='StreetLife_'+options.id;root.userData.streetLife=true;root.userData.authoredLife=lifeKitReady();parent.add(root);
  const seed=options.seed??0,birdPopulation=options.id==='motherboard'?mainlandBirdPopulation:streetBirdPopulation,project=options.project??((point:T.Vector3)=>point.clone().setY(0)),upAt=options.up??(()=>new T.Vector3(0,1,0)),occupied=options.blocked??(()=>false);
  const reservations:{position:T.Vector3;radius:number}[]=[],performers:{performer:ReturnType<typeof createStreetPerformer>;site:StreetLifeAnchor}[]=[],habitats:StreetLifeAnchor[]=[];
  function candidate(anchor:StreetLifeAnchor,horizontal:number,forward:number){
    const position=project(new T.Vector3(horizontal,0,forward).applyQuaternion(anchor.rotation).add(anchor.position)),up=upAt(position).normalize(),facing=new T.Vector3(0,0,1).applyQuaternion(anchor.rotation).projectOnPlane(up).normalize(),right=new T.Vector3().crossVectors(up,facing).normalize();
    return {id:anchor.id,position,rotation:new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,facing))};
  }
  function clear(site:StreetLifeAnchor,radius:number){
    if(reservations.some(item=>item.position.distanceTo(site.position)<item.radius+radius+.7))return false;
    if(options.anchors.some(anchor=>project(anchor.position).distanceTo(site.position)<radius+3.6))return false;
    for(let sample=0;sample<17;sample++){
      const angle=(sample-1)/16*Math.PI*2,distance=sample===0?0:radius,point=new T.Vector3(Math.cos(angle)*distance,0,Math.sin(angle)*distance).applyQuaternion(site.rotation).add(site.position),ground=project(point),up=upAt(ground);
      if(Math.abs(ground.clone().sub(point).dot(up))>.28||[.8,1.8,2.8].some(height=>occupied(ground.clone().addScaledVector(up,height),.45)))return false;
    }
    return true;
  }
  const offsets=[[-6,0],[6,0],[-8,-5],[8,-5],[0,-8],[-12,2],[12,2],[-6,6],[6,6],[-12,-6],[12,-6]];
  for(const [index,kind] of streetPerformerKinds.entries()){
    let selected:StreetLifeAnchor|undefined;
    for(let attempt=0;attempt<options.anchors.length&&!selected;attempt++)for(const [horizontal,forward] of offsets){const site=candidate(options.anchors[(attempt+index)%options.anchors.length],horizontal,forward);if(clear(site,performerRadii[kind])){selected=site;break}}
    if(!selected)continue;
    const site=selected,inverse=site.rotation.clone().invert(),height=(horizontal:number,forward:number)=>project(new T.Vector3(horizontal,0,forward).applyQuaternion(site.rotation).add(site.position)).sub(site.position).applyQuaternion(inverse).y;
    const performer=createStreetPerformer(kind,seed+index,height);performer.root.position.copy(site.position);performer.root.quaternion.copy(site.rotation);root.add(performer.root);performers.push({performer,site});reservations.push({position:site.position.clone(),radius:performer.radius});
  }
  for(let round=0;round<3&&habitats.length<18;round++)for(const [index,anchor] of options.anchors.entries()){
    if(habitats.length>=18)break;
    for(let attempt=0;attempt<12;attempt++){const angle=seed*.61+index*2.399+round*1.71+attempt*2.399,radius=8+round*5+(attempt%4)*2,site=candidate(anchor,Math.sin(angle)*radius,Math.cos(angle)*radius);if(habitats.every(other=>other.position.distanceTo(site.position)>5.5)&&clear(site,2.1)){habitats.push(site);break}}
  }
  if(!habitats.length)for(const entry of performers)habitats.push(entry.site);
  const material=(color:string,metalness=0)=>new T.MeshStandardMaterial({color,vertexColors:true,roughness:.76,metalness});
  const butterflyMaterial=material('#ffffff'),dark=material('#38474b'),feathers=material('#ffffff'),gold=material('#d7b965'),glow=material('#e1efad');butterflyMaterial.side=T.DoubleSide;feathers.side=T.DoubleSide;glow.emissive.set('#d9ed98');glow.emissiveIntensity=3;glow.userData.surface='light';glow.userData.nightIllumination=3;glow.userData.preserveEmissiveColor=true;
  function instances(name:string,part:LifePart|T.BufferGeometry,size:[number,number,number],finish:T.Material,count:number,mirrored=false){
    const geometry=typeof part==='string'?(lifeGeometry(part,...size)??new T.SphereGeometry(.5,8,6).scale(...size)):part.scale(...size);if(!geometry.attributes.color)geometry.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count*3).fill(1),3));
    if(mirrored){geometry.scale(-1,1,1);if(!geometry.index)geometry.setIndex(Array.from({length:geometry.attributes.position.count},(_,index)=>index));const indices=geometry.index!;for(let index=0;index<indices.count;index+=3){const first=indices.getX(index);indices.setX(index,indices.getX(index+2));indices.setX(index+2,first)}}
    const object=new T.InstancedMesh(geometry,finish,count);object.name=name;object.instanceMatrix.setUsage(T.DynamicDrawUsage);object.frustumCulled=false;object.castShadow=false;root.add(object);return object;
  }
  const butterflies={body:instances('Street_ButterflyBodies','ButterflyBody',[.04,.045,.17],dark,8),left:instances('Street_ButterflyLeftWings','ButterflyWing',[.34,.018,.30],butterflyMaterial,8,true),right:instances('Street_ButterflyRightWings','ButterflyWing',[.34,.018,.30],butterflyMaterial,8)};
  const ambientButterflies={body:instances('Street_AmbientButterflyBodies','ButterflyBody',[.04,.045,.17],dark,birdPopulation),left:instances('Street_AmbientButterflyLeftWings','ButterflyWing',[.34,.018,.30],butterflyMaterial,birdPopulation,true),right:instances('Street_AmbientButterflyRightWings','ButterflyWing',[.34,.018,.30],butterflyMaterial,birdPopulation)};
  const wingColors=['#edc576','#e2a3b6','#adcbbb','#d9e6e1'];for(const group of [butterflies,ambientButterflies])for(let index=0;index<group.body.instanceMatrix.count;index++){const color=new T.Color(wingColors[(index+seed)%wingColors.length]);group.left.setColorAt(index,color);group.right.setColorAt(index,color)}
  function batWing(){
    const outline=new T.Shape();outline.moveTo(0,-.08);outline.quadraticCurveTo(.13,-.31,.35,-.29);outline.quadraticCurveTo(.51,-.22,.73,-.02);outline.quadraticCurveTo(.49,-.06,.48,.19);outline.quadraticCurveTo(.32,.03,.29,.27);outline.quadraticCurveTo(.15,.09,0,.15);outline.closePath();
    const geometry=new T.ShapeGeometry(outline,5).rotateX(-Math.PI/2);geometry.userData.streetLifePart='BatWing';return geometry;
  }
  const batFur=material('#79747c'),batMembrane=material('#a092a0'),batEyes=material('#d8d4c4');batMembrane.side=T.DoubleSide;
  const bats={body:instances('Street_BatBodies','BirdBody',[.20,.24,.36],batFur,birdPopulation),head:instances('Street_BatHeads','BirdBody',[.18,.17,.19],batFur,birdPopulation),left:instances('Street_BatLeftWings',batWing(),[1,1,1],batMembrane,birdPopulation,true),right:instances('Street_BatRightWings',batWing(),[1,1,1],batMembrane,birdPopulation),leftEar:instances('Street_BatLeftEars',new T.ConeGeometry(.055,.17,5),[1,1,1],batFur,birdPopulation),rightEar:instances('Street_BatRightEars',new T.ConeGeometry(.055,.17,5),[1,1,1],batFur,birdPopulation),leftEye:instances('Street_BatLeftEyes','Ball',[.024,.027,.024],batEyes,birdPopulation),rightEye:instances('Street_BatRightEyes','Ball',[.024,.027,.024],batEyes,birdPopulation)};
  const capacity=birdPopulation,birds={body:instances('Street_BirdBodies','BirdBody',[.28,.25,.55],feathers,capacity),head:instances('Street_BirdHeads','BirdBody',[.19,.17,.2],feathers,capacity),neck:instances('Street_BirdNecks','BirdBody',[.11,1,.11],feathers,capacity),breast:instances('Street_BirdBreasts','BirdBody',[.22,.20,.28],feathers,capacity),left:instances('Street_BirdLeftWings','BirdWing',[.47,.035,.32],feathers,capacity,true),right:instances('Street_BirdRightWings','BirdWing',[.47,.035,.32],feathers,capacity),tail:instances('Street_BirdTails','BirdTail',[.21,.025,.25],feathers,capacity),beak:instances('Street_BirdBeaks','Brush',[.07,.07,.13],feathers,capacity),leftEye:instances('Street_BirdLeftEyes','Ball',[.024,.032,.024],dark,capacity),rightEye:instances('Street_BirdRightEyes','Ball',[.024,.032,.024],dark,capacity),leftLeg:instances('Street_BirdLeftLegs','Brush',[.028,.18,.028],gold,capacity),rightLeg:instances('Street_BirdRightLegs','Brush',[.028,.18,.028],gold,capacity),leftFoot:instances('Street_BirdLeftFeet','Ball',[.065,.026,.145],gold,capacity),rightFoot:instances('Street_BirdRightFeet','Ball',[.065,.026,.145],gold,capacity)};
  const birdColors=new Map(Object.entries(streetBirdSpecies).map(([name,profile])=>[name,{body:new T.Color(profile.body),head:new T.Color(profile.head),wing:new T.Color(profile.wing),breast:new T.Color(profile.breast),tail:new T.Color(profile.tail),beak:new T.Color(profile.beak)}]));
  const fireflies={body:instances('Street_FireflyBodies','FireflyBody',[.08,.07,.165],dark,24),light:instances('Street_FireflyLights','Ball',[.125,.125,.125],glow,24)};
  const haloPixels=new Uint8Array(16*16*4);for(let row=0;row<16;row++)for(let column=0;column<16;column++){const strength=Math.max(0,1-Math.hypot(column-7.5,row-7.5)/7.5);haloPixels.set([224,239,175,Math.round(strength*strength*150)],(row*16+column)*4)}
  const haloTexture=new T.DataTexture(haloPixels,16,16,T.RGBAFormat);haloTexture.magFilter=T.LinearFilter;haloTexture.needsUpdate=true;
  const haloGeometry=new T.BufferGeometry();haloGeometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(72),3));haloGeometry.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(72).fill(1),3));
  const halos=new T.Points(haloGeometry,new T.PointsMaterial({map:haloTexture,color:'#e3efb6',vertexColors:true,size:.8,transparent:true,opacity:.8,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));halos.name='Street_FireflyHalos';halos.frustumCulled=false;root.add(halos);
  const dummy=new T.Object3D(),yaw=new T.Quaternion(),fold=new T.Quaternion(),position=new T.Vector3(),offset=new T.Vector3(),vertical=new T.Vector3(0,1,0),forwardAxis=new T.Vector3(0,0,1);
  const birdHead=new T.Vector3(),birdBeak=new T.Vector3(),birdNeck=new T.Vector3(),birdNeckDirection=new T.Vector3(),birdInverse=new T.Quaternion(),birdLean=new T.Quaternion(),birdNeckRotation=new T.Quaternion(),sideAxis=new T.Vector3(1,0,0);
  const batForward=new T.Vector3(),batUp=new T.Vector3(),batRight=new T.Vector3(),batBasis=new T.Matrix4();
  function put(object:T.InstancedMesh,index:number,site:StreetLifeAnchor,origin:T.Vector3,local:T.Vector3,rotation:T.Quaternion,scale=1){dummy.position.copy(local).applyQuaternion(site.rotation).add(origin);dummy.quaternion.copy(site.rotation).multiply(rotation);dummy.scale.setScalar(scale);dummy.updateMatrix();object.setMatrixAt(index,dummy.matrix)}
  const follower:StreetLifeAnchor={id:'following-'+options.id,position:new T.Vector3(),rotation:new T.Quaternion()},followTarget=new T.Vector3(),followDelta=new T.Vector3();let following=false,followerElevation=0;
  function surface(site:StreetLifeAnchor,horizontal:number,forward:number,height:number){const point=project(new T.Vector3(horizontal,0,forward).applyQuaternion(site.rotation).add(site.position));return point.addScaledVector(upAt(point),height+(site===follower?followerElevation:0))}
  function putBird(object:T.InstancedMesh,index:number,site:StreetBird,origin:T.Vector3,local:T.Vector3,rotation:T.Quaternion,width=1,height=1,depth=1){const scale=streetBirdSpecies[site.species].size;dummy.position.copy(local).multiplyScalar(scale).applyQuaternion(site.rotation).add(origin);dummy.quaternion.copy(site.rotation).multiply(rotation);dummy.scale.set(scale*width,scale*height,scale*depth);dummy.updateMatrix();object.setMatrixAt(index,dummy.matrix)}
  const birdLife=createStreetBirds(parent,{sites:habitats,seed,population:birdPopulation,exclude:root,project,up:upAt}),seeds=instances('Street_BirdSeeds','Ball',[.04,.022,.075],gold,birdLife.groundSites.length*9);
  for(const [index,site] of birdLife.groundSites.entries())for(let grain=0;grain<9;grain++){const angle=grain*2.399+seed*.31,radius=.24+(grain%4)*.14,point=project(new T.Vector3(grain?Math.sin(angle)*radius:0,0,grain?Math.cos(angle)*radius:.67).applyQuaternion(site.rotation).add(site.position));point.addScaledVector(upAt(point),.014);put(seeds,index*9+grain,site,point,offset.set(0,0,0),yaw.setFromAxisAngle(vertical,angle))}seeds.instanceMatrix.needsUpdate=true;
  function flutterPoint(index:number,cycle:number){const random=(offset:number)=>{const value=Math.sin(seed*17.3+index*61.7+cycle*139.1+offset*43.9)*43758.5453;return value-Math.floor(value)},angle=random(1)*Math.PI*2,radius=1.7+random(2)*1.6;return new T.Vector3(Math.sin(angle)*radius,1.1+random(3)*1.2,Math.cos(angle)*radius)}
  const flutterPaths=Array.from({length:8},(_,index)=>({from:flutterPoint(index,0),to:flutterPoint(index,1),elapsed:index*.137,duration:1.5+(index%3)*.37,cycle:1}));
  const ambientFlutterPaths=Array.from({length:habitats.length?birdPopulation:0},(_,index)=>({site:habitats[index%habitats.length],from:flutterPoint(index+101,0),to:flutterPoint(index+101,1),elapsed:index%8*.137,duration:1.5+(index%3)*.37,cycle:1}));
  const batFlights=Array.from({length:habitats.length?birdPopulation:0},(_,index)=>{
    const site=habitats[(index+seed)%habitats.length],points=Array.from({length:7},(_,corner)=>{const point=flutterPoint(index+501,corner);return surface(site,point.x*.5,point.z*.5,3+point.y*1.4)}),flight=new T.CatmullRomCurve3(points,true,'centripetal'),duration=T.MathUtils.clamp(flight.getLength()/(2.1+index%5*.23),3,12);
    return {id:'bat-'+index,site,flight,duration,elapsed:index*.373%duration,position:points[0].clone(),rotation:site.rotation.clone()};
  });
  const renderedBats:typeof batFlights=[];
  const fireflyPaths=Array.from({length:24},(_,index)=>({from:flutterPoint(index+31,0),to:flutterPoint(index+31,1),elapsed:index*.113,duration:3.8+(index%5)*.43,cycle:1}));
  let time=0;
  function flutter(group:typeof butterflies,slot:number,site:StreetLifeAnchor,path:typeof flutterPaths[number],index:number,step:number,reduced:boolean,spread=1){
    const phase=index*2.399+seed*.43;if(!reduced){path.elapsed+=step;if(path.elapsed>=path.duration){path.elapsed-=path.duration;path.from.copy(path.to);path.to.copy(flutterPoint(index,++path.cycle));path.duration=1.5+((index*3+path.cycle*7+seed)%13)*.13}}
    followDelta.copy(path.from).lerp(path.to,T.MathUtils.smootherstep(path.elapsed/path.duration,0,1));followDelta.x+=Math.sin(time*2.7+phase)*.12;followDelta.y+=Math.sin(time*4.1+phase)*.09;followDelta.z+=Math.sin(time*1.9-phase)*.11;position.copy(surface(site,followDelta.x*spread,followDelta.z*spread,followDelta.y));yaw.setFromAxisAngle(vertical,Math.atan2(path.to.x-path.from.x,path.to.z-path.from.z));
    put(group.body,slot,site,position,offset.set(0,0,0),yaw);const flap=reduced?.45:.45+Math.sin(time*11+phase)*.65;
    for(const [wing,side] of [[group.left,-1],[group.right,1]] as const){fold.setFromAxisAngle(forwardAxis,side*flap);offset.set(side*.16,0,0).applyQuaternion(fold).applyQuaternion(yaw);put(wing,slot,site,position,offset,yaw.clone().multiply(fold))}
  }
  const renderedBirds:StreetBird[]=[],stats={butterflies:0,ambientButterflies:0,fireflies:0,birds:0,bats:0,performers:performers.length};root.userData.streetLifeCounts=stats;root.userData.performerKinds=performers.map(entry=>entry.performer.kind);root.userData.birdSpecies=Object.keys(streetBirdSpecies);
  function update(delta:number,reduced:boolean,active:boolean,observer:T.Vector3,environment:StreetLifeEnvironment,quality:StreetLifeQuality='balanced'){
    root.visible=active;if(!active)return;
    const step=Number.isFinite(delta)?Math.max(0,Math.min(delta,.1)):0;if(!reduced)time+=step;
    for(const entry of performers){entry.performer.root.visible=observer.distanceToSquared(entry.site.position)<110**2;if(entry.performer.root.visible)entry.performer.update(step,reduced)}
    const ground=project(observer),up=upAt(observer).normalize();followTarget.copy(ground).addScaledVector(up,Math.max(0,observer.clone().sub(ground).dot(up)-.8));
    if(!following||reduced||follower.position.distanceToSquared(followTarget)>24**2)follower.position.copy(followTarget);else{follower.position.lerp(followTarget,1-Math.exp(-step*5));followDelta.copy(followTarget).sub(follower.position);const distance=followDelta.length();if(distance>3)follower.position.addScaledVector(followDelta,1-3/distance)}
    follower.rotation.premultiply(yaw.setFromUnitVectors(vertical.clone().applyQuaternion(follower.rotation),up));following=true;followerElevation=Math.max(0,follower.position.clone().sub(project(follower.position)).dot(up));
    const density=streetLifeDensity(environment,quality,birdPopulation);
    const butterflyCount=density.butterflies;for(let index=0;index<butterflyCount;index++)flutter(butterflies,index,follower,flutterPaths[index],index,step,reduced);
    let ambientButterflyCount=0;for(const [index,path] of ambientFlutterPaths.entries()){
      if(ambientButterflyCount>=density.ambientButterflies||path.site.position.distanceToSquared(observer)>100**2)continue;
      flutter(ambientButterflies,ambientButterflyCount++,path.site,path,index+101,step,reduced,.5);
    }
    let fireflyCount=0;const haloPositions=haloGeometry.attributes.position,haloColors=haloGeometry.attributes.color;
    for(let index=0;index<density.fireflies;index++){
      const site=follower,phase=index*2.399+seed*.37,pulse=reduced?.72:.55+.25*Math.sin(time*.9+phase),path=fireflyPaths[index];if(!reduced){path.elapsed+=step;if(path.elapsed>=path.duration){path.elapsed-=path.duration;path.from.copy(path.to);path.to.copy(flutterPoint(index+31,++path.cycle));path.duration=3.8+((index*5+path.cycle*11+seed)%17)*.19}}
      followDelta.copy(path.from).lerp(path.to,T.MathUtils.smootherstep(path.elapsed/path.duration,0,1));followDelta.x+=Math.sin(time*.73+phase)*.13;followDelta.y+=Math.sin(time*.9+phase)*.1-.2;followDelta.z+=Math.sin(time*.57-phase)*.16;position.copy(surface(site,followDelta.x,followDelta.z,followDelta.y));yaw.setFromAxisAngle(vertical,Math.atan2(path.to.x-path.from.x,path.to.z-path.from.z));
      put(fireflies.body,fireflyCount,site,position,offset.set(0,0,0),yaw);put(fireflies.light,fireflyCount,site,position,offset.set(0,0,-.055).applyQuaternion(yaw),yaw,pulse);haloPositions.setXYZ(fireflyCount,position.x,position.y,position.z);haloColors.setXYZ(fireflyCount,pulse,pulse,pulse);fireflyCount++;
    }
    renderedBats.length=0;let batCount=0;for(const [index,bat] of batFlights.entries()){
      if(batCount>=density.bats||bat.site.position.distanceToSquared(observer)>130**2)continue;
      bat.elapsed=(bat.elapsed+(reduced?0:step))%bat.duration;const progress=bat.elapsed/bat.duration;bat.flight.getPoint(progress,bat.position);bat.flight.getTangent(progress,batForward);batUp.copy(upAt(bat.position)).normalize();batForward.projectOnPlane(batUp);if(batForward.lengthSq()<.0001)batForward.copy(forwardAxis).applyQuaternion(bat.site.rotation).projectOnPlane(batUp);batForward.normalize();batRight.crossVectors(batUp,batForward).normalize();bat.rotation.setFromRotationMatrix(batBasis.makeBasis(batRight,batUp,batForward));renderedBats.push(bat);yaw.identity();
      put(bats.body,batCount,bat,bat.position,offset.set(0,0,0),yaw);put(bats.head,batCount,bat,bat.position,offset.set(0,.10,.15),yaw);
      const flap=reduced?.2:Math.sin(bat.elapsed*16+index*2.399)*.72;
      for(const [wing,ear,eye,side] of [[bats.left,bats.leftEar,bats.leftEye,-1],[bats.right,bats.rightEar,bats.rightEye,1]] as const){fold.setFromAxisAngle(forwardAxis,side*flap);put(wing,batCount,bat,bat.position,offset.set(side*.075,.025,0),fold);put(ear,batCount,bat,bat.position,offset.set(side*.055,.24,.13),yaw);put(eye,batCount,bat,bat.position,offset.set(side*.052,.125,.237),yaw)}batCount++;
    }
    birdLife.update(step,reduced||density.birds===0);seeds.visible=density.birds>0&&birdLife.groundSites.some(site=>site.position.distanceToSquared(observer)<100**2);
    renderedBirds.length=0;let birdCount=0;for(const [index,bird] of birdLife.agents.slice().sort((first,second)=>first.position.distanceToSquared(observer)-second.position.distanceToSquared(observer)).entries()){
      if(birdCount>=density.birds||bird.position.distanceToSquared(observer)>130**2)continue;
      const site=bird,profile=streetBirdSpecies[bird.species],colors=birdColors.get(bird.species)!,flying=bird.mode==='flying',peck=bird.peck,drink=bird.drink;renderedBirds.push(bird);position.copy(bird.position);yaw.identity();fold.setFromAxisAngle(sideAxis,peck*.9+drink*1.05);birdLean.setFromAxisAngle(sideAxis,drink*.58);
      for(const [object,color] of [[birds.body,colors.body],[birds.head,colors.head],[birds.neck,colors.head],[birds.breast,colors.breast],[birds.left,colors.wing],[birds.right,colors.wing],[birds.tail,colors.tail],[birds.beak,colors.beak]] as const)object.setColorAt(birdCount,color);
      birdHead.set(0,.10-peck*.20,.24+peck*.12);birdBeak.set(0,.105-peck*.255,.37+peck*.13);
      if(drink>0&&bird.target.waterPosition){followDelta.copy(bird.target.waterPosition).sub(bird.position).applyQuaternion(birdInverse.copy(bird.rotation).invert()).divideScalar(profile.size);followDelta.y+=.025/profile.size;birdBeak.lerp(followDelta,drink);birdHead.lerp(offset.copy(followDelta).add(new T.Vector3(0,.115,-.105)),drink)}
      birdNeck.set(0,.02,.14).applyQuaternion(birdLean);birdNeckDirection.copy(birdHead).sub(birdNeck);const neckLength=birdNeckDirection.length();birdNeckRotation.setFromUnitVectors(vertical,birdNeckDirection.normalize());
      putBird(birds.body,birdCount,site,position,offset.set(0,-drink*.025,0),birdLean,1,1,profile.bodyLength);putBird(birds.breast,birdCount,site,position,offset.set(0,-.025,.15*profile.bodyLength).applyQuaternion(birdLean),birdLean);putBird(birds.neck,birdCount,site,position,offset.copy(birdNeck).add(birdHead).multiplyScalar(.5),birdNeckRotation,1,neckLength,1);putBird(birds.head,birdCount,site,position,offset.copy(birdHead),fold);putBird(birds.beak,birdCount,site,position,offset.copy(birdBeak),fold,1,1,profile.beakLength);putBird(birds.tail,birdCount,site,position,offset.set(0,.015,-.31-(profile.tailLength-1)*.1).applyQuaternion(birdLean),birdLean,1,1,profile.tailLength);
      for(const [eye,side] of [[birds.leftEye,-1],[birds.rightEye,1]] as const)putBird(eye,birdCount,site,position,offset.set(side*.073,.025,.06).applyQuaternion(fold).add(birdHead),fold);
      for(const [leg,foot,side] of [[birds.leftLeg,birds.leftFoot,-1],[birds.rightLeg,birds.rightFoot,1]] as const){putBird(leg,birdCount,site,position,offset.set(side*.07,flying?-.10:-.16,flying?-.08:0),yaw);putBird(foot,birdCount,site,position,offset.set(side*.07,flying?-.175:-.235,flying?-.02:.06),yaw)}
      const flap=flying?(reduced?.12:Math.sin(time*(8/profile.size)+index)*.55):-1.15;for(const [wing,side] of [[birds.left,-1],[birds.right,1]] as const){fold.setFromAxisAngle(forwardAxis,side*flap);if(flying)offset.set(side*.27*profile.wingSpan,.04,0).applyQuaternion(fold);else offset.set(side*.13,.015,-.04);putBird(wing,birdCount,site,position,offset,fold,profile.wingSpan*(flying?1:.45),1,flying?1:1.1)}birdCount++;
    }
    for(const object of Object.values(butterflies)){object.count=butterflyCount;object.instanceMatrix.needsUpdate=true}
    for(const object of Object.values(ambientButterflies)){object.count=ambientButterflyCount;object.instanceMatrix.needsUpdate=true}
    for(const object of Object.values(bats)){object.count=batCount;object.instanceMatrix.needsUpdate=true}
    for(const object of Object.values(fireflies)){object.count=fireflyCount;object.instanceMatrix.needsUpdate=true}
    for(const object of Object.values(birds)){object.count=birdCount;object.instanceMatrix.needsUpdate=true;if(object.instanceColor)object.instanceColor.needsUpdate=true}
    haloGeometry.setDrawRange(0,fireflyCount);haloPositions.needsUpdate=haloColors.needsUpdate=true;halos.visible=fireflyCount>0;
    Object.assign(stats,{butterflies:butterflyCount,ambientButterflies:ambientButterflyCount,fireflies:fireflyCount,birds:birdCount,bats:batCount});root.userData.motionTime=time;
  }
  update(0,true,false,new T.Vector3(),{morning:1,night:0});
  return {root,performers,habitats,reservations,butterflies,ambientButterflies,ambientFlutterPaths,fireflies,birds,birdLife,renderedBirds,bats,batFlights,renderedBats,seeds,halos,follower,stats,update,blocked:(point:T.Vector3,padding=.45)=>reservations.some(site=>{const delta=point.clone().sub(site.position),up=upAt(site.position),height=delta.dot(up);return height>-.3&&height<3.5&&delta.addScaledVector(up,-height).length()<site.radius+padding})};
}

