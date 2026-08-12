import React from 'react';

const PlaceholderTab = ({ title, description }) => {
  return (
    <div className="dashboard-content" style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6B7280' }}>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>{title}</div>
      <p>{description}</p>
      <div style={{ marginTop: '32px', padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', width: '100%', maxWidth: '800px', textAlign: 'center' }}>
        <p>This module is currently being connected to the data pipeline.</p>
        <p style={{ fontSize: '12px', color: '#9CA3AF' }}>Check back soon for the complete data visualization.</p>
      </div>
    </div>
  );
};

export default PlaceholderTab;
