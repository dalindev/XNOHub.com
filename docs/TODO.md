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
- [x] Run locally (2026-11-19): main page shows the globe, night lights, rep bars, arcs, rockets and stars with no console errors. Banano page loads with its feed and no errors, but its 3D canvas wasn't captured (browser pane was in the background). Starlink view not clicked through yet.
- [x] `pnpm audit --prod` is clean (2026-11-19), using `pnpm.overrides` for 7 nested advisories (braces, cross-spawn, picomatch, fflate, @babel/runtime)
- [ ] Add CI: a GitHub Action that runs typecheck, lint and build on every PR (deferred: nothing is pushed yet)
- [ ] Old branches: delete `vercel/react-server-components-cve-vu-ud5yem` and the merged patch branches, and tag `xnohub-v4` and `improve-performance` before removing them. This needs Dalin's OK because it changes the remote.

## Phase 1: network core rewrite (v2.0)

- [ ] Move the feed into a Web Worker, with reconnect and backoff
- [ ] Use nanoslo as the primary feed and the somenano repeater as the fallback (the fallback needs a batch adapter)
- [ ] Dedupe confirmations by hash
- [ ] Drop the unused `vote` and `stopped_election` subscriptions
- [ ] Add a GitHub Action that builds `public/data/reps.json` from nano.community plus `confirmation_quorum`, every 12 h
- [ ] Remove the fake big-city fallback; reps without a location are listed but not drawn on the globe
- [ ] Credit nano.community on the site
- [ ] Draw the nodes as one `InstancedMesh`, with hover through `instanceId`
- [ ] Set the four React Compiler lint rules back to error
- [ ] Rewrite the arcs as one instanced shader with a ring buffer, and no React state per frame
- [ ] Camera director: one `CameraControls` and one owner per mode, and remove the duplicate camera
- [ ] Convert the Earth textures to KTX2: 4K as the base, with an optional 8K desktop tier
- [ ] Convert the Falcon OBJ to a Meshopt GLB, pool the rockets, and remove the per-frame `setState`
- [ ] Add a stress test with a 10× sample feed: 60 fps, 150 draw calls or fewer, first load 5 MB or less

## Phase 2: world foundation and free flight

- [ ] Real km units, a floating origin and reversed-Z depth
- [ ] Sun, Earth rotation and Moon from astronomy-engine, plus time warp
- [ ] Multi-scale Earth with 3DTilesRendererJS, EOX 2016 imagery and AWS terrain
- [ ] Atmosphere shell
- [ ] Optional Google 3D Tiles behind a flag, with a spend cap
- [ ] Free-flight mode (keyboard, mouse and gamepad)

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
