'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import ThreeMesh from './three-mesh';
import { CloudMesh } from './three-cloud-mesh';
import { Rep } from './page';

interface ThreeSceneProps {
  data: Rep[] | null;
}

const ThreeScene: React.FC<ThreeSceneProps> = ({ data }) => {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [timeOffset, setTimeOffset] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update time every second

    return () => clearInterval(timer);
  }, []);

  const adjustTime = (date: Date, hoursOffset: number): Date => {
    const newDate = new Date(date);
    newDate.setHours(newDate.getHours() + hoursOffset);
    return newDate;
  };

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = event.target.value.split(':').map(Number);
    const newTime = new Date(currentTime);
    newTime.setHours(hours, minutes, 0, 0);
    setCurrentTime(newTime);
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month, day] = event.target.value.split('-').map(Number);
    const newTime = new Date(currentTime);
    newTime.setFullYear(year, month - 1, day);
    setCurrentTime(newTime);
  };

  const handleOffsetChange = (offset: number) => {
    setTimeOffset((prevOffset) => prevOffset + offset);
  };

  const simulatedTime = adjustTime(currentTime, timeOffset);

  return (
    <div>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000 }}>
        <input
          type="date"
          onChange={handleDateChange}
          value={currentTime.toISOString().split('T')[0]}
        />
        <input
          type="time"
          onChange={handleTimeChange}
          value={`${currentTime
            .getHours()
            .toString()
            .padStart(2, '0')}:${currentTime
            .getMinutes()
            .toString()
            .padStart(2, '0')}`}
        />
        <button onClick={() => handleOffsetChange(-5)}>-5 Hours</button>
        <button onClick={() => handleOffsetChange(5)}>+5 Hours</button>
        <span>Time Offset: {timeOffset} hours</span>
        <div>Simulated Time: {simulatedTime.toLocaleString()}</div>
      </div>
      <Canvas
        camera={{
          fov: 45,
          position: [0, 0, 3]
        }}
        style={{
          cursor: 'move'
        }}
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
        <directionalLight ref={lightRef} color={0xffffff} intensity={1.5} />
        <ambientLight intensity={0.1} />
        <ThreeMesh
          lightRefs={[lightRef]}
          data={data}
          manualTime={simulatedTime}
        />
        <CloudMesh />
      </Canvas>
    </div>
  );
};

export default ThreeScene;
