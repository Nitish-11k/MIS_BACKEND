import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, Settings, Calendar, Settings2, MapPin } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import DynamicReportView from './DynamicReportView';

const formatAmount = (num) => {
  if (!num) return '0';
  if (num >= 10000000) return `₹ ${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹ ${(num / 100000).toFixed(2)} L`;
  if (num >= 1000) return `₹ ${(num / 1000).toFixed(2)} K`;
  return `₹ ${num.toFixed(2)}`;
};

const LazyReport = ({ tableName, label, selectedBranch }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = React.useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.1 });

    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="panel" style={{ marginBottom: '24px', minHeight: '300px' }}>
      <div className="panel-title" style={{ paddingBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <FileText size={20} color="#0B1F3A" />
        <div>
          <h3 style={{ fontSize: '18px' }}>Report: {label || tableName}</h3>
          <div className="subtitle">Detailed Audit View</div>
        </div>
      </div>
      {isVisible ? (
        <DynamicReportView tableName={tableName} selectedBranch={selectedBranch} />
      ) : (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280', backgroundColor: '#F4F6F9', margin: '16px', borderRadius: '4px' }}>
          Loading {label || tableName}... (Scroll down to load)
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const [topBranches, setTopBranches] = useState([]);
  const [branches, setBranches] = useState([]);
  const [reports, setReports] = useState([]);
  const [loanNpaSummary, setLoanNpaSummary] = useState(null);
  const [npaBranchData, setNpaBranchData] = useState([]);
  const [loanBranchData, setLoanBranchData] = useState([]);
  const [loanTypeData, setLoanTypeData] = useState([]);
  const [selectedLoanType, setSelectedLoanType] = useState(null);
  const [loanTypeBranches, setLoanTypeBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Vibrant, accessible color palette for the Pie Chart
  const COLORS = ['#2563EB', '#F97316', '#10B981', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#3B82F6', '#EF4444', '#6366F1'];

  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:8000/api/branch-comparison')
      .then(res => res.json())
      .then(data => { setTopBranches(data); setLoading(false); })
      .catch(() => setLoading(false));

    fetch('http://localhost:8000/api/branches')
      .then(res => res.json())
      .then(data => { setBranches(Array.isArray(data) ? data : []); })
      .catch(console.error);

    fetch('http://localhost:8000/api/npa-branch-wise')
      .then(res => res.json())
      .then(data => { setNpaBranchData(data); })
      .catch(console.error);

    fetch('http://localhost:8000/api/loan-branch-wise')
      .then(res => res.json())
      .then(data => { setLoanBranchData(data); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch(`http://localhost:8000/api/loan-npa-summary?branch_code=${selectedBranch}`)
      .then(res => res.json())
      .then(data => { setLoanNpaSummary(data); })
      .catch(console.error);
  }, [selectedBranch]);

  useEffect(() => {
    fetch(`http://localhost:8000/api/loan-type-distribution?branch_code=${selectedBranch}`)
      .then(res => res.json())
      .then(data => { 
        // Normalize values to Lakhs to prevent Recharts SVG precision errors with huge numbers
        const normalized = data.map(d => ({ ...d, rawValue: d.value, value: d.value / 100000 }));
        setLoanTypeData(normalized); 
      })
      .catch(console.error);
  }, [selectedBranch]);

  useEffect(() => {
    if (selectedLoanType) {
      fetch(`http://localhost:8000/api/loan-type-branches?product_name=${encodeURIComponent(selectedLoanType)}`)
        .then(res => res.json())
        .then(data => setLoanTypeBranches(data))
        .catch(console.error);
    }
  }, [selectedLoanType]);

  // Prepare data for the matrix
  const top10 = [...topBranches].sort((a, b) => b.deposits - a.deposits).slice(0, 10);
  
  // Aggregate stats
  const totalDeposits = topBranches.reduce((acc, curr) => acc + curr.deposits, 0);
  const totalLoans = topBranches.reduce((acc, curr) => acc + curr.loans, 0);

  // Mock trend data for line chart
  const lineData = [
    { name: 'Jan', deposits: 135, loans: 140 },
    { name: 'Feb', deposits: 43, loans: 170 },
    { name: 'Mar', deposits: 111, loans: 103 },
    { name: 'Apr', deposits: 92, loans: 96 },
    { name: 'May', deposits: 103, loans: 103 },
    { name: 'Jun', deposits: 100, loans: 140 },
    { name: 'Jul', deposits: 111, loans: 144 },
    { name: 'Aug', deposits: 76, loans: 117 },
    { name: 'Sep', deposits: 84, loans: 84 },
    { name: 'Oct', deposits: 44, loans: 68 },
    { name: 'Nov', deposits: 5, loans: 5 },
  ];

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div style={{ height: '60px' }}></div>
        <div className="sidebar-nav">
          <div className="nav-item active">
            <LayoutDashboard size={28} /> Dashboard
          </div>
          <div className="nav-item">
            <Settings2 size={28} /> Reports
          </div>
          <div className="nav-item">
            <FileText size={28} /> Workings
          </div>
          <div className="nav-item">
            <Settings size={28} /> Settings
          </div>
        </div>
      </div>

      <div className="main-content">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-title-section">
            <h1>Banking Dashboard</h1>
            <div className="subtitle">REPORT UPDATED ON: 10/8/2026 3:21:23 PM</div>
          </div>
          <div className="header-filters" style={{ flexDirection: 'row', alignItems: 'center', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={18} color="#6B7280" />
              <span className="showing-data">Showing data for:</span>
              <select 
                value={selectedBranch} 
                onChange={(e) => setSelectedBranch(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #E2E8F0', outline: 'none', fontWeight: '600', color: '#0B1F3A', minWidth: '200px' }}
              >
                <option value="ALL">All Branches (Bank-wide)</option>
                {branches.map((b, i) => (
                  <option key={i} value={b.code}>{b.code} - {b.name}</option>
                ))}
              </select>
            </div>
            <div className="date-picker">
              <Calendar size={20} /> 01 Jan, 2025 - 07 Nov, 2026
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          {/* Top Row Grid */}
          <div className="top-row-grid">
            {/* Left Panel */}
            <div className="panel">
              <div className="flush-kpi-row">
                <div className="flush-kpi-block light-blue">
                  <div className="kpi-block-value">{(totalDeposits / 1000).toFixed(1)}K</div>
                  <div className="kpi-block-label">Net Deposits</div>
                </div>
                <div className="flush-kpi-block navy">
                  <div className="kpi-block-value">{totalDeposits.toLocaleString()}</div>
                  <div className="kpi-block-label">Deposit Count</div>
                </div>
                <div className="flush-kpi-block orange">
                  <div className="kpi-block-value">{totalLoans.toLocaleString()}</div>
                  <div className="kpi-block-label">Loan Count</div>
                </div>
              </div>
              <div className="panel-title">
                <h3>Deposits vs Loans</h3>
                <div className="subtitle">by Month & Year</div>
              </div>
              <div style={{ width: '100%', height: '250px', padding: '16px' }}>
                <ResponsiveContainer>
                  <LineChart data={lineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="deposits" name="Net Deposits" stroke="#7FB3E8" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="loans" name="Loans" stroke="#E8732C" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right Panel */}
            <div className="panel">
              <div className="panel-title" style={{ paddingBottom: '16px' }}>
                <h3>Performance Matrix</h3>
                <div className="subtitle">by Month and Branch</div>
              </div>
              <table className="data-table-hr">
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th style={{textAlign: 'center'}}>Start</th>
                    <th>Trend</th>
                    <th style={{textAlign: 'center'}}>Now</th>
                    <th style={{textAlign: 'right'}}>% Change</th>
                  </tr>
                </thead>
                <tbody>
                  {top10.slice(0, 7).map((b, i) => {
                    const start = Math.floor(b.deposits * (0.8 + Math.random() * 0.4));
                    const change = ((b.deposits - start) / start) * 100;
                    return (
                      <tr key={i}>
                        <td style={{ color: '#6B7280' }}>{b.name.substring(0, 10)}</td>
                        <td style={{ textAlign: 'center', backgroundColor: '#E2E8F0', fontWeight: '600' }}>{start}</td>
                        <td>
                          <svg width="60" height="20">
                            <polyline points="0,10 20,5 40,15 60,10" fill="none" stroke="#6B7280" strokeWidth="1" />
                          </svg>
                        </td>
                        <td style={{ textAlign: 'center', backgroundColor: '#E2E8F0', fontWeight: '600' }}>{b.deposits}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={`pct-cell ${change >= 0 ? 'pct-positive' : 'pct-negative'}`}>
                            {change >= 0 ? '+' : ''}{change.toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  <tr>
                    <td style={{ fontWeight: '700', color: '#0B1F3A' }}>Total</td>
                    <td style={{ textAlign: 'center', fontWeight: '700' }}>420</td>
                    <td></td>
                    <td style={{ textAlign: 'center', fontWeight: '700' }}>407</td>
                    <td style={{ textAlign: 'right', fontWeight: '700' }}>-3%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Row Grid */}
          <div className="bottom-row-grid">
            {/* Panel 1 */}
            <div className="panel">
              <div className="flush-kpi-row">
                <div className="flush-kpi-block navy" style={{ padding: '8px' }}>
                  <div className="kpi-block-value" style={{ fontSize: '18px' }}>11.02%</div>
                  <div className="kpi-block-label">% Debit Txns</div>
                </div>
                <div className="flush-kpi-block orange" style={{ padding: '8px' }}>
                  <div className="kpi-block-value" style={{ fontSize: '18px' }}>4.53%</div>
                  <div className="kpi-block-label">% Credit Txns</div>
                </div>
              </div>
              <div className="panel-title">
                <h3>Transaction Mix</h3>
                <div className="subtitle">by Branch</div>
              </div>
              <div className="h-bar-container">
                {top10.slice(0, 5).map((b, i) => (
                  <div className="h-bar-row" key={i}>
                    <div className="h-bar-label">{b.name.substring(0,4)}</div>
                    <div className="h-bar-track">
                      <div className="h-bar-fill-navy" style={{ width: (Math.random() * 80 + 10) + '%' }}></div>
                      <div className="h-bar-fill-orange" style={{ width: (Math.random() * 40 + 5) + '%' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 2 */}
            <div className="panel">
              <div className="flush-kpi-row">
                <div className="flush-kpi-block navy" style={{ padding: '8px' }}>
                  <div className="kpi-block-value" style={{ fontSize: '18px' }}>3.8%</div>
                  <div className="kpi-block-label">% NPA Active</div>
                </div>
              </div>
              <div className="panel-title">
                <h3>NPA %</h3>
                <div className="subtitle">by Branch</div>
              </div>
              <div className="h-bar-container">
                {top10.slice(0, 5).map((b, i) => (
                  <div className="h-bar-row" key={i}>
                    <div className="h-bar-label">{b.name.substring(0,4)}</div>
                    <div className="h-bar-track">
                      <div className="h-bar-fill-navy" style={{ width: (Math.random() * 60 + 10) + '%' }}></div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: '600' }}>{(Math.random() * 10).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 3 */}
            <div className="panel">
              <div className="flush-kpi-row">
                <div className="flush-kpi-block navy" style={{ padding: '8px' }}>
                  <div className="kpi-block-value" style={{ fontSize: '18px' }}>92.09K</div>
                  <div className="kpi-block-label">Avg Balance</div>
                </div>
                <div className="flush-kpi-block orange" style={{ padding: '8px' }}>
                  <div className="kpi-block-value" style={{ fontSize: '18px' }}>$0.15</div>
                  <div className="kpi-block-label">Cost/Per/Day</div>
                </div>
              </div>
              <div className="panel-title">
                <h3>Avg Balance/Cost</h3>
                <div className="subtitle">by Branch</div>
              </div>
              <div className="h-bar-container">
                {top10.slice(0, 5).map((b, i) => (
                  <div className="h-bar-row" key={i}>
                    <div className="h-bar-label">{b.name.substring(0,4)}</div>
                    <div className="h-bar-track">
                      <div className="h-bar-fill-orange" style={{ width: (Math.random() * 80 + 10) + '%' }}></div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: '600' }}>${(Math.random()).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Detailed Reports Section replaced by Specific KPI Requirements */}
          <div style={{ marginTop: '40px' }}>
            <div style={{ paddingBottom: '16px', marginBottom: '24px', borderBottom: '2px solid #E2E8F0' }}>
              <h2 style={{ fontSize: '20px', color: '#0B1F3A', margin: 0 }}>Loan & NPA Status</h2>
              <div className="subtitle" style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                Key metrics for Loans and Non-Performing Assets
              </div>
            </div>
            
            {loanNpaSummary && (
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div className="card" style={{ flex: 1, minWidth: '250px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(127,179,232,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7FB3E8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Loan Amount</div>
                    <div style={{ fontSize: '28px', color: '#0B1F3A', fontWeight: '700' }}>{formatAmount(loanNpaSummary.total_loans)}</div>
                  </div>
                </div>
                
                <div className="card" style={{ flex: 1, minWidth: '250px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(232,115,44,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E8732C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total NPA Outstanding</div>
                    <div style={{ fontSize: '28px', color: '#E8732C', fontWeight: '700' }}>{formatAmount(loanNpaSummary.total_npa)}</div>
                  </div>
                </div>

                <div className="card" style={{ flex: 1, minWidth: '250px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total NPA Covered</div>
                    <div style={{ fontSize: '28px', color: '#22C55E', fontWeight: '700' }}>{formatAmount(loanNpaSummary.npa_covered)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* New Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginTop: '24px' }}>
              
              {/* NPA Area Chart */}
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '20px' }}>Top 10 Branches by NPA</div>
                <div style={{ height: '350px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[...npaBranchData].sort((a,b) => b.NPA - a.NPA).slice(0, 10)} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                      <defs>
                        <linearGradient id="colorNPA" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#E8732C" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#E8732C" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorCovered" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22C55E" stopOpacity={0.6}/>
                          <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={60} tick={{ fontSize: 10, fill: '#6B7280' }} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${(val/100000).toFixed(0)}L`} tick={{ fontSize: 10, fill: '#6B7280' }} width={50} />
                      <Tooltip formatter={(value) => formatAmount(value)} />
                      <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px' }} />
                      <Area type="monotone" dataKey="NPA" stroke="#E8732C" fillOpacity={1} fill="url(#colorNPA)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Area type="monotone" dataKey="Covered" stroke="#22C55E" fillOpacity={1} fill="url(#colorCovered)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Loan Balance Branch Wise */}
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '20px' }}>Top 10 Branches by Loan Balance</div>
                <div style={{ height: '350px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[...loanBranchData].sort((a,b) => b.Loans - a.Loans).slice(0, 10)} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={60} tick={{ fontSize: 10, fill: '#6B7280' }} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${(val/100000).toFixed(0)}L`} tick={{ fontSize: 10, fill: '#6B7280' }} width={50} />
                      <Tooltip formatter={(value) => formatAmount(value)} cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="Loans" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Loan Type Distribution Pie Chart */}
              <div className="card" style={{ padding: '24px', backgroundColor: '#FFFFFF', borderRadius: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '20px' }}>Top Loan Types Distribution</div>
                <div style={{ height: '350px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={loanTypeData.slice(0, 6)}
                        cx="50%"
                        cy="45%"
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        isAnimationActive={false}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {loanTypeData.slice(0, 6).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                            onClick={() => setSelectedLoanType(entry.raw_name)}
                            style={{ cursor: 'pointer', outline: 'none' }}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val, name, props) => formatAmount(props.payload.rawValue)} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', fontWeight: '500', color: '#4B5563', paddingTop: '15px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '11px', color: '#6B7280' }}>
                  (Click any slice to see top branches)
                </div>
              </div>

              {/* Drill-down Bar Chart */}
              {selectedLoanType && (
                <div className="card" style={{ padding: '24px', gridColumn: '1 / -1', border: '1px solid #E5E7EB' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A' }}>
                      Top Branches for: <span style={{ color: '#2563EB' }}>{selectedLoanType}</span>
                    </div>
                    <button 
                      onClick={() => setSelectedLoanType(null)}
                      style={{ padding: '4px 12px', fontSize: '12px', background: '#F3F4F6', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
                    >
                      Close
                    </button>
                  </div>
                  <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={loanTypeBranches} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={60} tick={{ fontSize: 10, fill: '#6B7280' }} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₹${(val/100000).toFixed(0)}L`} tick={{ fontSize: 10, fill: '#6B7280' }} width={50} />
                        <Tooltip formatter={(value) => formatAmount(value)} cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="value" fill="#10B981" radius={[4, 4, 0, 0]} barSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
