import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const NpaManagementTab = ({ selectedBranch, selectedPeriod, exactDate }) => {
  const [npaData, setNpaData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [summaryData, setSummaryData] = useState([]);
  const [sortOrder, setSortOrder] = useState('top');
  const [loading, setLoading] = useState(true);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  useEffect(() => {
    setLoading(true);
    let activePeriod = exactDate || selectedPeriod;

    Promise.all([
      fetch(`http://127.0.0.1:8000/api/npa-branch-wise?branch_code=${selectedBranch}&period=${activePeriod}`).then(res => res.json()),
      fetch(`http://127.0.0.1:8000/api/npa-trend?branch_code=${selectedBranch}&period=${activePeriod}`).then(res => res.json()),
      fetch(`http://127.0.0.1:8000/api/npa-summary?branch_code=${selectedBranch}&period=${activePeriod}`).then(res => res.json())
    ])
      .then(([branchData, trendRes, summaryRes]) => {
        setNpaData(Array.isArray(branchData) ? branchData.map(d => ({ ...d, NPA: (d.NPA||0)/100000 })) : []);
        setTrendData(Array.isArray(trendRes) ? trendRes : []);
        setSummaryData(Array.isArray(summaryRes) ? summaryRes : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedBranch, selectedPeriod, exactDate]);

  // Sort and slice branch data based on toggle
  const displayNpaData = [...npaData]
    .sort((a, b) => sortOrder === 'top' ? b.NPA - a.NPA : a.NPA - b.NPA)
    .slice(0, 10); // Show top/least 10 for better view

  const sortedSummary = [...summaryData].sort((a, b) => b.amount - a.amount);
  const displaySummaryData = sortedSummary.length > 3 
    ? [...sortedSummary.slice(0, 3), { category: 'Others', amount: sortedSummary.slice(3).reduce((sum, item) => sum + item.amount, 0) }] 
    : sortedSummary;

  return (
    <div className="dashboard-content" style={{ padding: '24px 32px', overflowY: 'auto' }}>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '24px' }}>NPA Management</div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* NPA Trend */}
        <div className="card" style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#111827' }}>NPA Trend (% of Total Loans)</div>
          </div>
          <div style={{ height: '300px' }}>
            {loading ? <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}>Loading...</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <Tooltip cursor={{ fill: '#F9FAFB' }} />
                  <Line type="monotone" dataKey="value" name="NPA %" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, fill: '#EF4444', strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* NPA Summary */}
          <div className="card" style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#111827' }}>NPA Category Summary</div>
              {summaryData.length > 3 && (
                <button onClick={() => setShowSummaryModal(true)} style={{ color: '#F97316', background: 'none', border: 'none', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>View All</button>
              )}
            </div>
            <div style={{ height: '400px' }}>
              {loading ? <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}>Loading...</div> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={displaySummaryData} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                      {displaySummaryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#EF4444', '#F59E0B', '#3B82F6', '#10B981', '#6366F1'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${value.toFixed(2)} Lakhs`} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* NPA Defaulting Branches */}
          <div className="card" style={{ padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#111827' }}>NPA Defaulting Branches</div>
                <div style={{ fontSize: '13px', color: '#6B7280' }}>Outstanding NPA (₹ Lakhs)</div>
              </div>
              <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: '20px', padding: '4px', cursor: 'pointer' }}>
                <div onClick={() => setSortOrder('top')} style={{ background: sortOrder === 'top' ? '#F97316' : 'transparent', color: sortOrder === 'top' ? '#fff' : '#6B7280', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '500' }}>Top 10</div>
                <div onClick={() => setSortOrder('least')} style={{ background: sortOrder === 'least' ? '#F97316' : 'transparent', color: sortOrder === 'least' ? '#fff' : '#6B7280', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '500' }}>Least 10</div>
              </div>
            </div>
            <div style={{ height: '400px' }}>
              {loading ? <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center'}}>Loading...</div> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayNpaData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }} barGap={0}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} width={120} />
                    <Tooltip cursor={{ fill: '#F9FAFB' }} />
                    <Bar dataKey="NPA" fill="#EF4444" barSize={12} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* View All Modal */}
      {showSummaryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.62)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setShowSummaryModal(false)}>
          <div style={{ width: '800px', maxWidth: '90vw', maxHeight: '80vh', background: '#fff', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#0F172A' }}>All NPA Categories</h2>
              <button onClick={() => setShowSummaryModal(false)} style={{ background: '#F1F5F9', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                    <th style={{ padding: '12px 8px', color: '#64748B', fontSize: '13px' }}>Category</th>
                    <th style={{ padding: '12px 8px', color: '#64748B', fontSize: '13px', textAlign: 'right' }}>Amount (₹ Lakhs)</th>
                    <th style={{ padding: '12px 8px', color: '#64748B', fontSize: '13px', textAlign: 'right' }}>% Share</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSummary.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 8px', fontSize: '14px', color: '#334155' }}>{item.category}</td>
                      <td style={{ padding: '12px 8px', fontSize: '14px', color: '#334155', textAlign: 'right', fontWeight: '500' }}>{item.amount.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '12px 8px', fontSize: '14px', color: '#334155', textAlign: 'right' }}>{item.pct}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NpaManagementTab;

