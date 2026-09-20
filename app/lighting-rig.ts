import * as T from 'three';

/**
 * Moves a directional light's shadow frustum with an anchor in whole shadow-texel steps.
 * Without snapping, every frustum move re-rasterises static shadows on a shifted grid and
 * they visibly swim while the courier walks; with it, the frustum can follow the player
 * (or be refreshed at a low rate) and static shadows stay pinned.
 *
 * Expects `sun.position` to hold the light's offset from its target (the weather sky sets it
 * every frame); the anchor is added to both light and target after snapping.
 */
export function createShadowFollow(sun:T.DirectionalLight){
  const forward=new T.Vector3(),right=new T.Vector3(),up=new T.Vector3(),worldUp=new T.Vector3(0,1,0),snapped=new T.Vector3();
  return {
    texel:(worldScale=1)=>{const frustum=sun.shadow.camera;return (frustum.right-frustum.left)/sun.shadow.mapSize.width/worldScale},
    follow(anchor:T.Vector3,worldScale=1){
      forward.copy(sun.position).normalize();
      right.crossVectors(worldUp,forward);if(right.lengthSq()<1e-8)right.set(1,0,0);else right.normalize();
      up.crossVectors(forward,right);
      const frustum=sun.shadow.camera,texel=(frustum.right-frustum.left)/sun.shadow.mapSize.width/worldScale;
      const alongRight=anchor.dot(right),alongUp=anchor.dot(up);
      snapped.copy(anchor).addScaledVector(right,Math.round(alongRight/texel)*texel-alongRight).addScaledVector(up,Math.round(alongUp/texel)*texel-alongUp);
      sun.target.position.copy(snapped);sun.position.add(snapped);
      return snapped;
    },
  };
}
