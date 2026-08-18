import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import DynamicVisualizer from './DynamicVisualizer';
import KPICard from './KPICard';
import { Landmark, AlertTriangle, Scale, Percent } from 'lucide-react';

const COLORS = ['#0F172A', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#14B8A6', '#EC4899', '#6366F1'];

const LoanPortfolioTab = ({ selectedBranch, selectedPeriod, exactDate }) => {
  const [activeSubTab, setActiveSubTab] = useState('loans_master');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Expanded list of all available loan tables
  const tabs = [
    { id: 'loans_master', label: 'All Loans (Master)', table: 'LOANSBALANCEFILE_LOND2390' },
    { id: 'balances', label: 'Loan Balances (GLCC)', table: 'BAL_IN_LOAN_ACC_GLCC_WISE_DET' },
    { id: 'npa', label: 'NPA Statement', table: 'NPA_STMT' },
    { id: 'list_npa', label: 'List of NPAs', table: 'LIST_OF_NPA_ACCOUNTS' },
    { id: 'probable_npa', label: 'Probable NPAs', table: 'PROBABLE_NPA_REPORT_LOND2463' },
    { id: 'irregular', label: 'Irregular Loans', table: 'LOAN_IRREGULAR_REPORT' },
    { id: 'sanction_letters', label: 'Sanction Letters', table: 'LOANS_SANCTION_LETTER' },
    { id: 'interest_changes', label: 'Interest Rate Changes', table: 'INTERESTRATECHANGELOANS_CFPD0337' },
    { id: 'drawing_power', label: 'Drawing Power', table: 'DRAWING_POWER_LOND2388' },
  ];

  const activeTabConfig = tabs.find(t => t.id === activeSubTab);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        let url = `http://localhost:8000/api/loans-dashboard?branch_code=${selectedBranch}&period=${selectedPeriod}`;
        if (exactDate) {
          url += `&start_date=${exactDate}&end_date=${exactDate}`;
        }
        
        const res = await fetch(url);
        const data = await res.json();
        setDashboardData(data);
      } catch (err) {
        console.error("Failed to load loan dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [selectedBranch, selectedPeriod, exactDate]);

  const formatCurrency = (val) => {
    if (!val) return '0';
    if (val >= 10000000) return `₹ ${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹ ${(val / 100000).toFixed(2)} L`;
    return `₹ ${val.toLocaleString()}`;
  };

  const renderDashboard = () => {
    if (loading) return <div style={{ padding: '20px', color: '#64748B' }}>Loading loan analytics...</div>;
    if (!dashboardData) return null;

    const { overview, products, branches } = dashboardData;
    const npaRatio = overview.total_loans > 0 ? ((overview.total_npa / overview.total_loans) * 100).toFixed(2) : 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
        
        {/* KPI Cards Row (Clickable) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          <KPICard 
            title="Total Advances" 
            value={overview.total_loans || 0} 
            isCurrency={true}
            changePercent="4.2"
            changeType="positive"
            onClick={() => setActiveSubTab('loans_master')}
          />
          <KPICard 
            title="Total NPA" 
            value={overview.total_npa || 0} 
            isCurrency={true}
            changePercent={npaRatio > 5 ? "2.1" : "1.0"}
            changeType={npaRatio > 5 ? "negative" : "positive"}
            onClick={() => setActiveSubTab('npa')}
          />
          <KPICard 
            title="NPA Ratio" 
            value={npaRatio || 0} 
            isCurrency={false}
            changePercent="0.5"
            changeType="positive"
            onClick={() => setActiveSubTab('probable_npa')}
          />
          <KPICard 
            title="Irregular/Excess Draws" 
            value={overview.total_irregular || 0} 
            isCurrency={true}
            changePercent="1.8"
            changeType="negative"
            onClick={() => setActiveSubTab('irregular')}
          />
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '40% 60%', gap: '20px', height: '350px' }}>
          
          {/* Pie Chart: Products */}
          <div className="panel" style={{ padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: 'var(--shadow-panel)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', marginBottom: '16px' }}>Loan Portfolio by Product</h3>
            <div style={{ height: 'calc(100% - 35px)' }}>
              {products && products.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={products.slice(0, 8)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      labelLine={true}
                      label={({ name, percent }) => `${name.substring(0,25)} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {products.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => formatCurrency(val)} />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>No product data</div>
              )}
            </div>
          </div>

          {/* Bar Chart: Branch-wise */}
          <div className="panel" style={{ padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: 'var(--shadow-panel)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', marginBottom: '16px' }}>Top Branches by Outstanding Advances</h3>
            <div style={{ height: 'calc(100% - 35px)' }}>
              {branches && branches.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={branches.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis type="number" tickFormatter={(val) => formatCurrency(val)} stroke="#64748B" fontSize={11} />
                    <YAxis dataKey="name" type="category" width={90} stroke="#64748B" fontSize={11} tick={{fill: '#0F172A', fontWeight: 600}} />
                    <Tooltip cursor={{fill: '#F1F5F9'}} formatter={(val) => formatCurrency(val)} />
                    <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} barSize={16}>
                      {branches.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>No branch data</div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-content" style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      
      {/* High-Level MIS Dashboard */}
      {renderDashboard()}

      {/* Detailed Granular Data Tabs */}
      <div style={{ marginTop: '10px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A', marginBottom: '16px' }}>Detailed Loan Reports</h3>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px', flexWrap: 'wrap' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: activeSubTab === tab.id ? '#0B1F3A' : '#F1F5F9',
                color: activeSubTab === tab.id ? '#fff' : '#475569',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                transition: 'all 0.2s',
                boxShadow: activeSubTab === tab.id ? '0 4px 6px rgba(11, 31, 58, 0.2)' : 'none'
              }}
              onMouseEnter={(e) => { if(activeSubTab !== tab.id) e.target.style.background = '#E2E8F0'; }}
              onMouseLeave={(e) => { if(activeSubTab !== tab.id) e.target.style.background = '#F1F5F9'; }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div style={{ minHeight: '500px', background: '#fff', borderRadius: '12px', boxShadow: 'var(--shadow-panel)', padding: '16px' }}>
          {activeTabConfig && (
            <DynamicVisualizer 
              key={activeTabConfig.id + selectedBranch + selectedPeriod + exactDate} 
              tableName={activeTabConfig.table} 
              title={activeTabConfig.label} 
              branchCode={selectedBranch}
              period={selectedPeriod}
              exactDate={exactDate}
            />
          )}
        </div>
      </div>

    </div>
  );
};

export default LoanPortfolioTab;
