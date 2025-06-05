import React from 'react';

export default function ScoreCard({ score, time }) {
  return (
    <div className="result-card">
      <h3>🎉 Simulation Result</h3>
      <p>
        <strong>Estimated Time:</strong> {time}s
      </p>
      <p>
        <strong>Score:</strong> {score} / 1000
      </p>
      <p>
        {score < 1000
          ? 'Optimization Tip: Try enabling AQE, using Parquet, and good partitioning!'
          : 'Great job! You hit all goals.'}
      </p>
    </div>
  );
}
