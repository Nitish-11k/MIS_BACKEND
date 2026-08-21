import React, { useEffect, useMemo, useState } from 'react';
import DataTable from 'react-data-table-component';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
  ComposedChart,
  Line,
} from 'recharts';

const API_BASE = 'http://127.0.0.1:8000';

const COLORS = [
  '#F97316',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EF4444',
  '#14B8A6',
  '#EAB308',
  '#6366F1',
];

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;

  const cleaned = String(value)
    .replace(/,/g, '')
    .replace(/[₹$]/g, '')
    .trim();

  const number = Number(cleaned);

  return Number.isFinite(number) ? Math.abs(number) : 0;
};

const formatINR = (value) => {
  const number = toNumber(value);

  return `₹ ${new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(number)}`;
};

const formatLakhs = (value) => {
  return `₹ ${new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(toNumber(value) / 100000)} L`;
};

const formatCompact = (value) => {
  const number = toNumber(value);
  const num = number / 1000;
  if (Math.abs(num) >= 10000000) return `₹ ${(num / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} Cr`;
  return `₹ ${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const StatCard = ({ title, value, subtitle }) => {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '18px',
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: '12px',
          color: '#64748B',
          marginBottom: '8px',
          fontWeight: '600',
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#0F172A',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={String(value)}
      >
        {value}
      </div>

      {subtitle && (
        <div
          style={{
            marginTop: '6px',
            fontSize: '11px',
            color: '#94A3B8',
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};

const ChartCard = ({ title, subtitle, children }) => {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '18px',
        minHeight: '330px',
      }}
    >
      <div style={{ marginBottom: '14px' }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: '700',
            color: '#0F172A',
          }}
        >
          {title}
        </div>

        {subtitle && (
          <div
            style={{
              marginTop: '4px',
              fontSize: '11px',
              color: '#64748B',
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      <div style={{ height: '260px' }}>
        {children}
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        padding: '10px 12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      {label && (
        <div
          style={{
            fontSize: '12px',
            fontWeight: '700',
            color: '#0F172A',
            marginBottom: '6px',
          }}
        >
          {label}
        </div>
      )}

      {payload.map((item, index) => (
        <div
          key={index}
          style={{
            fontSize: '11px',
            color: '#475569',
            marginTop: '3px',
          }}
        >
          {item.name}: {item.name.includes('count') || item.name.includes('Accounts') ? Number(item.value).toLocaleString('en-IN') : formatCr(item.value)}
        </div>
      ))}
    </div>
  );
};

const customTableStyles = {
  headRow: {
    style: {
      backgroundColor: '#0F172A',
      color: '#FFFFFF',
      fontSize: '13px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      borderTopLeftRadius: '8px',
      borderTopRightRadius: '8px',
      borderBottom: 'none'
    },
  },
  rows: {
    style: {
      fontSize: '13px',
      color: '#334155',
      backgroundColor: '#FFFFFF',
      borderBottomColor: '#E2E8F0',
      transition: 'all 0.2s ease',
      '&:hover': {
        backgroundColor: '#F8FAFC',
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
        zIndex: 1,
        position: 'relative',
        cursor: 'pointer'
      },
    },
    stripedStyle: {
      backgroundColor: '#F8FAFC',
    }
  },
  pagination: {
    style: {
      borderTop: '1px solid #E5E7EB',
      fontSize: '13px',
      color: '#64748B'
    }
  }
};

const STATUS_COLORS = {
  Open: '#10B981',
  Dormant: '#6366F1',
  Unclaimed: '#F59E0B',
  Inoperative: '#F97316',
  Closed: '#EF4444',
  Inactive: '#8B5CF6',
  Others: '#94A3B8',
};

const SCHEME_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#F97316', '#6366F1', '#EC4899', '#0EA5E9'];

const formatCr = (num) => {
  if (num === null || num === undefined) return '₹0';
  const val = Number(num) / 1000;
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} Cr`;
  return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const isMasterType = (type) => ['total', 'deposits', 'loans'].includes(type);

const SmartModal = ({ activeModal: type, branchCode, period, startDate, endDate, onClose }) => {
  const [data, setData] = useState([]);
  const [masterStats, setMasterStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [drillDownRegion, setDrillDownRegion] = useState(null);
  const [showOtherCodes, setShowOtherCodes] = useState(false);

  const config = useMemo(() => {
    switch (type) {
      case 'deposits':
        return { endpoint: '/api/deposit-branch-wise', title: 'Total Deposits - Region Wise', amountKey: 'value', amountLabel: 'Deposit Balance' };
      case 'loans':
        return { endpoint: '/api/loan-branch-wise', title: 'Total Loans - Region Wise', amountKey: 'value', amountLabel: 'Loan Balance' };
      case 'total':
        return { endpoint: '/api/master-stats', title: 'Total Accounts Overview', amountKey: 'value', amountLabel: 'Total Accounts', isMaster: true };
      case 'npa':
        return { endpoint: '/api/npa-branch-wise', title: 'NPA Analysis', amountKey: 'value', amountLabel: 'NPA Balance' };
      case 'opened':
        return { endpoint: '/api/opened-branch-wise', title: 'Accounts Opened Analysis', amountKey: 'value', amountLabel: 'Opened Accounts', isCount: true };
      case 'closed':
        return { endpoint: '/api/closed-branch-wise', title: 'Accounts Closed Analysis', amountKey: 'value', amountLabel: 'Closed Accounts', isCount: true };
      default:
        return null;
    }
  }, [type]);

  useEffect(() => {
    if (!config) return;
    const controller = new AbortController();
    const loadData = async () => {
      setLoading(true);
      try {
        const bc = drillDownRegion ? `REGION:${drillDownRegion}` : (branchCode || 'ALL');
        if (config.isMaster) {
          const res = await fetch(`${API_BASE}/api/master-stats?branch_code=${bc}`, { signal: controller.signal });
          const result = await res.json();
          setMasterStats(result);
        } else {
          const params = new URLSearchParams({ branch_code: bc });
          if (startDate && endDate) { params.append('start_date', startDate); params.append('end_date', endDate); }
          else if (startDate) { params.append('start_date', startDate); }
          else { params.append('period', period || 'ALL'); }
          const response = await fetch(`${API_BASE}${config.endpoint}?${params.toString()}`, { signal: controller.signal });
          if (!response.ok) throw new Error(`API failed: ${response.status}`);
          const result = await response.json();
          setData(Array.isArray(result) ? result : []);
        }
      } catch (error) {
        if (error.name !== 'AbortError') { console.error('SmartModal API error:', error); setData([]); }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadData();
    return () => controller.abort();
  }, [config, branchCode, period]);

  const normalizedData = useMemo(() => {
    return data
      .map((row, index) => {
        const name =
          row.name ||
          row.branch_name ||
          row.BRANCH_NAME ||
          ((branchCode === 'ALL' && !drillDownRegion) ? `Regional Office ${index + 1}` : `Branch ${index + 1}`);

        const rawValue =
          row.value ??
          row.deposits ??
          row.Deposits ??
          row.loans ??
          row.Loans ??
          row.NPA ??
          row.npa ??
          row.opened ??
          row.closed ??
          0;

        return {
          ...row,
          id: index,
          name,
          numericValue: toNumber(rawValue),
        };
      })
      .filter((row) => {
        if (!search.trim()) return true;

        return row.name
          .toLowerCase()
          .includes(search.trim().toLowerCase());
      });
  }, [data, search]);

  const totalValue = useMemo(() => {
    return normalizedData.reduce(
      (sum, row) => sum + row.numericValue,
      0
    );
  }, [normalizedData]);

  const sortedData = useMemo(() => {
    return [...normalizedData].sort(
      (a, b) => b.numericValue - a.numericValue
    );
  }, [normalizedData]);

  const topData = sortedData;

  const pieData = sortedData
    .filter((row) => row.numericValue > 0)
    .slice(0, 6)
    .map((row) => ({
      name: row.name,
      value: row.numericValue,
    }));

  const tableColumns = [
    {
      name: (branchCode === 'ALL' && !drillDownRegion) ? 'Regional Office' : 'Branch',
      selector: (row) => row.name,
      sortable: true,
      grow: 2,
      wrap: true,
    },
    {
      name: config?.isCount ? config.amountLabel : `${config?.amountLabel} (₹)`,
      selector: (row) => row.numericValue,
      sortable: true,
      right: true,
      grow: 1,
      cell: (row) =>
        config?.isCount
          ? row.numericValue.toLocaleString('en-IN')
          : formatCr(row.numericValue),
    },
    ...(type === 'opened' || type === 'closed' || type === 'total'
      ? [
          {
            name: 'Deposit Accounts',
            selector: (row) => row.deposit_accounts || 0,
            sortable: true,
            right: true,
            cell: (row) => (row.deposit_accounts || 0).toLocaleString('en-IN'),
          },
          {
            name: 'Loan Accounts',
            selector: (row) => row.loan_accounts || 0,
            sortable: true,
            right: true,
            cell: (row) => (row.loan_accounts || 0).toLocaleString('en-IN'),
          },
        ]
      : []),
    {
      name: 'Share',
      selector: (row) => row.numericValue,
      sortable: true,
      right: true,
      cell: (row) => {
        if (!totalValue) return '0%';

        return `${((row.numericValue / totalValue) * 100).toFixed(2)}%`;
      },
    },
  ];

  if (!config) return null;

  // ===== MASTER STATS MODAL (total / deposits / loans) =====
  if (config.isMaster) {
    const dep = masterStats?.deposits || {};
    const loan = masterStats?.loans || {};
    const depStatuses = dep.statuses || {};
    const loanSchemes = loan.schemes || [];

    // Deposit pie data
    const depPieData = ['Open', 'Dormant', 'Unclaimed', 'Inoperative', 'Closed', 'Inactive']
      .map(s => ({ name: s, value: depStatuses[s] || 0, fill: STATUS_COLORS[s] }))
      .filter(d => d.value > 0);
    if (depStatuses.Others?.count) depPieData.push({ name: 'Others', value: depStatuses.Others.count, fill: STATUS_COLORS.Others });

    // Loan pie data - show top 8 individually, rest as "Others"
    const MAX_LOAN_SHOW = 8;
    const loanPieData = [];
    let loanOthersCount = 0;
    let loanOthersAmount = 0;
    const loanOthersList = [];
    loanSchemes.forEach((s, i) => {
      if (i < MAX_LOAN_SHOW) {
        loanPieData.push({ name: s.scheme, value: s.count, amount: s.amount, fill: SCHEME_COLORS[i % SCHEME_COLORS.length] });
      } else {
        loanOthersCount += s.count;
        loanOthersAmount += s.amount;
        loanOthersList.push(s);
      }
    });
    if (loanOthersCount > 0) {
      loanPieData.push({ name: 'Others', value: loanOthersCount, amount: loanOthersAmount, fill: '#94A3B8' });
    }

    return (
      <div onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.62)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ width: 'min(1400px, 96vw)', height: 'min(900px, 94vh)', background: '#F8FAFC', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.20)' }}>
          {/* Header */}
          <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#0F172A' }}>{config.title}</div>
              <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748B' }}>Branch: {branchCode === 'ALL' ? 'All Branches' : branchCode}</div>
            </div>
            <button onClick={onClose} style={{ border: 'none', background: '#F1F5F9', color: '#334155', borderRadius: '8px', padding: '9px 14px', cursor: 'pointer', fontWeight: '600' }}>Close</button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px' }}>
            {loading ? (
              <div style={{ minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '14px' }}>Loading master data...</div>
            ) : (
              <>
                {/* Top KPI Row - only account counts */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
                  <StatCard title="Total Accounts" value={((dep.total_accounts || 0) + (loan.total_accounts || 0)).toLocaleString('en-IN')} subtitle="Deposit + Loan" />
                  <StatCard title="Deposit Accounts" value={(dep.total_accounts || 0).toLocaleString('en-IN')} subtitle="Status-wise breakdown below" />
                  <StatCard title="Loan Accounts" value={(loan.total_accounts || 0).toLocaleString('en-IN')} subtitle="Scheme-wise breakdown below" />
                </div>

                {/* TWO-PANEL GRID: Left = Deposits, Right = Loans */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                  {/* ===== LEFT PANEL: DEPOSITS ===== */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', borderBottom: '3px solid #10B981', paddingBottom: '8px' }}>Deposit Accounts</div>

                    {/* Deposit Pie Chart */}
                    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '12px' }}>Status Distribution</div>
                      <div style={{ height: '220px', display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '50%', height: '100%' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={depPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                                {depPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                              </Pie>
                              <Tooltip formatter={(value) => dep.total_accounts ? `${((value / dep.total_accounts) * 100).toFixed(1)}%` : '0%'} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {depPieData.map((entry, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: entry.fill }}></div>
                                <span style={{ color: '#334155', fontWeight: '500' }}>{entry.name}</span>
                              </div>
                              <span style={{ color: '#0F172A', fontWeight: '700' }}>{entry.value.toLocaleString('en-IN')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Deposit Status Table */}
                    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#0F172A', color: '#fff' }}>
                            <th style={{ padding: '9px 12px', textAlign: 'left', borderTopLeftRadius: '6px' }}>Status</th>
                            <th style={{ padding: '9px 12px', textAlign: 'center' }}>Code</th>
                            <th style={{ padding: '9px 12px', textAlign: 'right' }}>Accounts</th>
                            <th style={{ padding: '9px 12px', textAlign: 'right', borderTopRightRadius: '6px' }}>Share</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['Open', 'Dormant', 'Unclaimed', 'Inoperative', 'Closed', 'Inactive'].map((status, i) => {
                            const codeMap = { Open: '00', Dormant: '01', Unclaimed: '02', Inoperative: '03', Closed: '07', Inactive: '11' };
                            const count = depStatuses[status] || 0;
                            const pct = dep.total_accounts ? ((count / dep.total_accounts) * 100).toFixed(1) : '0.0';
                            return (
                              <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background='#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                                <td style={{ padding: '10px 12px', fontWeight: '600' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: STATUS_COLORS[status] }}></div>
                                    <span style={{ color: STATUS_COLORS[status] }}>{status}</span>
                                  </div>
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748B', fontFamily: 'monospace' }}>{codeMap[status]}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0F172A', fontWeight: '700' }}>{count.toLocaleString('en-IN')}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                                    <div style={{ width: '50px', height: '5px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div style={{ width: `${Math.min(parseFloat(pct), 100)}%`, height: '100%', backgroundColor: STATUS_COLORS[status], borderRadius: '3px' }}></div>
                                    </div>
                                    <span style={{ color: '#64748B', fontWeight: '600', fontSize: '11px' }}>{pct}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {/* Others row */}
                          {depStatuses.Others?.count > 0 && (
                            <>
                              <tr style={{ borderBottom: showOtherCodes ? 'none' : '1px solid #F1F5F9', cursor: 'pointer' }} onClick={() => setShowOtherCodes(!showOtherCodes)} onMouseEnter={e => e.currentTarget.style.background='#F0F9FF'} onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                                <td style={{ padding: '10px 12px', fontWeight: '600', color: '#3B82F6' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#94A3B8' }}></div>
                                    Others {showOtherCodes ? '▲' : '▼'}
                                  </div>
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748B' }}>—</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#0F172A', fontWeight: '700' }}>{depStatuses.Others.count.toLocaleString('en-IN')}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748B', fontWeight: '600', fontSize: '11px' }}>{dep.total_accounts ? ((depStatuses.Others.count / dep.total_accounts) * 100).toFixed(1) : '0.0'}%</td>
                              </tr>
                              {showOtherCodes && depStatuses.Others.codes?.map((code, ci) => (
                                <tr key={ci} style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                                  <td style={{ padding: '6px 12px 6px 32px', color: '#64748B', fontSize: '11px' }}>Code: "{code.code || 'Empty'}"</td>
                                  <td style={{ padding: '6px 12px', textAlign: 'center', color: '#94A3B8', fontFamily: 'monospace', fontSize: '11px' }}>{code.code || '—'}</td>
                                  <td style={{ padding: '6px 12px', textAlign: 'right', color: '#64748B', fontSize: '11px', fontWeight: '600' }}>{code.count.toLocaleString('en-IN')}</td>
                                  <td></td>
                                </tr>
                              ))}
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ===== RIGHT PANEL: LOANS ===== */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', borderBottom: '3px solid #3B82F6', paddingBottom: '8px' }}>Loan Accounts</div>

                    {/* Loan Pie Chart */}
                    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '18px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '12px' }}>Scheme Distribution</div>
                      <div style={{ height: '220px', display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '50%', height: '100%' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={loanPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                                {loanPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                              </Pie>
                              <Tooltip formatter={(value) => loan.total_accounts ? `${((value / loan.total_accounts) * 100).toFixed(1)}%` : '0%'} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {loanPieData.map((entry, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '60%' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: entry.fill, flexShrink: 0 }}></div>
                                <span style={{ color: '#334155', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.name}>{entry.name}</span>
                              </div>
                              <span style={{ color: '#0F172A', fontWeight: '700' }}>{entry.value.toLocaleString('en-IN')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Loan Scheme Table - ALL schemes */}
                    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px' }}>
                      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#0F172A', color: '#fff', position: 'sticky', top: 0 }}>
                              <th style={{ padding: '9px 12px', textAlign: 'left', borderTopLeftRadius: '6px' }}>Scheme</th>
                              <th style={{ padding: '9px 12px', textAlign: 'right' }}>Accounts</th>
                              <th style={{ padding: '9px 12px', textAlign: 'right', borderTopRightRadius: '6px' }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loanSchemes.map((s, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background='#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                                <td style={{ padding: '9px 12px', color: '#334155', fontWeight: '500' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '2px', backgroundColor: SCHEME_COLORS[i % SCHEME_COLORS.length], flexShrink: 0 }}></div>
                                    {s.scheme}
                                  </div>
                                </td>
                                <td style={{ padding: '9px 12px', textAlign: 'right', color: '#0F172A', fontWeight: '600' }}>{s.count.toLocaleString('en-IN')}</td>
                                <td style={{ padding: '9px 12px', textAlign: 'right', color: '#0F172A', fontWeight: '600' }}>{formatCr(s.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.62)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: 'min(1400px, 96vw)',
          height: 'min(900px, 94vh)',
          background: '#F8FAFC',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.20)',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: '#fff',
            borderBottom: '1px solid #E5E7EB',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              {drillDownRegion && (
                <button 
                  onClick={() => setDrillDownRegion(null)}
                  style={{ background: '#E2E8F0', border: 'none', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  ← Back to Regions
                </button>
              )}
              {config.title} {drillDownRegion && ` - ${drillDownRegion}`}
            </div>

            <div
              style={{
                marginTop: '4px',
                fontSize: '12px',
                color: '#64748B',
              }}
            >
              Branch: {branchCode === 'ALL' ? 'All Branches' : branchCode.startsWith('REGION:') ? `All Branches in ${branchCode.replace('REGION:', '')}` : branchCode}
              {' • '}
              Period: {period || 'ALL'}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: '#F1F5F9',
              color: '#334155',
              borderRadius: '8px',
              padding: '9px 14px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '20px',
          }}
        >
          {loading ? (
            <div
              style={{
                minHeight: '500px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                fontSize: '14px',
              }}
            >
              Loading real-time MIS data...
            </div>
          ) : (
            <>
              {/* KPI summary */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '14px',
                  marginBottom: '18px',
                }}
              >
                <StatCard
                  title={`Total ${config.amountLabel}`}
                  value={
                    config.isCount
                      ? totalValue.toLocaleString('en-IN')
                      : formatCompact(totalValue)
                  }
                  subtitle="Based on API result"
                />

                <StatCard
                  title={(branchCode === 'ALL' && !drillDownRegion) ? 'Regional Offices' : 'Branches'}
                  value={normalizedData.length.toLocaleString('en-IN')}
                  subtitle={(branchCode === 'ALL' && !drillDownRegion) ? 'Regions returned for selected filter' : 'Branches returned for selected filter'}
                />

                <StatCard
                  title="Highest"
                  value={
                    sortedData.length
                      ? config.isCount
                        ? sortedData[0].numericValue.toLocaleString('en-IN')
                        : formatCompact(sortedData[0].numericValue)
                      : '0'
                  }
                  subtitle={
                    sortedData.length
                      ? sortedData[0].name
                      : 'No data'
                  }
                />
              </div>

              {normalizedData.length === 0 ? (
                <div
                  style={{
                    background: '#fff',
                    border: '1px dashed #CBD5E1',
                    borderRadius: '12px',
                    minHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748B',
                    gap: '16px'
                  }}
                >
                  <div style={{ padding: '16px', background: '#F1F5F9', borderRadius: '50%' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#334155' }}>No data available</div>
                    <div style={{ fontSize: '13px', marginTop: '4px' }}>Try adjusting the selected branch or period.</div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Visuals */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.35fr 1fr',
                      gap: '18px',
                      marginBottom: '18px',
                    }}
                  >
                    <ChartCard
                      title={`${config.isCount ? ((branchCode === 'ALL' && !drillDownRegion) ? 'Region-wise Accounts' : 'Branch-wise Accounts') : ((branchCode === 'ALL' && !drillDownRegion) ? 'Region-wise Balances' : 'Branch-wise Balances')} (${topData.length})`}
                      subtitle={
                        config.isCount
                          ? ((branchCode === 'ALL' && !drillDownRegion) ? 'Region-wise account count' : 'Branch-wise account count')
                          : ((branchCode === 'ALL' && !drillDownRegion) ? 'Region-wise balance' : 'Branch-wise balance')
                      }
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        {type === 'deposits' || type === 'loans' ? (
                          <ComposedChart
                            data={topData}
                            margin={{ top: 15, right: 20, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fontSize: 11 }} 
                              axisLine={false} 
                              tickLine={false}
                            />
                            <YAxis 
                               tickFormatter={(value) => config.isCount ? value.toLocaleString('en-IN') : formatCompact(value)} 
                               tick={{ fontSize: 11 }}
                               axisLine={false}
                               tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar 
                              dataKey="numericValue" 
                              name={config.amountLabel} 
                              fill={type === 'deposits' ? "#10B981" : "#3B82F6"}
                              radius={[5, 5, 0, 0]}
                              barSize={40}
                              onClick={(data) => {
                                if (branchCode === 'ALL' && !drillDownRegion && data && data.name) {
                                  setDrillDownRegion(data.name);
                                }
                              }}
                              style={{ cursor: (branchCode === 'ALL' && !drillDownRegion) ? 'pointer' : 'default' }}
                            />
                            <Line 
                               type="monotone" 
                               dataKey="numericValue" 
                               name={config.amountLabel + ' Trend'}
                               stroke={type === 'deposits' ? "#047857" : "#1D4ED8"} 
                               strokeWidth={3} 
                               dot={{ r: 4 }} 
                            />
                          </ComposedChart>
                        ) : (
                          <BarChart
                            data={topData}
                            layout="vertical"
                            margin={{
                              top: 5,
                              right: 20,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              horizontal={false}
                            />

                            <XAxis
                              type="number"
                              tickFormatter={(value) =>
                                config.isCount
                                  ? value.toLocaleString('en-IN')
                                  : formatCompact(value)
                              }
                            />

                            <YAxis
                              type="category"
                              dataKey="name"
                              width={120}
                              tick={{ fontSize: 11 }}
                            />

                            <Tooltip content={<CustomTooltip />} />

                            <Bar
                              dataKey="numericValue"
                              name={config.amountLabel}
                              fill="#15559F"
                              radius={[0, 5, 5, 0]}
                              onClick={(data) => {
                                if (branchCode === 'ALL' && !drillDownRegion && data && data.name) {
                                  setDrillDownRegion(data.name);
                                }
                              }}
                              style={{ cursor: (branchCode === 'ALL' && !drillDownRegion) ? 'pointer' : 'default' }}
                            />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard
                      title="Distribution"
                      subtitle="Share of total"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={100}
                            paddingAngle={2}
                          >
                            {pieData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>

                          <Tooltip
                            formatter={(value) => {
                              if (!totalValue) return '0%';
                              return `${((value / totalValue) * 100).toFixed(1)}%`;
                            }}
                          />

                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            wrapperStyle={{
                              fontSize: '10px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  </div>

                  {/* Search + Table */}
                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      padding: '16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '14px',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: '700',
                            color: '#0F172A',
                          }}
                        >
                          Detailed Data
                        </div>

                        <div
                          style={{
                            fontSize: '11px',
                            color: '#64748B',
                            marginTop: '3px',
                          }}
                        >
                          Sorted by highest value
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder={(branchCode === 'ALL' && !drillDownRegion) ? 'Search regional office...' : 'Search branch...'}
                        value={search}
                        onChange={(event) =>
                          setSearch(event.target.value)
                        }
                        style={{
                          width: '260px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          padding: '9px 12px',
                          outline: 'none',
                          fontSize: '13px',
                        }}
                      />
                    </div>

                    <DataTable
                      columns={tableColumns}
                      data={sortedData}
                      pagination
                      paginationPerPage={10}
                      paginationRowsPerPageOptions={[
                        10,
                        25,
                        50,
                        100,
                      ]}
                      responsive
                      highlightOnHover
                      striped
                      dense
                      customStyles={customTableStyles}
                      onRowClicked={(row) => {
                        if (branchCode === 'ALL' && !drillDownRegion && row && row.name) {
                          setDrillDownRegion(row.name);
                        }
                      }}
                      pointerOnHover={branchCode === 'ALL' && !drillDownRegion}
                      noDataComponent={
                        <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94A3B8', gap: '12px' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                          <span style={{ fontSize: '13px', fontWeight: '500' }}>No matching records found in detailed view</span>
                        </div>
                      }
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartModal;

