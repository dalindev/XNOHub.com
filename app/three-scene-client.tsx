'use client';

import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import ThreeMesh from './three-mesh';
import { CloudMesh } from './three-cloud-mesh';
import { Rep } from './page';

interface ThreeSceneClientProps {
  data: Rep[];
  serverDateTime: Date;
}

const ThreeSceneClient: React.FC<ThreeSceneClientProps> = ({
  data,
  serverDateTime
}) => {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const [simulationTime, setSimulationTime] = useState<Date>(serverDateTime);
  const [timeOffset, setTimeOffset] = useState(0);
  const [isControlsVisible, setIsControlsVisible] = useState(false);

  // useEffect(() => {
  //   const timer = setInterval(() => {
  //     setSimulationTime((prevTime) => {
  //       const newTime = new Date(prevTime);
  //       newTime.setSeconds(newTime.getSeconds() + 1);
  //       return newTime;
  //     });
  //   }, 1000);

  //   return () => clearInterval(timer);
  // }, []);

  const adjustTime = (date: Date, hoursOffset: number): Date => {
    const newDate = new Date(date);
    newDate.setUTCHours(newDate.getUTCHours() + hoursOffset);
    return newDate;
  };

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = event.target.value.split(':').map(Number);
    setSimulationTime((prevTime) => {
      const newTime = new Date(prevTime);
      newTime.setUTCHours(hours, minutes, 0, 0);
      return newTime;
    });
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month, day] = event.target.value.split('-').map(Number);
    setSimulationTime((prevTime) => {
      const newTime = new Date(prevTime);
      newTime.setUTCFullYear(year, month - 1, day);
      return newTime;
    });
  };

  const handleOffsetChange = (offset: number) => {
    setTimeOffset((prevOffset) => {
      const newOffset = prevOffset + offset;
      setSimulationTime((prevTime) => adjustTime(prevTime, offset));
      return newOffset;
    });
  };

  const handleResetToCurrentTime = () => {
    setSimulationTime(new Date());
    setTimeOffset(0);
  };

  return (
    <div className="relative w-screen h-screen">
      {/* Collapsible Time controls */}
      <div className="absolute top-4 left-4 z-10">
        <button
          onClick={() => setIsControlsVisible(!isControlsVisible)}
          className={`bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 ${
            isControlsVisible ? 'rounded-t-lg' : 'rounded-lg'
          }  w-full`}
        >
          {isControlsVisible ? 'Hide Controls' : 'Show Controls'}
        </button>
        <div
          className={`bg-gray-800 bg-opacity-70 p-4 rounded-b-lg text-white transition-all duration-300 ease-in-out overflow-hidden ${
            isControlsVisible ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="space-y-2">
            <input
              type="date"
              onChange={handleDateChange}
              value={simulationTime.toISOString().split('T')[0]}
              className="w-full p-1 text-gray-800 rounded"
            />
            <input
              type="time"
              onChange={handleTimeChange}
              value={`${simulationTime
                .getUTCHours()
                .toString()
                .padStart(2, '0')}:${simulationTime
                .getUTCMinutes()
                .toString()
                .padStart(2, '0')}`}
              className="w-full p-1 text-gray-800 rounded"
            />
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
            <div className="">{simulationTime.toUTCString()}</div>
            <button
              onClick={handleResetToCurrentTime}
              className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded w-full"
            >
              Reset to Current Time
            </button>
          </div>
        </div>
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
        <directionalLight ref={lightRef} color={0xffffff} intensity={2.5} />
        <ambientLight intensity={0.2} />
        <ThreeMesh
          lightRefs={[lightRef]}
          data={data}
          manualTime={simulationTime}
        />
        <CloudMesh />
      </Canvas>
    </div>
  );
};

export default ThreeSceneClient;
