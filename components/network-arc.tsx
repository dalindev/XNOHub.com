import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { IRepData } from '@/types/index';

interface Confirmation {
  account: string;
  duration: number;
}

interface NetworkArcsProps {
  nodes: (IRepData & { position: THREE.Vector3 })[];
  confirmations: Confirmation[];
  earthRadius: number;
}

const NetworkArcs: React.FC<NetworkArcsProps> = ({
  nodes,
  confirmations,
  earthRadius
}) => {
  const arcs = useMemo(() => {
    if (confirmations.length === 0 || nodes.length < 2) {
      console.log('Not enough data to create arcs');
      return [];
    }

    const sourceAccount = confirmations[0].account;
    const sourceNode = nodes.find((node) => node.account === sourceAccount);

    if (!sourceNode) {
      console.log(`Source node not found for account: ${sourceAccount}`);
      return [];
    }

    console.log(
      `Source Node: lat ${sourceNode.latitude}, lon ${sourceNode.longitude}`
    );

    return nodes
      .filter((targetNode) => targetNode !== sourceNode)
      .map((targetNode, index) => {
        console.log(
          `Target Node ${index}: lat ${targetNode.latitude}, lon ${targetNode.longitude}`
        );

        const sourcePos = sourceNode.position
          .clone()
          .normalize()
          .multiplyScalar(earthRadius);
        const targetPos = targetNode.position
          .clone()
          .normalize()
          .multiplyScalar(earthRadius);

        const midPoint = new THREE.Vector3()
          .addVectors(sourcePos, targetPos)
          .multiplyScalar(0.5);
        const midPointOnSurface = midPoint
          .clone()
          .normalize()
          .multiplyScalar(earthRadius);

        const arcHeight = earthRadius * 0; // Increased arc height for higher middle
        const peakPoint = midPointOnSurface
          .clone()
          .normalize()
          .multiplyScalar(earthRadius + arcHeight);

        const startLiftFactor = 0.1; // Increased lift at start and end
        const midLiftFactor = 0.1; // Additional lift for the middle section

        const points = [];
        for (let i = 0; i <= 50; i++) {
          const t = i / 50;

          // Cubic Bezier curve for more control
          const point = new THREE.Vector3();
          point
            .addVectors(
              sourcePos.clone().multiplyScalar(Math.pow(1 - t, 3)),
              peakPoint.clone().multiplyScalar(3 * Math.pow(1 - t, 2) * t)
            )
            .add(peakPoint.clone().multiplyScalar(3 * (1 - t) * Math.pow(t, 2)))
            .add(targetPos.clone().multiplyScalar(Math.pow(t, 3)));

          // Lift the points near the start and end more, and add extra lift to the middle
          const endLift =
            Math.pow(Math.sin(t * Math.PI), 0.5) *
            startLiftFactor *
            earthRadius;
          const midLift = Math.sin(t * Math.PI) * midLiftFactor * earthRadius;
          const totalLift = endLift + midLift;

          point.normalize().multiplyScalar(point.length() + totalLift);

          points.push(point);
        }

        return { points, targetNode };
      });
  }, [nodes, confirmations, earthRadius]);

  useEffect(() => {
    console.log(`Total arcs generated: ${arcs.length}`);
  }, [arcs]);

  return (
    <group>
      {arcs.map((arc, index) => (
        <Line
          key={index}
          points={arc.points}
          color={new THREE.Color(0x00ffff)}
          lineWidth={2}
          transparent
          opacity={0.8}
        />
      ))}
    </group>
  );
};

export default NetworkArcs;
