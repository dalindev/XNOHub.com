import * as THREE from 'three';
import type { PlumeLook } from '@/lib/plume/look';
import { flameNoise } from '@/lib/plume/noise';
import { SUNLIT_WHITE } from '@/lib/world';

// One merged engine plume, drawn as a glowing gas: for each pixel the shader
// walks along the line of sight through the plume and adds up the light the
// gas gives off on the way (and, high up, the sunlight its frozen exhaust
// scatters). So it is see-through, brightest where the line of sight runs
// through most of it, with shock diamonds, a turbulent tail and soft edges,
// and no outline of its own.
//
// Its frame: metres, origin in the middle of the engines' exit plane, +Y
// toward the nose; the gas flows down -Y. Drawn inside a cone round it
// (convex, so a line of sight enters and leaves it once), from the outside
// when the camera is outside and from the inside when it is in it. Every
// position the shader works with is in this frame, close to the vehicle, so
// nothing loses precision to the scene's Earth-radius units.

const vertexShader = /* glsl */ `
  uniform vec2 uBound;  // cone radius at the exits (m), growth per metre
  uniform vec2 uZRange; // where it starts (m, above the exits) and ends, downstream
  varying vec3 vP;
  void main() {
    // A unit cylinder (y from 0.5 at the top to -0.5) stretched onto the cone.
    float s = 0.5 - position.y;
    float z = mix(uZRange.x, uZRange.y, s * s);
    float r = uBound.x + uBound.y * z;
    vP = vec3(position.x * r, -z, position.z * r);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(vP, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  precision highp sampler3D;
  uniform vec3 uEye;
  uniform vec3 uSunL;
  uniform float uInside;
  uniform int uSteps;
  uniform float uSW;
  uniform float uOn;
  uniform float uTime;
  uniform float uSunlit;
  uniform float uG;
  uniform float uSat;
  uniform vec4 uEnv;    // r0, a, p, length
  uniform vec2 uBound;
  uniform vec2 uZRange;
  uniform vec4 uAx;     // merge, core length, length, soft tail
  uniform vec4 uCellU;  // cell (m), nodes, gain, neck
  uniform vec4 uLvA;    // near, node, core, body
  uniform vec4 uLvB;    // fringe, tail, shell, collar
  uniform vec3 uColNear;
  uniform vec3 uColNode;
  uniform vec3 uColCore;
  uniform vec3 uColBody;
  uniform vec3 uColFringe;
  uniform vec3 uColTail;
  uniform vec3 uColShell;
  uniform vec3 uColCollar;
  uniform vec4 uGround; // up (in this frame), height of the exit plane above the ground; w < 0: no ground near
  uniform vec4 uTurb;   // amount, eddy size (m), flow (m/s), strands
  uniform vec3 uCut;    // gas reaches this far (m); and starts this far down (m) once the engines stop, fading
  uniform sampler3D uNoise;
  varying vec3 vP;

  float envR(float z) { return uEnv.x + uEnv.y * pow(max(z, 0.0), uEnv.z); }

  // Light given off or scattered toward the eye per metre (rgb), and how much
  // the frozen exhaust dims what is behind it per metre (a).
  vec4 emission(vec3 p, vec3 rd) {
    float z = -p.y;
    float rho = length(p.xz);
    // Shock diamonds: bright bands at (k + 0.5) cells, X-shaped lines between, the column narrowing at each.
    float phi = z / uCellU.x;
    float f = fract(phi);
    float cells = step(0.0, phi) * (1.0 - smoothstep(uCellU.y - 0.5, uCellU.y + 0.25, phi));
    float node = cells * exp(-pow((f - 0.5) / 0.07, 2.0)) * exp(-0.25 * floor(phi));
    float R = envR(z) * (1.0 - uCellU.w * node);
    // Turbulence, carried downstream with the gas.
    vec3 q = vec3(p.x, z - uTime * uTurb.z, p.z) / uTurb.y;
    float n = (texture(uNoise, q).r - 0.5) * 2.0 + (texture(uNoise, q * 2.03 + 0.37).r - 0.5);
    float tw = uTurb.x * smoothstep(0.15 * uAx.y, 0.8 * uAx.y, z);
    float rh = rho / (R * (1.0 + 0.25 * tw * n));
    float xl = cells * exp(-pow((rh - abs(1.0 - 2.0 * f)) / 0.06, 2.0)) * (1.0 - node);
    float strands = 1.0 + uTurb.w * sin(atan(p.x, p.z) * 11.0 + 3.0 * n);
    // Across the plume, each shape scaled so a line of sight through the axis sees its level.
    float core = exp(-pow(rh / 0.35, 2.0)) / 0.62;
    float soft = mix(0.1, uAx.w, clamp(z / uAx.z, 0.0, 1.0));
    float body = (1.0 - smoothstep(1.0 - soft, 1.0, rh)) / 1.75;
    float fringe = exp(-pow((rh - 0.95) / 0.18, 2.0)) / 0.7;
    float shell = (exp(-pow((rh - 0.85) / 0.2, 2.0)) + 0.15 * (1.0 - smoothstep(0.85, 1.1, rh))) / 0.65;
    // Nothing beyond 1.3 radii, well inside the cone it is drawn in, so the cone never shows.
    float win = 1.0 - smoothstep(1.05, 1.3, rh);
    // Along it.
    float start = smoothstep(0.0, max(uAx.x, 0.01), z);
    float coreW = 1.0 - smoothstep(0.6 * uAx.y, uAx.y, z);
    float tailW = smoothstep(0.5 * uAx.y, uAx.y, z) * (1.0 - smoothstep(uAx.y, uAx.z, z));
    float endW = 1.0 - smoothstep(0.65 * uAx.z, uAx.z, z);
    float nearW = step(0.0, z) * (1.0 - smoothstep(0.0, 4.5, z));
    float dia = 1.0 + uCellU.z * (node + 0.35 * xl - 0.35 * cells * (1.0 - node));
    vec3 e = uColNear * uLvA.x * nearW * (core + 0.5 * body)
           + mix(uColCore, uColNode, node) * uLvA.z * dia * coreW * core * start
           + uColBody * uLvA.w * dia * body * start * (1.0 - 0.6 * tailW) * strands * endW
           + uColFringe * uLvB.x * fringe * smoothstep(4.5, 45.0, z) * start * endW
           + uColTail * uLvB.y * tailW * (body + 0.5 * fringe) * (1.0 + tw * n);
    // Sunlight scattered by frozen exhaust (Henyey-Greenstein, 1 when scattering evenly).
    float c = dot(rd, uSunL);
    float hg = (1.0 - uG * uG) / pow(1.0 + uG * uG - 2.0 * uG * c, 1.5);
    float frost = shell * (1.0 + 0.6 * tw * n) * endW * smoothstep(0.0, 20.0, z);
    e += uColShell * uLvB.z * uSunlit * hg * frost;
    // The orange collar round the hanging engines at liftoff, outside the hull's line.
    e += uColCollar * uLvB.w * exp(-pow((rho - 4.7) / 0.6, 2.0)) * smoothstep(-3.6, -2.5, z) * (1.0 - smoothstep(-0.5, 0.0, z));
    e *= win;
    // Soft where it meets the ground; not yet reached by the gas after
    // ignition; detached from the nozzles after cutoff.
    float gas = (1.0 - smoothstep(uCut.x - 10.0, uCut.x, z)) * smoothstep(uCut.y, uCut.y + 10.0, z) * uCut.z;
    if (uGround.w >= 0.0) gas *= smoothstep(0.0, 2.0, dot(uGround.xyz, p) + uGround.w);
    // A thin cloud that scatters a share s of sunlight (evenly) toward the eye
    // has optical depth 4s: the shell's level, read as a cloud.
    return vec4(e * gas, 4.0 * uLvB.z * frost * win * gas) / max(R, 0.5);
  }

  // Where a line of sight that enters the cone at ro leaves it: the farthest
  // crossing of its surface (the cone is convex, so the only other one is ro
  // itself, which rounding can put a little either side of 0).
  float coneExit(vec3 ro, vec3 rd) {
    float best = 0.0;
    float c0 = uBound.x - uBound.y * ro.y;
    float k = uBound.y * rd.y;
    float a = dot(rd.xz, rd.xz) - k * k;
    float b = 2.0 * (dot(ro.xz, rd.xz) + c0 * k);
    float c = dot(ro.xz, ro.xz) - c0 * c0;
    float disc = b * b - 4.0 * a * c;
    if (disc >= 0.0 && abs(a) > 1e-9) {
      float s = sqrt(disc);
      for (int i = 0; i < 2; i++) {
        float t = (-b + (i == 0 ? -s : s)) / (2.0 * a);
        float z = -(ro.y + rd.y * t);
        if (z >= uZRange.x && z <= uZRange.y && c0 - k * t >= 0.0) best = max(best, t);
      }
    }
    if (abs(rd.y) > 1e-6) {
      for (int i = 0; i < 2; i++) {
        float zc = i == 0 ? uZRange.x : uZRange.y;
        float t = (-zc - ro.y) / rd.y;
        vec2 xz = ro.xz + rd.xz * t;
        float r = uBound.x + uBound.y * zc;
        if (dot(xz, xz) <= r * r * 1.0001) best = max(best, t);
      }
    }
    return best;
  }

  void main() {
    if ((uInside > 0.5) == gl_FrontFacing) discard;
    vec3 rd = normalize(vP - uEye);
    // From the camera when it is inside; from where the line of sight enters
    // the cone when it is outside (the camera can be kilometres away: solving
    // from there would lose the plume to rounding).
    vec3 ro = uInside > 0.5 ? uEye : vP;
    float t0 = 0.0;
    float t1 = uInside > 0.5 ? dot(vP - uEye, rd) : coneExit(vP, rd);
    if (uGround.w >= 0.0) {
      float down = dot(uGround.xyz, rd);
      if (down < -1e-6) t1 = min(t1, -(dot(uGround.xyz, ro) + uGround.w) / down);
    }
    // Start each pixel's walk a little differently, so the steps don't show as bands.
    float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    vec3 L = vec3(0.0);
    float through = 1.0; // how much of what is behind still shows
    float t = t0;
    for (int i = 0; i < 64; i++) {
      if (i >= uSteps || t >= t1) break;
      float z = -(ro.y + rd.y * t);
      // Steps a fifth of the plume's radius, so a line of sight across it takes ten or so.
      float dt = clamp(0.2 * envR(z), 0.25, 40.0);
      // Finer through the diamonds.
      if (z < uCellU.y * uCellU.x && abs(fract(z / uCellU.x) - 0.5) * uCellU.x < 4.0) dt = min(dt, 1.0);
      float h = min(dt, t1 - t);
      vec4 em = emission(ro + rd * (t + j * h), rd);
      L += em.rgb * through * h;
      through *= exp(-em.a * h);
      t += h;
    }
    if (t < t1) {
      vec4 em = emission(ro + rd * 0.5 * (t + t1), rd);
      L += em.rgb * through * (t1 - t);
      through *= exp(-em.a * (t1 - t));
    }
    // The thick of it is not see-through: brightness levels off rather than piling up end-on.
    L = uSat * (1.0 - exp(-L / uSat));
    gl_FragColor = vec4(L * uSW * uOn, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    // Premultiplied: the glow adds to what is behind, which the frost partly
    // hides. And the brighter the glow on screen, the less of the background
    // adds to it: the sky behind is already on screen at its own brightness,
    // and adding two tone-mapped values lands far brighter (whiter) than
    // tone-mapping their sum, as a camera does. Screening by the glow's own
    // brightness comes close to that.
    float glow = clamp(dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
    gl_FragColor.a = 1.0 - (1.0 - (1.0 - through) * uOn) * (1.0 - glow);
  }
`;

export interface PlumeFrame {
  look: PlumeLook;
  camera: THREE.Camera;
  /** Seconds, for the turbulence (frozen for repeatable shots). */
  time: number;
  /** Unit vector to the Sun (scene frame) and how much of its light reaches here (0..1). */
  sunDirection: THREE.Vector3;
  sunlit: number;
  /** A point on the ground under the plume and the up direction there (scene frame), when it is near; else null. */
  ground: { point: THREE.Vector3; up: THREE.Vector3 } | null;
  /** How far the gas has got since the engines lit (m), and, once they stop, how far down its end has moved (m; 0 while they burn). */
  reach: number;
  cutoff: number;
}

export interface Plume {
  mesh: THREE.Mesh;
  update(f: PlumeFrame): void;
  dispose(): void;
}

/** Steps along each line of sight: fewer on a phone. */
export const plumeSteps = () => (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches ? 24 : 64);

export function makePlume(): Plume {
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 28, 10, false);
  const u = {
    uEye: { value: new THREE.Vector3() },
    uSunL: { value: new THREE.Vector3(0, 1, 0) },
    uInside: { value: 0 },
    uSteps: { value: plumeSteps() },
    uSW: { value: SUNLIT_WHITE },
    uOn: { value: 0 },
    uTime: { value: 0 },
    uSunlit: { value: 1 },
    uG: { value: 0.4 },
    uSat: { value: 3 },
    uEnv: { value: new THREE.Vector4() },
    uBound: { value: new THREE.Vector2(5, 0.1) },
    uZRange: { value: new THREE.Vector2(-4, 240) },
    uAx: { value: new THREE.Vector4() },
    uCellU: { value: new THREE.Vector4() },
    uLvA: { value: new THREE.Vector4() },
    uLvB: { value: new THREE.Vector4() },
    uColNear: { value: new THREE.Color() },
    uColNode: { value: new THREE.Color() },
    uColCore: { value: new THREE.Color() },
    uColBody: { value: new THREE.Color() },
    uColFringe: { value: new THREE.Color() },
    uColTail: { value: new THREE.Color() },
    uColShell: { value: new THREE.Color() },
    uColCollar: { value: new THREE.Color() },
    uGround: { value: new THREE.Vector4(0, 1, 0, -1) },
    uTurb: { value: new THREE.Vector4() },
    uCut: { value: new THREE.Vector3(1e6, -1e6, 1) },
    uNoise: { value: flameNoise() }
  };
  const material = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader,
    fragmentShader,
    // Premultiplied alpha: light adds, and the alpha (the frost's cover) dims the background.
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  mesh.visible = false;

  const inv = new THREE.Matrix4();
  const tmp = new THREE.Vector3();
  const up = new THREE.Vector3();

  return {
    mesh,
    update(f) {
      const k = f.look;
      mesh.visible = k.on > 0.001 && f.reach > 1 && f.cutoff < k.length;
      if (!mesh.visible) return;
      mesh.updateWorldMatrix(true, false);
      inv.copy(mesh.matrixWorld).invert();
      u.uEye.value.copy(f.camera.position).applyMatrix4(inv);
      u.uSunL.value.copy(f.sunDirection).transformDirection(inv);
      u.uSunlit.value = f.sunlit;
      u.uTime.value = f.time;
      u.uOn.value = Math.min(1, k.on);
      u.uEnv.value.set(k.r0, k.a, k.p, k.length);
      u.uAx.value.set(k.merge, k.coreLength, k.length, k.softTail);
      u.uCellU.value.set(k.cell, k.nodes, k.gain, k.neck);
      // The look's core is the brightness on the axis; the body already gives part of it.
      u.uLvA.value.set(k.near, k.node, Math.max(k.core - k.body, 0), k.body);
      u.uLvB.value.set(k.fringe, k.tail, k.shell, k.collar);
      u.uColNear.value.copy(k.colNear);
      u.uColNode.value.copy(k.colNode);
      u.uColCore.value.copy(k.colCore);
      u.uColBody.value.copy(k.colBody);
      u.uColFringe.value.copy(k.colFringe);
      u.uColTail.value.copy(k.colTail);
      u.uColShell.value.copy(k.colShell);
      u.uColCollar.value.copy(k.colCollar);
      u.uTurb.value.set(k.turbulence, k.eddy, k.flow, k.strands);
      // While the engines burn (no cutoff yet) the gas starts at the nozzles: nothing is faded in below them.
      const burning = !(f.cutoff > 0);
      u.uCut.value.set(f.reach, burning ? -1e6 : f.cutoff, burning ? 1 : 1 - THREE.MathUtils.smoothstep(f.cutoff, 0, 400));

      // The cone round it: tangent to its (turbulent) edge partway down, so the
      // edge stays inside; wide enough at the top for the collar.
      const top = k.collar > 0.001 ? -4 : -0.5;
      const edge = (z: number) => 1.6 * (k.r0 + k.a * Math.pow(Math.max(z, 0), k.p)) + 0.5;
      const zt = Math.max(1, 0.3 * k.length);
      const slope = (edge(zt * 1.001) - edge(zt)) / (zt * 0.001);
      let r0 = edge(zt) - slope * zt;
      const atTop = r0 + slope * top;
      const needTop = Math.max(k.collar > 0.001 ? 5.6 : 0, edge(0));
      if (atTop < needTop) r0 += needTop - atTop;
      u.uBound.value.set(r0, slope);
      u.uZRange.value.set(top, k.length);

      // Inside it? (A metre's margin, so the near plane can't cut its surface.)
      const e = u.uEye.value;
      const ze = -e.y;
      u.uInside.value = ze > top - 1 && ze < k.length + 1 && Math.hypot(e.x, e.z) < r0 + slope * THREE.MathUtils.clamp(ze, top, k.length) + 1 ? 1 : 0;

      if (f.ground) {
        up.copy(f.ground.up).transformDirection(inv);
        tmp.copy(f.ground.point).applyMatrix4(inv);
        u.uGround.value.set(up.x, up.y, up.z, -up.dot(tmp));
        if (u.uGround.value.w < 0) u.uGround.value.w = 0;
      } else u.uGround.value.w = -1;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    }
  };
}
