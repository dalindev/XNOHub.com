# Starship's flames, smoke and steam

How the engines, plumes, steam, trail and hot staging are drawn, what each look is based on, and what is our estimate. Written 2026-11-22 from research into launch photos, physics and engine geometry (sources at the end). Code comments cite this file.

## Where it lives

| What | Code |
|---|---|
| Plume look by height and engines lit (keyframes) | `lib/plume/look.ts` |
| Plume shader (ray-marched glowing gas, diamonds, frost shell) | `lib/plume/plume-material.ts` |
| Nozzle exits and bell insides glowing | `lib/plume/nozzle-glow.ts` |
| Shock-cell length and count by height | `lib/plume/physics.ts` |
| Colours | `lib/plume/palette.ts` (ids below) |
| Hot-staging jets out of the booster's ring | `lib/plume/staging-vents.ts` |
| Pad steam, condensation trail, hot staging's exhaust ring | `lib/models/exhaust-cloud.ts` |
| Engine schedule (which engine burns when), plume on/off times | `lib/missions/starship.ts` (`boosterEngineLit`, `shipEngineLit`, `boosterGas`) |
| Wiring per frame | `components/starship-mission.tsx` |

## Conventions

- **SW (sunlit white) = 1**: the radiance of a white matte surface in full sun, `2/π` scene-linear here (`lib/world` `SUNLIT_WHITE`). Every brightness below is in SW; shaders multiply by `uSW`. Levels are fixed, not tied to exposure: the camera look (`components/camera-look.tsx`) exposes for the scene.
- Colours are sRGB hex picked from photos, used as linear colour scaled to unit luminance, so brightness is set separately.
- D = 9 m (the booster's diameter).
- "Est." means our estimate where no source gives a number.

## What changes with phase

Mostly the air stops shaping and lighting the exhaust; the engines' own colour hardly changes.

| Phase (our clock) | What it looks like | Basis |
|---|---|---|
| Pad and liftoff (T−3 s … T+10 s) | 33 white-hot discs; lavender-pink column about 1 D wide (while the engines light, centre 3 then middle 10 then outer 20, it widens with them); white core with 3 shock diamonds every 24–27 m, the first 10–17 m below the exits; orange only where exhaust meets air, steam and dust (a collar round the engines, the outer edge, the tail). Two steam towers out of the Pad 2 trench ends, taller than the 145 m tower within seconds. | IL-A…F, PH S7 |
| 0–30 s (to 2.5 km) | Core dims 2–3 stops; diamonds stretch (27 → 32 m) and drop to 2. | IL-G, IL-H |
| Max-Q (~10 km, T+1:02) | Translucent salmon-pink ribbon, 3–4× the sky by day; no diamonds above ~9 km; separate engine strands. | IL-I, IL-J |
| 20–40 km | White ball at the engines inside a thick white condensation trail, widening at 12–15°; pink glow inside the trail for 25–30 D; orange gone. | IL-K |
| 40–70 km | Faint hollow grey-white bell of sunlit frozen exhaust (shows at twilight as the "jellyfish"). | IH-4, PH S27 |
| MECO (T+2:36, 65 km) | 30 engines out within ~0.2 s; the big plume comes off the nozzles and fades as it drifts away (~0.3 s, est.); the **centre 3 keep burning** through staging and the flip. | PH S5, S6 |
| Hot staging (T+2:38, 67 km) | See below. | IH-1, IH-2, PH S6 |
| Ship burn to orbit | Six glowing nozzles (3–4 SW centres, ~1 rims) and nothing visible behind them by day. | IH-6, IH-7 |
| Boost-back (13 engines, 72–92 km) | Soft lobes of sunlit exhaust round a small bright core. | IH-3 |
| Landing burn (13 → 3) | Narrow, very translucent lavender-white flame; weak diamonds only in the last km. | IH-10, IH-11 |

Methane-oxygen engines make almost no soot: what reads as smoke is pad steam and dust, a thin wake, then the condensation trail (PH S14–S17).

## Hot staging

| Moment | Look | Basis |
|---|---|---|
| Ship's engines light on the booster | Their exhaust hits the shield over the booster's forward dome and blasts out through the ring's vents: a starburst of radial jets, white-hot at the vents (cyan-white from the ship's cameras), lavender haze, reaching about 1 D beyond the vents. From the ground: a broken ring of fire about 15 m across round a dark disc, clipped (≥7× the sky). The first moments are orange (seen from the ground), then white (seen from the ship); we draw orange for the first ~1 s (est.). | IH-1, IH-2 |
| Ship pulling away | The exhaust spreads off the dome's rim as one sheet, weaker as the gap grows (the share of the spreading plume a 4.5 m dome catches), gone once the booster has turned away (its flip starts 2 s after staging). | Est. |
| Afterwards | The vented gas flies out at about 1 km/s and stops within ~0.2 s, once it has swept up its own mass of the thin air (~4 t of exhaust; air at 67 km is 1.5e-4 kg/m³): a ring of grey-lavender exhaust 360–630 m across, a clear white smudge from the ground (about 1.4× the sky on screen in our render), fading over a couple of minutes. | IH-1, IH-3; stopping time and brightness est. |

Drawn as: 23 jets (one per whole vent opening of the ring's texture, `VENT_PITCH_M` 1.2 m) and a sheet of 23 more off the dome's rim (`staging-vents.ts`, `ventState`); a glowing band behind the vents; the ship's plume clipped at the booster's top while the gap is under 10 m; 234 exhaust puffs in 13 rings, each leaving the booster's ring where the booster is at that moment (`exhaust-cloud.ts`, `buildStaging` with `ventsAt`), glowing orange then peach for their first ~0.3 s.

The ship pushes straight off along its axis for the first second, then the booster drifts onto its own path (`missionAt`).

What V3's staging looks like is not yet known (the photos are of V2, Flights 5 and 13–14).

## Steam, trail and the engine light on them

- **Pad 2 steam**: two towers out of the trench's ends (42 m from the mount, facing 123° and 303°), a skirt rolling out along the ground, deluge mist before ignition. Sunlit S4 `#cbbcb0`, shade `#8098a9`. Grows ~6 → 30 D tall in ~15 s, then rises for minutes to 1–2 km and drifts east. Lit by the flame: yellow `#f2df78` near it, orange `#ffac5e` further; at twilight the flame's light is raised to match photos (`FIRE_LOW_LIGHT`).
- **Condensation trail**: 5–45 km, a puff every 300 m of path, widening behind the stack at ~13°, stretched along the path, drifting and twisting on the winds (a ~30 m/s jet stream near 12 km). Sunlit S3 `#ddd6ce`; pink glow `#ffb1c6` inside it right behind the plume.
- The billows themselves (their noise, lumps, self-shadowing) are generated; sizes, timings and colours come from the photos.

## Palette

`lib/plume/palette.ts`; ids as in our research notes.

| Id | Role | sRGB | Source |
|---|---|---|---|
| P1 | nozzle exit, white-hot | `#fff8f0` | IL-H |
| P2 | exit-plane band, single-engine jets | `#ffe6c5` | IL-C |
| P3, P4 | near field: rose, lilac | `#eebdbf`, `#fbd8ea` | IL-H, IL-G |
| P5 | diamond node | `#fefaff` | IL-C |
| P6, P7 | core orchid, gap mauve | `#f1bfec`, `#ce8db5` | IL-C |
| P9–P12 | fringe: peach, amber, orange (low light), red skin | `#f1dcc7`, `#e9b57b`, `#f1944c`, `#c5562f` | IL-D, IL-H |
| P13, P14 | tail: salmon, rust | `#e8ab99`, `#b77259` | IL-G, IL-H |
| P15, P16 | body at 10–20 km, pink at 20–30 km (sky removed) | `#ffa889`, `#ffb1c6` | IL-I/J, IL-K |
| P17 | collar at liftoff | `#ffc07a` | IL-C |
| P18 | sunlit frozen exhaust | `#f2f7ff` | IH-3, IH-4 |
| P19, P20 | vacuum nozzle: centre, surround | `#fefce6`, `#a99676` | IH-7, IH-6 |
| P21, P22 | hot-staging ring: core, orange | `#dfdbad`, `#ffa542` | IH-1 |
| – | hot-staging jets, haze, clouds (from the ship) | `#bde5ee`, `#a888ad`, `#d2bdb9` | IH-2 |
| P23–P25 | landing: V3 daylight, V2 dawn, core | `#e0cfff`, `#ffcd5d`, `#f9fadd` | IH-11, IH-10 |
| P26, P27 | fire-lit steam, fuel-rich flare | `#f2df78`, `#ffac5e` | IL-A, IL-B |
| S1–S6 | smoke wake grey/brown, contrail, Pad 2 steam, golden-hour cloud, staging smoke | `#6e6f73`, `#945b60`, `#ddd6ce`, `#cbbcb0`, `#dea051`, `#46475b` | IL-G/H/K/E/D, IH-1 |

## Estimates and unknowns

- All brightness levels are estimates within what the photos allow (most photos clip the brightest parts).
- Engine start order at ignition is real; the times are ours.
- Max-Q throttling, a Mach-1 vapour cone and condensation rings from pressure waves: not drawn (not in our sources, or optional).
- The landing burn's 13 → 3 switch time and V3's staging look are unknown.
- Nozzle-wall afterglow after cutoff: unknown, not drawn.

## How to check

Headless frames of the live scene with the dev hooks (`__xno.starship(met)`, `__xno.hold()`, `__xno.freezeFlames()`, `__xno.spotter({ target, rel | at, aim, fov, look })`, `__xno.shipCam(id)`, `__xno.flameInfo()`, `__xno.steam()`), compared with the photos below at the same moments.

With the dev server running, `node scripts/dev/probe.mjs scripts/dev/specs/flames.mjs video/out/flames` shoots the 39 reference views (pad, the beach on South Padre Island, chase, onboard and the leftover staging ring) in one page load, each held still. `GROUP=plume|steam|trail|staging` or `ONLY=name,…` shoots fewer. The browser profile in `video/out/shot-cache` keeps the map tiles, so a run downloads almost nothing after the first.

## Sources

Photos (IL low altitude, IH high altitude):

- IL-A Flight 5 ignition, T+1 s: https://commons.wikimedia.org/wiki/File:SpaceX_Ignition_(54063834163).jpg
- IL-B Flight 5, T+8 s: https://commons.wikimedia.org/wiki/File:Liftoff_of_SpaceX_IFT-5_(54064037095).jpg
- IL-C Flight 2 shock diamonds: https://www.twz.com/starships-33-engines-created-the-mother-of-all-shock-diamonds
- IL-D Flight 11, golden hour: https://commons.wikimedia.org/wiki/File:Starship_lifted_off_from_Starbase_during_flight_test_11.jpg
- IL-E Flight 12 at Pad 2: https://nss.org/starship-flight-12-testing-learning-and-moving-forward/
- IL-F Booster 9 static fire: https://www.space.com/spacex-starship-super-heavy-static-fire-photos-august-2023
- IL-G Flight 2 ascent at sunrise: https://commons.wikimedia.org/wiki/File:Starship-IFT2-ascent.jpg
- IL-H Flight 5, T+39 s: https://commons.wikimedia.org/wiki/File:SpaceX_Starship_during_IFT-5.jpg
- IL-I Flight 1 in daylight: https://commons.wikimedia.org/wiki/File:StarshipLaunch.jpg
- IL-J NASA tracking frame, Flight 2: https://commons.wikimedia.org/wiki/File:Starship_IFT-2_NASA_Track_Crop.png
- IL-K Flight 5, T+79 s and T+89 s: https://commons.wikimedia.org/wiki/File:SpaceX_IFT-5_Climbing_Overhead_(54063904214).jpg, https://commons.wikimedia.org/wiki/File:SpaceX_IFT-5_Launch_(54063581561).jpg
- IH-1 Hot staging from the ground, Flight 5: https://upload.wikimedia.org/wikipedia/commons/c/cb/SpaceX_Starship_hot_staging_IFT-5.jpg
- IH-2 Hot staging from the ship, Flight 5: https://cdn.wccftech.com/wp-content/uploads/2024/10/SPACEX-STARSHIP-IFT-5-1-1456x819.jpeg
- IH-3 Boost-back, Flight 15: https://cdn.mos.cms.futurecdn.net/CpFBdqxJAisbcpbmqaGXgd-1200-80.jpg
- IH-4 Twilight "jellyfish" bell, Flight 5: https://upload.wikimedia.org/wikipedia/commons/a/a6/Booster_Plume_of_SpaceX_IFT-5_%2854062708072%29.jpg
- IH-6, IH-7 Separation, Flights 13 and 14: https://cdn.mos.cms.futurecdn.net/Z5sRcMEVPouUb4LeG6qia8-1200-80.jpg, https://cdn.mos.cms.futurecdn.net/rEtbxcSdVkmTKUGcobiCqQ-1200-80.jpg
- IH-8 Ship seen by a Starlink camera: https://cdn.mos.cms.futurecdn.net/YfW6fJCVksruEfLjjTEn4L-970-80.jpg
- IH-10 Landing burn at dawn, Flight 5: Wikimedia Commons, "Starship Booster Return on Final Approach (54063904149)"
- IH-11 Landing burn, Flight 15: https://cdn.mos.cms.futurecdn.net/EvrhU3x9hpzWhLznXe5gYo-1024-80.jpg

Physics and timelines (PH):

- S1 Raptor: https://en.wikipedia.org/wiki/SpaceX_Raptor
- S3 Super Heavy: https://en.wikipedia.org/wiki/SpaceX_Super_Heavy
- S5 Flight 10 timeline: https://en.wikipedia.org/wiki/Starship_flight_test_10
- S6 Hot staging and the centre 3: https://everydayastronaut.com/starship-superheavy-integrated-flight-test-3
- S7 Shock diamonds: https://www.twz.com/starships-33-engines-created-the-mother-of-all-shock-diamonds
- S14–S17 Methalox exhaust colour and soot: https://scanalyst.fourmilab.ch/t/spacex-raptor-2-engine-test-firing/718, https://mfcttrf.blogspot.com/2019/08/why-did-starhoppers-exhaust-plume.html, https://yarchive.net/space/rocket/exhaust_color.html, https://gizmodo.com/takeaways-spacex-second-test-starship-megarocket-musk-1851035301/9
- S26 Pressure-wave rings, Flight 12: https://petapixel.com/2026/06/03/slow-mo-video-captures-shockwaves-from-the-spacex-starship-megarocket/
- S27 Twilight phenomenon: https://en.wikipedia.org/wiki/Twilight_phenomenon
- S35 Afterburning with height: https://www.mdpi.com/2226-4310/12/8/711
