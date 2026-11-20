'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { TilesRenderer, TilesPlugin } from '3d-tiles-renderer/r3f';
import {
  XYZTilesOverlay,
  TerrariumMeshPlugin,
  GoogleCloudAuthPlugin,
  TileCompressionPlugin,
  UpdateOnChangePlugin
} from '3d-tiles-renderer/plugins';
import { world, TILES_BELOW } from '@/lib/world';
import { unitToLatLon } from '@/lib/geo';
import { googleTilesAllowed, noteGoogleTilesSession } from '@/lib/google-tiles';

// Close-up Earth from open tile services, streamed only when the camera is
// below ~3,200 km. Far away, the textured globe (night lights, clouds) stays.
//   Imagery: Sentinel-2 cloudless 2016 by EOX (CC BY 4.0)
//   Terrain: AWS Terrain Tiles (Terrarium), open data with per-source credits
// Tiles live in ECEF metres; the group maps them into the scene frame
// (Y = north, 1 unit = 6,371 km), see lib/geo.ts.

const EOX_2016 = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg';
const TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const METRES_TO_UNITS = 1 / 6_371_000;

// Each plugin instance owns its imagery overlay: the plugin disposes the
// overlay with itself, so sharing one across remounts (strict mode, leaving
// and re-entering tile range) leaves the next plugin with a dead overlay.
class OpenTerrainPlugin extends TerrariumMeshPlugin {
  constructor() {
    super({
      url: TERRARIUM,
      maxZoom: 15,
      overlay: new XYZTilesOverlay({ url: EOX_2016, levels: 15, tileDimension: 256 }),
      applyOverlayTexture: true
    });
  }

  // Terrarium includes sea-floor depth; drawn as-is the sea sits on stepped
  // bathymetry and shows contour rings. Clamp to sea level. (This also flattens
  // the few dry places below sea level, like the Dead Sea shore.)
  decodeElevation(r: number, g: number, b: number) {
    return Math.max(0, r * 256 + g + b / 256 - 32768);
  }
}

// Screen-space error in px a tile may have before it splits. The plugin's
// recommended 1 px gives ~220 draw calls at low altitude; 2 px halves the tile
// count with little visible loss.
const ERROR_TARGET = 2;

interface TiledEarthProps {
  /** Globe pieces to hide while tiles are drawn. */
  hideWhenActive: React.RefObject<THREE.Object3D | null>[];
  photoreal: boolean;
}

export const TiledEarth: React.FC<TiledEarthProps> = ({ hideWhenActive, photoreal }) => {
  const camera = useThree((s) => s.camera);
  const [active, setActive] = useState(false);
  const terrain = useRef<TerrariumMeshPlugin>(null);
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';
  const useGoogle = photoreal && !!googleKey && googleTilesAllowed();

  useEffect(() => {
    if (useGoogle) noteGoogleTilesSession();
  }, [useGoogle]);

  const tilesRef = useRef<{ errorTarget: number } | null>(null);

  useFrame(() => {
    if (tilesRef.current && tilesRef.current.errorTarget !== ERROR_TARGET) {
      tilesRef.current.errorTarget = ERROR_TARGET; // after the plugin's own default
    }
    const on = world.altitude < TILES_BELOW;
    if (on !== world.tilesActive) {
      world.tilesActive = on;
      setActive(on);
    }
    for (const r of hideWhenActive) {
      const o = r.current as (THREE.Object3D & { material?: THREE.Material }) | null;
      if (!o) continue;
      // Hide only the surface material so children (rep bars, arcs) stay visible.
      if (o.material) o.material.visible = !on;
      else o.visible = !on;
    }
    if (on && terrain.current) {
      const { lat, lon } = unitToLatLon(camera.position);
      const h = terrain.current.sampleCartographicElevation(lat * THREE.MathUtils.DEG2RAD, lon * THREE.MathUtils.DEG2RAD);
      world.groundAltitude = h === null ? null : h * METRES_TO_UNITS;
    } else {
      world.groundAltitude = null;
    }
  });

  if (!active) return null;
  return (
    <>
    {/* Sky and bounce light so shadowed slopes aren't pitch black. */}
    <hemisphereLight args={[0x9cc4ff, 0x4a3f34, 1.1]} />
    <group rotation-x={-Math.PI / 2} scale={METRES_TO_UNITS}>
      {useGoogle ? (
        <TilesRenderer key="google">
          <TilesPlugin plugin={GoogleCloudAuthPlugin} args={[{ apiToken: googleKey, autoRefreshToken: true }]} />
          <TilesPlugin plugin={TileCompressionPlugin} />
          <TilesPlugin plugin={UpdateOnChangePlugin} />
        </TilesRenderer>
      ) : (
        <TilesRenderer key="open" ref={tilesRef as never}>
          <TilesPlugin
            // r3f's TilesPlugin types the ref as the class, not the instance.
            ref={terrain as never}
            plugin={OpenTerrainPlugin}
          />
        </TilesRenderer>
      )}
    </group>
    </>
  );
};
