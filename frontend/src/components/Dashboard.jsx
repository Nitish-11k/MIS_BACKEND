import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, Settings, ShieldAlert, Users, Landmark, Activity, ChevronLeft, ChevronRight, CreditCard, FileSignature, Menu, UploadCloud } from 'lucide-react';
import FilterBar from './FilterBar';
import SmartModal from './SmartModal';
import OverviewTab from './OverviewTab';
import PlaceholderTab from './PlaceholderTab';
import LoanPortfolioTab from './LoanPortfolioTab';
import DepositsTab from './DepositsTab';
import ComplianceTab from './ComplianceTab';
import ReportsTab from './ReportsTab';
import UploadTab from './UploadTab';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Real data state
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState('30D');
  const [exactDate, setExactDate] = useState('2025-04-25');
  
  const [kpiData, setKpiData] = useState({ total_deposits: 428600000000, total_loans: 312400000000, total_npa: 21800000000 });
  const [accountMetrics, setAccountMetrics] = useState({ opened: 14832, closed: 3219 });
  const [branchNpaData, setBranchNpaData] = useState([]);
  const [barChartData, setBarChartData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [activeModal, setActiveModal] = useState(null);



  useEffect(() => {
    fetch('http://localhost:8000/api/branches')
      .then(res => res.json())
      .then(data => { setBranches(Array.isArray(data) ? data : []); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    let activePeriod = exactDate || selectedPeriod;
    
    Promise.all([
      fetch(`http://localhost:8000/api/kpi-summary?branch_code=${selectedBranch}&period=${activePeriod}`).then(res => res.json()),
      fetch(`http://localhost:8000/api/account-metrics?branch_code=${selectedBranch}&period=${activePeriod}`).then(res => res.json()),
      fetch(`http://localhost:8000/api/npa-branch-wise?branch_code=${selectedBranch}&period=${activePeriod}`).then(res => res.json()),
      fetch(`http://localhost:8000/api/productwise-summary?branch_code=${selectedBranch}`).then(res => res.json()),
      fetch(`http://localhost:8000/api/deposits-by-type?branch_code=${selectedBranch}`).then(res => res.json()),
      fetch(`http://localhost:8000/api/trend-data?branch_code=${selectedBranch}&period=${activePeriod}`).then(res => res.json())
    ]).then(([kpiSum, accMetrics, npaData, prodData, depData, trendDataRes]) => {
      // Overriding with mockup data if backend doesn't return high enough values to match the screenshots
      setKpiData({
        total_deposits: kpiSum.total_deposits || 0,
        total_loans: kpiSum.total_loans || 0,
        total_npa: kpiSum.total_npa || 0
      });
      setAccountMetrics({
        opened: accMetrics.opened || 0,
        closed: accMetrics.closed || 0
      });
      
      setBranchNpaData(npaData && npaData.length > 0 ? npaData.map(d => ({ ...d, NPA: (d.NPA||0)/100000, Covered: (d.Covered||0)/100000 })) : []);
      
      setBarChartData(Array.isArray(prodData) && prodData.length > 0 ? prodData.slice(0,7).map(d => ({ name: d.name.substring(0, 10), Credit: (d.credit||0)/100000, Debit: (d.debit||0)/100000 })) : []);
      
      const totalDep = Array.isArray(depData) ? depData.reduce((acc, curr) => acc + (curr.value || 0), 0) : 1;
      setPieData(Array.isArray(depData) && depData.length > 0 ? depData.slice(0, 5).map(d => ({ name: d.name.substring(0, 12), value: Math.round(((d.value||0) / totalDep) * 100) })) : []);
      
      setTrendData(Array.isArray(trendDataRes) ? trendDataRes : []);
      
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [selectedBranch, selectedPeriod, exactDate]);

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', backgroundColor: '#F3F4F6', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Sidebar - Deep Navy */}
      <div className="sidebar" style={{ flexShrink: 0, width: isSidebarOpen ? '260px' : '80px', transition: 'width 0.3s', backgroundColor: '#111827', color: '#9CA3AF', display: 'flex', flexDirection: 'column', zIndex: 50 }}>
        <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', justifyContent: isSidebarOpen ? 'space-between' : 'center', borderBottom: '1px solid #1F2937' }}>
          {isSidebarOpen && (
            <div>
              <div style={{ color: '#F97316', fontWeight: 'bold', fontSize: '20px', letterSpacing: '1px' }}>APEX</div>
              <div style={{ color: '#9CA3AF', fontSize: '12px', letterSpacing: '1px' }}>BANKING MIS</div>
            </div>
          )}
          <div onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ padding: '8px', background: '#1F2937', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isSidebarOpen ? <ChevronLeft size={16} /> : <Menu size={16} />}
          </div>
        </div>
        
        <div className="sidebar-nav" style={{ flex: 1, padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { id: 'overview', label: 'MIS Dashboard', icon: LayoutDashboard },
            { id: 'network', label: 'Branch Network', icon: Activity },
            { id: 'loans', label: 'Advances & NPA', icon: Landmark },
            { id: 'deposits', label: 'Deposits', icon: CreditCard },
            { id: 'compliance', label: 'Audit & Exceptions', icon: FileSignature },
            { id: 'reports', label: 'Reports & Accounts', icon: FileText },
            { id: 'upload', label: 'Data Sync', icon: UploadCloud },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map(item => (
            <div 
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`} 
              onClick={() => setActiveTab(item.id)} 
              style={{ 
                padding: '12px 24px', 
                cursor: 'pointer', 
                display: 'flex', 
                gap: '12px', 
                alignItems: 'center', 
                backgroundColor: activeTab === item.id ? '#1F2937' : 'transparent',
                color: activeTab === item.id ? '#F97316' : '#D1D5DB',
                borderLeft: activeTab === item.id ? '4px solid #F97316' : '4px solid transparent',
                fontSize: '14px',
                fontWeight: activeTab === item.id ? '600' : '400',
                justifyContent: isSidebarOpen ? 'flex-start' : 'center'
              }}
              title={item.label}
            >
              <item.icon size={18} /> 
              {isSidebarOpen && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
            </div>
          ))}
        </div>

        <div style={{ padding: isSidebarOpen ? '20px' : '20px 0', borderTop: '1px solid #1F2937', display: 'flex', alignItems: 'center', justifyContent: isSidebarOpen ? 'flex-start' : 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#F97316', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            RK
          </div>
          {isSidebarOpen && (
            <div>
              <div style={{ color: '#F3F4F6', fontSize: '14px', fontWeight: '600' }}>Ramesh Kumar</div>
              <div style={{ color: '#9CA3AF', fontSize: '12px' }}>Chief MIS Officer</div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        <FilterBar 
          branches={branches}
          selectedBranch={selectedBranch} setSelectedBranch={setSelectedBranch}
          selectedPeriod={selectedPeriod} setSelectedPeriod={setSelectedPeriod}
          exactDate={exactDate} setExactDate={setExactDate}
          setActiveModal={setActiveModal}
        />

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'overview' && (
            <OverviewTab 
              kpiData={kpiData}
              accountMetrics={accountMetrics}
              branchNpaData={branchNpaData}
              barChartData={barChartData}
              pieData={pieData}
              trendData={trendData}
              setActiveModal={setActiveModal}
            />
          )}
          
          {activeTab === 'network' && <PlaceholderTab title="Branch Network" description="Analyze performance and operations across different branch locations." />}
          {activeTab === 'loans' && <LoanPortfolioTab selectedBranch={selectedBranch} selectedPeriod={selectedPeriod} exactDate={exactDate} />}
          {activeTab === 'deposits' && <DepositsTab selectedBranch={selectedBranch} selectedPeriod={selectedPeriod} exactDate={exactDate} />}
          {activeTab === 'compliance' && <ComplianceTab selectedBranch={selectedBranch} selectedPeriod={selectedPeriod} exactDate={exactDate} />}
          {activeTab === 'reports' && <ReportsTab selectedBranch={selectedBranch} selectedPeriod={selectedPeriod} exactDate={exactDate} />}
          {activeTab === 'upload' && <UploadTab />}
          {activeTab === 'settings' && <PlaceholderTab title="Settings" description="Configure system preferences, user roles, and UI themes." />}
        </div>

      </div>

      {activeModal && (
        <SmartModal 
          type={activeModal}
          branchCode={selectedBranch}
          period={exactDate || selectedPeriod}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
