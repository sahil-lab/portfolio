import * as T from 'three';
import {cityBlock,cityPalette} from './city-architecture';
import {worldKitGeometry,worldKitReady} from './world-kit';

function roundedOutline(width:number,depth:number,radius:number){
  const shape=new T.Shape(),halfWidth=width/2,halfDepth=depth/2;
  shape.moveTo(-halfWidth+radius,-halfDepth);shape.lineTo(halfWidth-radius,-halfDepth);shape.quadraticCurveTo(halfWidth,-halfDepth,halfWidth,-halfDepth+radius);
  shape.lineTo(halfWidth,halfDepth-radius);shape.quadraticCurveTo(halfWidth,halfDepth,halfWidth-radius,halfDepth);shape.lineTo(-halfWidth+radius,halfDepth);shape.quadraticCurveTo(-halfWidth,halfDepth,-halfWidth,halfDepth-radius);
  shape.lineTo(-halfWidth,-halfDepth+radius);shape.quadraticCurveTo(-halfWidth,-halfDepth,-halfWidth+radius,-halfDepth);shape.closePath();return shape;
}

export function createArtificialTurf(width:number,depth:number){
  const data=new Uint8Array(32*32*4);
  for(let row=0;row<32;row++)for(let column=0;column<32;column++){
    const grain=(column*17+row*29)%13,band=Math.floor(row/8)%2?8:0;data.set([67+grain+band,133+grain+band,49+grain,255],(row*32+column)*4);
  }
  const texture=new T.DataTexture(data,32,32,T.RGBAFormat);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(Math.max(1,width/2),Math.max(1,depth/2));texture.magFilter=T.LinearFilter;texture.needsUpdate=true;
  const material=new T.MeshStandardMaterial({color:'#b8e498',map:texture,roughness:1});material.userData.surface='natural';
  const turf=new T.Mesh(new T.ShapeGeometry(roundedOutline(width,depth,Math.min(.5,width/4,depth/4)),8).rotateX(-Math.PI/2),material);turf.name='City_ArtificialTurf';turf.receiveShadow=true;return turf;
}

export type PocketGardenMaterials={turf:T.MeshStandardMaterial;edge:T.MeshStandardMaterial;leaf:T.MeshStandardMaterial;bloom:T.MeshStandardMaterial;stone:T.MeshStandardMaterial};
export function createPocketGarden(width:number,depth:number,seed=0,accent='#d9a3b4',ground:(x:number,z:number)=>number=()=>0,shared?:PocketGardenMaterials){
  const root=new T.Group();root.name='Garden_PlantedIsland';root.userData.authoredKit=worldKitReady();
  const points=Array.from({length:8},(_,index)=>{const angle=index*Math.PI/4,radius=.92+.06*Math.sin(index*2.1+seed);return new T.Vector3(Math.cos(angle)*width*.5*radius,.055,Math.sin(angle)*depth*.5*radius)}),curve=new T.CatmullRomCurve3(points,true,'centripetal'),outline=curve.getPoints(40),positions=[0,0,0],uvs=[.5,.5],indices:number[]=[];
  for(let ring=1;ring<=4;ring++)for(let index=0;index<40;index++){const point=outline[index],horizontal=point.x*ring/4,forward=point.z*ring/4,current=1+(ring-1)*40+index,next=1+(ring-1)*40+(index+1)%40;positions.push(horizontal,0,forward);uvs.push(horizontal/width+.5,forward/depth+.5);if(ring===1)indices.push(0,next,current);else{const inner=current-40,innerNext=next-40;indices.push(inner,innerNext,current,innerNext,next,current)}}
  const lawnGeometry=new T.BufferGeometry();lawnGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));lawnGeometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));lawnGeometry.setIndex(indices);
  const lawn=shared?new T.Mesh(lawnGeometry,shared.turf):createArtificialTurf(width,depth);if(!shared){lawn.geometry.dispose();lawn.geometry=lawnGeometry;lawn.material.color.set('#a7c4a1')}lawn.name='Garden_TexturedTurf';lawn.receiveShadow=true;
  const grass=lawn.geometry.attributes.position;for(let index=0;index<grass.count;index++)grass.setY(index,ground(grass.getX(index),grass.getZ(index))+.04);lawn.geometry.computeVertexNormals();root.add(lawn);
  const edgeGeometry=new T.TubeGeometry(curve,32,.065,5,true),edgePositions=edgeGeometry.attributes.position;for(let index=0;index<edgePositions.count;index++)edgePositions.setY(index,edgePositions.getY(index)+ground(edgePositions.getX(index),edgePositions.getZ(index)));edgeGeometry.computeVertexNormals();
  const edge=new T.Mesh(edgeGeometry,shared?.edge??new T.MeshStandardMaterial({color:'#c4ccbc',roughness:.94}));edge.name='Garden_RoundedEdging';edge.receiveShadow=true;root.add(edge);
  const leaf=shared?.leaf??new T.MeshStandardMaterial({color:'#668a65',roughness:1}),bloom=shared?.bloom??new T.MeshStandardMaterial({color:accent,roughness:.95}),stone=shared?.stone??new T.MeshStandardMaterial({color:'#d5d4c4',roughness:1});leaf.userData.surface=bloom.userData.surface=stone.userData.surface='natural';
  const shrubGeometry=worldKitGeometry('Kit_Shrub'),flowerGeometry=worldKitGeometry('Kit_Blossom')?.scale(.085,.085,.085);if(shrubGeometry)leaf.vertexColors=true;if(flowerGeometry)bloom.vertexColors=true;
  const count=Math.min(10,Math.max(4,Math.ceil(width*depth*.8))),shrubs=new T.InstancedMesh(shrubGeometry??new T.SphereGeometry(1,8,5),leaf,count),flowers=new T.InstancedMesh(flowerGeometry??new T.SphereGeometry(.085,6,4),bloom,18),pebbles=new T.InstancedMesh(new T.SphereGeometry(1,6,4),stone,4),pose=new T.Object3D();shrubs.name='Garden_RoundedShrubs';flowers.name='Garden_MeadowFlowers';pebbles.name='Garden_RiverPebbles';
  for(let index=0;index<count;index++){const angle=index*2.399963+seed,radius=Math.sqrt((index+.5)/count)*.65,horizontal=Math.cos(angle)*width*.5*radius,forward=Math.sin(angle)*depth*.5*radius,size=.21+(index%3)*.055;pose.position.set(horizontal,ground(horizontal,forward)+size*.55,forward);pose.scale.set(size*1.5,size*.75,size*1.2);pose.rotation.set(0,angle,0);pose.updateMatrix();shrubs.setMatrixAt(index,pose.matrix);shrubs.setColorAt(index,new T.Color(index%3===0?'#8cad78':index%3===1?'#557d65':'#72996b'))}
  for(let index=0;index<18;index++){const angle=index*2.399963+seed+.7,radius=.2+Math.sqrt(index/18)*.57,horizontal=Math.cos(angle)*width*.43*radius,forward=Math.sin(angle)*depth*.43*radius;pose.position.set(horizontal,ground(horizontal,forward)+.24+(index%3)*.025,forward);pose.scale.set(1.1,.75,1.1);pose.rotation.set(0,angle,0);pose.updateMatrix();flowers.setMatrixAt(index,pose.matrix)}
  for(let index=0;index<4;index++){const angle=seed+index*.7,horizontal=Math.cos(angle)*width*.36,forward=Math.sin(angle)*depth*.36;pose.position.set(horizontal,ground(horizontal,forward)+.065,forward);pose.scale.set(.22+index*.025,.075,.17);pose.rotation.set(0,angle,0);pose.updateMatrix();pebbles.setMatrixAt(index,pose.matrix)}
  for(const instances of [shrubs,flowers,pebbles]){instances.computeBoundingSphere();instances.receiveShadow=true;root.add(instances)}shrubs.castShadow=true;
  return {root,lawn,width,depth,materials:{turf:lawn.material,edge:edge.material,leaf,bloom,stone}};
}

export function createPoolCourt(options:{width?:number;depth?:number;accent?:string}={}){
  const width=options.width??7,depth=options.depth??4,root=new T.Group();root.name='City_SwimmingPoolCourt';
  const pearl=new T.MeshStandardMaterial({color:cityPalette.pearl,roughness:.69}),stone=new T.MeshStandardMaterial({color:'#a8b7bd',roughness:.85}),blue=new T.MeshStandardMaterial({color:options.accent??'#147fb8',roughness:.45}),chrome=new T.MeshStandardMaterial({color:'#d1e0e6',roughness:.26,metalness:.83});
  const edge=roundedOutline(width,depth,.72),inner=roundedOutline(width-.58,depth-.58,.46);edge.holes.push(new T.Path(inner.getPoints(8)));
  const rim=new T.Mesh(new T.ExtrudeGeometry(edge,{depth:.24,steps:1,bevelEnabled:true,bevelSize:.035,bevelThickness:.02,bevelSegments:2,curveSegments:8}).rotateX(-Math.PI/2),pearl);rim.position.y=.16;rim.name='Pool_RoundedCoping';rim.castShadow=rim.receiveShadow=true;root.add(rim);
  const deck=new T.Mesh(cityBlock(width+3.4,.14,depth+3,.25),stone);deck.position.y=.055;deck.name='Pool_Terrace';deck.receiveShadow=true;root.add(deck);
  const foundation=new T.Mesh(cityBlock(width+3.36,.48,depth+2.96,.2),stone);foundation.position.y=-.19;foundation.name='Pool_GroundedFoundation';foundation.receiveShadow=true;root.add(foundation);
  const lining=new T.Mesh(new T.ShapeGeometry(roundedOutline(width-.42,depth-.42,.48),8).rotateX(-Math.PI/2),blue);lining.name='Pool_TiledBasin';lining.position.y=.15;root.add(lining);
  const waterData=new Uint8Array(64*64*4);
  for(let row=0;row<64;row++)for(let column=0;column<64;column++){
    const wave=Math.max(0,Math.sin(column*.37+Math.sin(row*.24)*2)*Math.cos(row*.43+column*.14));waterData.set([37+wave*80,155+wave*57,205+wave*36,255],(row*64+column)*4);
  }
  const waterTexture=new T.DataTexture(waterData,64,64,T.RGBAFormat);waterTexture.colorSpace=T.SRGBColorSpace;waterTexture.wrapS=waterTexture.wrapT=T.RepeatWrapping;waterTexture.repeat.set(2,2);waterTexture.magFilter=T.LinearFilter;waterTexture.needsUpdate=true;
  const waterMaterial=new T.MeshPhysicalMaterial({color:'#96e1f7',map:waterTexture,roughness:.17,metalness:.14,clearcoat:.9,clearcoatRoughness:.18});
  waterMaterial.userData.surface='water';
  const water=new T.Mesh(new T.ShapeGeometry(roundedOutline(width-.63,depth-.63,.45),8).rotateX(-Math.PI/2),waterMaterial);water.name='Pool_BlueWater';water.position.y=.23;root.add(water);
  for(const side of [-1,1]){
    const turf=createArtificialTurf(width+2.9,.84);turf.position.set(0,.132,side*(depth/2+1));root.add(turf);
    const lounger=new T.Mesh(cityBlock(1.45,.055,.55,.06),side<0?pearl:blue);lounger.position.set(width/2+.94,.22,side*.87);lounger.rotation.y=Math.PI/2;lounger.name='Pool_Lounger';root.add(lounger);
    const back=new T.Mesh(cityBlock(.5,.08,.58,.05),pearl);back.position.set(width/2+.93,.39,side*.87-.5);back.rotation.x=-.55;root.add(back);
    const points=[new T.Vector3(side*.36,.26,depth/2+.37),new T.Vector3(side*.36,1.05,depth/2+.25),new T.Vector3(side*.36,1.05,depth/2-.35),new T.Vector3(side*.36,.2,depth/2-.53)];
    const handrail=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),24,.045,7,false),chrome);handrail.name='Pool_LadderRail';root.add(handrail);
  }
  for(let rung=0;rung<3;rung++){const step=new T.Mesh(new T.CylinderGeometry(.035,.035,.72,8).rotateZ(Math.PI/2),chrome);step.position.set(0,.23+rung*.22,depth/2-.49);step.name='Pool_LadderRung';root.add(step)}
  root.userData.poolFootprint={width,depth};
  return {root,water,width,depth,
    contains:(x:number,z:number,padding=.4)=>Math.abs(x)<width/2+padding&&Math.abs(z)<depth/2+padding,
    update:(dt:number,reduced:boolean)=>{if(!reduced){const step=Number.isFinite(dt)?T.MathUtils.clamp(dt,0,.1):0;waterTexture.offset.x=(waterTexture.offset.x+step*.017)%1;waterTexture.offset.y=(waterTexture.offset.y+step*.009)%1}},
  };
}