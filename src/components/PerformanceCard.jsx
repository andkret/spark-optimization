import React from 'react';

export default function PerformanceCard({ time }) {
  return (
    <div className="result-card">
      <h3>🕒 Performance Summary</h3>
      <p>
        <strong>Estimated Time:</strong> {time}s
      </p>
      <p>
        {time > 50
          ? 'Tip: This is slow. Try using Parquet, enable caching, or adjust partitioning.'
          : 'Looks good! Feel free to tweak further or compare with a challenge.'}
      </p>
    </div>
  );
}
