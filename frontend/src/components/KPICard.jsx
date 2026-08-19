import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const formatAmount = (num) => {
  if (num === null || num === undefined) return '0';
  const absNum = Math.abs(num);
  
  let val = '';
  let suffix = '';
  
  // Adjusted to match mockup exactly (e.g., Lakhs and Cr)
  if (absNum >= 10000000) { val = (absNum / 10000000).toFixed(2); suffix = ' Cr'; }
  else if (absNum >= 100000) { val = (absNum / 100000).toFixed(2); suffix = ' Lakh'; }
  else if (absNum >= 1000) { val = (absNum / 1000).toFixed(2); suffix = ' K'; }
  else { val = absNum.toFixed(2); suffix = ''; }

  return `₹${val}${suffix}`;
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

const KPICard = ({ title, value, isCurrency = true, changePercent, changeType = 'positive', onClick }) => {
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
              <div style={{ color: '#64748B', fontSize: '11px', marginTop: '4px' }}>Trend</div>
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
