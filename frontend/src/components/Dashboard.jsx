import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, Settings, Calendar, Settings2, MapPin } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import DynamicReportView from './DynamicReportView';

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
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:8000/api/branch-comparison')
      .then(res => res.json())
      .then(data => { setTopBranches(data); setLoading(false); })
      .catch(() => setLoading(false));

    fetch('http://localhost:8000/api/reports')
      .then(res => res.json())
      .then(data => { setReports(Array.isArray(data) ? data : []); })
      .catch(console.error);
      
    fetch('http://localhost:8000/api/branches')
      .then(res => res.json())
      .then(data => { setBranches(Array.isArray(data) ? data : []); })
      .catch(console.error);
  }, []);

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

          {/* Detailed Reports Section */}
          <div style={{ marginTop: '40px' }}>
            <div style={{ paddingBottom: '16px', marginBottom: '24px', borderBottom: '2px solid #E2E8F0' }}>
              <h2 style={{ fontSize: '20px', color: '#0B1F3A', margin: 0 }}>Detailed File Analysis</h2>
              <div className="subtitle" style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Scroll down to load individual MIS file reports</div>
            </div>
            {reports.map((report, index) => (
              <LazyReport key={index} tableName={report.name} label={report.label} selectedBranch={selectedBranch} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
