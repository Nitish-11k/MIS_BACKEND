import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, Settings, Calendar, Settings2, MapPin, Upload } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar, PieChart, Pie, Cell, ComposedChart, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
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
  
  // Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const response = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.status === 'success') {
        alert('File uploaded and processed successfully! Refreshing data...');
        window.location.reload();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      setShowUploadModal(false);
      setUploadFile(null);
    }
  };
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState('ALL');
  const [exactDate, setExactDate] = useState('');
  const [kpiData, setKpiData] = useState({ total_deposits: 0, total_loans: 0, total_npa: 0, branches_reporting: 0 });
  const [accountMetrics, setAccountMetrics] = useState({ opened: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);
  const [modalData, setModalData] = useState([]);

  // Vibrant, accessible color palette for the Pie Chart
  const COLORS = ['#2563EB', '#F97316', '#10B981', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#3B82F6', '#EF4444', '#6366F1'];

  useEffect(() => {
    fetch('http://localhost:8000/api/branches')
      .then(res => res.json())
      .then(data => { setBranches(Array.isArray(data) ? data : []); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const activePeriod = exactDate || selectedPeriod;
    
    Promise.all([
      fetch(`http://localhost:8000/api/branch-comparison?branch_code=${selectedBranch}&period=${activePeriod}`).then(res => res.json()),
      fetch(`http://localhost:8000/api/npa-branch-wise?branch_code=${selectedBranch}&period=${activePeriod}`).then(res => res.json()),
      fetch(`http://localhost:8000/api/loan-branch-wise?branch_code=${selectedBranch}&period=${activePeriod}`).then(res => res.json()),
      fetch(`http://localhost:8000/api/kpi-summary?branch_code=${selectedBranch}&period=${activePeriod}`).then(res => res.json()),
      fetch(`http://localhost:8000/api/loan-npa-summary?branch_code=${selectedBranch}`).then(res => res.json()),
      fetch(`http://localhost:8000/api/loan-type-distribution?branch_code=${selectedBranch}&period=${activePeriod}`).then(res => res.json()),
      fetch(`http://localhost:8000/api/account-metrics?branch_code=${selectedBranch}&period=${activePeriod}`).then(res => res.json())
    ]).then(([compData, npaData, loanBranchData, kpiSummary, loanNpaSum, typeDistData, accountData]) => {
      setTopBranches(compData);
      setNpaBranchData(npaData);
      setLoanBranchData(loanBranchData);
      setKpiData(kpiSummary);
      setLoanNpaSummary(loanNpaSum);
      setAccountMetrics(accountData || { opened: 0, closed: 0 });
      
      const normalized = typeDistData.map(d => ({ ...d, rawValue: d.value, value: d.value / 100000 }));
      setLoanTypeData(normalized);
      
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [selectedBranch, selectedPeriod, exactDate]);

  useEffect(() => {
    if (selectedLoanType) {
      const activePeriod = exactDate || selectedPeriod;
      fetch(`http://localhost:8000/api/loan-type-branches?product_name=${encodeURIComponent(selectedLoanType)}&branch_code=${selectedBranch}&period=${activePeriod}`)
        .then(res => res.json())
        .then(data => setLoanTypeBranches(data))
        .catch(console.error);
    }
  }, [selectedLoanType, selectedBranch, selectedPeriod, exactDate]);



  useEffect(() => {
    if (activeModal) {
      setModalData([]);
      const endpoint = activeModal === 'deposits' ? 'deposit-branch-wise' 
                     : activeModal === 'loans' ? 'loan-branch-wise' 
                     : activeModal === 'opened' ? 'opened-branch-wise'
                     : activeModal === 'closed' ? 'closed-branch-wise'
                     : 'npa-branch-wise';
      const activePeriod = exactDate || selectedPeriod;               
      fetch(`http://localhost:8000/api/${endpoint}?branch_code=${selectedBranch}&period=${activePeriod}`)
        .then(res => res.json())
          .then(data => {
            if (activeModal === 'npa') {
                setModalData(data.map(d => ({ name: d.name, value: (d.NPA || 0) / 100000, rawValue: d.NPA || 0 })));
            } else if (activeModal === 'loans') {
                setModalData(data.map(d => ({ name: d.name, value: (d.Loans || 0) / 100000, rawValue: d.Loans || 0 })));
            } else if (activeModal === 'opened' || activeModal === 'closed') {
                setModalData(data.map(d => ({ name: d.name, value: d.value || 0, rawValue: d.value || 0 })));
            } else {
                setModalData(data.map(d => ({ name: d.name, value: (d.value || 0) / 100000, rawValue: d.value || 0 })));
            }
          })
        .catch(console.error);
    }
  }, [activeModal, selectedPeriod, exactDate]);

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
        <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div className="header-title-section">
            <h1 className="header-title" style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>Banking MIS Dashboard</h1>
            <p className="header-subtitle" style={{ margin: '0', color: '#6B7280' }}>Performance & Operations Overview</p>
          </div>
          
          <div className="header-controls" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {/* Upload Button */}
            <button 
              onClick={() => setShowUploadModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#2563EB', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '500', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            >
              <Upload size={18} />
              Upload Data
            </button>

            {/* Exact Date Picker */}
            <div className="branch-selector-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <input 
                type="date"
                value={exactDate}
                onChange={(e) => {
                  setExactDate(e.target.value);
                  if (e.target.value) setSelectedPeriod('ALL');
                }}
                style={{ outline: 'none', border: 'none', background: 'transparent', fontWeight: '600', color: '#0B1F3A', cursor: 'pointer' }}
              />
            </div>

            {/* Period Dropdown */}
            <div className="branch-selector-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', opacity: exactDate ? 0.5 : 1, pointerEvents: exactDate ? 'none' : 'auto' }}>
              <Calendar size={18} color="#6B7280" />
              <select 
                className="branch-selector" 
                value={selectedPeriod}
                onChange={(e) => {
                  setSelectedPeriod(e.target.value);
                  setExactDate('');
                }}
                style={{ outline: 'none', border: 'none', background: 'transparent', fontWeight: '600', color: '#0B1F3A', cursor: 'pointer' }}
              >
                <option value="ALL">All Time</option>
                <option value="7D">Last 7 Days</option>
                <option value="30D">Last 30 Days</option>
                <option value="6M">Last 6 Months</option>
              </select>
            </div>

            {/* Branch Dropdown */}
            <div className="branch-selector-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <MapPin size={18} color="#6B7280" />
              <select 
                className="branch-selector" 
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                style={{ outline: 'none', border: 'none', background: 'transparent', fontWeight: '600', color: '#0B1F3A', minWidth: '150px', cursor: 'pointer' }}
              >
                <option value="ALL">All Branches</option>
                {branches.map((b, i) => (
                  <option key={i} value={b.code}>{b.code} - {b.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          {/* Top Stat Cards */}
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div className="card" onClick={() => { if (selectedBranch === 'ALL') setActiveModal('deposits') }} style={{ cursor: selectedBranch === 'ALL' ? 'pointer' : 'default', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#fff', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: '500' }}>Total Deposits</span>
                <div style={{ background: '#E0F2FE', color: '#0284C7', padding: '8px', borderRadius: '8px' }}><FileText size={20} /></div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A' }}>{formatAmount(kpiData?.total_deposits || 0)}</div>
            </div>

            <div className="card" onClick={() => { if (selectedBranch === 'ALL') setActiveModal('loans') }} style={{ cursor: selectedBranch === 'ALL' ? 'pointer' : 'default', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#fff', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: '500' }}>Total Loans</span>
                <div style={{ background: '#FEF3C7', color: '#D97706', padding: '8px', borderRadius: '8px' }}><FileText size={20} /></div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A' }}>{formatAmount(kpiData?.total_loans || 0)}</div>
            </div>

            <div className="card" onClick={() => { if (selectedBranch === 'ALL') setActiveModal('npa') }} style={{ cursor: selectedBranch === 'ALL' ? 'pointer' : 'default', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#fff', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: '500' }}>Total NPA</span>
                <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '8px', borderRadius: '8px' }}><FileText size={20} /></div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A' }}>{formatAmount(kpiData?.total_npa || 0)}</div>
            </div>
            
            <div className="card" onClick={() => { if (selectedBranch === 'ALL') setActiveModal('opened') }} style={{ cursor: selectedBranch === 'ALL' ? 'pointer' : 'default', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#fff', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: '500' }}>Accounts Opened</span>
                <div style={{ background: '#DCFCE7', color: '#16A34A', padding: '8px', borderRadius: '8px' }}><FileText size={20} /></div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A' }}>{accountMetrics?.opened?.toLocaleString() || 0}</div>
            </div>

            <div className="card" onClick={() => { if (selectedBranch === 'ALL') setActiveModal('closed') }} style={{ cursor: selectedBranch === 'ALL' ? 'pointer' : 'default', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#fff', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: '500' }}>Accounts Closed</span>
                <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '8px', borderRadius: '8px' }}><FileText size={20} /></div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A' }}>{accountMetrics?.closed?.toLocaleString() || 0}</div>
            </div>

            <div className="card" style={{ padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#fff', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: '500' }}>Branches Reporting</span>
                <div style={{ background: '#D1FAE5', color: '#059669', padding: '8px', borderRadius: '8px' }}><LayoutDashboard size={20} /></div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A' }}>{kpiData?.branches_reporting || 0}</div>
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
                            onClick={() => { if (selectedBranch === 'ALL') setSelectedLoanType(entry.raw_name || entry.name) }}
                            style={{ cursor: selectedBranch === 'ALL' ? 'pointer' : 'default', outline: 'none' }}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val, name, props) => formatAmount(props.payload.rawValue)} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', fontWeight: '500', color: '#4B5563', paddingTop: '15px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {selectedBranch === 'ALL' && (
                  <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '11px', color: '#6B7280' }}>
                    (Click any slice to see top branches)
                  </div>
                )}
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
                               <div style={{ height: '550px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ height: '220px', flexShrink: 0 }}>
                      <div style={{ height: '100%', background: '#F8FAFC', borderRadius: '8px', padding: '16px', border: '1px solid #E5E7EB' }}>
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#475569', fontWeight: '600' }}>Top 10 Branches</h3>
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[...loanTypeBranches].sort((a,b) => b.value - a.value).slice(0, 8)}>
                            <PolarGrid stroke="#E5E7EB" />
                            <PolarAngleAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                            <Radar name="Amount" dataKey="value" stroke="#10B981" fill="#10B981" fillOpacity={0.5} />
                            <Tooltip formatter={(val, name, props) => [formatAmount(props.payload.value), 'Amount']} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#F8FAFC', zIndex: 1, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
                          <tr>
                            <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#475569', borderBottom: '1px solid #E5E7EB', width: '50px' }}>#</th>
                            <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#475569', borderBottom: '1px solid #E5E7EB' }}>Branch Name</th>
                            <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#475569', borderBottom: '1px solid #E5E7EB', textAlign: 'right', width: '150px' }}>Amount</th>
                            <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#475569', borderBottom: '1px solid #E5E7EB', width: '150px' }}>Visual</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loanTypeBranches.map((row, index) => {
                            const maxVal = Math.max(...loanTypeBranches.map(d => d.value));
                            const percent = maxVal === 0 ? 0 : (row.value / maxVal) * 100;
                            return (
                              <tr key={index} style={{ borderBottom: '1px solid #F1F5F9', background: index % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748B' }}>{index + 1}</td>
                                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500', color: '#0F172A' }}>{row.name}</td>
                                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#0F172A', textAlign: 'right' }}>{formatAmount(row.value)}</td>
                                <td style={{ padding: '12px 16px' }}>
                                  <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${percent}%`, height: '100%', background: '#10B981', borderRadius: '4px' }}></div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>        </div>
                </div>
              )}

            </div>

          </div>
        </div>
      </div>

      {/* KPI Drilldown Modal */}
      {activeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '80%', maxWidth: '900px', height: '500px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#0F172A', fontWeight: '600' }}>
                Top Branches by {activeModal === 'deposits' ? 'Deposits' : activeModal === 'loans' ? 'Loans' : activeModal === 'opened' ? 'Accounts Opened' : activeModal === 'closed' ? 'Accounts Closed' : 'NPA'}
              </h2>
              <button onClick={() => setActiveModal(null)} style={{ padding: '8px 16px', background: '#F1F5F9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', color: '#475569' }}>Close</button>
            </div>
            
            {modalData.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>Loading data...</div>
            ) : (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ height: '220px', flexShrink: 0 }}>
                  <div style={{ height: '100%', background: '#F8FAFC', borderRadius: '8px', padding: '16px', border: '1px solid #E5E7EB' }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#475569', fontWeight: '600' }}>Top 10 Branches</h3>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[...modalData].sort((a,b) => b.value - a.value).slice(0, 8)}>
                        <PolarGrid stroke="#E5E7EB" />
                        <PolarAngleAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                        <Radar name="Amount" dataKey="value" stroke={activeModal === 'deposits' ? '#38BDF8' : activeModal === 'loans' ? '#FBBF24' : '#F87171'} fill={activeModal === 'deposits' ? '#38BDF8' : activeModal === 'loans' ? '#FBBF24' : '#F87171'} fillOpacity={0.5} />
                        <Tooltip formatter={(val, name, props) => [formatAmount(props.payload.rawValue), 'Amount']} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#F8FAFC', zIndex: 1, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
                      <tr style={{ background: '#F8FAFC' }}>
                        <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#475569', borderBottom: '1px solid #E5E7EB', width: '60px' }}>Rank</th>
                        <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#475569', borderBottom: '1px solid #E5E7EB' }}>Branch Name</th>
                        <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#475569', borderBottom: '1px solid #E5E7EB', textAlign: 'right', width: '150px' }}>{(activeModal === 'opened' || activeModal === 'closed') ? 'Count' : 'Amount'}</th>
                        <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#475569', borderBottom: '1px solid #E5E7EB', width: '150px' }}>Visual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalData.map((row, index) => {
                        const maxVal = Math.max(...modalData.map(d => d.value));
                        const percent = maxVal === 0 ? 0 : (row.value / maxVal) * 100;
                        const barColor = activeModal === 'deposits' ? '#38BDF8' 
                                       : activeModal === 'loans' ? '#FBBF24' 
                                       : activeModal === 'opened' ? '#16A34A'
                                       : activeModal === 'closed' ? '#DC2626'
                                       : '#F87171';
                        return (
                          <tr key={index} style={{ borderBottom: '1px solid #F1F5F9', background: index % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                            <td style={{ padding: '12px 16px', fontSize: '14px', color: '#64748B' }}>{index + 1}</td>
                            <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '500', color: '#0F172A' }}>{row.name}</td>
                            <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#0F172A', textAlign: 'right' }}>
                              {(activeModal === 'opened' || activeModal === 'closed') ? row.rawValue.toLocaleString() : formatAmount(row.rawValue)}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${percent}%`, height: '100%', background: barColor, borderRadius: '4px' }}></div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Upload Modal */}
      {showUploadModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', color: '#0F172A', fontWeight: '600' }}>Upload Data File</h2>
            <div style={{ border: '2px dashed #CBD5E1', borderRadius: '8px', padding: '32px', textAlign: 'center', marginBottom: '20px', background: '#F8FAFC' }}>
              <Upload size={32} color="#64748B" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '14px', color: '#475569', marginBottom: '8px' }}>Select a .txt, .gz, or .xlsx file</div>
              <input type="file" accept=".txt,.xlsx,.gz,.csv" onChange={(e) => setUploadFile(e.target.files[0])} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button disabled={uploading} onClick={() => setShowUploadModal(false)} style={{ padding: '8px 16px', background: '#F1F5F9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', color: '#475569' }}>Cancel</button>
              <button disabled={uploading || !uploadFile} onClick={handleUpload} style={{ padding: '8px 16px', background: '#2563EB', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', color: '#fff' }}>
                {uploading ? 'Processing...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
