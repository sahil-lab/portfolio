import * as T from 'three';

export const workshopBakeSurfaces=[
  {name:'workshop-ambient-deck',position:[-.8,.814,17.6],width:15.8,height:8.1,wall:false},
  {name:'workshop-ambient-forecourt',position:[0,.781,24.35],width:26,height:5.3,wall:false},
  {name:'workshop-ambient-wall',position:[-4.8,3.4,12.512],width:8.35,height:5.75,wall:true},
] as const;

export function loadWorkshopLighting(root:T.Object3D){
  if(typeof window==='undefined')return;
  const loader=new T.TextureLoader(),names=['Atelier_DeckContact','Atelier_ForecourtContact','Atelier_ShelfContact'],opacity=[.7,.8,.5];
  workshopBakeSurfaces.forEach((surface,index)=>{
    const mesh=root.getObjectByName(names[index]) as T.Mesh<T.PlaneGeometry,T.MeshBasicMaterial>|undefined;if(!mesh)return;
    const material=mesh.material;let alive=true;
    const disposed=()=>{alive=false;material.removeEventListener('dispose',disposed)};material.addEventListener('dispose',disposed);
    const pending=loader.load(`/assets/${surface.name}.png`,texture=>{
      if(!alive){texture.dispose();return}
      const fallback=material.map;texture.name=surface.name;texture.anisotropy=4;material.map=texture;material.opacity=opacity[index];material.needsUpdate=true;mesh.userData.bakedAmbient=true;fallback?.dispose();material.removeEventListener('dispose',disposed);
    },undefined,()=>{pending.dispose();material.removeEventListener('dispose',disposed)});
  });
}

export function workshopOcclusionPixels(blocked:Float32Array,open:Float32Array){
  const pixels=new Uint8Array(blocked.length);
  for(let offset=0;offset<blocked.length;offset+=4){
    const reference=open[offset],sample=blocked[offset];
    const shade=Number.isFinite(sample)&&reference>.001?T.MathUtils.clamp(1-sample/reference,0,1):0;
    pixels[offset]=pixels[offset+1]=pixels[offset+2]=255;pixels[offset+3]=Math.round(shade*.6*255);
  }
  return pixels;
}

type BakeWorld={scene:T.Scene;camera:T.Camera;renderer:T.WebGLRenderer;workshop:{root:T.Group};setPaused:(value:boolean)=>void};

export async function bakeWorkshopLighting(world:BakeWorld,resolution=512,samples=48){
  const {ProgressiveLightMap}=await import('three/addons/misc/ProgressiveLightMap.js');
  const renderer=world.renderer,scale=world.scene.scale.x,started=performance.now();
  const original={target:renderer.getRenderTarget(),toneMapping:renderer.toneMapping,shadows:renderer.shadowMap.enabled,shadowType:renderer.shadowMap.type,autoShadow:renderer.shadowMap.autoUpdate};
  const blockerMaterial=new T.MeshBasicMaterial({color:'#ffffff',colorWrite:false,depthWrite:false}),blockers:T.Mesh[]=[];
  const roots:T.Object3D[]=[world.workshop.root],press=world.scene.getObjectByName('PacketPress_Placement');if(press)roots.push(press);
  world.scene.updateMatrixWorld(true);
  for(const root of roots)root.traverseVisible(source=>{
    if(!(source instanceof T.Mesh)||!source.castShadow)return;
    const materials=Array.isArray(source.material)?source.material:[source.material];if(materials.every(material=>material.transparent))return;
    let clone:T.Mesh;
    if(source instanceof T.InstancedMesh){const instances=new T.InstancedMesh(source.geometry,blockerMaterial,source.count);instances.instanceMatrix.copy(source.instanceMatrix);instances.computeBoundingSphere();clone=instances}
    else clone=new T.Mesh(source.geometry,blockerMaterial);
    clone.name='Bake_'+source.name;clone.matrix.copy(source.matrixWorld);clone.matrixAutoUpdate=false;clone.castShadow=true;clone.receiveShadow=false;blockers.push(clone);
  });
  const textures:{name:string;dataUrl:string;previewUrl:string;shadedPixels:number;levels:number;meanAlpha:number}[]=[];
  world.setPaused(true);renderer.toneMapping=T.NoToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=true;renderer.shadowMap.type=T.PCFShadowMap;
  try{
    for(const surface of workshopBakeSurfaces){
      const center=new T.Vector3(...surface.position).multiplyScalar(scale),normal=surface.wall?new T.Vector3(0,0,1):new T.Vector3(0,1,0);
      const horizontal=new T.Vector3(1,0,0),vertical=new T.Vector3().crossVectors(normal,horizontal);
      const geometry=new T.PlaneGeometry(surface.width*scale,surface.height*scale);if(!surface.wall)geometry.rotateX(-Math.PI/2);
      const material=new T.MeshStandardMaterial({color:'#ffffff',roughness:1}),receiver=new T.Mesh(geometry,material),parent=new T.Group();receiver.position.copy(center);parent.add(receiver);parent.updateMatrixWorld(true);
      const accumulator=new ProgressiveLightMap(renderer,resolution);accumulator.uvMat.specular.set(0);accumulator.uvMat.shininess=0;
      const light=new T.DirectionalLight('#ffffff',1);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.normalBias=.012;light.shadow.bias=-.00001;light.shadow.radius=1;
      Object.assign(light.shadow.camera,{left:-80,right:80,top:80,bottom:-80,near:.1,far:360});light.target.position.copy(center);accumulator.scene.add(light.target,...blockers);
      accumulator.addObjectsToLightMap([receiver,light]);
      async function sample(occluded:boolean){
        blockers.forEach(blocker=>blocker.visible=occluded);
        for(let index=0;index<samples;index++){
          const elevation=.12+.88*(index+.5)/samples,radius=Math.sqrt(1-elevation*elevation),angle=index*2.399963229728653;
          light.position.copy(center).addScaledVector(normal,elevation*130).addScaledVector(horizontal,Math.cos(angle)*radius*130).addScaledVector(vertical,Math.sin(angle)*radius*130);
          light.target.updateMatrixWorld();renderer.shadowMap.needsUpdate=true;accumulator.update(world.camera,index+1,false);
          if(index%8===7)await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
        }
        const target=accumulator.buffer1Active?accumulator.progressiveLightMap2:accumulator.progressiveLightMap1,data=new Float32Array(resolution*resolution*4);
        renderer.readRenderTargetPixels(target,0,0,resolution,resolution,data);return data;
      }
      try{
        const blocked=await sample(true),open=await sample(false),pixels=workshopOcclusionPixels(blocked,open);
        let shadedPixels=0,totalAlpha=0;const levels=new Set<number>();for(let offset=3;offset<pixels.length;offset+=4){if(pixels[offset]>12)shadedPixels++;levels.add(pixels[offset]);totalAlpha+=pixels[offset]}
        const canvas=document.createElement('canvas');canvas.width=canvas.height=resolution;const context=canvas.getContext('2d')!,image=context.createImageData(resolution,resolution);
        image.data.set(pixels);context.putImageData(image,0,0);const dataUrl=canvas.toDataURL('image/png');
        for(let offset=0;offset<pixels.length;offset+=4){image.data[offset]=image.data[offset+1]=image.data[offset+2]=255-pixels[offset+3];image.data[offset+3]=255}context.putImageData(image,0,0);
        textures.push({name:surface.name,dataUrl,previewUrl:canvas.toDataURL('image/png'),shadedPixels,levels:levels.size,meanAlpha:totalAlpha/(resolution*resolution)});
      }finally{
        blockers.forEach(blocker=>blocker.removeFromParent());geometry.dispose();material.dispose();light.shadow.map?.dispose();accumulator.progressiveLightMap1.dispose();accumulator.progressiveLightMap2.dispose();accumulator.uvMat.dispose();accumulator.blurringPlane?.geometry.dispose();accumulator.blurringPlane?.material.dispose();
      }
    }
  }finally{
    blockerMaterial.dispose();renderer.setRenderTarget(original.target);renderer.toneMapping=original.toneMapping;renderer.shadowMap.enabled=original.shadows;renderer.shadowMap.type=original.shadowType;renderer.shadowMap.autoUpdate=original.autoShadow;renderer.shadowMap.needsUpdate=true;world.setPaused(false);
  }
  return {resolution,samples,casters:blockers.length,durationMs:performance.now()-started,textures};
}
