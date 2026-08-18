import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area, LineChart, Line, ComposedChart
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: '#fff', padding: '10px 14px', border: '1px solid #E2E8F0', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: '12px' }}>
        <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#1C2B4F' }}>{label || payload[0].name}</p>
        {payload.map((p, i) => {
          const name = String(p.name || p.dataKey || '').toLowerCase();
          const isCount = name.includes('count') || name.includes('accounts') || name.includes('txns') || name.includes('loans') || name.includes('deposits');
          const prefix = isCount ? '' : '₹ ';
          const formattedValue = typeof p.value === 'number' ? prefix + new Intl.NumberFormat('en-IN').format(p.value) : p.value;
          return (
            <p key={i} style={{ margin: 0, color: p.color || '#5A6A85' }}>
              {p.name || p.dataKey}: {formattedValue}
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

// ============ 1. Deposits by Account Type - Horizontal Bar ============
export const DepositsByTypeChart = ({ selectedBranch = 'ALL' }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/api/deposits-by-type?branch_code=${selectedBranch}`)
      .then(res => res.json())
      .then(resData => { setData(Array.isArray(resData) ? resData : []); setLoading(false); })
      .catch(() => { setData([]); setLoading(false); });
  }, [selectedBranch]);

  return (
    <div className="card">
      <div className="chart-header">Deposits by Account Type (DEPD0586)</div>
      <div style={{ height: 300 }}>
        {loading ? <p>Loading...</p> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#5A6A85' }} />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#1C2B4F' }} width={150} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
              <Bar dataKey="value" fill="#46C9D7" radius={[0, 4, 4, 0]} name="No. of Accounts" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

// ============ 2. GL Distribution Pie/Donut ============
export const GLDistributionChart = ({ selectedBranch = 'ALL' }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/api/gl-summary?branch_code=${selectedBranch}`)
      .then(res => res.json())
      .then(resData => { setData(Array.isArray(resData) ? resData : []); setLoading(false); })
      .catch(() => { setData([]); setLoading(false); });
  }, [selectedBranch]);

  const COLORS = ['#FF6B6B', '#FF8E8E', '#FFAFAF', '#FFD1D1', '#FFE6E6', '#FFF0F0'];

  return (
    <div className="card">
      <div className="chart-header">GL Distribution (Top Ledgers)</div>
      <div style={{ display: 'flex', height: 300, alignItems: 'center' }}>
        {loading ? <p>Loading...</p> : (
          <>
            <div style={{ width: '55%', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} innerRadius={65} outerRadius={105} paddingAngle={2} dataKey="value" stroke="none" cx="50%" cy="50%">
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ width: '45%', paddingLeft: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {data.map((item, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', fontSize: '11px' }}>
                  <div style={{ minWidth: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLORS[index % COLORS.length], marginRight: '8px' }}></div>
                  <span style={{ color: '#1C2B4F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.name}>{item.name}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ============ 3. Product-wise Credit vs Debit - Grouped Bar (GNBD7376) ============
export const ProductwiseChart = ({ selectedBranch = 'ALL' }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/api/productwise-summary?branch_code=${selectedBranch}`)
      .then(res => res.json())
      .then(resData => { setData(Array.isArray(resData) ? resData : []); setLoading(false); })
      .catch(() => { setData([]); setLoading(false); });
  }, [selectedBranch]);

  return (
    <div className="card">
      <div className="chart-header">Product-wise Credit vs Debit (GNBD7376)</div>
      <div style={{ height: 300 }}>
        {loading ? <p>Loading...</p> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#5A6A85', angle: -30, textAnchor: 'end' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#5A6A85' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="credit" fill="#20C48F" name="Credit" radius={[4, 4, 0, 0]} barSize={16} />
              <Bar dataKey="debit" fill="#FF6B6B" name="Debit" radius={[4, 4, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

// ============ 4. GLCC Wise Summary - Bar Chart ============
export const GLCCSummaryChart = ({ selectedBranch = 'ALL' }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/api/glcc-summary?branch_code=${selectedBranch}`)
      .then(res => res.json())
      .then(resData => { setData(Array.isArray(resData) ? resData : []); setLoading(false); })
      .catch(() => { setData([]); setLoading(false); });
  }, [selectedBranch]);

  return (
    <div className="card">
      <div className="chart-header">GL Class Code Summary (Accounts & Amount)</div>
      <div style={{ height: 300 }}>
        {loading ? <p>Loading...</p> : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 50 }}>
              <defs>
                <linearGradient id="colorAccounts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#15559F" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#15559F" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#5A6A85', angle: -45, textAnchor: 'end' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#5A6A85' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="accounts" stroke="#15559F" fillOpacity={1} fill="url(#colorAccounts)" name="No. of Accounts" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

// ============ 5. GL Daybook Transactions by Type ============
export const GLDaybookChart = ({ selectedBranch = 'ALL' }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/api/gl-daybook-summary?branch_code=${selectedBranch}`)
      .then(res => res.json())
      .then(resData => { setData(Array.isArray(resData) ? resData : []); setLoading(false); })
      .catch(() => { setData([]); setLoading(false); });
  }, [selectedBranch]);

  return (
    <div className="card">
      <div className="chart-header">GL Day Book Transactions (GEND0807)</div>
      <div style={{ height: 300 }}>
        {loading ? <p>Loading...</p> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#5A6A85' }} />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#1C2B4F' }} width={140} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#814C9E" name="Txn Count" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

// ============ 6. Least Transactions - Bar Chart (Fix for Line Graph Issue) ============
export const LeastTransactionsChart = ({ selectedBranch = 'ALL' }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/api/least-transactions?branch_code=${selectedBranch}`)
      .then(res => res.json())
      .then(resData => { setData(Array.isArray(resData) ? resData : []); setLoading(false); })
      .catch(() => { setData([]); setLoading(false); });
  }, [selectedBranch]);

  return (
    <div className="card">
      <div className="chart-header">Least Transaction Volume by ID (LOND2482)</div>
      <div style={{ height: 300 }}>
        {loading ? <p>Loading...</p> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="id" tick={{ fontSize: 11, fill: '#5A6A85' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#5A6A85' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="debit" name="Debit Txns" fill="#FF6B6B" radius={[4, 4, 0, 0]} barSize={15} />
              <Bar dataKey="credit" name="Credit Txns" fill="#20C48F" radius={[4, 4, 0, 0]} barSize={15} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

// ============ 7. Branch Comparison - Composed Chart ============
export const BranchComparisonChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/api/branch-comparison`)
      .then(res => res.json())
      .then(resData => { setData(Array.isArray(resData) ? resData : []); setLoading(false); })
      .catch(() => { setData([]); setLoading(false); });
  }, []);

  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      <div className="chart-header">Top Branches Comparison (Bank-wide)</div>
      <div style={{ height: 350 }}>
        {loading ? <p>Loading...</p> : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#5A6A85', angle: -25, textAnchor: 'end' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#5A6A85' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} verticalAlign="top" height={36}/>
              <Bar dataKey="deposits" name="Total Deposits (Accounts)" fill="#15559F" radius={[4, 4, 0, 0]} barSize={30} />
              <Line type="monotone" dataKey="loans" name="Active Loans" stroke="#FFB74D" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

