# The Living Computer Kingdom

A tiny courier explores a living motherboard. Portfolio buildings demonstrate state and architecture; System Information is the résumé. System Information uses the owner's supplied résumé. Interactive architecture exhibits remain explicitly labeled examples pending repository details.

## Run locally

Use Node 24 (minimum 22.13) and npm. From the extracted project root:

```sh
npm ci
npm run build
node node_modules/vinext/dist/cli.js start --port 3000
```

Open http://127.0.0.1:3000/. For development use `npm run dev -- --port 3000`. The `npm start` command instead runs the Cloudflare Worker preview. Keep `.openai/hosting.json`: Vite imports its non-secret binding configuration. Publishing to the original Site requires its owner's separate credentials; none are included.

WASD/arrows move, drag rotates, wheel/pinch zooms, E interacts. Settings includes stable camera, reduced motion, sound, quality and deliberate save reset. Pause offers return to workshop. Touch has a left joystick and right-side camera gestures. `/projects` and `/resume` are direct HTML alternatives.

District terminals use freestanding wooden boards near each district arrival. Approach and press E. The RAM Library terminal stands on the east side of its entrance, clear of the stairs and librarian. Connected walking routes remain available.

Metro wheels, articulated carriages, rails and sleepers share one 3D track path, with eased departures and stops. Rockets lift off vertically, steer into the flight path and return upright to land; reduced motion disables exhaust flicker without changing the route or landing alignment.

## Weather, commons, and larger worlds

Use **Commons** to visit the expanded southern motherboard. Its large screen starts at 25 degrees Celsius with sunshine and a few clouds. After the world loads, the browser requests device-location permission and retrieves current weather from Open-Meteo. Coordinates are rounded to two decimals for that request and are not saved. Declined permission, unavailable location, or network failures retain the clearly labeled default weather. Rain, drizzle, snow, freezing rain, fog, thunderstorms, cold conditions, cloud cover and night lighting have corresponding displays and effects.

The screen and the entire motherboard, including Motherboard Central, share one weather snapshot. Daylight shows the sun; nighttime shows the moon and stars, with matching ambient light. Clouds span the motherboard and commons in proportion to reported cloud cover; rain and snow density respond to reported precipitation. Weather refreshes every ten minutes using the location already approved in this session. A failed refresh keeps the last report and labels it as such. Day/night follows the provider's local `is_day` value rather than an unrelated accelerated game clock.

Pixel is an original pixel-art portrait in the commons. Approach the front of the painting and press **E** to start listening, then press **E** again to stop and send your question. Pixel speaks the hosted reply, animates its lips, and displays its text on the painting and in the existing subtitles. There is no chat panel, text field, microphone button or separate recording interface. The **Pixel** navigation command only takes you within speaking range; it never opens the microphone. The existing touch **Interact** button performs the same start/stop action as E.

### Pixel's public AI and voice input

Pixel uses the public [kirp/tinyllama-chat Space](https://huggingface.co/spaces/kirp/tinyllama-chat), which runs TinyLlama 1.1B. No API key, Hugging Face token, visitor login, model download or third-party Modal deployment is required. The client connects lazily when a question is submitted, calls `/predict` with prompt, temperature `0.2`, top-p `0.9`, top-k `40` and a 150-token output limit, and speaks only the completed response.

The Space currently runs Gradio 3.44.4 over WebSockets. `@gradio/client` is pinned to `0.20.1` because current major versions no longer support that protocol. Pixel's client subclass omits credentials on its own HTTP requests; the legacy client's default credentialed requests fail the public Space's browser CORS policy. Do not remove that override or blindly upgrade the dependency without verifying the Space's protocol. Browser-global fetch behavior is unchanged.

Speech input uses `SpeechRecognition` or `webkitSpeechRecognition`, not an always-on microphone. It starts only on an interaction near the painting and sends nothing until a second interaction explicitly finishes the question. Brief pauses retain the transcript and continue listening. Walking away, pausing, opening a menu, muting or hiding the tab cancels the recording and pending reply. A 30-second safety limit cancels without sending. HTTPS or localhost and a supporting browser (commonly Chrome or Edge) are required. If permission is denied, allow the microphone in browser settings and interact again. Unsupported browsers show an in-world notice rather than opening another interface.

Starting a voice interaction enables spoken replies; the existing sound control still mutes or cancels them. Listening/transcribing/thinking status appears on the painting. The browser's speech service may process microphone audio remotely; this app sends only the explicitly finished transcript and one recent exchange to Hugging Face, not audio, location or resume data. Avoid private information. Conversation state remains in memory for the current world session and is not saved.

Public Spaces may sleep, queue requests, rate-limit or go offline, and TinyLlama can give inaccurate answers. Requests time out after 45 seconds, can be cancelled with E while waiting, and fall back to explicitly labeled local scripted dialogue on failure. The fallback is never presented as a generated model answer. Leaving the painting cancels queued work and ignores late replies; interacting during a spoken answer interrupts it and starts a new question.

The Copper Kettle, Sole Studio and Frequency House occupy separate lots, with book, juice and soft-serve vending kiosks along broad avenues. Interacting with shops and kiosks produces their local response. The three satellite globes have radii of 78, 96 and 84 game units, spaced apart for their larger surfaces. Walking and rover driving follow gravity around the complete globe, including its underside. Far-side outposts and **Travel > Return to landing station** provide a way back to the station and rover.

Each planet has mountain terrain, two flowing river courses, six connected road loops, bridges, six towns on both hemispheres, 42-51 homes, 66 roaming residents and six road shuttles. Terrain rendering and movement share the same elevation field; roads stay graded, and river crossings use bridges. Buildings and vegetation keep clear of roads, and town buildings participate in camera collision checks. Roads remain connected to the flat landing plaza.

Residents and vendors use shuffled, planet-specific dialogue pools rather than fixed greetings. Each character uses all available lines before reshuffling, avoids an immediate repeat, and retains the bold animated comic bubbles. Press E near a resident for another line; only one nearby conversation bubble is shown by each neighborhood system.

## Verify and export

Deploying on Vercel? Use [the Vercel build and settings](docs/vercel-deployment.md). The original build below targets Sites/Cloudflare.

```sh
node --test tests/*.test.cjs tests/*.test.mjs
node node_modules/typescript/bin/tsc --noEmit
node scripts/measure-download.cjs
python scripts/package-source.py
```

The last command makes `outputs/Kingdom-source.zip` and checks its CRCs and required files. It excludes dependencies, secrets, reference books and rendered frames. The MP4 is a separate deliverable.

Start with [phase completion and remaining work](docs/phase-delivery.md), [asset export instructions](docs/art-assets.md), [cinematic reproduction](docs/audio-cinematic.md), and [measured playtest limitations](docs/performance-playtest.md).

## Editing the kingdom

- `app/portfolio.ts`: verified portfolio replacement point, architecture and scenarios shared by world/HTML views.
- `app/world-config.ts`, `encounter-config.ts`: districts, routes, residents and destinations.
- `app/simulation.ts`, `district-machines.ts`: district behavior and its 3D presentation. Explanations disclose simplified models.
- `app/delivery-state.ts`, `exhibit-state.ts`: delivery and project state machines.
- `app/character-controller.ts`, `game-camera.ts`, `game-input.ts`, `persistence.ts`: movement, camera, input and saves.
- `app/weather-state.ts`, `weather-world.ts`, `weather-sky.ts`: permission-aware weather refresh, fallback data, the large display and synchronized sky/atmosphere.
- `app/creative-plaza.ts`, `portrait-speaker.ts`: spaced-out shop models, interactive vending and the locally voiced pixel portrait.
- `app/painting-ai.ts`, `painting-conversation.ts`, `painting-speech.ts`, `painting-interaction.ts`: anonymous hosted inference, session context, explicit start/stop recognition and Pixel's in-world E interaction.
- `app/planet-surface.ts`, `planet-geography.ts`: globe terrain, local gravity, road/river elevation and full-surface movement.
- `app/planet-infrastructure.ts`, `planet-population.ts`: roads, bridges, towns, scenery clearance, residents and traffic.
- `app/resident-dialogue.ts`: shuffled themed conversations shared by neighborhood and planet residents.
- `assets/manifest.json`: ownership, intended use and reproducible art exports.

Most world meshes remain code-authored. Packet Press has an editable Blender source and shipped GLB; the cinematic also includes an editable Blender scene. Do not present demo projects, provisional geometry, or unmeasured performance as final portfolio facts.


