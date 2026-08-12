import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { Loader2 } from 'lucide-react';
import DynamicDataGrid from './DynamicDataGrid'; // Existing generic datagrid

const COLORS = ['#F97316', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#14B8A6', '#F59E0B', '#34D399', '#6366F1'];

const formatAmount = (num) => {
  if (!num) return '0';
  if (Math.abs(num) >= 10000000) return `${(num / 10000000).toFixed(1)} Cr`;
  if (Math.abs(num) >= 100000) return `${(num / 100000).toFixed(1)} L`;
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)} K`;
  return `${num.toFixed(0)}`;
};

const DynamicVisualizer = ({ tableName, title }) => {
  const [data, setData] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Drill-down State
  const [drillDownBranch, setDrillDownBranch] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:8000/api/visualize/${tableName}`)
      .then(res => res.json())
      .then(result => {
        if (result && result.length > 0) {
          // Identify all numeric metric keys from the first row (excluding BRANCH_CODE)
          const metricKeys = Object.keys(result[0]).filter(k => k !== 'BRANCH_CODE');
          setMetrics(metricKeys);
          
          // Map data to display format
          const formattedData = result.map(row => {
            const newRow = { name: `Branch ${row.BRANCH_CODE}` };
            metricKeys.forEach(k => {
              newRow[k] = row[k];
            });
            return newRow;
          });
          
          setData(formattedData);
        } else {
          setData([]);
          setMetrics([]);
        }
      })
      .catch(err => console.error("Error fetching visualization data:", err))
      .finally(() => setLoading(false));
  }, [tableName]);

  const handleBarClick = (dataKey, index) => {
    // When a bar is clicked, extract the branch code and open the modal
    if (data && data[index]) {
      const branchStr = data[index].name;
      const code = branchStr.replace('Branch ', '');
      setDrillDownBranch(code);
    }
  };

  return (
    <>
      <div className="card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '500px' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827' }}>
            {title || tableName.replace(/_/g, ' ')} Visual Analytics
          </div>
          <div style={{ fontSize: '13px', color: '#6B7280' }}>
            Click on any bar to view raw numbers
          </div>
        </div>
        
        <div style={{ flex: 1, position: 'relative', padding: '24px' }}>
          {loading ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
              <Loader2 size={32} className="animate-spin" color="#F97316" />
            </div>
          ) : data.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
              No numeric metrics found to visualize for this table.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatAmount} tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(value, name) => [formatAmount(value), name.replace(/_/g, ' ')]}
                  cursor={{ fill: '#F9FAFB' }} 
                />
                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                
                {metrics.map((metric, idx) => (
                  <Bar 
                    key={metric} 
                    dataKey={metric} 
                    fill={COLORS[idx % COLORS.length]} 
                    radius={[4, 4, 0, 0]}
                    onClick={(entry, index) => handleBarClick(metric, index)}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Drill-down Modal */}
      {drillDownBranch && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <div style={{ width: '100%', maxWidth: '1400px', height: '90vh', background: '#fff', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
            <button 
              onClick={() => setDrillDownBranch(null)} 
              style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10, background: '#F1F5F9', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', color: '#475569' }}
            >
              Close Drill-down
            </button>
            <DynamicDataGrid 
              tableName={tableName} 
              title={`${title} - Raw Data (Branch ${drillDownBranch})`}
              branchCode={drillDownBranch} 
            />
          </div>
        </div>
      )}
    </>
  );
};

export default DynamicVisualizer;
