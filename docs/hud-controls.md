# Category Controls

The HUD keeps five category buttons onscreen, with a small transparent movement overlay at the lower right. Mobile layouts and touch devices show only the joystick, including phone landscape; desktop layouts show only four directional arrow buttons. Navigation, character modes, camera, interaction and system actions remain in their dropdowns.

| Category | Controls |
| --- | --- |
| World | City, Travel, Commons, Pixel, Projects, District atlas and all eight district destinations; Arrive now during transit |
| Character | Angel/Main quick switch and mode selector; landing, takeoff, Walk/Run, ascent, descent, boost, free roam, planet selection and travel; main Walk/Skate |
| View | First person, Close, Far, Fullscreen |
| Activity | Courier journal, Interact, delivery and next-round actions when available, dispatch progress, Hide/Show dispatch, Operate exhibit, project and resume links |
| System | System info, Settings, sound, Pause/Resume, Resume exploration and Return to workshop while paused |

One dropdown is mounted at a time. Escape, the close button, the category trigger and outside clicks dismiss it; keyboard focus returns to the trigger. Keyboard events inside the panel stay in the panel so changing a setting does not move the character. The scene keeps running while a category is open, allowing hold buttons and the joystick to work; the existing full settings/project sheets and explicit Pause still pause gameplay.

Panels scroll within the available viewport on phones and short landscape screens. Closing Character releases its held flight buttons, while the selected destination stays in page state. Movement is no longer inside the Character dropdown: neutral white outlines and transparent backgrounds keep the scene visible beneath the on-screen controls. The joystick stops on release, focus loss, pause and viewport changes. Location and world status remain at the bottom without overlapping the movement overlay.

Implementation: `app/hud-category.tsx` reuses the installed Base UI popover through `components/ui/popover.tsx`. `app/hud-controls.css` styles portalled contents independently of `.kingdom` and overrides the old distributed HUD layout. The existing control callbacks, restrictions and modal content remain in `app/page.tsx`.

Run with Node 22.13+ and the local app running:

```powershell
node node_modules/typescript/bin/tsc --noEmit
npm exec --yes --package=playwright -- node scripts/check-hud-dropdowns.cjs
npm exec --yes --package=playwright -- node scripts/check-hud-dropdowns.cjs --touch
npm exec --yes --package=playwright -- node scripts/check-angel.cjs
npm exec --yes --package=playwright -- node scripts/check-angel-ground.cjs
```

The category check inventories the buttons, verifies five category buttons plus the correct device-specific movement control, and checks transparent styling, placement and no duplicated movement controls in dropdowns. It exercises desktop arrow movement, category switching, keyboard dismissal, settings handoff, held ascent, remembered destinations and land/run controls. The `--touch` run adds real touch dragging, release, focus-loss and rotation checks, including joystick-only landscape. Screenshots and nonblank canvas checks cover desktop, phone and landscape. Evidence is written to ignored `outputs/playtest/hud-dropdowns/desktop/` and `outputs/playtest/hud-dropdowns/touch/`. Existing Angel playtests open the appropriate categories before exercising their workflows.
