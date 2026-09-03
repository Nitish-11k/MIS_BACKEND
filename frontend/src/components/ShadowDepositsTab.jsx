import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { CreditCard, Hash, Loader2, TrendingUp, TrendingDown, Building2, MapPin } from 'lucide-react';

const COLORS = ['#F97316', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#6366F1'];

const formatCurrency = (val) => {
  if (val === null || val === undefined) return '0';
  const num = Number(val);
  if (Math.abs(num) >= 10000000) return `₹ ${(num / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} Cr`;
  return `₹ ${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const formatCompact = (val) => {
  if (val === null || val === undefined) return '0';
  const num = Number(val);
  if (num >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', padding: '12px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#0F172A', fontSize: '12px' }}>{label || payload[0].name}</p>
        <p style={{ margin: 0, color: payload[0].fill, fontSize: '13px', fontWeight: '700' }}>
          Balance: {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const ShadowDepositsTab = ({ selectedBranch }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewLevel, setViewLevel] = useState('regions'); // 'regions' or 'branches'

  const fetchData = async () => {
    setLoading(true);
    try {
      const bc = selectedBranch || 'ALL';
      const response = await fetch(`http://127.0.0.1:8000/api/shadow-deposits?branch_code=${bc}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching shadow deposits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedBranch]);

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Loader2 size={32} color="#10B981" className="animate-spin" />
        <span style={{ marginLeft: '12px', color: '#64748B', fontWeight: '500' }}>Loading Deposit Data...</span>
      </div>
    );
  }

  if (!data) return null;

  const { overview, status_distribution, top_schemes, top_regions, least_regions, top_branches, least_branches } = data;

  const currentTop = viewLevel === 'regions' ? (top_regions || []) : (top_branches || []);
  const currentLeast = viewLevel === 'regions' ? (least_regions || []) : (least_branches || []);

  return (
    <div className="animate-fade-in" style={{ padding: '0 32px 32px 32px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0F172A', margin: '0 0 8px 0' }}>Deposit Shadow Analysis</h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>Comprehensive view of deposit accounts from shadow core database.</p>
        </div>

        {/* Level Toggle: Regional Offices vs Regional Branches */}
        <div style={{ display: 'flex', background: '#F1F5F9', padding: '4px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <button
            onClick={() => setViewLevel('regions')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', border: 'none', borderRadius: '6px', cursor: 'pointer',
              fontSize: '12px', fontWeight: '600', transition: 'all 0.2s',
              background: viewLevel === 'regions' ? '#fff' : 'transparent',
              color: viewLevel === 'regions' ? '#0F172A' : '#64748B',
              boxShadow: viewLevel === 'regions' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <MapPin size={14} color={viewLevel === 'regions' ? '#10B981' : '#64748B'} />
            Regional Offices
          </button>
          <button
            onClick={() => setViewLevel('branches')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', border: 'none', borderRadius: '6px', cursor: 'pointer',
              fontSize: '12px', fontWeight: '600', transition: 'all 0.2s',
              background: viewLevel === 'branches' ? '#fff' : 'transparent',
              color: viewLevel === 'branches' ? '#0F172A' : '#64748B',
              boxShadow: viewLevel === 'branches' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <Building2 size={14} color={viewLevel === 'branches' ? '#10B981' : '#64748B'} />
            Regional Branches
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748B' }}>Total Accounts</span>
            <Hash size={20} color="#10B981" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#0F172A' }}>{overview?.total_accounts?.toLocaleString('en-IN') || 0}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748B' }}>Total Balance</span>
            <CreditCard size={20} color="#10B981" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#0F172A' }}>{formatCurrency(overview?.total_balance)}</div>
        </div>
      </div>

      {/* Status & Schemes Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: '0 0 16px 0' }}>Status Distribution</h3>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={status_distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>
                  {status_distribution?.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip formatter={(value) => value.toLocaleString('en-IN')} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', margin: '0 0 16px 0' }}>Top Schemes by Balance</h3>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top_schemes} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" tickFormatter={formatCompact} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: '#0F172A' }} axisLine={false} tickLine={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Side-by-Side Cards: Top 5 Regional vs Least 5 Regional */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        
        {/* Card 1: Top 5 Regional */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={16} color="#047857" />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                  Top 5 {viewLevel === 'regions' ? 'Regional Offices' : 'Regional Branches'}
                </h3>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 36px' }}>Highest deposit balances</p>
            </div>
            <span style={{ fontSize: '11px', fontWeight: '700', background: '#ECFDF5', color: '#047857', padding: '4px 10px', borderRadius: '12px' }}>
              Top Performers
            </span>
          </div>

          <div style={{ height: '220px', marginBottom: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentTop} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" tickFormatter={formatCompact} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: '#0F172A', fontWeight: 500 }} axisLine={false} tickLine={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} barSize={18}>
                  {currentTop.map((entry, index) => (
                    <Cell key={`cell-top-${index}`} fill={index === 0 ? '#047857' : '#10B981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* List Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
            {currentTop.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: '6px', background: idx === 0 ? '#F0FDF4' : 'transparent', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: idx === 0 ? '#047857' : '#E2E8F0', color: idx === 0 ? '#fff' : '#475569', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {idx + 1}
                  </span>
                  <div>
                    <span style={{ fontWeight: '600', color: '#0F172A' }}>{item.name}</span>
                    {item.region && item.region !== item.name && (
                      <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '6px' }}>({item.region})</span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: '700', color: '#047857' }}>{formatCurrency(item.value)}</span>
                  {item.accounts !== undefined && (
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>{item.accounts.toLocaleString('en-IN')} accts</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Least 5 Regional */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingDown size={16} color="#EA580C" />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                  Least 5 {viewLevel === 'regions' ? 'Regional Offices' : 'Regional Branches'}
                </h3>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 36px' }}>Lowest deposit balances</p>
            </div>
            <span style={{ fontSize: '11px', fontWeight: '700', background: '#FFF7ED', color: '#C2410C', padding: '4px 10px', borderRadius: '12px' }}>
              Attention Needed
            </span>
          </div>

          <div style={{ height: '220px', marginBottom: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentLeast} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" tickFormatter={formatCompact} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: '#0F172A', fontWeight: 500 }} axisLine={false} tickLine={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#F97316" radius={[0, 4, 4, 0]} barSize={18}>
                  {currentLeast.map((entry, index) => (
                    <Cell key={`cell-least-${index}`} fill={index === 0 ? '#EA580C' : '#F97316'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* List Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
            {currentLeast.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: '6px', background: idx === 0 ? '#FFF7ED' : 'transparent', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: idx === 0 ? '#EA580C' : '#E2E8F0', color: idx === 0 ? '#fff' : '#475569', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {idx + 1}
                  </span>
                  <div>
                    <span style={{ fontWeight: '600', color: '#0F172A' }}>{item.name}</span>
                    {item.region && item.region !== item.name && (
                      <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '6px' }}>({item.region})</span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: '700', color: '#C2410C' }}>{formatCurrency(item.value)}</span>
                  {item.accounts !== undefined && (
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>{item.accounts.toLocaleString('en-IN')} accts</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ShadowDepositsTab;

