import * as T from 'three';

export function createKettleSteam(){
 const root=new T.Group();root.name='Kettle_Steam';root.position.set(7.96,7.5,0);
 const textureSize=64,pixels=new Uint8Array(textureSize*textureSize*4);
 for(let row=0;row<textureSize;row++)for(let column=0;column<textureSize;column++){
  const horizontal=(column+.5)/textureSize*2-1,vertical=(row+.5)/textureSize*2-1,radius=Math.hypot(horizontal,vertical);
  const edge=Math.max(0,1-radius),wisps=.76+.13*Math.sin(horizontal*13+Math.sin(vertical*8))+.11*Math.cos(vertical*16-horizontal*6),offset=(row*textureSize+column)*4;
  pixels.set([255,255,255,Math.round(Math.pow(edge,1.7)*wisps*255)],offset);
 }
 const texture=new T.DataTexture(pixels,textureSize,textureSize,T.RGBAFormat);texture.minFilter=texture.magFilter=T.LinearFilter;texture.needsUpdate=true;
 const count=24,geometry=new T.PlaneGeometry(1,1),opacity=new T.InstancedBufferAttribute(new Float32Array(count),1);opacity.setUsage(T.DynamicDrawUsage);geometry.setAttribute('puffOpacity',opacity);
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{vaporMap:{value:texture},vaporColor:{value:new T.Color('#e6f0ed')}},
  vertexShader:`attribute float puffOpacity;
varying vec2 vaporUv;
varying float vaporOpacity;
void main(){
 vaporUv=uv;vaporOpacity=puffOpacity;
 vec4 center=modelViewMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0);
 vec2 size=vec2(length(modelViewMatrix[0].xyz)*length(instanceMatrix[0].xyz),length(modelViewMatrix[1].xyz)*length(instanceMatrix[1].xyz));
 center.xy+=position.xy*size;
 gl_Position=projectionMatrix*center;
}`,
  fragmentShader:`uniform sampler2D vaporMap;
uniform vec3 vaporColor;
varying vec2 vaporUv;
varying float vaporOpacity;
void main(){
 float alpha=texture2D(vaporMap,vaporUv).a*vaporOpacity;
 if(alpha<0.002)discard;
 gl_FragColor=vec4(vaporColor,alpha);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`,
 });
 material.addEventListener('dispose',()=>texture.dispose());
 const puffs=new T.InstancedMesh(geometry,material,count);puffs.name='Kettle_RisingVapor';puffs.instanceMatrix.setUsage(T.DynamicDrawUsage);puffs.frustumCulled=false;root.add(puffs);
 const dummy=new T.Object3D();let time=0;
 function update(delta:number,reduced:boolean,active=true,wind=0){
  root.visible=active;if(!active)return;
  if(!reduced&&Number.isFinite(delta))time+=Math.max(0,Math.min(.1,delta));
  const drift=T.MathUtils.clamp(Number.isFinite(wind)?wind:0,0,70)*.013;
  for(let index=0;index<count;index++){
   const life=(time*.19+index/count)%1,spread=.08+life*.65,angle=index*2.39996+time*.33;
   dummy.position.set(life*(1.7+drift)+Math.sin(angle)*spread,life*6.8,Math.cos(angle)*spread);
   const diameter=.55+life*3.9;dummy.scale.set(diameter,diameter*1.18,1);dummy.updateMatrix();puffs.setMatrixAt(index,dummy.matrix);
  opacity.setX(index,Math.sin(life*Math.PI)*(.38+index%3*.045));
  }
  puffs.instanceMatrix.needsUpdate=true;opacity.needsUpdate=true;
 }
 update(0,true);
 return {root,puffs,update,get time(){return time}};
}
