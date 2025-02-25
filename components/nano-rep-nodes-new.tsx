import React, { useMemo, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { IRepData } from '@/types/index';
import NetworkArcs from './network-arc';

interface NanoRepNodesProps {
  repsGeoInfo: IRepData[];
  earthRadius: number;
  onNodeHover: (nodeRepsGeoInfo: IRepData | null) => void;
}

const NanoRepNodes: React.FC<NanoRepNodesProps> = React.memo(
  ({ repsGeoInfo, earthRadius, onNodeHover }) => {
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
        <NetworkArcs nodes={nodes} earthRadius={earthRadiusRef.current} />
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

    // Calculate node size based on weight percent
    const nodeSize = useMemo(() => {
      const baseSize = 0.015;
      const variableSize = (node.weight_percent / 100) * 0.025;
      const hoverMultiplier = hovered ? 1.3 : 1;
      return (baseSize + variableSize) * hoverMultiplier;
    }, [node.weight_percent, hovered]);

    // Calculate hover distance from Earth's surface
    const hoverDistance = useMemo(() => {
      const baseDistance = 0.05;
      const variableDistance = (node.weight_percent / 100) * 0.1;
      return baseDistance + variableDistance;
    }, [node.weight_percent]);

    // Position slightly above Earth's surface
    const nodePosition = useMemo(() => {
      const surfacePosition = node.position
        .clone()
        .normalize()
        .multiplyScalar(earthRadius);
      const hoveredPosition = node.position
        .clone()
        .normalize()
        .multiplyScalar(earthRadius + hoverDistance);
      return hovered ? hoveredPosition : surfacePosition;
    }, [node.position, earthRadius, hoverDistance, hovered]);

    // Colors for the node and glow
    const nodeColor = useMemo(
      () => (hovered ? new THREE.Color(0xffa500) : node.color),
      [node.color, hovered]
    );

    const glowColor = useMemo(
      () => (hovered ? new THREE.Color(0xffcc00) : new THREE.Color(0x4a9aff)),
      [hovered]
    );

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
        position={nodePosition}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        {/* Main sphere */}
        <mesh>
          <sphereGeometry args={[nodeSize, 16, 16]} />
          <meshBasicMaterial color={nodeColor} transparent opacity={0.9} />
        </mesh>

        {/* Outer glow effect */}
        <mesh>
          <sphereGeometry args={[nodeSize * 1.5, 16, 16]} />
          <meshBasicMaterial
            color={glowColor}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>

        {/* Inner pulse effect when hovered */}
        {hovered && (
          <mesh>
            <sphereGeometry args={[nodeSize * 1.2, 16, 16]} />
            <meshBasicMaterial color={glowColor} transparent opacity={0.5} />
          </mesh>
        )}
      </group>
    );
  }
);

Node.displayName = 'Node';

export default NanoRepNodes;
