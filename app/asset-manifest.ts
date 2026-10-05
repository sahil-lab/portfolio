export const assetManifest={
 monument:{url:'/assets/hero-v1/monument.glb',fallbackUrl:'/assets/sah-suited-figure.glb',type:'gltf',zone:'lantern',priority:1,estimatedBytes:6800840},
 dog:{url:'/assets/hero-v1/dog.glb',fallbackUrl:'/assets/roaming-dog.glb',type:'gltf',zone:'commons',priority:2,estimatedBytes:6117224},
 angel:{url:'/assets/hero-v1/angel.glb',fallbackUrl:'/assets/anime-angel.glb',type:'gltf',zone:'motherboard',priority:3,estimatedBytes:8329360},
 press:{url:'/assets/packet-press.glb',type:'gltf',zone:'workshop',priority:1,estimatedBytes:482120},
} as const;
export type WorldAssetId=keyof typeof assetManifest;
