import * as T from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import type {Settings} from './persistence';

export const kingdomBloom={strength:.12,radius:.12,threshold:1.6};

export function createKingdomPresentation(renderer:T.WebGLRenderer,scene:T.Scene,camera:T.Camera){
  let composer:EffectComposer|undefined,bloom:UnrealBloomPass|undefined,output:OutputPass|undefined;
  let width=1,height=1;
  const originalAutoReset=renderer.info.autoReset;renderer.info.autoReset=false;
  function release(){bloom?.materialHighPassFilter.dispose();bloom?.dispose();output?.dispose();composer?.dispose();composer=undefined;bloom=undefined;output=undefined}
  function resize(nextWidth:number,nextHeight:number){
    width=Math.max(1,nextWidth);height=Math.max(1,nextHeight);
    if(composer){composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(width,height)}
  }
  function quality(value:Settings['quality']){
    if(value==='low'){release();return}
    if(composer)return;
    const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:Math.min(2,renderer.capabilities.maxSamples)});
    composer=new EffectComposer(renderer,target);
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
    output=new OutputPass();composer.addPass(new RenderPass(scene,camera));composer.addPass(bloom);composer.addPass(output);
    resize(width,height);
  }
  return {
    quality,resize,
    render:()=>{renderer.info.reset();if(composer)composer.render();else renderer.render(scene,camera)},
    dispose:()=>{release();renderer.info.autoReset=originalAutoReset},
  };
}