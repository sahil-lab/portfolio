import * as T from 'three';

/**
 * Image-based lighting generated from the sky the player can actually see. A small
 * gradient dome (zenith, horizon, ground bounce) plus a soft glow around the key light is
 * rendered to a cubemap and prefiltered with PMREM, so reflections, broad highlights and
 * shade fill always agree with the current weather, time of day and planet orientation.
 * The PMREM target is reused between refreshes, so materials keep the same environment
 * texture identity and never rebuild their programs.
 */
export type SkyEnvironmentInput={sun:T.DirectionalLight;up:T.Vector3;zenith:T.Color;horizon:T.Color;ground:T.Color};

/**
 * Linear radiance scales that place the authored sky palette near the brightness of the former
 * studio HDR. `chroma` keeps part of the sky's colour in the fill (real skylight is far paler than
 * the zenith) and `floor` is a moonlit minimum so night shade never goes black.
 */
export const skyEnvironmentRadiance={sky:4.2,ground:3,glow:1.2,highlight:3.4,keyReference:2.6,chroma:.5,floor:.2};

export const skyEnvironmentShader={
  vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`uniform vec3 zenith;uniform vec3 horizon;uniform vec3 ground;uniform vec3 up;uniform vec3 sunDirection;uniform vec3 sunColor;uniform float glow;uniform float highlight;varying vec3 vDirection;
void main(){
	vec3 direction=normalize(vDirection);
	float height=dot(direction,up);
	vec3 sky=mix(horizon,zenith,smoothstep(0.0,0.72,height));
	vec3 bounce=mix(horizon*0.8,ground,smoothstep(0.0,0.35,-height));
	vec3 color=height>=0.0?sky:bounce;
	float toward=max(dot(direction,sunDirection),0.0);
	color+=sunColor*(glow*pow(toward,6.0)+highlight*pow(toward,48.0));
	gl_FragColor=vec4(color,1.0);
}`,
};

const quantize=(value:number,steps:number)=>Math.round(value*steps);
const direction=new T.Vector3(),grey=new T.Color();
/** Pales the sky colour toward its luminance and lifts dim night skies to the moonlit floor. */
export function skylightColor(target:T.Color,source:T.Color,radiance=skyEnvironmentRadiance){
  const luminance=source.r*.2126+source.g*.7152+source.b*.0722;
  target.copy(source).lerp(grey.setScalar(luminance),1-radiance.chroma);
  if(luminance<radiance.floor)target.multiplyScalar(radiance.floor/Math.max(luminance,1e-4));
  return target.multiplyScalar(radiance.sky);
}
/** Inputs rounded so slow sky cross-fades refresh the environment in small, infrequent steps. */
export function skyEnvironmentSignature(input:SkyEnvironmentInput){
  return writeSkyEnvironmentSignature(input,new Float64Array(19)).join(',');
}

function signatureColor(values:Float64Array,offset:number,color:T.Color,steps:number){
  values[offset]=quantize(color.r,steps);values[offset+1]=quantize(color.g,steps);values[offset+2]=quantize(color.b,steps);
}

function writeSkyEnvironmentSignature(input:SkyEnvironmentInput,values:Float64Array){
  direction.copy(input.sun.position).sub(input.sun.target.position).normalize();
  values[0]=quantize(direction.x,40);values[1]=quantize(direction.y,40);values[2]=quantize(direction.z,40);
  values[3]=quantize(input.up.x,40);values[4]=quantize(input.up.y,40);values[5]=quantize(input.up.z,40);
  signatureColor(values,6,input.zenith,48);signatureColor(values,9,input.horizon,48);signatureColor(values,12,input.ground,48);signatureColor(values,15,input.sun.color,32);
  values[18]=quantize(input.sun.intensity,20);return values;
}

export function createSkyEnvironment(renderer:T.WebGLRenderer,size=128){
  const uniforms={zenith:{value:new T.Color()},horizon:{value:new T.Color()},ground:{value:new T.Color()},up:{value:new T.Vector3(0,1,0)},sunDirection:{value:new T.Vector3(0,1,0)},sunColor:{value:new T.Color()},glow:{value:0},highlight:{value:0}};
  const material=new T.ShaderMaterial({uniforms,...skyEnvironmentShader,side:T.BackSide,depthTest:false,depthWrite:false,fog:false,toneMapped:false});
  const dome=new T.Mesh(new T.SphereGeometry(50,24,12),material);dome.name='SkyEnvironment_Dome';dome.frustumCulled=false;
  const stage=new T.Scene();stage.add(dome);
  const cube=new T.WebGLCubeRenderTarget(size,{type:T.HalfFloatType,generateMipmaps:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter,colorSpace:T.LinearSRGBColorSpace,depthBuffer:false});
  const capture=new T.CubeCamera(.1,100,cube);stage.add(capture);
  const generator=new T.PMREMGenerator(renderer);
  const signature=new Float64Array(19),nextSignature=new Float64Array(19);
  let prefiltered:T.WebGLRenderTarget|null=null,refreshed=-Infinity,dirty=true,generations=0;
  return {
    get texture(){return prefiltered?.texture??null},
    get generations(){return generations},
    /** Forces the next update to re-render, e.g. after the WebGL context was restored. */
    invalidate(){dirty=true},
    update(input:SkyEnvironmentInput,now:number,interval:number){
      if(!dirty&&now-refreshed<interval)return false;
      writeSkyEnvironmentSignature(input,nextSignature);
      if(!dirty){
        let unchanged=true;
        for(let index=0;index<signature.length;index++)if(signature[index]!==nextSignature[index]&&!(Number.isNaN(signature[index])&&Number.isNaN(nextSignature[index]))){unchanged=false;break}
        if(unchanged)return false;
      }
      skylightColor(uniforms.zenith.value,input.zenith);
      skylightColor(uniforms.horizon.value,input.horizon);
      uniforms.ground.value.copy(input.ground).multiplyScalar(skyEnvironmentRadiance.ground);
      uniforms.up.value.copy(input.up).normalize();
      uniforms.sunDirection.value.copy(input.sun.position).sub(input.sun.target.position).normalize();
      const strength=T.MathUtils.clamp(input.sun.intensity/skyEnvironmentRadiance.keyReference,0,1.25);
      uniforms.sunColor.value.copy(input.sun.color);uniforms.glow.value=skyEnvironmentRadiance.glow*strength;uniforms.highlight.value=skyEnvironmentRadiance.highlight*strength;
      capture.update(renderer,stage);
      prefiltered=generator.fromCubemap(cube.texture,prefiltered);
      signature.set(nextSignature);refreshed=now;dirty=false;generations++;
      return true;
    },
    dispose(){prefiltered?.dispose();prefiltered=null;cube.dispose();generator.dispose();material.dispose();dome.geometry.dispose()},
  };
}
