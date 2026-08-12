import React, { useState } from 'react';
import DynamicVisualizer from './DynamicVisualizer';

const ComplianceTab = ({ selectedBranch, selectedPeriod, exactDate }) => {
  const [activeSubTab, setActiveSubTab] = useState('interest_exceptions');

  const tabs = [
    { id: 'interest_exceptions', label: 'Interest Rate Exceptions', table: 'EXCEPTION_REPORT_FOR_INTEREST_RATES_VARIATION_DEPD0650' },
    { id: 'general_exceptions', label: 'General Exceptions', table: 'EXCEPTION_REPORT_DEPD0670' },
    { id: 'alterations', label: 'Account Alterations', table: 'ACCOUNT_ALTERATION_DETAILS_REPORT' },
    { id: 'high_value', label: 'High Value Transactions', table: 'REPORT_HIGH_VALUE_TRANSACTIONS' },
    { id: 'voucher', label: 'Voucher Verification', table: 'VOUCHER_VARIFICATION_REPORT_CFPD0331' },
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

export default ComplianceTab;
