# Frequency House And Copper Kettle

## Use

- Visit Frequency House from the World menu, or walk to the radio building in the Commons and interact.
- Choose **Use my location** to find nearby listed stations and attempt to tune the nearest one. Browser permission is required. If autoplay is blocked, use Play after the station is selected.
- Country, region, or station search remains available without location permission. Previous/next, station selection, volume, pause, and power-off controls are provided.
- Closing the tuner keeps an active station available through the mini-player. Muting the app, pausing exploration, hiding the tab, or leaving the page stops playback and releases its network resources. Resume is explicit.
- Visit Copper Kettle from the World menu to see its rising vapor. Steam responds to wind, freezes with reduced motion, and stops updating off-world.

## Location And Network Access

Radio uses browser geolocation only after the location button is pressed, with high accuracy disabled and an eight-second timeout. It rounds coordinates to two decimals and ranks stations locally. The radio does not send coordinates to the application server or station directory, and does not save them in local storage. Existing weather geolocation behavior is unchanged.

The server reads the public Radio Browser directory through fixed HTTPS provider hosts. Nearby discovery uses available geographic station metadata, not FM receiver hardware. The bounded directory can be incomplete, and some terrestrial stations have no compatible public internet stream. Search can also find stations without geographic metadata.

Playback connects directly to the broadcaster, which receives the listener's normal network information, including IP address. Only secure stream URLs are used. Standard browser audio handles supported direct formats; HLS uses native support or the lazily loaded hls.js library. HLS playback requires the broadcaster to permit cross-origin playlist and segment requests. The application does not relay audio or bypass geographic or network restrictions.

Directory responses have size and time limits, a bounded cache, concurrency limits, and outage backoff. Stale listings are labeled. No API key is required. Geolocation needs HTTPS in deployment, or a secure-context localhost origin during development.

During local verification, the network filter blocked the radio directory. Real external station discovery and broadcasts could not be verified on that network; provider access requires the network administrator's approval. No fake stations or audio fixtures are included in the application.

## Verification

- [../tests/radio-directory.test.cjs](../tests/radio-directory.test.cjs): geographic ranking, stream validation, fixed provider hosts, caching, outage behavior, request limits, and invalid API input.
- [../tests/radio-player.test.cjs](../tests/radio-player.test.cjs): permission/cancellation, gesture gating, autoplay denial, station switching, HLS cancellation, media cleanup, and connection timeout.
- [../tests/kettle-steam.test.cjs](../tests/kettle-steam.test.cjs): rising particles, fixed buffers, reduced motion, off-world inactivity, and texture disposal.
- [../tests/commons.test.cjs](../tests/commons.test.cjs): physical radio interaction, live facade controls, and preserved Commons behavior.
- [../scripts/check-radio-kettle.cjs](../scripts/check-radio-kettle.cjs): desktop/mobile UI and rendered steam, actual browser audio decoding with a generated WAV fixture, synthetic permission states, nearest-station selection, mute, cancellation, and resource release. This controlled test does not certify external broadcaster availability. Captures are generated under `outputs/playtest/radio-kettle`.
