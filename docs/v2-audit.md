# XNOHub v1 audit (2026-11-19)

Read-only audit of `main` at `58d9c1d`, the starting point for the v2 plan in [v2-plan.md](v2-plan.md).

## Why the arcs lag

Root causes in [components/network-arc.tsx](../components/network-arc.tsx) and [providers/confirmation-provider.tsx](../providers/confirmation-provider.tsx), most costly first:

1. **Each confirmation spawns its arcs several times.** The provider keeps a confirmation in `activeConfirmations` for 500 ms. The arc effect re-runs on every change to that list (every add *and* every timed removal) and builds arcs for **all** active confirmations again, not only new ones. At a few TPS, each confirmation's arcs are created about 2–6 times over.
2. **React re-renders every arc every frame.** `useFrame` calls `setArcs(...)`, so the whole arc list is rebuilt and re-rendered 60 times a second.
3. **One draw call and fresh GPU buffers per arc per frame.** Each arc is a drei `<Line>` (Line2, fat lines). Every frame it gets a new points array and a `new THREE.Color`, so the geometry is re-uploaded. With fewer than 5 BPS the fan-out is 100% of nodes, so one confirmation means 86 arcs, times 2 legs.

Live traffic is only about 0.3 confirmations a second (measured 2026-11-19), so the lag comes from the code, not the network load.
4. **Segment length jitters.** `getRandomSegmentLength` runs during render, so the trail length changes every frame.
5. **Index keys.** `key={index-...}` remounts arcs whenever earlier ones finish.
6. **Console spam on the hot path.** `calculateBPS` and `getAdaptiveNodesPercentage` log on every call, once a second plus once per confirmation.

The adaptive node percentage (#15) treats the symptom. The fix is structural: one GPU-animated, instanced arc system with a fixed capacity, driven by a ring buffer outside React (see the plan).

## Other performance issues

- **87 separate node meshes.** [nano-rep-nodes.tsx](../components/nano-rep-nodes.tsx) renders one `<Node>` mesh per rep, so 87 draw calls plus per-node hover state. These should be one `InstancedMesh`.
- **Rocket state is updated every frame.** [falcon-heavy-animation.tsx](../components/falcon-heavy-animation.tsx) calls `setElapsedTime` in `useFrame` for each rocket, re-rendering each rocket every frame.
- **Large textures.** The globe uses the "mini" set (about 6.5 MB of JPG/PNG: 2 MB colour, 2.2 MB clouds PNG, 0.8 MB water PNG, 0.75 MB night, 0.5 MB bump). They are uncompressed on the GPU, so an 8K RGBA texture takes about 256 MB of VRAM with mipmaps. The full-size `public/earth-assets/` set (29 MB) and the Falcon Heavy OBJ (2.5 MB, text format) are also shipped. The 20 000-point `Stars` field is fine.
- **Expensive arc lines.** drei `Line` is Line2 (screen-space quads with a heavy shader). Thin glowing trails can use a cheaper custom shader.

## Camera issues

- **Two default cameras.** `<Canvas camera={...}>` creates one, and `<PerspectiveCamera makeDefault>` creates a second with the same settings.
- **Cameras fight the controls.** Rocket view ([falcon-heavy-animation.tsx](../components/falcon-heavy-animation.tsx)) and Starlink view ([starlink-mesh.tsx](../components/starlink-mesh.tsx)) write `camera.position` and `lookAt` in `useFrame`. `OrbitControls` stays mounted the whole time, with only rotate and zoom disabled, so it keeps applying its own target. That causes jitter and snapping, and after "Earth View" the camera jumps without the controls' target or internal state being reset.
- **Several systems own the camera.** No one owns it at any given moment. v2 needs a single camera director with one mode active at a time.

## Data issues

- **Stale node list.** The list is a hard-coded snapshot of 87 reps ([data/defualtMergedRepsData.ts](../data/defualtMergedRepsData.ts)). On 2026-11-19, 37 of them (43%) were offline and 7 current principal reps were missing, though the list still covered about 92% of online weight.
- **Unused vote subscription.** The hook subscribes to `vote` and `stopped_election`, but nothing consumes them, and no public node tested delivers votes anyway.
- **Fake locations.** Reps without a known location are given big-city coordinates in list order ([lib/merge-nano-reps-data.ts](../lib/merge-nano-reps-data.ts)), so many dots are not where the node is.
- **Live feed URL is not in the repo.** It lives only in the deployment env (`NEXT_PUBLIC_WS_URL`), and the default config falls back to sample data. Research findings are in the plan.
- **No reconnect.** The websocket hook has no reconnect or backoff. When the socket closes, the globe goes quiet until a reload.

## Housekeeping

- **9 unused runtime dependencies.** `@tremor/react`, `@headlessui/react`, `@heroicons/react`, `@planetscale/database`, `d3-geo`, `three-geojson-geometry`, `js-cookie`, `prop-types` and `server-only` are never imported, but they cause most of the 71 production audit findings.
- **Next.js advisories.** `next` 14.2.35 has 25 advisories, and the fix needs 15.5.28 or later.
- **Banano classes may be missing.** `banano/` is not in Tailwind's `content` globs, so classes used only there may not be generated.
- **Two Tailwind configs.** `tailwind.config.js` and `tailwind.config.ts` both exist, and Tailwind 3 loads the `.js` one.
- **Old branches.** Unmerged commits are left on `xnohub-v4` (2025-02 dashboard prototype) and `improve-performance` (2024 mock data). `vercel/react-server-components-cve-vu-ud5yem` duplicates #16.
