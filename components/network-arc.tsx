import React, { useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { IRepData } from '@/types/index';
import { parseNanoAmount } from '@/lib/parse-nano-amount';
import { useConfirmations } from '@/providers/confirmation-provider';

interface NetworkArcsProps {
  nodes: IRepData[];
  earthRadius: number;
}

interface ArcLineStyle {
  color: THREE.ColorRepresentation;
  lineWidth?: number;
  opacity?: number;
}

interface IArc {
  points: THREE.Vector3[];
  progress: number;
  duration: number;
  style: ArcLineStyle;
  startTime: number;
}

const getArcColor = (amount: number) => {
  if (amount >= 1000000)
    return {
      color: new THREE.Color(0x800080), // Purple
      lineWidth: 5
    };
  if (amount >= 100000)
    return {
      color: new THREE.Color(0xff0000), // Red
      lineWidth: 4
    };
  if (amount >= 10000)
    return {
      color: new THREE.Color(0xff6b00), // Orange
      lineWidth: 3
    };
  if (amount >= 5000)
    return {
      color: new THREE.Color(0xff9200), // Yellow
      lineWidth: 3
    };
  if (amount >= 1000)
    return {
      color: new THREE.Color(0xffe500),
      lineWidth: 2
    };
  if (amount >= 500)
    return {
      color: new THREE.Color(0x1544bf),
      lineWidth: 2
    };
  if (amount >= 100)
    return {
      color: new THREE.Color(0x1a6dd4),
      lineWidth: 2
    };
  if (amount >= 10)
    return {
      color: new THREE.Color(0x209ce9)
    };
  if (amount >= 1)
    return {
      color: new THREE.Color(0x57f2f4),
      opacity: 0.6
    };
  if (amount >= 0.1)
    return {
      color: new THREE.Color(0x91fbd5),
      opacity: 0.5
    };
  return {
    color: new THREE.Color(0xceffdb),
    opacity: 0.1
  };
};

const NetworkArcs: React.FC<NetworkArcsProps> = ({ nodes, earthRadius }) => {
  const { confirmations } = useConfirmations();
  const [arcs, setArcs] = useState<IArc[]>([]);

  useEffect(() => {
    if (confirmations.length === 0 || nodes.length < 2) return;

    console.log('Updated confirmations=>', confirmations);

    // "nano_1dyxqop7makeqwfddgij7moi5zu1zti5uug6ydweyu914z4n3rpkr8i6b8ah"

    const newArcs = confirmations.flatMap((confirmation) => {
      const representativeAccount = confirmation.message.block.representative;
      const duration = Number(confirmation.message.election_info.duration);
      const amount = parseNanoAmount(confirmation.message.amount);
      const sourceNode =
        nodes.find((node) => node.account === representativeAccount) ??
        nodes[Math.floor(Math.random() * nodes.length)]; // Fallback to a random node
      const sourcePos = latLongToVector3(
        sourceNode.latitude,
        sourceNode.longitude,
        earthRadius
      );

      return nodes
        .filter((targetNode) => targetNode.account !== representativeAccount)
        .map((targetNode) => {
          const targetPos = latLongToVector3(
            targetNode.latitude,
            targetNode.longitude,
            earthRadius
          );
          const points = createGreatCircleArc(
            sourcePos,
            targetPos,
            earthRadius
          );

          return {
            points,
            progress: 0,
            duration: duration / 1000,
            style: getArcColor(amount),
            startTime: Date.now()
          };
        });
    });

    setArcs((currentArcs) => [...currentArcs, ...newArcs]);
  }, [confirmations, nodes, earthRadius]);

  useFrame((state, delta) => {
    setArcs((currentArcs) =>
      currentArcs
        .map((arc) => {
          const elapsedTime = (Date.now() - arc.startTime) / 1000;
          const newProgress = Math.min(elapsedTime / arc.duration, 1);
          return { ...arc, progress: newProgress };
        })
        .filter((arc) => arc.progress < 1)
    );
  });

  return (
    <group>
      {arcs.map((arc, index) => (
        <AnimatedArc
          key={index}
          points={arc.points}
          progress={arc.progress}
          style={arc.style}
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
  numPoints: number = 25,
  liftRate: number = 1.05
): THREE.Vector3[] => {
  const points: THREE.Vector3[] = [];
  const startNormal = start.clone().normalize();
  const endNormal = end.clone().normalize();

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const dot = startNormal.dot(endNormal);
    const omega = Math.acos(Math.min(Math.max(dot, -1), 1)); // Clamp dot product to [-1, 1]
    const sinOmega = Math.sin(omega);

    if (sinOmega === 0) {
      // Start and end points are the same or opposite
      points.push(start.clone());
    } else {
      const weight0 = Math.sin((1 - t) * omega) / sinOmega;
      const weight1 = Math.sin(t * omega) / sinOmega;

      const point = new THREE.Vector3()
        .addScaledVector(startNormal, weight0)
        .addScaledVector(endNormal, weight1)
        .normalize()
        .multiplyScalar(radius * liftRate * (1 + 0.2 * Math.sin(t * Math.PI))); // Add some height variation
      points.push(point);
    }
  }

  return points;
};

interface AnimatedArcProps {
  points: THREE.Vector3[];
  progress: number;
  style: ArcLineStyle;
}

const AnimatedArc: React.FC<AnimatedArcProps> = ({
  points,
  progress,
  style: { color, opacity = 0.8, lineWidth = 1 }
}) => {
  const segmentLength = 0.1; // Length of the moving segment as a fraction of the total arc length

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
      color={color}
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

export default NetworkArcs;
