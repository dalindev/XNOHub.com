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
  setActiveRocketIndex: (index: number | null) => void;
  setDistanceFromEarth: (distance: number) => void;
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
      setActiveRocketIndex,
      setDistanceFromEarth
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
        setRockets((prevRockets) => {
          const index = prevRockets.findIndex((rocket) => rocket.id === id);
          if (index === -1) return prevRockets;

          const newRockets = prevRockets.filter((_, i) => i !== index);

          // Update activeRocketIndex if necessary
          if (activeRocketIndex !== null) {
            if (index === activeRocketIndex) {
              // If the removed rocket was the active one, move to the last rocket in the array
              if (newRockets.length > 0) {
                setActiveRocketIndex(newRockets.length - 1);
              } else {
                setActiveRocketIndex(null);
              }
            } else if (index < activeRocketIndex) {
              // If a rocket before the active one was removed, decrement the index
              setActiveRocketIndex(activeRocketIndex - 1);
            }
          }

          return newRockets;
        });
        onRocketComplete(id);
      },
      [activeRocketIndex, setActiveRocketIndex, onRocketComplete]
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
            setDistanceFromEarth={setDistanceFromEarth}
          />
        ))}
      </>
    );
  }
);

RocketAnimationManager.displayName = 'RocketAnimationManager';

export default RocketAnimationManager;
