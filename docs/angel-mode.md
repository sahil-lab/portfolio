# Angel Mode

The photo-guided anime character now has a separate winged derivative, loaded from `public/assets/anime-angel.glb`. The original anime figure, gold statue and main courier remain separate. The angel's body is 1.4 times the roaming dog's height: 23.625 local units / 47.25 world units. Wing span is additional, not used to inflate the body-height comparison.

Two shoulder-blade hinges animate 42 layered feathers per wing. The winged Blender master is `outputs/angel/angel_master.blend`, with save/reopen and export evidence in `outputs/angel/package-status.json`. The original body retains 13,378 MakeHuman CC0 quads in the editable master. The web GLB evaluates the display mesh; it contains no personal photographs, studio, display base or hidden source helpers.

## Controls

- Open **Character** in the top category bar, then select the gold **Angel** button to take control. It becomes **Main** to return to your courier. The Main/Angel switch is in the same dropdown; clicking/tapping the figure also remains available.
- Use **WASD / arrow keys** or the joystick to move relative to the camera. Drag the scene to steer the view; flight follows the view pitch, while ground movement follows the terrain.
- Select **Land** above the motherboard or near a planet to descend to a clear patch of terrain. The angel slows into contact, bends its knees and folds its wings.
- On land, select **Walk** or **Run**. Holding **Shift** temporarily runs while Walk is selected. Release movement to brake into a standing pose.
- Select **Take off**, or press **Space** while grounded, to return to flight. Hold **Space** to ascend and **Q / Ctrl** to descend in flight. Equivalent hold buttons work on touchscreens.
- Hold **Shift** or **Boost** for high-speed flight. Release movement to brake smoothly into a hover.
- Choose a world in **Angel destination**, then use the arrow button to fly there. Starting from land takes off first. Manual flight input cancels the route.
- Enable **Free roam** to let the angel explore automatically. **E** also toggles free roam while controlling the angel.
- Select **Main** to return to the unchanged courier position and transit state. The angel takes off if grounded and resumes autonomous flight.

Flight, landing and walking/running options are grouped under **Character**. Movement controls stay on the scene in a transparent lower-right overlay: joystick only on mobile/touch devices, arrow buttons only on desktop. Camera presets and fullscreen are under **View**; pause, audio and settings are under **System**. Close the dropdown to clear the scene or resume keyboard movement. Opening another category releases held flight buttons, and the selected planet is retained when the dropdown closes. The joystick also releases on focus loss or viewport changes.

Switching to the angel is unavailable while inside an exhibit, riding a vehicle, on an active transit journey, or observing a planet. Pause and full settings/project sheets freeze angel motion, including landing and takeoff; category dropdowns leave the scene running. Hold inputs are cleared on pause, mode changes and focus loss. Camera presets support first-person, close and far views and follow local planetary gravity. Reduced motion disables flight flapping, bob and banking and reduces upper-body gait motion; necessary leg stepping remains active.

## Ground Movement

`app/angel-locomotion.ts` manages flying, landing, grounded and taking-off states with continuous eased transitions. `app/angel-ground.ts` supplies acceleration, braking, progressive turns and body-width collision checks. Walking follows the existing motherboard height queries and planetary terrain; the local gravity frame changes as the angel moves around a planet. Landing searches for supported, clear terrain around the body footprint. Buildings, unsupported edges, steep slopes and planetary water block movement or landing. If Land cannot find a clear patch, move to a more open area.

`app/angel-rig.ts` adds a 16-joint runtime skeleton to the existing body, clothes and shoes without changing the saved GLB or editable master. `app/angel-gait.ts` alternates planted stance feet and lifted swing steps; the shared two-joint solver in `app/limb-ik.ts` bends the legs to meet those contacts. Walking and running use different stride timing, knee bend, arm swing and weight shifts. Wings sweep back above the ground, and soft contact shadows anchor the feet. The existing dog tests cover the shared solver as well.

## Flight Model

`app/angel-flight.ts` owns a separate position and velocity, smooth acceleration/braking, manual controls, roaming and all-world navigation. It never overwrites the courier's position. Free flight keeps a minimum altitude over the motherboard and padded planetary exclusion spheres around terrain and structures. The locomotion controller hands off to the terrain-aware ground controller during landing; taking off restores flight clearance before resuming a route or roaming.

The rocket already uses a fixed ten-second trip rather than a constant cruise speed. Angel assisted travel lasts `rocketJourneySeconds / .85`, approximately 11.76 seconds, versus the rocket's ten seconds. Manual boost is 85% of a measured mid-flight cruise speed on the motherboard-to-Forge rocket route; ordinary manual flight is slower for steering. This is a reference-speed comparison, not a claim that instantaneous speed is below every rocket route at every point in its takeoff/landing animation.

`app/flying-angel.ts` owns the asset, wing poses, independent camera and cleanup. `createTransitWorld.updateFlightView` activates nearby planet details from the angel's position without changing courier progress. The world adds the angel outside the home-only hiding group. It has ordinary 3D depth and perspective, not a camera-pinned overlay.

## Verification

Use Node 22.13+:

```powershell
node --test tests/angel-flight.test.cjs tests/angel-ground.test.cjs tests/angel-rig.test.cjs tests/roaming-dog.test.cjs tests/transit.test.cjs tests/controls.test.cjs
node node_modules/typescript/bin/tsc --noEmit
npm exec --yes --package=playwright -- node scripts/check-angel.cjs
npm exec --yes --package=playwright -- node scripts/check-angel-ground.cjs
```

The browser checks use Edge, default to `http://localhost:3001/`, and accept `ANGEL_WORLD_URL`. The flight check saves screenshots and results under `outputs/playtest/angel/`, covering mode buttons, boost/climb, pause, menus, all planet routes, main-character restoration, touch-sized controls, wing framing and click selection. The ground check saves evidence under `outputs/playtest/angel-ground/`, covering Land/Walk/Run/Take off, rendered shoe contact, planted-foot drift, different gait poses, contact-shadow pixels, planet landing and desktop/mobile layouts.

Personal reference folders remain ignored and are not embedded in either model. No commit, push or deployment is part of adding this feature unless separately requested.
