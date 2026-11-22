'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Streaks } from '@/lib/streaks';
import { grazerPath, meteorPath, showerPath, type MeteorPath } from '@/lib/meteor-paths';
import { world } from '@/lib/world';

// Meteors burning up over the Earth, at their real height (120 km down to
// 70 to 90 km, fireballs lower). Generated, not observed: nobody publishes
// every meteor as it happens.
//
//   Sporadic meteors, about one a second somewhere on the side you can see.
//   A fireball now and then: lower, wider, with a flash at the end.
//   An earthgrazer now and then: skims the upper air for over 1,000 km and leaves.
//   A shower every minute or two: sixty or so in parallel from one direction.
//
// They are a few pixels wide however far the camera is (the real glowing trail
// is metres across), and from far away their paths are drawn up to five times
// longer so they are more than a dot; from low orbit they are their real length.
// They play in real time, apart from the earthgrazer, which is sped up about
// ten times.

const MAX = 96;

interface Meteor {
  path: MeteorPath;
  born: number; // s
  seconds: number; // from first glow to burn-out
  tail: number; // share of the path
  width: number; // px
  opacity: number;
  flash: boolean;
  head: THREE.Color;
  trail: THREE.Color;
}

const HEADS = [0xffffff, 0xdff4ff, 0xd8ffe6, 0xfff1d6].map((c) => new THREE.Color(c));
const TRAILS = [0x6fb4ff, 0x7dffb0, 0xffa652, 0xff7a3c].map((c) => new THREE.Color(c));
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const between = (a: number, b: number) => a + Math.random() * (b - a);

export const Meteors: React.FC = () => {
  const streaks = useMemo(() => new Streaks(MAX), []);
  useEffect(() => () => streaks.dispose(), [streaks]);
  const live = useRef<(Meteor | null)[]>(Array.from({ length: MAX }, () => null));
  const next = useRef({ sporadic: 1, fireball: 6, grazer: 10, shower: 18 });
  const tmp = useMemo(() => ({ over: new THREE.Vector3(), head: new THREE.Vector3(), tail: new THREE.Vector3(), view: new THREE.Vector3() }), []);

  // Dev: __xno.meteors() starts a fireball, an earthgrazer and a shower at once.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const w = window as unknown as { __xno?: Record<string, unknown> };
    w.__xno = { ...(w.__xno ?? {}), meteors: () => Object.assign(next.current, { fireball: 0, grazer: 0, shower: 0 }) };
  }, []);

  useFrame(({ clock, camera, gl }) => {
    const now = clock.elapsedTime;
    const slots = live.current;
    const add = (m: Meteor) => {
      const i = slots.findIndex((s) => s === null);
      if (i >= 0) slots[i] = m;
    };

    // A point on the part of the Earth the camera can see.
    const view = tmp.view.copy(camera.position);
    const horizon = Math.acos(Math.min(1, 1 / view.length())); // angle from under the camera to the horizon
    view.normalize();
    const somewhere = (out: THREE.Vector3) => {
      const angle = Math.acos(1 - Math.random() * (1 - Math.cos(horizon * 0.97)));
      const round = Math.random() * Math.PI * 2;
      const a = Math.abs(view.y) < 0.9 ? out.set(0, 1, 0) : out.set(1, 0, 0);
      const e = a.clone().cross(view).normalize();
      const n = view.clone().cross(e);
      return out.copy(view).multiplyScalar(Math.cos(angle)).addScaledVector(e, Math.sin(angle) * Math.cos(round)).addScaledVector(n, Math.sin(angle) * Math.sin(round));
    };
    const far = THREE.MathUtils.smoothstep(world.altitude, 0.15, 2.5);
    const stretch = THREE.MathUtils.lerp(1, 5, far);
    const wide = THREE.MathUtils.lerp(1, 1.8, far);
    // Against the sunlit Earth a meteor hardly shows.
    const shade = (over: THREE.Vector3) => THREE.MathUtils.lerp(1, 0.45, THREE.MathUtils.smoothstep(over.dot(world.sunDirection), -0.1, 0.3));

    const n = next.current;
    if (now > n.sporadic) {
      n.sporadic = now + between(0.3, 1.6);
      const over = somewhere(tmp.over);
      const lengthKm = between(40, 160);
      add({
        path: meteorPath(over, Math.random() * Math.PI * 2, lengthKm * stretch, between(30, 48)),
        born: now, seconds: THREE.MathUtils.clamp(lengthKm / between(25, 70), 0.5, 2.2),
        tail: 0.7, width: between(1.6, 2.6), opacity: between(0.7, 1) * shade(over), flash: false, head: pick(HEADS), trail: pick(TRAILS)
      });
    }
    if (now > n.fireball) {
      n.fireball = now + between(9, 20);
      const over = somewhere(tmp.over);
      add({
        path: meteorPath(over, Math.random() * Math.PI * 2, between(180, 320) * stretch, between(65, 85)),
        born: now, seconds: between(2.2, 3.4),
        tail: 0.6, width: between(3.4, 4.6), opacity: 1, flash: true, head: HEADS[0], trail: pick([TRAILS[1], TRAILS[2]])
      });
    }
    if (now > n.grazer) {
      n.grazer = now + between(28, 50);
      add({
        path: grazerPath(somewhere(tmp.over), Math.random() * Math.PI * 2, between(82, 98)),
        born: now, seconds: between(5, 7),
        tail: 0.3, width: 3.6, opacity: 1, flash: false, head: HEADS[3], trail: TRAILS[3]
      });
    }
    if (now > n.shower) {
      n.shower = now + between(60, 120);
      // The stream comes down on the side the camera sees.
      // Slanting across the view, so the paths are seen side-on, not end-on.
      const from = new THREE.Vector3().crossVectors(view, new THREE.Vector3().randomDirection()).normalize().addScaledVector(view, -between(0.3, 0.6)).normalize();
      const head = pick(HEADS);
      const trail = pick(TRAILS);
      for (let k = 0, made = 0; k < 300 && made < 60; k++) {
        const over = somewhere(tmp.over);
        const path = showerPath(over, from, between(32, 46), 260 * stretch);
        if (!path) continue;
        made++;
        add({ path, born: now + between(0, 8), seconds: between(0.8, 1.8), tail: 0.8, width: between(1.8, 2.8), opacity: between(0.75, 1) * shade(over), flash: false, head, trail });
      }
    }

    for (let i = 0; i < MAX; i++) {
      const m = slots[i];
      if (!m) {
        streaks.hide(i);
        continue;
      }
      const age = (now - m.born) / m.seconds;
      const after = (now - m.born - m.seconds) / 0.5; // the trail lingers half a second
      if (age < 0) {
        streaks.hide(i);
        continue;
      }
      if (after > 1) {
        slots[i] = null;
        streaks.hide(i);
        continue;
      }
      const done = Math.min(1, age);
      const head = tmp.head.copy(m.path.start).addScaledVector(m.path.dir, m.path.length * done);
      const tail = tmp.tail.copy(head).addScaledVector(m.path.dir, -m.path.length * Math.min(done, m.tail));
      // Brightens as the air thickens, then fades; a fireball ends in a flash.
      const burn = Math.pow(Math.sin(Math.PI * Math.min(1, done * 0.9 + 0.08)), 0.6);
      const flash = m.flash ? THREE.MathUtils.smoothstep(done, 0.82, 1) : 0;
      const fade = after > 0 ? 1 - after : 1;
      streaks.set(i, head, tail, m.head, m.trail, m.opacity * Math.min(1, burn + flash) * fade, m.width * wide * (1 + 2.2 * flash));
    }
    streaks.commit(gl, camera);
  });

  return <primitive object={streaks.mesh} />;
};
