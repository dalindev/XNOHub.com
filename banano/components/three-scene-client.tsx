'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  Stars,
  PerspectiveCamera,
  Stats
} from '@react-three/drei';
import * as THREE from 'three';
import { IRepData } from '@/types/index';
import ThreeMesh from '@/banano/components/three-mesh';
import { CloudMesh } from '@/components/three-cloud-mesh';
import { BananoConfirmationHistoryTable } from '@/banano/components/banano-confirmation-history-table';
import { DonationImagePopover } from '@/banano/components/donation-image-popover';
import { useBananoConfirmations } from '@/banano/providers/banano-confirmation-provider';
import { DonationAnimation } from '@/banano/components/donation-animation';
import { APP_CONFIG } from '@/constants/config';
import { parseBananoAmount } from '@/banano/lib/parse-banano-amount';
import { Vector3 } from 'three';
import { bananoScaleRocketCount } from '@/banano/lib/banano-scale-rocket-count';
import { Button } from '@/components/ui/button';
import { Rocket, Eye, Globe } from 'lucide-react';
import RocketAnimationManager from '@/banano/components/rocket-animation-manager';
import { StarlinkMesh } from '@/components/starlink-mesh';
import { BananoRocketViewText } from '@/banano/components/banano-rocket-view-text';

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
  const { confirmationHistory: confirmations } = useBananoConfirmations();
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

  const toggleRocketView = useCallback(() => {
    setIsRocketView((prev) => !prev);
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
        APP_CONFIG.donations.banano;
      const amount = parseBananoAmount(latestConfirmation.message.amount);
      const isSend = latestConfirmation.message.block.subtype === 'send';
      if (isDonation) {
        // Trigger existing donation animation
        if ((window as any).triggerDonationAnimation) {
          (window as any).triggerDonationAnimation(amount);
        }
      }

      if (isSend) {
        const newRocketCount = Math.max(
          bananoScaleRocketCount(amount),
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

  // New function to reset to Earth view
  const resetToEarthView = () => {
    setIsRocketView(false);

    setTimeout(() => {
      if (cameraRef.current) {
        cameraRef.current.position.set(0, 0, 5);
        cameraRef.current.lookAt(new THREE.Vector3(0, 0, 0)); // Look at the center of the Earth
      }
    }, 100);
  };

  if (!serverDateTime) {
    return null;
  }

  return (
    <div className="relative w-screen h-screen">
      <div className="absolute top-1 md:top-4 left-4 md:left-10 z-10 flex-col select-none">
        <span className="text-[30px] md:text-[40px] font-thin font-sans text-yellow-300">
          BAN
        </span>
        <span className="text-[30px] md:text-[40px] text-gray-200">Hub</span>
      </div>

      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <div className="flex flex-row gap-2">
          {/* New button to reset to Earth view */}
          {distanceFromEarth > 10 && (
            <Button
              onClick={resetToEarthView}
              variant="outline"
              size="sm"
              className="flex select-none items-center gap-2 bg-transparent hover:bg-transparent hover:text-[#209ce9]"
            >
              Back to Earth
            </Button>
          )}
          <Button
            onClick={toggleRocketView}
            variant="outline"
            size="sm"
            className="flex select-none items-center gap-2 bg-transparent hover:bg-transparent hover:text-[#209ce9]"
          >
            {isRocketView ? (
              <Globe className="w-4 h-4 text-blue-400" />
            ) : (
              <Rocket className="w-4 h-4 text-red-600" />
            )}
            <span className="hidden md:inline text-center">
              {isRocketView ? 'Abort Mission' : 'Rocket View'}
            </span>
          </Button>
          {isRocketView && (
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
        <div className="flex items-center gap-2 text-white">
          Active <Rocket className="w-4 h-4 text-red-600" /> {rocketCount}
        </div>
        <BananoConfirmationHistoryTable />
      </div>

      <Canvas
        camera={{
          fov: 45,
          position: [0, 2, 4]
        }}
        className="w-full h-full cursor-move pointer-events-auto"
      >
        {APP_CONFIG.debug.frameRateDisplay && <Stats />}
        <PerspectiveCamera
          makeDefault
          ref={cameraRef}
          fov={45}
          position={[0, 2, 4]}
        />
        <OrbitControls
          enableRotate={!isRocketView}
          rotateSpeed={0.5}
          enableZoom={!isRocketView}
          zoomSpeed={0.6}
          enablePan={false}
        />
        <Stars
          radius={300}
          depth={60}
          count={20000}
          factor={7}
          saturation={0}
          fade={true}
        />
        <directionalLight ref={lightRef} color={0xffffff} intensity={2} />
        <ambientLight intensity={0.1} />
        <ThreeMesh
          lightRefs={[lightRef]}
          repsGeoInfo={repsGeoInfo}
          manualTime={simulationTime}
          onNodeHover={setHoveredNode}
        />
        <CloudMesh />
        <StarlinkMesh count={6} />
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
        <BananoRocketViewText
          distanceFromEarth={distanceFromEarth}
          EarthRadiusInKm={EarthRadiusInKm}
        />
      )}
    </div>
  );
};

export default ThreeSceneClient;
