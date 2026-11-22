import * as THREE from 'three';

// Streaks of light with a bright head and a fading tail (meteors, dust going
// past a satellite). Each is one quad stretched from tail to head on screen,
// a few pixels wide however far away it is, so a thing that is really a metre
// across can still be seen. Additive.

const vertex = /* glsl */ `
  attribute vec3 aHead;
  attribute vec3 aTail;
  attribute vec3 aHeadColor;
  attribute vec3 aTailColor;
  attribute vec2 aLook; // opacity, width in pixels
  uniform vec2 uResolution;
  uniform float uNear;
  varying vec3 vPx; // pixels along from the tail point, pixels across, half-width in pixels
  varying float vLength; // tail point to head point, pixels
  varying vec3 vHeadColor;
  varying vec3 vTailColor;
  varying float vOpacity;
  void main() {
    vPx = vec3(0.0);
    vLength = 0.0;
    vHeadColor = aHeadColor;
    vTailColor = aTailColor;
    vOpacity = aLook.x;
    vec3 h = (modelViewMatrix * vec4(aHead, 1.0)).xyz;
    vec3 t = (modelViewMatrix * vec4(aTail, 1.0)).xyz;
    // Cut the part behind the camera off (a streak going past the viewer).
    float limit = -uNear * 1.01;
    if (aLook.x <= 0.0 || (h.z > limit && t.z > limit)) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }
    if (h.z > limit) h = mix(t, h, (limit - t.z) / (h.z - t.z));
    if (t.z > limit) t = mix(h, t, (limit - h.z) / (t.z - h.z));
    vec4 hc = projectionMatrix * vec4(h, 1.0);
    vec4 tc = projectionMatrix * vec4(t, 1.0);
    vec2 along = (hc.xy / hc.w - tc.xy / tc.w) * uResolution * 0.5;
    vLength = length(along);
    along = vLength > 1e-4 ? along / vLength : vec2(1.0, 0.0);
    // The quad reaches one half-width past each end, which leaves room for a round head.
    vPx = vec3(position.x * (vLength + 2.0 * aLook.y) - aLook.y, position.y * aLook.y, aLook.y);
    vec2 across = vec2(-along.y, along.x);
    vec4 p = mix(tc, hc, position.x);
    vec2 px = across * position.y * aLook.y + along * (position.x * 2.0 - 1.0) * aLook.y;
    p.xy += px / uResolution * 2.0 * p.w;
    gl_Position = p;
  }
`;

// A teardrop: a round glowing head, and a tail that narrows and fades behind it.
const fragment = /* glsl */ `
  varying vec3 vPx;
  varying float vLength;
  varying vec3 vHeadColor;
  varying vec3 vTailColor;
  varying float vOpacity;
  void main() {
    float w = max(vPx.z, 1e-3);
    float u = clamp(vPx.x / max(vLength, 1e-3), 0.0, 1.0); // 0 at the tail, 1 at the head
    vec2 fromHead = vec2(vPx.x - vLength, vPx.y) / w;
    float d2 = dot(fromHead, fromHead);
    float halfWidth = w * mix(0.3, 1.0, u);
    float edge = clamp(1.0 - vPx.y * vPx.y / (halfWidth * halfWidth), 0.0, 1.0);
    // Behind the head: the tail. Past it: the same profile turned round the head, so the end is round.
    float body = vPx.x <= vLength ? pow(u, 1.6) * pow(edge, 1.4) : pow(clamp(1.0 - d2, 0.0, 1.0), 1.4);
    float head = exp(-d2 * 3.0);
    float a = vOpacity * (body * 1.1 + head * 1.3);
    vec3 color = mix(vTailColor, vHeadColor, pow(u, 3.0));
    gl_FragColor = vec4(color * a, a);
  }
`;

export class Streaks {
  readonly mesh: THREE.Mesh;
  private head: THREE.InstancedBufferAttribute;
  private tail: THREE.InstancedBufferAttribute;
  private headColor: THREE.InstancedBufferAttribute;
  private tailColor: THREE.InstancedBufferAttribute;
  private look: THREE.InstancedBufferAttribute;
  private material: THREE.ShaderMaterial;

  constructor(readonly max: number) {
    const g = new THREE.InstancedBufferGeometry();
    // x: 0 at the tail, 1 at the head; y: -1 to 1 across.
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const attr = (name: string, size: number) => {
      const a = new THREE.InstancedBufferAttribute(new Float32Array(max * size), size);
      a.setUsage(THREE.DynamicDrawUsage);
      g.setAttribute(name, a);
      return a;
    };
    this.head = attr('aHead', 3);
    this.tail = attr('aTail', 3);
    this.headColor = attr('aHeadColor', 3);
    this.tailColor = attr('aTailColor', 3);
    this.look = attr('aLook', 2);
    g.instanceCount = max;
    this.material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: { uResolution: { value: new THREE.Vector2(1, 1) }, uNear: { value: 0.1 } },
      transparent: true,
      // Not depth-tested: callers only make streaks where nothing is in front of them
      // (the near side of the Earth, the space round the camera).
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      premultipliedAlpha: true,
      side: THREE.DoubleSide
    });
    this.mesh = new THREE.Mesh(g, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
  }

  set(i: number, head: THREE.Vector3, tail: THREE.Vector3, headColor: THREE.Color, tailColor: THREE.Color, opacity: number, widthPx: number) {
    this.head.setXYZ(i, head.x, head.y, head.z);
    this.tail.setXYZ(i, tail.x, tail.y, tail.z);
    this.headColor.setXYZ(i, headColor.r, headColor.g, headColor.b);
    this.tailColor.setXYZ(i, tailColor.r, tailColor.g, tailColor.b);
    this.look.setXY(i, opacity, widthPx);
  }

  hide(i: number) {
    this.look.setXY(i, 0, 0);
  }

  /** Call once a frame after the streaks are set. */
  commit(renderer: THREE.WebGLRenderer, camera: THREE.Camera) {
    renderer.getDrawingBufferSize(this.material.uniforms.uResolution.value);
    this.material.uniforms.uNear.value = (camera as THREE.PerspectiveCamera).near;
    for (const a of [this.head, this.tail, this.headColor, this.tailColor, this.look]) a.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
