import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { CreditCard, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import DynamicVisualizer from './DynamicVisualizer';

const COLORS = ['#0B1F3A', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6'];

const formatCurrency = (val) => {
  if (!val) return '₹ 0.00';
  if (val >= 10000000) return `₹ ${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹ ${(val / 100000).toFixed(2)} L`;
  return `₹ ${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

const KPICard = ({ title, value, isCurrency = true, changePercent, changeType, onClick }) => (
  <div 
    onClick={onClick}
    className="kpi-card"
    style={{
      background: '#fff',
      borderRadius: '12px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      border: '1px solid #E5E7EB',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.2s, box-shadow 0.2s',
      position: 'relative',
      overflow: 'hidden'
    }}
    onMouseEnter={(e) => { if(onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; } }}
    onMouseLeave={(e) => { if(onClick) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; } }}
  >
    <div style={{ fontSize: '14px', fontWeight: '600', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {title}
      <CreditCard size={18} color="#9CA3AF" />
    </div>
    <div style={{ fontSize: '28px', fontWeight: '700', color: '#0F172A' }}>
      {isCurrency ? formatCurrency(value) : value}
    </div>
    {changePercent && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '500', color: changeType === 'positive' ? '#10B981' : '#EF4444', marginTop: '4px' }}>
        {changeType === 'positive' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        <span>{changePercent}% from last month</span>
      </div>
    )}
    {onClick && (
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #10B981, #3B82F6)' }} />
    )}
  </div>
);

const DepositsTab = ({ selectedBranch, selectedPeriod, exactDate }) => {
  const [data, setData] = useState({
    overview: { total_deposits: 0, casa_deposits: 0, term_deposits: 0 },
    products: [],
    branches: []
  });
  const [loading, setLoading] = useState(true);
  
  // Drill-down Modal State
  const [activeVisualModal, setActiveVisualModal] = useState(null);
  const [modalPage, setModalPage] = useState(1);
  const [modalBranchLimit, setModalBranchLimit] = useState(15);
  const [activeOthersModal, setActiveOthersModal] = useState(null);

  const [activeSubTab, setActiveSubTab] = useState('deposits');
  const tabs = [
    { id: 'deposits', label: 'Deposit Balances', table: 'DEPOSITS_BALANCE_FILE_DEPD0586' },
    { id: 'ccod', label: 'CC/OD Balances', table: 'CC_OD_BALANCE_FILE_DEPD0580' },
    { id: 'gldaybook', label: 'GL Daybook', table: 'GL_DAYBOOK_GEND0807' },
    { id: 'glcc_summary', label: 'GLCC Wise Summary', table: 'GLCC_WISE_SUM_REP' },
  ];
  const activeTabConfig = tabs.find(t => t.id === activeSubTab);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:8000/api/deposits-dashboard?branch_code=${selectedBranch}&period=${selectedPeriod}`);
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error("Error fetching deposits dashboard data", err);
      }
      setLoading(false);
    };
    fetchData();
  }, [selectedBranch, selectedPeriod]);

  // Clean up product names for Legend
  const cleanProductName = (name) => {
    if (!name) return 'Unknown';
    return name.substring(0, 30);
  };

  const rawProducts = data.products || [];
  const topCount = 5;
  let displayProducts = [];
  if (rawProducts.length > topCount + 1) {
    displayProducts = rawProducts.slice(0, topCount);
    const others = rawProducts.slice(topCount);
    const othersSum = others.reduce((acc, p) => acc + (p.value || 0), 0);
    if (othersSum > 0) {
      displayProducts.push({ name: 'Others', value: othersSum, isOthers: true, rawDetails: others, fill: '#94A3B8' });
    }
  } else {
    displayProducts = rawProducts;
  }

  const productDonutData = displayProducts.map((p, i) => ({
    ...p,
    name: cleanProductName(p.name),
    value: p.value || 0,
    fill: p.fill || COLORS[i % COLORS.length]
  }));
  const totalDonutValue = productDonutData.reduce((acc, curr) => acc + curr.value, 0);
  const productDonutDataWithPercent = productDonutData.map(p => ({
    ...p,
    percent: totalDonutValue ? ((p.value / totalDonutValue) * 100).toFixed(1) : 0
  }));

  const topBranchesData = (data.branches || []).filter(b => b.name !== 'ALL' && b.name !== 'HEAD OFFICE').slice(0, 10);

  // Modal Data
  const rawModalData = (data.branches || []).filter(b => b.name !== 'ALL');
  const totalModalPages = modalBranchLimit === 'ALL' ? 1 : Math.ceil(rawModalData.length / modalBranchLimit);
  const displayedModalData = modalBranchLimit === 'ALL' ? rawModalData : rawModalData.slice((modalPage - 1) * modalBranchLimit, modalPage * modalBranchLimit);

  // CASA Ratio Calculation
  const casaRatio = data.overview.total_deposits > 0 
    ? ((data.overview.casa_deposits / data.overview.total_deposits) * 100).toFixed(1) 
    : 0;


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

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <KPICard 
          title="Total Deposits" 
          value={data.overview.total_deposits} 
          changePercent="2.8"
          changeType="positive"
          onClick={() => { setModalBranchLimit(15); setActiveVisualModal('total'); }}
        />
        <KPICard 
          title="CASA Balance" 
          value={data.overview.casa_deposits}
          changePercent="1.5"
          changeType="positive"
          onClick={() => { setModalBranchLimit(15); setActiveVisualModal('total'); }}
        />
        <KPICard 
          title="Term Deposits" 
          value={data.overview.term_deposits}
          changePercent="4.1"
          changeType="positive"
          onClick={() => { setModalBranchLimit(15); setActiveVisualModal('total'); }}
        />
        <KPICard 
          title="CASA Ratio" 
          value={`${casaRatio}%`} 
          isCurrency={false}
          changePercent="0.3"
          changeType="negative"
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', minHeight: '380px' }}>
        
        {/* Donut Chart: Deposit Product Mix */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#111827' }}>Deposit Product Mix</h3>
          <div style={{ flex: 1, position: 'relative' }}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={productDonutDataWithPercent}
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {productDonutDataWithPercent.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.fill} 
                      style={{ cursor: entry.isOthers ? 'pointer' : 'default' }}
                      onClick={() => {
                        if (entry.isOthers && entry.rawDetails) {
                          setActiveOthersModal(entry.rawDetails);
                        }
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Legend inside Donut Container */}
            <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxHeight: '100px', overflowY: 'auto', paddingRight: '4px' }}>
              {productDonutDataWithPercent.map((entry, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: entry.fill, marginTop: '4px', flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: '#4B5563', lineHeight: '1.2', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{entry.name}</span>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#111827' }}>{entry.percent}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar Chart: Top Branches */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#111827' }}>Top Branches by Deposits</h3>
          <div style={{ flex: 1, minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topBranchesData} margin={{ top: 10, right: 10, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="name" 
                  angle={-25} 
                  textAnchor="end" 
                  height={60} 
                  tick={{ fontSize: 11, fill: '#6B7280' }} 
                  interval={0}
                />
                <YAxis 
                  tickFormatter={(val) => `₹${(val/100000).toFixed(0)}L`}
                  tick={{ fontSize: 11, fill: '#6B7280' }} 
                />
                <Tooltip 
                  cursor={{ fill: '#F3F4F6' }}
                  formatter={(value) => [formatCurrency(value), "Deposits"]} 
                />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {topBranchesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sub-tabs for Detailed Grids */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px', marginTop: '24px' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: activeSubTab === tab.id ? '#0B1F3A' : 'transparent',
              color: activeSubTab === tab.id ? '#fff' : '#4B5563',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div style={{ minHeight: '500px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '16px', marginTop: '16px' }}>
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

      {/* Visual Modals for KPI Clicks */}
      {activeVisualModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
        }}>
          <div style={{
            width: '100%', maxWidth: '1200px', height: '85vh',
            background: '#fff', borderRadius: '16px', padding: '24px 32px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            display: 'flex', flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0F172A', margin: 0 }}>
                  Branch-wise Total Deposits
                </h2>
                <span style={{ fontSize: '13px', color: '#64748B', marginTop: '2px', display: 'block' }}>
                  Showing {displayedModalData.length} of {rawModalData.length} branches
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Pagination */}
                {modalBranchLimit === 'ALL' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                    <button
                      disabled={modalPage === 1}
                      onClick={() => setModalPage(p => Math.max(1, p - 1))}
                      style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: modalPage === 1 ? '#F1F5F9' : '#fff', cursor: modalPage === 1 ? 'default' : 'pointer', fontWeight: '600' }}
                    >
                      Prev
                    </button>
                    <span style={{ fontWeight: '600', color: '#475569' }}>Page {modalPage} of {totalModalPages || 1}</span>
                    <button
                      disabled={modalPage >= totalModalPages}
                      onClick={() => setModalPage(p => Math.min(totalModalPages, p + 1))}
                      style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', background: modalPage >= totalModalPages ? '#F1F5F9' : '#fff', cursor: modalPage >= totalModalPages ? 'default' : 'pointer', fontWeight: '600' }}
                    >
                      Next
                    </button>
                  </div>
                )}
                
                {/* View Limit Toggles */}
                <div style={{ display: 'flex', background: '#F1F5F9', padding: '4px', borderRadius: '8px' }}>
                  {[10, 15, 25, 'ALL'].map(limit => (
                    <button
                      key={limit}
                      onClick={() => {
                        setModalBranchLimit(limit);
                        setModalPage(1);
                      }}
                      style={{
                        padding: '4px 12px',
                        border: 'none',
                        background: modalBranchLimit === limit ? '#fff' : 'transparent',
                        color: modalBranchLimit === limit ? '#0F172A' : '#64748B',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: modalBranchLimit === limit ? '600' : '500',
                        cursor: 'pointer',
                        boxShadow: modalBranchLimit === limit ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      {limit === 'ALL' ? 'All (Paginated)' : `Top ${limit}`}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => setActiveVisualModal(null)}
                  style={{ background: '#F1F5F9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#E2E8F0'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#F1F5F9'}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                {modalBranchLimit === 'ALL' ? (
                  <LineChart data={displayedModalData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" angle={-90} textAnchor="end" height={80} tick={{ fill: '#64748B', fontSize: 9 }} interval={0} />
                    <YAxis tickFormatter={(val) => `₹${(val/10000000).toFixed(2)}Cr`} tick={{ fill: '#475569', fontSize: 11 }} />
                    <Tooltip cursor={{ fill: '#F8FAFC' }} formatter={(value) => [formatCurrency(value), "Deposits"]} />
                    <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: '#10B981' }} activeDot={{ r: 6 }} />
                  </LineChart>
                ) : (
                  <BarChart data={displayedModalData} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                    <XAxis type="number" tickFormatter={(val) => `₹${(val/10000000).toFixed(2)}Cr`} tick={{ fill: '#64748B', fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} width={120} interval={0} />
                    <Tooltip 
                      cursor={{ fill: '#F8FAFC' }}
                      formatter={(value) => [formatCurrency(value), "Deposits"]}
                    />
                    <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={24}>
                      {displayedModalData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
      {renderOthersModal()}
    </div>
  );
};

export default DepositsTab;
