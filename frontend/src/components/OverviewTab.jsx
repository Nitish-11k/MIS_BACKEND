import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import KPICard from './KPICard';

const COLORS = ['#F97316', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#14B8A6'];

const OverviewTab = ({ kpiData, accountMetrics, branchNpaData, barChartData, pieData, setActiveModal }) => {
  return (
    <div className="dashboard-content" style={{ padding: '24px 32px', overflowY: 'auto' }}>
      
      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <KPICard title="Total Deposits" value={kpiData.total_deposits} changePercent="8.3" changeType="positive" onClick={() => setActiveModal('deposits')} />
        <KPICard title="Total Loans" value={kpiData.total_loans} changePercent="5.7" changeType="positive" onClick={() => setActiveModal('loans')} />
        <KPICard title="Total NPA" value={kpiData.total_npa} changePercent="2.1" changeType="negative" warning={true} warningText="Click to view accounts >" onClick={() => setActiveModal('npa')} />
        <KPICard title="Accounts Opened" value={accountMetrics.opened} isCurrency={false} changePercent="12.4" changeType="positive" onClick={() => setActiveModal('opened')} />
        <KPICard title="Accounts Closed" value={accountMetrics.closed} isCurrency={false} changePercent="4.8" changeType="negative" onClick={() => setActiveModal('closed')} />
      </div>

      {/* Second Row: NPA Bar Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginBottom: '24px' }}>
        {/* NPA Defaulting Branches */}
        <div className="card" style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#111827' }}>NPA Defaulting Branches</div>
              <div style={{ fontSize: '13px', color: '#6B7280' }}>Outstanding vs Covered (₹ Lakhs)</div>
            </div>
            <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: '20px', padding: '4px' }}>
              <div style={{ background: '#F97316', color: '#fff', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '500' }}>Top 5</div>
              <div style={{ color: '#6B7280', padding: '4px 12px', fontSize: '12px', fontWeight: '500' }}>Least 5</div>
            </div>
          </div>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchNpaData.slice(0,5)} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }} barGap={0}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} width={120} />
                <Tooltip cursor={{ fill: '#F9FAFB' }} />
                <Bar dataKey="NPA" fill="#EF4444" barSize={12} radius={[0, 4, 4, 0]} />
                <Bar dataKey="Covered" fill="#10B981" barSize={12} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Third Row: 2 smaller charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Credit vs Debit */}
        <div className="card" style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#111827' }}>Product-wise Credit vs Debit</div>
            <div style={{ fontSize: '13px', color: '#6B7280' }}>₹ in Lakhs</div>
          </div>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="name" hide />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip cursor={{ fill: '#F9FAFB' }} />
                <Bar dataKey="Credit" fill="#3B82F6" barSize={15} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Debit" fill="#F97316" barSize={15} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Account Distribution */}
        <div className="card" style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#111827' }}>Account Distribution</div>
            <div style={{ fontSize: '13px', color: '#6B7280' }}>By account type</div>
          </div>
          <div style={{ height: '300px', display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '50%', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {pieData.map((entry, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span style={{ color: '#4B5563' }} title={entry.name}>{entry.name.substring(0,18)}</span>
                  </div>
                  <span style={{ fontWeight: 'bold', color: '#111827' }}>{entry.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default OverviewTab;
