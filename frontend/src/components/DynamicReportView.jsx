import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Activity, Database, FileText } from 'lucide-react';

const COLORS = ['#20C48F', '#15559F', '#FF6B6B', '#46C9D7', '#814C9E', '#FFB74D'];

const formatAmount = (num) => {
  if (typeof num !== 'number') return num;
  if (Math.abs(num) >= 10000000) return `₹ ${(num / 10000000).toFixed(2)} Cr`;
  return `₹ ${new Intl.NumberFormat('en-IN').format(num)}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: '#fff', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: '12px' }}>
        <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#1C2B4F' }}>{label || payload[0].name}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ margin: 0, color: p.color || '#5A6A85' }}>
            {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const DynamicReportView = ({ tableName, selectedBranch = 'ALL' }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tableName) return;
    setLoading(true);
    fetch(`http://localhost:8000/api/report-stats/${tableName}?branch_code=${selectedBranch}`)
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tableName, selectedBranch]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#5A6A85' }}>
        Loading report analytics...
      </div>
    );
  }

  if (!stats || stats.error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#FF6B6B' }}>
        Failed to load analytics for this report.
      </div>
    );
  }

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* Total Rows Card */}
        <div className="card kpi-card" style={{ flex: '1', minWidth: '200px', display: 'flex', alignItems: 'center' }}>
          <div className="kpi-icon" style={{ backgroundColor: 'rgba(32,196,143,0.1)' }}>
            <Database size={24} color="#20C48F" />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Records</span>
            <span className="kpi-value" title={stats.total_rows.toLocaleString()}>{stats.total_rows.toLocaleString()}</span>
          </div>
        </div>

        {/* Dynamic Metric Cards */}
        {stats.metrics && stats.metrics.map((metric, i) => (
          <div key={i} className="card kpi-card" style={{ flex: '1', minWidth: '200px', display: 'flex', alignItems: 'center' }}>
            <div className="kpi-icon" style={{ backgroundColor: 'rgba(21,85,159,0.1)' }}>
              <Activity size={24} color="#15559F" />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Total {metric.column}</span>
              <span className="kpi-value" style={{ fontSize: '18px', cursor: 'help' }} title={`₹ ${metric.sum.toLocaleString()}`}>
                {formatAmount(metric.sum)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        {/* Distribution Pie Chart */}
        {stats.distribution && stats.distribution.length > 0 && (
          <div className="card">
            <div className="chart-header">Distribution by {stats.distribution_column}</div>
            <div style={{ display: 'flex', height: 300, alignItems: 'center' }}>
              <div style={{ width: '55%', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.distribution} innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" cx="50%" cy="50%">
                      {stats.distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ width: '45%', paddingLeft: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {stats.distribution.slice(0, 8).map((item, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontSize: '11px' }}>
                    <div style={{ minWidth: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length], marginRight: '8px' }}></div>
                    <span style={{ color: '#1C2B4F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.name}>{item.name}</span>
                    <span style={{ marginLeft: 'auto', fontWeight: '600' }}>{item.value}</span>
                  </div>
                ))}
                {stats.distribution.length > 8 && <div style={{ fontSize: '10px', color: '#5A6A85', marginTop: '4px' }}>And {stats.distribution.length - 8} more...</div>}
              </div>
            </div>
          </div>
        )}

        {/* Top Values Bar Chart */}
        {stats.distribution && stats.distribution.length > 0 && (
          <div className="card">
            <div className="chart-header">Top Frequencies: {stats.distribution_column}</div>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.distribution.slice(0, 10)} margin={{ top: 20, right: 10, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#5A6A85', angle: -30, textAnchor: 'end' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#5A6A85' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#15559F" radius={[4, 4, 0, 0]} barSize={20} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicReportView;
