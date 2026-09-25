# Central Roaming Dog

The reference dog is a large, independent resident of the motherboard's central outdoor area. It uses `public/assets/roaming-dog.glb`, copied from the owner-corrected medium-detail asset. The asset has 83,962 triangles; the original editable Blender master is unchanged.

## Behavior

- Height matches `bulletinSites.markets.height` (16.875 local units, 33.75 after the world's existing 2x scale).
- A conservative clearance map accounts for the full body footprint and headroom. The dog starts in the nearest suitable connected roaming area, currently west of Central near `(-44, 64)`, and patrols the open ground around the Commons and bulletin square. Narrow alleys are deliberately excluded at this scale.
- Random reachable destinations use forward-aligned steering, limited angular acceleration, clear-path turn anticipation and gradual arrival braking. The body no longer moves toward a waypoint independently of its heading.
- A 17-bone runtime rig skins the body and fur together. World-space stance paws stay planted; smooth swing arcs, side-aware leg IK and staggered replants support walking and stepping turns. Feet complete their landings and settle when motion stops. Head anticipation, small weight shifts, ear sway and a curled-tail wag follow the same update loop. The static source GLB remains reusable outside the game.
- The dog stops for a nearby player. `E` / Interact greets it when the existing prompt says `Greet the dog`.
- Occasional synthesized two-part barks and greetings use the existing gesture-gated audio context, volume, mute, pause and tab-visibility behavior. Bark volume drops with distance and uses stereo direction. No reference-photo audio or external bark recording is used.
- Menus freeze roaming without hiding the dog. Pausing freezes the world; planet travel, observation and interiors disable the resident. Reduced motion removes body/head/ear/tail sway while retaining the walking gait so the moving dog does not skate.

## Ownership

- `app/dog-wander.ts`: clearance map, connected area and random route state.
- `app/dog-rig.ts`: skin weights and procedural gait/attention poses.
- `app/dog-gait.ts`: planted world-space paw targets, smooth swings and stop/turn transitions.
- `app/roaming-dog.ts`: asset lifetime, height, placement, world interaction.
- `app/kingdom-audio.ts`: bark synthesis and shared audio cleanup.
- `app/world.ts`: lifecycle, collision and interaction integration.

The dog does not resize the camera, move buildings or modify existing routes. Its large size limits it to sufficiently open areas. The runtime rig is a lightweight gameplay animation, not an artist-weighted animation rig.

## Verification

```powershell
node --test tests/roaming-dog.test.cjs
node scripts/check-roaming-dog.cjs
```

The browser check uses `http://localhost:3001/` by default; set `DOG_WORLD_URL` for a different development server. It checks actual GLB loading, size, full-footprint movement, random destinations, player yielding, muted/enabled barks, two skinned walking phases, and nonblank desktop/mobile captures. Evidence is saved under `outputs/playtest/roaming-dog/`.
