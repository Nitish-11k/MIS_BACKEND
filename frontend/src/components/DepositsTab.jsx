import React, { useState } from 'react';
import DynamicVisualizer from './DynamicVisualizer';

const DepositsTab = ({ selectedBranch, selectedPeriod, exactDate }) => {
  const [activeSubTab, setActiveSubTab] = useState('deposits');

  const tabs = [
    { id: 'deposits', label: 'Deposit Balances', table: 'DEPOSITS_BALANCE_FILE_DEPD0586' },
    { id: 'ccod', label: 'CC/OD Balances', table: 'CC_OD_BALANCE_FILE_DEPD0580' },
    { id: 'gldaybook', label: 'GL Daybook', table: 'GL_DAYBOOK_GEND0807' },
    { id: 'glcc_summary', label: 'GLCC Wise Summary', table: 'GLCC_WISE_SUM_REP' },
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

export default DepositsTab;
