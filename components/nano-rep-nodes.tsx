import React, { useMemo, useState } from 'react';
import * as THREE from 'three';
import { Rep } from '@/types/index';

interface NanoRepNodesProps {
  data: Rep[];
  earthRadius: number;
  onNodeHover: (nodeData: Rep | null) => void;
  onNodeClick: (nodeData: Rep) => void;
}

const NanoRepNodes: React.FC<NanoRepNodesProps> = ({
  data,
  earthRadius,
  onNodeHover,
  onNodeClick
}) => {
  const nodes = useMemo(() => {
    if (!data) return [];
    return data.map((rep) => ({
      ...rep,
      position: calculatePosition(rep.latitude, rep.longitude, earthRadius),
      color: new THREE.Color(Math.random(), Math.random(), Math.random())
    }));
  }, [data, earthRadius]);

  return (
    <group>
      {nodes.map((node, index) => (
        <Node
          key={index}
          node={node}
          earthRadius={earthRadius}
          onHover={onNodeHover}
          onClick={onNodeClick}
        />
      ))}
    </group>
  );
};

const calculatePosition = (
  latitude: number,
  longitude: number,
  radius: number
): THREE.Vector3 => {
  const phi = (90 - latitude) * (Math.PI / 180);
  const theta = (longitude + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
};

interface NodeProps {
  node: Rep & { position: THREE.Vector3; color: THREE.Color };
  earthRadius: number;
  onHover: (nodeData: Rep | null) => void;
  onClick: (nodeData: Rep) => void;
}

const Node: React.FC<NodeProps> = ({ node, earthRadius, onHover, onClick }) => {
  const [hovered, setHovered] = useState(false);

  const barHeight = useMemo(() => {
    const extraHeight = node.weight * 0.02; // 2% of Earth's radius
    return earthRadius * 0.1 + extraHeight; // 10% of Earth's radius
  }, [earthRadius, node.weight]);

  const barGeometry = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(0.0005, 0.004, barHeight, 8);
    geometry.translate(0, barHeight / 2, 0);
    return geometry;
  }, [barHeight]);

  const barPosition = useMemo(() => {
    return node.position.clone().normalize().multiplyScalar(earthRadius);
  }, [node.position, earthRadius]);

  const barQuaternion = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    const axis = new THREE.Vector3().crossVectors(up, barPosition).normalize();
    const radians = Math.acos(up.dot(barPosition.clone().normalize()));
    return new THREE.Quaternion().setFromAxisAngle(axis, radians);
  }, [barPosition]);

  const color = useMemo(() => {
    // Color-code based on score: red for low scores, green for high scores
    const hue = (node.delegators / 1024) * 0.3; // 0.3 is green in HSL
    return new THREE.Color().setHSL(hue, 1, 0.5);
  }, [node.score]);

  return (
    <group
      position={barPosition}
      quaternion={barQuaternion}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover(node);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        onHover(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(node);
      }}
    >
      <mesh geometry={barGeometry}>
        <meshBasicMaterial
          color={color}
          opacity={hovered ? 1 : 0.7}
          transparent
        />
      </mesh>
    </group>
  );
};

export default NanoRepNodes;
