# Starbase in HD and a real ascent: build plan for XNOHub.com

**Status (2026-11-22, after the flames work).** Written 2026-11-22; moved here from a scratch folder. Part B's looks are built, in places differently from this plan, and documented in [flames.md](flames.md): B1 plume and diamonds, B2 steam, B3 trail, B5 growth with height (recirculation not drawn), B6 hot staging (now jets out of the booster's ring and a leftover ring of exhaust), B7 boost-back, B8 the twilight bell (not yet compared frame by frame), and step 19, the sky by height. Not started: Part A (the site), B0 (the code still follows Flight 10's clock and flies due east) and B4 (the max-Q vapour, question 7). The questions in section 9 got defaults on 2026-11-24.

**Status (2026-11-24).** Part A's structures are built (A4, A5's placement): `lib/sites/frame.ts`, `lib/sites/starbase.ts`, `lib/models/starbase-towers.ts`, `starbase-pads.ts`, `starbase-farm.ts`, `site-materials.ts`, `components/starbase-site.tsx`. The stack stands on Pad 2 on the normal and flies 106.6°. Not done: the NAIP ground patch and its bake (A1, A2.3–7), the shadows (A2.8), the preload and hold (A3), B0's clock and path, A5's roll, fins and booster ending. Flattening the relief (A2.2) was tried and taken out: the blend did not show and a hard-edged rectangle remained. Hot-staging and plume details below are superseded by flames.md where the two differ.


**What this is based on**
- The four research results and the fact-check.
- Rechecks done on 2026-11-22 against local copies: the OSM extract, SpaceX flight-page text, NSF article text from its RSS feed, and the Flight 12 tracker log.
- Two Terrarium tiles fetched for this plan (135 KB).
- The repo as of 19:00. Three files changed while I wrote this: `lib/missions/starship.ts`, `components/starship-mission.tsx` and `components/three-scene-client.tsx`. They now have per-engine `lit`, `IGNITION_S = -3`, `MECO_S`, `LAUNCH_FROM_S = -5`, SECO at T+8:57 and `formatMet`. The plan builds on that state.

**Conventions**
- Sources are keyed [S#]; the list is in section 10.
- Confidence is H, M or L.
- "Computed" means my arithmetic on the cited inputs.
- Local positions are metres east and north of the Pad 2 mount centre, written (E, N), from an exact WGS84 to local-tangent-plane conversion.
- Bearings are degrees clockwise from true north.
- No repo file was edited, and no git, server or recorder was run.

---

## 0. Read first: corrections and new findings

1. **Tower heights come from the FAA, not OSM.** OSM's 144.5 m and 143 m are from superseded filings (fact-check, H).
   - Tower 2 is 476 ft = 145.1 m above ground in total (FAA 2025-ASW-13942-OE, approved 2025-12-12) [S10, H]. How that splits between lattice and roof or mast is unknown.
   - Tower 1 is 460 ft = 140.2 m of structure plus a 42 ft anemometer mast, 502 ft = 153.0 m in total (FAA 2024-ASW-5880-OE; FAA obstacle 48-210367) [S10, S11, H].
   - Tower 1's mast was reportedly removed on 2026-09-01 [S47, L-M].
2. **The Pad 2 flame trench is in OSM.** It is way 1352374225: 84.2 × 18.3 m, axis 123.2°/303.2° [S2, M]. The ascent research said it was missing; that was wrong.
   - In the 2024 to 2025 Sentinel-2 change image, the darkened band sits within 0–1 m of the OSM axis. Best-fit bearing 119°, flat between 116° and 125° (measured by the fact-check from EOX 2024 and 2025, M).
3. **Pad 1's chopsticks really were cut in half.** NSF's text says "crews cut the chopsticks in half and removed the back side of the tower base" [S18, H].
4. **Flight 15's booster was not caught.** It relit 32 of 33 engines for boostback. The burn ended early for low fuel mass, an automated abort sent it offshore, and it hovered on its landing burn over the Gulf before flight termination [S13, H]. No V3 booster has been caught.
5. **Boostback ends at T+3:02 to 3:07** on Flights 13–15, not about 3:30 [S13, H].
6. **The ground the app draws at the pads is about 1 m above the ellipsoid.**
   - Terrarium z14 gives 1.04 m at Pad 2. Across the launch site the median is 0.96 m (5th percentile 0.36, 95th 1.79, maximum 4.5) (measured from tiles 14/3770/6965–6966 [S27], H).
   - So today the booster's engine exits, at 3.6 m above the ellipsoid, sit about 2.6 m above the drawn ground, not inside it.
   - The FAA gives the ground as 9 ft (2.7 m) above sea level [S10, H]. Why the elevation data reads about 1.5 m lower is unknown.
7. **The real launch heading is ESE, not east.**
   - Flight 15's 30.5° orbit [S24 and NSF, H] needs an azimuth of 106.6° from 26°N (computed, M; Earth-rotation correction ignored).
   - Flight 12's tracked track up to T+137 s runs at 106.9° (measured from [S29], M).
   - The code flies due east (90°).
8. **The Flight 12 tracker shows where the stack stood on the pad.** It logged the stack at 95–97 m "altitude", 8.6 m NNE of the OSM mount centre [S29]. Its height datum and which point on the ship it tracks are unknown (L).
   - If the figure is metres above sea level at the ship's aft end, the booster base stood about 21 m up.
   - "Lower than Pad 1" is in print only as words [S23].
   - The booster's standing height therefore stays unknown; I use an 18 m placeholder (L).
9. **The repo's V3 booster still has V2 features.** Its grid fins are at 0/108/216° and it has separate catch-fitting boxes. V3 has a T layout of 90/90/180°, and the two opposite fins carry the lift and catch points [S17, S24, H].

---

## 1. The approach in brief

- **Ground.** One self-hosted, pre-baked picture of Starbase at 0.6 m per pixel (USDA NAIP 2022, public domain), laid on the globe as a 1.23 km square patch.
  - Inside the launch-site fence, NAIP shows the 2022 site: Tower 1 lying flat, the old tanks, and no Pad 2. That area is repainted from OpenStreetMap's 2026 outlines.
  - Relief under the patch is flattened to 1.0 m, the height the app already draws there.
- **Structures.** Built in code in a local frame at Pad 2.
  - Footprints and positions come from OSM, tower heights from the FAA.
  - Anything unpublished is a flagged estimate.
  - Shadows are real-time planar projections.
- **Preload.** A launch starts at T−0:20 and holds at T−0:10 until the patch and the ground tiles at the pad are drawn, for at most 8 s.
- **Ascent.**
  - Clock, path and heading: Flight 15's published event times, Flight 12's tracked climb, and the real 106.6° heading.
  - Effects: each a pure function of mission time.
    - Sea-level plume with shock diamonds.
    - A ground cloud split by the trench, which lingers and drifts.
    - A contrail from about 8 km.
    - Plume growth and recirculation.
    - Staging flash and shell, and the boostback bell.
    - Twilight lighting.

---

## 2. Part A: Starbase in HD at true scale

### A1. Imagery

| Source | Resolution | Date at the pad | Shows Pad 2 / Tower 2 | Licence | Use |
|---|---|---|---|---|---|
| USDA NAIP 2022, via the USGS NAIPPlus ImageServer [S25] or Planetary Computer [S26] | 0.6 m; real detail to z18 (0.537 m/px) | flown 2022-06-10 (scene m_2509707_ne_14_060_20220610) [S25, H] | No. Tower 2 was stacked 2024-08-21 [S24, H]; the Pad 2 mount went in May 2025 [S24, M] | Public domain [S26, H] | **Bake into the patch** |
| EOX s2cloudless 2016 (the repo today) [S28] | data to z14 (8.59 m/px) | 2016 composite | No site at all | CC BY 4.0 | Keep for the globe |
| EOX s2cloudless 2025 [S28] | 10 m data | 2025 | A few pixels, plus long tower shadows | CC BY-NC-SA 4.0 (non-commercial) | No (open question 1) |
| USGS Imagery Only basemap [S25] | real tiles only to z16 (2.15 m) | NAIP 2017–2021 mix | Unknown | Public domain | No |
| TxGIO statewide 6-inch survey [S51] | 0.15 m | approved 2026-06-25; flight date unknown | — | Free download later | Future upgrade |

**Where the imagery comes from**
- Bake, run once on the owner's machine:
  `https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer/exportImage?bbox={xmin},{ymin},{xmax},{ymax}&bboxSR=3857&imageSR=3857&size={w},{h}&format=jpg&f=image`
  - Maximum 4,000 px per side.
  - A 256 px export took 8.2 s and allowed any origin [S25, M].
  - Fallback, at z18 tiles of about 10 KB each (measured); rate limits unknown [S26]. The item reaches 26.0035°N, which covers the patch:
    `https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?collection=naip&item=tx_m_2509707_ne_14_060_20220610&assets=image&asset_bidx=image%7C1,2,3&format=jpg`
- Visitors: `/starbase/ground-naip2022-v1.ktx2`, served from our own site.

**Extent**
- 2048 × 2048 px at 0.6 m = a 1,228.8 m square, z18-class detail.
- Centred between the two mounts at 25.996456, −97.156239, which is (180.5, −34.4).
- Spans E −433.9 to 794.9 and N −648.8 to 580.0 (computed).
- Includes both pads, the tank farm and TX-4.
- Just reaches the beach east of Pad 1; the shoreline is about 412 m east of Pad 1 (site research, H).
- Includes 434 m of scrub west of Pad 2.
- The existing EOX tiles continue beyond it.

**Credit**
- Add a Data sources entry.
- While the patch is on screen, the credit line reads "…, USDA NAIP (USGS)".
- USGS asks for the wording "Map services and data available from U.S. Geological Survey, National Geospatial Program." [S25, H]

**Data cost for a visitor**
- One KTX2 texture (ETC1S, with mipmaps) of about 1.0 MB. Computed from the repo's own `public/earth/clouds-4k.ktx2`, which is 1.91 MB for 4096 × 2048 px, so about 0.96 MB for 2048² (M). Measure it after the bake.
- Plus a site JSON of about 20–40 KB (estimate).
- Downloaded only when a launch is armed, or when the camera comes within 60 km of Starbase.
- For comparison, streaming NAIP tiles would cost 1.2–1.9 MB for the pad box alone (imagery research, M), and could not hide the 2022 content.

**Keeping it small**
- One compressed texture.
- A versioned filename with `Cache-Control: public, max-age=31536000, immutable` set through `headers()` in `next.config.js`. Vercel's default for `/public` is unknown; check later on production with `curl -I`. Read `node_modules/next/dist/docs` first, per `AGENTS.md`.
- Optionally a 1024² phone variant of about 0.25 MB (computed the same way) for screens under 700 px wide.

**Data cost for the owner's one-off bake: about 1.5–2.5 MB**
- One NAIP export of 2304² px: about 1–2 MB (estimate; the research estimated 0.45–1.2 MB for 2000²).
- A trimmed Overpass query: about 0.1–0.3 MB, or nothing if the saved extract is reused.
- Four EOX z14 tiles for colour matching: about 40 KB.

### A2. How it sits on the globe

1. **Frame.** A local east-north-up frame at the Pad 2 mount centre: X east, Y up, Z south.
   - "Up" is the ellipsoid normal, not the line to the Earth's centre. The two differ by 2.641 mrad here (repo research, H).
   - One frame is enough within about 1.5 km; the Earth's curve drops 0.08 m at 1 km (computed).
   - The patch is a 64 × 64 grid laid on the ellipsoid. The curve is 0.06 m at its corners (computed).
2. **Height.** Flatten the elevation under the patch to 1.0 m, the site's median Terrarium height (measured [S27], H), blending back over 70 m (one level-14 mesh cell).
   - Do it on each elevation grid as it loads. The repo's EarthPlugin already wraps `GridCache.fetchItem`, which returns a padded float DataTexture.
   - Edit `grid.image.data`, set `needsUpdate`, then call `stitchNeighbors` again so tile seams still match (read from GridCache.js for this plan, H).
   - The ground-height readout `world.groundAltitude` follows automatically.
3. **Drawing.**
   - Draw the patch after the terrain with `polygonOffset`. The offset is in depth-buffer steps, so it holds at any distance, and three.js flips its sign for the reversed depth buffer (repo research, H).
   - It is opaque except for a 30 m feathered rim.
   - Light it with `lightAsEarth` so it matches the tiles exactly.
   - Use KTX2 with mipmaps and anisotropy 8. The map tiles have no mipmaps (repo research, H).
4. **No doubled structures.**
   - NAIP 2022 shows Tower 1 lying about 100 m east across its old mount, from relief displacement, plus its shadow. It also shows the 2022 tank farm, and removed suborbital pads where Pad 2 now stands (fact-check, measured from NAIP; the streak is visible on the saved crop, H).
   - Tower 2 and Pad 2 are not in the picture, and EOX 2016 has no site at all.
   - So everything inside a mask is replaced by painted 2026 ground. Every 3D structure casts its own real-time shadow on the flat patch. Outside the mask, NAIP keeps only natural ground, roads and the beach.
5. **The mask.** The union of:
   - (a) the area enclosed by the OSM "Launchsite fence" ways (1496578329–34, 1479016405–06, 1483529077), the west fence (1275053366) and the south edge of TX-4 (ways 697324661 and 1384805737, offset 6 m);
   - (b) the strip north of TX-4 from E −20 to E 165, up to N 255, which holds the control centre, Starhopper and the "Danger Lot".
   - Buffered 10 m and feathered 8 m. It spans about E −95 to 540 and N −285 to 255 (computed from [S8], M).
6. **Painted ground inside the mask** (bake script, 0.6 m/px):
   - Gravel base: the median NAIP colour of the 2022 site's bright, low-saturation ground (measured).
   - Concrete only where OSM maps it: the Pad 1 apron (759249805), the roundabout, and service roads tagged concrete, at their tagged width or 6 m (estimate).
   - Asphalt: TX-4 and lot 1223387360.
   - Unpaved lots.
   - The pond, in a water colour sampled from NAIP.
   - The expansion area (1486712971) as graded sand.
   - Concrete slabs under every modelled structure: footprint plus 2 m (estimate).
   - Dark trench slots.
   - Generated deluge stains fanning out of both Pad 2 trench exits.
   - No apron is invented around Pad 2, because none is mapped.
7. **Registration.** The bake prints the offset between NAIP road edges and OSM's TX-4, and shifts the picture if it is over 2 m. NAIP's stated accuracy was not checked (unknown).
8. **Shadows.**
   - Project the geometry onto the site plane along the sun: one merged mesh for the static site, one for the stack.
   - Use the stencil buffer so overlapping shadow pieces darken only once. This needs `stencil: true` on the Canvas.
   - Fade them at the patch edge, and turn them off when the sun is below about 1°.
   - Check figures:
     - Flight 15's liftoff (sun 10.0° at azimuth 244.0°): the Tower 2 shadow is 821 m long toward 64°.
     - The trailer's time, 2026-11-20 17:00Z: 168 m toward 337°.
     - Flight 14's (sun 5.7°): 1,449 m toward 275°, which leaves the patch and fades (computed with the NOAA solar algorithm, H).

### A3. Preload when a mission is armed or launched

- **Arm.** Start fetching the KTX2 and the JSON on any of these: pointer over or focus on "Launch Starship", any launch signal (including a send of 1,000 Ӿ or more), or the camera within 60 km of Starbase.
  - At the same time, mount the EOX "scans" tile set. Today it waits until the camera is below about 1,204 km (repo research, H).
- **Countdown hold.**
  - The mission starts at T−0:20, which shows the diverters starting at T−0:17.
  - It holds at T−0:10 until `world.siteReady && world.scansReady`. "Scans ready" means the set is showing and its `loadProgress` is 1.
  - The hold is capped at 8 s of real time.
  - The HUD shows "T−0:10 · hold · loading Starbase".
  - `missionAt` already handles negative times: the path is clamped and the engines are off (repo research, H).
- **During the hold**, call `gl.compile(scene, camera)`.
  - Set `fog = false` on site and effect materials, so the fog switch at about 127 km never rebuilds them.
- **Optional later.** `LoadRegionPlugin`, which ships with 3d-tiles-renderer 0.5.4, can warm a 2.5 km sphere of tiles while the camera is still on the globe. Add it only if the hold is often reached.

### A4. The 3D site

**Detail tiers**
- A, hero, seen at 150–500 m in the liftoff shots: member-level geometry down to about 0.4 m, textures laid out in metres as on the vehicles.
- B, support: true footprints and heights, primitives, instancing.
- C, distant landmarks: boxes.

**Budget:** 150k triangles or fewer, about 15–20 draw calls, 6 materials or fewer.

| Item | WGS84 | (E, N) m | Size and orientation | Height | Tier, material | Sources, confidence |
|---|---|---|---|---|---|---|
| **Pad 2 launch mount (OLM-2)** | 25.9967665, −97.1580415 | 0, 0 | Six-sided outline with a 23.6 m long side along 123°, 19–22 m across. Corners (−14.2,−1.7) (5.5,−14.7) (9.7,−11.5) (7.7,−8.6) (14.7,1.9) (−3.6,14.1). Central opening Ø10.7 m | Deck height unknown; 18 m placeholder (L), see §0.8 | A. Steel box table; four legs (inferred from Pad 1's new mount [S19], L). Water-cooled deck plate; thicker hold-down arms with hoods and a new clamp system [S15, H]. 20 hold-downs, as on LC-39A's V3 mount [S22] (M for Pad 2) | [S1] M (OSM 1–3 m); Launch Library 2 has the pad 5.2 m east [S12]; H within 10 m |
| Service structure, SW of the mount | about 25.99667, −97.15811 | polygon (−14.2,−1.7) (−24.6,5.0) (−20.3,−9.8) (−2.6,−21.3) (15.7,−21.4) (5.5,−14.7) | — | Unknown; estimate 12 m | B. Stainless-clad bunker holding the split LOX/LCH4 booster disconnects, facing away from the tower [S15, H] | [S1] M; identifying this block as the service structure is my inference (M) |
| **Pad 2 flame trench** | 25.996767, −97.158044 | (−0.3, 0.0); exits (−35.5, 23.1) NW and (34.9, −23.1) SE (computed) | 84.2 × 18.3 m, axis 123.2°/303.2° | Depth unknown | A. First a painted slot with a rim; modelled interior later. Two drilled-pipe diverter buckets with a water-sprayed ridge cap between them [S15, H] | [S2] M; Sentinel-2 check M |
| **Tower 2** | 25.997046, −97.158067 | (−2.6, 31.0); 31.1 m from the mount at 355° | 11.7 × 11.6 m, edges at 33° and 123°. South corner (−0.8, 23.0) faces the mount | 145.1 m total [S10, H]. Reinforced roof added Feb–Mar 2026 (FAA crane case 2026-ASW-2223-OE [S10]; [S21], H) | A. Lattice built as geometry: 4 columns, girts, X-bracing (bay spacing estimated), carriage rails on the two south faces, a roof box. Colour unknown | [S3] M; FAA point 1.8 m away [S10] H |
| Tower 2 base | 25.997081, −97.158075 | (−3.4, 34.9) | 17.4 × 17.2 m, edges at 32° and 122°, on the north (back) side | 10.5 m (OSM, M) | B. Steel-skinned speed-core base [S15, H] | [S3] way 1304017043 |
| **Chopsticks (Pad 2)** | hinge 25.9969625, −97.1580445 | hinge (−0.3, 21.7) | Two trusses about 3.9 m wide, about 25.9 m from hinge to tip. As drawn, the straight parts run N −4.2 to 12.1 at E −10.0 to −6.0 and E 5.9 to 9.8, inner faces 11.9 m apart | Truss depth unknown (estimate 3 m). Height and angle during launch unknown (placeholder: open, 60 m, L) | A. Electromechanical actuators; much shorter than Pad 1's, with two truss sections removed [S15, H] | [S4] M; Pad 1's arms about 36 m [S44] M |
| SQD arm (Tower 2) | — | Estimate: on the tower's SE face | Estimate about 20 m long | Estimate: deck + 72.3 m + about 2 m | A, simple. Redesigned and compact, swings further from the stack at launch [S15, H]; held by a hydraulic pin [S16, H] | Face, height and length unknown |
| **Tower 1** | 25.996127, −97.154736 | (330.9, −70.8); 30.2 m west of the Pad 1 mount | 12.3 × 12.9 m, edges at 36° and 124°. East corner (339.6, −69.1) faces the mount | 140.2 m of structure [S10, H]. Mast (+12.8 m) reportedly gone [S47, L-M] | B. Same lattice generator. Chopsticks cut in half [S18, H]: stubs of about 18 m (L). Old SQD arm scrapped [S18, H]. Interior gutted | [S5] M; FAA point 4.5 m away [S10] H |
| **Pad 1 (rebuild)** | 25.996145, −97.154436 | (361.0, −68.8) | New trench 84.0 × 18.3 m, axis 39°/219°, at (362.9, −70.8). The shape looks copied from Pad 2's (M-L) | Leg height unknown | B. As of 2026-10-23: four mount legs, prefabricated trench walls, one exit ramp, five A-frames and the ridge-cap support. The mount is still at Sanchez [S19, H]. No deck | Wikidata 2.5 m and Launch Library 2 6.2 m away [S48, S12]; H within about 6 m |
| Pad 1 apron | — | E 288–408, N −90 to −14 | 122 × 67 m concrete polygon | — | Painted | [S8] 759249805; state during the rebuild unknown |
| **Tank farm** | 25.997182, −97.155007 | polygon E 146–468, N −20 to 114 | 314 × 78 m along 103°. 26 horizontal tanks, long axes about 13° (list below) | Diameter (5.7–6.5 m) plus saddles of about 1 m (estimate); the methane pair is tagged 7.1 m | B. Instanced capsules and saddles. Colour unknown (white placeholder) | [S7] H positions; capacities [S18] M |
| Blast wall | — | (145.5, 43.6) to (291.5, 9.6) | 150 m, along the south ends of the LOX/LN2 row (computed) | 5.5 m (OSM, M) | B, box | [S8] 1240890715 |
| Pad 2 deluge water tanks (11) | — | 5 × (39.2 × 3.4 m) at (52.3,75.8) (56.0,74.8) (59.7,73.8) (63.5,72.8) (67.1,71.9). 6 × (about 26 × 3.5 m) at (79.4,68.0) (83.2,67.0) (86.9,66.0) (90.5,65.1) (94.4,64.2) (98.4,63.2) | Axes about 14.5° | Diameter | B. They feed the buckets, the ridge and the deck plate, each pressurized by O₂/CH₄ burners that boil LN₂ [S15, H] | [S8] H |
| Gas-generator building | 25.997579, −97.157131 | (91.2, 90.1) | 31.6 × 15.8 m, axis 104° | Unknown; estimate 6 m | B | [S8] |
| GSE buildings | — | LOX GSE 56.9 × 29.5 m at (189.6, 89.7). CH₄ GSE 60.5 × 21.8 m at (181.8, 63.1). CH₄ reclaim 59.4 × 12.3 m at (177.7, 42.9). Power & Comms 33.9 × 9.1 m at (81.4, 137.4). Unnamed 34.3 × 25.4 m at (25.3, 93.9) | Axes about 103° (the last one 14°) | Unknown; estimate 6 m | B | [S8] H footprints |
| Bunkers | — | Megabunker 50.8 × 19.5 m at (133.3, 124.5). Suborbital GSE bunker 37.1 × 9.3 m at (81.7, 117.5). Control Center 12.6 × 8.7 m at (57.8, 128.0). Power bunker 30.7 × 5.9 m at (233.3, 105.8). Security 9.4 × 5.4 m at (41.1, 150.4) | — | 4.1, 4.3, 4.1, unknown, 3 m (OSM) | B | [S8] M |
| Vaporizers and small tanks | — | 25 units of 2.4 × 2.2 m in rows at E 218–330, N 59–98. Vertical tanks Ø2.8 m at (235.4,88.8) (250.0,85.1) (267.0,81.6) (270.6,80.7) (333.5,60.6). N₂ tanks Ø2.8 m at (80.9,97.7) (85.3,96.6) (99.0,93.4) (103.7,92.2) | — | Vertical tanks 6 m (OSM). Vaporizer height unknown; estimate 8 m | B, instanced | [S8] H positions |
| Starhopper | 25.998553, −97.157358 | (68.4, 197.9) | 9 m diameter on legs, footprint 20 × 17 m | 17.9 m (OSM, L-M) | B, stainless | [S8] 732730820; Wikidata 0.45 m away [S48] H |
| Pond | 25.996285, −97.158287 | polygon (−40.3,−42.4) (−28.1,−37.3) (−10.8,−45.3) (−5.6,−57.8) (−29.5,−70.8) (−34.6,−69.2) | about 31 × 30 m | — | Painted water | [S8] H |
| Landmarks, optional, each in its own frame | Mega Bay 2 25.987225, −97.18860278. Gigabay 25.98525, −97.18844444. Mega Bay 1 25.986356, −97.188344 | (−3060, −1057). (−3044, −1276). (−3034, −1153) | Footprints from OSM | 99.1 m (FAA 2023-ASW-6938-OE, H). 116.4 m (FAA 2026-ASW-6838-OE, revision, H). 100 m (OSM, L-M) | C, boxes | [S10], [S9] |

**The 26 horizontal tanks** [S7]. All are 48.4 m long and 5.7–6.0 m across unless noted; (E, N) of each centre:
- **LOX (10):** (219.3,55.2) (226.0,53.7) (232.8,52.2) (241.3,50.3) (248.0,48.7) (254.7,47.0) (261.5,45.3) (268.3,43.6) (301.6,36.0) (307.8,34.5).
- **LN₂ (6):** (276.0,41.6) (282.5,40.5) (288.9,39.0) (295.5,37.5) (345.0,31.6) (351.4,29.9).
- **Unlabelled (2), likely LN₂ (M):** (331.9,34.4) (338.2,33.0).
- **LCH₄ (8):**
  - 2 of 50.1 × 6.5 m, 7.1 m tall: (358.3,27.4) (366.1,25.7).
  - 4 standard: (373.3,24.6) (379.8,23.1) (386.3,21.5) (392.7,19.8).
  - 2 older ribbed tanks of 31.4 × 8.1 m: (415.2,26.8) (424.0,24.8).
- **Capacity check.** NSF's 3,268 t of methane covers only about 6 of the 8 mapped methane tanks (fact-check flag, L).

**Materials** (all colours unknown: no source in the research; placeholders, flagged)
- Their own set of MeshStandardMaterials, not `vehicleMaterials()`, with:
  - one shared `onBeforeCompile` that applies the `sunlightAt(padOrigin)` gate and a sky/ground fill based on the local up, with no new real lights (one shared function keeps the shader cache shared);
  - reflections from the sky environment turned to the pad's up, at `environmentIntensity(UP, sun, true)`;
  - `fog = false`.
- Lattice steel: grey, metalness 0.6, roughness 0.55.
- Stainless (service structure, roof, deck plate, SQD arm, Starhopper): base colour `#c7cbd0` as on the vehicles, metalness 0.85, roughness 0.35.
- Tanks: painted white, roughness 0.6.
- Buildings: light grey metal.
- Soot and wet stains near the trench exits: generated.
- The booster's existing engine light (900 m reach) lights the site at liftoff for free, including at night.

### A5. The stack on the pad

- **Placement.** At the mount centre, with the booster base at ground (1.0 m) plus the deck. The deck is an 18 m placeholder (L).
- **Up and roll.**
  - "Up" is the ellipsoid normal. This fixes today's 0.15° lean, which puts the top 0.33 m off plumb next to the tower.
  - Roll the booster so its two catch fins face the arms, east and west. This is inferred from [S4] and [S17] (M). The third fin points south (estimate).
  - After clearing the pad, the stack makes a 270° roll on all engines [S16, H]. The timing is an estimate: T+8 to 20 s.
- **V3 model fixes.**
  - Set the grid fins to the T layout, 90/90/180° [S17, S24, H].
  - Delete the booster catch-fitting boxes. The V3 is caught by the two opposite fins [S17, H].
- **Booster ending.** The owner decides (open question 2).
- **A lighting bug next to this work.** The ship and booster share one sunlight value and one reflection map, both taken from the ship (repo research, H).
  - So a booster back at the pad at T+6 min is lit like a ship 180 km up, which is wrong at dusk and at night beside a correctly lit tower.
  - Fix it in the same change: give the booster cloned materials with their own uniforms. The compiled shaders stay shared.

---

## 3. Part B: The ascent made real

### B0. Clock, path and heading (do this first)

| Event | Code today (Flight 10) | Proposed: Flight 15 [S13, H] |
|---|---|---|
| Flame diverters (deluge) on | not modelled (F10 page: deflector at T−0:10) | T−0:17 (buckets and ridge; the deck plate near liftoff) [S16, H] |
| Booster engine startup | T−0:03 | T−0:03 |
| Clears the 145 m tower | about T+8 s (computed from the code path) | about T+8–9 s (F12 tracker: +105 m at T+7.5 s [S29], M) |
| Mach 1 | about T+51 s at 7.3 km (computed, M) | about T+51 s at about 7.5 km (F12 tracker scaled, L-M) |
| Max-Q | T+1:02 (F10 page) | T+0:58 |
| MECO | T+2:36 | T+2:19 |
| Hot staging | T+2:38 | T+2:21 |
| Boostback | T+2:48–3:35 (page: 3:38) | T+2:26–3:02 |
| Booster landing burn | T+6:25–6:45 | T+6:10–6:35 (planned catch; it actually diverted) |
| SECO | T+8:57 | T+8:09 |

**Path.** A monotone cubic through Flight 12's tracked altitude above the pad and downrange distance [S29], with time scaled by 141/144 so staging falls at T+2:21.
- Expected altitudes: 5.6 km at T+45, 9.3 km at T+58, 27.4 km at T+100 and 56.0 km at staging (computed).
- About 62 km downrange at staging, at about 1.6 km/s [S29, M].
- Heading 106.6° (§0.7).
- Booster apogee about 81 km, against 95 km in the code (computed from about 0.7 km/s vertical speed at staging, L).
- Flight 13–15 tracks are not on the third-party log; those files return 404 (checked 2026-11-22).

**V3 engine patterns.**
- The high-thrust part of boostback runs on all 33 engines (F13); F14 relit 31 of 33 and F15 32 of 33 [S13, H].
- F14's landing burn went from 11 of a planned 13 engines to 5, then 3 [S13, H].
- These replace the V2 pattern of 13 engines now in `boosterEngineLit`.

**Also add `lib/atmosphere.ts`.** It implements the 1976 US Standard Atmosphere [S50]: pressure, temperature, density and speed of sound by height. It drives the plume shape, the contrail window and the sky.

### B1. Sea-level plume with shock diamonds

**When.** From T−0:03 to MECO. Diamonds fade out by about T+30–40 s, at roughly 2.5–4.5 km.

**True size and look**
- Plume length:
  - Reacting plume of one Raptor: 215 ft (65.5 m).
  - Super Heavy cluster: 3–4 times that, 645–860 ft (197–262 m).
  - Ship: 2–3 times, 131–197 m.
  - Source: FAA 2019 analysis of 31 + 7 engines [S30], M.
- Nozzle (2019 Raptor): exit Ø 1.301 m; throat Ø 0.222 m; area ratio 34.5; lip angle 6° [S30, M].
- Expansion: slightly over-expanded at sea level, matched at about 1–3 km (computed, L-M).
- Shock diamonds:
  - At liftoff the 33 plumes act as one jet: a single large diamond, then smaller ones [S35, H].
  - The first cell is about 15 m at cluster scale, about 2.7 m per engine (computed, L).
- Colour at about 4 km [S34; hue M, length L]:
  - White-hot ring of engines, then a short pale-pink zone `#e7bfbc`.
  - Then an orange-yellow afterburning column (`#e2ded2` to `#e9b67c`), 1–3 booster diameters wide and about 350–450 m long.
  - Then mauve-grey puffs `#6d545e`.
  - Spaceflight Now described F12's flame as a brilliant blue-white torrent [S43].

**Technique**
- Keep the two additive cones per vehicle and upgrade the shader with:
  - the colour ramp above;
  - 3–6 bright bands at spacing s(h) = 15 m × √(p₀/p(h));
  - animated value-noise turbulence in the tail;
  - a clip against the site plane (a world-space plane uniform) so the plume ends at the deck and trench, not in the ground.
- 33 + 6 per-engine cones, instanced and driven by `Body.lit`, for views closer than about 300 m.
- Fire-tinted puffs leave both trench exits from T−3 to T+3 s.

**Cost.** +1 instanced draw; everything else is shader work. Watch the additive overdraw.

### B2. Liftoff steam cloud

**When**
- Water mist at the trench exits from T−0:17.
- Fire and steam jets from T−0:03.
- A wall of billows by T+10 s.
- A rising column for minutes.
- Visible for the whole hour-long satellite animations (F6, F12, F15) [S33, H].

**True size**
- Water: up to about 422,000 gal (about 1,600 t) per launch, of which about 316,500 gal (about 1,200 t) flash to steam at ignition. Split: 17% before ignition, 75% during, 8% after (FAA EA via NSF [S31], M-H).
- The cloud splits in two along the trench, "like a Saturn V" [S16, H]. The exits face 123° and 303° [S2, M].
- At T+10 s (Flight 5 from Pad 1): 150–160 m tall and more than ±140 m wide [S34; L].
- At T+5 min (Flight 15): 4–6 km across [S33; L-M].
- Shuttle comparison [S32, H for the Shuttle]:
  - Tops reached 2.2–3.5 km after 3–5 min; updrafts of 2–10 m/s.
  - A temperature inversion can cap the cloud.
- Drift: it moves with the low-level wind, mostly east (F12, F15) [S33, H].
- Shock waves visibly ripple through the steam at liftoff [S36, H].

**Colour.** `#fef9c4` near the flame; underside `#434757`; sunlit tops white (Flight 5 dawn photo [S34], hue M).

**Technique.** Rebuild `exhaust-cloud.ts` as about 300 instanced puffs in 1 draw:
- (a) jets out of both exits, starting at 50–100 m/s (L) and slowing over 3–5 s;
- (b) buoyant billows rising at 2–10 m/s to a 2–3.5 km cap;
- (c) mist from T−17 s.

Then:
- Apply a wind drift with height shear after T+20 s (estimate: 5 m/s toward the east).
- Fade over 30–60 min.
- Light each puff with `sunlightAt`; glow from the flame for the first 10–15 s.
- Fade puffs where they meet the ground plane (a "soft ground" without a depth texture).
- At low sun, draw a ground shadow sprite of length = top height ÷ tan(sun elevation).
- Optionally, 2–3 shock shells expanding at about 340 m/s from T−3 to T+5 s.
- Place the cloud in the site frame with its local X along 123°. Today it copies the booster's pose and blows north–south.

**Cost.** 1–2 draws. Fill-rate heavy when the camera is inside the cloud; scale each puff's alpha by its size on screen.

### B3. Exhaust trail left behind, and its drift

**When**
- Faint or nothing from about 0.5 to 7 km. In the Flight 5 photo there is no white trail at about 4 km [S34, L-M].
- On at about 7 km, opaque by 10 km, fading out between 30 and 40 km.
  - Contrail rule: air colder than −35 to −40 °C [S38]. The standard atmosphere reaches that at 7.7–8.5 km (computed).
  - Starbase estimate: 8–10 km (L-M).
- On both clocks: on at T+50 s, opaque by T+60 s, fading between T+104 and 120 s (computed).

**True size and lifetime**
- 0.1–0.4 km wide within a few km of the vehicle (L).
- Opaque up to at least 15–20 km: Flight 15's trail shadow reached at least 115 km ENE at T+5 min [S33, L-M].
- Above that, the trail is not visible in true colour [S33, H].
- Drift: the ISS saw a straight column at T+3:28 twisted into zig-zag puffs by T+6:43 (Flight 6) [S34, H].
- Twilight trails typically last 2–3 min, up to about 30 min [S39, M].

**Colour.** `#dfd7cd` when sunlit; `#526070` translucent edges [S34, M].

**Technique.** New `lib/effects/contrail.ts`: 512 instanced puffs in 1 draw. Puff i belongs to emission time τᵢ, one every 0.25 s.
- Position = path(τᵢ) + wind(z) × (t − τᵢ).
- Width = 60 m + 7 m/s × age.
- Opacity = height window × age fade (default 10 min).
- Lumpy noise edges; `sunlightAt` per puff, which gives twilight for free.
- Being a pure function of the mission clock, it survives `__xno.starship` jumps and every speed setting.
- The wind profile is an estimate: 5 m/s at the surface, about 30 m/s near 12 km, then about 10 m/s.

**Cost.** 1 draw.

### B4. Mach 1 and max-Q, and vapour

- **When.** Mach 1 at about T+51 s; max-Q at T+0:58 [S13, H]. Peak dynamic pressure about 26–29 kPa (computed, L).
- **Vapour cone.** None is documented for Starship (unknown). The Shuttle showed them at T+25–33 s [S40, M]. Starship is transonic at about 6–8 km, at −25 to −35 °C, where a cone would need a moist layer (L).
- **Technique.**
  - A HUD event label, plus onboard-camera shake (the lens item in the TODO's Phase 2.7).
  - An optional translucent collar for 1–3 s between T+52 and 58 s, behind a flag that is off by default (open question 7).
- **Cost.** 1 draw for at most 3 s.

### B5. Plume growth with altitude, and recirculation

**True size**
- Single-engine shock cell, from Mach-disk distance ≈ throat diameter × √(P₀ / (2.4 × air pressure)) (Crist et al. 1966 via [S37]; computed, L-M):
  - 2.7 m at sea level; 5 m at T+60 s; 12 m at T+90 s; 46 m at T+120 s; 140 m at 56 km; 370 m at 70 km.
  - The cluster is about 5–6 times larger.
- At T+81–92 s (15–20 km) [S34; hue M, size L]:
  - The orange is gone.
  - A translucent pink-mauve plume (`#bb8da5` or `#bfabb8`), 30–45 m wide, runs hundreds of metres inside the white trail.
  - NASA's Flight 2 tracking image shows pink-salmon `#b0878c` [S34, M].
  - Why it is pink: unknown.
- Seen from geostationary orbit: a straight line from 20 to 70 km, bending into a boomerang above 70–100 km [S33, H].
- Recirculation:
  - Dense engine clusters push hot gas back onto the base [S37, H].
  - In near-vacuum the exhaust can turn up to about 100–120° from the axis (computed, L).
  - Heat on engine parts during ascent hurt Flight 12's boostback [S46, H]. The V3 aft end is hardened [S45, H].

**Technique**
- Replace `thin = smoothstep(alt, 2, 60)` with g = √(p₀/p(h)).
- Length = 230 m × g (at most 2 km); end radius = 4.5 m × g (at most 400 m).
  - This gives about 20 m at 21 km, matching the photo width.
  - It gives about 295 m length at 4 km, against 350–450 m in the photo (L).
- Fade the orange between 4 and 10 km, then switch to pink-mauve.
- Above about 30 km and during boostback, add a translucent "skirt" bell opening to about 110°.
- Above about 20 km, add an emissive glow ring around the aft skirt.

**Cost.** +1 draw for the bell.

### B6. Hot-staging flash

**When.** MECO at T+2:19 and staging at T+2:21.
- On Flight 2, 30 of 33 engines stopped and the 3 centre engines kept running [S42, H]. The code already does this.
- The ship lights all six Raptors while still attached, venting sideways through the ring [S42, H].
- On V3 the hot-stage truss is built in and more open; the ship's exhaust hits the booster's steel-plated forward dome [S17, H].

**Look**
- Flight 5 at dawn, T+about 161 s [S34; M]: a blinding white point inside a broken ring of orange flame `#bf8f3b`, a dim blue-grey cloud `#3d455d`, against a sky of `#00244e`.
- Sizes: ring about 0.2 km, cloud 0.6–0.7 km (L).
- How long the flash lasts: unknown.
- Seen from orbit (Flight 15): staging plus boostback leave a lumpy bluish-white cloud 12–18 km across by T+about 5 min [S33, L-M].

**Technique.** New `lib/effects/staging-cloud.ts`:
- A 0.7 s flash sprite (estimate).
- 16 radial orange jets from the ring (69.8–72.3 m up) for about 2 s (estimate).
- A shell of puffs anchored to the world at the staging point, growing at 50–100 m/s and fading over minutes.

**Cost.** 2 draws during the event, 1 after.

### B7. Boostback plume

**When.** T+2:26 to 3:02 (F15). It starts at about 56–60 km; the booster's peak is about 81 km (L).

**Look**
- By day: a bright point in a faint white-blue haze.
- In near-vacuum the plume balloons to hundreds of metres (computed).
- It shows as a heat signature in the satellite's shortwave infrared [S33, H].
- Dawn view: a translucent bell `#687b8f` over warm grey `#c2b8b1` [S34]. The photo may show the ship, not the booster (L).

**Technique.** The B5 bell along the flipped booster's axis, fed by `Body.lit`. Its exhaust feeds the B6 shell.

**Cost.** Shared with B5 and B6.

### B8. Twilight "jellyfish" (and the sky behind everything)

**When**
- The high plume is sunlit while the ground is dark: best 30–60 min before sunrise or after sunset. Colours run rose, blue, green and orange; the first light the plume catches is red [S39, M].
- No Starship has launched in real twilight (computed from launch times, H), and none is documented (M).
- Height at which the vehicle enters sunlight, for a point above the pad (research, computed):

  | Sun below horizon | Enters sunlight at | Time |
  |---|---|---|
  | −2° | 3.9 km | T+39 s |
  | −4° | 15.6 km | T+78 s |
  | −6° | 35 km | T+115 s |
  | −8° | 63 km | T+154 s |
  | −10° | 98 km | T+217 s (ship only) |

  - Add about 10–15 km for atmospheric screening.
  - The app's `sunlightAt` is the arbiter.

**Technique**
- In the trail, cloud, shell and plume shaders: a per-puff Earth-shadow test with a 10–15 km reddened edge, and a forward-scattering phase term (g ≈ 0.6). Shader work only.
- Sky by altitude (the live bug in the TODO's Phase 2.7): scale sky, haze and fill by p(h)/p₀ instead of today's fade from 13 to 130 km.
  - Expected air fraction above the vehicle: 50% at T+45 s, 28% at T+60, 4.6% at T+90, 0.33% at T+120, 0.04% at staging [S41 with F12 heights, M].

### Added cost of the effects

| Effect | Draws | Instances | Main cost |
|---|---|---|---|
| Plume upgrade | +1 (per-engine) +1 (bell) | 39 | additive overdraw |
| Ground cloud | 1–2 | about 300 | fill when inside the cloud |
| Contrail | 1 | 512 | moderate fill |
| Vapour collar | 0–1 | — | at most 3 s |
| Staging and boostback | 1–2 | about 150 | brief |
| Twilight and sky | 0 | — | shader work |

---

## 4. File-by-file changes

**New files**

| File | What it holds |
|---|---|
| `lib/sites/frame.ts` and `.test.ts` | Local east-north-up frame (ellipsoid-normal up, X east, Y up, Z south), `enuToScene`, `bearingDir` |
| `lib/sites/starbase.ts` | Curated table: origin, `GROUND_M = 1.0`, `DECK_M = 18` (placeholder), each structure's (E, N), size, bearing and height with its source and confidence, the patch spec, the mask rule and the flatten square |
| `lib/sites/flatten.ts` and `.test.ts` | Pure grid flattening with the feather; a test on synthetic tiles at levels 12–14 |
| `lib/models/starbase-models.ts` | Lattice tower generator, chopsticks with yaw and height, mount, service structure, SQD arm, instanced tanks, merged buildings and walls, Starhopper, Pad 1 construction |
| `lib/models/site-materials.ts` | The site materials and their shared shader patch |
| `lib/effects/planar-shadow.ts` | Projected-shadow material using the stencil |
| `lib/effects/plume.ts` | `plume()` and `plumeShape()` moved out of `starship-mission.tsx`, with the B1, B5 and B7 upgrades |
| `lib/effects/contrail.ts` and `.test.ts` | Contrail; the test checks it is deterministic across clock jumps |
| `lib/effects/staging-cloud.ts` | Staging flash, jets and shell |
| `lib/atmosphere.ts` and `.test.ts` | 1976 US Standard Atmosphere; within 0.5% of the published values at 0, 11, 20, 32, 47 and 51 km |
| `components/starbase-site.tsx` | Patch, models, shadows and animation from `world.missionT`; visibility under 60 km; on-demand load; writes `world.siteReady`; dev hook `__xno.site.check()` |
| `scripts/build-starbase.mjs` | OSM (Overpass by id, or `STARBASE_OSM_FILE`) to `public/data/starbase.json`, keeping an ODbL notice in the file |
| `scripts/build-starbase-ground.py` | Pillow, numpy and `basisu` (all present on the owner's Mac). NAIP export, resampled onto the 2048² local grid, mask, painted ground, colour match, KTX2 using `scripts/build-earth-textures.sh`'s flags, plus a debug overlay PNG |
| `public/data/starbase.json`, `public/starbase/ground-naip2022-v1.ktx2` | Generated outputs |

**Changed files**

| File | Change |
|---|---|
| `lib/missions/starship.ts` (being edited now: rebase) | Pad 2 `PAD`; ellipsoid-normal `along()`; 106.6° heading; Flight 15 constants; Flight 12 path knots; `LAUNCH_FROM_S = -20` with a hold; V3 engine patterns; pad roll and the 270° roll; booster apogee and ending; event list |
| `lib/missions/starship.test.ts` | New expectations |
| `lib/models/starship-models.ts` | T-layout grid fins; remove the booster catch boxes; export engine positions |
| `lib/models/exhaust-cloud.ts` | The B2 rebuild |
| `components/starship-mission.tsx` (being edited now) | Countdown and hold; `world.missionT`; effects wired in; cloud in the site frame; booster's own sunlight and environment map; dev `__xno.starship(t, {hold})` |
| `components/tiled-earth.tsx` | Flatten hook; `world.scansReady`; mount the scans set when armed; dev `__xno.groundAt(lat, lon)` |
| `components/three-scene-client.tsx` (being edited now) | `<StarbaseSite/>` in its own `<Suspense>` (today one boundary also wraps StarlinkFollow and DonationAnimation); `gl.stencil: true`; HUD hold text and event labels; prefetch on Launch hover; dev `__xno.launch()` |
| `components/sky.tsx` | Sky by air fraction |
| `lib/world.ts` | New fields, one writer each: `missionT`, `missionArmed`, `siteReady`, `scansReady` |
| `components/data-sources.tsx` | Entries from §7, and the credit line |
| `next.config.js` | Cache headers for `/starbase/*` |
| `docs/TODO.md` | Phase 3: pad and tower, data-driven timeline, catch. Phase 2.7: plumes, sky. Tick each with its date once checked |

---

## 5. Ordered build steps, each checked headless

**Running a check**
- Command: `SHOT_CACHE=<dir> node scripts/dev/shoot.mjs "<url>" <out>.png <wait> "<js>"`. Always keep `SHOT_CACHE` set to save bandwidth.
- Add `SHOT_NET=1` for data costs, and `SHOT_SIZE=390x844 SHOT_CPU=4` for a phone.
- Use `http://localhost:3000`.

**Mission snippet `M(T, view)`**
```js
(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));
[...document.querySelectorAll('button')].find(b=>/Launch Starship|Watch Starship/.test(b.textContent))?.click();
await w(8000);__xno.starship(T,{hold:true});__xno.shipCam('chase');__xno.shipView(VIEW);await w(2500);
const r=__xno.gl.info.render;return {calls:r.calls,tris:r.triangles,programs:__xno.gl.info.programs.length,site:__xno.site?.check?.()}})()
```

**Background snippet `B(T)`**, for fly views: `__xno.launch(); wait 6 s; __xno.starship(T,{hold:true}); wait 2.5 s`.

**Views**

| Id | Address | What it shows |
|---|---|---|
| V1 | `/?fly=25.99066,-97.16389,0.7,50,-35&time=2026-11-13T22:47:36Z` | Whole site from the SW; Flight 15 light (sun 10.0° at 244.0°) |
| V1n | Same, `time=2026-11-23T18:00:00Z` | Noon (43.4° at 175.1°) |
| V2 | `/?fly=25.99646,-97.15624,1.6,0,-89&time=2026-11-23T18:00:00Z` | Straight down, for registration |
| V3 | `/?fly=25.99524,-97.15988,0.06,45,-4&time=2026-11-20T17:00:00Z` | Pad 2 and Tower 2 from 260 m SW, 60 m up |
| VP1 | `/?fly=25.99275,-97.15580,0.08,20,-7&time=2026-11-20T17:00:00Z` | Pad 1 and Tower 1 |
| VG | `/?fly=25.99441,-97.17076,0.04,78,5&time=…` | Ground observer 1.3 km WSW, at the LabPadre mast. Use `…,103,45` to look up the ascent |
| VF | `/?fly=25.83721,-96.98148,12,315,-26&time=2026-11-13T23:00:00Z` | 25 km SE and 12 km up, looking back at the cloud |
| VJ | `/?fly=26.0965,-97.1600,0.05,115,35&time=2026-11-23T12:28:10Z` | South Padre Island at sun −6.0°. Also 12:37:40Z for −4° and 12:18:40Z for −8° |
| VC | `M(T,{azimuth:0.95,elevation:0.05,distance:1.25})` | The trailer's liftoff framing |
| VCd | `M(T,{azimuth:1.1,elevation:0.12,distance:1})` | Default chase view |
| VB | `M` with `shipCam('booster')` | Booster camera |

Night: `time=2026-11-23T04:00:00Z`. Sun times computed with the NOAA algorithm (H).

**Steps**

1. **Dev hooks and a baseline (no visual change).**
   - Do: `__xno.starship(t,{hold})`, `__xno.launch()`, `__xno.groundAt()`.
   - Check:
     - `pnpm ts`.
     - Shoot V1, V3, and VC at T=0, 2 and 45 with `SHOT_NET=1`; keep them as before-shots.
     - Record draw calls, shader programs and MB per host.
     - `groundAt(25.9967665,-97.1580415)` should be about 1.04.
2. **Site frame.**
   - Check:
     - `pnpm test lib/sites`.
     - The origin is within 1 cm of the textbook ECEF point, using `lib/geo.test.ts`'s method.
     - "Up" makes 2.641 mrad with the geocentric radial.
3. **Move the pad to Pad 2; stand the stack on the normal.** Same height for now.
   - Check:
     - Tests: the pad is within 1 m of the textbook point, and the axis is within 1e-5 rad of the normal from T−5 to 0.
     - VC at T=−4: the stack is 107 m WSW of where it was. Confirm with the red-cross projection from the headless-check notes.
4. **B0: clock, path, heading, atmosphere, HUD events.**
   - Check:
     - `pnpm test`.
     - VCd at T=45, 58, 100 and 141: the HUD reads 5.6, 9.3, 27.4 and 56.0 km, within 5%.
     - The stack's bearing from Pad 2 at T=141 is 106.6–106.9°, about 62 km downrange.
     - "Max Q" shows at T+0:58.
5. **Flatten.**
   - Check:
     - The unit test passes.
     - `groundAt` reads 1.00 ± 0.01 at Pad 2, Pad 1 and Tower 1, and is unchanged 2 km west.
     - V2 at 2026-11-23T13:46:20Z (sun 10°) shows no 1 m terracing inside the square.
6. **Bake.** The owner runs both scripts once, about 1.5–2.5 MB.
   - Check:
     - Open the debug PNG: OSM outlines sit on NAIP features outside the mask; the printed offset is under 2 m, or the shift is applied.
     - Inside the mask: no Tower 1 streak and no 2022 tanks.
     - The printed size is about 1 MB.
7. **The ground patch.**
   - Check: V1, V1n, V2, V3 and VP1 with `SHOT_NET=1`, plus V1 with `SHOT_AGAIN=2`.
     - The ground is sharp at 0.6 m.
     - No flicker between the two shots.
     - The rim blends.
     - +1 draw call and about +1 MB.
8. **Preload and countdown hold.**
   - Check:
     - A cold profile (no `SHOT_CACHE`) with a script that samples every 250 ms after clicking Launch. At T=0 the patch is loaded and the scans set is showing.
     - Note when the hold releases.
     - With `SHOT_BLOCK=tiles.maps.eox.at`, the hold releases after 8 s and the launch continues.
9. **Tower 2, base, roof, rails, carriage, parked chopsticks.**
   - Check:
     - `__xno.site.check()` reports Tower 2's top at 145.1 ± 0.1 m above ground, 31.1 m from the mount at 355°.
     - V1, V3, and VC at T=−5.
10. **Pad 2 mount, service structure, painted trench; raise the stack onto the deck.**
    - Check:
      - Tests: the booster base sits at the deck height, and its engine exits are above the deck.
      - V3, and VC at T=−5 and T=1.
11. **Shadows.**
    - Check:
      - `gl.getContextAttributes().stencil === true`.
      - V1 at Flight 15's time: the Tower 2 shadow tip is about 821 m toward 64°.
      - At the trailer's time: 168 m toward 337°.
      - The lattice shadow shows no double-dark crossings in a cropped zoom.
12. **The rest of the site.**
    - Check:
      - The counts in `site.check()`: 26 horizontal tanks, 11 water tanks, and so on.
      - V1 and VP1.
      - The whole site adds 20 draw calls or fewer.
13. **Vehicle on the pad.** T-layout fins, catch fins facing the arms, the 270° roll, the SQD arm retracting from T−3 to 0 (estimate), the booster ending, and the booster's own lighting.
    - Check:
      - VC at T=−5, 4, 12 and 25.
      - VB at T=150.
      - At night, VC at T=400: the booster near the pad is not lit as if in sunlight.
14. **B1 plume.**
    - Check:
      - VC at T=0.5 and 4: diamonds, no plume below the ground plane.
      - VCd at T=41: compare with the Flight 5 colour ramp.
      - VCd at T=90 (pink-mauve) and T=120.
15. **B2 ground cloud.**
    - Check:
      - VC at T=−10, −3, 0, 4, 10 and 30. The split along 123°/303° is visible, about 150 m tall at T+10.
      - VF with `B(300)`: 4–6 km wide, drifting east.
16. **B3 contrail.**
    - Check:
      - VCd at T=45 (none), 60, 90 and 120.
      - VG looking up the ascent with `B(150)`.
      - The determinism test passes.
17. **B4 max-Q.** Check: VCd at T=52 and 58 with the flag on and off.
18. **B5–B7: staging and boostback.**
    - Check:
      - VCd at T=139, 141.5, 143 and 150.
      - VB at T=150 and 170: the shell grows and the bell opens.
19. **Sky by air fraction.** Check: VCd at T=45, 60, 90 and 120. The sky dims to about 50%, 28%, 5% and 0.3% of its sea-level brightness.
20. **B8 twilight.**
    - Check:
      - VJ at −4°, −6° and −8° with `B(78)`, `B(115)`, `B(154)` and `B(220)`: the plume is sunlit while the ground is dark.
      - A dev read of `sunlightAt(stack)` at T=100, 115 and 130 under −6°.
21. **Phone and performance pass, credits, TODO.**
    - Check:
      - `SHOT_SIZE=390x844 SHOT_CPU=4` for VC at T=4 and VCd at T=90: count late frames with `SHOT_PROFILE`.
      - The Data sources text is right.
      - `pnpm check` passes.
      - Do not re-render the trailer until the owner says so; videos come later.

---

## 6. Risks

- **Library internals.** Flattening touches the private `_gridCache` of 3d-tiles-renderer, which is pinned at 0.5.4. The unit test catches upgrades; if it breaks, warn in development and fall back to the offset alone, with some terrain showing through.
- **NAIP service availability.** WMS returned 502 once; exports are slow. Use retries and the Planetary Computer fallback; it is a one-off bake either way.
- **Stale NAIP outside the mask.** A few 2022 roofs north of TX-4 may remain. Widen the mask or accept them.
- **Uncertain dimensions.** Deck height, SQD arm, chopstick pose, trench depth and colours are all unknown. Each is a single constant, flagged on the page.
- **Depth precision.** The depth buffer is 24-bit. Mitigate with the offset and the flattening, and raise the chase camera's near plane to 10–25 m when nothing is closer (20–50 times finer depth, repo research).
- **The stencil switch.** It changes the WebGL context. Check every view for regressions.
- **Fill rate.** Cloud, trail and plume overdraw near the pad, especially on phones. Cap the counts and scale alpha by screen size.
- **Shader hitches.** New materials compile on first use. Precompile during the hold and keep fog off them.
- **Draw calls.** The Starship view near the ground comes to about 110 (terrain) + 40 (vehicles) + 20 (site) + 6 (effects) = about 175 (estimate). The 150 budget is for globe mode; measure it.
- **Clock jumps and time warp.** Every effect must be a pure function of the mission clock.
- **Concurrent edits.** Someone is editing the mission files now. Rebase steps 3–4, 13 and 14 on what lands.
- **Licences.** NAIP is public domain. `starbase.json` is a derived OSM database and must be offered under ODbL. Do not ship EOX 2018–2025 layers.
- **The site will go stale.** Pad 1's mount is due "five to six months" after July 2026 [S18], and Tower 1's mast state is uncertain. Date the site "as of Nov 2026".

---

## 7. What stays an estimate (to name in the Data sources list)

**Starbase ground**
- "USDA NAIP 2022 (USGS), public domain, 0.6 m, flown 2022-06-10, before Pad 2 was built."
- "Inside the launch site, the ground is drawn from OpenStreetMap 2026 outlines, as gravel where nothing is mapped. The deluge stains are generated."

**Starbase structures**
- "OpenStreetMap contributors (ODbL), as mapped in November 2026. Tower heights from FAA filings (145 m and 140 m)."
- "Estimates:
  - the launch mount's height (booster about 18 m up), its legs and clamps;
  - the trench depth (painted, not modelled);
  - the ship arm's place, height and length;
  - the chopsticks' height and angle at launch;
  - Tower 2's lattice spacing and roof size;
  - tank, building and vaporizer heights where not mapped;
  - all colours;
  - the length of Tower 1's arm stubs and Pad 1's construction details."

**Starship ascent**
- "Event times from SpaceX's Flight 15 plan. The climb follows Flight 12's tracked path, scaled to Flight 15's staging time. Heading from the 30.5° orbit."
- "Estimates: the roll after liftoff, the engine start-up timing, and the booster's peak height."

**Exhaust, trail and clouds**
- "Modelled, not observed for one flight:
  - plume lengths and colours (from the FAA's 2019 analysis and photos), and shock-diamond spacing;
  - ground-cloud growth (from Space Shuttle studies) and the wind (assumed);
  - contrail heights (physics rule), widths and lifetime;
  - the staging flash and shell, the boostback bell, and the twilight colours (generated);
  - the vapour cone, if shown, which is not documented on Starship."

---

## 8. Research follow-ups (no owner input needed)

- **R1.** Measure the Pad 2 deck height from one side-on public photo, using the 72.3 m booster as scale. About 0.5 MB.
- **R2.** Where the chopsticks are parked during a launch.
- **R3.** Which tower face the SQD arm is on, and its height.
- **R4.** Structure colours, from public photos.
- **R5.** The ship's roll on the pad.
- **R6.** Whether Texas NAIP 2024 exists (it would show Tower 2), and when the TxGIO 6-inch survey will be flown [S51].

---

## 9. Open questions only the owner can answer

**Defaults taken on 2026-11-24** (Dalin said "continue and drive this"; any of these can be changed later):
- 1: use only sources that are fine either way (NAIP, OSM, FAA). No EOX 2018–2025 layers.
- 2: the booster's ending stays as it is for now (back at the pad). The offshore divert of Flight 15 comes with B0, in a later step.
- 3: satellites unchanged (60 at Flight 10's pace).
- 4: the visitor's own time, as today.
- 5: yes, a hold of at most 8 s, once the ground patch exists.
- 6: yes, about 1 MB, the 1.23 km patch; not widened.
- 7: no vapour cone (not documented for Starship).
- 8: no generated floodlights.
- 9: yes, Pad 1 as the November 2026 construction site, dated on the page.
- 10: the bake script is set up here; Dalin runs it (about 1.5–2.5 MB).


1. Is XNOHub non-commercial? EOX's 2018–2025 layers are CC BY-NC-SA. NAIP and OSM are fine either way.
2. How should the booster end?
   - Recommended: the offshore divert and hover that B22 actually flew on Flight 15.
   - Alternative: a catch at Pad 2, which was planned but has never been done with a V3.
3. Satellite release: keep 60 Starlink V3 at Flight 10's pace, or match a V3 flight? Flight 13 deployed 20 Starlink V3; Flight 15's deploy ran from T+35:01 to T+1:17:40 [S13].
4. Launch lighting: the visitor's current time (today's behaviour, so night launches are dark), the time of a real launch (Flight 15: sun 10°, long shadows), or a "twilight launch" option to show the jellyfish?
5. Is a countdown from T−0:20, with up to about 8 s of real-time hold while Starbase loads, acceptable?
6. Is about +1 MB per launch acceptable, served from our own Vercel deployment? Should the patch be widened to 2.46 km east to west, which doubles the size, to take in more beach and the first kilometre of the climb?
7. The vapour cone at max-Q is not documented for Starship. Show it labelled as generated, or leave it out?
8. Generated pad floodlights at night? Their positions are unknown.
9. Show Pad 1 as the November 2026 construction site, knowing it will go stale within months?
10. May the bake be run once (about 1.5–2.5 MB of downloads)?

---

## 10. Sources

- [S1] https://www.openstreetmap.org/relation/20300851 (ways 1486731987, 1486752422, 1486752423)
- [S2] https://www.openstreetmap.org/way/1352374225
- [S3] https://www.openstreetmap.org/way/1207227015 ; https://www.openstreetmap.org/way/1304017043
- [S4] https://www.openstreetmap.org/way/1540152644 ; https://www.openstreetmap.org/way/1540152646 (ways 1540152640–52)
- [S5] https://www.openstreetmap.org/way/968227813
- [S6] https://www.openstreetmap.org/way/1549519359 ; https://www.openstreetmap.org/way/842265432/history
- [S7] https://www.openstreetmap.org/way/1002874668 ; https://www.openstreetmap.org/way/1352374668 ; https://www.openstreetmap.org/way/1002874660 ; https://www.openstreetmap.org/way/1486752425
- [S8] https://www.openstreetmap.org/way/1486752424 ; /way/759249805 ; /way/1240890715 ; /way/1454334531 ; /way/1529212452 ; /way/1290585483 ; /way/1228332588 ; /way/732730820 ; /way/1479016405 ; /way/697324661 ; /way/1486712971 ; /way/1534183731 ; licence https://www.openstreetmap.org/copyright
- [S9] https://overpass-api.de/api/interpreter (extract dated 2026-11-22T22:30Z)
- [S10] https://oeaaa.faa.gov/oeaaa/oe3a/main/#/search (cases 2025-ASW-13942-OE, 2024-ASW-5880-OE, 2026-ASW-2223-OE, 2023-ASW-6938-OE, 2026-ASW-6838-OE)
- [S11] https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/ArcGIS/rest/services/Digital_Obstacle_File/FeatureServer/0
- [S12] https://ll.thespacedevs.com/2.3.0/pads/?search=Starbase ; https://ll.thespacedevs.com/2.3.0/launches/?search=Starship&net__gte=2025-09-01T00:00:00Z
- [S13] https://www.spacex.com/launches/starship-flight-15 (also -10, -12, -13, -14); text via https://content.spacex.com/api/spacex-website/missions/starship-flight-15
- [S14] https://www.spacex.com/updates
- [S15] https://www.nasaspaceflight.com/2026/05/spacex-starship-pad-first-launch/
- [S16] https://www.nasaspaceflight.com/2026/05/starship-flight-12-block-3-pad-2/
- [S17] https://www.nasaspaceflight.com/2026/05/super-heavy-block-3-booster-future/
- [S18] https://www.nasaspaceflight.com/2026/07/pad-1-retrofits-block-3-flights/
- [S19] https://www.nasaspaceflight.com/2026/10/spacex-static-fires-flight-15/
- [S20] https://www.nasaspaceflight.com/2026/11/starship-flight-15-spacex-history/
- [S21] https://www.nasaspaceflight.com/2026/10/roberts-road-expansion-flight-16/
- [S22] https://www.nasaspaceflight.com/2026/07/starship-florida-pushing-launch/
- [S23] https://spaceexplored.com/?p=42706
- [S24] https://en.wikipedia.org/wiki/SpaceX_Super_Heavy (rev 1386419070) ; https://en.wikipedia.org/wiki/SpaceX_Starbase (rev 1387092847) ; https://en.wikipedia.org/wiki/Starship_flight_15 (rev 1386689465)
- [S25] https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer ; https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer ; https://www.usgs.gov/faqs/what-are-terms-uselicensing-map-services-and-data-national-map
- [S26] Planetary Computer NAIP item tiles (template in A1) ; https://www.fsa.usda.gov/help/policies-and-links/
- [S27] https://registry.opendata.aws/terrain-tiles/ (tiles https://s3.amazonaws.com/elevation-tiles-prod/terrarium/14/3770/6965.png and /6966.png)
- [S28] https://cloudless.eox.at/documentation/product-list ; https://tiles.maps.eox.at/wmts/1.0.0/WMTSCapabilities.xml
- [S29] https://raw.githubusercontent.com/sanitaravel/starship_trajectories/HEAD/positions_flt12.csv (a third-party log of SpaceX's tracker; licence unknown)
- [S30] https://www.faa.gov/sites/faa.gov/files/space/stakeholder_engagement/spacex_starship/Appendix_G_Exhaust_Plume_Calculations.pdf
- [S31] https://www.faa.gov/media/94346 ; https://www.nasaspaceflight.com/2025/08/starbase-pad-2-advancements-pad-1/
- [S32] https://ntrs.nasa.gov/citations/19880005118 ; https://ntrs.nasa.gov/citations/19890012055
- [S33] https://cimss.ssec.wisc.edu/satellite-blog/archives/72995 (also /72380, /70605, /61821) ; https://cimss.ssec.wisc.edu/satellite-blog/images/2026/11/goeseast_abi_radc_true_color_night_20261113225117.png
- [S34] https://commons.wikimedia.org/wiki/File:Liftoff_of_SpaceX_IFT-5_(54064037095).jpg ; https://commons.wikimedia.org/wiki/File:SpaceX_Starship_during_IFT-5.jpg ; https://commons.wikimedia.org/wiki/File:SpaceX_IFT-5_Climbing_Overhead_(54063904214).jpg ; https://commons.wikimedia.org/wiki/File:SpaceX_Starship_hot_staging_IFT-5.jpg ; https://commons.wikimedia.org/wiki/File:Booster_Plume_of_SpaceX_IFT-5_(54062708072).jpg ; https://commons.wikimedia.org/wiki/File:Starship_IFT-2_NASA_Track_Crop.png ; https://commons.wikimedia.org/wiki/File:The_launch_of_the_SpaceX_Starship_6_rocket_seen_from_the_space_station_(iss072e220043).jpg ; https://commons.wikimedia.org/wiki/File:Launch_of_SpaceX_Starship_6_rocket_seen_from_the_International_Space_Station_(iss072e220161,_cropped).jpg
- [S35] https://www.twz.com/starships-33-engines-created-the-mother-of-all-shock-diamonds
- [S36] https://petapixel.com/2026/06/03/slow-mo-video-captures-shockwaves-from-the-spacex-starship-megarocket/
- [S37] https://arxiv.org/pdf/2404.07329 ; https://arxiv.org/abs/2505.07392
- [S38] https://doaj.org/article/1008ca67621e41bdb3df6e6603af2e22
- [S39] https://en.wikipedia.org/wiki/Twilight_phenomenon ; https://en.wikipedia.org/wiki/Space_jellyfish ; https://science.nasa.gov/image-article/apod-2026-march-19-launch-plume-spacex-jellyfish/
- [S40] https://en.wikipedia.org/wiki/Vapor_cone
- [S41] https://reef.atmos.colostate.edu/~odell/at721/resources/rayleighOpticalDepth.pdf
- [S42] https://www.digitaltrends.com/space/spacex-tracking-camera-shows-starship-stage-separation/ ; https://everydayastronaut.com/starship-superheavy-flight-test-2/
- [S43] https://spaceflightnow.com/2026/05/23/musk-praises-epic-super-heavy-starship-launch/
- [S44] https://www.teslarati.com/spacex-starship-launch-tower-mechazilla-catch-arm-installation/
- [S45] https://www.space.com/space-exploration/launches-spacecraft/the-worlds-biggest-rocket-how-spacexs-new-starship-v3-differs-from-its-predecessors
- [S46] https://www.nasaspaceflight.com/2026/07/starship-flight-13-flight/
- [S47] Basenor, 2026-09-01, on Tower 1's mast (citing NSF and LabPadre). The URL was not recorded.
- [S48] https://www.wikidata.org/wiki/Q123524133 ; https://www.wikidata.org/wiki/Q65395237
- [S50] https://ntrs.nasa.gov/citations/19770009539
- [S51] https://www.twdb.texas.gov/board/2026/06/Board/Brd01.pdf

## Files

The research data behind the numbers is kept on Dalin's machine only, in `.claude/research/starbase/` in this repo (ignored by git, not published: the SpaceX and NSF texts are copyrighted and the Flight 12 log's licence is unknown). Everything there can be fetched again from the URLs in section 10.

- `osm/all.json`: the OpenStreetMap extract of the site (ODbL)
- `dl_osm/pad2_full.json`: the Pad 2 mount, trench and pond in OSM API format
- `dl_traj/positions_flt12.csv`: the Flight 12 tracker log [S29]
- `sx/`: SpaceX flight-page timelines; `web/nsf/`: NSF article text
- `dl_plan_terrain/`: the Terrarium tiles at the pads
- `plan_scripts/`: the measurement scripts (local positions and box fits `enu.py`, `osm_obb.py`; terrain heights `terr.py`; sun positions `sun.py`)
