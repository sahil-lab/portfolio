export const assetManifest={
 monument:{url:'/assets/sah-suited-figure.glb',type:'gltf',zone:'lantern',priority:1,estimatedBytes:4042156},
 dog:{url:'/assets/roaming-dog.glb',type:'gltf',zone:'commons',priority:2,estimatedBytes:7272524},
 angel:{url:'/assets/anime-angel.glb',type:'gltf',zone:'motherboard',priority:3,estimatedBytes:5424876},
 press:{url:'/assets/packet-press.glb',type:'gltf',zone:'workshop',priority:1,estimatedBytes:482120},
} as const;
export type WorldAssetId=keyof typeof assetManifest;
