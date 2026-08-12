import React, { useState } from 'react';
import DynamicVisualizer from './DynamicVisualizer';

const ReportsTab = ({ selectedBranch, selectedPeriod, exactDate }) => {
  const [activeSubTab, setActiveSubTab] = useState('opened');

  const tabs = [
    { id: 'opened', label: 'Accounts Opened', table: 'ACCOUNT_OPENED_REPORT' },
    { id: 'closed', label: 'Accounts Closed', table: 'ACCOUNT_CLOSED_REPORT' },
    { id: 'least_interacting', label: 'Least Interacting IDs', table: 'ID_LEAST_TRANSACTION_LOND2482' },
  ];

  const activeTabConfig = tabs.find(t => t.id === activeSubTab);

  return (
    <div className="dashboard-content" style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: activeSubTab === tab.id ? '#0B1F3A' : 'transparent',
              color: activeSubTab === tab.id ? '#fff' : '#4B5563',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div style={{ flex: 1, minHeight: 0 }}>
        {activeTabConfig && (
          <DynamicVisualizer 
            key={activeTabConfig.id}
            tableName={activeTabConfig.table} 
            title={activeTabConfig.label} 
          />
        )}
      </div>
    </div>
  );
};

export default ReportsTab;
