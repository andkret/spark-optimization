import React from 'react';
import levels from '../levels.json';

export default function LevelSelector({ onSelectLevel }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h3>🎮 Challenge Mode</h3>
      {levels.map(level => (
        <button key={level.id} onClick={() => onSelectLevel(level)} style={{ margin: '5px' }}>
          {level.title}
        </button>
      ))}
    </div>
  );
}
