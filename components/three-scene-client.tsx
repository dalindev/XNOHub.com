'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { IRepData } from '@/types/index';
import ThreeMesh from '@/components/three-mesh';
import { CloudMesh } from '@/components/three-cloud-mesh';
import { ConfirmationHistoryTable } from '@/components/confirmation-history-table';
import { DonationImagePopover } from '@/components/donation-image-popover';
import { useConfirmations } from '@/providers/confirmation-provider';
import { DonationAnimation } from '@/components/donation-animation';
import { NANO_LIVE_ENV } from '@/constants/nano-live-env';
import { parseNanoAmount } from '@/lib/parse-nano-amount';
import { Falcon9Animation } from '@/components/falcon9-animation';
import { Vector3 } from 'three';
import { scaleRocketCount } from '@/lib/scale-rocket-count'; // We'll create this function
import { Button } from '@/components/ui/button';
import { Rocket } from 'lucide-react';
import { Globe } from 'lucide-react'; // Import the globe icon
import { ChevronRight } from 'lucide-react'; // Import the right chevron icon
import { Eye } from 'lucide-react'; // Import the eye icon

// Add this function to generate a random position on the globe
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
        NANO_LIVE_ENV.donationAccount;
      const amount = parseNanoAmount(latestConfirmation.message.amount);
      const isSend = latestConfirmation.message.block.subtype === 'send';
      if (isDonation) {
        // Trigger existing donation animation
        if ((window as any).triggerDonationAnimation) {
          (window as any).triggerDonationAnimation(amount);
        }
      }

      if (isSend) {
        // Send only to avoid duplicate launches
        const rocketCount = scaleRocketCount(amount);
        if (rocketCount <= 0) return;
        const newPositions = Array.from({ length: rocketCount }, () =>
          getRandomPositionOnGlobe()
        );
        setLaunchQueue((prevQueue) => [...prevQueue, ...newPositions]);
      }
    }
  }, [confirmations]);

  const toggleRocketView = () => {
    setIsRocketView(!isRocketView);
  };

  useEffect(() => {
    if (launchQueue.length > 0 && activeRocketIndex === null) {
      setActiveRocketIndex(0); // Set the first rocket as active
    }
  }, [launchQueue]);

  const handleNextRocket = () => {
    if (launchQueue.length > 0) {
      setActiveRocketIndex((prevIndex) => {
        // Cycle through rockets
        const nextIndex =
          (prevIndex !== null ? prevIndex + 1 : 0) % launchQueue.length;
        return nextIndex;
      });
    }
  };

  if (!serverDateTime) {
    return null;
  }

  return (
    <div className="relative w-screen h-screen">
      <div className="absolute top-1 md:top-4 left-4 md:left-10 z-10 flex-col">
        <span className="text-[30px] md:text-[40px] font-thin font-sans text-[#209ce9]">
          ӾNO
        </span>
        <span className="text-[30px] md:text-[40px] text-gray-200">Hub</span>
      </div>

      <div className="absolute top-4 right-4 z-10 flex flex-row gap-2 pointer-events-none">
        <div className="bottom-4 right-4 z-10 flex flex-col gap-2">
          {launchQueue.length > 0 && ( // Conditionally render the button
            <>
              <Button
                onClick={toggleRocketView}
                variant="outline"
                size="sm"
                className="flex select-none items-center gap-2 bg-transparent hover:bg-transparent hover:text-[#209ce9] pointer-events-auto"
              >
                {isRocketView ? (
                  <Globe className="w-4 h-4 text-blue-400" /> // Use the globe icon for default view
                ) : (
                  <Rocket className="w-4 h-4 text-red-600" />
                )}
                <span className="hidden md:inline">
                  {isRocketView ? 'Default View' : 'Rocket View'}
                </span>
              </Button>
              {/* Display active rockets count */}
              <Button
                onClick={handleNextRocket} // Button to switch to the next rocket
                variant="outline"
                size="sm"
                className="flex select-none items-center gap-2 bg-transparent hover:bg-transparent hover:text-[#209ce9] pointer-events-auto"
              >
                <Eye className="w-4 h-4 text-green-400" />{' '}
                {/* Use the eye icon */}
                <span className="hidden md:inline">Next Falcon</span>
              </Button>
            </>
          )}
          <div>
            <div className="text-white font-semibold flex flex-row gap-2 justify-center items-center">
              <span className="hidden md:inline">Active</span>
              <Rocket className="w-5 h-5 text-red-600" /> {launchQueue.length}
            </div>{' '}
          </div>
        </div>
        <ConfirmationHistoryTable />
      </div>

      <Canvas
        camera={{
          fov: 45,
          position: [0, 2, 4]
        }}
        className="w-full h-full cursor-move pointer-events-auto"
      >
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
        <DonationAnimation />
        {/* <Falcon9Animation /> */}
        {launchQueue.map((position, index) => (
          <Falcon9Animation
            key={index}
            initialPosition={position}
            onComplete={() => {
              setLaunchQueue((prevQueue) =>
                prevQueue.filter((_, i) => i !== index)
              );
              // Only reset active rocket if it completes and is the active one
              if (activeRocketIndex === index) {
                setActiveRocketIndex((prevIndex) => {
                  // If there are still rockets left, set to the next one
                  if (
                    prevIndex !== null &&
                    prevIndex < launchQueue.length - 1
                  ) {
                    return prevIndex; // Stay on the same rocket
                  }
                  return null; // Reset if no rockets left
                });
              }
            }}
            isRocketView={isRocketView}
            cameraRef={cameraRef}
            active={activeRocketIndex === index} // Pass active state to the animation
          />
        ))}
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
    </div>
  );
};

export default ThreeSceneClient;
