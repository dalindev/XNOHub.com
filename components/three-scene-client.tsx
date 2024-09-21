'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
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
      if (isDonation) {
        // Trigger existing donation animation
        if ((window as any).triggerDonationAnimation) {
          (window as any).triggerDonationAnimation(amount);
        }
      }

      if (amount > 1) {
        // Generate a random position for the rocket launch
        const position = getRandomPositionOnGlobe();
        setLaunchQueue((prevQueue) => [...prevQueue, position]);
      }
    }
  }, [confirmations]);

  if (!serverDateTime) {
    return null;
  }

  return (
    <div className="relative w-screen h-screen">
      <div className="absolute top-1 md:top-4 left-4 md:left-10 z-10 flex-col">
        <span className="text-[40px] font-thin font-sans text-[#209ce9]">
          ӾNO
        </span>
        <span className="text-[40px] text-gray-200">Hub</span>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <ConfirmationHistoryTable />
      </div>

      {/* Canvas */}
      <Canvas
        camera={{
          fov: 45,
          position: [0, 2, 4]
        }}
        className="w-full h-full cursor-move"
      >
        <OrbitControls
          enableRotate={true}
          rotateSpeed={0.5}
          enableZoom={true}
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
            }}
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
