import React, { useState, useEffect } from 'react';
import DataTable from 'react-data-table-component';
import { Loader2, Search, UserCheck, RefreshCw } from 'lucide-react';

const ActivityLogTab = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLogs = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    try {
      const response = await fetch('http://localhost:8000/api/activity-logs');
      const data = await response.json();
      setLogs(data || []);
    } catch (err) {
      console.error("Error fetching activity logs:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    // Auto-refresh every 15 seconds
    const intervalId = setInterval(() => {
      fetchLogs(true);
    }, 15000);
    
    return () => clearInterval(intervalId);
  }, []);

  const columns = [
    {
      name: 'Timestamp',
      selector: row => row.timestamp,
      sortable: true,
      format: row => row.timestamp ? new Date(row.timestamp).toLocaleString() : 'N/A',
      width: '180px'
    },
    {
      name: 'User / Branch',
      selector: row => row.branch_code,
      sortable: true,
      width: '180px',
      cell: row => (
        <div style={{ fontWeight: '600', color: '#1E293B' }}>
          {row.branch_code}
        </div>
      )
    },
    {
      name: 'Action',
      selector: row => row.action,
      sortable: true,
      width: '120px',
      cell: row => (
        <span style={{ 
          padding: '4px 8px', 
          borderRadius: '4px', 
          fontSize: '11px', 
          fontWeight: '600',
          background: row.action === 'LOGIN' ? '#ECFDF5' : '#EFF6FF',
          color: row.action === 'LOGIN' ? '#10B981' : '#3B82F6',
          border: `1px solid ${row.action === 'LOGIN' ? '#A7F3D0' : '#BFDBFE'}`
        }}>
          {row.action}
        </span>
      )
    },
    {
      name: 'Endpoint',
      selector: row => row.endpoint,
      sortable: true,
      width: '220px',
      cell: row => <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#475569' }}>{row.endpoint}</span>
    },
    {
      name: 'Details',
      selector: row => row.details,
      sortable: true,
      wrap: true
    }
  ];

  const filteredItems = logs.filter(
    item => 
      (item.branch_code && item.branch_code.toLowerCase().includes(filterText.toLowerCase())) ||
      (item.action && item.action.toLowerCase().includes(filterText.toLowerCase())) ||
      (item.details && item.details.toLowerCase().includes(filterText.toLowerCase()))
  );

  const customStyles = {
    headRow: {
      style: {
        backgroundColor: '#F8FAFC',
        color: '#475569',
        fontSize: '12px',
        fontWeight: '600',
        textTransform: 'uppercase',
        borderBottom: '1px solid #E2E8F0',
      }
    },
    cells: {
      style: {
        color: '#334155',
        fontSize: '13px',
      }
    }
  };

  return (
    <div style={{ padding: '24px 32px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={28} color="#3B82F6" />
            Activity Tracking
          </h1>
          <p style={{ margin: 0, color: '#64748B', fontSize: '14px' }}>
            Monitor logins and data access across all regional offices and branches.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => fetchLogs(true)}
            disabled={isRefreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '8px 12px', borderRadius: '6px', cursor: isRefreshing ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600', color: '#475569' }}
          >
            <RefreshCw size={16} className={isRefreshing ? "spin-animation" : ""} color="#64748B" />
            Refresh
          </button>
          
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
            type="text"
            placeholder="Search logs..."
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            style={{
              padding: '8px 12px 8px 36px',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
              outline: 'none',
              fontSize: '14px',
              width: '250px'
            }}
          />
          </div>
        </div>
      </div>

      <div style={{ background: '#FFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
        <DataTable
          columns={columns}
          data={filteredItems}
          pagination
          paginationPerPage={15}
          paginationRowsPerPageOptions={[15, 30, 50]}
          progressPending={loading}
          progressComponent={<div style={{ padding: '40px' }}><Loader2 size={32} className="spin-animation" color="#3B82F6" /></div>}
          customStyles={customStyles}
          noDataComponent={<div style={{ padding: '40px', color: '#64748B' }}>No activity logs found.</div>}
        />
      </div>
    </div>
  );
};

export default ActivityLogTab;
