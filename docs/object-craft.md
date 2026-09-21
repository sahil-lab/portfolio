# Object Craft and Reference Review

The live [Little Ritual experience](https://little-ritual.openai.chatgpt.site/)
was inspected at desktop and phone sizes, including the playable scene and a
close view of the coffee machine, carrier, cabinetry, lights, and planters.
Reference captures are in `outputs/playtest/reference-audit/`. No reference
models, textures, or source code were imported into the Kingdom.

## Differences Observed

| Area | Reference Strength | Kingdom Response |
| --- | --- | --- |
| Object shapes | Readable silhouettes with purposeful rounded and flat surfaces | Sculpted press casing, turned vessel collars, molded carrier and fixtures |
| Assembly | Small parts look connected rather than scattered | Compression fittings, column sockets, gaskets, recessed panels and fitted handles |
| Materials | Wood, painted cabinetry, metal and glazing are visually distinct | Pearl ceramic, teal enamel, brushed steel, glass and rubber use different roughness and reflectance |
| Color | A restrained warm palette keeps the main character legible | Preserve the computer identity with teal, pearl, cobalt and limited coral, not the cafe's warm palette |
| Composition | Close views reward inspection without relying on bloom | Keep details on the existing press and foreground equipment; preserve the original world and interactions |

## Implemented Scope

- `app/press-craft.ts` refines the loaded Packet Press with shaped housings,
  isolation feet, machined columns, a glass pressure vessel, induction coil,
  instruments and plumbing. Its two needles follow actual preparation progress.
- `app/packet-press-asset.ts` retains the original GLB, animation clip, lever,
  ram, tray, stock groups and collision mesh. Replacement parts are batched
  before parenting into the doubled world so their transforms remain aligned.
- `app/courier.ts` retains the character's expressions and gestures, with a
  molded capsule carrier, socket inserts, metal grips, articulated cuffs and
  soles, a power pack, and distinct face-panel material.
- `app/workshop-objects.ts` supplies shaped hollow planters, fitted work lights,
  and recessed cabinet hardware. Circuit windows use physical frame depth.
- Workshop and adjacent pavilion colors separate pearl, teal, cobalt, metal,
  and smaller coral accents instead of placing every object in the same muted
  green-gray range.

The documented Blender executable was not available during this pass. These
are runtime Three.js refinements; the editable Blender asset was not rebuilt.
The entire kingdom has not been converted to new authored models. Existing
movement, transit, AI interactions, live feeds, and portfolio data are retained.

## Verification

```sh
node --test tests/press-craft.test.cjs tests/delivery.test.cjs
node node_modules/typescript/bin/tsc --noEmit
node scripts/check-object-craft.cjs
```

The browser check uses isolated storage and denied geolocation. It captures
the actual loaded press idle and operating, exercises capsule pickup, and
checks the courtyard on desktop and mobile, including Low quality. Captures
are written to `outputs/playtest/object-craft/`. Named pivots, preparation
rewind, scaled-parent alignment, surface bounds, and added geometry budget
have focused automated tests. Software-rendered captures are not a claim of
physical-phone frame-rate performance.
