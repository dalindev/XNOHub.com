import * as THREE from 'three';

// Shared materials for the procedural spacecraft. Created once, reused by
// every model so the GPU sees a handful of materials, not one per part.

const TILE_M = 1.2; // one repeat of the solar texture covers this many metres

function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D, size: number) => void) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// Solar cells: 4 x 4 blue cells per repeat with clipped corners, fine collector
// lines across each and pale gaps between them.
const solarTexture = () =>
  canvasTexture(256, (g, n) => {
    g.fillStyle = '#9fb2d6';
    g.fillRect(0, 0, n, n);
    const cell = n / 4;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const shade = g.createLinearGradient(x * cell, y * cell, (x + 1) * cell, (y + 1) * cell);
        shade.addColorStop(0, '#1c3f93');
        shade.addColorStop(1, '#10275f');
        g.fillStyle = shade;
        const [l, t, w, k] = [x * cell + 2, y * cell + 2, cell - 4, 7];
        g.beginPath();
        g.moveTo(l + k, t); g.lineTo(l + w - k, t); g.lineTo(l + w, t + k); g.lineTo(l + w, t + w - k);
        g.lineTo(l + w - k, t + w); g.lineTo(l + k, t + w); g.lineTo(l, t + w - k); g.lineTo(l, t + k);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(150, 180, 240, 0.28)';
        g.lineWidth = 1;
        for (let i = 6; i < w; i += 6) {
          g.beginPath(); g.moveTo(l + 1, t + i); g.lineTo(l + w - 1, t + i); g.stroke();
        }
      }
    }
  });

// The body: pale metal plates with seams and a row of fasteners along each.
const plateTexture = () =>
  canvasTexture(256, (g, n) => {
    g.fillStyle = '#d9dde2';
    g.fillRect(0, 0, n, n);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '90,96,106'}, ${Math.random() * 0.08})`;
      g.fillRect(Math.random() * n, Math.random() * n, 2 + Math.random() * 10, 1 + Math.random() * 3);
    }
    g.strokeStyle = '#8b929c';
    g.lineWidth = 2;
    for (const at of [0, n / 2]) {
      g.beginPath(); g.moveTo(at + 1, 0); g.lineTo(at + 1, n); g.stroke();
      g.beginPath(); g.moveTo(0, at + 1); g.lineTo(n, at + 1); g.stroke();
    }
    g.fillStyle = '#7d848e';
    for (let i = 8; i < n; i += 16) for (const at of [6, n / 2 + 6]) {
      g.fillRect(i, at, 2, 2);
      g.fillRect(at, i, 2, 2);
    }
  });

export const SOLAR_TILE_M = TILE_M;

let cache: ReturnType<typeof make> | null = null;
function make() {
  return {
    // The cells also give off a little of their own colour: with one sun and no
    // sky to reflect, an array turned away from the light would be plain black.
    solar: (() => {
      const map = solarTexture();
      return new THREE.MeshStandardMaterial({ color: 0xffffff, map, emissive: 0x3a5cc0, emissiveMap: map, emissiveIntensity: 0.22, metalness: 0.15, roughness: 0.3 });
    })(),
    solarBack: new THREE.MeshStandardMaterial({ color: 0xcfcfc6, metalness: 0.1, roughness: 0.8, emissive: 0x30302c, emissiveIntensity: 0.3 }),
    plate: new THREE.MeshStandardMaterial({ color: 0xffffff, map: plateTexture(), metalness: 0.3, roughness: 0.42, emissive: 0x20242a, emissiveIntensity: 0.4 }),
    dish: new THREE.MeshStandardMaterial({ color: 0xeef1f4, metalness: 0.35, roughness: 0.25, emissive: 0x20242a, emissiveIntensity: 0.4 }),
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
