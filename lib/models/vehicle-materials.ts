import * as THREE from 'three';

// Materials for Starship, Super Heavy and the Starlink V3 satellites they
// carry, with textures drawn in code (nothing to download). Every texture is
// laid out in metres: a geometry sets its UVs with metreUVs(), and the
// texture repeats every `size` metres, so a weld seam is 1.83 m apart on the
// ship and on the booster alike.
//
// The metal surfaces reflect an environment of black space above and the
// Earth below (lib/models/orbit-environment), set on these materials by the
// component that draws them. Without it brushed steel renders near-black.

interface Drawn {
  texture: THREE.CanvasTexture | null;
  /** Metres covered by one repeat: [across, along]. */
  size: [number, number];
}

function draw(w: number, h: number, size: [number, number], paint: (g: CanvasRenderingContext2D, w: number, h: number) => void, srgb = true): Drawn {
  if (typeof document === 'undefined') return { texture: null, size };
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return { texture: t, size };
}

/** A seeded random source, so the textures look the same on every load. */
function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const RING_M = 1.83; // height of one welded steel ring

// Stainless steel: faint vertical brushing, one ring weld per repeat with a
// dark seam and a bright lip, and a sparse grid of small fastener dots.
const steel = () =>
  // 14 repeats round the 9 m hull, so the texture meets itself at the seam.
  draw(256, 256, [(Math.PI * 9) / 14, RING_M], (g, w, h) => {
    const r = random(7);
    g.fillStyle = '#c7cbd0';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '60,66,74'}, ${0.02 + r() * 0.05})`;
      g.fillRect(r() * w, r() * h, 1, 8 + r() * 60);
    }
    // Large soft variations, as panels catch the light a little differently.
    for (let i = 0; i < 6; i++) {
      const grad = g.createLinearGradient(r() * w, 0, r() * w, h);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, `rgba(${r() < 0.5 ? '255,255,255' : '40,44,50'}, 0.06)`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    }
    g.fillStyle = '#7c838d';
    g.fillRect(0, h - 3, w, 2);
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.fillRect(0, h - 5, w, 1);
    g.fillStyle = 'rgba(70,74,82,0.55)';
    for (let x = 6; x < w; x += 16) for (const y of [h - 14, Math.round(h * 0.45)]) g.fillRect(x, y, 2, 2);
  });

// Booster steel: the same rings, with soot from the engines rising from the
// bottom and a scorched band under the hot-staging ring at the top. One
// repeat around, the full booster height along (72.3 m).
const BOOSTER_M = 72.3;
const boosterSteel = () =>
  draw(128, 2048, [(Math.PI * 9) / 9, BOOSTER_M], (g, w, h) => {
    const r = random(11);
    g.fillStyle = '#c3c7cc';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '60,66,74'}, ${0.02 + r() * 0.05})`;
      g.fillRect(r() * w, r() * h, 1, 10 + r() * 80);
    }
    const ring = (h / BOOSTER_M) * RING_M;
    for (let y = h; y > 0; y -= ring) {
      g.fillStyle = '#7d848e';
      g.fillRect(0, Math.round(y) - 2, w, 2);
      g.fillStyle = 'rgba(255,255,255,0.45)';
      g.fillRect(0, Math.round(y) - 4, w, 1);
    }
    // Soot from the bottom (canvas bottom = booster bottom), streaky.
    const soot = (from: number, to: number, alpha: number) => {
      const grad = g.createLinearGradient(0, h - from * (h / BOOSTER_M), 0, h - to * (h / BOOSTER_M));
      grad.addColorStop(0, `rgba(38,30,24,${alpha})`);
      grad.addColorStop(1, 'rgba(38,30,24,0)');
      g.fillStyle = grad;
      g.fillRect(0, h - to * (h / BOOSTER_M), w, (to - from) * (h / BOOSTER_M));
    };
    soot(0, 11, 0.85);
    for (let i = 0; i < 26; i++) {
      const x = r() * w;
      const top = 6 + r() * 18;
      const grad = g.createLinearGradient(0, h, 0, h - top * (h / BOOSTER_M));
      grad.addColorStop(0, 'rgba(30,24,20,0.6)');
      grad.addColorStop(1, 'rgba(30,24,20,0)');
      g.fillStyle = grad;
      g.fillRect(x, h - top * (h / BOOSTER_M), 2 + r() * 6, top * (h / BOOSTER_M));
    }
    const scorch = g.createLinearGradient(0, 0, 0, (h / BOOSTER_M) * 6);
    scorch.addColorStop(0, 'rgba(48,40,34,0.75)');
    scorch.addColorStop(1, 'rgba(48,40,34,0)');
    g.fillStyle = scorch;
    g.fillRect(0, 0, w, (h / BOOSTER_M) * 6);
  });

// The heat shield: pointy-top hexagonal tiles, about 30 cm across, in near
// black with slightly different shades, and the odd pale replacement tile.
// 8 tiles across and 4 pairs of rows down make one repeat.
const HEX_SIDE = 0.175;
const HEX_W = Math.sqrt(3) * HEX_SIDE;
const tiles = () => {
  const across = 8;
  const pairs = 4;
  const pxPerM = 200;
  const wM = across * HEX_W;
  const hM = pairs * 3 * HEX_SIDE;
  return draw(Math.round(wM * pxPerM), Math.round(hM * pxPerM), [wM, hM], (g, w, h) => {
    const r = random(3);
    g.fillStyle = '#2b2d31';
    g.fillRect(0, 0, w, h);
    const s = HEX_SIDE * pxPerM;
    const hw = (HEX_W * pxPerM) / 2;
    const gap = 2.2;
    for (let row = -1; row <= pairs * 2; row++) {
      for (let col = -1; col <= across; col++) {
        const cx = col * hw * 2 + (row % 2 ? hw : 0);
        const cy = row * 1.5 * s;
        const pale = r() < 0.012;
        const shade = 18 + Math.floor(r() * 12);
        g.fillStyle = pale ? '#b9b6ae' : `rgb(${shade},${shade + 1},${shade + 3})`;
        g.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = Math.PI / 6 + (k * Math.PI) / 3;
          g.lineTo(cx + Math.cos(a) * (s - gap), cy + Math.sin(a) * (s - gap));
        }
        g.closePath();
        g.fill();
        // The same tile again where it wraps round the edges of the repeat.
        for (const [dx, dy] of [[w, 0], [0, h], [w, h]]) {
          g.save();
          g.translate(dx, dy);
          g.fill();
          g.restore();
        }
      }
    }
  });
};

// A grid fin's lattice: square cells, open (transparent), with walls.
const lattice = () =>
  draw(256, 128, [2, 1], (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#5c6067';
    const cell = 16;
    for (let x = 0; x <= w; x += cell) g.fillRect(x - 2, 0, 4, h);
    for (let y = 0; y <= h; y += cell) g.fillRect(0, y - 2, w, 4);
  });

// The hot-staging ring's vents: tall openings between steel posts.
const vents = () =>
  draw(128, 128, [1.2, 2.5], (g, w, h) => {
    g.fillStyle = '#b9bec4';
    g.fillRect(0, 0, w, h);
    g.clearRect(w * 0.2, h * 0.14, w * 0.6, h * 0.72);
  });

// Starlink V3 solar cells: pale, almost white panels in a grid of cells,
// as in SpaceX's renders.
const v3Cells = () =>
  draw(256, 256, [3, 3], (g, w, h) => {
    const r = random(5);
    g.fillStyle = '#7f8ea8';
    g.fillRect(0, 0, w, h);
    const nx = 6, ny = 6;
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const v = 196 + Math.floor(r() * 18);
        const grad = g.createLinearGradient(0, (y * h) / ny, 0, ((y + 1) * h) / ny);
        grad.addColorStop(0, `rgb(${v - 8},${v},${v + 22})`);
        grad.addColorStop(1, `rgb(${v - 22},${v - 12},${v + 10})`);
        g.fillStyle = grad;
        g.fillRect((x * w) / nx + 1.5, (y * h) / ny + 1.5, w / nx - 3, h / ny - 3);
      }
    }
  });

// The V3 bus: bronze-coloured panels between lighter structural ribs, a long
// rib down the middle and three across (SpaceX's renders show a plate split
// into six). One repeat covers the whole top (6.2 m by 3 m).
const v3Plate = () =>
  draw(512, 256, [6.2, 3], (g, w, h) => {
    const r = random(9);
    g.fillStyle = '#8b765c';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? '255,235,200' : '40,30,20'}, ${r() * 0.07})`;
      g.fillRect(r() * w, r() * h, 2 + r() * 14, 1 + r() * 3);
    }
    g.fillStyle = '#c9c2b4';
    g.fillRect(0, h / 2 - 5, w, 10);
    for (const x of [0.02, 0.34, 0.66, 0.98]) g.fillRect(x * w - 5, 0, 10, h);
    g.fillRect(0, 0, w, 6);
    g.fillRect(0, h - 6, w, 6);
    g.fillStyle = 'rgba(30,24,18,0.5)';
    for (let i = 0; i < 40; i++) g.fillRect(r() * w, r() * h, 10 + r() * 30, 6 + r() * 12);
  });

let cache: ReturnType<typeof make> | null = null;

function make() {
  const t = { steel: steel(), boosterSteel: boosterSteel(), tiles: tiles(), lattice: lattice(), vents: vents(), v3Cells: v3Cells(), v3Plate: v3Plate() };
  const m = {
    // Rolled stainless: satin rather than mirror, so a face turned to black
    // space still reads as steel and the sun's glint spreads instead of
    // burning out.
    steel: new THREE.MeshStandardMaterial({ color: 0xffffff, map: t.steel.texture, metalness: 0.78, roughness: 0.38 }),
    boosterSteel: new THREE.MeshStandardMaterial({ color: 0xffffff, map: t.boosterSteel.texture, metalness: 0.74, roughness: 0.42 }),
    tiles: new THREE.MeshStandardMaterial({ color: 0xffffff, map: t.tiles.texture, metalness: 0.05, roughness: 0.82 }),
    tileEdge: new THREE.MeshStandardMaterial({ color: 0x1b1c20, metalness: 0.05, roughness: 0.85 }),
    vents: new THREE.MeshStandardMaterial({ color: 0xffffff, map: t.vents.texture, alphaTest: 0.5, metalness: 0.75, roughness: 0.38, side: THREE.DoubleSide }),
    lattice: new THREE.MeshStandardMaterial({ color: 0xffffff, map: t.lattice.texture, alphaTest: 0.5, metalness: 0.6, roughness: 0.45, side: THREE.DoubleSide }),
    fin: new THREE.MeshStandardMaterial({ color: 0x5c6067, metalness: 0.6, roughness: 0.45 }),
    void: new THREE.MeshBasicMaterial({ color: 0x050506, side: THREE.DoubleSide }),
    // Engine bells: dark metal, a little blued from the heat.
    bell: new THREE.MeshStandardMaterial({ color: 0x4a4f58, metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide }),
    bellInside: new THREE.MeshStandardMaterial({ color: 0x23201e, metalness: 0.3, roughness: 0.8, side: THREE.BackSide }),
    engineBay: new THREE.MeshStandardMaterial({ color: 0x2e2f33, metalness: 0.4, roughness: 0.7 }),
    // Starlink V3.
    v3Plate: new THREE.MeshStandardMaterial({ color: 0xffffff, map: t.v3Plate.texture, metalness: 0.55, roughness: 0.42 }),
    v3Under: new THREE.MeshStandardMaterial({ color: 0x2a2c31, metalness: 0.3, roughness: 0.6 }),
    v3Trim: new THREE.MeshStandardMaterial({ color: 0xb9bcc2, metalness: 0.7, roughness: 0.35 }),
    v3Dish: new THREE.MeshStandardMaterial({ color: 0x9fb4d8, metalness: 0.6, roughness: 0.25 }),
    v3Cells: new THREE.MeshStandardMaterial({ color: 0xffffff, map: t.v3Cells.texture, metalness: 0.35, roughness: 0.28, emissive: 0x2c3650, emissiveIntensity: 0.25, side: THREE.FrontSide }),
    v3CellsBack: new THREE.MeshStandardMaterial({ color: 0xd2d0c8, metalness: 0.15, roughness: 0.7 })
  };
  for (const material of Object.values(m)) if (material instanceof THREE.MeshStandardMaterial) inEarthShadow(material);
  return { textures: t, materials: m };
}

/**
 * How much direct sunlight reaches the vehicles: 1 in sunlight, 0 in the
 * Earth's shadow, in between at the edge. Set each frame by the component
 * that draws them. In space the Sun is the only strong light, so this makes
 * the night side dark but for the Earth's glow (the environment map), the
 * engines' own light and the scene's faint ambient.
 */
export const sunlight = { value: 1 };

// The scene's one directional light is the Sun and it lights the Earth too,
// so it can't be switched off for a vehicle in shadow: instead these
// materials scale their share of it.
function inEarthShadow(material: THREE.MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSunlight = sunlight;
    shader.fragmentShader =
      'uniform float uSunlight;\n' +
      shader.fragmentShader.replace(
        '#include <lights_fragment_begin>',
        THREE.ShaderChunk.lights_fragment_begin.replace(
          'getDirectionalLightInfo( directionalLight, directLight );',
          'getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= uSunlight;'
        )
      );
  };
}

export function vehicleMaterials() {
  cache ??= make();
  return cache.materials;
}

/** Metres covered by one repeat of each material's texture. */
export function textureSize(name: 'steel' | 'boosterSteel' | 'tiles' | 'lattice' | 'vents' | 'v3Cells' | 'v3Plate'): [number, number] {
  cache ??= make();
  return cache.textures[name].size;
}

/** Every material that should reflect the environment. */
export function reflectiveMaterials(): THREE.MeshStandardMaterial[] {
  const m = vehicleMaterials();
  return [m.steel, m.boosterSteel, m.tiles, m.tileEdge, m.vents, m.lattice, m.fin, m.bell, m.engineBay, m.v3Plate, m.v3Trim, m.v3Dish, m.v3Cells, m.v3CellsBack, m.v3Under];
}

/**
 * Rewrite a geometry's UVs so its texture repeats every `size` metres. For a
 * cylinder or lathe pass the arc it spans in metres (angle times radius): u
 * then follows its own UVs round the axis, seams included. For anything else
 * u follows x. v follows the height y, from `vOffset`.
 */
export function metreUVs(geo: THREE.BufferGeometry, size: [number, number], arcMetres = 0, vOffset = 0) {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const old = geo.getAttribute('uv') as THREE.BufferAttribute | undefined;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = arcMetres > 0 && old ? (old.getX(i) * arcMetres) / size[0] : pos.getX(i) / size[0];
    uv[i * 2 + 1] = (pos.getY(i) - vOffset) / size[1];
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}
