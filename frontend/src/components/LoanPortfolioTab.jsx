import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import DynamicVisualizer from './DynamicVisualizer';
import KPICard from './KPICard';
import { Landmark, AlertTriangle, Scale, Percent, X } from 'lucide-react';

const COLORS = ['#0F172A', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#14B8A6', '#EC4899', '#6366F1'];

const LoanPortfolioTab = ({ selectedBranch, selectedPeriod, exactDate }) => {
  const [activeSubTab, setActiveSubTab] = useState('loans_master');
  const [activeVisualModal, setActiveVisualModal] = useState(null); // 'loans', 'npa', 'ratio', 'irregular'
  const [modalBranchLimit, setModalBranchLimit] = useState(15); // Default to Top 15 to avoid clutter
  const [activeOthersModal, setActiveOthersModal] = useState(null);
  const [modalPage, setModalPage] = useState(1);
  const pageSize = 15;
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
    if (!val) return '₹ 0';
    if (val >= 10000000) return `₹ ${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹ ${(val / 100000).toFixed(2)} L`;
    return `₹ ${val.toLocaleString()}`;
  };

  // Prepare Modal Data cleanly based on active modal type
  const rawModalData = useMemo(() => {
    if (!dashboardData || !activeVisualModal) return [];
    const { branches = [], branch_npa = [], branch_irregular = [] } = dashboardData;

    if (activeVisualModal === 'loans') return branches;
    if (activeVisualModal === 'npa') return branch_npa;
    if (activeVisualModal === 'irregular') return branch_irregular;
    if (activeVisualModal === 'ratio') {
      return branches.map(b => {
        const n = (branch_npa || []).find(n => n.name === b.name)?.value || 0;
        return { name: b.name, value: b.value > 0 ? parseFloat(((n / b.value) * 100).toFixed(2)) : 0 };
      }).sort((a, b) => b.value - a.value);
    }
    return [];
  }, [dashboardData, activeVisualModal]);

  const totalModalPages = Math.ceil(rawModalData.length / pageSize);

  const displayedModalData = useMemo(() => {
    if (modalBranchLimit === 'ALL') {
      const start = (modalPage - 1) * pageSize;
      return rawModalData.slice(start, start + pageSize);
    }
    return rawModalData.slice(0, modalBranchLimit);
  }, [rawModalData, modalBranchLimit, modalPage]);

  const renderOthersModal = () => {
    if (!activeOthersModal) return null;
    const sorted = [...activeOthersModal].sort((a, b) => (b.value || 0) - (a.value || 0));
    const othersTotal = sorted.reduce((sum, item) => sum + (item.value || 0), 0);
    const top5 = sorted.slice(0, 5).map((p, i) => ({
      name: (p.name || 'Unknown').substring(0, 22),
      value: p.value || 0,
      fill: COLORS[i % COLORS.length]
    }));
    
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
        zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
      }}>
        <div style={{
          width: '100%', maxWidth: '1100px', height: '85vh',
          background: '#fff', borderRadius: '16px', padding: '24px 28px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', flexShrink: 0 }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A', margin: 0 }}>Others Category Breakdown</h2>
              <span style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', display: 'block' }}>
                {sorted.length} products | Total: {formatCurrency(othersTotal)}
              </span>
            </div>
            <button onClick={() => setActiveOthersModal(null)}
              style={{ background: '#F1F5F9', border: 'none', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={18} color="#64748B" />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
            <div style={{ width: '340px', flexShrink: 0, background: '#F8FAFC', borderRadius: '12px', padding: '16px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Top 5 by Value</h4>
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top5} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" tickFormatter={(val) => `${(val/100000).toFixed(0)}L`} tick={{ fill: '#64748B', fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#334155', fontSize: 10, fontWeight: 500 }} width={130} interval={0} />
                    <Tooltip cursor={{ fill: '#F1F5F9' }} formatter={(value) => [formatCurrency(value), 'Amount']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                      {top5.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', minHeight: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '35px 3fr 1.5fr 70px', background: '#F1F5F9', padding: '8px 12px', fontWeight: '600', fontSize: '12px', color: '#475569', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
                <div>#</div>
                <div>Product Name</div>
                <div style={{ textAlign: 'right' }}>Amount</div>
                <div style={{ textAlign: 'right' }}>Share</div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {sorted.map((item, idx) => (
                  <div key={idx} style={{ 
                    display: 'grid', gridTemplateColumns: '35px 3fr 1.5fr 70px', 
                    padding: '6px 12px', fontSize: '12px', 
                    borderBottom: '1px solid #F1F5F9', color: '#1E293B', 
                    alignItems: 'center',
                    background: idx % 2 === 0 ? '#fff' : '#FAFBFC'
                  }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F0F9FF'}
                    onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#FAFBFC'}
                  >
                    <div style={{ color: '#94A3B8', fontSize: '11px' }}>{idx + 1}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: COLORS[idx % COLORS.length], flexShrink: 0 }}></div>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.name}>{item.name || 'Unknown'}</span>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: '600', color: '#0F172A' }}>{formatCurrency(item.value)}</div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ background: '#EFF6FF', color: '#3B82F6', padding: '1px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>
                        {othersTotal > 0 ? ((item.value / othersTotal) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    if (loading) return <div style={{ padding: '20px', color: '#64748B' }}>Loading loan analytics...</div>;
    if (!dashboardData) return null;

    const { overview, products = [], branches = [] } = dashboardData;
    const npaRatio = overview.total_loans > 0 ? ((overview.total_npa / overview.total_loans) * 100).toFixed(2) : 0;

    // Top 6 products + Others for clean Pie Display
    const topProducts = products.slice(0, 6);
    const otherProductsSum = products.slice(6).reduce((acc, p) => acc + (p.value || 0), 0);
    const chartProducts = otherProductsSum > 0 
      ? [...topProducts, { name: 'Others', value: otherProductsSum, isOthers: true, rawDetails: products.slice(6) }]
      : topProducts;

    const totalProductVal = chartProducts.reduce((acc, p) => acc + p.value, 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px', position: 'relative' }}>
        
        {/* KPI Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          <KPICard 
            title="Total Advances" 
            value={overview.total_loans || 0} 
            isCurrency={true}
            changePercent="4.2"
            changeType="positive"
            onClick={() => { setModalBranchLimit(15); setActiveVisualModal('loans'); }}
          />
          <KPICard 
            title="Total NPA" 
            value={overview.total_npa || 0} 
            isCurrency={true}
            changePercent={npaRatio > 5 ? "2.1" : "1.0"}
            changeType={npaRatio > 5 ? "negative" : "positive"}
            onClick={() => { setModalBranchLimit(15); setActiveVisualModal('npa'); }}
          />
          <KPICard 
            title="NPA Ratio" 
            value={npaRatio || 0} 
            isCurrency={false}
            changePercent="0.5"
            changeType="positive"
            onClick={() => { setModalBranchLimit(15); setActiveVisualModal('ratio'); }}
          />
          <KPICard 
            title="Irregular/Excess Draws" 
            value={overview.total_irregular || 0} 
            isCurrency={true}
            changePercent="1.8"
            changeType="negative"
            onClick={() => { setModalBranchLimit(15); setActiveVisualModal('irregular'); }}
          />
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '45% 55%', gap: '20px', height: '360px' }}>
          
          {/* Pie Chart: Products (Custom Side Legend to avoid any text overlap) */}
          <div className="panel" style={{ padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: 'var(--shadow-panel)', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0F172A', marginBottom: '12px' }}>Loan Portfolio by Product</h3>
            
            {chartProducts && chartProducts.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '16px' }}>
                {/* Left: Donut Chart */}
                <div style={{ width: '45%', height: '100%', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartProducts}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        label={false}
                      >
                        {chartProducts.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.name === 'Others' ? '#94A3B8' : COLORS[index % COLORS.length]}
                            style={{ cursor: entry.isOthers ? 'pointer' : 'default' }}
                            onClick={() => {
                              if (entry.isOthers && entry.rawDetails) {
                                setActiveOthersModal(entry.rawDetails);
                              }
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => formatCurrency(val)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Right: Custom Clean Legend List */}
                <div style={{ width: '55%', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '250px', paddingRight: '4px' }}>
                  {chartProducts.map((prod, idx) => {
                    const pct = totalProductVal > 0 ? ((prod.value / totalProductVal) * 100).toFixed(1) : 0;
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS[idx % COLORS.length], flexShrink: 0 }} />
                          <span style={{ color: '#334155', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={prod.name}>
                            {prod.name}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                          <span style={{ fontWeight: '700', color: '#0F172A' }}>{pct}%</span>
                          <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>{formatCurrency(prod.value)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>No product data</div>
            )}
          </div>

          {/* Bar Chart: Top Branches */}
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

        {/* Visual Modal Overlay (Cleaned up, no X-axis overlap / hoch-poch) */}
        {activeVisualModal && (
          <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15, 23, 42, 0.75)', zIndex: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '30px', backdropFilter: 'blur(4px)'
          }}>
            <div style={{
              width: '100%', maxWidth: '1200px', height: '85vh',
              background: '#fff', borderRadius: '16px', padding: '24px 32px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              display: 'flex', flexDirection: 'column'
            }}>
              {/* Header with Title and Filter Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                    {activeVisualModal === 'loans' && "Branch-wise Total Advances"}
                    {activeVisualModal === 'npa' && "Branch-wise Total NPA"}
                    {activeVisualModal === 'ratio' && "Branch-wise NPA Ratio"}
                    {activeVisualModal === 'irregular' && "Branch-wise Irregular & Excess Draws"}
                  </h2>
                  <span style={{ fontSize: '13px', color: '#64748B', marginTop: '2px', display: 'block' }}>
                    Showing {displayedModalData.length} of {rawModalData.length} branches
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* Limit Filter Controls & Pagination */}
                  {modalBranchLimit === 'ALL' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                      <button
                        disabled={modalPage === 1}
                        onClick={() => setModalPage(p => Math.max(1, p - 1))}
                        style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: modalPage === 1 ? '#F1F5F9' : '#fff', cursor: modalPage === 1 ? 'default' : 'pointer', fontWeight: '600' }}
                      >
                        Prev
                      </button>
                      <span style={{ fontWeight: '600', color: '#475569' }}>
                        Page {modalPage} of {totalModalPages || 1}
                      </span>
                      <button
                        disabled={modalPage >= totalModalPages}
                        onClick={() => setModalPage(p => Math.min(totalModalPages, p + 1))}
                        style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: modalPage >= totalModalPages ? '#F1F5F9' : '#fff', cursor: modalPage >= totalModalPages ? 'default' : 'pointer', fontWeight: '600' }}
                      >
                        Next
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '6px', background: '#F1F5F9', padding: '4px', borderRadius: '8px' }}>
                    {[10, 15, 25, 'ALL'].map(limit => (
                      <button
                        key={limit}
                        onClick={() => { setModalBranchLimit(limit); setModalPage(1); }}
                        style={{
                          padding: '4px 12px',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          background: modalBranchLimit === limit ? '#0F172A' : 'transparent',
                          color: modalBranchLimit === limit ? '#fff' : '#64748B',
                          transition: 'all 0.2s'
                        }}
                      >
                        {limit === 'ALL' ? 'All (Paginated)' : `Top ${limit}`}
                      </button>
                    ))}
                  </div>

                  <button 
                    onClick={() => setActiveVisualModal(null)}
                    style={{ background: '#F1F5F9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              {/* Chart Container - Normal Width, No Scrolling, Zero Hochpoch */}
              <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  {modalBranchLimit === 'ALL' ? (
                    <LineChart data={displayedModalData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" angle={-90} textAnchor="end" height={80} tick={{ fill: '#64748B', fontSize: 9 }} interval={0} />
                      <YAxis tickFormatter={(val) => activeVisualModal === 'ratio' ? `${val}%` : `₹${(val/10000000).toFixed(2)}Cr`} tick={{ fill: '#475569', fontSize: 11 }} />
                      <Tooltip cursor={{ fill: '#F8FAFC' }} formatter={(val) => [activeVisualModal === 'ratio' ? `${val}%` : formatCurrency(val), "Loans"]} />
                      <Line type="monotone" dataKey="value" stroke={activeVisualModal === 'npa' || activeVisualModal === 'ratio' ? '#EF4444' : activeVisualModal === 'irregular' ? '#8B5CF6' : '#3B82F6'} strokeWidth={2} dot={{ r: 3, fill: activeVisualModal === 'npa' || activeVisualModal === 'ratio' ? '#EF4444' : activeVisualModal === 'irregular' ? '#8B5CF6' : '#3B82F6' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  ) : (
                    <BarChart 
                      data={displayedModalData} 
                      margin={{ top: 20, right: 30, left: 20, bottom: 65 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        interval={0} 
                        height={65} 
                        tick={{fontSize: 11, fill: '#334155', fontWeight: 600}} 
                      />
                      <YAxis 
                        tickFormatter={(val) => activeVisualModal === 'ratio' ? `${val}%` : `₹${(val/10000000).toFixed(2)}Cr`} 
                        tick={{fontSize: 11, fill: '#64748B'}} 
                      />
                      <Tooltip 
                        formatter={(val) => activeVisualModal === 'ratio' ? `${val}%` : formatCurrency(val)} 
                        cursor={{fill: '#F8FAFC'}} 
                      />
                      <Bar 
                        dataKey="value" 
                        fill={activeVisualModal === 'npa' || activeVisualModal === 'ratio' ? '#EF4444' : activeVisualModal === 'irregular' ? '#8B5CF6' : '#3B82F6'} 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={45}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
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

      {renderOthersModal()}
    </div>
  );
};

export default LoanPortfolioTab;
