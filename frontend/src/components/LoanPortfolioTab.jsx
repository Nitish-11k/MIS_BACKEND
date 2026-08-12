import React, { useState } from 'react';
import DynamicVisualizer from './DynamicVisualizer';

const LoanPortfolioTab = ({ selectedBranch, selectedPeriod, exactDate }) => {
  const [activeSubTab, setActiveSubTab] = useState('balances');

  const tabs = [
    { id: 'balances', label: 'Loan Balances', table: 'BAL_IN_LOAN_ACC_GLCC_WISE_DET' },
    { id: 'npa', label: 'NPA Statement', table: 'NPA_STMT' },
    { id: 'probable_npa', label: 'Probable NPAs', table: 'PROBABLE_NPA_REPORT_LOND2463' },
    { id: 'excess_draws', label: 'Irregular Excess Draws', table: 'IRREGULAR_EXCESS_DRAW_LOND2397CPC' },
    { id: 'drawing_power', label: 'Drawing Power', table: 'DRAWING_POWER_LOND2388' },
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
            key={activeTabConfig.id} // force remount on tab switch
            tableName={activeTabConfig.table} 
            title={activeTabConfig.label} 
          />
        )}
      </div>
    </div>
  );
};

export default LoanPortfolioTab;
