import React, { useMemo, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { IRepData } from '@/types/index';
import NetworkArcs from './network-arc';

interface NanoRepNodesProps {
  repsGeoInfo: IRepData[];
  earthRadius: number;
  onNodeHover: (nodeRepsGeoInfo: IRepData | null) => void;
  onPerformanceUpdate?: (bps: number, mode: string, nodesPercentage: number) => void;
}

const NanoRepNodes: React.FC<NanoRepNodesProps> = React.memo(
  ({ repsGeoInfo, earthRadius, onNodeHover, onPerformanceUpdate }) => {
    const earthRadiusRef = useRef(earthRadius);

    const nodes = useMemo(() => {
      return repsGeoInfo.map((rep) => ({
        ...rep,
        position: calculatePosition(
          rep.latitude,
          rep.longitude,
          earthRadiusRef.current
        ),
        color: new THREE.Color(0x1a6dd4)
      }));
    }, [repsGeoInfo]);

    const handleNodeHover = useCallback(
      (node: IRepData | null) => {
        onNodeHover(node);
      },
      [onNodeHover]
    );

    return (
      <group>
        {nodes.map((node, index) => (
          <Node
            key={node.account}
            node={node}
            earthRadius={earthRadiusRef.current}
            onHover={handleNodeHover}
            // onClick={handleNodeClick}
          />
        ))}
        <NetworkArcs 
          nodes={nodes} 
          earthRadius={earthRadiusRef.current} 
          onPerformanceUpdate={onPerformanceUpdate}
        />
      </group>
    );
  }
);

NanoRepNodes.displayName = 'NanoRepNodes';

const calculatePosition = (
  lat: number,
  long: number,
  radius: number
): THREE.Vector3 => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (long + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
};

interface NodeProps {
  node: IRepData & { position: THREE.Vector3; color: THREE.Color };
  earthRadius: number;
  onHover: (nodeRepsGeoInfo: IRepData | null) => void;
}

const Node: React.FC<NodeProps> = React.memo(
  ({ node, earthRadius, onHover }) => {
    const [hovered, setHovered] = React.useState(false);

    const barHeight = useMemo(() => {
      const baseHeight = earthRadius * 0.2;
      const variableHeight = (node.weight_percent / 50) * earthRadius;
      const hoverMultiplier = hovered ? 1.3 : 1;
      return (baseHeight + variableHeight) * hoverMultiplier;
    }, [earthRadius, node.weight_percent, hovered]);

    const barGeometry = useMemo(() => {
      const geometry = new THREE.CylinderGeometry(0.0005, 0.006, barHeight, 32);
      geometry.translate(0, barHeight / 2, 0);
      return geometry;
    }, [barHeight]);

    const barPosition = useMemo(() => {
      return node.position.clone().normalize().multiplyScalar(earthRadius);
    }, [node.position, earthRadius]);

    const barQuaternion = useMemo(() => {
      const up = new THREE.Vector3(0, 1, 0);
      const axis = new THREE.Vector3()
        .crossVectors(up, barPosition)
        .normalize();
      const radians = Math.acos(up.dot(barPosition.clone().normalize()));
      return new THREE.Quaternion().setFromAxisAngle(axis, radians);
    }, [barPosition]);

    const handlePointerOver = useCallback(
      (e: THREE.Event) => {
        e.stopPropagation();
        setHovered(true);
        onHover(node);
      },
      [node, onHover]
    );

    const handlePointerOut = useCallback(
      (e: THREE.Event) => {
        e.stopPropagation();
        setHovered(false);
        onHover(null);
      },
      [onHover]
    );

    return (
      <group
        position={barPosition}
        quaternion={barQuaternion}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <mesh geometry={barGeometry}>
          <meshBasicMaterial
            color={hovered ? 0xffa500 : node.color}
            opacity={hovered ? 1 : 0.7}
            transparent
          />
        </mesh>
      </group>
    );
  }
);

Node.displayName = 'Node';

export default NanoRepNodes;
