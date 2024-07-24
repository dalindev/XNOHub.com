'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { IRepData } from '@/types/index';
import ThreeMesh from '@/components/three-mesh';
import { CloudMesh } from '@/components/three-cloud-mesh';
import { ConfirmationHistoryTable } from '@/components/confirmation-history-table';

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
  const [timeOffset, setTimeOffset] = useState(0);
  const [isControlsVisible, setIsControlsVisible] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<IRepData | null>(null);
  const [selectedNode, setSelectedNode] = useState<IRepData | null>(null);

  useEffect(() => {
    if (serverDateTime) {
      setSimulationTime(serverDateTime);
    }
  }, [serverDateTime]);

  const adjustTime = (date: Date, hoursOffset: number): Date => {
    const newDate = new Date(date);
    newDate.setUTCHours(newDate.getUTCHours() + hoursOffset);
    return newDate;
  };

  const handleOffsetChange = (offset: number) => {
    setTimeOffset((prevOffset) => {
      const newOffset = prevOffset + offset;
      setSimulationTime((prevTime) => adjustTime(prevTime, offset));
      return newOffset;
    });
  };

  const handleResetToCurrentTime = () => {
    const currentTime = new Date();
    setSimulationTime(currentTime);
    setTimeOffset(0);
  };

  if (!serverDateTime) {
    return null;
  }

  return (
    <div className="relative w-screen h-screen">
      {/* Collapsible Time controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col">
        <button
          onClick={() => setIsControlsVisible(!isControlsVisible)}
          className={`bg-transparent text-gray-400 px-4 py-2 w-full border-[1px] border-blue-600`}
        >
          {isControlsVisible ? 'Hide Time Controls' : 'Show Time Controls'}
        </button>
        <div
          className={`bg-gray-800 bg-opacity-70 w-[275px] rounded-b-lg p-4 text-white transition-all duration-300 ease-in-out overflow-hidden ${
            isControlsVisible
              ? 'max-h-96 opacity-100'
              : 'py-0 h-0 max-h-0 opacity-0'
          }`}
        >
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <button
                onClick={() => handleOffsetChange(-1)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
              >
                -1 Hour
              </button>
              <button
                onClick={() => handleOffsetChange(1)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
              >
                +1 Hour
              </button>
            </div>
            <div>Time Offset: {timeOffset} hours</div>
            <div className="w-[500px]">{simulationTime.toUTCString()}</div>
            <button
              onClick={handleResetToCurrentTime}
              className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded w-full"
            >
              Reset to Current Time
            </button>
          </div>
        </div>
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
          onNodeClick={setSelectedNode}
        />
        <CloudMesh />
      </Canvas>

      {/* Node Info */}
      <div className="absolute bottom-4 right-4 z-10">
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
