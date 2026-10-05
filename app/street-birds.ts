import * as T from 'three';

export const streetBirdPopulation=25;
export const mainlandBirdPopulation=55;
export const streetBirdSpecies={
  sparrow:{size:.80,body:'#967758',head:'#72533d',wing:'#634834',breast:'#decdae',tail:'#604831',beak:'#4b362a',wingSpan:.96,tailLength:.86,bodyLength:.9,beakLength:.78},
  robin:{size:.84,body:'#847d68',head:'#756c55',wing:'#605a4b',breast:'#e36e42',tail:'#62574b',beak:'#4a3f31',wingSpan:1,tailLength:1,bodyLength:.96,beakLength:.87},
  bluebird:{size:.82,body:'#497eb2',head:'#386ba1',wing:'#2c557e',breast:'#eccb92',tail:'#305775',beak:'#334554',wingSpan:1.02,tailLength:1.2,bodyLength:1,beakLength:1},
  pigeon:{size:.90,body:'#a0a9b4',head:'#668c86',wing:'#697684',breast:'#c2c8cf',tail:'#56616e',beak:'#a39484',wingSpan:1.04,tailLength:1.1,bodyLength:1.1,beakLength:1.05},
} as const;
export type StreetBirdSpecies=keyof typeof streetBirdSpecies;
type Anchor={id:string;position:T.Vector3;rotation:T.Quaternion};
export type BirdSpot=Anchor&{kind:'ground'|'perch'|'water';surface?:T.Mesh;waterPosition?:T.Vector3;waterSurface?:T.Mesh};
export type StreetBird={id:string;species:StreetBirdSpecies;position:T.Vector3;rotation:T.Quaternion;mode:'feeding'|'perched'|'drinking'|'flying';from:BirdSpot;target:BirdSpot;elapsed:number;duration:number;flight:T.CatmullRomCurve3;flightStyle:'arc'|'weave'|'swoop';peck:number;drink:number;visits:number};
type Options={sites:Anchor[];seed:number;population?:number;exclude:T.Object3D;project:(point:T.Vector3)=>T.Vector3;up:(point:T.Vector3)=>T.Vector3};

export function createStreetBirds(parent:T.Object3D,options:Options){
  let state=((options.seed+1)*2654435761)>>>0;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
  const groundSites:BirdSpot[]=options.sites.flatMap(site=>{const rotation=random()*Math.PI*2;return Array.from({length:4},(_,index)=>{const angle=rotation+index*Math.PI/2+(random()-.5)*.16,radius=1.2+random()*.35;return {id:site.id+'-feed-'+index,kind:'ground' as const,position:options.project(new T.Vector3(Math.sin(angle)*radius,0,Math.cos(angle)*radius).applyQuaternion(site.rotation).add(site.position)),rotation:site.rotation.clone()}})});
  const perches:BirdSpot[]=[],drinkSites:BirdSpot[]=[],pools:{root:T.Object3D;rim:T.Mesh;water:T.Mesh;width:number;depth:number}[]=[],meshes:T.Mesh[]=[],candidates:{mesh:T.Mesh;center:T.Vector3;size:number;score:number}[]=[];
  parent.updateWorldMatrix(true,true);
  const inverse=new T.Matrix4().copy(parent.matrixWorld).invert(),relative=new T.Matrix4(),instance=new T.Matrix4(),bounds=new T.Box3(),center=new T.Vector3();
  parent.traverse(object=>{
    const footprint=object.userData.poolFootprint;if(footprint){const rim=object.getObjectByName('Pool_RoundedCoping') as T.Mesh|undefined,water=object.getObjectByName('Pool_BlueWater') as T.Mesh|undefined;if(rim?.isMesh&&water?.isMesh)pools.push({root:object,rim,water,width:footprint.width,depth:footprint.depth})}
    const mesh=object as T.Mesh;if(!mesh.isMesh||!mesh.visible)return;
    const label=mesh.name+' '+(mesh.geometry.userData.authoredCraft??'');
    if(!/bench|table|seat|bollard|pedestal|ledge|roof|railing|column|binlid|lanterncap/i.test(label)||/leg|foot|support|brace|post|swing|seesaw/i.test(label))return;
    for(let ancestor:T.Object3D|null=mesh;ancestor;ancestor=ancestor.parent)if(ancestor===options.exclude||ancestor.userData.signatureAsset||/resident|courier|vehicle|metro|rocket|swing|seesaw/i.test(ancestor.name))return;
    if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();if(!mesh.geometry.boundingBox)return;meshes.push(mesh);
    const instanced=mesh as T.InstancedMesh,count=instanced.isInstancedMesh?instanced.count:1;
    for(let index=0;index<count;index++){
      relative.multiplyMatrices(inverse,mesh.matrixWorld);if(instanced.isInstancedMesh){instanced.getMatrixAt(index,instance);relative.multiply(instance)}
      bounds.copy(mesh.geometry.boundingBox).applyMatrix4(relative);bounds.getCenter(center);const size=bounds.getSize(new T.Vector3()).length(),height=center.clone().sub(options.project(center)).dot(options.up(center)),distance=Math.min(...groundSites.map(site=>site.position.distanceTo(center)));
      if(size>.25&&size<14&&height>.35&&height<6&&distance<24)candidates.push({mesh,center:center.clone(),size,score:distance+(/bench|table|seat/i.test(label)?0:5)});
    }
  });
  const ray=new T.Raycaster(),normalMatrix=new T.Matrix3(),worldScale=parent.getWorldScale(new T.Vector3()).length()/Math.sqrt(3);
  for(const candidate of candidates.sort((first,second)=>first.score-second.score).slice(0,180)){
    const up=options.up(candidate.center).normalize(),worldUp=up.clone().transformDirection(parent.matrixWorld),origin=parent.localToWorld(candidate.center.clone().addScaledVector(up,candidate.size+1));
    ray.set(origin,worldUp.clone().negate());ray.far=(candidate.size*2+2)*worldScale;
    const hit=ray.intersectObjects(meshes,false)[0];if(!hit?.face)continue;
    const mesh=hit.object as T.Mesh,point=parent.worldToLocal(hit.point.clone()),height=point.clone().sub(options.project(point)).dot(options.up(point));
    relative.multiplyMatrices(inverse,mesh.matrixWorld);if(hit.instanceId!==undefined){(mesh as T.InstancedMesh).getMatrixAt(hit.instanceId,instance);relative.multiply(instance)}
    const normal=hit.face.normal.clone().applyMatrix3(normalMatrix.getNormalMatrix(relative)).normalize();
    if(normal.dot(options.up(point))<.88||height<.4||height>6||perches.some(site=>site.position.distanceTo(point)<1.1))continue;
    const forward=new T.Vector3(0,0,1).projectOnPlane(up);if(forward.lengthSq()<.01)forward.set(1,0,0).projectOnPlane(up);forward.normalize();const right=new T.Vector3().crossVectors(up,forward).normalize();let supported=true;
    for(const side of [-1,1]){const foot=point.clone().addScaledVector(right,side*.1);ray.set(parent.localToWorld(foot.clone().addScaledVector(up,.3)),worldUp.clone().negate());ray.far=.4*worldScale;const contact=ray.intersectObject(mesh,false)[0];if(!contact||Math.abs(parent.worldToLocal(contact.point.clone()).sub(foot).dot(up))>.06)supported=false}
    if(!supported)continue;
    perches.push({id:'perch-'+mesh.name+'-'+perches.length,kind:'perch',position:point,rotation:new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,forward)),surface:mesh});
    if(perches.length===24)break;
  }
  for(const pool of pools)for(const side of [-1,1])for(const along of [-.28,.28]){
    if(drinkSites.length>=32)break;
    const up=new T.Vector3(0,1,0).transformDirection(pool.root.matrixWorld),horizontal=side*(pool.width/2-.14),forward=pool.depth*along;
    ray.set(pool.root.localToWorld(new T.Vector3(horizontal,2,forward)),up.clone().negate());ray.far=4*worldScale;const contact=ray.intersectObject(pool.rim,false)[0];if(!contact)continue;
    const point=parent.worldToLocal(contact.point.clone()),normal=options.up(point).normalize(),facing=new T.Vector3(-side,0,0).transformDirection(pool.root.matrixWorld).transformDirection(inverse).projectOnPlane(normal).normalize(),right=new T.Vector3().crossVectors(normal,facing).normalize();let supported=true;
    for(const footSide of [-1,1]){const foot=point.clone().addScaledVector(right,footSide*.07);ray.set(parent.localToWorld(foot.clone().addScaledVector(normal,.3)),up.clone().negate());ray.far=.4*worldScale;const hit=ray.intersectObject(pool.rim,false)[0];if(!hit||Math.abs(parent.worldToLocal(hit.point.clone()).sub(foot).dot(normal))>.025)supported=false}if(!supported)continue;
    ray.set(pool.root.localToWorld(new T.Vector3(side*(pool.width/2-.43),2,forward)),up.clone().negate());ray.far=4*worldScale;const water=ray.intersectObject(pool.water,false)[0];if(!water)continue;const waterPosition=parent.worldToLocal(water.point.clone()),drop=point.clone().sub(waterPosition).dot(normal);if(drop<-.05||drop>.3)continue;
    drinkSites.push({id:'pool-drink-'+drinkSites.length,kind:'water',position:point,rotation:new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,normal,facing)),surface:pool.rim,waterPosition,waterSurface:pool.water});
  }
  const modeAt=(spot:BirdSpot)=>spot.kind==='water'?'drinking' as const:spot.kind==='perch'?'perched' as const:'feeding' as const;
  const allSpots=[...groundSites,...perches,...drinkSites],claimed=new Set<BirdSpot>(),species=Object.keys(streetBirdSpecies) as StreetBirdSpecies[];
  const agents:StreetBird[]=groundSites.length?Array.from({length:Math.min(options.population??streetBirdPopulation,Math.max(0,allSpots.length-1))},(_,index)=>{
    const preferred=index%5===1&&drinkSites.length?drinkSites:index%3===1&&perches.length?perches:groundSites;let choices=preferred.filter(spot=>!claimed.has(spot));if(!choices.length)choices=allSpots.filter(spot=>!claimed.has(spot));
    const spot=choices[Math.floor(random()*choices.length)];claimed.add(spot);
    return {id:'bird-'+index,species:species[(index+options.seed)%species.length],position:spot.position.clone(),rotation:spot.rotation.clone(),mode:modeAt(spot),from:spot,target:spot,elapsed:0,duration:4+random()*7,flight:new T.CatmullRomCurve3(),flightStyle:'arc' as const,peck:0,drink:0,visits:0};
  }):[];
  function depart(bird:StreetBird){
    const choice=random(),preferred=drinkSites.length&&choice<.3?drinkSites:perches.length&&choice<.65?perches:groundSites;
    const available=(site:BirdSpot)=>site!==bird.target&&!agents.some(other=>other!==bird&&other.target===site);
    let choices=preferred.filter(site=>available(site)&&site.position.distanceTo(bird.target.position)<32);
    if(!choices.length)choices=allSpots.filter(site=>available(site)&&site.position.distanceTo(bird.target.position)<60);if(!choices.length)choices=allSpots.filter(available);if(!choices.length)return;
    bird.from=bird.target;bird.target=choices[Math.floor(random()*choices.length)];bird.mode='flying';bird.elapsed=0;
    const height=.25*streetBirdSpecies[bird.species].size,start=bird.from.position.clone().addScaledVector(options.up(bird.from.position),height),end=bird.target.position.clone().addScaledVector(options.up(bird.target.position),height),distance=start.distanceTo(end),direction=end.clone().sub(start),baseHeight=Math.max(start.clone().sub(options.project(start)).dot(options.up(start)),end.clone().sub(options.project(end)).dot(options.up(end)));
    bird.flightStyle=(['arc','weave','swoop'] as const)[Math.floor(random()*3)];const side=random()>.5?1:-1,points=[start],lift=2.2+random()*3.5+Math.min(5,distance*.12);
    for(let segment=1;segment<=3;segment++){const progress=segment/4,point=start.clone().lerp(end,progress),up=options.up(point).normalize(),right=new T.Vector3().crossVectors(up,direction).normalize(),bend=(bird.flightStyle==='weave'&&segment===2?-1:1)*side*(.5+random()*Math.min(5,1+distance*.18));point.addScaledVector(right,bend);const rise=bird.flightStyle==='swoop'?[.7,.38,1][segment-1]:Math.sin(progress*Math.PI);points.push(options.project(point).addScaledVector(options.up(point),baseHeight+lift*rise))}
    points.push(end);bird.flight=new T.CatmullRomCurve3(points,false,'centripetal');bird.duration=T.MathUtils.clamp(bird.flight.getLength()/(2.4+random()*2),2,24);
  }
  for(const [index,bird] of agents.entries())if(index%3===2){depart(bird);bird.elapsed=bird.duration*(.15+random()*.5)}
  function update(delta:number,reduced:boolean){
    const step=reduced?0:Number.isFinite(delta)?T.MathUtils.clamp(delta,0,.1):0;
    for(const [index,bird] of agents.entries()){
      bird.elapsed+=step;
      if(bird.elapsed>=bird.duration){if(bird.mode==='flying'){bird.mode=modeAt(bird.target);bird.elapsed=0;bird.duration=5+random()*9;bird.visits++}else depart(bird)}
      if(bird.mode==='flying'){
        const progress=T.MathUtils.smootherstep(bird.elapsed/bird.duration,0,1),forward=bird.flight.getTangent(progress),up=options.up(bird.flight.getPoint(progress,bird.position)).normalize();forward.projectOnPlane(up);
        if(forward.lengthSq()<.001)forward.set(0,0,1).applyQuaternion(bird.from.rotation).projectOnPlane(up);forward.normalize();const right=new T.Vector3().crossVectors(up,forward).normalize();bird.rotation.setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,forward));
      }else{bird.position.copy(bird.target.position).addScaledVector(options.up(bird.target.position),.25*streetBirdSpecies[bird.species].size);bird.rotation.copy(bird.target.rotation)}
      bird.peck=bird.mode==='feeding'&&!reduced?Math.max(0,Math.sin(bird.elapsed*6.5+index*1.7))**4:0;
      bird.drink=bird.mode==='drinking'&&!reduced?Math.max(0,Math.sin(bird.elapsed*3.2+index*.83))**2:0;
    }
  }
  update(0,false);
  return {agents,groundSites,perches,drinkSites,update};
}
