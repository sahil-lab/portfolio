import * as T from 'three';

/**
 * Smooths any flat record of numbers and hex colours toward a target so weather,
 * travel and district lighting changes cross-fade instead of snapping.
 * Numbers are exponentially damped; colours are blended in linear RGB.
 */
export type AtmosphereLook=Record<string,number|string>;
export type BlendRates<S extends AtmosphereLook>=Partial<Record<keyof S,number>>;

const scratchTarget=new T.Color();

export function createAtmosphereBlend<S extends AtmosphereLook>(initial:S,options:{rate?:number;rates?:BlendRates<S>}={}){
  const rate=options.rate??1.4,rates:BlendRates<S>=options.rates??{};
  const current={...initial};
  const colors=new Map<keyof S,T.Color>();
  for(const key of Object.keys(initial) as (keyof S)[]){const value=initial[key];if(typeof value==='string')colors.set(key,new T.Color(value))}
  function step(target:S,dt:number){
    if(dt<=0)return current;
    for(const key of Object.keys(target) as (keyof S)[]){
      const goal=target[key],speed=rates[key]??rate,alpha=1-Math.exp(-speed*dt);
      if(typeof goal==='number'){
        const value=current[key];
        (current as AtmosphereLook)[key as string]=typeof value==='number'?value+(goal-value)*alpha:goal;
      }else{
        let color=colors.get(key);
        if(!color){color=new T.Color(goal);colors.set(key,color)}
        scratchTarget.set(goal);
        if(Math.abs(color.r-scratchTarget.r)+Math.abs(color.g-scratchTarget.g)+Math.abs(color.b-scratchTarget.b)>.0005)color.lerp(scratchTarget,alpha);else color.copy(scratchTarget);
        (current as AtmosphereLook)[key as string]='#'+color.getHexString();
      }
    }
    return current;
  }
  function settle(target:S){
    for(const key of Object.keys(target) as (keyof S)[]){
      const goal=target[key];(current as AtmosphereLook)[key as string]=goal;
      if(typeof goal==='string')colors.set(key,(colors.get(key)??new T.Color()).set(goal));
    }
    return current;
  }
  return {get current(){return current},step,settle,color:(key:keyof S)=>colors.get(key)};
}
