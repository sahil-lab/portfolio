import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import type {Settings} from './persistence';
import {createShaderPreparation} from './shader-preparation';

export const kingdomBloom={strength:.12,radius:.12,threshold:1.6};
export const kingdomOcclusion={pixelBudget:600000,radius:2.4,thickness:1.4,strength:.78};
export const presentationPixelBudget=1600000;
export function presentationPixelRatio(width:number,height:number,ratio:number){return Math.min(ratio,Math.sqrt(presentationPixelBudget/Math.max(1,width*height)))}

const drawingSize=new T.Vector2();
export function resizeRenderer(renderer:T.WebGLRenderer,width:number,height:number,ratio:number){
  renderer.getSize(drawingSize);
  if(drawingSize.x===width&&drawingSize.y===height&&renderer.getPixelRatio()===ratio)return false;
  renderer.setDrawingBufferSize(width,height,ratio);renderer.domElement.style.width=width+'px';renderer.domElement.style.height=height+'px';return true;
}

export function createKingdomPresentation(renderer:T.WebGLRenderer,scene:T.Scene,camera:T.Camera){
  let composer:EffectComposer|undefined,occlusion:GTAOPass|undefined,bloom:UnrealBloomPass|undefined,output:OutputPass|undefined,antialias:ShaderPass|undefined;
  let width=1,height=1;
  const shaders=createShaderPreparation(renderer,scene,camera,()=>composer?.readBuffer??null);
  const originalAutoReset=renderer.info.autoReset;renderer.info.autoReset=false;
  function release(){occlusion?.gtaoMaterial.dispose();occlusion?.blendMaterial.dispose();occlusion?.dispose();bloom?.materialHighPassFilter.dispose();bloom?.dispose();output?.dispose();antialias?.dispose();composer?.dispose();composer=undefined;occlusion=undefined;bloom=undefined;output=undefined;antialias=undefined}
  function resize(nextWidth:number,nextHeight:number){
    width=Math.max(1,nextWidth);height=Math.max(1,nextHeight);
    if(composer){const ratio=presentationPixelRatio(width,height,renderer.getPixelRatio());composer.setPixelRatio(ratio);composer.setSize(width,height);antialias?.uniforms.resolution.value.set(1/(width*ratio),1/(height*ratio))}
  }
  function quality(value:Settings['quality']){
    if(value==='low'){release();return}
    if(composer)return;
    const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:0,depthTexture:new T.DepthTexture(1,1,T.UnsignedIntType)});
    composer=new EffectComposer(renderer,target);
    occlusion=new GTAOPass(scene,camera,1,1);occlusion.setGBuffer(composer.readBuffer.depthTexture!);
    occlusion.blendIntensity=kingdomOcclusion.strength;
    occlusion.updateGtaoMaterial({radius:kingdomOcclusion.radius,thickness:kingdomOcclusion.thickness,distanceExponent:1,distanceFallOff:1,scale:1.15,samples:8});
    occlusion.updatePdMaterial({radius:4,samples:8,rings:2,lumaPhi:10,depthPhi:1,normalPhi:3});
    const resizeOcclusion=occlusion.setSize.bind(occlusion);
    occlusion.setSize=(nextWidth,nextHeight)=>{const ratio=Math.min(1,Math.sqrt(kingdomOcclusion.pixelBudget/Math.max(1,nextWidth*nextHeight)));resizeOcclusion(Math.max(1,Math.floor(nextWidth*ratio)),Math.max(1,Math.floor(nextHeight*ratio)))};
    bloom=new UnrealBloomPass(new T.Vector2(1,1),kingdomBloom.strength,kingdomBloom.radius,kingdomBloom.threshold);
    bloom.materialHighPassFilter.fragmentShader=`
      uniform sampler2D tDiffuse;
      uniform float luminosityThreshold;
      uniform float smoothWidth;
      varying vec2 vUv;
      void main(){
        vec3 radiance=texture2D(tDiffuse,vUv).rgb;
        float luminance=dot(radiance,vec3(.2126,.7152,.0722));
        float highlight=smoothstep(luminosityThreshold,luminosityThreshold+smoothWidth,luminance);
        gl_FragColor=vec4(min(radiance,vec3(2.0))*highlight,1.0);
      }
    `;
    output=new OutputPass();antialias=new ShaderPass(FXAAShader);composer.addPass(new RenderPass(scene,camera));composer.addPass(occlusion);composer.addPass(bloom);composer.addPass(output);composer.addPass(antialias);
    resize(width,height);
  }
  return {
    quality,resize,prepare:shaders.prepare,finishPreparation:shaders.dispose,
    get pending(){return shaders.pending},
    render:()=>{const target=renderer.getRenderTarget(),autoClear=renderer.autoClear,overrideMaterial=scene.overrideMaterial;try{renderer.info.reset();if(composer){occlusion?.setGBuffer(composer.readBuffer.depthTexture!);composer.render()}else renderer.render(scene,camera)}catch(error){renderer.setRenderTarget(target);renderer.autoClear=autoClear;scene.overrideMaterial=overrideMaterial;throw error}},
    dispose:()=>{release();renderer.info.autoReset=originalAutoReset},
  };
}