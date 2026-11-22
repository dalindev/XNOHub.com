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
- [x] Convert the Earth textures to KTX2 (2026-11-19): `scripts/build-earth-textures.sh` (basisu ETC1S). 4K set is 3.8 MB to download; screens ≥2560 px wide get 8K colour and night lights (6.5 MB). GPU memory for the globe drops from ~760 MB to ~90 MB. Superseded 2026-11-20: the flat Earth pictures are gone (Phase 2.6), the script now only encodes the fallback cloud picture
- [x] Convert the Falcon OBJ to a Meshopt GLB (2.6 MB → 200 KB) and remove the per-frame `setState` (2026-11-19). Rockets aren't pooled: clones already share geometry and material, so a pool would save little
- [x] Stress test (2026-11-19): `__xno.burst(30, 5)` in dev. Arc work is ~0.015 ms per confirmation; the scene is 39 draw calls. 60 fps not measured (the browser pane was hidden). First load on the 4K tier is about 5 MB of textures and models, plus the 3 MB Starlink GLB

## Phase 2: world foundation and free flight

- [x] Real scale, precision and depth (2026-11-19). Changed from the plan: 1 scene unit = 1 Earth radius (6,371 km) instead of km. Ephemerides run in float64 on the CPU, three builds model-view matrices in float64, and the tiles are relative-to-centre, so camera jitter stays sub-metre without a floating origin. Reversed-Z is on where `EXT_clip_control` exists, but the default 24-bit depth buffer limits the gain, so the near plane also follows altitude (0.6 m skimming terrain, 6 km from orbit). A true floating origin waits until the Moon/Mars phases need it
- [x] Sun, Earth rotation and Moon from astronomy-engine, plus time warp (2026-11-19): `lib/astro.ts` (tests pin the frame), `lib/sim-clock.ts`, warp 1×/1 min/1 h/1 d per second. Removed the old 12 h offset and 23.5° tilt hack; night lights now only on the night side. The Moon's position is tested, but it hasn't been seen on screen yet
- [x] Multi-scale Earth with 3DTilesRendererJS, EOX 2016 imagery and AWS terrain (2026-11-19): `components/tiled-earth.tsx`, below ~3,200 km (since 2026-11-20 at every distance, see Phase 2.6). Checked over the Alps and Starbase. Below-sea-level heights are clamped to 0. Known: flat lowlands show 1 m terracing from the source DEM under low sun; tile mode is ~160 draw calls (budget 150); EOX's free tile server should be asked before real traffic
- [x] Atmosphere (2026-11-19): limb glow from orbit (day blue, dusk orange), and below ~130 km a sky colour from sun elevation, haze (exp fog) and stars hidden in daylight
- [x] ~~Optional Google 3D Tiles~~ dropped (2026-11-19): Dalin chose no paid map services. Open sources only (EOX imagery, AWS terrain); the Google code was removed
- [x] Free-flight mode (keyboard, mouse and gamepad) (2026-11-19): drone-style, speed scales with altitude, 30 m ground clearance from loaded terrain. Deep links `?fly=lat,lon,altKm[,heading,pitch]&time=ISO`. Keyboard/gamepad input not exercised by hand yet (checked through deep links and headless screenshots)

## Phase 2.5: Starlink, cables and routed packets (2026-11-19)

- [x] Real constellation: 11,205 Starlink from CelesTrak GP (`scripts/build-starlink.mjs`), circular orbit + J2 drift on the GPU, within 25 km of SGP4 over 24 h (`lib/orbits.test.ts`). Version is estimated from launch date (no V3 in orbit yet). CelesTrak 403s repeat downloads within ~2 h: reuse a saved file with `STARLINK_GP_FILE`
- [x] Approximate laser mesh (4 neighbours + 1 cross-shell link each); real ISL topology isn't public
- [x] Submarine cables from TeleGeography (`scripts/build-cables.mjs`, 714 cables) drawn on the globe, fading near the ground
- [x] Routing: fibre (cables + modelled overland at 1.3× great circle, c/1.468) and Starlink (25° min elevation, laser mesh, c). `lib/routing/*`, tested on real data (NY→FRA 28–50 ms)
- [x] Packets: each confirmation travels real routes at real propagation delay × slow motion (default 50×). Modes Race / Cables / Starlink / Arcs (original), in the Network panel with live fibre vs Starlink timings
- [x] Procedural models (no downloads): Starlink V1.0, V1.5, V2 Mini, V3 (V3 sizes are estimates), Starship, Super Heavy (`lib/models/`). Old 3 MB Starlink GLB removed; Banano's ring uses the procedural V2 Mini
- [x] Starlink view: rides a real, sunlit satellite at true scale in real time (~94 min orbit); Next cycles V2 Mini → V1.5 → V1.0
- [x] Starship mission: liftoff from Starbase, hot staging, boost-back and catch, orbit, V3 deploy from the PEZ slot. Launch button, plus any send ≥ 1,000 Ӿ. Burns are time-compressed (×6, ×10), orbit is real time. From the globe the vehicles are enlarged and labelled so
- [ ] Check by hand in a real browser: frame rate with packets + 11k satellites on a mid-range laptop, and the chase views' controls (they're fixed chase cams for now; no drag-to-orbit)
- [ ] Starlink trains (fresh launches still raising orbit) as their own highlight

## Phase 2.6: real Earth, sky and signals (2026-11-20, local only)

Rule for this phase: real data first; where the data is coarser than the screen, detail is generated and the Data sources list says so. Checked with headless screenshots (`scripts/dev/shoot.mjs`), not yet by hand in a real browser.

- [x] One 3D Earth at every distance, no flat picture: `components/tiled-earth.tsx`. From high up NASA Blue Marble with shaded relief and sea floor (NASA GIBS, public domain, 600 m per pixel), one even picture of the whole planet. Below about 900 km Sentinel-2 cloudless (EOX) on AWS relief. The whole Earth changes set at once, once the other set has loaded (down at 900 km, back up at 1,100 km). Reason: the Sentinel-2 scans come from many different days and show as stripes and patches from high up
- [x] `components/earth-base.tsx`: one 308 KB picture of the whole planet (built from Blue Marble by `scripts/build-small-maps.py earth`) under the tiles for the first frame, behind loading tiles and when a tile server is down. It also closes the two poles: map tiles stop at 85.05°, and the library's stretched end caps showed as a pinwheel, so they are off
- [x] Ground lighting in one place, `lib/earth-light.ts`: sky light where the Sun is up, and a faint moonlit night side so continents show under the city lights
- [x] Data cost of the Earth, measured: far view about 0.4 MB (ordinary screen) to 0.8 MB (high-density) of Blue Marble tiles; going down over the Alps to 760 km adds about 0.8 MB imagery and 1 MB relief; a mountain close-up about 3 MB imagery and 9 MB relief. The old flat set was 3.8 to 6.5 MB up front. Removed from the repo: the six `public/earth/*.ktx2` surface pictures, the four 8K source pictures and the Falcon Heavy files (11 MB)
- [x] City lights from GeoNames (31,810 real cities and sizes, the individual lights are generated): `lib/cities.ts`, `components/city-lights.tsx`
- [x] Live clouds from NASA GIBS (VIIRS, the newest complete day), with off / light / full, falling back to the bundled picture: `lib/live-clouds.ts`, `components/three-cloud-mesh.tsx`
- [x] Aurora from NOAA SWPC: the oval and its brightness are the real 30-minute forecast; curtains, rays and colours by height are generated. Pace follows the live solar wind speed, activity follows Kp, the field's southward part and wind speed (`auroraDrive` in `lib/space-weather.ts`, tested). No late frames in 300 on an M4 at 2560×1600
- [x] Real sky: 9,096 catalogue stars, Sun, Moon and planets in place, Milky Way from NASA/Gaia with generated grain: `components/real-sky.tsx`, `lib/sky.ts`
- [x] Signals: each confirmation is broadcast to every online node and votes come back until two-thirds have (quorum), drawn as GPU ribbons; laser links computed at run time; node pads; dashboard with the fibre vs Starlink timing
- [x] Removed: Falcon Heavy and the Fly button (`?fly=` deep links stay; the tip meteor stays)
- [x] Camera can't go inside the Earth; near plane follows altitude up to 2 units so cables and nodes don't flicker from orbit
- [x] Signals default to Both (fibre and Starlink) in real time. A confirmation now takes about 0.25 to 0.3 s on screen, as on the real network: real light-speed travel (about 0.1 s) plus each node's time to check the block and vote, an estimate of 180 ms ± 40 (`lib/confirm-time.ts`, tested). The feeds don't report the real election time (asked for `include_election_info`, neither feed returns it), so that part is not measured. The dashboard says which part is which
- [x] Consensus drawn the way Nano does it (2026-11-21), from the Nano docs (ORV consensus, voting, V22 final votes): the block goes to every representative; each votes to all the others; a node that has seen 67% of the weight in votes sends a final vote; a node that has seen 67% in final votes has confirmed, each one for itself. `simulateElection` in `lib/confirm-time.ts` (tested) runs both rounds over every pair of nodes: fibre delays are real routes, Starlink delays between two non-sender nodes are estimated from distance. Drawn per node: block out, vote back, final vote back (pale green), then a green flash at each node when it confirms. Votes between the other nodes count in the timings but aren't drawn. Node work is still an estimate (about 100 ms to vote, 40 ms to finalise). In real time the afterglow is now 0.09 s, so it reads as three beats instead of a bolt that hangs
- [x] Every live node, with real places only (2026-11-21): `scripts/build-reps.mjs` now also reads `telemetry` from the public RPC (150 live nodes: 53 voting, 95 not) and places the ones nano.community has no place for by their network address (ip-api.com, free for non-commercial use; addresses are not written to the file). No place is ever guessed: an unplaced node is not drawn. Non-voting nodes are small dots (`components/relay-nodes.tsx`); the dashboard reads "150 live nodes, 53 voting". Not yet: signals to the non-voting nodes, hover on them, and refreshing `reps.json` on a schedule (it is a file built by hand)
- [x] Non-voting nodes take part (2026-11-21): nothing tells them "confirmed"; each hears the representatives' final votes and counts them itself (`hearFinalVotes`, tested). Its dot flashes green when they reach 67%, and the final vote that completed its count is drawn arriving. Default pace is now 10× slower than real (a 0.3 s confirmation is too quick to follow); the times shown stay real. Our simulated confirmation is about 260 to 270 ms; the only published measurement found is a 0.27 s network median (BeInCrypto, v19 era). It can't be measured live: `confirmation_history` is blocked on all three public RPCs tried
- [x] Dragging and zooming scale with height (`components/camera-director.tsx`): near the ground a drag moves the ground about as far as the pointer, 58 times slower than from far away
- [x] Smoother zooming: two tiles built at once instead of five, Blue Marble stays loaded at its coarsest while close up (no rebuild on the way back), and the canvas drops its resolution half a step when the frame rate stays low. With the CPU slowed four times, late frames in a scripted zoom went from 225 to 24 of about 1,500; at normal speed 0 of 1,622
- [x] A tile whose download failed is asked for again (up to 3 times, a few seconds apart) instead of staying blurry until reload. The library still prints its "Failed to load tile" line, which Next's dev overlay shows as an error
- [x] Night side darker again (between the first and second try)

Open:

- [ ] The two Earth sets differ in colour (Blue Marble is paler than Sentinel-2), so the change at 900 km is a visible step, not a blend
- [ ] Clouds are about a day old, and live clouds and aurora don't follow time warp
- [ ] Cable landing dots draw as small squares on high-density screens
- [ ] Ask EOX before real traffic on their free tile server; check NASA GIBS usage guidance too
- [ ] Run `pnpm build` (not run this phase: the dev server was using `.next`), then look at it by hand in a real browser
- [ ] Dalin saw lag in his browser; it didn't reproduce headless on the same Mac (GPU about 8.5 ms a frame at 3456×2234, CPU 72% idle). The changes above target the two likely causes; needs his check
- [ ] Close up on a high-density screen the ground is a little soft (one picture pixel per 4 device pixels, to halve the tile count); sharper costs more data

## Phase 3: launch sites and Starship operations

- [ ] Launch-site picker, with presets for Starbase, LC-39A and SLC-37
- [ ] Pad and tower with chopsticks (procedural Starship and Super Heavy done in 2.5)
- [ ] Data-driven launch timeline (Flight 11 T+ events); a simplified ascent exists in `lib/missions/starship.ts`
- [ ] Tower catch with real chopsticks (the booster returns to the pad already)
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

See "Open decisions for Dalin" in [v2-plan.md](v2-plan.md) (Google tiles: decided no, 2026-11-19): a feed relay, Banano, branding, hosting and votes.

- **TeleGeography cable data license** (before going public): `public/data/cables.json` comes from TeleGeography's submarine cable map API. Its terms for reuse aren't confirmed (an old copy in a GitHub repo was CC BY-NC-SA 3.0, which would rule out commercial use). Options: confirm the license with TeleGeography, or switch to an openly licensed source (OpenStreetMap `submarine=yes` cables, ODbL)
- **Moon and Mars**: guided missions rather than a full game (agreed 2026-11-19), after Phase 3
