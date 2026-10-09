import * as T from 'three';

/**
 * Display-referred finishing grade shared by every tone-mapped surface. It runs inside Three's
 * CustomToneMapping hook after the Khronos Neutral curve, so the direct renderer, the
 * postprocessing OutputPass and every quality tier produce the same finish. Values are linear
 * light before sRGB encoding: `lift` is a faint warm black floor so shadows never crush,
 * `vibrance` restores colour to muted mid-chroma surfaces while leaving saturated paint alone,
 * and `midtone` > 1 opens lower midtones (1 keeps the Neutral curve's midtones).
 */
export const kingdomGrade={lift:[.0034,.0031,.0027] as [number,number,number],vibrance:.3,midtone:1};
export type KingdomGrade=typeof kingdomGrade;

const hook='vec3 CustomToneMapping( vec3 color ) { return color; }';
const original=T.ShaderChunk.tonemapping_pars_fragment;
const glsl=(value:number)=>value.toFixed(5);

export function kingdomToneMappingGlsl(grade:KingdomGrade=kingdomGrade){
  const midtone=grade.midtone===1?'':`\n\tcolor = pow( color, vec3( ${glsl(1/grade.midtone)} ) );`;
  return `vec3 CustomToneMapping( vec3 color ) {
	color = NeutralToneMapping( color );
	float peak = max( color.r, max( color.g, color.b ) );
	float chroma = peak > 0.0001 ? ( peak - min( color.r, min( color.g, color.b ) ) ) / peak : 0.0;
	float luma = dot( color, vec3( 0.2126, 0.7152, 0.0722 ) );
	color = max( mix( vec3( luma ), color, 1.0 + ${glsl(grade.vibrance)} * ( 1.0 - chroma ) ), vec3( 0.0 ) );${midtone}
	const vec3 lift = vec3( ${grade.lift.map(glsl).join(', ')} );
	return lift + color * ( vec3( 1.0 ) - lift );
}`;
}

/** Patches the shared tonemapping chunk and returns the renderer tone mapping constant to use. */
export function installKingdomToneMapping(grade:KingdomGrade=kingdomGrade){
  if(!original.includes(hook))return T.NeutralToneMapping;
  T.ShaderChunk.tonemapping_pars_fragment=original.replace(hook,kingdomToneMappingGlsl(grade));
  return T.CustomToneMapping;
}

/** CPU mirror of the shader path (exposure, Neutral curve, grade) for calibration and tests. */
export function gradeDisplayColor(linear:[number,number,number],exposure=1,grade:KingdomGrade=kingdomGrade):[number,number,number]{
  let color=linear.map(channel=>channel*exposure) as [number,number,number];
  const darkest=Math.min(...color),offset=darkest<.08?darkest-6.25*darkest*darkest:.04;
  color=color.map(channel=>channel-offset) as [number,number,number];
  const peak=Math.max(...color),start=.76;
  if(peak>=start){const d=1-start,newPeak=1-d*d/(peak+d-start),desaturate=1-1/(.15*(peak-newPeak)+1);color=color.map(channel=>T.MathUtils.lerp(channel*newPeak/peak,newPeak,desaturate)) as [number,number,number]}
  const brightest=Math.max(...color),chroma=brightest>.0001?(brightest-Math.min(...color))/brightest:0,luma=color[0]*.2126+color[1]*.7152+color[2]*.0722;
  return color.map((channel,index)=>{const vivid=Math.max(0,T.MathUtils.lerp(luma,channel,1+grade.vibrance*(1-chroma)));return grade.lift[index]+Math.pow(vivid,1/grade.midtone)*(1-grade.lift[index])}) as [number,number,number];
}
