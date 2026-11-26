import * as THREE from 'three';

/**
 * Materials for the structures at Starbase (towers, mounts, tanks,
 * buildings). All their colours are unpublished: placeholders, flagged in
 * components/data-sources.tsx.
 *
 * Lighting. The scene's one directional light is the Sun, which also lights
 * the Earth, so it can't be switched off at night: like the vehicles, these
 * materials scale their share of it by `siteLight.sunlight` (0 when the Sun is
 * below the pad's horizon). The scene's ambient and fill lights know nothing
 * about the Sun, so instead each surface gets its own sky: a fill from above
 * (the sky's colour by day, fading through twilight) and from below (light off
 * the ground), by how much it faces up, plus a faint moonlit floor so the
 * night is never pure black. The component that draws the site sets these
 * every frame; one shared uniform set keeps one compiled shader per material.
 */
export const siteLight = {
  sunlight: { value: 1 },
  /** Local up in view space (set every frame from the camera). */
  upView: { value: new THREE.Vector3(0, 1, 0) },
  sky: { value: new THREE.Color(0.2, 0.24, 0.31) },
  ground: { value: new THREE.Color(0.08, 0.075, 0.065) },
  /** The floor that is left at night (moonlight). */
  night: { value: new THREE.Color(0.05, 0.066, 0.1) }
};

const FILL = /* glsl */ `
  #include <lights_fragment_end>
  {
    float facingUp = dot(normal, uUpView) * 0.5 + 0.5;
    vec3 fill = mix(uGroundFill, uSkyFill, facingUp);
    reflectedLight.indirectDiffuse = diffuseColor.rgb * (fill + uNightFill * (0.6 + 0.4 * facingUp));
  }
`;

function lightAsSite<T extends THREE.MeshStandardMaterial>(material: T, key: string): T {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSunlight = siteLight.sunlight;
    shader.uniforms.uUpView = siteLight.upView;
    shader.uniforms.uSkyFill = siteLight.sky;
    shader.uniforms.uGroundFill = siteLight.ground;
    shader.uniforms.uNightFill = siteLight.night;
    shader.fragmentShader =
      'uniform float uSunlight;\nuniform vec3 uUpView;\nuniform vec3 uSkyFill;\nuniform vec3 uGroundFill;\nuniform vec3 uNightFill;\n' +
      shader.fragmentShader
        .replace(
          '#include <lights_fragment_begin>',
          THREE.ShaderChunk.lights_fragment_begin.replace(
            'getDirectionalLightInfo( directionalLight, directLight );',
            'getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= uSunlight;'
          )
        )
        .replace('#include <lights_fragment_end>', FILL);
  };
  material.customProgramCacheKey = () => `site-light|${key}`;
  material.fog = false;
  return material;
}

export type SiteMaterialName = 'lattice' | 'stainless' | 'paint' | 'building' | 'concrete' | 'dark' | 'water' | 'gravel';

let cache: Record<SiteMaterialName, THREE.MeshStandardMaterial> | null = null;

/** The site's materials (shared: build geometry per material and merge it). */
export function siteMaterials(): Record<SiteMaterialName, THREE.MeshStandardMaterial> {
  if (cache) return cache;
  const m = (name: SiteMaterialName, p: THREE.MeshStandardMaterialParameters) => lightAsSite(new THREE.MeshStandardMaterial({ name: `site-${name}`, ...p }), name);
  cache = {
    // Tower lattice, chopsticks, mount legs: weathered grey steel.
    lattice: m('lattice', { color: 0x62676c, metalness: 0.35, roughness: 0.65 }),
    // Steel cladding, the mount's deck plate, the ship arm, Starhopper: as the vehicles' steel.
    stainless: m('stainless', { color: 0xc7cbd0, metalness: 0.85, roughness: 0.35 }),
    // Painted tanks.
    paint: m('paint', { color: 0xe9e9e6, metalness: 0.1, roughness: 0.6 }),
    // Metal-clad buildings and bunkers.
    building: m('building', { color: 0x9a9ea0, metalness: 0.25, roughness: 0.7 }),
    concrete: m('concrete', { color: 0xb3aea4, metalness: 0, roughness: 0.9 }),
    // The trench's depths, soot.
    dark: m('dark', { color: 0x1d1d1c, metalness: 0, roughness: 0.95 }),
    water: m('water', { color: 0x3b4a46, metalness: 0.1, roughness: 0.15 }),
    gravel: m('gravel', { color: 0xa8a294, metalness: 0, roughness: 1 })
  };
  return cache;
}

/** Materials that reflect the sky (set their envMap from the site component). */
export const reflectiveSiteMaterials = () => {
  const s = siteMaterials();
  return [s.lattice, s.stainless, s.paint, s.building, s.water];
};
