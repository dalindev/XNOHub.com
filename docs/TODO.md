# XNOHub v2 to-do

This is the working checklist for [v2-plan.md](v2-plan.md), and the plan has the reasons behind each item. Tick an item when it's done and verified, and note the date or commit. Nothing deploys until a phase is stable and Dalin says go.

## Phase 0: cleanup and stack upgrade (started 2026-11-19, local only)

- [x] Remove the 9 unused dependencies (tremor, headlessui, heroicons, planetscale, d3-geo, three-geojson-geometry, js-cookie, prop-types, server-only) (2026-11-19)
- [x] Upgrade three.js to the latest version (r187) and add it as a direct dependency, with `@types/three` 0.187 (2026-11-19)
- [x] Upgrade to Next 16.4, React 19.3, R3F 9.8 and drei 10.7 (2026-11-19)
- [x] Upgrade the rest: TypeScript 5.9, ESLint 9 with a flat config, Prettier 3, `@vercel/analytics` 2, lucide-react 1.x, and minor bumps (2026-11-19)
- [x] Remove `transpilePackages: ['@tremor/react']` from `next.config.js` (2026-11-19)
- [x] Remove the duplicate `tailwind.config.ts` and add `banano/**` to Tailwind `content` (2026-11-19)
- [x] Fix the code for React 19, R3F 9 and Next 16 (2026-11-19): `RefObject<T | null>`, `ThreeEvent` for pointer handlers, `three/addons/*` loader imports, an inner `<Suspense>` round Starlink, meteors and rockets so a first rocket load doesn't blank the page (R3F 9 Canvas suspends the parent tree). Next 16 rewrote `tsconfig.json` (bundler resolution, react-jsx).
- [x] `pnpm install` (2026-11-19)
- [x] `pnpm ts`, `pnpm lint` and `pnpm build` all pass (2026-11-19). Lint has 35 warnings: four React Compiler rules (`set-state-in-effect`, `immutability`, `purity`, `refs`) are set to warn in `eslint.config.mjs` because they flag v1 code Phase 1 rewrites. Set them back to error after Phase 1.
- [x] Run locally (2026-11-19): main page shows the globe, night lights, rep bars, arcs, rockets and stars with no console errors. Banano page loads with its feed and no errors, but its 3D canvas wasn't captured (browser pane was in the background). Starlink view checked in Phase 1.
- [x] `pnpm audit --prod` is clean (2026-11-19), using `pnpm.overrides` for 7 nested advisories (braces, cross-spawn, picomatch, fflate, @babel/runtime)
- [x] Add CI (2026-11-19): `.github/workflows/ci.yml` runs typecheck, lint, tests and build on PRs; inert until pushed
- [ ] Old branches: delete `vercel/react-server-components-cve-vu-ud5yem` and the merged patch branches, and tag `xnohub-v4` and `improve-performance` before removing them. This needs Dalin's OK because it changes the remote.

## Phase 1: network core rewrite (v2.0)

- [x] Move the feed into a Web Worker, with reconnect and backoff (2026-11-19): `workers/feed.worker.ts`, 1 s→30 s backoff, rotates URL on failure or 2 min of silence
- [x] Use nanoslo as the primary feed and the somenano repeater as the fallback (2026-11-19). The live feed is now the default (sample data only with `NEXT_PUBLIC_USE_SAMPLE_DATA=true`). The repeater opened but sent nothing in 30 s on 2026-11-19, so its batch adapter is written but unverified against live data
- [x] Dedupe confirmations by hash (2026-11-19) (last 2048 hashes, in the worker)
- [x] Drop the unused `vote` and `stopped_election` subscriptions (2026-11-19)
- [x] Build `public/data/reps.json` from nano.community plus `confirmation_quorum` (2026-11-19): `scripts/build-reps.mjs`, and `.github/workflows/reps.yml` runs it every 12 h once pushed. First run: 69 reps, 53 online, 66 located; drawn online reps hold 99.5% of online weight
- [x] Remove the fake big-city fallback (2026-11-19); reps without a location stay in reps.json but aren't drawn. Offline reps are drawn grey
- [x] Credit nano.community on the site (2026-11-19)
- [x] Draw the nodes as one `InstancedMesh`, with hover through `instanceId` (2026-11-19)
- [ ] Set the React Compiler lint rules back to error. `immutability` stays a warning for good: R3F mutates uniforms and buffers in `useFrame` by design. The others wait on the v1 leftovers (donation meteors, Starlink, rockets, history table)
- [x] Rewrite the arcs as one instanced shader with a ring buffer, and no React state per frame (2026-11-19): `components/network-arcs.tsx`, 8192 legs, one draw call
- [x] Camera director: one `CameraControls` and one owner per mode, and remove the duplicate camera (2026-11-19). Starlink view and Earth View checked in the browser
- [x] Convert the Earth textures to KTX2 (2026-11-19): `scripts/build-earth-textures.sh` (basisu ETC1S). 4K set is 3.8 MB to download; screens ≥2560 px wide get 8K colour and night lights (6.5 MB). GPU memory for the globe drops from ~760 MB to ~90 MB
- [x] Convert the Falcon OBJ to a Meshopt GLB (2.6 MB → 200 KB) and remove the per-frame `setState` (2026-11-19). Rockets aren't pooled: clones already share geometry and material, so a pool would save little
- [x] Stress test (2026-11-19): `__xno.burst(30, 5)` in dev. Arc work is ~0.015 ms per confirmation; the scene is 39 draw calls. 60 fps not measured (the browser pane was hidden). First load on the 4K tier is about 5 MB of textures and models, plus the 3 MB Starlink GLB

## Phase 2: world foundation and free flight

- [x] Real scale, precision and depth (2026-11-19). Changed from the plan: 1 scene unit = 1 Earth radius (6,371 km) instead of km. Ephemerides run in float64 on the CPU, three builds model-view matrices in float64, and the tiles are relative-to-centre, so camera jitter stays sub-metre without a floating origin. Reversed-Z is on where `EXT_clip_control` exists, but the default 24-bit depth buffer limits the gain, so the near plane also follows altitude (0.6 m skimming terrain, 6 km from orbit). A true floating origin waits until the Moon/Mars phases need it
- [x] Sun, Earth rotation and Moon from astronomy-engine, plus time warp (2026-11-19): `lib/astro.ts` (tests pin the frame), `lib/sim-clock.ts`, warp 1×/1 min/1 h/1 d per second. Removed the old 12 h offset and 23.5° tilt hack; night lights now only on the night side. The Moon's position is tested, but it hasn't been seen on screen yet
- [x] Multi-scale Earth with 3DTilesRendererJS, EOX 2016 imagery and AWS terrain (2026-11-19): `components/tiled-earth.tsx`, below ~3,200 km. Checked over the Alps and Starbase. Below-sea-level heights are clamped to 0. Known: flat lowlands show 1 m terracing from the source DEM under low sun; tile mode is ~160 draw calls (budget 150); EOX's free tile server should be asked before real traffic
- [x] Atmosphere (2026-11-19): limb glow from orbit (day blue, dusk orange), and below ~130 km a sky colour from sun elevation, haze (exp fog) and stars hidden in daylight
- [x] Optional Google 3D Tiles behind a flag (2026-11-19): shown only when `NEXT_PUBLIC_GOOGLE_MAPS_KEY` is set and the Photoreal button is pressed; per-browser cap `NEXT_PUBLIC_GOOGLE_TILES_MONTHLY_CAP` (default 50). The real spend cap must be a daily quota on the Map Tiles API in Google Cloud. Not tested (no key)
- [x] Free-flight mode (keyboard, mouse and gamepad) (2026-11-19): drone-style, speed scales with altitude, 30 m ground clearance from loaded terrain. Deep links `?fly=lat,lon,altKm[,heading,pitch]&time=ISO`. Keyboard/gamepad input not exercised by hand yet (checked through deep links and headless screenshots)

## Phase 3: launch sites and Starship operations

- [ ] Launch-site picker, with presets for Starbase, LC-39A and SLC-37
- [ ] Pad and tower with chopsticks, and a CC0 Starship and Super Heavy model as GLB
- [ ] Data-driven launch timeline (Flight 11 T+ events) with a simplified ascent
- [ ] Booster return and tower catch
- [ ] Nano sends trigger launches from the nearest site

## Phase 4: orbit, ship interior and space events

- [ ] Walkable ship interior (Rapier, first person) with windows onto the live Earth
- [ ] Meteor showers (IMO calendar), micrometeoroid hits, aurora, Starlink trains and ISS passes
- [ ] Hull-borne sound

## Phase 5: Moon and mass driver

- [ ] Trans-lunar transfer on rails, with time warp
- [ ] Moon globe (CGI Moon Kit) and a base
- [ ] 5 km mass driver, with the physics explained in the sim

## Phase 6: Mars

- [ ] Transfer windows, cruise, Mars globe, entry and landing

## Open decisions

See "Open decisions for Dalin" in [v2-plan.md](v2-plan.md): Google tiles, a feed relay, Banano, branding, hosting and votes.
