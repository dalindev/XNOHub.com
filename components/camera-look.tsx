'use client';

import { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { EYE_LOOK, world } from '@/lib/world';
import { LOOK, adapt, exposureFor, litFor, starGainFor } from '@/lib/camera-look';

// The Starship view as the webcast's cameras see it: exposed for sunlight (lit
// steel goes toward white, shadows stay dark), only the brightest stars at
// night and no Milky Way, the Sun blown out with a glow round it, and a grade
// (deeper blacks, a little contrast and colour). Mounted only in the Starship
// view; everywhere else R3F renders exactly as before.
//
// How: this takes over R3F's render (useFrame with priority 1) and renders the
// scene into a half-float buffer that three treats as the screen (an "XR"
// target: the same tone mapping and output colours as the canvas, so no
// material recompiles), with headroom above white for the Sun and the flames'
// cores. Bloom works on that image, and one last pass grades it onto the
// canvas. Where float buffers or multisampling aren't there, it renders
// straight to the canvas instead, keeping the exposure, the star rules and
// the Sun's painted glare.
//
// No other useFrame may use a priority above 0: that too would stop R3F's own
// render, and change the order.

const finishVertex = /* glsl */ `
  precision highp float;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  attribute vec3 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// The bloom's glow added on, then the grade in display space: black point, a
// mild S-curve (fixed ends, slope 0.85 at the ends, 1.075 at mid-grey),
// saturation; then a dither so the half-float buffer and the sky's gradients
// don't band on 8-bit screens (the sky dome skips its own on this path).
// (0, 0, 1) is no grade.
const finishFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D tScene;
  uniform sampler2D tGlow;
  uniform float uGlow;
  uniform float uBlack;
  uniform float uContrast;
  uniform float uSaturation;
  varying vec2 vUv;
  void main() {
    vec3 c = min(texture2D(tScene, vUv).rgb + uGlow * texture2D(tGlow, vUv).rgb, 1.0);
    c = max(c - uBlack, 0.0) / (1.0 - uBlack);
    c -= uContrast * c * (1.0 - c) * (1.0 - 2.0 * c);
    float y = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = clamp(y + uSaturation * (c - y), 0.0, 1.0);
    c += (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
    gl_FragColor = vec4(c, 1.0);
  }
`;

type Path = 'film' | 'direct';
type Grade = [black: number, contrast: number, saturation: number];

/**
 * Most samples the film buffer may use (up to 4), or 0 to render straight to
 * the canvas: it needs float colour buffers that multisample (WebGL 2), and
 * not the Oculus browser, where three drops the multisampled image after each
 * resolve.
 */
function filmSamples(gl: THREE.WebGLRenderer) {
  if (/OculusBrowser/.test(navigator.userAgent)) return 0;
  const ctx = gl.getContext();
  if (ctx.isContextLost()) return 0;
  if (!gl.extensions.has('EXT_color_buffer_float') && !gl.extensions.has('EXT_color_buffer_half_float')) return 0;
  if (typeof WebGL2RenderingContext === 'undefined' || !(ctx instanceof WebGL2RenderingContext)) return 0;
  const counts = ctx.getInternalformatParameter(ctx.RENDERBUFFER, ctx.RGBA16F, ctx.SAMPLES) as Int32Array | null;
  if (!counts || counts.length === 0) return 0;
  return Math.min(4, Math.max(...counts));
}

/**
 * UnrealBloomPass (three r187) without its last step: the glow stays in its
 * own small texture (`glow`) for the finish pass to add, instead of being
 * blended into the multisampled film, which costs a full-size multisampled
 * blend and a second resolve every frame. The steps are r187's render(),
 * minus that blend; check them after a three upgrade.
 */
class GlowPass extends UnrealBloomPass {
  private quad = new FullScreenQuad();
  private oldClear = new THREE.Color();
  get glow() {
    return this.renderTargetsHorizontal[0].texture;
  }
  render(renderer: THREE.WebGLRenderer, _write: THREE.WebGLRenderTarget | null, read: THREE.WebGLRenderTarget) {
    renderer.getClearColor(this.oldClear);
    const clearAlpha = renderer.getClearAlpha();
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setClearColor(this.clearColor, 0);
    // The bright parts.
    const high = this.highPassUniforms as Record<string, THREE.IUniform>;
    high.tDiffuse.value = read.texture;
    high.luminosityThreshold.value = this.threshold;
    this.quad.material = this.materialHighPassFilter;
    renderer.setRenderTarget(this.renderTargetBright);
    renderer.clear();
    this.quad.render(renderer);
    // Blurred at each size.
    const dirs = UnrealBloomPass as unknown as { BlurDirectionX: THREE.Vector2; BlurDirectionY: THREE.Vector2 };
    let input = this.renderTargetBright;
    for (let i = 0; i < this.nMips; i++) {
      const blur = this.separableBlurMaterials[i] as THREE.ShaderMaterial;
      this.quad.material = blur;
      blur.uniforms.colorTexture.value = input.texture;
      blur.uniforms.direction.value = dirs.BlurDirectionX;
      renderer.setRenderTarget(this.renderTargetsHorizontal[i]);
      renderer.clear();
      this.quad.render(renderer);
      blur.uniforms.colorTexture.value = this.renderTargetsHorizontal[i].texture;
      blur.uniforms.direction.value = dirs.BlurDirectionY;
      renderer.setRenderTarget(this.renderTargetsVertical[i]);
      renderer.clear();
      this.quad.render(renderer);
      input = this.renderTargetsVertical[i];
    }
    // All sizes together, into renderTargetsHorizontal[0].
    const composite = this.compositeMaterial as THREE.ShaderMaterial;
    this.quad.material = composite;
    composite.uniforms.bloomStrength.value = this.strength;
    composite.uniforms.bloomRadius.value = this.radius;
    composite.uniforms.bloomTintColors.value = this.bloomTintColors;
    renderer.setRenderTarget(this.renderTargetsHorizontal[0]);
    renderer.clear();
    this.quad.render(renderer);
    renderer.setClearColor(this.oldClear, clearAlpha);
    renderer.autoClear = autoClear;
  }
  dispose() {
    super.dispose();
    this.quad.dispose();
  }
}

/** Samples for a film of `pixels`: 4 up to about a 1080p frame (the look's cap), 2 above it (only reached at the lowest pixel ratio). */
const samplesFor = (pixels: number, most: number) => Math.min(most, pixels <= LOOK.maxPixels * 1.1 ? 4 : 2);

function makeFilm(most: number) {
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    colorSpace: THREE.SRGBColorSpace,
    samples: most,
    depthBuffer: true,
    stencilBuffer: false,
    resolveDepthBuffer: false,
    // Float depth: reversed-Z gains nothing in the canvas's 24-bit buffer. (The
    // texture itself is never drawn into or read: it is how three is told to
    // make the multisampled depth buffer 32-bit float.)
    depthTexture: new THREE.DepthTexture(1, 1, THREE.FloatType)
  });
  // three r187 renders into an XR target exactly as into the canvas: tone
  // mapping stays on, the output is in the target's colour space (sRGB), and
  // fog and background colours are sRGB (WebGLRenderer.js:2405 and 2418,
  // WebGLPrograms.js:183 and 217, UniformsUtils.js:140). So every material
  // keeps its canvas program and the buffer holds the canvas's image. An
  // internal flag (three #23278): the eye A/B check, __xno.look.ab(), must
  // stay under 1.5/255 after a three upgrade.
  (target as unknown as { isXRRenderTarget: boolean }).isXRRenderTarget = true;
  const bloom = new GlowPass(new THREE.Vector2(1, 1), LOOK.bloom.strength, LOOK.bloom.radius, LOOK.bloom.threshold);
  (bloom.highPassUniforms as Record<string, THREE.IUniform>).smoothWidth.value = LOOK.bloom.knee;
  const finish = new THREE.RawShaderMaterial({
    name: 'camera-look-finish',
    vertexShader: finishVertex,
    fragmentShader: finishFragment,
    uniforms: {
      tScene: { value: target.texture },
      tGlow: { value: bloom.glow },
      uGlow: { value: 1 },
      uBlack: { value: LOOK.black },
      uContrast: { value: LOOK.contrast },
      uSaturation: { value: LOOK.saturation }
    },
    depthTest: false,
    depthWrite: false
  });
  const quad = new FullScreenQuad(finish);
  return {
    target,
    bloom,
    finish,
    quad,
    most,
    samples: most,
    size: new THREE.Vector2(),
    bloomSize: new THREE.Vector2(),
    checked: false,
    dispose() {
      target.dispose();
      bloom.dispose();
      finish.dispose();
      quad.dispose();
      this.size.set(0, 0);
      this.checked = false;
    }
  };
}

type Film = ReturnType<typeof makeFilm>;

export function CameraLook() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  const look = useMemo(() => {
    const samples = filmSamples(gl);
    return {
      film: samples > 0 ? makeFilm(samples) : (null as Film | null),
      /** The path in use; 'direct' for good once the film buffer fails. */
      path: (samples > 0 ? 'film' : 'direct') as Path,
      /** Dev overrides: eye look, fixed exposure, bloom strength, grade. */
      eye: false,
      exposure: null as number | null,
      bloom: LOOK.bloom.strength,
      grade: [LOOK.black, LOOK.contrast, LOOK.saturation] as Grade,
      // `first`: frames left to snap (a cut snaps twice: the sky light the meter reads lags the camera by a frame).
      meter: { night: 0, lit: 1, exposure: LOOK.exposureDay, fov: 0, first: 1 },
      buffer: new THREE.Vector2(),
      warned: false
    };
  }, [gl]);

  const lookValues = (path: Path) =>
    look.eye
      ? { ...EYE_LOOK }
      : { on: true, starGain: 0, magLimit: LOOK.magLimit, sunDisc: path === 'film' ? LOOK.sunDisc : 1, sunGlare: path === 'film' ? 0 : 1, skyDither: path === 'film' ? 0 : 1 };

  // Before the first frame: no flash of the Milky Way or the daytime stars.
  useLayoutEffect(() => {
    world.look = lookValues(look.path);
    const autoReset = gl.info.autoReset;
    gl.info.autoReset = false; // several renders a frame: count them all
    // A lost context loses the film's buffers; three rebuilds them once it is
    // back, but a film never made (lost at mount) is made then.
    const restored = () => {
      if (look.film) look.film.checked = false;
      else if (!look.warned) {
        const most = filmSamples(gl);
        if (most > 0) {
          look.film = makeFilm(most);
          look.path = 'film';
          world.look = lookValues('film');
        }
      }
    };
    gl.domElement.addEventListener('webglcontextrestored', restored);
    return () => {
      gl.domElement.removeEventListener('webglcontextrestored', restored);
      world.look = { ...EYE_LOOK };
      gl.info.autoReset = autoReset;
      look.film?.dispose();
      look.meter.first = 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, look]);

  /** Size the film to the drawing buffer; the bloom to at most 1440 device px tall at dpr 1 (720 at dpr 2). */
  const fit = (film: Film) => {
    const size = gl.getDrawingBufferSize(look.buffer);
    if (size.equals(film.size)) return;
    film.size.copy(size);
    const samples = samplesFor(size.x * size.y, film.most);
    if (samples !== film.samples) {
      // three makes the buffers again, with the new count, on next use.
      film.target.dispose();
      film.target.samples = film.samples = samples;
    }
    film.target.setSize(size.x, size.y);
    const k = Math.min(1, LOOK.bloom.maxHeightAtDpr1 / (gl.getPixelRatio() * size.y));
    film.bloomSize.set(Math.max(1, Math.round(size.x * k)), Math.max(1, Math.round(size.y * k)));
    film.bloom.setSize(film.bloomSize.x, film.bloomSize.y);
    film.checked = false;
  };

  const fail = (why: string) => {
    look.film?.dispose();
    look.film = null;
    look.path = 'direct';
    world.look = lookValues('direct');
    if (!look.warned) console.warn(`camera look: ${why}; rendering straight to the canvas`);
    look.warned = true;
  };

  /** One frame through `path`, at exposure `e`. */
  const draw = (path: Path, e: number, delta: number, bloom = look.bloom, grade = look.grade) => {
    const prev = gl.toneMappingExposure;
    const film = look.film;
    const ctx = gl.getContext();
    // Nothing draws while the context is lost; don't take that for a broken film buffer.
    if (ctx.isContextLost()) return;
    if (path === 'film' && film) {
      fit(film);
      gl.setRenderTarget(film.target);
      if (!film.checked) {
        film.checked = true;
        if (ctx.checkFramebufferStatus(ctx.FRAMEBUFFER) !== ctx.FRAMEBUFFER_COMPLETE) {
          gl.setRenderTarget(null);
          fail('the film buffer is incomplete');
          return draw('direct', e, delta);
        }
      }
      gl.toneMappingExposure = e;
      gl.render(scene, camera);
      gl.toneMappingExposure = prev;
      if (bloom > 0) {
        film.bloom.strength = bloom;
        film.bloom.render(gl, null, film.target);
      }
      const u = film.finish.uniforms;
      u.uGlow.value = bloom > 0 ? 1 : 0;
      u.uBlack.value = grade[0];
      u.uContrast.value = grade[1];
      u.uSaturation.value = grade[2];
      gl.setRenderTarget(null);
      film.quad.render(gl);
    } else {
      gl.setRenderTarget(null);
      gl.toneMappingExposure = e;
      gl.render(scene, camera);
      gl.toneMappingExposure = prev;
    }
  };

  useFrame((_, delta) => {
    gl.info.reset();
    // Meter: exposed for sunlight when the camera or the sky round it is lit,
    // opened up at night. Snaps on camera cuts (each camera has its own lens),
    // the first frame and after a pause, so cuts don't fade.
    const m = look.meter;
    m.lit = litFor(camera.position, world.sunDirection, world.skyLight);
    const snap = m.first > 0 || camera.fov !== m.fov;
    m.night = snap ? 1 - m.lit : adapt(m.night, 1 - m.lit, delta);
    m.first = Math.max(0, m.first - 1);
    m.fov = camera.fov;
    m.exposure = look.eye ? 1 : look.exposure ?? exposureFor(m.night);
    if (!look.eye) world.look.starGain = starGainFor(m.night);
    draw(look.eye ? 'direct' : look.path, m.exposure, delta);
  }, 1);

  // Dev: __xno.look reads back and steers the look, and checks it.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const w = window as unknown as { __xno?: Record<string, unknown> };
    const ctx = gl.getContext() as WebGL2RenderingContext;
    let alive = true;
    const frames = (n: number) => new Promise<void>((done) => {
      const step = () => (n-- <= 0 ? done() : requestAnimationFrame(step));
      requestAnimationFrame(step);
    });
    const read = (x = 0, y = 0, width = ctx.drawingBufferWidth, height = ctx.drawingBufferHeight) => {
      const px = new Uint8Array(width * height * 4);
      ctx.readPixels(x, y, width, height, ctx.RGBA, ctx.UNSIGNED_BYTE, px);
      return px;
    };
    const sunPx = () => {
      const p = new THREE.Vector3().copy(world.sunDirection).multiplyScalar(400).add(camera.position).project(camera);
      if (p.z > 1 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1) return null;
      return [Math.round((p.x * 0.5 + 0.5) * ctx.drawingBufferWidth), Math.round((p.y * 0.5 + 0.5) * ctx.drawingBufferHeight)];
    };
    const api = {
      /** A camera cut: the exposure jumps to the new view on the next frame instead of easing in. */
      cut: () => void (look.meter.first = 2),
      state: () => ({
        path: look.eye ? 'eye' : look.path,
        samples: look.film?.samples ?? 0,
        exposure: look.meter.exposure,
        night: look.meter.night,
        lit: look.meter.lit,
        starGain: world.look.starGain,
        sunPx: sunPx(),
        size: look.film ? look.film.size.toArray() : null,
        bloomSize: look.film ? look.film.bloomSize.toArray() : null
      }),
      /** path: 'film' | 'direct' | 'eye' (the view as before the look); exposure, bloom: null for the look's own. */
      set: (o: { path?: Path | 'eye'; exposure?: number | null; bloom?: number | null; grade?: Grade | null }) => {
        if (o.path === 'eye') look.eye = true;
        else if (o.path) {
          look.eye = false;
          if (o.path === 'film' && !look.film) return 'no film buffer';
          look.path = o.path;
        }
        if (o.exposure !== undefined) look.exposure = o.exposure;
        if (o.bloom !== undefined) look.bloom = o.bloom ?? LOOK.bloom.strength;
        if (o.grade !== undefined) look.grade = o.grade ?? [LOOK.black, LOOK.contrast, LOOK.saturation];
        world.look = lookValues(look.path);
        look.meter.first = 2;
        return api.state();
      },
      /** What the film buffer really is: bits per channel, depth bits, samples, reversed depth. */
      formats: () => {
        const film = look.film;
        if (!film) return null;
        gl.setRenderTarget(film.target);
        const f = {
          redSize: ctx.getFramebufferAttachmentParameter(ctx.FRAMEBUFFER, ctx.COLOR_ATTACHMENT0, ctx.FRAMEBUFFER_ATTACHMENT_RED_SIZE),
          depthSize: ctx.getFramebufferAttachmentParameter(ctx.FRAMEBUFFER, ctx.DEPTH_ATTACHMENT, ctx.FRAMEBUFFER_ATTACHMENT_DEPTH_SIZE),
          samples: ctx.getParameter(ctx.SAMPLES),
          reversed: gl.state.buffers.depth.getReversed()
        };
        gl.setRenderTarget(null);
        return f;
      },
      /** The film path at identity (exposure 1, no bloom, no grade) against the canvas, eye look: mean and max difference, 0-255. */
      ab: async () => {
        if (!look.film) return null;
        const was = { eye: look.eye, look: world.look };
        look.eye = true;
        world.look = { ...EYE_LOOK };
        await frames(2);
        // Gone meanwhile (left the view): its film is freed, don't make it again.
        if (!alive || !look.film) return null;
        draw('film', 1, 0, 0, [0, 0, 1]);
        const a = read();
        draw('direct', 1, 0);
        const b = read();
        look.eye = was.eye;
        world.look = was.look;
        let sum = 0, max = 0;
        for (let i = 0; i < a.length; i += 4)
          for (let c = 0; c < 3; c++) {
            const d = Math.abs(a[i + c] - b[i + c]);
            sum += d;
            max = Math.max(max, d);
          }
        return { meanDiff: sum / ((a.length / 4) * 3), maxDiff: max };
      },
      /** Sun glare: the 9x9 core at the Sun and the mean of 8 samples r px out, with and without bloom. */
      glare: (r = 60) => {
        const at = sunPx();
        if (!at || !look.film) return null;
        const e = look.meter.exposure;
        const ring = () => {
          let s = 0;
          for (let k = 0; k < 8; k++) {
            const px = read(Math.round(at[0] + r * Math.cos((k * Math.PI) / 4)), Math.round(at[1] + r * Math.sin((k * Math.PI) / 4)), 1, 1);
            s += (px[0] + px[1] + px[2]) / 3;
          }
          return s / 8;
        };
        draw('film', e, 0);
        const core = Array.from(read(at[0] - 4, at[1] - 4, 9, 9)).filter((_, i) => i % 4 !== 3);
        const bloom = ring();
        draw('film', e, 0, 0);
        const noBloom = ring();
        return { core: Math.min(...core), ring: { bloom, noBloom } };
      },
      /** ms per frame on each path, each frame waited for with a 1-pixel read. */
      bench: (n = 60) => {
        const time = (path: Path) => {
          const t0 = performance.now();
          for (let i = 0; i < n; i++) {
            draw(path, look.meter.exposure, 1 / 60);
            read(0, 0, 1, 1);
          }
          return (performance.now() - t0) / n;
        };
        return { film: look.film ? time('film') : null, direct: time('direct') };
      }
    };
    w.__xno = { ...(w.__xno ?? {}), look: api };
    return () => {
      alive = false;
      if (w.__xno) delete w.__xno.look;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, camera, look]);

  return null;
}
