import React from 'react';
import { Rep } from '@/types/index';

interface NodeInfoPanelProps {
  node: Rep | null;
}

const NodeInfoPanel: React.FC<NodeInfoPanelProps> = ({ node }) => {
  if (!node) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg shadow-lg max-w-sm">
      <h3 className="text-lg font-bold mb-2">{node.alias || 'Unknown Node'}</h3>
      <p>Score: {node.score.toFixed(2)}</p>
      <p>Uptime: {node.uptime}</p>
      <p>Delegators: {node.delegators}</p>
      <p>Weight: {(node.weight / 1e30).toFixed(2)} million Nano</p>
      {node.website && (
        <a
          href={node.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          Website
        </a>
      )}
    </div>
  );
};

export default NodeInfoPanel;
