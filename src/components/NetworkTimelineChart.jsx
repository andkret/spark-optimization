// src/components/NetworkTimelineChart.jsx

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function NetworkTimelineChart({ data }) {
  // `data` should be an array of: [{ stage: 'Read', networkMB: 0 }, ...]
  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#444" strokeDasharray="3 3" />
          <XAxis dataKey="stage" stroke="#aaa" />
          <YAxis stroke="#aaa" unit="MB" />
          <Tooltip formatter={(val) => `${val} MB`} />
          <Line type="monotone" dataKey="networkMB" stroke="#82ca9d" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
