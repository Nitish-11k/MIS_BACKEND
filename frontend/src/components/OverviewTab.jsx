import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend, LabelList
} from 'recharts';
import KPICard from './KPICard';
import { ArrowRight, ShieldCheck } from 'lucide-react';

const COLORS = ['#0F172A', '#D4AF37', '#10B981', '#8B5CF6', '#EF4444'];


const OverviewTab = ({
  kpiData,
  accountMetrics,
  branchNpaData,
  barChartData,
  pieData,
  trendData,
  npaSummaryData,
  auditData,
  npaTrendData,
  selectedPeriod,
  setActiveModal,
  setActiveTab,
  selectedPeriod,
}) => {
  const sortedNpaData = useMemo(() => {
    if (!Array.isArray(branchNpaData)) return [];
    return [...branchNpaData]
      .map(item => ({ name: (item.BRANCH_NAME || item.name || '').substring(0, 15), value: Number(item.NPA) || 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [branchNpaData]);

  const totalBusiness = useMemo(() => {
    if (!pieData || !pieData.length) return 0;
    return pieData.reduce((acc, curr) => acc + (curr.value || 0), 0);
  }, [pieData]);

  return (
    <div className="dashboard-content" style={{ padding: '24px 32px', overflowY: 'auto' }}>
      
      {/* KPI ROW */}
      <div className="overview-kpi-grid">
        <KPICard title="TOTAL ACCOUNTS" value={accountMetrics?.total || 0} isCurrency={false} changePercent="7.2" changeType="positive" periodLabel={selectedPeriod} onClick={() => setActiveModal('total')} />
        <KPICard title="TOTAL DEPOSITS" value={kpiData?.total_deposits || 0} isCurrency={true} changePercent="8.3" changeType="positive" periodLabel={selectedPeriod} onClick={() => setActiveModal('deposits')} />
        <KPICard title="TOTAL LOANS" value={kpiData?.total_loans || 0} isCurrency={true} changePercent="6.1" changeType="positive" periodLabel={selectedPeriod} onClick={() => setActiveModal('loans')} />
        <KPICard title="TOTAL NPA" value={kpiData?.total_npa || 0} isCurrency={true} changePercent="12.6" changeType="negative" periodLabel={selectedPeriod} onClick={() => setActiveModal('npa')} />
        <KPICard title="OPENED ACCOUNTS" value={accountMetrics?.opened || 0} isCurrency={false} changePercent="5.4" changeType="positive" periodLabel={selectedPeriod} onClick={() => setActiveModal('opened')} />
        <KPICard title="CLOSED ACCOUNTS" value={accountMetrics?.closed || 0} isCurrency={false} changePercent="3.7" changeType="negative" periodLabel={selectedPeriod} onClick={() => setActiveModal('closed')} />
      </div>

      {/* MIDDLE ROW (3 Charts) */}
      <div className="overview-npa-summary-grid" style={{ gap: '24px', marginBottom: '24px' }}>
        
        {/* Deposits vs Loans Trend */}
        <div className="card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: 'var(--shadow-premium)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Deposits vs Loans Trend</h3>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>{selectedPeriod}</span>
          </div>
          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData && barChartData.length > 0 ? barChartData : trendData || []} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip cursor={{ fill: '#F8FAFC' }} />
                <Legend verticalAlign="top" height={36} iconType="rect" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Deposits" name="Deposits" fill="#0F172A" barSize={12} radius={[2, 2, 0, 0]} />
                <Bar dataKey="Loans" name="Loans" fill="#D4AF37" barSize={12} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* NPA Trend (%) */}
        <div className="card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: 'var(--shadow-premium)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: 0 }}>NPA Trend (%)</h3>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>{selectedPeriod}</span>
          </div>
          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData && trendData.length > 0 ? trendData : []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNpa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => val+"%"} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorNpa)" activeDot={{ r: 6, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }} dot={{ r: 4, fill: '#EF4444', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Branches */}
        <div className="card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: 'var(--shadow-premium)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Top 5 Branches by NPA</h3>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>{selectedPeriod}</span>
          </div>
          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedNpaData && sortedNpaData.length > 0 ? sortedNpaData : []} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#0F172A', fontWeight: 500 }} width={100} />
                <Tooltip cursor={{ fill: '#F8FAFC' }} />
                <Bar dataKey="value" fill="#0F172A" barSize={12} radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="value" position="right" style={{ fontSize: '11px', fill: '#64748B' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* BOTTOM ROW (3 Widgets) */}
      <div className="overview-npa-summary-grid" style={{ gap: '24px', marginBottom: '24px' }}>
        
        {/* Business Mix */}
        <div className="card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: 'var(--shadow-premium)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: '0 0 16px 0' }}>Business Mix</h3>
          <div style={{ display: 'flex', alignItems: 'center', height: '200px' }}>
            <div style={{ width: '60%', height: '100%', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData && pieData.length > 0 ? pieData : [{name: 'Empty', value: 100}]} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                    {(pieData && pieData.length > 0 ? pieData : [{name: 'Empty', value: 100}]).map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '600' }}>Total</div>
                <div style={{ fontSize: '14px', color: '#0F172A', fontWeight: '700' }}>100%</div>
              </div>
            </div>
            <div style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(pieData && pieData.length > 0 ? pieData : []).slice(0,4).map((entry, index) => (
                <div key={index} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span style={{ color: '#0F172A', fontWeight: '500', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.name}>{entry.name}</span>
                  </div>
                  <span style={{ color: '#64748B', fontWeight: '600' }}>{totalBusiness > 0 ? ((entry.value / totalBusiness) * 100).toFixed(1) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '16px' }}>As on 12 Aug 2026</div>
        </div>

        {/* NPA Summary */}
        <div className="card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: 'var(--shadow-premium)', overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: 0 }}>NPA Summary</h3>
            <span style={{ fontSize: '12px', color: '#3B82F6', cursor: 'pointer', fontWeight: '600' }}>View Details</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ textAlign: 'left', padding: '12px 8px', color: '#64748B', fontWeight: '600' }}>Category</th>
                <th style={{ textAlign: 'center', padding: '12px 8px', color: '#64748B', fontWeight: '600' }}>Amount (Cr)</th>
                <th style={{ textAlign: 'center', padding: '12px 8px', color: '#64748B', fontWeight: '600' }}>% of Loans</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', color: '#64748B', fontWeight: '600' }}>Change (vs last 30D)</th>
              </tr>
            </thead>
            <tbody>
              {(npaSummaryData || []).map((row, i) => (
                <tr key={i} className="animate-slide-up" style={{ animationDelay: `${i * 0.1}s`, borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 8px', color: '#0F172A', fontWeight: '500' }}>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      backgroundColor: row.category.toLowerCase().includes('doubtful') || row.category.toLowerCase().includes('loss') ? '#FEE2E2' : '#EFF6FF',
                      color: row.category.toLowerCase().includes('doubtful') || row.category.toLowerCase().includes('loss') ? '#991B1B' : '#1E40AF',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {row.category}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', color: '#0F172A' }}>{row.amount}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'center', color: '#0F172A' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <div style={{ width: '40px', height: '4px', backgroundColor: '#E2E8F0', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${row.pct || 0}%`, height: '100%', backgroundColor: '#3B82F6' }}></div>
                      </div>
                      <span style={{ fontSize: '11px' }}>{row.pct}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', color: row.isPositive ? '#10B981' : '#EF4444', fontWeight: '600' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', background: row.isPositive ? '#D1FAE5' : '#FEE2E2', padding: '4px 8px', borderRadius: '12px', display: 'inline-flex' }}>
                      {row.isPositive ? '▲' : '▼'} {row.change}%
                    </div>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan="4" style={{ padding: '16px 8px 8px 8px', textAlign: 'center', color: '#64748B', fontSize: '11px' }}>Total values aggregated by backend</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Audit & Exceptions */}
        <div className="card" style={{ background: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '20px', boxShadow: 'var(--shadow-premium)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Audit & Exceptions</h3>
            <span style={{ fontSize: '12px', color: '#3B82F6', cursor: 'pointer', fontWeight: '600' }}>View All</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {auditData && auditData.length > 0 ? auditData.map((audit, i) => (
              <div key={i} className="animate-slide-up" style={{ animationDelay: `${i * 0.1}s`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#F8FAFC', borderRadius: '8px', borderLeft: `4px solid ${audit.color || '#3B82F6'}`, transition: 'all 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: '600' }}>{audit.title}</span>
                <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '12px', backgroundColor: `${audit.color}20`, color: audit.color || '#3B82F6', fontWeight: '700' }}>{audit.count} Items</span>
              </div>
            )) : (
              <div className="animate-slide-up" style={{ textAlign: 'center', color: '#64748B', fontSize: '13px', padding: '30px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', background: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
                <ShieldCheck size={28} color="#94A3B8" />
                <span style={{ fontWeight: '500' }}>No exceptions found</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* QUICK LINKS FOOTER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', padding: '16px 20px', boxShadow: 'var(--shadow-premium)', overflowX: 'auto' }}>
        <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', margin: 0, whiteSpace: 'nowrap' }}>Quick Links</h4>
        
        {[
          { label: 'Deposits', action: () => setActiveTab('deposits') },
          { label: 'Loans Portfolio', action: () => setActiveTab('loans') },
          { label: 'NPA Drill-down', action: () => setActiveModal('npa') },
          { label: 'Compliance', action: () => setActiveTab('compliance') },
          { label: 'Reports', action: () => setActiveTab('reports') },
        ].map((link, i) => (
          <div key={i} onClick={link.action} style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: '#F8FAFC', 
            padding: '8px 16px', borderRadius: '20px', 
            cursor: 'pointer', whiteSpace: 'nowrap',
            border: '1px solid #E2E8F0',
            transition: 'background 0.2s'
          }}>
            <span style={{ fontSize: '12px', color: '#0F172A', fontWeight: '500' }}>{link.label}</span>
            <ArrowRight size={14} color="#64748B" />
          </div>
        ))}
      </div>

    </div>
  );
};

export default OverviewTab;