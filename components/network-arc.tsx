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
const ARC_POINTS = 25;
const BROADCAST_ARC_SEGMENT_LENGTH = 0.3;
const CONFIRMATION_ARC_SEGMENT_LENGTH = 0.1;
const BROADCAST_DURATION = 125;
const CONFIRMATION_DURATION = 225;

// Dynamic node selection - will be calculated based on BPS (Blocks Per Second)
// Performance levels:
// BPS < 5: 100% nodes (full experience) 
// BPS 5: 20% nodes (balanced start)
// BPS 40: 1% nodes (performance max)
// Scale smoothly between these points

interface BPSTracker {
  timestamps: number[];
  windowSize: number; // in milliseconds
}

const createBPSTracker = (windowSizeSeconds: number = 5): BPSTracker => ({
  timestamps: [],
  windowSize: windowSizeSeconds * 1000
});

const addBlock = (tracker: BPSTracker, timestamp: number = Date.now()) => {
  tracker.timestamps.push(timestamp);
  // Remove old timestamps outside the window
  const cutoff = timestamp - tracker.windowSize;
  tracker.timestamps = tracker.timestamps.filter(t => t > cutoff);
};

const calculateBPS = (tracker: BPSTracker, currentTime: number = Date.now()): number => {
  // Remove old timestamps
  const cutoff = currentTime - tracker.windowSize;
  const oldCount = tracker.timestamps.length;
  tracker.timestamps = tracker.timestamps.filter(t => t > cutoff);
  const newCount = tracker.timestamps.length;
  
  if (newCount === 0) return 0;
  
  // Calculate BPS based on blocks in the window (2x the transaction rate)
  const timeSpanSeconds = tracker.windowSize / 1000;
  const tps = newCount / timeSpanSeconds;
  const bps = tps * 2; // BPS = 2x TPS
  
  // Enhanced debug logging
  if (newCount > 0) {
    const intervals = tracker.timestamps.slice(-5).map((t, i, arr) => 
      i > 0 ? t - arr[i-1] : 0
    ).filter(x => x > 0);
    const avgInterval = intervals.length > 0 ? intervals.reduce((a, b) => a + b) / intervals.length : 0;
    
    console.log(`🔍 BPS Calc: ${newCount} txs in ${timeSpanSeconds}s = ${tps.toFixed(2)} TPS = ${bps.toFixed(2)} BPS | Avg interval: ${avgInterval.toFixed(0)}ms | Expected BPS: ${avgInterval > 0 ? (2000/avgInterval).toFixed(1) : 'N/A'}`);
  }
  
  return bps;
};

const getAdaptiveNodesPercentage = (bps: number): number => {
  console.log(`🎯 BPS Input: ${bps.toFixed(2)}`);
  
  if (bps < 5) {
    console.log(`   → Full Experience (100% nodes)`);
    return 1.0; // 100% - full experience for very low traffic
  } else if (bps <= 40) {
    // Smooth scaling from 5 BPS (20% nodes) to 40 BPS (1% nodes)
    // Linear interpolation: 20% at 5 BPS down to 1% at 40 BPS
    const factor = (bps - 5) / (40 - 5); // 0 to 1 as BPS goes from 5 to 40
    const percentage = 0.20 - (factor * 0.19); // 20% down to 1%
    
    const mode = bps <= 10 ? 'Balanced' : bps <= 25 ? 'Performance' : 'Performance Max';
    console.log(`   → ${mode} (${(percentage * 100).toFixed(0)}% nodes)`);
    return percentage;
  } else {
    console.log(`   → Performance Max (1% nodes)`);
    return 0.01; // 1% - ultra performance mode for very high traffic
  }
};

interface NetworkArcsProps {
  nodes: IRepData[];
  earthRadius: number;
  onPerformanceUpdate?: (bps: number, mode: string, nodesPercentage: number) => void;
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

const NetworkArcs: React.FC<NetworkArcsProps> = ({ nodes, earthRadius, onPerformanceUpdate }) => {
  const { activeConfirmations } = useConfirmations();
  const [arcs, setArcs] = useState<IArc[]>([]);
  
  // BPS tracking and adaptive performance
  const bpsTracker = React.useRef<BPSTracker>(createBPSTracker(5)); // 5-second window for more responsive BPS
  const [adaptiveNodesPercentage, setAdaptiveNodesPercentage] = useState<number>(1.0);
  const processedConfirmationIds = React.useRef<Set<string>>(new Set());
  const lastActiveConfirmationsLength = React.useRef<number>(0);

  const createArcStyles = (amount: number) => {
    const baseStyle = getStyleByNanoAmount(amount);
    return {
      broadcast: {
        ...baseStyle
      },
      confirmation: {
        ...baseStyle
      }
    };
  };

  // Update BPS tracking and adaptive percentage
  const updateBpsAndPercentage = React.useCallback(() => {
    const now = Date.now();
    const bps = calculateBPS(bpsTracker.current, now);
    const newPercentage = getAdaptiveNodesPercentage(bps);
    
    // Updated mode determination to match new thresholds
    let mode: string;
    if (bps < 5) {
      mode = 'Full Experience';
    } else if (bps <= 10) {
      mode = 'Balanced';
    } else if (bps <= 25) {
      mode = 'Performance';
    } else {
      mode = 'Performance Max';
    }
    
    console.log(`🚀 Final Update: ${bps.toFixed(2)} BPS → ${mode} (${(newPercentage * 100).toFixed(0)}% nodes)`);
    
    // Call performance update callback
    if (onPerformanceUpdate) {
      onPerformanceUpdate(bps, mode, newPercentage);
    }
    
    // Log performance mode changes
    if (Math.abs(newPercentage - adaptiveNodesPercentage) > 0.01) {
      console.log(`🎯 Adaptive Mode: ${mode} (${bps.toFixed(1)} BPS → ${(newPercentage * 100).toFixed(0)}% nodes)`);
    }
    
    setAdaptiveNodesPercentage(newPercentage);
  }, [adaptiveNodesPercentage, onPerformanceUpdate]);

  // Periodic BPS updates every 1 second (more responsive with 5s window)
  React.useEffect(() => {
    const interval = setInterval(updateBpsAndPercentage, 1000);
    return () => clearInterval(interval);
  }, [updateBpsAndPercentage]);

  // Clean up old confirmation IDs every minute to prevent memory leaks
  React.useEffect(() => {
    const cleanupInterval = setInterval(() => {
      // Keep only the most recent 1000 confirmation IDs
      const ids = Array.from(processedConfirmationIds.current);
      if (ids.length > 1000) {
        const idsToKeep = ids.slice(-500); // Keep last 500
        processedConfirmationIds.current = new Set(idsToKeep);
        console.log(`🧹 Cleaned confirmation ID cache (kept ${idsToKeep.length} recent IDs)`);
      }
    }, 60000); // Every minute
    
    return () => clearInterval(cleanupInterval);
  }, []);

  useEffect(() => {
    if (activeConfirmations.length === 0 || nodes.length < 2) return;

    // Simple approach: track confirmations by adding a timestamp to make each "transaction" unique
    // This works for both sample and live data
    let newConfirmationsCount = 0;
    
    activeConfirmations.forEach((confirmation) => {
      // Create a unique ID combining hash + current time (for sample data cycling)
      const uniqueId = `${confirmation.message.hash}_${confirmation.time}`;
      if (!processedConfirmationIds.current.has(uniqueId)) {
        processedConfirmationIds.current.add(uniqueId);
        newConfirmationsCount++;
      }
    });
    
    console.log(`📊 Processed ${newConfirmationsCount} new confirmations (${activeConfirmations.length} total active)`);
    
    // For sample data, also add timestamp-based detection as backup
    if (process.env.NEXT_PUBLIC_USE_SAMPLE_DATA === 'true') {
      lastActiveConfirmationsLength.current = activeConfirmations.length;
      
      // If hash-based detection failed but we know new items arrived, use simple count
      if (newConfirmationsCount === 0 && activeConfirmations.length > 0) {
        // Check if interval timing suggests new transactions should have arrived
        const now = Date.now();
        const lastTxTime = bpsTracker.current.timestamps[bpsTracker.current.timestamps.length - 1] || 0;
        const timeSinceLastTx = now - lastTxTime;
        const expectedInterval = parseInt(process.env.NEXT_PUBLIC_SIMULATION_INTERVAL_MS || '500');
        
        if (timeSinceLastTx >= expectedInterval * 0.8) { // 80% of expected interval
          newConfirmationsCount = 1;
          console.log(`📊 Sample Mode Fallback: Adding 1 transaction (${timeSinceLastTx}ms since last, expected ${expectedInterval}ms)`);
        }
      }
    }

    // Add only new transactions to BPS tracker
    for (let i = 0; i < newConfirmationsCount; i++) {
      addBlock(bpsTracker.current);
    }

    // Update BPS immediately when new confirmations arrive
    if (newConfirmationsCount > 0) {
      const now = Date.now();
      const recentTxs = bpsTracker.current.timestamps.slice(-5).map(t => now - t);
      console.log(`📊 Last 5 tx intervals: [${recentTxs.join(', ')}]ms ago`);
      updateBpsAndPercentage();
    }

    // Process ALL active confirmations for arc creation (existing behavior)
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

      // Filter out the source node and randomly select a subset of target nodes
      const eligibleNodes = nodes.filter(
        (targetNode) => targetNode.account !== representativeAccount
      );

      // Calculate number of target nodes based on adaptive percentage
      const numTargetNodes = Math.max(
        1,
        Math.floor(eligibleNodes.length * adaptiveNodesPercentage)
      );

      const selectedNodes = shuffleArray<IRepData>(eligibleNodes).slice(
        0,
        numTargetNodes
      );

      return selectedNodes.map((targetNode) => {
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

    setArcs((currentArcs) => {
      const newArcsList = [...currentArcs, ...newArcs];
      return newArcsList;
    });
  }, [activeConfirmations, nodes, earthRadius, adaptiveNodesPercentage, updateBpsAndPercentage]);

  useFrame(() => {
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


const getRandomSegmentLength = (baseSegmentLength: number) => {
  // Generate a random factor between 0.5 and 1.5 (±50% variation)
  const randomFactor = 0.5 + Math.random();
  return baseSegmentLength * randomFactor;
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default NetworkArcs;
