import * as T from 'three';
import {cityBlock,cityPalette} from './city-architecture';

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