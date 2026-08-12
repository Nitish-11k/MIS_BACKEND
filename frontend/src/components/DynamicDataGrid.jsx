import React, { useState, useEffect } from 'react';
import DataTable from 'react-data-table-component';
import { Search, Download, Loader2 } from 'lucide-react';

// Debounce hook for search
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => { clearTimeout(handler); };
  }, [value, delay]);
  return debouncedValue;
}

const DynamicDataGrid = ({ tableName, title, branchCode = 'ALL' }) => {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(50);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchData = async (currentPage, currentPerPage, currentSearch) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/data/${tableName}?branch_code=${branchCode}&page=${currentPage}&limit=${currentPerPage}&search=${encodeURIComponent(currentSearch)}`);
      const result = await res.json();
      
      setData(result.data || []);
      setTotalRows(result.total_records || 0);
      
      // Build columns dynamically
      if (result.columns && result.columns.length > 0) {
        const generatedCols = result.columns.map(col => ({
          name: col.replace(/_/g, ' '),
          selector: row => row[col],
          sortable: true,
          wrap: true,
          minWidth: '150px'
        }));
        setColumns(generatedCols);
      }
    } catch (error) {
      console.error("Error fetching dynamic data for", tableName, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page, perPage, debouncedSearchTerm);
  }, [tableName, branchCode, page, perPage, debouncedSearchTerm]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handlePerRowsChange = async (newPerPage, newPage) => {
    setPerPage(newPerPage);
    setPage(newPage);
  };

  const exportCSV = () => {
    if (!data || data.length === 0) return;
    
    // Simple CSV Export for current page
    const keys = columns.map(c => c.selector(data[0]) ? Object.keys(data[0]).find(k => data[0][k] === c.selector(data[0])) : c.name.replace(/ /g, '_'));
    const realKeys = Object.keys(data[0]);
    
    const csvRows = [realKeys.join(',')];
    data.forEach(row => {
      csvRows.push(realKeys.map(k => `"${(row[k] !== null && row[k] !== undefined ? row[k] : '').toString().replace(/"/g, '""')}"`).join(','));
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tableName}_export.csv`;
    a.click();
  };

  const customStyles = {
    headRow: { style: { backgroundColor: '#0B1F3A', color: '#FFFFFF', fontWeight: '600', fontSize: '13px' } },
    cells: { style: { fontSize: '13px', color: '#0F172A' } },
    rows: {
      style: {
        '&:nth-of-type(even)': { backgroundColor: '#F8FAFC' },
      },
    }
  };

  return (
    <div className="card" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827' }}>
          {title || tableName.replace(/_/g, ' ')}
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '9px', color: '#6B7280' }} />
            <input 
              type="text"
              placeholder="Search in table..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              style={{ padding: '8px 12px 8px 36px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '14px', width: '250px', outline: 'none' }}
            />
          </div>
          
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#F9FAFB', border: '1px solid #D1D5DB', borderRadius: '6px', color: '#374151', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>
      
      <div style={{ flex: 1, position: 'relative' }}>
        {loading && data.length === 0 ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <Loader2 size={32} className="animate-spin" color="#F97316" />
          </div>
        ) : null}
        
        <DataTable
          columns={columns}
          data={data}
          progressPending={loading}
          pagination
          paginationServer
          paginationTotalRows={totalRows}
          onChangeRowsPerPage={handlePerRowsChange}
          onChangePage={handlePageChange}
          paginationPerPage={perPage}
          paginationRowsPerPageOptions={[10, 25, 50, 100]}
          customStyles={customStyles}
          responsive
          highlightOnHover
        />
      </div>
    </div>
  );
};

export default DynamicDataGrid;
