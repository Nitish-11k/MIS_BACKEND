import React, { useState, useEffect } from 'react';
import DataGridModal from './DataGridModal';

const SmartModal = ({ type, branchCode, period, onClose }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  let endpoint = '';
  let title = '';
  let columns = [];

  switch (type) {
    case 'deposits':
      endpoint = '/api/deposit-branch-wise';
      title = 'Total Deposits by Branch';
      columns = [
        { name: 'Branch', selector: row => row.name, sortable: true },
        { name: 'Deposits (₹ Lakhs)', selector: row => (row.Deposits / 100000).toFixed(2), sortable: true, right: true }
      ];
      break;
    case 'loans':
      endpoint = '/api/loan-branch-wise';
      title = 'Total Loans by Branch';
      columns = [
        { name: 'Branch', selector: row => row.name, sortable: true },
        { name: 'Loans (₹ Lakhs)', selector: row => (row.Loans / 100000).toFixed(2), sortable: true, right: true }
      ];
      break;
    case 'npa':
      endpoint = '/api/npa-branch-wise';
      title = 'NPA Details by Branch';
      columns = [
        { name: 'Branch', selector: row => row.name, sortable: true },
        { name: 'NPA (₹ Lakhs)', selector: row => (row.NPA / 100000).toFixed(2), sortable: true, right: true },
        { name: 'Covered (₹ Lakhs)', selector: row => (row.Covered / 100000).toFixed(2), sortable: true, right: true }
      ];
      break;
    case 'opened':
      endpoint = '/api/opened-branch-wise';
      title = 'Accounts Opened by Branch';
      columns = [
        { name: 'Branch', selector: row => row.name, sortable: true },
        { name: 'Opened Accounts', selector: row => row.opened, sortable: true, right: true }
      ];
      break;
    case 'closed':
      endpoint = '/api/closed-branch-wise';
      title = 'Accounts Closed by Branch';
      columns = [
        { name: 'Branch', selector: row => row.name, sortable: true },
        { name: 'Closed Accounts', selector: row => row.closed, sortable: true, right: true }
      ];
      break;
    default:
      break;
  }

  useEffect(() => {
    if (!endpoint) return;
    setLoading(true);
    fetch(`http://localhost:8000${endpoint}?branch_code=${branchCode}&period=${period}`)
      .then(res => res.json())
      .then(resData => {
        setData(Array.isArray(resData) ? resData : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [type, branchCode, period, endpoint]);

  if (!endpoint) return null;

  return (
    <DataGridModal 
      title={title}
      columns={columns}
      data={data}
      loading={loading}
      onClose={onClose}
    />
  );
};

export default SmartModal;
