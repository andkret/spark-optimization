// src/App.jsx

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DAGGraph from './components/DAGGraph';
import CodePreview from './components/CodePreview';
import ResourceChart from './components/ResourceChart';
import NetworkTimelineChart from './components/NetworkTimelineChart';
import LevelSelector from './components/LevelSelector';
import ScoreCard from './components/ScoreCard';
import PerformanceCard from './components/PerformanceCard';
import DataPreview from './components/DataPreview';
import JoinPreview from './components/JoinPreview';
import { generateCode } from './codegen';
import { simulatePerformance, scoreRun } from './simulator';
import './style.css';
import academyImage from './assets/LDE-Logo.png';

export default function App() {
  // ─── Configuration State ───
  const [config, setConfig] = useState({
    clusterSize: 'Small',
    datasetSize: 'Small',
    partitionStrategy: 'None',
    fileFormat: 'Parquet',
    joinPrimary: 'Orders',
    joinSecondary: 'Customers',
    joinKey: 'customer_id',
    joinType: 'Shuffle',
    useCache: false,
    aqeEnabled: false,
    skewed: false,
    skewKey: 'region_id',
  });

  const [selectedLevel, setSelectedLevel] = useState(null);
  const [lastTime, setLastTime] = useState(null);
  const [lastScore, setLastScore] = useState(null);
  const [lastCpu, setLastCpu] = useState(null);
  const [lastMemory, setLastMemory] = useState(null);
  const [lastNetworkTimeline, setLastNetworkTimeline] = useState([]);
  const [activeTab, setActiveTab] = useState('Overview');

  // ─── Recompute Performance & Score ───
  useEffect(() => {
    const { time, cpu, memory, networkTimeline } = simulatePerformance(config);
    setLastTime(time);
    setLastCpu(cpu);
    setLastMemory(memory);
    setLastNetworkTimeline(networkTimeline || []);

    if (selectedLevel) {
      const score = scoreRun(config, time, selectedLevel);
      setLastScore(score);
    } else {
      setLastScore(null);
    }
  }, [config, selectedLevel]);

  return (
    <div className="app-container">
      {/* ─── Left Sidebar (core controls only) ─── */}
      <div className="left-panel">
        <div className="academy-section" style={{ marginBottom: '16px', textAlign: 'left' }}>
            <h4>Check out our Academy & Coaching</h4>
            <h4>30% Summer Sale at</h4>
            <a href="https://learndataengineering.com" target="_blank" rel="noopener noreferrer">
              <img
                src={academyImage}
                alt="Academy and Coaching"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </a>
          </div>
        <div className="panel">
          {/* Academy Promotion Section */}
          
          <h2>Configuration</h2>
          <LevelSelector
            onSelectLevel={(level) => {
              setSelectedLevel(level);
              setConfig(level.startConfig);
              setLastScore(null);
              setLastTime(null);
              setLastCpu(null);
              setLastMemory(null);
              setLastNetworkTimeline([]);
            }}
          />
          <Sidebar config={config} setConfig={setConfig} />
        </div>
        {/* Further Tasks / Ideas Panel */}
        <div className="panel" style={{ marginTop: '16px' }}>
          <h2>Further Tasks & Ideas</h2>
          <ul style={{ paddingLeft: '1.2em' }}>
            <li>More interactive help and explanations</li>
            <li>Challenges for the learner to solve (games)</li>
            <li>Better CPU and Memory simulation</li>
            <li>Better Skew simulation</li>
          </ul>
        </div>
      
        {/* Feedback Panel */}
        <div className="panel" style={{ marginTop: '16px' }}>
          <h2>Feedback</h2>
          <p>
            Send us your feedback and ideas about the playground:&nbsp;
            <a href="https://forms.gle/m3kTRyWkCwoxfyxa8" target="_blank" rel="noopener noreferrer" style={{ color: '#f6bc52', textDecoration: 'underline' }}>
              Submit feedback
            </a>
          </p>
        </div>
      </div>
      

      {/* ─── Center Panel: Tabs ─── */}
      <div className="center-panel">
        <div className="panel">
          <h2>Tabs</h2>
          <div className="tabs">
            {['Overview', 'Data', 'File System', 'Joins', 'Code'].map((tab) => (
              <button
                key={tab}
                className={activeTab === tab ? 'tab active' : 'tab'}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="tab-content">
            {/* ─── Overview Tab ─── */}
            {activeTab === 'Overview' && (
              <>
                <h3>Pipeline Visualization</h3>
                <DAGGraph config={config} />
              </>
            )}

            {/* ─── Data Tab ─── */}
            {activeTab === 'Data' && (
              <>
                <h3>Data Preview (Tables Only)</h3>
                <DataPreview
                  dataset={config.datasetSize}
                  partitionStrategy={config.partitionStrategy}
                  fileFormat={config.fileFormat}
                  skewed={config.skewed}
                  showPartitions={false}
                />
              </>
            )}

            {/* ─── File System Tab ─── */}
            {activeTab === 'File System' && (
              <>
                <h3>File System (Partition Layout)</h3>

                {/* Partition Strategy Selector */}
                <label style={{ display: 'block', marginBottom: '8px' }}>
                  Partition Strategy:
                  <select
                    value={config.partitionStrategy}
                    onChange={(e) =>
                      setConfig({ ...config, partitionStrategy: e.target.value })
                    }
                    style={{ marginLeft: '8px' }}
                  >
                    <option value="None">None</option>
                    <option value="Good">Good</option>
                    <option value="Bad">Bad</option>
                  </select>
                </label>

                {/* File Format Selector */}
                <label style={{ display: 'block', marginBottom: '16px' }}>
                  File Format:
                  <select
                    value={config.fileFormat}
                    onChange={(e) =>
                      setConfig({ ...config, fileFormat: e.target.value })
                    }
                    style={{ marginLeft: '8px' }}
                  >
                    <option value="Parquet">Parquet</option>
                    <option value="CSV">CSV</option>
                  </select>
                </label>

                <DataPreview
                  dataset={config.datasetSize}
                  partitionStrategy={config.partitionStrategy}
                  fileFormat={config.fileFormat}
                  skewed={config.skewed}
                  showPartitions={true}
                />
              </>
            )}

            {/* ─── Joins Tab ─── */}
            {activeTab === 'Joins' && (
              <>
                <h3>Join Settings</h3>

                {/* Primary Table */}
                <label style={{ display: 'block', marginBottom: '8px' }}>
                  Primary Table:
                  <select
                    value={config.joinPrimary}
                    onChange={(e) =>
                      setConfig({ ...config, joinPrimary: e.target.value })
                    }
                    style={{ marginLeft: '8px' }}
                  >
                    <option value="Orders">Orders</option>
                    <option value="Customers">Customers</option>
                    <option value="Products">Products</option>
                  </select>
                </label>

                {/* Secondary Table */}
                <label style={{ display: 'block', marginBottom: '8px' }}>
                  Secondary Table:
                  <select
                    value={config.joinSecondary}
                    onChange={(e) =>
                      setConfig({ ...config, joinSecondary: e.target.value })
                    }
                    style={{ marginLeft: '8px' }}
                  >
                    <option value="Orders">Orders</option>
                    <option value="Customers">Customers</option>
                    <option value="Products">Products</option>
                  </select>
                </label>

                {/* Join Key */}
                <label style={{ display: 'block', marginBottom: '8px' }}>
                  Join Key:
                  <select
                    value={config.joinKey}
                    onChange={(e) =>
                      setConfig({ ...config, joinKey: e.target.value })
                    }
                    style={{ marginLeft: '8px' }}
                  >
                    <option value="customer_id">customer_id</option>
                    <option value="product_id">product_id</option>
                    <option value="order_id">order_id</option>
                  </select>
                </label>

                {/* Join Type */}
                <label style={{ display: 'block', marginBottom: '16px' }}>
                  Join Type:
                  <select
                    value={config.joinType}
                    onChange={(e) =>
                      setConfig({ ...config, joinType: e.target.value })
                    }
                    style={{ marginLeft: '8px' }}
                  >
                    <option value="Broadcast">Broadcast</option>
                    <option value="Shuffle">Shuffle</option>
                  </select>
                </label>

                <h3>Join Preview</h3>
                <JoinPreview config={config} />
              </>
            )}

            {/* ─── Code Tab ─── */}
            {activeTab === 'Code' && (
              <>
                <h3>Generated Code</h3>
                <CodePreview code={generateCode(config)} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── Right Panel: Score/Performance + Resources ─── */}
      <div className="right-panel">
        <div className="panel">
          <h2>{selectedLevel ? 'Challenge Result' : 'Performance Summary'}</h2>
          {selectedLevel ? (
            lastTime !== null && <ScoreCard score={lastScore} time={lastTime} />
          ) : (
            lastTime !== null && <PerformanceCard time={lastTime} />
          )}
        </div>
        <div className="panel">
          <h2>Resource Usage</h2>
          {lastCpu !== null && lastMemory !== null && (
            <>
              <ResourceChart cpu={lastCpu} memory={lastMemory} />
              <h4 style={{ marginTop: '16px' }}>Network Traffic by Stage</h4>
              <NetworkTimelineChart data={lastNetworkTimeline} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
