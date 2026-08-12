import React, { useState, useEffect } from 'react';
import DataTable from 'react-data-table-component';

const InlineDataGrid = ({ title, endpoint, columns }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:8000/api/${endpoint}`)
      .then(res => res.json())
      .then(d => {
        setData(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [endpoint]);

  const customStyles = {
    headRow: {
      style: {
        backgroundColor: '#F8FAFC',
        color: '#475569',
        fontWeight: '600',
        fontSize: '13px',
      },
    },
    cells: {
      style: {
        fontSize: '13px',
        color: '#334155',
      },
    },
  };

  return (
    <div className="card" style={{ padding: '24px', backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
      <div style={{ fontSize: '14px', fontWeight: '600', color: '#0B1F3A', marginBottom: '20px' }}>{title}</div>
      <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
        <DataTable
          columns={columns}
          data={data}
          progressPending={loading}
          pagination
          paginationPerPage={5}
          paginationRowsPerPageOptions={[5, 10, 20]}
          customStyles={customStyles}
          noDataComponent={<div style={{ padding: '24px', color: '#6B7280' }}>No records found</div>}
        />
      </div>
    </div>
  );
};

export default InlineDataGrid;
