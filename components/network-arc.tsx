import React, { useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { IRepData } from '@/types/index';
import { parseNanoAmount } from '@/lib/parse-nano-amount';
import { useConfirmations } from '@/providers/confirmation-provider';
import {
  getStyleByNanoAmount,
  StyleByAmount
} from '@/lib/get-style-by-nano-amount';

// Adjustable parameters
const BROADCAST_ARC_LIFT_RATE = 1.15; // Lift rate for outgoing arcs
const CONFIRMATION_ARC_LIFT_RATE = 1.15; // Lift rate for returning arcs (lower for shorter arcs)
const ARC_POINTS = 50;
const BROADCAST_ARC_SEGMENT_LENGTH = 0.1;
const CONFIRMATION_ARC_SEGMENT_LENGTH = 0.05;
const BROADCAST_DURATION = 200;
const CONFIRMATION_DURATION = 200;

interface NetworkArcsProps {
  nodes: IRepData[];
  earthRadius: number;
}

interface IArc {
  broadcastPoints: THREE.Vector3[];
  confirmationPoints: THREE.Vector3[];
  progress: number;
  broadcastDuration: number;
  confirmationDuration: number;
  broadcastStyle: StyleByAmount;
  confirmationStyle: StyleByAmount;
  startTime: number;
  isReturning: boolean;
}

const NetworkArcs: React.FC<NetworkArcsProps> = ({ nodes, earthRadius }) => {
  const { activeConfirmations } = useConfirmations();
  const [arcs, setArcs] = useState<IArc[]>([]);

  const createArcStyles = (amount: number) => {
    const baseStyle = getStyleByNanoAmount(amount);
    return {
      broadcast: {
        ...baseStyle
      },
      confirmation: {
        color: new THREE.Color('#00FF00'),
        lineWidth: 1,
        opacity: 0.6,
        hexColor: '#00FF00'
      }
    };
  };

  useEffect(() => {
    if (activeConfirmations.length === 0 || nodes.length < 2) return;

    const newArcs = activeConfirmations.flatMap((confirmation) => {
      const representativeAccount = confirmation.message.block.representative;
      const amount = parseNanoAmount(confirmation.message.amount);
      const sourceNode =
        nodes.find((node) => node.account === representativeAccount) ??
        nodes[Math.floor(Math.random() * nodes.length)];
      const sourcePos = latLongToVector3(
        sourceNode.latitude,
        sourceNode.longitude,
        earthRadius
      );

      const { broadcast: broadcastStyle, confirmation: confirmationStyle } =
        createArcStyles(amount);

      return nodes
        .filter((targetNode) => targetNode.account !== representativeAccount)
        .map((targetNode) => {
          const targetPos = latLongToVector3(
            targetNode.latitude,
            targetNode.longitude,
            earthRadius
          );
          const broadcastPoints = createGreatCircleArc(
            sourcePos,
            targetPos,
            earthRadius,
            ARC_POINTS,
            BROADCAST_ARC_LIFT_RATE
          );
          const confirmationPoints = createGreatCircleArc(
            targetPos,
            sourcePos,
            earthRadius,
            ARC_POINTS,
            CONFIRMATION_ARC_LIFT_RATE
          );

          const randomDurationMultiplier = 0.25 + Math.random() * 1.5;

          return {
            broadcastPoints,
            confirmationPoints,
            progress: 0,
            broadcastDuration:
              (BROADCAST_DURATION * randomDurationMultiplier) / 1000,
            confirmationDuration:
              (CONFIRMATION_DURATION * randomDurationMultiplier) / 1000,
            broadcastStyle,
            confirmationStyle,
            startTime: Date.now(),
            isReturning: false
          };
        });
    });

    setArcs((currentArcs) => [
      ...currentArcs,
      ...newArcs.map(
        (arc) =>
          ({
            ...arc,
            confirmationStyle: {
              ...arc.confirmationStyle,
              color: arc.confirmationStyle.color.getHex() // Convert Color to number
            }
          } as IArc)
      )
    ]);
  }, [activeConfirmations, nodes, earthRadius]);

  useFrame((state, delta) => {
    setArcs((currentArcs) =>
      currentArcs
        .map((arc) => {
          const elapsedTime = (Date.now() - arc.startTime) / 1000;
          const duration = arc.isReturning
            ? arc.confirmationDuration
            : arc.broadcastDuration;
          let newProgress = elapsedTime / duration;

          if (newProgress >= 1) {
            if (arc.isReturning) {
              return null; // Remove completed arcs
            } else {
              // Start the return journey
              return {
                ...arc,
                progress: 0,
                startTime: Date.now(),
                isReturning: true
              };
            }
          }

          return { ...arc, progress: newProgress };
        })
        .filter((arc): arc is IArc => arc !== null)
    );
  });

  return (
    <group>
      {arcs.map((arc, index) => (
        <AnimatedArc
          key={`${index}-${arc.isReturning ? 'return' : 'outgoing'}`}
          points={
            arc.isReturning ? arc.confirmationPoints : arc.broadcastPoints
          }
          progress={arc.progress}
          style={arc.isReturning ? arc.confirmationStyle : arc.broadcastStyle}
          segmentLength={
            arc.isReturning
              ? getRandomSegmentLength(CONFIRMATION_ARC_SEGMENT_LENGTH)
              : getRandomSegmentLength(BROADCAST_ARC_SEGMENT_LENGTH)
          }
        />
      ))}
    </group>
  );
};

const latLongToVector3 = (
  lat: number,
  long: number,
  radius: number
): THREE.Vector3 => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (long + 180) * (Math.PI / 180);

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
};

const createGreatCircleArc = (
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  numPoints: number = 50,
  maxLiftRate: number = 1.2
): THREE.Vector3[] => {
  const points: THREE.Vector3[] = [];
  const startNormal = start.clone().normalize();
  const endNormal = end.clone().normalize();

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const dot = startNormal.dot(endNormal);
    const omega = Math.acos(Math.min(Math.max(dot, -1), 1));
    const sinOmega = Math.sin(omega);

    if (sinOmega === 0) {
      points.push(start.clone());
    } else {
      const weight0 = Math.sin((1 - t) * omega) / sinOmega;
      const weight1 = Math.sin(t * omega) / sinOmega;

      // Calculate a lift factor that's highest in the middle and lowest at the ends
      const liftFactor = Math.sin(t * Math.PI) * (maxLiftRate - 1) + 1;

      const point = new THREE.Vector3()
        .addScaledVector(startNormal, weight0)
        .addScaledVector(endNormal, weight1)
        .normalize()
        .multiplyScalar(radius * liftFactor);
      points.push(point);
    }
  }

  return points;
};

interface AnimatedArcProps {
  points: THREE.Vector3[];
  progress: number;
  style: StyleByAmount;
  segmentLength: number;
}

const AnimatedArc: React.FC<AnimatedArcProps> = ({
  points,
  progress,
  style: { color, opacity = 0.8, lineWidth = 1 },
  segmentLength
}) => {
  const visibleSegment = useMemo(() => {
    const totalLength = getTotalArcLength(points);
    const currentPosition = progress * totalLength;
    const segmentStart = Math.max(
      0,
      currentPosition - (segmentLength * totalLength) / 2
    );
    const segmentEnd = Math.min(
      totalLength,
      currentPosition + (segmentLength * totalLength) / 2
    );

    return getPointsForSegment(points, segmentStart, segmentEnd);
  }, [points, progress, segmentLength]);

  if (visibleSegment.length < 2) {
    return null; // Don't render if we don't have enough points
  }

  return (
    <Line
      points={visibleSegment}
      color={new THREE.Color(color)}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
    />
  );
};

const getTotalArcLength = (points: THREE.Vector3[]): number => {
  let totalLength = 0;
  for (let i = 1; i < points.length; i++) {
    totalLength += points[i].distanceTo(points[i - 1]);
  }
  return totalLength;
};

const getPointsForSegment = (
  points: THREE.Vector3[],
  start: number,
  end: number
): THREE.Vector3[] => {
  let currentLength = 0;
  const segmentPoints: THREE.Vector3[] = [];

  for (let i = 1; i < points.length; i++) {
    const segmentLength = points[i].distanceTo(points[i - 1]);
    const segmentStart = currentLength;
    const segmentEnd = currentLength + segmentLength;

    if (segmentEnd > start && segmentStart < end) {
      const t1 = Math.max(0, (start - segmentStart) / segmentLength);
      const t2 = Math.min(1, (end - segmentStart) / segmentLength);

      if (t1 < 1)
        segmentPoints.push(
          new THREE.Vector3().lerpVectors(points[i - 1], points[i], t1)
        );
      if (t2 > t1)
        segmentPoints.push(
          new THREE.Vector3().lerpVectors(points[i - 1], points[i], t2)
        );
    }

    currentLength = segmentEnd;
    if (currentLength > end) break;
  }

  // Ensure we always have at least two points
  if (segmentPoints.length < 2) {
    if (segmentPoints.length === 1) {
      // If we have only one point, duplicate it
      segmentPoints.push(segmentPoints[0].clone());
    } else {
      // If we have no points, use the first two points of the original array
      segmentPoints.push(points[0].clone(), points[1].clone());
    }
  }

  return segmentPoints;
};

const getRandomDuration = (baseDuration: number) => {
  // Generate a random factor between 0.5 and 1.5 (±50% variation)
  const randomFactor = 0.5 + Math.random() * 1;
  return baseDuration * randomFactor;
};

const getRandomSegmentLength = (baseSegmentLength: number) => {
  // Generate a random factor between 0.5 and 1.5 (±50% variation)
  const randomFactor = 0.5 + Math.random();
  return baseSegmentLength * randomFactor;
};

export default NetworkArcs;
