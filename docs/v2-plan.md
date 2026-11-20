# XNOHub v2 plan

Drafted 2026-11-19. Inputs: the code audit in [v2-audit.md](v2-audit.md) and four research passes (live feed, rep list, 3D tech, Starship/space content), with sources linked in the [appendix](#appendix-research-notes).

## Goal

v2 turns XNOHub from a globe with arcs into a small browser space sim that still carries the live Nano network:

1. The live Nano network, rendered smoothly, with real nodes in real places.
2. A free-flying, game-like camera over a better, faster Earth.
3. Launch sites anywhere on Earth: click a spot, get a pad with a Starship-style stack, launch, and recover the booster.
4. Real-scale Earth, Moon and Mars, with a ride to orbit and a walkable ship interior looking back at Earth.
5. Later: a Moon base with a mass driver, then Mars.

## Questioning the scope

| Question | Answer |
|---|---|
| **Do we need all of it?** | Not to ship. Phases 0–1 fix what is broken today: the lag, the camera, stale nodes, security advisories. Each later phase is a separate, playable release, so the project can stop at any phase and still be whole. |
| **Is the Nano feed still valid?** | Yes. The live site's endpoint `wss://nanoslo.0x.no/websocket` still delivers confirmations (tested 2026-11-19). Real traffic is only about 0.3 confirmations a second. **Votes are not available from any public node tested**, and v1 never used them anyway. |
| **Why was it slow?** | Not because of load. At 0.3 confirmations a second the lag is the code: duplicated arcs, React re-rendering every frame, and one draw call per arc (see the audit). A rewrite fixes this, and the adaptive "percentage of nodes" mode can go away. |
| **"SpaceX simulator"?** | SpaceX's trademark policy forbids using its name and logo to imply endorsement. Call it a Starship-*inspired* sim, add an "unaffiliated fan project" line, and use no logos. |
| **Google Maps for city looks?** | Possible but limited. Google Photorealistic 3D Tiles give 1,000 free root sessions a month, then $6 per 1,000. Caching is banned and attribution is required. **Decided 2026-11-19: not used**, because it costs money. Free open tiles only. |
| **"Real calculation" of scale?** | Yes for positions and distances: real ephemerides, real km. Physics should be "on rails" plus a simplified ascent, not n-body. Time warp is required: a Moon trip takes about 3 days and Mars about 7–9 months. |
| **5 km mass driver?** | Musk spoke of a lunar mass driver (Feb 2026) but gave no length. The 5 km is our own choice. It reaches lunar escape speed (2.38 km/s) at about 58 g over 4.2 s, which is fine for cargo and satellites but not crew, and the sim should show that. |

## Target architecture

```
Next.js 16 app shell (pages, OG, API routes, cron)
└─ <Sim/> client-only canvas (dynamic import, ssr:false)
   ├─ core/            plain TS, no React
   │  ├─ clock         sim time + time warp
   │  ├─ ephemeris     astronomy-engine → Sun/Moon/Mars positions (km, float64)
   │  ├─ world         entity store (zustand vanilla), float64 positions
   │  ├─ orbits        Kepler propagation + sphere-of-influence switching, ascent model
   │  └─ net           feed client (Web Worker): ws + reconnect + fallback + dedupe
   ├─ render/          R3F layers, read the store in useFrame, never setState per frame
   │  ├─ origin        floating origin: camera-relative transforms each frame
   │  ├─ sky           stars, Sun, Milky Way
   │  ├─ planets       Earth (LOD), Moon, Mars
   │  ├─ network       nodes (InstancedMesh) + arcs (one instanced shader, ring buffer)
   │  ├─ vehicles      Starship / Super Heavy / tower, plumes, particles
   │  └─ interior      ship interior (Rapier physics, first person)
   ├─ modes/           globe | fly | site | launch | orbit | interior | moon | mars
   │  └─ camera director: exactly one controller active per mode
   └─ ui/              React HUD (throttled store selectors, ~4–10 Hz)
```

### Principles

- **No per-frame React state.** Simulation state lives in a store. Render components mutate three.js objects in `useFrame`, and React only renders the HUD.
- **One draw call per system.** Nodes, arcs, particles, Starlink trains and debris are instanced or batched.
- **Positions are float64 in km on the CPU.** Each frame the GPU gets camera-relative float32 positions (floating origin), with reversed-Z depth. Avoid the log depth buffer: it disables early-Z, and one test showed 65 → 35 fps.
- **Units are explicit.** Use km in the world and m inside local frames (pad, interior). Local frames are anchored to a world entity.
- **Assets ship compressed.** Textures are KTX2 (Basis ETC1S, or UASTC for normal maps). Models are GLB with Meshopt. Earth detail streams in as tiles, never as one 8K image.
- **WebGL2 now.** Use R3F 9 and drei 10. WebGPU, through R3F 10 and three's WebGPU renderer, stays an experiment flag until R3F 10 is stable.

### Performance budgets (to be enforced in a CI perf check)

- **Frame rate:** 60 fps on an M1-class laptop and 30+ fps on a mid-range phone in globe mode.
- **First load:** 5 MB or less before the globe is interactive. Detail streams after that.
- **GPU memory:** 400 MB or less on desktop and 200 MB or less on mobile.
- **Draw calls:** 150 or fewer in globe mode.

## Phases

Each phase ships to production and has a clear exit test.

### Phase 0: cleanup and stack upgrade

- **Prune dependencies.** Remove the 9 unused dependencies and Tremor's `transpilePackages`, delete `tailwind.config.ts`, and add `banano/**` to Tailwind content.
- **Upgrade the stack.** Move to Next 16.4, React 19.x, R3F 9.8, drei 10.7 and three r187, plus `@types/three` to match. Use ESLint flat config, since `next lint` is gone. TypeScript 5.x stays until TS 7 tooling settles.
- **Remove dead branches.** Delete `vercel/react-server-components-cve-vu-ud5yem` and the merged patch branches. Archive `xnohub-v4` and `improve-performance` as tags first.
- **Add CI.** A GitHub Action runs typecheck, lint and build on every PR.
- **Exit test:** `pnpm audit --prod` shows 0 high or critical findings, and the site looks and behaves as before.

### Phase 1: network core rewrite (release v2.0)

- **Feed.**
  - Move the websocket into a Web Worker with reconnect and exponential backoff.
  - Use primary `wss://nanoslo.0x.no/websocket`, falling back to `wss://node.somenano.com/repeater`. The repeater sends a batch shape (`{blocks[]}`), so it needs a small adapter.
  - Dedupe by block hash.
  - Drop the `vote` and `stopped_election` subscriptions.
  - Later option: a tiny relay (a Cloudflare Durable Object, since Vercel can't hold an upstream socket) to fan one upstream out to all browsers and switch sources.
- **Rep list.**
  - Add a GitHub Action, every 12 h, that pulls `https://nano.community/api/representatives`. It is MIT-licensed and has alias, weight, last_seen, and lat/lon from telemetry IPs.
  - Cross-check online status and weight with `confirmation_quorum` on rpc.nano.to, falling back to node.somenano.com.
  - Commit a slim `public/data/reps.json` holding `account, alias, weightPct, online, lastSeen, version, lat, lon, city, country, hosted`.
  - Keep principal reps (≥ 0.1% of online weight) plus online reps.
  - **Delete the fake big-city fallback.** Unnamed reps show a short address. Reps with no location are listed but not placed on the globe.
  - Credit nano.community on the site.
- **Rendering.**
  - Nodes become one `InstancedMesh`, sized by weight and dimmed when offline, with hover through `instanceId`.
  - Arcs become one `InstancedBufferGeometry`. Each instance holds a source index, destination index, birth time, duration, colour and size. The vertex shader evaluates the lifted great-circle and draws a glowing head plus a fading trail from a single `uTime` uniform.
  - A ring buffer with a fixed capacity (e.g. 4,096 arcs) and no React per arc.
  - Fan-out can return to 100% of nodes because the cost is constant.
- **Camera director.**
  - Use a single `<CameraControls>` (drei) for orbiting the globe.
  - Follow modes (rocket, Starlink) disable it and take over in one place, then hand back with a smooth transition.
  - Remove the duplicate camera.
- **Earth assets.**
  - Convert to KTX2 at 4K for the base globe and 8K only as an optional desktop tier.
  - Pack water, bump and night into channels of one texture where possible.
  - Clouds become a KTX2 with alpha, or a cheap procedural shell.
- **Rockets.**
  - Convert the Falcon OBJ to a Meshopt GLB.
  - Pool rocket instances and drop the per-frame `setElapsedTime`.
- **Exit test:** a 10× sample-feed stress test holds 60 fps on desktop, globe-mode draw calls stay at 150 or fewer, first load is 5 MB or less, and the node list matches nano.community for that day.

### Phase 2: world foundation and free flight

- **Units and precision.** Real km units, a floating origin and reversed-Z depth, with a test scene that spans LEO to the Moon without z-fighting or jitter.
- **Real sky.** Sun direction, Earth rotation (GMST), axial tilt and the Moon position come from `astronomy-engine`, replacing the current hand-rolled sun formula with its 12 h offset. Add a time-warp control.
- **Multi-scale Earth.** Use 3DTilesRendererJS (Apache-2.0, has R3F bindings) with open tiles: EOX Sentinel-2 cloudless 2016 (CC BY 4.0) imagery and AWS Terrain Tiles for relief. Add an atmosphere scattering shell. Google Photorealistic 3D Tiles were considered and dropped (2026-11-19, paid).
- **Fly mode.** A game-like free flight using WASD or the gamepad plus the mouse, with speed that scales with altitude. Go from orbit down to a few km and back.
- **Exit test:** fly from a whole-Earth view down to about 2 km over a city and back up to the Moon's distance, with no precision artefacts and within budget.

### Phase 3: launch sites and Starship operations

- **Site picker.** Click anywhere on land to create a launch site, with preset real sites:
  - Starbase TX: 25.997°N, 97.158°W
  - LC-39A: 28.608°N, 80.604°W
  - SLC-37: coordinates to be confirmed
- **Site scene.**
  - The site is a local frame in metres.
  - It has a procedural pad, a tank farm and a tower with "chopsticks". No CC0 tower model was found, so we build a simple one.
  - The stack model is an existing CC0 Starship and Super Heavy (Blendswap #27853), cleaned up and converted to GLB.
- **Launch timeline.**
  - Data-driven from Flight 11's real T+ events: Max Q about 0:45, MECO 2:37, hot staging 2:39, boostback 2:49–3:38, landing burn 6:20–6:36, SECO 8:58.
  - Uses Block 3 figures: 124.4 m tall, 9 m wide, 33 + 6 Raptors.
  - The ascent model is simplified physics: thrust, mass flow, drag and gravity turn.
  - The booster returns and the tower catches it.
- **Network tie-in.** Nano sends still trigger launches from the nearest site, as rockets do today. Large sends trigger bigger events. The donation animation is kept.
- **Exit test:** pick a site, watch a full launch with a booster catch and the ship reaching orbit, and the camera can follow each stage.

### Phase 4: orbit, ship interior and space events

- **Interior.**
  - Walk inside a Starship crew deck in first person, using Rapier for collisions. A floating or magnetic-boots mode is an open question.
  - The windows show the real world through the floating origin, so the Earth outside is the same Earth with live arcs.
- **Space events.** Each is gamified, and the UI says so:
  - Meteor showers from the IMO calendar, seen as streaks *below* the ship at 80–100 km.
  - Micrometeoroid hits, as sparks and window chips.
  - Aurora on the limb.
  - Starlink trains and ISS passes from public TLEs (satellite.js).
  - A day/night terminator.
- **Audio.** In vacuum there is no outside sound, so hits are heard only as thumps through the hull. Use CC0 Freesound clips, checked one by one.
- **Exit test:** reach orbit, walk to a window, see the live network on Earth, and experience at least 3 event types.

### Phase 5: Moon and mass driver

- **Transfer.** Trans-lunar injection of about 3.1 km/s and a trip of about 3 days, on rails, with time warp.
- **Moon.** Use NASA's CGI Moon Kit (LOLA elevation and LROC colour) as a streamed globe, and land at a base site.
- **Mass driver.** A 5 km track at 58 g reaches lunar escape speed in about 4.2 s. Payloads fly to Earth orbit or deep space. A short in-sim explanation covers the physics and that the idea traces back to O'Neill's mass drivers.
- **Exit test:** fly from Earth orbit to the Moon, land, and fire the driver to launch a payload whose trajectory is visible.

### Phase 6: Mars

- **Windows.** Hohmann windows every ~26 months. The transfer is about 259 days and about 5.6 km/s, compressed with time warp.
- **Mars.** A Mars globe from MOLA elevation (public-domain status to be confirmed) and Solar System Scope textures (CC BY 4.0).
- **Exit test:** plan a transfer in a real window, cruise with warp, and do an entry and landing.

## Open decisions for Dalin

1. **Google 3D Tiles:** decided 2026-11-19: no. It costs money past the free tier, so the sim uses free open sources only (EOX imagery, AWS terrain). City detail at launch sites will come from our own models.
2. **Relay server for the feed:** add a Cloudflare Durable Object in Phase 1, or rely on direct public sockets plus a fallback for now.
3. **Banano:** keep the Banano page in v2, drop it, or freeze it on v1 code.
4. **Branding:** the name of the sim part, and the fan-project disclaimer.
5. **Hosting:** stay on Vercel (assumed).
6. **Votes:** accept that there are no vote visuals, or run our own Nano node later to get them.

## Appendix: research notes

Every claim was sourced in the research pass. The main sources:

- **Feed:**
  - The live site bundle names `wss://nanoslo.0x.no/websocket` and `wss://ws2.banano.trade`.
  - Public node list: https://github.com/somenano/publicnodes.somenano.com
  - Repeater: https://node.somenano.com
  - API docs: https://docs.nano.org/integration-guides/websockets/
- **Reps:**
  - API: https://nano.community/api/representatives
  - Source code: https://github.com/mistakia/nano-community
  - RPC: https://rpc.nano.to
  - Status on 2026-11-19: nanolooker returned 520, spyglass and mynano.ninja are dead, and nano.work is a parked domain.
- **Stack:**
  - three.js r187: https://github.com/mrdoob/three.js/releases
  - R3F 9.8.2: https://github.com/pmndrs/react-three-fiber/releases
  - drei 10.7.9: https://github.com/pmndrs/drei/releases
  - @react-three/rapier 2.2.0: https://github.com/pmndrs/react-three-rapier/releases
  - Next 16.4: https://nextjs.org/blog
- **Tiles:**
  - Renderer: https://github.com/NASA-AMMOS/3DTilesRendererJS
  - Google pricing and policies: https://developers.google.com/maps/documentation/tile/usage-and-billing and https://developers.google.com/maps/documentation/tile/policies
  - EOX license: https://cloudless.eox.at/documentation/license
- **Depth:**
  - Log depth cost: https://discourse.threejs.org/t/beware-of-logarithmic-depth-buffer-it-can-degrade-scene-performance/88495
  - Reversed-Z example: https://threejs.org/examples/webgl_reverse_depth_buffer.html
- **Ephemeris:** https://github.com/cosinekitty/astronomy
- **Starship:**
  - Vehicle overview: https://en.wikipedia.org/wiki/SpaceX_Starship
  - Flight 11 timeline: https://en.wikipedia.org/wiki/Starship_flight_test_11
  - Trademark policy: https://spacex.com/trademark
- **Mass driver:** https://space.com/astronomy/moon/elon-musk-wants-to-put-a-satellite-catapult-on-the-moon-its-not-a-new-idea
- **Assets:**
  - Starship model: https://blendswap.com/blend/27853 (CC0)
  - Moon and Mars textures: https://www.solarsystemscope.com/textures/ (CC BY 4.0)
  - Moon data: https://svs.gsfc.nasa.gov/4720
- **Prior art:**
  - https://github.com/redradman/artemis (R3F + Zustand)
  - https://github.com/hyqzz/Solar-Wanderer (floating origin, MIT)
