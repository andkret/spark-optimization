// src/components/DAGGraph.jsx
import React from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';

const nodeDefaults = {
  style: {
    padding: 10,
    border: '1px solid #ddd',
    borderRadius: 5,
    background: '#fff',
    fontSize: 14,
  },
};

export default function DAGGraph({ config }) {
  const nodes = [];
  const edges = [];

  // Data source node
  nodes.push({
    id: '1',
    data: { label: config.datasetSize + ' Dataset' },
    position: { x: 0, y: 0 },
    ...nodeDefaults,
  });

  // Partition node (if applied)
  if (config.partitionStrategy !== 'None') {
    nodes.push({
      id: '2',
      data: { label: config.partitionStrategy + ' Partition' },
      position: { x: 0, y: 100 },
      ...nodeDefaults,
    });
    edges.push({ id: 'e1-2', source: '1', target: '2' });
  }

  // Cache node (if applied)
  const cacheNodeId = config.partitionStrategy !== 'None' ? '3' : '2';
  if (config.useCache) {
    nodes.push({
      id: cacheNodeId,
      data: { label: 'Cache' },
      position: {
        x: 0,
        y: config.partitionStrategy !== 'None' ? 200 : 100,
      },
      ...nodeDefaults,
    });
    edges.push({
      id:
        'e' +
        (config.partitionStrategy !== 'None' ? '2' : '1') +
        '-' +
        cacheNodeId,
      source: config.partitionStrategy !== 'None' ? '2' : '1',
      target: cacheNodeId,
    });
  }

  // Join build/probe
  const prevNode = config.useCache
    ? cacheNodeId
    : config.partitionStrategy !== 'None'
    ? '2'
    : '1';
  const buildNodeId = config.useCache ? '4' : '3';
  nodes.push({
    id: buildNodeId,
    data: {
      label:
        config.joinType +
        ' Join Build', // concatenation instead of template literal
    },
    position: {
      x: 0,
      y: config.useCache
        ? 300
        : config.partitionStrategy !== 'None'
        ? 200
        : 100,
    },
    ...nodeDefaults,
  });
  edges.push({
    id: 'e' + prevNode + '-' + buildNodeId,
    source: prevNode,
    target: buildNodeId,
  });

  const probeNodeId = config.useCache ? '5' : '4';
  nodes.push({
    id: probeNodeId,
    data: {
      label:
        config.joinType +
        ' Join Probe', // concatenation instead of template literal
    },
    position: {
      x: 0,
      y: config.useCache
        ? 400
        : config.partitionStrategy !== 'None'
        ? 300
        : 200,
    },
    ...nodeDefaults,
  });
  edges.push({
    id: 'e' + buildNodeId + '-' + probeNodeId,
    source: buildNodeId,
    target: probeNodeId,
  });

  // Write output
  const writeNodeId = config.useCache ? '6' : '5';
  nodes.push({
    id: writeNodeId,
    data: { label: 'Write Output' },
    position: {
      x: 0,
      y: config.useCache
        ? 500
        : config.partitionStrategy !== 'None'
        ? 400
        : 300,
    },
    ...nodeDefaults,
  });
  edges.push({
    id: 'e' + probeNodeId + '-' + writeNodeId,
    source: probeNodeId,
    target: writeNodeId,
  });

  return (
    <div style={{ height: 600 }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
