'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Streaks } from '@/lib/streaks';
import { METRE } from '@/lib/chase-camera';
import { world } from '@/lib/world';

// Dust going past while riding a satellite or the Starship: streaks with long
// tails, one at a time and in waves from one direction, always coming in from
// space (level or heading down to the Earth, never up from it). For the feeling of
// speed, not a measurement: real grains are too small and too fast (10 to
// 70 km/s) to see at all. Here they cross in front of the camera, within a few
// hundred metres, at about 2 to 3 km/s. Drawn around the camera, in metres.
// Only above the air (100 km up): lower down, grains from space have burnt up
// as meteors, so a launch climbing through a blue sky has none.

const MAX = 80;
const REACH_M = 700; // a grain starts this far away and ends as far the other side
const ABOVE_AIR = 100_000 * METRE;

interface Grain {
  from: THREE.Vector3; // metres from the camera
  dir: THREE.Vector3;
  born: number;
  seconds: number;
  tailM: number;
  width: number;
  opacity: number;
  head: THREE.Color;
  trail: THREE.Color;
}

const HEADS = [0xffffff, 0xe6f2ff, 0xfff0dc].map((c) => new THREE.Color(c));
const TRAILS = [0x78aaff, 0x9fd0ff, 0xffb070].map((c) => new THREE.Color(c));
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const between = (a: number, b: number) => a + Math.random() * (b - a);
const anyDirection = () => new THREE.Vector3().randomDirection();

export const SpaceDust: React.FC = () => {
  // One memo for both: React may run a memo twice in dev, and a second one
  // would move the streaks into a group that is then thrown away.
  const { streaks, group } = useMemo(() => {
    const streaks = new Streaks(MAX);
    const group = new THREE.Group();
    streaks.mesh.scale.setScalar(METRE);
    group.add(streaks.mesh);
    return { streaks, group };
  }, []);
  useEffect(() => () => streaks.dispose(), [streaks]);
  const live = useRef<(Grain | null)[]>(Array.from({ length: MAX }, () => null));
  const next = useRef({ single: 0, wave: 0 });
  const tmp = useMemo(() => ({ head: new THREE.Vector3(), tail: new THREE.Vector3(), up: new THREE.Vector3() }), []);

  // Dev: __xno.dust() sends a wave past now.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const w = window as unknown as { __xno?: Record<string, unknown> };
    w.__xno = { ...(w.__xno ?? {}), dust: () => (next.current.wave = 0) };
  }, []);

  useFrame(({ clock, camera, gl }) => {
    // Not through the Starship view's camera: no webcast shows it.
    const riding = world.nearOverride !== null && world.altitude > ABOVE_AIR && !world.look.on;
    group.visible = riding;
    const slots = live.current;
    const now = clock.elapsedTime;
    if (!riding) {
      slots.fill(null);
      next.current.single = now + 1.5;
      next.current.wave = now + between(3, 6);
      return;
    }
    group.position.copy(camera.position);

    const add = (dir: THREE.Vector3, born: number) => {
      const i = slots.findIndex((s) => s === null);
      if (i < 0) return;
      // Passes through a point somewhere in front of the camera, so it crosses the view.
      const through = camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(between(30, 380)).addScaledVector(anyDirection(), between(0, 160));
      const side = through;
      const speed = between(1800, 3200);
      slots[i] = {
        from: side.addScaledVector(dir, -REACH_M), dir, born, seconds: (2 * REACH_M) / speed,
        tailM: between(180, 460), width: between(1.6, 3), opacity: between(0.6, 1), head: pick(HEADS), trail: pick(TRAILS)
      };
    };
    // Dust comes in from space: level with the orbit or heading down toward the
    // Earth, never up from below.
    const up = tmp.up.copy(camera.position).normalize();
    const fromSpace = (dir: THREE.Vector3) => {
      const rising = dir.dot(up);
      return rising > 0 ? dir.addScaledVector(up, -2 * rising) : dir;
    };
    const n = next.current;
    if (now > n.single) {
      n.single = now + between(0.4, 1.8);
      add(fromSpace(anyDirection()), now);
    }
    if (now > n.wave) {
      n.wave = now + between(5, 11);
      const stream = fromSpace(anyDirection());
      const count = Math.round(between(20, 42));
      for (let k = 0; k < count; k++) add(fromSpace(stream.clone().addScaledVector(anyDirection(), 0.04).normalize()), now + between(0, 1.6));
    }

    for (let i = 0; i < MAX; i++) {
      const g = slots[i];
      const age = g ? (now - g.born) / g.seconds : -1;
      if (!g || age < 0) {
        streaks.hide(i);
        continue;
      }
      if (age > 1) {
        slots[i] = null;
        streaks.hide(i);
        continue;
      }
      const head = tmp.head.copy(g.from).addScaledVector(g.dir, 2 * REACH_M * age);
      const tail = tmp.tail.copy(head).addScaledVector(g.dir, -g.tailM);
      streaks.set(i, head, tail, g.head, g.trail, g.opacity * Math.sin(Math.PI * age), g.width);
    }
    streaks.commit(gl, camera);
  });

  return <primitive object={group} />;
};
