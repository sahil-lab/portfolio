# Category Controls

The HUD keeps five category buttons onscreen. Every previous navigation, character, camera, interaction and system action remains available inside a dropdown; the scene no longer has separate button banks around its edges.

| Category | Controls |
| --- | --- |
| World | City, Travel, Commons, Pixel, Projects, District atlas and all eight district destinations; Arrive now during transit |
| Character | Angel/Main quick switch and mode selector; landing, takeoff, Walk/Run, ascent, descent, boost, free roam, planet selection and travel; main Walk/Skate; joystick and four directional buttons |
| View | First person, Close, Far, Fullscreen |
| Activity | Courier journal, Interact, delivery and next-round actions when available, dispatch progress, Hide/Show dispatch, Operate exhibit, project and resume links |
| System | System info, Settings, sound, Pause/Resume, Resume exploration and Return to workshop while paused |

One dropdown is mounted at a time. Escape, the close button, the category trigger and outside clicks dismiss it; keyboard focus returns to the trigger. Keyboard events inside the panel stay in the panel so changing a setting does not move the character. The scene keeps running while a category is open, allowing hold buttons and the joystick to work; the existing full settings/project sheets and explicit Pause still pause gameplay.

Panels scroll within the available viewport on phones and short landscape screens. Closing Character unmounts and releases its held controls, while the selected destination stays in page state. Location and world status remain unobtrusive text at the bottom of the scene.

Implementation: `app/hud-category.tsx` reuses the installed Base UI popover through `components/ui/popover.tsx`. `app/hud-controls.css` styles portalled contents independently of `.kingdom` and overrides the old distributed HUD layout. The existing control callbacks, restrictions and modal content remain in `app/page.tsx`.

Run with Node 22.13+ and the local app running:

```powershell
node node_modules/typescript/bin/tsc --noEmit
npm exec --yes --package=playwright -- node scripts/check-hud-dropdowns.cjs
npm exec --yes --package=playwright -- node scripts/check-angel.cjs
npm exec --yes --package=playwright -- node scripts/check-angel-ground.cjs
```

The category check inventories the buttons, verifies five visible buttons when closed, exercises category switching, keyboard dismissal, settings handoff, held ascent, remembered destinations and land/run controls, and checks desktop, phone and landscape screenshots with nonblank canvas pixels. Evidence is written to ignored `outputs/playtest/hud-dropdowns/`. Existing Angel playtests open the appropriate categories before exercising their workflows.
