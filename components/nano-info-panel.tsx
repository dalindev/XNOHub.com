import React from 'react';
import { IRepData } from '@/types/index';

interface NodeInfoPanelProps {
  node: IRepData | null;
}

const NodeInfoPanel: React.FC<NodeInfoPanelProps> = ({ node }) => {
  if (!node) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg shadow-lg max-w-sm">
      <h3 className="text-lg font-bold mb-2">{node.alias || 'Unknown Node'}</h3>
    </div>
  );
};

export default NodeInfoPanel;
