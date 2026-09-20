# The Forge and The Citadel

## Canonical Profiles

- GitHub: <https://github.com/sahil-lab>
- LinkedIn: <https://www.linkedin.com/in/sahil-upadhyay-2921b5127/>

The two outer planets are now distinct civilizations. Internal destination IDs
`copper` and `prism` remain unchanged to preserve existing visit history and
transit routes. Cache Gardens remains its own green world.

## Physical Identity

The Forge has charcoal terrain, pale industrial blocks, steel roads, dark glazing,
and a giant curved GitHub mark assembled from white foundry roofs. The mark's
negative space retains the recognizable silhouette. Repository-city plaques are
updated with names, languages, stars, forks, and archive state from GitHub.

The Citadel has pale stone, blue water and glazing, white civic towers, and a
large LinkedIn reflecting pool with raised white letter islands. Career landmarks
use the supplied resume, including education and the listed employers. No
Mercedes-Benz, TEKsystems, Microsoft, or Amazon employment is inferred from the
concept examples. The overhead network is symbolic, not a map of real connections.

Both marks use locally generated contours from the packaged Simple Icons SVGs;
see `public/assets/brands/SOURCES.md`. Tessellation follows the globe's actual
surface rather than using floating logo billboards. Large logo footprints are
reserved from ordinary scenery; landing caps and travel IDs are preserved.

## Observation and Travel

Travel includes **Observe from orbit** for a full-screen view with the exact
profile link and a Return action. Observation does not teleport the player or
stamp the passport. Physical visits earn the existing persisted visit record,
displayed as **FORGE VISITED** or **CITADEL VISITED** in Kingdom Passport.

In the orbital observatory, each planet rotates once every 120 seconds (3 degrees
per second). Terrain, cities, and logo landmarks turn together around the globe's
center; orbital docks and transit routes remain fixed. Pause and Reduced Motion
freeze the turn. Returning to exploration restores the original surface pose
before input resumes, keeping walking, collision, and docking coordinates intact.

A data connection follows the existing Forge-Citadel route. Its packets are
ambient symbols, not claims that a repository was posted to LinkedIn. The orbital
resume satellite displays sourced career records; selection opens the existing
resume panel. A direct resume link is also available in the Citadel observatory.

## Verified Activity

The Kingdom Chronicle is beside the central station. It displays public repository,
star, and fork counts, the most recently pushed repository, retrieval time, and
the supplied professional profile. Missing data uses `--`, not fabricated zeros.

`forge-feed.ts` reads the public GitHub repository endpoint without credentials,
cookies, tokens, or a referrer. Requests are limited to three 100-item pages,
refresh at ten-minute intervals while the relevant world is active, and cancel
on disposal. Partial coverage is labeled. Refresh failures preserve the last
verified snapshot and mark it stale; initial failures display unavailable status.
Repository owner, URL, numeric fields, and timestamps are validated before use.

Repository push time is not a total commit count. This pass does not manufacture
a full-year contribution landscape, new-commit events, releases, pull-request
relationships, or README contents from incomplete metadata. Those require the
corresponding verified dataset. LinkedIn scraping is not used; live personal posts
or connections require permitted API access. No OAuth or private account access
has been configured by this work.

## Ownership and Checks

The new code is concentrated in `civilization-config`, `civilization-world`,
`civilization-link`, `civilization-observation`, `forge-feed`, and
`kingdom-chronicle`. Existing planet generation, transit, Travel, and world setup
have small integration changes. No Git actions or deployment actions were used.

```sh
node --test tests/civilizations.test.cjs tests/forge-feed.test.cjs tests/transit.test.cjs tests/planet-surface.test.cjs tests/planet-geography.test.cjs
node node_modules/typescript/bin/tsc --noEmit
node scripts/check-civilizations.cjs
```

The browser check uses local Edge and Playwright, isolated in-memory storage,
and denied geolocation. It verifies profile URLs, unchanged player position,
desktop/mobile canvas content, visible controls, actual transit arrival, and
passport stamps. Screenshots are written to `outputs/playtest/civilizations/`.
Software-rendered viewport checks are not real-device frame-rate certification.

Verified on 21 September 2026: 169 regression tests pass; TypeScript is clean.
Both 1440x960 and 390x844 browser runs passed after correcting curved-logo face
winding and pool/plinth separation, with no browser or shader errors. Exact
profile URLs, unchanged observation-return positions, physical transit, and both
passport stamps were checked. A live public-API smoke test returned 59
repositories with `portDev` most recently pushed; these values are not hardcoded.
