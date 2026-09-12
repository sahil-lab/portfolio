import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { DeliverySnapshot } from './delivery-state';

/** Asset animation is sampled by simulation progress, never a competing timer. */
export function createPacketPress(parent: T.Object3D) {
  const root = new T.Group();
  root.name = 'PacketPress_Placement';
  root.position.set(1, .65, 17);
  parent.add(root);
  let mixer: T.AnimationMixer | undefined;
  let clip: T.AnimationClip | undefined;
  let action: T.AnimationAction | undefined;
  let disposed = false;
  const bounds = new T.Box3(new T.Vector3(-1.3, 0, 15.55), new T.Vector3(3.3, 5, 20.05));
  const stock: T.Object3D[] = [];
  const lights: T.MeshStandardMaterial[] = [];
  let chamber: T.MeshStandardMaterial | undefined;
  new GLTFLoader().load('/assets/packet-press.glb', gltf => {
    if (disposed) { disposeObject(gltf.scene); return; }
    root.add(gltf.scene);
    root.updateMatrixWorld(true);
    gltf.scene.traverse(o => {
      if (o.name.startsWith('Collision_')) { bounds.setFromObject(o); o.visible = false;o.userData.cameraSolid=true; }
      if (o instanceof T.Mesh) {
        o.castShadow = !o.name.startsWith('Collision_');
        o.receiveShadow = true;
        if (o.name.startsWith('PacketPress_Indicator_')) {
          o.material = (o.material as T.MeshStandardMaterial).clone();
          lights[Number(o.name.split('_').at(-1))] = o.material;
        }
        if (o.name === 'PacketPress_Chamber') {
          o.material = (o.material as T.MeshStandardMaterial).clone();
          chamber = o.material;
        }
      }
    });
    for (let i = 0; i < 4; i++) stock.push(gltf.scene.getObjectByName(`PacketPress_Capsule_${i}`)!);
    clip = gltf.animations.find(c => c.name === 'PacketPress_Prepare');
    if (clip) {
      mixer = new T.AnimationMixer(gltf.scene);
      action = mixer.clipAction(clip);
      action.setLoop(T.LoopOnce, 1); action.clampWhenFinished = true; action.play();
    }
  }, undefined, error => console.error('Packet Press asset could not load', error));
  return {
    blocked: (x: number, z: number) => x > bounds.min.x - .4 && x < bounds.max.x + .4 && z > bounds.min.z - .4 && z < bounds.max.z + .4,
    update: (state: DeliverySnapshot, progress: number) => {
      const t = state.phase === 'preparing' ? progress : state.phase === 'idle' ? 0 : 1;
      // LoopOnce pauses at the final frame; allow a later explicit round to rewind it.
      if (action) action.paused = false;
      mixer?.setTime(t * (clip?.duration ?? 0));
      stock.forEach((o, i) => { o.visible = i < state.stock; });
      lights.forEach((m, i) => {
        const charged = t * 4 > i;
        m.color.set(charged ? '#ffe0a0' : '#677268');
        m.emissiveIntensity = charged ? .8 : 0;
      });
      if (chamber) chamber.emissiveIntensity = state.phase === 'preparing' ? .25 + Math.sin(progress * Math.PI * 12) ** 2 * .65 : .12;
    },
    dispose: () => { disposed = true; mixer?.stopAllAction(); },
  };
}

function disposeObject(root: T.Object3D) {
  root.traverse(o => { if (o instanceof T.Mesh) { o.geometry.dispose(); const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { (m as T.MeshStandardMaterial).map?.dispose(); m.dispose(); }); } });
}

export function addWorkshopMural(scene: T.Scene) {
  const wall = new T.Mesh(new T.BoxGeometry(8.4, 8.4, .35), new T.MeshStandardMaterial({ color: '#dfcbae', roughness: .95 }));
  wall.name = 'Workshop_BackWall'; wall.userData.cameraSolid=true; wall.position.set(-4.8, 4.6, 12); wall.castShadow = true; wall.receiveShadow = true; scene.add(wall);
  const texture = new T.TextureLoader().load('/assets/workshop-mural.webp');
  texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = 4;
  const mural = new T.Mesh(new T.PlaneGeometry(8, 8), new T.MeshBasicMaterial({ map: texture, toneMapped: false }));
  mural.name = 'Workshop_Mural'; mural.position.set(-4.8, 4.6, 12.19); scene.add(mural);
  return (x: number, z: number) => x > -9.4 && x < -.2 && z > 11.4 && z < 12.6;
}
