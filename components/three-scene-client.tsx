'use client';

import React, { Suspense, useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor, Stats } from '@react-three/drei';
import * as THREE from 'three';
import { Globe, Rocket, Satellite, SkipForward } from 'lucide-react';
import type { RepNode } from '@/types/index';
import { CameraDirector } from '@/components/camera-director';
import { DevProbe } from '@/components/dev-probe';
import { Sky } from '@/components/sky';
import { RealSky } from '@/components/real-sky';
import { TimeControls } from '@/components/time-controls';
import { TiledEarth } from '@/components/tiled-earth';
import { StarlinkConstellation } from '@/components/starlink-constellation';
import { StarlinkFollow, type StarlinkInfo } from '@/components/starlink-follow';
import { StarshipMission, type MissionInfo } from '@/components/starship-mission';
import { CableLines } from '@/components/cable-lines';
import { NetworkPackets } from '@/components/network-packets';
import { Dashboard } from '@/components/dashboard';
import { DataSources } from '@/components/data-sources';
import { Aurora } from '@/components/aurora';
import { CityLights } from '@/components/city-lights';
import { EarthBase } from '@/components/earth-base';
import NanoRepNodes from '@/components/nano-rep-nodes';
import { CloudMesh } from '@/components/three-cloud-mesh';
import { DonationAnimation } from '@/components/donation-animation';
import { Button } from '@/components/ui/button';
import { useStarlink } from '@/lib/starlink-data';
import { useCables } from '@/lib/cables-data';
import { useConfirmations } from '@/providers/confirmation-provider';
import { onConfirmation } from '@/lib/feed/bus';
import { world, parseDeepLink } from '@/lib/world';
import { setSimTime } from '@/lib/sim-clock';
import { formatWeight } from '@/lib/reps';
import { VERSION_NAMES } from '@/lib/orbits';
import { APP_CONFIG } from '@/constants/config';

// Three views: the Earth (default), riding a real Starlink, and a Starship
// mission. Everything is drawn to real positions and times; where something
// is enlarged to be visible at all, the UI says so.

interface ThreeSceneClientProps {
  reps: RepNode[];
}

const viewButton =
  'flex select-none items-center gap-2 bg-black/30 backdrop-blur-sm border-white/15 hover:bg-black/50 hover:text-[#209ce9]';

const ThreeSceneClient: React.FC<ThreeSceneClientProps> = ({ reps }) => {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const starsRef = useRef<THREE.Group>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const [homeSignal, setHomeSignal] = useState(0);
  // Most device pixels drawn per CSS pixel. Starts at the screen's own density (up to 2) and only ever goes down.
  const [sharpness, setSharpness] = useState(2);
  const [isFlyView, setIsFlyView] = useState(false); // deep link only (?fly=), no button for now
  const [isStarlinkView, setIsStarlinkView] = useState(false);
  const [starlinkPick, setStarlinkPick] = useState(0);
  const [starlinkInfo, setStarlinkInfo] = useState<StarlinkInfo | null>(null);
  const [isStarshipView, setIsStarshipView] = useState(false);
  const [launchSignal, setLaunchSignal] = useState(0);
  const [missionInfo, setMissionInfo] = useState<MissionInfo | null>(null);
  const [hoveredNode, setHoveredNode] = useState<RepNode | null>(null);
  const missionFlying = useRef(false);
  const starlink = useStarlink();
  const cables = useCables();
  const { feedStatus } = useConfirmations();

  const onMissionInfo = useCallback((i: MissionInfo | null) => {
    missionFlying.current = !!i;
    setMissionInfo(i);
    if (!i) setIsStarshipView(false);
  }, []);

  const toEarthView = useCallback(() => {
    setIsFlyView(false);
    setIsStarlinkView(false);
    setIsStarshipView(false);
    setHomeSignal((n) => n + 1);
  }, []);

  const watchStarship = useCallback(() => {
    setIsFlyView(false);
    setIsStarlinkView(false);
    if (!missionFlying.current) setLaunchSignal((n) => n + 1);
    setIsStarshipView(true);
  }, []);

  const rideStarlink = useCallback(() => {
    setIsFlyView(false);
    setIsStarshipView(false);
    setIsStarlinkView(true);
  }, []);

  // Deep links: ?fly=lat,lon,altKm[,heading,pitch]&time=ISO
  useEffect(() => {
    const link = parseDeepLink(window.location.search);
    if (link.timeMs !== undefined) setSimTime(link.timeMs);
    if (link.fly) {
      world.flyStart = link.fly;
      setIsFlyView(true);
    }
  }, []);

  // A send of 1,000 Ӿ or more launches a Starship (one at a time); a tip
  // summons its meteor, as promised on the tip button.
  useEffect(
    () =>
      onConfirmation((c, amount) => {
        if (c.message.block.link_as_account === APP_CONFIG.donations.nano) {
          (window as unknown as { triggerDonationAnimation?: (amount: number) => void }).triggerDonationAnimation?.(amount);
        }
        if (c.message.block.subtype === 'send' && amount >= 1000 && !missionFlying.current) setLaunchSignal((n) => n + 1);
      }),
    []
  );

  const cameraSettings = useMemo(
    () => ({ fov: 45, near: 0.001, far: 1000, position: [0, 2, 4] as [number, number, number] }),
    []
  );

  const inEarthView = !isStarlinkView && !isFlyView && !isStarshipView;
  const cameraMode = isFlyView ? 'fly' : inEarthView ? 'globe' : 'follow';

  return (
    <div className="relative w-screen h-screen bg-black">
      <div className="absolute top-1 md:top-4 left-4 md:left-8 z-10 flex-col select-none">
        <span className="text-[30px] md:text-[40px] font-thin font-sans text-[#209ce9]">ӾNO</span>
        <span className="text-[30px] md:text-[40px] text-gray-200">Hub</span>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span
            className={`w-2 h-2 rounded-full ${
              feedStatus.state === 'open'
                ? 'bg-green-400'
                : feedStatus.state === 'sample'
                  ? 'bg-blue-400'
                  : 'bg-yellow-400 animate-pulse'
            }`}
          />
          {feedStatus.state === 'open'
            ? `Live · ${feedStatus.url ? new URL(feedStatus.url).host : ''}`
            : feedStatus.state === 'sample'
              ? 'Sample data'
              : 'Connecting…'}
        </div>
      </div>

      {/* Views: top right on a phone (icons only), top centre on a wide screen */}
      <div className="absolute right-4 top-3 z-10 flex gap-2 md:left-1/2 md:right-auto md:top-4 md:-translate-x-1/2">
        {!inEarthView && (
          <Button onClick={toEarthView} variant="outline" size="sm" className={viewButton}>
            <Globe className="w-4 h-4 text-[#209ce9]" />
            <span className="hidden md:inline">Earth</span>
          </Button>
        )}
        {!isStarlinkView ? (
          <Button onClick={rideStarlink} variant="outline" size="sm" className={viewButton}>
            <Satellite className="w-4 h-4 text-[#6fe3ff]" />
            <span className="hidden md:inline">Ride a Starlink</span>
          </Button>
        ) : (
          <Button onClick={() => setStarlinkPick((n) => n + 1)} variant="outline" size="sm" className={viewButton}>
            <SkipForward className="w-4 h-4 text-[#6fe3ff]" />
            <span className="hidden md:inline">Next satellite</span>
          </Button>
        )}
        {!isStarshipView && (
          <Button onClick={watchStarship} variant="outline" size="sm" className={viewButton}>
            <Rocket className="w-4 h-4 text-gray-200" />
            <span className="hidden md:inline">{missionInfo ? 'Watch Starship' : 'Launch Starship'}</span>
          </Button>
        )}
      </div>

      {/* The dashboard: a bar under the header on a phone, a column on the right on a wide screen */}
      <div className="pointer-events-none absolute bottom-20 left-4 right-4 top-[4.75rem] z-10 flex flex-col items-end md:bottom-4 md:left-auto md:top-4">
        <Dashboard starlink={starlink} />
      </div>

      <Canvas
        camera={cameraSettings}
        className="w-full h-full cursor-move pointer-events-auto"
        performance={{ min: 0.5 }}
        dpr={[1, sharpness]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          // Reversed-Z where EXT_clip_control exists; the near plane also follows altitude.
          reversedDepthBuffer: true,
          alpha: false
        }}
      >
        {APP_CONFIG.debug.frameRateDisplay && <Stats />}
        {/* When the frame rate stays low for a few seconds, draw fewer pixels: a slightly softer picture that moves smoothly. */}
        <PerformanceMonitor onDecline={() => setSharpness((d) => Math.max(1, d - 0.5))} />
        <CameraDirector mode={cameraMode} cameraRef={cameraRef} homeSignal={homeSignal} />
        {process.env.NODE_ENV === 'development' && <DevProbe />}

        <RealSky nightRef={starsRef} />
        <directionalLight ref={lightRef} color={0xffffff} intensity={2} />
        <ambientLight intensity={0.1} />

        {/* Fill light for a vehicle watched up close. The Earth lights itself (lib/earth-light). */}
        {cameraMode === 'follow' && <hemisphereLight args={[0x9cc4ff, 0x4a3f34, 1.1]} />}

        <EarthBase />
        <TiledEarth />
        <NanoRepNodes reps={reps} onNodeHover={setHoveredNode} />
        <CityLights />
        <CloudMesh meshRef={cloudRef} />
        <Sky lightRef={lightRef} starsRef={starsRef} />
        <Aurora />
        {starlink && <StarlinkConstellation data={starlink} />}
        {cables && <CableLines data={cables} />}
        {cables && <NetworkPackets reps={reps} cables={cables} />}

        {/* Late loaders: keep the page up while models load */}
        <Suspense fallback={null}>
          <StarlinkFollow active={isStarlinkView} pick={starlinkPick} onInfo={setStarlinkInfo} />
          <StarshipMission launchSignal={launchSignal} follow={isStarshipView} onInfo={onMissionInfo} />
          <DonationAnimation />
        </Suspense>
      </Canvas>

      <div className="absolute bottom-1 left-1/2 z-10 -translate-x-1/2">
        <DataSources />
      </div>

      <div className="absolute bottom-8 left-4 md:left-8 z-10 flex flex-col gap-2">
        {hoveredNode && (
          <div className="rounded-lg bg-black/55 backdrop-blur-sm border border-white/10 text-white p-3 max-w-xs text-sm">
            <div className="font-medium">{hoveredNode.alias || `${hoveredNode.account.slice(0, 12)}…`}</div>
            <div className="text-gray-300">
              {formatWeight(hoveredNode.weight)} · {hoveredNode.weightPercent.toFixed(2)}% of online weight
              {!hoveredNode.online && ' · offline'}
            </div>
            {hoveredNode.city && (
              <div className="text-gray-500 text-xs">
                {hoveredNode.city}, {hoveredNode.country} (approx., from node IP)
              </div>
            )}
          </div>
        )}
        <TimeControls />
      </div>

      {isStarlinkView && starlinkInfo && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 text-center text-xs text-gray-300 select-none">
          <div className="text-base text-white">Starlink #{starlinkInfo.norad}</div>
          <div>{VERSION_NAMES[starlinkInfo.version]} (estimated from launch date) · true scale</div>
          <div>
            {starlinkInfo.altKm.toFixed(0)} km up · {starlinkInfo.speedKms.toFixed(2)} km/s · one orbit every{' '}
            {starlinkInfo.periodMin.toFixed(1)} min
          </div>
          <div className="text-gray-500">
            over {Math.abs(starlinkInfo.lat).toFixed(1)}°{starlinkInfo.lat >= 0 ? 'N' : 'S'}{' '}
            {Math.abs(starlinkInfo.lon).toFixed(1)}°{starlinkInfo.lon >= 0 ? 'E' : 'W'} · real time (time warp
            speeds it up)
          </div>
        </div>
      )}

      {missionInfo && (isStarshipView || missionInfo.enlarged) && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 text-center text-xs text-gray-300 select-none">
          <div className="text-base text-white">
            Starship · {missionInfo.phase} · T+{Math.floor(missionInfo.t / 60)}:
            {String(Math.floor(missionInfo.t % 60)).padStart(2, '0')}
          </div>
          <div>
            {missionInfo.altKm.toFixed(0)} km up
            {missionInfo.compression > 1 ? ` · time ×${missionInfo.compression}` : ' · real time'}
            {missionInfo.deployed > 0 && ` · ${missionInfo.deployed} Starlink V3 deployed`}
          </div>
          {missionInfo.enlarged && !isStarshipView && <div className="text-gray-500">vehicles drawn larger than real</div>}
          {isStarshipView && <div className="text-gray-500">true scale · V3 sizes are estimates</div>}
        </div>
      )}
    </div>
  );
};

export default ThreeSceneClient;
