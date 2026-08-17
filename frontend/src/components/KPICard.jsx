import React from 'react';

const formatAmount = (num) => {
  if (num === null || num === undefined) return '0';
  const absNum = Math.abs(num);
  
  let val = '';
  let suffix = '';
  
  if (absNum >= 10000000) { val = (absNum / 10000000).toFixed(2); suffix = ' Cr'; }
  else if (absNum >= 100000) { val = (absNum / 100000).toFixed(2); suffix = ' L'; }
  else if (absNum >= 1000) { val = (absNum / 1000).toFixed(2); suffix = ' K'; }
  else { val = absNum.toFixed(2); suffix = ''; }

  return `₹ ${val}${suffix}`;
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
      <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: '600', marginBottom: '8px' }}>
        {title}
      </div>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '8px', whiteSpace: 'nowrap' }}>
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
