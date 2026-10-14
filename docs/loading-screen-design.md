# Kingdom Loading Screen

## Research, 14 October 2026

The loading screen is an introduction to the existing miniature computer
kingdom, not a separate mini-game or an artificial delay. The references below
informed the interaction and motion direction; their artwork and code were not
copied. There is no objective "best loading screen" or measurable 10,000x visual
improvement claim.

| Reference | Relevant Finding | Kingdom Application |
| --- | --- | --- |
| [Goodgrowth: Boot Sequences](https://tympanus.net/codrops/2026/08/27/goodgrowth-boot-sequences-spinning-discs-and-the-art-of-the-portfolio/) | Console-inspired preload, identity, and reveal form one experience; simple CSS can carry lightweight motion. | A living computer mascot, circuit-board details, and a coordinated reveal into the world. |
| [R-K '26: Presence](https://tympanus.net/codrops/2026/04/07/r-k-26-the-thinking-and-code-behind-a-portfolio-led-by-presence/) | The preloader belongs to the site's visual identity; restrained transitions can replace heavier WebGL effects. | Existing Fraunces/Space Grotesk typography and mint/gold colors, with a short ready-state exit. |
| [Heron: Domain-Led Design](https://tympanus.net/codrops/2026/10/12/heron-ai/) | Derive visual language from the product's world; DOM interaction can be lighter than another WebGL layer. | Original bakery, clock house, tea shop, and motherboard illustration with DOM-driven eyes. |
| [NN/g: Progress Indicators](https://www.nngroup.com/articles/progress-indicators/) | Explain real work and use step counts when an honest overall percentage is unavailable; playful elements must not obscure progress. | Six actual preparation milestones, followed by a distinct world-assembly state. No fake timer or percentage. |
| [web.dev: Animation Performance](https://web.dev/articles/animations-guide) | Prefer transform and opacity for repeated animation; avoid unnecessary layout and paint work. | CSS bobbing, blinking, letter motion, and transformed progress fills; no per-frame React state loop. |
| [WCAG: Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) | Let users stop nonessential movement, with a control that does not trap focus. | One pause control, OS/saved reduced-motion support, and ordinary HTML exit links. |

The [Awwwards preloader search](https://www.awwwards.com/inspiration_search/?text=preloader)
was also consulted, but did not provide enough interaction detail to serve as
implementation evidence. Its older loading collection URL returned 404.

## Implementation

- Original offline-rendered Three.js artwork: 1200 x 800 transparent WebP,
  43,096 bytes. The loader itself does not create another WebGL renderer.
- The crowned computer's eyes follow a fine pointer within the illustration.
  A small heart interaction changes its expression and greeting without
  affecting actual loading progress.
- Six preparation lights follow the existing six startup promises. Completing
  those promises does not imply that world assembly is finished; its separate
  label remains until the real ready callback.
- Motion never delays readiness. The overlay becomes inert immediately and
  completes its short exit before unmounting. Projects and Resume remain normal
  HTML links during startup.
- Short landscape has a separate compact composition. Decorative captions are
  omitted where they would overlap the artwork.
- No framework, animation dependency, sound autoplay, or new image service was
  added. The prior illustration remains available as a versioned baseline.

Runtime implementation: [world-loading.tsx](../app/world-loading.tsx) and
[world-loading.css](../app/world-loading.css). The reproducible artwork recipe
is [render-loading-art.cjs](../scripts/render-loading-art.cjs).

## Verification

[Unit tests](../tests/world-loading.test.cjs) cover server-rendered states,
bounded real preparation counts, accessibility, and ready-state inertness.
[Browser checks](../scripts/check-world-loading.cjs) cover desktop, mobile,
narrow mobile, short landscape, and reduced motion, including pointer response,
pause stability, heart interaction, progress milestones, asset loading, layout,
and the real nonblank-world handoff. The saved-location lifecycle checks remain
in [check-player-controls.cjs](../scripts/check-player-controls.cjs).
