'use client';

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo
} from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  Stars,
  PerspectiveCamera,
  Stats
} from '@react-three/drei';
import * as THREE from 'three';
import { IRepData } from '@/types/index';
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
import { Rocket, Eye, Globe } from 'lucide-react';
import RocketAnimationManager from '@/components/rocket-animation-manager';
import { APP_CONFIG } from '@/constants/config';
import { StarlinkMesh } from '@/components/starlink-mesh';
import { RocketViewText } from '@/components/rocket-view-text';
import GitHubStatsOverlay from '@/components/github-stats-overlay';
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
  repsGeoInfo: IRepData[];
  serverDateTime: Date | null;
}

const ThreeSceneClient: React.FC<ThreeSceneClientProps> = ({
  repsGeoInfo,
  serverDateTime
}) => {
  const EarthRadiusInKm = 6357; // Earth's equatorial radius in kilometers
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const [simulationTime, setSimulationTime] = useState<Date>(
    serverDateTime || new Date()
  );
  const [hoveredNode, setHoveredNode] = useState<IRepData | null>(null);
  const { confirmationHistory: confirmations } = useConfirmations();
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
        return (prev + 1) % 6; // Assuming 6 satellites
      });
    }
  }, [isStarlinkView]);

  const resetToEarthView = useCallback(() => {
    // Clear all view states
    setIsStarlinkView(false);
    setIsRocketView(false);
    setActiveStarlinkIndex(null);
    setActiveRocketIndex(null);

    // Reset camera position
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 0, 5);
      cameraRef.current.lookAt(new THREE.Vector3(0, 0, 0));
    }
  }, []);

  useEffect(() => {
    if (serverDateTime) {
      setSimulationTime(serverDateTime);
    }
  }, [serverDateTime]);

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

  // Memoize OrbitControls props
  const orbitControlsProps = useMemo(
    () => ({
      enableRotate: !isRocketView && !isStarlinkView,
      rotateSpeed: 0.5,
      enableZoom: !isRocketView && !isStarlinkView,
      zoomSpeed: 0.6,
      enablePan: false
    }),
    [isRocketView, isStarlinkView]
  );

  if (!serverDateTime) {
    return null;
  }

  return (
    <div className="relative w-screen h-screen">
      <div className="absolute top-1 md:top-4 left-4 md:left-10 z-10 flex-col select-none">
        <span className="text-[30px] md:text-[40px] font-thin font-sans text-[#209ce9]">
          ӾNO
        </span>
        <span className="text-[30px] md:text-[40px] text-gray-200">Hub</span>
      </div>

      {/* Navigation Buttons */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-4">
        <div className="flex gap-2">
          {/* Replace all view buttons with date-time display */}
          <div className="flex flex-col items-end">
            <div className="text-xs text-gray-400">Date &amp; Time</div>
            <div className="text-sm text-white">
              {typeof serverDateTime === 'object'
                ? serverDateTime.toLocaleString()
                : serverDateTime}
            </div>
          </div>
        </div>

        {/* Rocket Count and Table Container */}
        <div className="flex flex-col gap-2 items-end">
          {/* Remove rocket count, it's now in the bottom panel */}
        </div>
      </div>

      {/* Transaction Stream (Confirmation History Table) */}
      <div
        className="absolute top-20 right-4 bottom-20 z-10 flex flex-col"
        style={{ height: 'calc(100vh - 180px)' }}
      >
        <ConfirmationHistoryTable />
      </div>

      <Canvas
        camera={cameraSettings}
        className="w-full h-full cursor-move pointer-events-auto"
        performance={{ min: 0.5 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false
        }}
        style={{ zIndex: 1 }} // Lower z-index to ensure it's below overlays
      >
        {APP_CONFIG.debug.frameRateDisplay && <Stats />}
        <PerspectiveCamera makeDefault ref={cameraRef} {...cameraSettings} />
        <OrbitControls {...orbitControlsProps} />

        {/* Use memo'd Stars props */}
        <Stars {...starsProps} />

        {/* Use memo'd light settings */}
        <directionalLight
          ref={lightRef}
          color={lightSettings.directional.color}
          intensity={lightSettings.directional.intensity}
        />
        <ambientLight intensity={lightSettings.ambient.intensity} />

        {/* Conditionally render components based on view state */}
        <ThreeMesh
          lightRefs={[lightRef]}
          repsGeoInfo={repsGeoInfo}
          manualTime={simulationTime}
          onNodeHover={setHoveredNode}
        />
        <CloudMesh />
        {/* <AuroraEffect /> */}

        {/* Always render StarlinkMesh */}
        <StarlinkMesh
          count={6}
          isStarlinkView={isStarlinkView}
          activeStarlinkIndex={activeStarlinkIndex}
          cameraRef={cameraRef}
        />

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
      </Canvas>

      {/* Donation Image Popover */}
      <div className="absolute bottom-6 right-6 z-10">
        <DonationImagePopover />
      </div>

      {/* GitHub Stats Overlay */}
      <GitHubStatsOverlay
        repoOwner="nanocurrency"
        repoName="nano-node"
        isVisible={!isStarlinkView && !isRocketView}
        isRocketView={isRocketView}
        isStarlinkView={isStarlinkView}
        rocketCount={rocketCount}
        resetToEarthView={resetToEarthView}
        toggleStarlinkView={toggleStarlinkView}
        toggleRocketView={toggleRocketView}
        moveToNextStarlink={moveToNextStarlink}
        moveToNextRocket={moveToNextRocket}
      />

      {/* Node Info */}
      <div className="absolute bottom-4 left-4 z-10">
        {hoveredNode && (
          <div className="bg-transparent text-white p-4 rounded-lg shadow-lg max-w-sm">
            <h3 className="text-lg font-bold mb-2">
              {hoveredNode.account_formatted ||
                hoveredNode.alias ||
                'Unknown Node'}
            </h3>
            <p>Weight: {hoveredNode.weight_formatted}</p>
          </div>
        )}
      </div>

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
