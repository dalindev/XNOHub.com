'use client';

import React, {
  Suspense,
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo
} from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, Stats } from '@react-three/drei';
import * as THREE from 'three';
import type { RepNode } from '@/types/index';
import { CameraDirector } from '@/components/camera-director';
import { DevProbe } from '@/components/dev-probe';
import { Sky } from '@/components/sky';
import { TimeControls } from '@/components/time-controls';
import { TiledEarth } from '@/components/tiled-earth';
import { StarlinkConstellation } from '@/components/starlink-constellation';
import { useStarlink } from '@/lib/starlink-data';
import { useCables } from '@/lib/cables-data';
import { CableLines } from '@/components/cable-lines';
import { NetworkPackets } from '@/components/network-packets';
import { NetworkPanel } from '@/components/network-panel';
import { world, parseDeepLink } from '@/lib/world';
import { setSimTime } from '@/lib/sim-clock';
import { formatWeight } from '@/lib/reps';
import ThreeMesh from '@/components/three-mesh';
import { CloudMesh } from '@/components/three-cloud-mesh';
import { ConfirmationHistoryTable } from '@/components/confirmation-history-table';
import { DonationImagePopover } from '@/components/donation-image-popover';
import { useConfirmations } from '@/providers/confirmation-provider';
import { DonationAnimation } from '@/components/donation-animation';
import { parseNanoAmount } from '@/lib/parse-nano-amount';
import { Vector3 } from 'three';
import { scaleRocketCount } from '@/lib/scale-rocket-count';
import { Button } from '@/components/ui/button';
import { Rocket, Eye, Globe, Plane } from 'lucide-react';
import RocketAnimationManager from '@/components/rocket-animation-manager';
import { APP_CONFIG } from '@/constants/config';
import { StarlinkFollow, type StarlinkInfo } from '@/components/starlink-follow';
import { StarshipMission, type MissionInfo } from '@/components/starship-mission';
import { VERSION_NAMES } from '@/lib/orbits';
import { RocketViewText } from '@/components/rocket-view-text';
// import { AuroraEffect } from '@/components/aurora-effect';

function getRandomPositionOnGlobe(radius: number = 1.2): Vector3 {
  const phi = Math.random() * Math.PI * 2;
  const theta = Math.acos(Math.random() * 2 - 1);

  const x = radius * Math.sin(theta) * Math.cos(phi);
  const y = radius * Math.sin(theta) * Math.sin(phi);
  const z = radius * Math.cos(theta);

  return new Vector3(x, y, z);
}

interface ThreeSceneClientProps {
  reps: RepNode[];
}

const ThreeSceneClient: React.FC<ThreeSceneClientProps> = ({
  reps
}) => {
  const EarthRadiusInKm = 6357; // Earth's equatorial radius in kilometers
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const [homeSignal, setHomeSignal] = useState(0);
  const [isFlyView, setIsFlyView] = useState(false);
  const surfaceRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const starsRef = useRef<THREE.Points>(null);
  const starlink = useStarlink();
  const cables = useCables();
  const [hoveredNode, setHoveredNode] = useState<RepNode | null>(null);
  const { confirmationHistory: confirmations, feedStatus } = useConfirmations();
  const [launchQueue, setLaunchQueue] = useState<Vector3[]>([]);
  const [isRocketView, setIsRocketView] = useState(false);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const [activeRocketIndex, setActiveRocketIndex] = useState<number | null>(
    null
  ); // Track the active rocket index
  const [rocketCount, setRocketCount] = useState(0);
  const rocketManagerRef = useRef<{
    addRocket: (position: Vector3) => void;
  } | null>(null);
  const [distanceFromEarth, setDistanceFromEarth] = useState<number>(0); // State to hold distance
  const [isStarlinkView, setIsStarlinkView] = useState(false);
  const [activeStarlinkIndex, setActiveStarlinkIndex] = useState<number | null>(
    null
  );
  const [starlinkInfo, setStarlinkInfo] = useState<StarlinkInfo | null>(null);
  const [isStarshipView, setIsStarshipView] = useState(false);
  const [launchSignal, setLaunchSignal] = useState(0);
  const [missionInfo, setMissionInfo] = useState<MissionInfo | null>(null);
  const missionFlying = useRef(false);
  const onMissionInfo = useCallback((i: MissionInfo | null) => {
    missionFlying.current = !!i;
    setMissionInfo(i);
    if (!i) setIsStarshipView(false);
  }, []);
  const launchStarship = useCallback(() => {
    setIsFlyView(false);
    setIsStarlinkView(false);
    setIsRocketView(false);
    setActiveStarlinkIndex(null);
    setActiveRocketIndex(null);
    setLaunchSignal((n) => n + 1);
    setIsStarshipView(true);
  }, []);

  // Feed rate and arc fan-out
  const [currentBPS, setCurrentBPS] = useState<number>(0);
  const [performanceMode, setPerformanceMode] =
    useState<string>('Full Experience');
  const [nodesPercentage, setNodesPercentage] = useState<number>(1.0);

  // Performance update callback
  const handlePerformanceUpdate = useCallback(
    (bps: number, mode: string, percentage: number) => {
      setCurrentBPS(bps);
      setPerformanceMode(mode);
      setNodesPercentage(percentage);
    },
    []
  );

  const toggleRocketView = useCallback(() => {
    setIsRocketView((prev) => !prev);
    // Clear other view states when entering/exiting rocket view
    setIsStarlinkView(false);
    setActiveStarlinkIndex(null);

    if (!isRocketView && rocketCount > 0) {
      setActiveRocketIndex(0);
    } else {
      setActiveRocketIndex(null);
    }
  }, [rocketCount, isRocketView]);

  const moveToNextRocket = useCallback(() => {
    if (isRocketView && rocketCount > 0) {
      setActiveRocketIndex((prevIndex) => {
        if (prevIndex === null) return 0;
        return (prevIndex + 1) % rocketCount;
      });
    }
  }, [isRocketView, rocketCount]);

  const toggleStarlinkView = useCallback(() => {
    setIsStarlinkView((prev) => !prev);
    // Clear other view states when entering/exiting starlink view
    setIsRocketView(false);
    setActiveRocketIndex(null);

    if (!isStarlinkView) {
      setActiveStarlinkIndex(0);
    } else {
      setActiveStarlinkIndex(null);
    }
  }, [isStarlinkView]);

  const moveToNextStarlink = useCallback(() => {
    if (isStarlinkView) {
      setActiveStarlinkIndex((prev) => {
        if (prev === null) return 0;
        return prev + 1; // StarlinkFollow cycles versions
      });
    }
  }, [isStarlinkView]);

  // Deep links: ?fly=lat,lon,altKm[,heading,pitch]&time=ISO
  useEffect(() => {
    const link = parseDeepLink(window.location.search);
    if (link.timeMs !== undefined) setSimTime(link.timeMs);
    if (link.fly) {
      world.flyStart = link.fly;
      setIsFlyView(true);
    }
  }, []);

  const enterFlyView = useCallback(() => {
    setIsStarlinkView(false);
    setIsRocketView(false);
    setActiveStarlinkIndex(null);
    setActiveRocketIndex(null);
    setIsFlyView(true);
  }, []);

  const resetToEarthView = useCallback(() => {
    // Clear all view states
    setIsStarshipView(false);
    setIsFlyView(false);
    setIsStarlinkView(false);
    setIsRocketView(false);
    setActiveStarlinkIndex(null);
    setActiveRocketIndex(null);

    // The camera director glides the camera home.
    setHomeSignal((n) => n + 1);
  }, []);

  useEffect(() => {
    const latestConfirmation = confirmations[0];
    if (latestConfirmation) {
      const isDonation =
        latestConfirmation.message.block.link_as_account ===
        APP_CONFIG.donations.nano;
      const amount = parseNanoAmount(latestConfirmation.message.amount);
      const isSend = latestConfirmation.message.block.subtype === 'send';
      if (isDonation) {
        // Trigger existing donation animation
        if ((window as any).triggerDonationAnimation) {
          (window as any).triggerDonationAnimation(amount);
        }
      }

      // A big send (≥ 1,000 Ӿ) launches a Starship, one at a time.
      if (isSend && amount >= 1000 && !missionFlying.current) setLaunchSignal((n) => n + 1);

      if (isSend) {
        const newRocketCount = Math.max(
          scaleRocketCount(amount),
          rocketCount === 0 ? 1 : 0
        );

        for (let i = 0; i < newRocketCount; i++) {
          const randomPosition = getRandomPositionOnGlobe();
          rocketManagerRef.current?.addRocket(randomPosition);
        }
      }
    }
  }, [confirmations]);

  const handleRocketComplete = (id: string) => {
    setRocketCount((prevCount) => prevCount - 1);
  };

  const handleRocketCountChange = useCallback((count: number) => {
    setRocketCount(count);
    if (count === 0) {
      setIsRocketView(false);
      setActiveRocketIndex(null);
    }
  }, []);

  useEffect(() => {
    if (launchQueue.length > 0 && activeRocketIndex === null) {
      setActiveRocketIndex(0); // Set the first rocket as active only if it's null
    }
  }, [launchQueue, activeRocketIndex]); // Add activeRocketIndex to dependencies

  // Memoize camera settings
  const cameraSettings = useMemo(
    () => ({
      fov: 45,
      near: 0.001,
      far: 1000,
      position: [0, 2, 4] as [number, number, number]
    }),
    []
  );

  // Memoize Stars props
  const starsProps = useMemo(
    () => ({
      radius: 300,
      depth: 60,
      count: 20000,
      factor: 7,
      saturation: 0,
      fade: true
    }),
    []
  );

  // Memoize light settings
  const lightSettings = useMemo(
    () => ({
      directional: {
        color: 0xffffff,
        intensity: 2
      },
      ambient: {
        intensity: 0.1
      }
    }),
    []
  );

  const cameraMode = isFlyView ? 'fly' : isRocketView || isStarlinkView || isStarshipView ? 'follow' : 'globe';
  const inEarthView = !isStarlinkView && !isRocketView && !isFlyView && !isStarshipView;

  return (
    <div className="relative w-screen h-screen">
      <div className="absolute top-1 md:top-4 left-4 md:left-10 z-10 flex-col select-none">
        <span className="text-[30px] md:text-[40px] font-thin font-sans text-[#209ce9]">
          ӾNO
        </span>
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

      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        {/* View Control Buttons - Always stay right-aligned */}
        <div className="flex flex-row gap-2 justify-end">
          {/* Earth View Button - Only show when in StarLink or Rocket view */}
          {!inEarthView && (
            <Button
              onClick={resetToEarthView}
              variant="outline"
              size="sm"
              className="flex select-none items-center gap-2 bg-transparent hover:bg-transparent hover:text-[#209ce9]"
            >
              <Globe className="w-4 h-4 text-blue-400" />
              <span className="hidden md:inline">Earth View</span>
            </Button>
          )}

          {inEarthView && (
            <Button
              onClick={launchStarship}
              variant="outline"
              size="sm"
              className="flex select-none items-center gap-2 bg-transparent hover:bg-transparent hover:text-[#209ce9]"
            >
              <Rocket className="w-4 h-4 text-gray-200" />
              <span className="hidden md:inline">{missionInfo ? 'Starship' : 'Launch Starship'}</span>
            </Button>
          )}

          {/* Free flight - only from Earth view */}
          {inEarthView && (
            <Button
              onClick={enterFlyView}
              variant="outline"
              size="sm"
              className="flex select-none items-center gap-2 bg-transparent hover:bg-transparent hover:text-[#209ce9]"
            >
              <Plane className="w-4 h-4 text-blue-400" />
              <span className="hidden md:inline">Fly</span>
            </Button>
          )}

          {/* StarLink View Button - Only show in Earth view */}
          {inEarthView && (
            <Button
              onClick={toggleStarlinkView}
              variant="outline"
              size="sm"
              className="flex select-none items-center gap-2 bg-transparent hover:bg-transparent hover:text-[#209ce9]"
            >
              <svg
                className="w-4 h-4 text-blue-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0-11V3"
                />
              </svg>
              <span className="hidden md:inline">StarLink View</span>
            </Button>
          )}

          {/* Next StarLink Button - Only show in StarLink view */}
          {isStarlinkView && (
            <Button
              onClick={moveToNextStarlink}
              variant="outline"
              size="sm"
              className="flex select-none items-center gap-2 bg-transparent hover:bg-transparent hover:text-[#209ce9]"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden md:inline">Next StarLink</span>
            </Button>
          )}

          {/* Rocket View Button - Only show in Earth view when rockets are available */}
          {inEarthView && rocketCount > 0 && (
            <Button
              onClick={toggleRocketView}
              variant="outline"
              size="sm"
              className="flex select-none items-center gap-2 bg-transparent hover:bg-transparent hover:text-[#209ce9]"
            >
              <Rocket className="w-4 h-4 text-red-600" />
              <span className="hidden md:inline">Rocket View</span>
            </Button>
          )}

          {/* Next Rocket Button - Only show in Rocket view */}
          {isRocketView && rocketCount > 1 && (
            <Button
              onClick={moveToNextRocket}
              variant="outline"
              size="sm"
              className="flex select-none items-center gap-2 bg-transparent hover:bg-transparent hover:text-[#209ce9]"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden md:inline">Next Rocket</span>
            </Button>
          )}
        </div>

        {/* Rocket Count and Table Container */}
        <div className="flex flex-col gap-2 items-end">
          {/* Performance indicator */}
          {currentBPS > 0 && (
            <div className="flex flex-col items-end gap-1 text-xs">
              <div className="flex items-center gap-2 text-white">
                <span
                  className={`w-2 h-2 rounded-full ${
                    performanceMode === 'Full Experience'
                      ? 'bg-green-400'
                      : performanceMode === 'Balanced'
                      ? 'bg-yellow-400'
                      : performanceMode === 'Performance'
                      ? 'bg-orange-400'
                      : 'bg-red-600'
                  }`}
                ></span>
                {currentBPS.toFixed(2)} conf/s
              </div>
              <div className="text-gray-400">
                {performanceMode} ({(nodesPercentage * 100).toFixed(0)}% nodes)
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-white">
            Active <Rocket className="w-4 h-4 text-red-600" /> {rocketCount}
          </div>
          <ConfirmationHistoryTable />
        </div>
      </div>

      <Canvas
        camera={cameraSettings}
        className="w-full h-full cursor-move pointer-events-auto"
        performance={{ min: 0.5 }} // Add performance optimization
        dpr={[1, 2]} // Limit pixel ratio for better performance
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          // Reversed-Z where EXT_clip_control exists; the near plane also follows altitude.
          reversedDepthBuffer: true,
          alpha: false // Disable alpha for better performance
        }}
      >
        {APP_CONFIG.debug.frameRateDisplay && <Stats />}
        <CameraDirector mode={cameraMode} cameraRef={cameraRef} homeSignal={homeSignal} />
        {process.env.NODE_ENV === 'development' && <DevProbe />}

        {/* Use memo'd Stars props */}
        <Stars ref={starsRef} {...starsProps} />

        {/* Use memo'd light settings */}
        <directionalLight
          ref={lightRef}
          color={lightSettings.directional.color}
          intensity={lightSettings.directional.intensity}
        />
        <ambientLight intensity={lightSettings.ambient.intensity} />

        {/* Conditionally render components based on view state */}
        <ThreeMesh
          surfaceRef={surfaceRef}
          reps={reps}
          onNodeHover={setHoveredNode}
          onPerformanceUpdate={handlePerformanceUpdate}
        />
        <CloudMesh meshRef={cloudRef} />
        <TiledEarth hideWhenActive={[surfaceRef, cloudRef]} />
        <Sky lightRef={lightRef} starsRef={starsRef} />
        {starlink && <StarlinkConstellation data={starlink} />}
        {cables && <CableLines data={cables} />}
        {cables && <NetworkPackets reps={reps} cables={cables} />}
        {/* <AuroraEffect /> */}

        {/* Always render StarlinkMesh */}
        {/* Late loaders: keep the page up while models load */}
        <Suspense fallback={null}>
          <StarlinkFollow active={isStarlinkView} pick={activeStarlinkIndex ?? 0} onInfo={setStarlinkInfo} />
          <StarshipMission launchSignal={launchSignal} follow={isStarshipView} onInfo={onMissionInfo} />

          <DonationAnimation />

          <RocketAnimationManager
            ref={rocketManagerRef}
            cameraRef={cameraRef}
            onRocketComplete={handleRocketComplete}
            onRocketCountChange={handleRocketCountChange}
            isRocketView={isRocketView}
            activeRocketIndex={activeRocketIndex}
            setActiveRocketIndex={setActiveRocketIndex}
            setDistanceFromEarth={setDistanceFromEarth}
          />
        </Suspense>
      </Canvas>

      <div className="absolute top-24 md:top-28 left-4 md:left-10 z-10 hidden sm:block">
        <NetworkPanel starlink={starlink} />
      </div>

      {/* Donation Image Popover */}
      <div className="absolute bottom-6 right-6 z-10">
        <DonationImagePopover />
      </div>

      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-10 text-[10px] text-gray-500 select-none">
        Rep data:{' '}
        <a className="underline hover:text-gray-300" href="https://nano.community" target="_blank" rel="noreferrer">
          nano.community
        </a>{' '}
        · node locations are approximate (from IP) · Imagery: Sentinel-2 cloudless 2016 by{' '}
        <a className="underline hover:text-gray-300" href="https://s2maps.eu" target="_blank" rel="noreferrer">
          EOX
        </a>{' '}
        (CC BY 4.0, contains modified Copernicus Sentinel data) · Terrain: AWS Terrain Tiles
      </div>

      {/* Node info and time warp */}
      <div className="absolute bottom-6 left-4 md:left-16 z-10 flex flex-col gap-2">
        {hoveredNode && (
          <div className="bg-transparent text-white p-4 rounded-lg shadow-lg max-w-sm">
            <h3 className="text-lg font-bold mb-2">
              {hoveredNode.alias || `${hoveredNode.account.slice(0, 12)}…`}
            </h3>
            <p>
              Weight: {formatWeight(hoveredNode.weight)} ({hoveredNode.weightPercent.toFixed(2)}%)
              {!hoveredNode.online && ' · offline'}
            </p>
            {hoveredNode.city && (
              <p className="text-gray-400 text-sm">
                {hoveredNode.city}, {hoveredNode.country} (approx., from node IP)
              </p>
            )}
          </div>
        )}
        <TimeControls />
      </div>

      {isStarlinkView && starlinkInfo && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10 text-center text-xs text-gray-300 select-none">
          <div className="text-base text-white">Starlink #{starlinkInfo.norad}</div>
          <div>{VERSION_NAMES[starlinkInfo.version]} (estimated from launch date) · true scale</div>
          <div>
            {starlinkInfo.altKm.toFixed(0)} km up · {starlinkInfo.speedKms.toFixed(2)} km/s · one orbit every{' '}
            {starlinkInfo.periodMin.toFixed(1)} min
          </div>
          <div className="text-gray-500">
            over {Math.abs(starlinkInfo.lat).toFixed(1)}°{starlinkInfo.lat >= 0 ? 'N' : 'S'}{' '}
            {Math.abs(starlinkInfo.lon).toFixed(1)}°{starlinkInfo.lon >= 0 ? 'E' : 'W'} · real time (use time warp to speed up)
          </div>
        </div>
      )}

      {missionInfo && (isStarshipView || missionInfo.enlarged) && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10 text-center text-xs text-gray-300 select-none">
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

      {isRocketView && (
        <RocketViewText
          distanceFromEarth={distanceFromEarth}
          EarthRadiusInKm={EarthRadiusInKm}
        />
      )}
    </div>
  );
};

export default ThreeSceneClient;
