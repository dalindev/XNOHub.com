'use client';

import React, { useMemo, useState } from 'react';
import * as THREE from 'three';
import { IRepData } from '@/types/index';

interface NanoRepNodesProps {
  repsGeoInfo: IRepData[];
  earthRadius: number;
  onNodeHover: (noderepsGeoInfo: IRepData | null) => void;
  onNodeClick: (noderepsGeoInfo: IRepData) => void;
}

const NanoRepNodes: React.FC<NanoRepNodesProps> = ({
  repsGeoInfo,
  earthRadius,
  onNodeHover,
  onNodeClick
}) => {
  const nodes = useMemo(() => {
    if (!repsGeoInfo) return [];
    return repsGeoInfo.map((rep) => ({
      ...rep,
      position: calculatePosition(rep.latitude, rep.longitude, earthRadius),
      color: new THREE.Color(Math.random(), Math.random(), Math.random())
    }));
  }, [repsGeoInfo, earthRadius]);

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
  node: IRepData & { position: THREE.Vector3; color: THREE.Color };
  earthRadius: number;
  onHover: (noderepsGeoInfo: IRepData | null) => void;
  onClick: (noderepsGeoInfo: IRepData) => void;
}

const Node: React.FC<NodeProps> = ({ node, earthRadius, onHover, onClick }) => {
  const [hovered, setHovered] = useState(false);

  const barHeight = useMemo(() => {
    const baseHeight = earthRadius * 0.2; // 20% of Earth's radius as base height
    const variableHeight = (node.weight_percent / 50) * earthRadius;
    const hoverMultiplier = hovered ? 1.3 : 1; // Increase height by 30% when hovered
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
    const axis = new THREE.Vector3().crossVectors(up, barPosition).normalize();
    const radians = Math.acos(up.dot(barPosition.clone().normalize()));
    return new THREE.Quaternion().setFromAxisAngle(axis, radians);
  }, [barPosition]);

  const color = useMemo(() => {
    const baseColor = new THREE.Color(0x00ff00); // Green base color
    const hoverColor = new THREE.Color(0xffa500); // Cyan hover color
    return hovered ? hoverColor : baseColor;
  }, [hovered]);

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
