// 3d-tiles-renderer 0.5.4 exports the terrain mesh plugins from JS but its
// plugins.d.ts doesn't list them yet.
import type { ImageOverlay } from '3d-tiles-renderer/plugins';

declare module '3d-tiles-renderer/plugins' {
  interface TerrainRGBMeshOptions {
    url: string;
    tileDimension?: number;
    maxZoom?: number;
    heightScale?: number;
    overlay?: ImageOverlay | null;
    applyOverlayTexture?: boolean;
    unlit?: boolean;
    projection?: 'ellipsoid' | 'source' | string;
    endCaps?: boolean;
    useRecommendedSettings?: boolean;
  }
  export class TerrainRGBMeshPlugin {
    constructor(options: TerrainRGBMeshOptions);
    heightScale: number;
    sampleCartographicElevation(lat: number, lon: number): number | null;
    decodeElevation(r: number, g: number, b: number): number;
  }
  export class TerrariumMeshPlugin extends TerrainRGBMeshPlugin {}
}
