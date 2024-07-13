'use client';

import React from 'react';
import { IRepData } from '@/types/index';

interface NodeInfoPanelProps {
  node: IRepData | null;
}

const NodeInfoPanel: React.FC<NodeInfoPanelProps> = ({ node }) => {
  console.log('NodeInfoPanel ==>>', node);
  if (!node) return null;

  return (
    <div className="bg-black bg-opacity-75 text-white p-4 rounded-lg shadow-lg max-w-sm">
      <h3 className="text-lg font-bold mb-2">
        {node.account_formatted || node.alias || 'Unknown Node'}
      </h3>
      <p>Address: {node.account}</p>
      <p>Weight: {node.weight_formatted}</p>
      <p>Uptime: {node.node_uptime}</p>
    </div>
  );
};

export default NodeInfoPanel;
