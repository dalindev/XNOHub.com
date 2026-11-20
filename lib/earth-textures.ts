'use client';

import * as THREE from 'three';
import { useLoader, useThree } from '@react-three/fiber';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

// Earth textures are KTX2 (Basis ETC1S, built by scripts/build-earth-textures.sh)
// so they stay compressed on the GPU. Big screens get 8K colour and night
// lights; everything else (and data-saver connections) gets 4K.

const pickTier = (): '4k' | '8k' => {
  if (typeof window === 'undefined') return '4k';
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    ?.saveData;
  return window.innerWidth * (window.devicePixelRatio || 1) >= 2560 && !saveData ? '8k' : '4k';
};

const tier = pickTier();

export const EARTH_TEXTURES = {
  map: `/earth/color-${tier}.ktx2`,
  emissiveMap: `/earth/night-${tier}.ktx2`,
  bumpMap: '/earth/bump-4k.ktx2',
  specularMap: '/earth/water-4k.ktx2'
} as const;

export const CLOUD_TEXTURE = '/earth/clouds-4k.ktx2';

function useKtx2<T extends string | string[]>(urls: T) {
  const gl = useThree((s) => s.gl);
  return useLoader(KTX2Loader, urls, (loader) => {
    loader.setTranscoderPath('/basis/');
    loader.detectSupport(gl);
  }) as T extends string[] ? THREE.CompressedTexture[] : THREE.CompressedTexture;
}

export function useEarthTextures() {
  const keys = Object.keys(EARTH_TEXTURES) as (keyof typeof EARTH_TEXTURES)[];
  const list = useKtx2(keys.map((k) => EARTH_TEXTURES[k]));
  return Object.fromEntries(keys.map((k, i) => [k, list[i]])) as Record<
    keyof typeof EARTH_TEXTURES,
    THREE.CompressedTexture
  >;
}

export function useCloudTexture() {
  return useKtx2(CLOUD_TEXTURE);
}
