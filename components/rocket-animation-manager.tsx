import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle
} from 'react';
import { Vector3 } from 'three';
import { Falcon9Animation } from '@/components/falcon9-animation';

interface RocketData {
  id: string;
  position: Vector3;
  startTime: number;
}

interface RocketAnimationManagerProps {
  cameraRef: React.RefObject<THREE.PerspectiveCamera>;
  onRocketComplete: (id: string) => void;
  onRocketCountChange: (count: number) => void;
  isRocketView: boolean;
  activeRocketIndex: number | null;
  setDistanceFromEarth: (distance: number) => void; // Add this prop
}

export interface RocketAnimationManagerRef {
  addRocket: (position: Vector3) => void;
}

const RocketAnimationManager = forwardRef<
  RocketAnimationManagerRef,
  RocketAnimationManagerProps
>(
  (
    {
      cameraRef,
      onRocketComplete,
      onRocketCountChange,
      isRocketView,
      activeRocketIndex,
      setDistanceFromEarth // Destructure the prop
    },
    ref
  ) => {
    const [rockets, setRockets] = useState<RocketData[]>([]);
    const rocketIdCounter = useRef(0);

    const addRocket = useCallback((position: Vector3) => {
      const newRocket: RocketData = {
        id: `rocket-${rocketIdCounter.current++}`,
        position,
        startTime: Date.now()
      };
      setRockets((prevRockets) => [...prevRockets, newRocket]);
    }, []);

    const removeRocket = useCallback(
      (id: string) => {
        setRockets((prevRockets) =>
          prevRockets.filter((rocket) => rocket.id !== id)
        );
        onRocketComplete(id);
      },
      [onRocketComplete]
    );

    useEffect(() => {
      onRocketCountChange(rockets.length);
    }, [rockets.length, onRocketCountChange]);

    useImperativeHandle(ref, () => ({
      addRocket
    }));

    return (
      <>
        {rockets.map((rocket, index) => (
          <Falcon9Animation
            key={rocket.id}
            initialPosition={rocket.position}
            onComplete={() => removeRocket(rocket.id)}
            isRocketView={isRocketView && index === activeRocketIndex}
            cameraRef={cameraRef}
            setDistanceFromEarth={setDistanceFromEarth} // Pass the setter function
          />
        ))}
      </>
    );
  }
);

RocketAnimationManager.displayName = 'RocketAnimationManager';

export default RocketAnimationManager;
