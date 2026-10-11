import type {FeatureRecord} from './bengaluru-pipeline';

/** Honest height wording: OSM distinguishes a measured height from a storey count, and most footprints have neither. */
export function describeHeight(feature:Pick<FeatureRecord,'heightM'|'heightSource'|'levels'|'displayHeightM'|'landmark'>):string|null{
 if(feature.heightM===undefined)return null;
 const metres=`${feature.heightM} m`;
 const base=feature.heightSource==='osm-height'?`Height ${metres} (OpenStreetMap height tag)`:feature.heightSource==='building-levels'?`About ${metres}, estimated from ${feature.levels} storeys`:feature.heightSource==='type-default'?`About ${metres}, estimated from the building type`:`About ${metres}, generic estimate (no height data)`;
 return feature.landmark&&feature.displayHeightM&&feature.displayHeightM!==feature.heightM?`${base}; drawn ${feature.displayHeightM} m tall for landmark emphasis`:base;
}
