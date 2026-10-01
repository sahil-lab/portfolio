# Category Controls

The HUD keeps five category buttons onscreen, with a small transparent movement overlay at the lower right. Mobile layouts and touch devices show only the joystick, including phone landscape; desktop layouts show only four directional arrow buttons. Navigation, character modes, camera, interaction and system actions remain in their dropdowns. When an interaction is available nearby, one contextual command also appears directly in the scene.

| Category | Controls |
| --- | --- |
| World | Projects, direct Resume, Sahil Plaza, Project Garden, Gallery; Mall, Friends & games, Travel, City; expandable City places, Walks & discoveries, and Books & districts groups retaining every destination and the eight-district atlas; Arrive now during transit |
| Character | Angel/Main quick switch and mode selector; landing, takeoff, Walk/Run, ascent, descent, boost, free roam, planet selection and travel; main Walk/Skate |
| View | World lighting, First person, Close, Far, Fullscreen |
| Activity | Friends & games, Courier journal, Interact, delivery and next-round actions when available, dispatch progress, Hide/Show dispatch, Operate exhibit, project and resume links |
| System | System info, Settings, sound, Pause/Resume, Resume exploration and Return to workshop while paused |

One dropdown is mounted at a time. Escape, the close button, the category trigger and outside clicks dismiss it; keyboard focus returns to the trigger. Keyboard events inside the panel stay in the panel so changing a setting does not move the character. The scene keeps running while a category is open, allowing hold buttons and the joystick to work; the existing full settings/project sheets and explicit Pause still pause gameplay.

Panels scroll within the available viewport on phones and short landscape screens. Closing Character releases its held flight buttons, while the selected destination stays in page state. Movement is no longer inside the Character dropdown: neutral white outlines and transparent backgrounds keep the scene visible beneath the on-screen controls. The joystick stops on release, focus loss, pause and viewport changes. Location and world status remain at the bottom without overlapping the movement overlay.

The World menu puts portfolio actions first. Secondary destinations use native
keyboard-accessible disclosure groups, with only one group expanded at a time.
Phone World panels are limited to 65dvh and retain 44-pixel targets. The direct
Resume action opens the existing reader without moving the character; both
physical resume-book destinations remain in Books & districts. The focused
`--world-only` check covers these groups and direct-reader access, with `--touch`
available to test the phone pointer mode.

Gallery visits the vaulted code studio and prototype workshop without opening
a modal. It uses a dedicated responsive Far view, preserves saved Close and
first-person modes, and leaves the central passage open. The two seated workers
remain part of the existing resident system. The capital browser check's
`--gallery` option verifies the shortcut, day/night framing and resident motion.

The contextual command uses the existing interaction prompt and dispatcher;
the Activity menu's Interact action and keyboard interaction remain available.
It is hidden while a category, blocking sheet, observation or shared activity
is open, while paused, or when controlling Angel. The command wraps long labels
and sits above the phone joystick or between desktop location and movement
controls. The capital browser check verifies reading-bay commands at 1440, 390,
320 and 844 pixels, including one-dispatch clicks, full text and no overlap.

The Project Garden's six local studies open a compact inspection dock without
pausing the world. Run/Pause and Reset use the existing exhibit sequencer;
the component study also retains color selection. Project source opens the
existing resume reader. The dock identifies the examples as illustrative data,
not the project runtimes, and suppresses its duplicate provenance toast.
Leaving the installation dismisses the dock. Escape on its controls closes it
without pausing exploration. Blocking sheets, category menus, observation and
Angel control hide the dock; the normal contextual command returns afterward.
Buttons remain at least 44px, with wrapping labels and scrollable phone layouts.

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
