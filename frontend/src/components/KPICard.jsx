import React from 'react';

const formatAmount = (num) => {
  if (!num) return '0';
  if (num >= 10000000) return `₹ ${(num / 10000000).toFixed(0)} Cr`;
  if (num >= 100000) return `₹ ${(num / 100000).toFixed(0)} L`;
  if (num >= 1000) return `₹ ${(num / 1000).toFixed(0)} K`;
  return `₹ ${num.toFixed(0)}`;
};

const KPICard = ({ title, value, isCurrency = true, changePercent, changeType = 'positive', warning = false, onClick, warningText }) => {
  return (
    <div 
      onClick={onClick} 
      style={{ 
        cursor: onClick ? 'pointer' : 'default', 
        padding: '20px', 
        borderRadius: '12px', 
        display: 'flex', 
        flexDirection: 'column', 
        background: '#fff', 
        border: '1px solid #E5E7EB',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        position: 'relative'
      }}
    >
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
        {isCurrency ? formatAmount(value) : (value || 0).toLocaleString()}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
        <span style={{ 
          color: changeType === 'positive' ? '#10B981' : '#EF4444', 
          fontWeight: '600', 
          display: 'flex', 
          alignItems: 'center',
          gap: '4px'
        }}>
          {changeType === 'positive' ? '▲' : '▼'} {changePercent}%
        </span>
        <span style={{ color: '#6B7280', marginLeft: '6px' }}>vs last period</span>
      </div>

      {warning && (
        <div style={{ position: 'absolute', top: '16px', right: '16px', background: '#FEF3C7', color: '#D97706', padding: '4px', borderRadius: '4px', fontSize: '10px' }}>
          ⚠️
        </div>
      )}

      {warningText && (
        <div style={{ marginTop: '16px', fontSize: '12px', color: '#F97316', fontWeight: '500' }}>
          {warningText}
        </div>
      )}
    </div>
  );
};

export default KPICard;
