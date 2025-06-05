// src/components/Sidebar.jsx

import React, { useState } from 'react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

export default function Sidebar({ config, setConfig }) {
  const [showCacheAqe, setShowCacheAqe] = useState(false);
  const [showSkew, setShowSkew] = useState(false);

  return (
    <div>
      {/* ---------- Cluster Size ---------- */}
      <Tippy content="Size of your Spark cluster: Small (1 worker), Medium (4 workers), Large (8 workers).">
        <label>
          Cluster Size: <span style={{ cursor: 'help' }}>❓</span>
        </label>
      </Tippy>
      <select
        value={config.clusterSize}
        onChange={(e) => setConfig({ ...config, clusterSize: e.target.value })}
      >
        <option value="Small">Small</option>
        <option value="Medium">Medium</option>
        <option value="Large">Large</option>
      </select>

      <br />

      {/* ---------- Dataset Size ---------- */}
      <Tippy content="Choose dataset size: Small (1M rows), Medium (10M), or Large (100M).">
        <label>
          Dataset Size: <span style={{ cursor: 'help' }}>❓</span>
        </label>
      </Tippy>
      <select
        value={config.datasetSize}
        onChange={(e) => setConfig({ ...config, datasetSize: e.target.value })}
      >
        <option value="Small">Small</option>
        <option value="Medium">Medium</option>
        <option value="Large">Large</option>
      </select>

      <br />

      {/* ---------- Caching & AQE (Accordion) ---------- */}
      <div
        onClick={() => setShowCacheAqe(!showCacheAqe)}
        style={{ cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}
      >
        Caching & AQE {showCacheAqe ? '▼' : '▶'}
      </div>
      {showCacheAqe && (
        <div style={{ paddingLeft: '10px' }}>
          <Tippy content="Caching stores data in memory between actions.">
            <label>
              Use Cache: <span style={{ cursor: 'help' }}>❓</span>
            </label>
          </Tippy>
          <input
            type="checkbox"
            checked={config.useCache}
            onChange={(e) => setConfig({ ...config, useCache: e.target.checked })}
          />

          <br />

          <Tippy content="Enable AQE to optimize dynamically at runtime.">
            <label>
              Enable AQE: <span style={{ cursor: 'help' }}>❓</span>
            </label>
          </Tippy>
          <input
            type="checkbox"
            checked={config.aqeEnabled}
            onChange={(e) => setConfig({ ...config, aqeEnabled: e.target.checked })}
          />
        </div>
      )}

      <br />

      {/* ---------- Skew Settings (Accordion) ---------- */}
      <div
        onClick={() => setShowSkew(!showSkew)}
        style={{ cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}
      >
        Skew Settings {showSkew ? '▼' : '▶'}
      </div>
      {showSkew && (
        <div style={{ paddingLeft: '10px' }}>
          <Tippy content="Simulate data skew on a specific key.">
            <label>
              Skewed: <span style={{ cursor: 'help' }}>❓</span>
            </label>
          </Tippy>
          <input
            type="checkbox"
            checked={config.skewed}
            onChange={(e) => setConfig({ ...config, skewed: e.target.checked })}
          />

          <br />

          <Tippy content="The key column to skew on.">
            <label>
              Skew Key: <span style={{ cursor: 'help' }}>❓</span>
            </label>
          </Tippy>
          <select
            value={config.skewKey}
            onChange={(e) => setConfig({ ...config, skewKey: e.target.value })}
          >
            <option value="region_id">region_id</option>
            <option value="customer_id">customer_id</option>
            <option value="product_id">product_id</option>
          </select>
        </div>
      )}
    </div>
  );
}
