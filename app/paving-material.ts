import * as T from 'three';
import {worldKitRelief} from './world-kit';

const finishes=new WeakMap<T.Material,Map<string,T.MeshStandardMaterial>>();
const declarations='varying vec3 kitWorldPosition; varying vec3 kitWorldNormal;\n';
const sampling=`
vec4 kitSurface(vec3 point) {
 vec3 weights=pow(abs(normalize(kitWorldNormal)),vec3(6.0));
 weights/=max(dot(weights,vec3(1.0)),0.0001);
 return texture2D(bumpMap,point.yz*0.125)*weights.x+texture2D(bumpMap,point.xz*0.125)*weights.y+texture2D(bumpMap,point.xy*0.125)*weights.z;
}
vec2 kitHeightDerivative() {
 float center=kitSurface(kitWorldPosition).r;
 return bumpScale*vec2(kitSurface(kitWorldPosition+dFdx(kitWorldPosition)).r-center,kitSurface(kitWorldPosition+dFdy(kitWorldPosition)).r-center);
}
`;

export function applyAuthoredPaving(mesh:T.Mesh){
 if(Array.isArray(mesh.material))return false;
 const original=mesh.material as T.MeshStandardMaterial;if(!original.isMeshStandardMaterial||original.userData.authoredPaving)return false;
 const name=mesh.name;
 if(/(?:Centerline|Marking|Dash|GradedShoulder|Turf|Flower|GroundTether)/i.test(name))return false;
 const asphalt=/ConnectedStreets|CurvedAsphalt|(?:Latitude|Meridian)_Road_\d+$|Realm_StationApproach|Quarter_(?:South|Side|North)Street/.test(name);
 if(!asphalt&&!original.userData.cityPaving&&!/Paving|PavedSquare|Pavement|BlockWalk|Walkway|WalkingLoop|Boulevard$|Crosswalk$|PublicPlace_Ground|CourtyardFloor|Forecourt$|EntryDeck$|Pool_Terrace|ReadingCourt|ReadingWalk|StreetApproach|InsetSquare|Sidewalk/.test(name))return false;
 const kind=asphalt?'asphalt':'stone',cache=finishes.get(original)??new Map<string,T.MeshStandardMaterial>();let finish=cache.get(kind);
 if(!finish){
  const texture=worldKitRelief(kind);if(!texture)return false;
    finish=original.clone();finish.userData.authoredPaving=kind;finish.userData.cityPaving=true;finish.normalMap=null;finish.bumpMap=finish.roughnessMap=texture;finish.bumpScale=asphalt?.055:.16;
    if(original.userData.premiumSurface)finish.map=null;
  const previous=original.onBeforeCompile.bind(original),key=original.customProgramCacheKey();
  finish.onBeforeCompile=(shader,renderer)=>{
   previous(shader,renderer);shader.vertexShader=declarations+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
    vec4 kitPosition=vec4(transformed,1.0);vec3 kitNormal=objectNormal;
    #ifdef USE_INSTANCING
    kitPosition=instanceMatrix*kitPosition;kitNormal=mat3(instanceMatrix)*kitNormal;
    #endif
    kitWorldPosition=(modelMatrix*kitPosition).xyz;kitWorldNormal=normalize(mat3(modelMatrix)*kitNormal);`);
   shader.fragmentShader=declarations+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <bumpmap_pars_fragment>','#include <bumpmap_pars_fragment>\n'+sampling);
   shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',T.ShaderChunk.normal_fragment_maps.replace('dHdxy_fwd()','kitHeightDerivative()'));
   shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','float roughnessFactor=roughness*kitSurface(kitWorldPosition).g;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=mix('+(asphalt?'0.92,1.04':'0.74,1.05')+',kitSurface(kitWorldPosition).r);');
  };
  finish.customProgramCacheKey=()=>key+'/blender-paving-'+kind;finish.needsUpdate=true;cache.set(kind,finish);finishes.set(original,cache);
 }
 mesh.material=finish;mesh.userData.authoredPaving=kind;return true;
}
