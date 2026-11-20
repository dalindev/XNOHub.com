'use client';

import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { TilesRenderer, TilesPlugin } from '3d-tiles-renderer/r3f';
import { XYZTilesOverlay, TerrariumMeshPlugin } from '3d-tiles-renderer/plugins';
import { world } from '@/lib/world';
import { unitToLatLon } from '@/lib/geo';
import { lightAsEarth } from '@/lib/earth-light';

// The Earth, streamed as map tiles at whatever sharpness the view needs, in
// two sets:
//
//   From high up: NASA's Blue Marble with shaded relief and sea floor (public
//     domain, served by NASA GIBS, 600 m per pixel at its sharpest). One
//     picture of the whole planet in even light and even colour.
//   Below about 900 km: Sentinel-2 cloudless 2016 by EOX (CC BY 4.0), down to
//     10 m per pixel, on real relief from AWS Terrain Tiles (Terrarium, open
//     data). These are scans from many different days, which shows as stripes
//     and patches of different colour from high up; close to the ground it
//     doesn't, and nothing else is as sharp.
//
// The whole Earth changes from one set to the other at once (never part of
// the view in each), and only when the set it is changing to has loaded.
// A small picture of the whole planet sits underneath for the moments before
// any tile arrives (components/earth-base). Tiles live in ECEF metres; the
// group maps them into the scene frame (Y = north, 1 unit = 6,371 km), see
// lib/geo.ts.

const BLUE_MARBLE =
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg';
const EOX_2016 = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg';
const TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const METRES_TO_UNITS = 1 / 6_371_000;

// Camera height, in Earth radii, where the Earth changes set: down to the
// scans below 900 km, back up to Blue Marble above 1,100 km (apart, so it
// doesn't flip back and forth at the line). The other set starts loading a
// little before its line is reached, and is let go a little after that.
const TO_SCANS = 0.14;
const TO_BLUE_MARBLE = 0.17;
const LOAD_AHEAD = 1.35;
const LET_GO = 1.3;
/** Past the line and still loading after this long: change anyway. Coarse tiles sharpen in place. */
const WAIT_SECONDS = 4;

// In the scans, relief is fetched from this tile level on (2.4 km per pixel).
// Coarser tiles are only ever parents on the way down, and elevation tiles
// are ten times the size of picture tiles, so those are drawn at sea level
// without asking the server. Blue Marble has its relief painted in and is
// drawn at sea level throughout.
const RELIEF_FROM_LEVEL = 6;

/** Sea level everywhere, in the padded single-channel form the terrain plugin keeps its elevation in. */
function seaLevel() {
  const grid = new THREE.DataTexture(new Float32Array(16), 4, 4, THREE.RedFormat, THREE.FloatType);
  grid.minFilter = grid.magFilter = THREE.LinearFilter;
  grid.needsUpdate = true;
  return grid;
}

type ParseToMesh = (...args: unknown[]) => Promise<THREE.Mesh | null>;
type GridKey = [x: number, y: number, level: number];
interface GridCache {
  fetchItem(key: GridKey, signal: AbortSignal): unknown;
}

// Each plugin instance owns its imagery overlay: the plugin disposes the
// overlay with itself, so sharing one across remounts leaves the next plugin
// with a dead overlay.
class EarthPlugin extends TerrariumMeshPlugin {
  constructor(picture: { url: string; levels: number }, maxZoom: number, reliefFrom: number) {
    super({
      url: TERRARIUM,
      maxZoom,
      // Stop at the edge of the map (85.05 degrees) instead of stretching the last row to the pole: see components/earth-base.
      endCaps: false,
      overlay: new XYZTilesOverlay({ url: picture.url, levels: picture.levels, tileDimension: 256 }),
      applyOverlayTexture: true
    });
    // The plugin has no option for "no relief above this level", so this goes
    // through its elevation cache (private, checked against 3d-tiles-renderer 0.5.4).
    const cache = (this as unknown as { _gridCache: GridCache })._gridCache;
    const fetchElevation = cache.fetchItem.bind(cache);
    cache.fetchItem = (key, signal) => (key[2] < reliefFrom ? seaLevel() : fetchElevation(key, signal));
  }

  // Terrarium includes sea-floor depth; drawn as-is the sea sits on stepped
  // bathymetry and shows contour rings. Clamp to sea level. (This also flattens
  // the few dry places below sea level, like the Dead Sea shore.)
  decodeElevation(r: number, g: number, b: number) {
    return Math.max(0, r * 256 + g + b / 256 - 32768);
  }

  // Called by the tiles renderer for every tile (the library ships no types for it).
  async parseToMesh(...args: unknown[]) {
    const mesh = await (TerrariumMeshPlugin.prototype as unknown as { parseToMesh: ParseToMesh }).parseToMesh.apply(this, args);
    if (mesh) lightAsEarth(mesh.material as THREE.Material);
    return mesh;
  }
}

class BlueMarblePlugin extends EarthPlugin {
  constructor() {
    super({ url: BLUE_MARBLE, levels: 9 }, 7, Infinity);
  }
}

class ScansPlugin extends EarthPlugin {
  constructor() {
    super({ url: EOX_2016, levels: 15 }, 15, RELIEF_FROM_LEVEL);
  }
}

// How coarse a tile may be drawn before it splits: screen pixels (CSS px) per
// pixel of its picture. Close to the ground the plugin's recommended 1 gives
// ~220 draw calls; 2 halves the tile count with little visible loss. From
// orbit only a few dozen tiles are in view, so there the Earth is drawn as
// sharp as the screen can show: about 1.6 device pixels per picture pixel.
const NEAR_TARGET = 2;
const FAR_DEVICE_PX = 1.6;
const errorTarget = (altitude: number, dpr: number) =>
  THREE.MathUtils.lerp(NEAR_TARGET, THREE.MathUtils.clamp(FAR_DEVICE_PX / dpr, 0.8, NEAR_TARGET), THREE.MathUtils.smoothstep(altitude, 0.4, 1.2));

type SetName = 'blueMarble' | 'scans';
interface Tiles {
  errorTarget: number;
  loadProgress: number;
  stats: { visible: number };
}

/** One of the two sets: loads for the current view whenever it is mounted; the parent decides when it is drawn. */
const TileSet: React.FC<{
  plugin: typeof BlueMarblePlugin;
  group: React.RefObject<THREE.Group | null>;
  tiles: React.RefObject<Tiles | null>;
  terrain?: React.RefObject<TerrariumMeshPlugin | null>;
}> = ({ plugin, group, tiles, terrain }) => (
  <group ref={group} visible={false} rotation-x={-Math.PI / 2} scale={METRES_TO_UNITS}>
    <TilesRenderer ref={tiles as never}>
      <TilesPlugin
        // r3f's TilesPlugin types the ref as the class, not the instance.
        ref={terrain as never}
        plugin={plugin}
      />
    </TilesRenderer>
  </group>
);

export const TiledEarth: React.FC = () => {
  const camera = useThree((s) => s.camera);
  const [mounted, setMounted] = useState<Record<SetName, boolean>>({ blueMarble: false, scans: false });
  const showing = useRef<SetName | null>(null);
  const pastLine = useRef(0); // seconds spent past the line, waiting for the other set
  const blueMarbleGroup = useRef<THREE.Group>(null);
  const scansGroup = useRef<THREE.Group>(null);
  const blueMarbleTiles = useRef<Tiles>(null);
  const scansTiles = useRef<Tiles>(null);
  const terrain = useRef<TerrariumMeshPlugin>(null);

  useFrame((state, delta) => {
    const altitude = world.altitude;
    const groups = { blueMarble: blueMarbleGroup.current, scans: scansGroup.current };
    const tiles = { blueMarble: blueMarbleTiles.current, scans: scansTiles.current };
    // Start with the set that suits where the camera starts (a deep link can start on the ground).
    if (showing.current === null) showing.current = altitude < TO_SCANS ? 'scans' : 'blueMarble';

    const other: SetName = showing.current === 'scans' ? 'blueMarble' : 'scans';
    const past = other === 'scans' ? altitude < TO_SCANS : altitude > TO_BLUE_MARBLE;
    const ready = (tiles[other]?.loadProgress ?? 0) >= 1 && (tiles[other]?.stats.visible ?? 0) > 0;
    pastLine.current = past ? pastLine.current + delta : 0;
    if (past && (ready || pastLine.current > WAIT_SECONDS)) {
      showing.current = other;
      pastLine.current = 0;
    }

    const want = {
      blueMarble: showing.current === 'blueMarble' || altitude > (TO_BLUE_MARBLE / LOAD_AHEAD) / (mounted.blueMarble ? LET_GO : 1),
      scans: showing.current === 'scans' || altitude < TO_SCANS * LOAD_AHEAD * (mounted.scans ? LET_GO : 1)
    };
    if (want.blueMarble !== mounted.blueMarble || want.scans !== mounted.scans) setMounted(want);

    for (const name of ['blueMarble', 'scans'] as const) {
      const group = groups[name];
      if (group) group.visible = showing.current === name;
      const set = tiles[name];
      if (set) set.errorTarget = errorTarget(altitude, state.viewport.dpr); // after the plugin's own default
    }

    // Ground height under the camera, from the scans' relief once it is loaded (sea level otherwise).
    if (terrain.current && showing.current === 'scans') {
      const { lat, lon } = unitToLatLon(camera.position);
      const h = terrain.current.sampleCartographicElevation(lat * THREE.MathUtils.DEG2RAD, lon * THREE.MathUtils.DEG2RAD);
      world.groundAltitude = h === null ? null : h * METRES_TO_UNITS;
    } else {
      world.groundAltitude = null;
    }
  });

  return (
    <>
      {mounted.blueMarble && <TileSet plugin={BlueMarblePlugin} group={blueMarbleGroup} tiles={blueMarbleTiles} />}
      {mounted.scans && <TileSet plugin={ScansPlugin} group={scansGroup} tiles={scansTiles} terrain={terrain} />}
    </>
  );
};
