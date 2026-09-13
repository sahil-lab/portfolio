# Original audio and cinematic delivery

## Phase 1 — functional gate

- [x] Production build and TypeScript check pass after audio integration.
- [x] 21 focused tests pass: existing delivery, save, control, traversal, project, asset checks plus deterministic district composition and gesture-gated audio disposal.
- [x] Actual production browser checks: enable sound, movement, CPU/RAM/GPU transitions, pause/resume, resident interaction with subtitle, and mute. No console errors in this verification session.
- [x] Earlier complete delivery/project playtest retained in performance-playtest.md. No new performance certification is claimed while Blender occupies the GPU.

## Phase 2 — original audio

- [x] Shared original 80 BPM pentatonic composition: workshop motif, CPU bass pulses, RAM sustained tones, GPU upper synth counterline, railway alternating ticks, lower vault root and airy sky register.
- [x] Synthesized footsteps, machine operation, capsule pickup, delivery, ambient chirps and project-stage cues; existing original resident voices and subtitles preserved.
- [x] Gentle score ducking during foreground interaction/creature cues; master volume and mute retained. Gesture-gated creation, hidden-tab suspension, pause/resume and disposal.
- [x] Offline stereo composition uses the same note definitions as gameplay. 48 kHz / 16-bit WAV, 30 seconds, peak 0.74 (approximately -2.6 dBFS), original panning and short echoes, opening/final fades. No sampled commercial music or stock sound library.

Sources: app/audio-score.ts, app/kingdom-audio.ts, app/kingdom-voices.ts. Integration: app/world.ts and app/living-world.ts. The browser UI checks establish control/state behavior; a physical-speaker listening/mix review has not been independently certified.

## Phase 3 — authored cinematic

The separate film uses actual runtime geometry exported by scripts/export-cinematic.cjs: motherboard scenery, 3D courier rig, residents, traversal structures and project buildings. The shipped Packet Press GLB and original mural are imported locally. Blender retains the editable scene, camera markers and sampled animation. No screen recording, stock footage or substitute generated world is used.

| Time | Authored shot |
| --- | --- |
| 0–5 s | Workshop dolly, courier awakening, press animation and four individual pickups |
| 5–8.5 s | CPU City tracking view |
| 8.5–12 s | RAM approach and archive |
| 12–14 s | Courier physically crosses Component Studio doorway |
| 14–20 s | Actual React example: Amber input → state → props → committed rendered card |
| 20–22 s | Staged packet vehicle on the actual network rail geometry |
| 22–24 s | Database district establishing shot |
| 24–26 s | Floating clusters and connecting traversal |
| 26–30 s | Wide motherboard reveal with title |

The React sequence is sampled from Exhibit.tick, not a separately invented architecture animation. Capsule inventory uses DeliveryRound. Camera paths and packet motion are cinematic staging; the film does not claim an implemented network-routing or database-index simulation. Portfolio examples remain demonstration content.

Render: Blender 5.2 Eevee, 1920 × 1080. Authored animation on twos: 360 original rendered frames, each held twice in a 720-frame, 24 FPS MP4 master. H.264/yuv420p video, AAC stereo audio, fast-start metadata. This intentional cadence is disclosed rather than presented as 24 distinct rendered poses per second.

## Reproduce

From the repository root, with Node 24, Blender 5.2 and Python 3 available:

1. `node scripts/export-cinematic.cjs` creates assets/cinematic/scene.json from the current game geometry and simulations.
2. `blender --background --python assets/cinematic/render_trailer.py` saves assets/cinematic/KingdomTrailer.blend and renders outputs/cinematic/frames/frame_*.png. Set KINGDOM_FRAMES to comma-separated frame numbers for preview stills only.
3. Install Python numpy, Pillow and imageio-ffmpeg if missing. Run `python assets/cinematic/edit_trailer.py` for original-score.wav and the final MP4. AUDIO_ONLY=1 generates only the WAV.

Typography currently resolves the Windows Segoe UI font files; change the explicit font paths in the edit script on other systems. Geometry/motion/audio use deterministic formulas; no random seed is needed. Texture sources are packed into the blend. Rendered PNGs and MP4 are separate local deliverables, not mandatory gameplay downloads.

## Completion checks

- [x] Preview shot composition inspected at workshop, project and wide reveal.
- [x] Fixed early cargo visibility and premature Amber material state found during preview review.
- [x] Blender scene verification checks all 360 rendered poses: no courier foot/tray drift, nine camera markers, 1920 × 1080 resolution. Maximum tray-to-body distance is 0.915 meters. Sampled transforms use constant interpolation between updates; cameras retain smooth interpolation.
- [x] Complete 360-frame render and 720-frame edited master. Final MP4: exactly 30 seconds, 1920 × 1080, 24 FPS, AAC 48 kHz stereo; complete decode passes. Corrected Unicode titles and inspected all edited shot samples. The final React result inset reads the same sampled simulation state as the room.
- [x] Editable scene, camera/render/edit/audio sources and the separate local MP4 retained. Live game publication is confirmed separately at delivery.

Final evidence: outputs/cinematic/video-check.json, scene-check.json, shot-contact-sheet.jpg. The MP4 is approximately 12.35 MB. The complete compressed gameplay client remains approximately 0.846 MB because the separate film is not fetched on first play.
