import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, Settings, ShieldAlert, Users, Landmark, Activity, ChevronLeft, ChevronRight, CreditCard, FileSignature, Menu, UploadCloud, User, UserPlus } from 'lucide-react';
import ProfileTab from './ProfileTab';
import UserManagementTab from './UserManagementTab';
import FilterBar from './FilterBar';
import SmartModal from './SmartModal';
import OverviewTab from './OverviewTab';
import PlaceholderTab from './PlaceholderTab';
import LoanPortfolioTab from './LoanPortfolioTab';
import DepositsTab from './DepositsTab';
import ComplianceTab from './ComplianceTab';
import ReportsTab from './ReportsTab';
import UploadTab from './UploadTab';
import BranchNetworkTab from './BranchNetworkTab';

const Dashboard = ({ user, onLogout }) => {

        const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Real data state
  const [branches, setBranches] = useState([]);
  const [allBranches, setAllBranches] = useState([]);
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(user?.role === 'RO' ? user.region : 'ALL');
  const [selectedBranch, setSelectedBranch] = useState(user?.role === 'BRANCH' ? user.branch : 'ALL');
  const [selectedPeriod, setSelectedPeriod] = useState('30D');
  const [selectedProduct, setSelectedProduct] = useState('All Products');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [kpiData, setKpiData] = useState({ total_deposits: 0, total_loans: 0, total_npa: 0 });
  const [accountMetrics, setAccountMetrics] = useState({ opened: 0, closed: 0 });
  const [branchNpaData, setBranchNpaData] = useState([]);
  const [barChartData, setBarChartData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [npaSummaryData, setNpaSummaryData] = useState([]);
  const [npaTrendData, setNpaTrendData] = useState([]);
  const [auditData, setAuditData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [activeModal, setActiveModal] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('http://127.0.0.1:8000/api/branches').then(res => res.json()),
      fetch('http://127.0.0.1:8000/api/regions').then(res => res.json())
    ]).then(([branchesData, regionsData]) => {
      if (regionsData?.success) {
        if (user?.role === 'RO') {
          setRegions([user.region]);
        } else if (user?.role === 'BRANCH') {
          setRegions([]);
        } else {
          setRegions(regionsData.regions);
        }
      }
      
      if (Array.isArray(branchesData)) {
        setAllBranches(branchesData);
        if (user?.role === 'RO') {
          setBranches(branchesData.filter(b => b.region === user.region));
        } else if (user?.role === 'BRANCH') {
          setBranches(branchesData.filter(b => b.code === user.branch));
        } else {
          setBranches(branchesData);
        }
      }
    }).catch(console.error);
  }, [user]);

  // When region changes, update branches
  useEffect(() => {
    if (user?.role === 'HO') {
      if (selectedRegion === 'ALL') {
        setBranches(allBranches);
      } else {
        setBranches(allBranches.filter(b => b.region === selectedRegion));
        if (selectedBranch !== 'ALL' && !allBranches.some(b => b.region === selectedRegion && b.code === selectedBranch)) {
           setSelectedBranch('ALL');
        }
      }
    }
  }, [selectedRegion, allBranches]);
  
  // Computed branch code for API calls
  const apiBranchCode = (selectedBranch === 'ALL' && selectedRegion !== 'ALL') ? 'REGION:' + selectedRegion : selectedBranch;


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let dateParams = `period=${selectedPeriod}&product=${selectedProduct}`;
        if (startDate && endDate) {
          dateParams = `start_date=${startDate}&end_date=${endDate}&product=${selectedProduct}`;
        } else if (startDate) {
          dateParams = `start_date=${startDate}&product=${selectedProduct}`;
        }

        const [
          kpiRes, accountRes, branchNpaRes,
          prodData, pieRes, trendDataRes, npaSummaryRes, auditRes, npaTrendRes
        ] = await Promise.all([
          fetch(`http://127.0.0.1:8000/api/kpi-summary?branch_code=${apiBranchCode}&${dateParams}`).then(res => res.json()),
          fetch(`http://127.0.0.1:8000/api/account-metrics?branch_code=${apiBranchCode}&${dateParams}`).then(res => res.json()),
          fetch(`http://127.0.0.1:8000/api/npa-branch-wise?branch_code=${apiBranchCode}&${dateParams}`).then(res => res.json()),
          fetch(`http://127.0.0.1:8000/api/productwise-summary?branch_code=${apiBranchCode}`).then(res => res.json()),
          fetch(`http://127.0.0.1:8000/api/deposits-by-type?branch_code=${apiBranchCode}`).then(res => res.json()),
          fetch(`http://127.0.0.1:8000/api/trend-data?branch_code=${apiBranchCode}&${dateParams}`).then(res => res.json()),
          fetch(`http://127.0.0.1:8000/api/npa-summary?branch_code=${apiBranchCode}&${dateParams}`).then(res => res.json()).catch(() => []),
          fetch(`http://127.0.0.1:8000/api/audit-exceptions?branch_code=${apiBranchCode}&${dateParams}`).then(res => res.json()).catch(() => []),
          fetch(`http://127.0.0.1:8000/api/npa-trend?branch_code=${apiBranchCode}&${dateParams}`).then(res => res.json()).catch(() => [])
        ]);

        setKpiData(kpiRes || {});
        setAccountMetrics(accountRes || {});
        setBranchNpaData(Array.isArray(branchNpaRes) ? branchNpaRes : []);
        setBarChartData(Array.isArray(prodData) && prodData.length > 0 ? prodData.slice(0,7).map(d => ({ name: d.name.substring(0, 10), Deposits: (d.credit||0)/100000, Loans: (d.debit||0)/100000 })) : []);
        setPieData(Array.isArray(pieRes) ? pieRes : []);
        setTrendData(Array.isArray(trendDataRes) ? trendDataRes : []);
        setNpaSummaryData(Array.isArray(npaSummaryRes) ? npaSummaryRes : []);
        setNpaTrendData(Array.isArray(npaTrendRes) ? npaTrendRes : []);
        setAuditData(Array.isArray(auditRes) ? auditRes : []);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [apiBranchCode, selectedPeriod, startDate, endDate]);

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', backgroundColor: '#F3F4F6', fontFamily: 'Inter, sans-serif', overflowX: 'hidden', position: 'relative' }}>
      
      {/* Sidebar - Deep Navy */}
      <div className="sidebar" style={{ flexShrink: 0, width: isSidebarOpen ? '260px' : (isMobile ? '0px' : '80px'), position: isMobile ? 'absolute' : 'relative', height: '100%', transition: 'width 0.3s', backgroundColor: 'var(--sidebar-bg)', color: '#9CA3AF', display: 'flex', flexDirection: 'column', zIndex: 50, overflow: 'hidden' }}>

        
        <div className="sidebar-nav" style={{ flex: 1, padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
          {[
            { id: 'overview', label: 'MIS Dashboard', icon: LayoutDashboard },
            { id: 'network', label: 'Branch Network', icon: Activity },
            { id: 'loans', label: 'Advances & NPA', icon: Landmark },
            { id: 'deposits', label: 'Deposits', icon: CreditCard },
            { id: 'compliance', label: 'Audit & Exceptions', icon: FileSignature },
            { id: 'reports', label: 'Reports & Accounts', icon: FileText },
            { id: 'upload', label: 'Data Sync', icon: UploadCloud },
            ...(user?.role === 'HO' ? [{ id: 'users', label: 'User Management', icon: UserPlus }] : []),
            { id: 'profile', label: 'My Profile', icon: User },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map(item => (
            <div 
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`} 
              onClick={() => { setActiveTab(item.id); if(isMobile) setIsSidebarOpen(false); }} 
              style={{ 
                padding: isSidebarOpen ? '12px 24px' : '12px 0', 
                cursor: 'pointer', 
                display: 'flex', 
                gap: '12px', 
                alignItems: 'center', 
                backgroundColor: activeTab === item.id ? 'var(--sidebar-active)' : 'transparent',
                color: activeTab === item.id ? 'var(--accent-gold)' : '#D1D5DB',
                borderLeft: activeTab === item.id ? '4px solid var(--accent-gold)' : '4px solid transparent',
                fontSize: '14px',
                fontWeight: activeTab === item.id ? '600' : '400',
                justifyContent: isSidebarOpen ? 'flex-start' : 'center',
                transition: 'all 0.2s ease',
                margin: isSidebarOpen ? '0 8px' : '0 4px',
                borderRadius: '6px'
              }}
              title={item.label}
            >
              <item.icon size={22} style={{ flexShrink: 0 }} /> 
              {isSidebarOpen && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
            </div>
          ))}
        </div>

        
        
        {/* Collapse Button */}
        <div 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#FFF', fontSize: '14px', borderTop: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', background: 'rgba(255,255,255,0.02)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
        >
          {isSidebarOpen ? <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}><ChevronLeft size={20} /> <span style={{ fontWeight: '500' }}>Collapse</span></div> : <ChevronRight size={20} />}
        </div>
      </div>

      {/* Main Content Area */}
      {isMobile && isSidebarOpen && (
        <div 
          style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40 }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        <FilterBar regions={regions} selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion} 
          isMobile={isMobile}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          branches={branches}
          allBranches={allBranches}
          selectedBranch={apiBranchCode}
          setSelectedBranch={setSelectedBranch}
          selectedPeriod={selectedPeriod}
          setSelectedPeriod={setSelectedPeriod}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          selectedProduct={selectedProduct}
          setSelectedProduct={setSelectedProduct}
          setActiveModal={setActiveModal}
          user={user}
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
              npaSummaryData={npaSummaryData}
              auditData={auditData}
              npaTrendData={npaTrendData}
              selectedPeriod={selectedPeriod}
              setActiveModal={setActiveModal}
              setActiveTab={setActiveTab}
            />
          )}
          
          {activeTab === 'network' && <BranchNetworkTab apiBranchCode={apiBranchCode} />}
          {activeTab === 'loans' && <LoanPortfolioTab selectedBranch={apiBranchCode} selectedPeriod={selectedPeriod} startDate={startDate} endDate={endDate} />}
          {activeTab === 'deposits' && <DepositsTab selectedBranch={apiBranchCode} selectedPeriod={selectedPeriod} startDate={startDate} endDate={endDate} />}
          {activeTab === 'compliance' && <ComplianceTab selectedBranch={apiBranchCode} selectedPeriod={selectedPeriod} startDate={startDate} endDate={endDate} />}
          {activeTab === 'reports' && <ReportsTab selectedBranch={apiBranchCode} selectedPeriod={selectedPeriod} startDate={startDate} endDate={endDate} />}
          {activeTab === 'upload' && <UploadTab />}
          {activeTab === 'profile' && <ProfileTab user={user} onLogout={onLogout} />}
          {activeTab === 'users' && user?.role === 'HO' && <UserManagementTab user={user} />}
          {activeTab === 'settings' && <PlaceholderTab title="Settings" description="Configure system preferences, user roles, and UI themes." />}
        </div>

      </div>

      {activeModal && (
        <SmartModal 
          activeModal={activeModal} 
          onClose={() => setActiveModal(null)} 
          branchCode={apiBranchCode} 
          startDate={startDate}
          endDate={endDate}
          period={selectedPeriod}
        />
      )}
    </div>
  );
};

export default Dashboard;

