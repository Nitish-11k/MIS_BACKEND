import React, { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

const formatAmount = (num) => {
  if (num === null || num === undefined) return '0';
  const val = Number(num) / 1000;
  if (Math.abs(val) >= 10000000) return `₹ ${(val / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} Cr`;
  return `₹ ${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const LeaderboardWidget = ({ title, data, dataKey, nameKey, color = '#2563EB', isCurrency = true }) => {
  const [viewMode, setViewMode] = useState('top'); // 'top' or 'least'

  if (!data || data.length === 0) {
    return (
      <div className="card" style={{ padding: '24px', backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '20px' }}>{title}</div>
        <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
          No data available
        </div>
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) => b[dataKey] - a[dataKey]);
  const displayData = viewMode === 'top' 
    ? sortedData.slice(0, 5) 
    : sortedData.slice(-5).reverse();

  return (
    <div className="card" style={{ padding: '24px', backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A' }}>{title}</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setViewMode('top')}
            style={{ 
              padding: '4px 12px', fontSize: '12px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontWeight: '600',
              background: viewMode === 'top' ? color : '#F1F5F9',
              color: viewMode === 'top' ? '#fff' : '#64748B'
            }}
          >Top 5</button>
          <button 
            onClick={() => setViewMode('least')}
            style={{ 
              padding: '4px 12px', fontSize: '12px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontWeight: '600',
              background: viewMode === 'least' ? color : '#F1F5F9',
              color: viewMode === 'least' ? '#fff' : '#64748B'
            }}
          >Least 5</button>
        </div>
      </div>
      
      <div style={{ height: '280px', flex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={displayData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
            <XAxis type="number" hide />
            <YAxis dataKey={nameKey} type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} width={120} />
            <Tooltip 
              formatter={(value) => isCurrency ? formatAmount(value) : value.toLocaleString()} 
              cursor={{ fill: '#F8FAFC' }} 
            />
            <Bar dataKey={dataKey} radius={[0, 4, 4, 0]} barSize={24}>
              {displayData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LeaderboardWidget;
