import * as THREE from 'three';

// Shared materials for the procedural spacecraft. Created once, reused by
// every model so the GPU sees a handful of materials, not one per part.

function solarTexture() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0a1630';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#2a4a8a';
  g.lineWidth = 2;
  for (let i = 0; i <= 128; i += 16) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

let cache: ReturnType<typeof make> | null = null;
function make() {
  return {
    solar: new THREE.MeshStandardMaterial({ color: 0xffffff, map: solarTexture(), metalness: 0.2, roughness: 0.35, side: THREE.DoubleSide }),
    solarBack: new THREE.MeshStandardMaterial({ color: 0xd8d8d0, metalness: 0.1, roughness: 0.8 }),
    bus: new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 0.25, roughness: 0.5 }),
    busDark: new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.3, roughness: 0.6 }),
    laser: new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.7, roughness: 0.3, emissive: 0x112244, emissiveIntensity: 0.6 }),
    // Low metalness: there's no environment map, and a true metal would render near-black.
    steel: new THREE.MeshStandardMaterial({ color: 0xc4c8cc, metalness: 0.35, roughness: 0.35 }),
    tiles: new THREE.MeshStandardMaterial({ color: 0x15161a, metalness: 0.1, roughness: 0.85 }),
    engine: new THREE.MeshStandardMaterial({ color: 0x55595f, metalness: 0.4, roughness: 0.4, side: THREE.DoubleSide }),
    soot: new THREE.MeshStandardMaterial({ color: 0x3c3a38, metalness: 0.4, roughness: 0.7 })
  };
}

export function materials() {
  cache ??= make();
  return cache;
}
