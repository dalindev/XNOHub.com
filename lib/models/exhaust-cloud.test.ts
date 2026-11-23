import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildStaging, buildTrail, cloudExtent, makeExhaustCloud, stageAt, type PuffState } from '@/lib/models/exhaust-cloud';
import { createMissionState, IGNITION_S, missionAt, STAGING_S } from '@/lib/missions/starship';
import { BOOSTER_EXIT_Y } from '@/lib/models/starship-models';
import { VENT_Y } from '@/lib/plume/staging-vents';

// Seconds after ignition (the engines light at T-0:03).
const T = (met: number) => met + 3;

describe('the steam cloud at liftoff', () => {
  it('is only the deluge mist before ignition', () => {
    const c = cloudExtent(T(-4));
    expect(c.top).toBeLessThan(40);
    expect(c.puffs).toBeLessThan(30);
  });

  it('towers over the 145 m launch tower and spreads well past ±140 m along the trench by T+10 s', () => {
    const c = cloudExtent(T(10));
    expect(c.top).toBeGreaterThan(145);
    expect(c.top).toBeLessThan(400);
    expect(c.along).toBeGreaterThan(140);
    // Wider along the trench than across it: the trench splits it in two.
    expect(c.along).toBeGreaterThan(1.3 * c.across);
  });

  it('keeps rising for minutes, to a kilometre or two', () => {
    const c = cloudExtent(T(300));
    expect(c.top).toBeGreaterThan(800);
    expect(c.top).toBeLessThan(3500);
    expect(cloudExtent(T(120)).top).toBeLessThan(c.top);
  });

  it('is the same every time', () => {
    expect(cloudExtent(T(42))).toEqual(cloudExtent(T(42)));
  });
});

describe('the trail higher up', () => {
  // A stand-in climb: about 2.6 m/s² up and a little downrange.
  const path = (t: number, out: THREE.Vector3) => (out.set(0.3 * t * t, 2.6 * t * t, 0), true);
  const trail = buildTrail(path);

  it('runs from about 4 km to 48 km, one puff every 300 m of path', () => {
    expect(trail.length).toBeGreaterThan(100);
    expect(trail.length).toBeLessThan(220);
    for (const p of trail) {
      expect(p.y0).toBeGreaterThanOrEqual(3990);
      expect(p.y0).toBeLessThanOrEqual(48100);
      expect(Math.hypot(p.ax, p.ay, p.az)).toBeCloseTo(1, 6);
    }
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1], b = trail[i];
      expect(Math.hypot(b.x0 - a.x0, b.y0 - a.y0, b.z0 - a.z0)).toBeGreaterThan(290);
      expect(Math.hypot(b.x0 - a.x0, b.y0 - a.y0, b.z0 - a.z0)).toBeLessThan(400);
      expect(b.born).toBeGreaterThan(a.born);
    }
  });

  it('is empty without a climb', () => {
    expect(buildTrail(() => false)).toEqual([]);
  });
});

describe('hot staging’s exhaust', () => {
  // The same stand-in climb, staging 161 s after ignition with the ring 74 m above the engines.
  const path = (t: number, out: THREE.Vector3) => (t < 161 ? (out.set(0.3 * t * t, 2.6 * t * t, 0), true) : false);
  const AT = 161, RING = 74;
  const puffs = buildStaging(path, AT, RING);
  const state = (): PuffState & { stretch: number } => ({ x: 0, y: 0, z: 0, r: 0, tau: 0, age: 0, stretch: 1 });
  const v = new THREE.Vector3(0.6 * 161, 5.2 * 161, 0);
  const axis = v.clone().normalize();

  it('comes out all round the ring in rings while the ship pushes off, leaving the hull at the ring', () => {
    expect(puffs.length).toBe(13 * 18);
    for (const p of puffs) {
      expect(p.born).toBeGreaterThan(AT + 0.29);
      expect(p.born).toBeLessThan(AT + 2.15);
      // On the hull (4.5 m from the axis), where the ring has got to by then.
      const base = new THREE.Vector3();
      path(AT - 0.05, base);
      base.addScaledVector(axis, RING).addScaledVector(v, p.born - AT + 0.05);
      const off = new THREE.Vector3(p.x0, p.y0, p.z0).sub(base);
      expect(off.clone().addScaledVector(axis, -off.dot(axis)).length()).toBeCloseTo(4.5, 0);
      // The stack's speed, plus 400–1200 m/s of its own out of the ring.
      const own = new THREE.Vector3(p.vx, p.vy, p.vz).sub(v).length();
      expect(own).toBeGreaterThan(400);
      expect(own).toBeLessThan(1200);
    }
    expect(puffs.every((p) => !stageAt(p, AT, state()))).toBe(true);
  });

  it('stops in the thin air within a second, as a ring a few hundred metres across', () => {
    const where = (t: number) =>
      puffs.map((p) => {
        const s = state();
        expect(stageAt(p, t, s)).toBe(true);
        return s;
      });
    const at10 = where(AT + 10);
    const at20 = where(AT + 20);
    const moved = Math.max(...at10.map((s, i) => Math.hypot(s.x - at20[i].x, s.y - at20[i].y, s.z - at20[i].z)));
    expect(moved).toBeLessThan(1);
    const c = at10.reduce((m, s) => m.add(new THREE.Vector3(s.x, s.y, s.z).divideScalar(at10.length)), new THREE.Vector3());
    const out = at10.map((s) => {
      const d = new THREE.Vector3(s.x, s.y, s.z).sub(c);
      return d.addScaledVector(axis, -d.dot(axis)).length();
    });
    // 360–630 m across from the ground after Flight 5 (docs/flames.md): the
    // puffs' middles, and their soft edges a little beyond.
    const middle = [...out].sort((a, b) => a - b)[out.length >> 1];
    expect(2 * (middle + 60)).toBeGreaterThan(360);
    expect(2 * (middle + 60)).toBeLessThan(630);
    expect(2 * Math.max(...out.map((d, i) => d + at10[i].r))).toBeLessThan(850);
    // Thin by then, gone after a few minutes.
    expect(Math.max(...at10.map((s) => s.tau))).toBeLessThan(0.3);
    expect(puffs.every((p) => !stageAt(p, AT + 200, state()))).toBe(true);
  });

  it('is empty without the stack’s last moments', () => {
    expect(buildStaging(() => false, AT, RING)).toEqual([]);
  });

  it('leaves the booster’s real vents on the mission’s path, where the booster is at that moment', () => {
    const S = 6_371_000; // metres per scene unit
    const at = STAGING_S - IGNITION_S;
    const path = createMissionState(), live = createMissionState();
    const up = new THREE.Vector3();
    const exits = (since: number, out: THREE.Vector3) => {
      const t = since + IGNITION_S;
      if (t >= STAGING_S) return false;
      missionAt(t, path);
      up.set(0, 1, 0).applyQuaternion(path.ship.quat);
      out.copy(path.ship.pos).multiplyScalar(S).addScaledVector(up, BOOSTER_EXIT_Y);
      return true;
    };
    const vents = (since: number, centre: THREE.Vector3, axis: THREE.Vector3) => {
      const t = since + IGNITION_S;
      missionAt(t, live);
      const b = t < STAGING_S ? live.ship : live.booster;
      axis.set(0, 1, 0).applyQuaternion(b.quat);
      centre.copy(b.pos).multiplyScalar(S).addScaledVector(axis, VENT_Y);
      return true;
    };
    const real = buildStaging(exits, at, VENT_Y - BOOSTER_EXIT_Y, vents);
    expect(real.length).toBe(13 * 18);
    const ax = new THREE.Vector3(), d = new THREE.Vector3();
    for (const p of real) {
      missionAt(p.born + IGNITION_S, live);
      ax.set(0, 1, 0).applyQuaternion(live.booster.quat);
      d.set(p.x0, p.y0, p.z0).sub(live.booster.pos.clone().multiplyScalar(S));
      const along = d.dot(ax);
      const out = d.addScaledVector(ax, -along).length();
      // On the hull, at the vents (or the dome's rim once the ship has pulled away).
      expect(out).toBeGreaterThan(4);
      expect(out).toBeLessThan(5);
      expect(Math.abs(along - (VENT_Y + (p.born - at >= 1.15 ? 1.25 : 0)))).toBeLessThan(2);
    }
  });
});

describe('drawing the puffs', () => {
  it('draws each puff on a square big enough for its lumps', () => {
    const cloud = makeExhaustCloud();
    const mat = (cloud.group.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;
    // The fragment shader's lumpy radius: r·(1 − dent·lumpy + lumpy·(a·n1 + b·n2)), the noise 0..1.
    const lump = mat.fragmentShader.match(/vC\.w \* \(1\.0 - ([\d.]+) \* lumpy \+ lumpy \* \(([\d.]+) \* n1 \+ ([\d.]+) \* n2\)\)/);
    expect(lump).not.toBeNull();
    const reach = (lumpy: number) => 1 - Number(lump![1]) * lumpy + lumpy * (Number(lump![2]) + Number(lump![3]));
    const stageLumpy = Number(mat.fragmentShader.match(/float lumpy = vLook\.w > 3\.5 \? ([\d.]+) : 1\.0;/)![1]);
    // The vertex shader's square: the ball it covers (in radii, for hot staging : the rest), its margin, and when the eye is "inside".
    const bound = mat.vertexShader.match(/float r = aCentre\.w \* aAmb\.w(?: \* \(aLook\.w > 3\.5 \? ([\d.]+) : ([\d.]+)\))?;/);
    expect(bound).not.toBeNull();
    const margin = Number(mat.vertexShader.match(/\* ([\d.]+) \* hw;/)![1]) / 2;
    const inside = Number(mat.vertexShader.match(/bool inside = d < r \* ([\d.]+);/)![1]);
    for (const [lumpy, b] of [[1, Number(bound![2] ?? 1)], [stageLumpy, Number(bound![1] ?? 1)]]) {
      expect(inside * b).toBeGreaterThanOrEqual(reach(lumpy));
      // Through the middle of the square's edge, a line of sight passes this far from the centre (in radii).
      for (const d of [inside * b + 0.001, 1.5 * b, 3 * b, 100 * b]) {
        const tan = (margin * b) / Math.sqrt(d * d - b * b);
        expect((d * tan) / Math.hypot(1, tan)).toBeGreaterThanOrEqual(reach(lumpy));
      }
    }
    cloud.dispose();
  });

  it('shades every puff from the Sun as it is now, however the moment was reached', () => {
    const camera = new THREE.PerspectiveCamera(30, 1.6, 1, 1e6);
    camera.position.set(-3000, 2, 4000);
    camera.lookAt(0, 80, 0);
    camera.updateMatrixWorld();
    const frame = (t: number) => ({ t, camera, sunDirection: new THREE.Vector3(0.5, 0.866, 0), flame: 1, exits: new THREE.Vector3(0, 20, 0), axis: new THREE.Vector3(0, 1, 0), plumeLength: 150 });
    const shades = (cloud: ReturnType<typeof makeExhaustCloud>) => {
      const m = new Map<string, number>();
      for (const child of cloud.group.children) {
        const geo = (child as THREE.Mesh).geometry as THREE.InstancedBufferGeometry;
        const c = geo.getAttribute('aCentre') as THREE.InstancedBufferAttribute, s = geo.getAttribute('aSun') as THREE.InstancedBufferAttribute;
        for (let i = 0; i < geo.instanceCount; i++) m.set(`${c.getX(i).toFixed(2)},${c.getY(i).toFixed(2)},${c.getZ(i).toFixed(2)}`, s.getW(i));
      }
      return m;
    };
    // A frame a moment ago, then now; and now straight away.
    const a = makeExhaustCloud(), b = makeExhaustCloud();
    a.update(frame(4.57));
    a.update(frame(4.76));
    b.update(frame(4.76));
    const sa = shades(a), sb = shades(b);
    expect(sa.size).toBe(sb.size);
    expect(sa.size).toBeGreaterThan(20);
    for (const [k, v] of sb) expect(sa.get(k)).toBeCloseTo(v, 3);
    a.dispose();
    b.dispose();
  });
});
