import React from 'react';
import DataTable from 'react-data-table-component';

const DataGridModal = ({ title, columns, data, onClose, loading }) => {
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
        fontSize: '14px',
        color: '#0F172A',
      },
    },
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '1200px', height: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#0F172A', fontWeight: '600' }}>
            {title}
          </h2>
          <button onClick={onClose} style={{ padding: '8px 16px', background: '#F1F5F9', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', color: '#475569' }}>Close</button>
        </div>
        
        <div style={{ flex: 1, minHeight: 0, border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
          <DataTable
            columns={columns}
            data={data}
            progressPending={loading}
            pagination
            responsive
            customStyles={customStyles}
            highlightOnHover
            pointerOnHover
          />
        </div>
      </div>
    </div>
  );
};

export default DataGridModal;
