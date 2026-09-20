/**
 * Graphics quality tiers. Every tier keeps the same composition, lighting story and
 * effects hierarchy; only cost knobs change. Add knobs here rather than branching on
 * quality strings inside world systems.
 */
export type QualityTier='high'|'balanced'|'low';
export type QualityChoice=QualityTier|'auto';
export type QualityProfile={label:string;pixelRatio:number;shadows:boolean;shadowMapSize:number;shadowInterval:number;bloom:boolean};

export const qualityTiers:Record<QualityTier,QualityProfile>={
  high:{label:'High · sharp per-frame shadows',pixelRatio:1.5,shadows:true,shadowMapSize:4096,shadowInterval:0,bloom:true},
  balanced:{label:'Balanced · soft shadows',pixelRatio:1.25,shadows:true,shadowMapSize:2048,shadowInterval:.125,bloom:true},
  low:{label:'Low · lower pixel density, no shadows',pixelRatio:1,shadows:false,shadowMapSize:1024,shadowInterval:Infinity,bloom:false},
};
export const qualityChoices:QualityChoice[]=['auto','high','balanced','low'];
export const tierOrder:QualityTier[]=['low','balanced','high'];
export const isQualityChoice=(value:unknown):value is QualityChoice=>typeof value==='string'&&(qualityChoices as string[]).includes(value);

export const qualityThresholds={demoteP95Ms:30,promoteP95Ms:12,promoteWindows:2};

/**
 * Chooses a tier from measured frame-time windows. Demotion is immediate; promotion needs
 * consecutive calm windows and never returns to a tier this session already stepped down from.
 */
export function createQualityGovernor(initial:QualityTier='balanced'){
  let tier=initial,ceiling:QualityTier='high',calmWindows=0;
  const rank=(value:QualityTier)=>tierOrder.indexOf(value);
  return {
    get tier(){return tier},
    get ceiling(){return ceiling},
    reset(next:QualityTier=initial){tier=next;ceiling='high';calmWindows=0},
    /** Feed one measurement window. Returns the new tier when it changes, otherwise null. */
    sample(p95Ms:number):QualityTier|null{
      if(!Number.isFinite(p95Ms)||p95Ms<=0)return null;
      if(p95Ms>qualityThresholds.demoteP95Ms){calmWindows=0;if(rank(tier)===0)return null;ceiling=tierOrder[rank(tier)-1];tier=ceiling;return tier}
      if(p95Ms<qualityThresholds.promoteP95Ms){calmWindows++;if(calmWindows>=qualityThresholds.promoteWindows&&rank(tier)<rank(ceiling)){calmWindows=0;tier=tierOrder[rank(tier)+1];return tier}}
      else calmWindows=0;
      return null;
    },
  };
}
