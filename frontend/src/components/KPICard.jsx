import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const formatAmount = (num) => {
  if (num === null || num === undefined) return '₹ 0.00';
  const val = Number(num) / 1000;
  if (Math.abs(val) >= 10000000) return `₹ ${(val / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} Cr`;
  return `₹ ${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

// Generate dummy sparkline data based on trend type
const generateSparklineData = (isPositive) => {
  const data = [];
  let current = 100;
  for (let i = 0; i < 10; i++) {
    data.push({ value: current });
    current += (Math.random() * 20 - (isPositive ? 5 : 15));
  }
  return data;
};

const KPICard = ({ title, value, isCurrency = true, changePercent, changeType = 'positive', periodLabel = '30D', onClick }) => {
  const sparklineData = generateSparklineData(changeType === 'positive');
  const sparklineColor = changeType === 'positive' ? '#10B981' : '#EF4444';

  return (
    <div 
      onClick={onClick} 
      style={{ 
        cursor: onClick ? 'pointer' : 'default', 
        padding: '20px 24px', 
        borderRadius: '8px', 
        display: 'flex', 
        flexDirection: 'column', 
        background: '#fff', 
        border: '1px solid #E2E8F0',
        boxShadow: 'var(--shadow-premium)',
        position: 'relative'
      }}
    >
      <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
        {title}
      </div>
      
      <div style={{ fontSize: 'clamp(20px, 3vw, 24px)', fontWeight: '700', color: '#0F172A', marginBottom: '16px', whiteSpace: 'nowrap' }}>
        {isCurrency ? formatAmount(value) : (value || 0).toLocaleString()}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 'auto' }}>
        {changePercent ? (
          <>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
                <span style={{ 
                  color: sparklineColor, 
                  fontWeight: '700', 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {changeType === 'positive' ? '▲' : '▼'} {changePercent}%
                </span>
              </div>
              <div style={{ color: '#64748B', fontSize: '11px', marginTop: '4px' }}>vs last {periodLabel}</div>
            </div>

            <div style={{ width: '80px', height: '30px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke={sparklineColor} 
                    strokeWidth={2} 
                    dot={false} 
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
           <div style={{ color: '#94A3B8', fontSize: '11px', marginTop: '4px' }}>Aggregated by backend</div>
        )}
      </div>
    </div>
  );
};

export default KPICard;
