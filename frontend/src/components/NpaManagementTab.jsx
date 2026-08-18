import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const NpaManagementTab = ({ selectedBranch, selectedPeriod, exactDate }) => {
  const [npaData, setNpaData] = useState([]);
  const [sortOrder, setSortOrder] = useState('top');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let activePeriod = exactDate || selectedPeriod;

    fetch(`http://127.0.0.1:8000/api/npa-branch-wise?branch_code=${selectedBranch}&period=${activePeriod}`)
      .then(res => res.json())
      .then(data => {
        setNpaData(Array.isArray(data) ? data.map(d => ({ ...d, NPA: (d.NPA||0)/100000 })) : []);
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

  return (
    <div className="dashboard-content" style={{ padding: '24px 32px', overflowY: 'auto' }}>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '24px' }}>NPA Management</div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
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
  );
};

export default NpaManagementTab;

