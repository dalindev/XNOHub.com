import type * as THREE from 'three';

// How the Earth's surface is lit, shared by the 3D tiles and the picture that
// sits under them, so the two always match.
//
// Sunlight comes from the scene's directional light as usual. The scene's
// other lights (a dim ambient, a fill light for the vehicles) know nothing
// about where the Sun is, so the ground ignores them and gets the light of
// its own sky instead: on wherever the Sun is up, fading out through
// twilight. That keeps shaded slopes from going black by day.
//
// The night side gets a little cool light, as on a moonlit night, so the
// continents can be made out under the city lights. It is lifted more in the
// dark tones than the bright ones (forest and sea show, deserts don't glow).

const SKY_LIGHT = /* glsl */ `
  #include <lights_fragment_end>
  #if NUM_DIR_LIGHTS > 0
    // Sine of the Sun's height above the horizon at this spot (on the smooth Earth, ignoring slopes).
    float sunHeight = dot(nonPerturbedNormal, directionalLights[0].direction);
    vec3 skyLit = diffuseColor.rgb * vec3(0.20, 0.24, 0.31) * smoothstep(-0.1, 0.3, sunHeight);
    vec3 moonLit = pow(diffuseColor.rgb, vec3(0.65)) * vec3(0.05, 0.066, 0.1);
    reflectedLight.indirectDiffuse = skyLit + moonLit;
  #endif
`;

/** Changes a built-in lit material (Lambert, Phong, Standard) to be lit as the Earth's surface. */
export function lightAsEarth<T extends THREE.Material>(material: T): T {
  const before = material.onBeforeCompile;
  const key = `earth-light|${material.customProgramCacheKey()}`;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>', SKY_LIGHT);
  };
  material.customProgramCacheKey = () => key;
  return material;
}
