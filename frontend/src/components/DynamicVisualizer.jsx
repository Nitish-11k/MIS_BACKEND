import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Loader2, Maximize2 } from 'lucide-react';
import DynamicDataGrid from './DynamicDataGrid';

const COLORS = ['#F97316', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#14B8A6', '#F59E0B', '#34D399', '#6366F1'];

const formatAmount = (num) => {
  if (num === null || num === undefined) return '0';
  const val = Number(num) / 1000;
  if (Math.abs(val) >= 10000000) return `₹ ${(val / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} Cr`;
  return `₹ ${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

// --- DICTIONARY FOR READABLE NAMES ---
const getReadableName = (key) => {
  const dictionary = {
    'BAL_OUTSTAND': 'Outstanding Balance',
    'OVERDUE_INT': 'Overdue Interest',
    'IRR_AMT': 'Irregular Amount',
    'INCA': 'Income Not Collected (INCA)',
    'UIPY': 'Unrealized Interest (UIPY)',
    'NI': 'Normal Interest',
    'OI': 'Overdue Interest',
    'PRINCIPAL': 'Principal Amount',
    'TOTAL_OUTSTANDING': 'Total Outstanding',
    'BAL_IN_GL': 'GL Balance',
    'DRAWING_POWER': 'Drawing Power',
    'EXCESS_DRAW': 'Excess Draw',
    'CREDIT_BAL': 'Credit Balance',
    'DEBIT_BAL': 'Debit Balance',
    'TOTAL_CREDIT': 'Total Credit',
    'TOTAL_DEBIT': 'Total Debit'
  };
  
  if (dictionary[key]) return dictionary[key];
  
  // Generic fallback: Replace underscores and Capitalize
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const DynamicVisualizer = ({ tableName, title, branchCode = 'ALL', period = '30D', exactDate = '' }) => {
  const [data, setData] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Drill-down State
  const [drillDownBranch, setDrillDownBranch] = useState(null);

  useEffect(() => {
    setLoading(true);
    const activePeriod = exactDate || period;
    const queryParams = new URLSearchParams({ branch_code: branchCode, period: activePeriod }).toString();
    fetch(`http://127.0.0.1:8000/api/visualize/${tableName}?${queryParams}`)
      .then(res => res.json())
      .then(result => {
        if (result && result.length > 0) {
          const metricKeys = Object.keys(result[0]).filter(k => k !== 'BRANCH_CODE' && k !== 'BRANCH_NAME');
          setMetrics(metricKeys);
          
          const formattedData = result.map(row => {
            const branchLabel = row.BRANCH_NAME ? row.BRANCH_NAME.trim() : `Branch ${row.BRANCH_CODE}`;
            const newRow = { name: branchLabel, branchCode: row.BRANCH_CODE };
            metricKeys.forEach(k => {
              newRow[k] = row[k] || 0;
            });
            return newRow;
          });
          
          setData(formattedData);
        } else {
          setData([]);
          setMetrics([]);
        }
      })
      .catch(err => console.error("Error fetching visualization data:", err))
      .finally(() => setLoading(false));
  }, [tableName, branchCode, period, exactDate]);

  const handleChartClick = (entry) => {
    let bCode = null;
    if (entry && typeof entry.branchCode === 'string') {
      bCode = entry.branchCode;
    } else if (entry && entry.payload && typeof entry.payload.branchCode === 'string') {
      bCode = entry.payload.branchCode;
    } else if (entry && entry.activePayload && entry.activePayload.length > 0 && entry.activePayload[0]?.payload?.branchCode) {
      bCode = entry.activePayload[0].payload.branchCode;
    }
    
    if (bCode && typeof bCode === 'string' && bCode !== 'ALL') {
      setDrillDownBranch(bCode);
    }
  };

  // Intelligent Metric Separation
  const balanceMetrics = useMemo(() => {
    return metrics.filter(m => m.includes('BAL') || m.includes('AMT') || m.includes('DRAW') || m.includes('INCA'));
  }, [metrics]);
  
  const rateMetrics = useMemo(() => {
    return metrics.filter(m => m.includes('INT') || m.includes('NI') || m.includes('OI') || m.includes('RATE'));
  }, [metrics]);

  const primaryMetric = balanceMetrics.length > 0 ? balanceMetrics[0] : (metrics[0] || '');
  const secondaryMetric = rateMetrics.length > 0 ? rateMetrics[0] : (metrics.length > 1 ? metrics[1] : (metrics[0] || ''));

  // Derived Data for Donut Chart (Top 5 Branches for Metric 1)
  const donutData = useMemo(() => {
    if (data.length === 0 || !primaryMetric) return [];
    // PieChart crashes on negative values, so we use absolute values for proportion
    const sorted = [...data].sort((a, b) => Math.abs(b[primaryMetric] || 0) - Math.abs(a[primaryMetric] || 0));
    
    if (sorted.length <= 5) {
      return sorted.map(item => ({ ...item, _abs_val: Math.abs(item[primaryMetric] || 0) }));
    }
    
    const top5 = sorted.slice(0, 5).map(item => ({ ...item, _abs_val: Math.abs(item[primaryMetric] || 0) }));
    const othersSum = sorted.slice(5).reduce((acc, row) => acc + (row[primaryMetric] || 0), 0);
    
    return [
      ...top5,
      { name: 'Other Branches', [primaryMetric]: othersSum, _abs_val: Math.abs(othersSum), branchCode: 'ALL' }
    ];
  }, [data, primaryMetric]);

  if (loading) {
    return (
      <div className="card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '600px' }}>
        <Loader2 size={32} className="animate-spin" color="#F97316" />
      </div>
    );
  }

  if (data.length === 0 || metrics.length === 0) {
    return (
      <div className="card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '600px', color: '#6B7280' }}>
        <p style={{ fontWeight: '500', fontSize: '16px', color: '#374151' }}>No Visualizable Data</p>
        <p style={{ fontSize: '14px', marginTop: '8px' }}>There are no aggregateable numeric columns available for this table.</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
        
        {/* TOP ROW: Donut Chart */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', minHeight: '350px' }}>
          
          {/* Donut Chart Widget */}
          <div className="card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
              Top Distribution ({getReadableName(primaryMetric)})
            </div>
            <div style={{ height: '260px', width: '100%', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="_abs_val" // Use absolute value for rendering pie proportions
                    onClick={(entry) => entry && entry.branchCode && entry.branchCode !== 'ALL' && handleChartClick(entry)}
                    style={{ cursor: 'pointer' }}
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => {
                    const total = donutData.reduce((acc, curr) => acc + (curr._abs_val || 0), 0);
                    const val = props && props.payload && props.payload._abs_val ? props.payload._abs_val : value;
                    return total ? `${((val / total) * 100).toFixed(1)}%` : '0%';
                  }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* BOTTOM ROW: Clean Loan Visual Chart (Replaces text grid with high-impact loan metrics visual) */}
        <div className="card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', padding: '24px', flex: 1, minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>
                {title} - Top Branch Comparison
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                Visual breakdown of key loan metrics across top performing branches
              </div>
            </div>
            {primaryMetric && (
              <div style={{ fontSize: '12px', padding: '4px 12px', background: '#F1F5F9', borderRadius: '20px', fontWeight: '600', color: '#475569' }}>
                Primary: {getReadableName(primaryMetric)}
              </div>
            )}
          </div>
          
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={data.slice(0, 10)} 
                margin={{ top: 10, right: 30, left: 10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: '#334155', fontWeight: '600' }} 
                  axisLine={{ stroke: '#CBD5E1' }} 
                  tickLine={false} 
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={45}
                />
                <YAxis 
                  tickFormatter={formatAmount} 
                  tick={{ fontSize: 11, fill: '#64748B' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <Tooltip 
                  formatter={(value, name) => [formatAmount(value), getReadableName(name)]} 
                  cursor={{ fill: '#F8FAFC' }} 
                />
                <Legend 
                  formatter={(value) => getReadableName(value)} 
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} 
                />
                
                {(balanceMetrics.length > 0 ? balanceMetrics.slice(0, 2) : metrics.slice(0, 2)).map((metric, idx) => (
                  <Bar 
                    key={metric} 
                    dataKey={metric} 
                    fill={COLORS[(idx * 2) % COLORS.length]} 
                    radius={[4, 4, 0, 0]}
                    barSize={28}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Drill-down Modal */}
      {drillDownBranch && drillDownBranch !== 'ALL' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', backdropFilter: 'blur(4px)' }}>
          <div style={{ width: '100%', maxWidth: '1400px', height: '90vh', background: '#fff', borderRadius: '12px', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
              <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#0F172A' }}>
                Raw Data Drill-Down (Branch {drillDownBranch})
              </div>
              <button 
                onClick={() => setDrillDownBranch(null)} 
                style={{ background: '#EF4444', border: 'none', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', color: '#fff', transition: 'all 0.2s' }}
              >
                Close (X)
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <DynamicDataGrid 
                tableName={tableName} 
                title={`${title} - Branch ${drillDownBranch}`}
                branchCode={drillDownBranch} 
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DynamicVisualizer;

