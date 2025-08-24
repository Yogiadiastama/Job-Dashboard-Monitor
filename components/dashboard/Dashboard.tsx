import React from 'react';

const Dashboard: React.FC = () => {
  return (
    // Container ini akan mengisi tag <main> induk.
    // Induknya memiliki padding, sehingga iframe akan berada di dalam area yang diberi padding.
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: '75vh', // Pastikan tingginya cukup di sebagian besar layar
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      <iframe
        loading="lazy"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        src="https://www.canva.com/design/DAGw9oBVkSA/yQukWGgbKdl12Zdkj2hxoQ/view?embed"
        allowFullScreen
        allow="fullscreen"
        title="Human Capital Dashboard"
      ></iframe>
    </div>
  );
};

export default Dashboard;