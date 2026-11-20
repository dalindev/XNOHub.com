'use client';

import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { lightAsEarth } from '@/lib/earth-light';

// The Earth is the 3D tiled Earth (components/tiled-earth), and its tiles
// arrive over the network. This is one small picture of the whole planet,
// made from the same imagery (scripts/build-small-maps.py), on a sphere just
// under where the tiles go: 22 km below the lowest of them, the polar sea.
// It is what you see for the first moment, behind any tile still on its way,
// and if the tile server can't be reached.
//
// The same picture also covers the two poles at the surface. Map tiles stop
// at 85.05 degrees of latitude (the edge of the Mercator map), and stretching
// each tile's last row on to the pole shows as a pinwheel of mismatched
// wedges, so the tiles are left open there (components/tiled-earth) and these
// two caps close them. The picture is smoothed toward the pole for this.

// The Earth's shape in scene units (WGS84; 1 unit = 6,371 km).
const EQUATORIAL = 1.00112;
const POLAR = 0.99776;
/** The caps reach a little under the tiles' edge and sit 600 m under sea level, so no gap or flicker shows where they meet. */
const CAP_FROM_LATITUDE = 84.8;
const CAP_SINK = 0.9999;

/** The part of the sphere within `90 - CAP_FROM_LATITUDE` degrees of a pole, with the whole-Earth picture's own coordinates. */
function poleCap(north: boolean) {
  const reach = THREE.MathUtils.degToRad(90 - CAP_FROM_LATITUDE);
  const cap = new THREE.SphereGeometry(1, 96, 6, 0, Math.PI * 2, north ? 0 : Math.PI - reach, reach);
  // SphereGeometry spreads the picture's full height over whatever part it is asked for.
  const uv = cap.attributes.uv;
  const share = reach / Math.PI;
  for (let i = 0; i < uv.count; i++) uv.setY(i, north ? 1 - (1 - uv.getY(i)) * share : uv.getY(i) * share);
  return cap;
}

export const EarthBase: React.FC = () => {
  const earth = useMemo(() => {
    const picture = new THREE.TextureLoader().load('/earth/base-2k.jpg');
    picture.colorSpace = THREE.SRGBColorSpace;
    picture.anisotropy = 4;
    const material = lightAsEarth(new THREE.MeshLambertMaterial({ map: picture }));
    const earth = new THREE.Group();
    const base = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), material);
    base.scale.setScalar(0.9943);
    earth.add(base);
    for (const north of [true, false]) {
      const cap = new THREE.Mesh(poleCap(north), material);
      cap.scale.set(EQUATORIAL * CAP_SINK, POLAR * CAP_SINK, EQUATORIAL * CAP_SINK);
      earth.add(cap);
    }
    return { group: earth, material, picture };
  }, []);

  useEffect(
    () => () => {
      earth.picture.dispose();
      earth.material.dispose();
      for (const part of earth.group.children) (part as THREE.Mesh).geometry.dispose();
    },
    [earth]
  );

  return <primitive object={earth.group} />;
};
