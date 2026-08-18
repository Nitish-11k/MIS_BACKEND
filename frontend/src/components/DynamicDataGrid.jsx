import React, { useEffect, useMemo, useState } from 'react';
import DataTable from 'react-data-table-component';
import {
  Search,
  Download,
  Loader2,
  ArrowUp,
  ArrowDown,
  List,
} from 'lucide-react';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

const DynamicDataGrid = ({
  tableName,
  title,
  branchCode = 'ALL',
  period = 'ALL',
}) => {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);

  const [perPage, setPerPage] = useState(50);
  const [page, setPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState('');

  /*
   * normal = normal paginated data
   * top = highest 5
   * least = lowest 5
   */
  const [viewMode, setViewMode] = useState('normal');

  /*
   * Which numeric column should be used for Top/Least.
   */
  const [rankColumn, setRankColumn] = useState('');

  const debouncedSearchTerm = useDebounce(searchTerm, 400);

  /*
   * Try to detect a useful amount/balance column.
   */
  const detectedRankColumn = useMemo(() => {
    if (!columns || columns.length === 0) {
      return '';
    }

    const names = columns.map((column) => column.key);

    const priority = [
      'CURRENT_BALANCE',
      'BAL_OUTSTAND',
      'TOTAL_OUTSTANDING',
      'OUTSTANDING',
      'TOTAL_AMOUNT',
      'AMOUNT',
      'BALANCE',
      'DR_BALANCE',
      'CR_BALANCE',
      'VALUE',
      'NPA',
    ];

    for (const preferred of priority) {
      const exact = names.find(
        (name) => name.toUpperCase() === preferred
      );

      if (exact) {
        return exact;
      }
    }

    const fuzzy = names.find((name) => {
      const upper = name.toUpperCase();

      return (
        upper.includes('BALANCE') ||
        upper.includes('AMOUNT') ||
        upper.includes('OUTSTAND') ||
        upper.includes('NPA') ||
        upper.includes('VALUE')
      );
    });

    return fuzzy || names[0] || '';
  }, [columns]);

  useEffect(() => {
    if (!rankColumn && detectedRankColumn) {
      setRankColumn(detectedRankColumn);
    }
  }, [detectedRankColumn, rankColumn]);

  const fetchData = async (
    currentPage,
    currentPerPage,
    currentSearch,
    currentViewMode,
    currentRankColumn
  ) => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        branch_code: branchCode,
        page: String(currentPage),
        limit: String(
          currentViewMode === 'normal'
            ? currentPerPage
            : 5
        ),
        search: currentSearch || '',
      });

      if (
        currentViewMode !== 'normal' &&
        currentRankColumn
      ) {
        params.set('sort_by', currentRankColumn);
        params.set(
          'sort_order',
          currentViewMode === 'top'
            ? 'DESC'
            : 'ASC'
        );
      }

      const response = await fetch(
        `http://127.0.0.1:8000/api/data/${tableName}?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(
          `API returned ${response.status}`
        );
      }

      const result = await response.json();

      setData(Array.isArray(result.data) ? result.data : []);

      setTotalRows(
        currentViewMode === 'normal'
          ? Number(result.total_records || 0)
          : Math.min(
              5,
              Number(result.total_records || 0)
            )
      );

      if (
        Array.isArray(result.columns) &&
        result.columns.length > 0
      ) {
        const generatedColumns =
          result.columns.map((column) => ({
            key: column,
            name: column.replace(/_/g, ' '),
            selector: (row) => row[column],
            sortable: true,
            wrap: true,
            minWidth: '150px',
          }));

        setColumns(generatedColumns);
      }
    } catch (error) {
      console.error(
        'Error fetching dynamic data:',
        error
      );

      setData([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    /*
     * Top/Least mode does not need normal pagination.
     */
    const effectivePage =
      viewMode === 'normal' ? page : 1;

    fetchData(
      effectivePage,
      perPage,
      debouncedSearchTerm,
      viewMode,
      rankColumn
    );
  }, [
    tableName,
    branchCode,
    period,
    page,
    perPage,
    debouncedSearchTerm,
    viewMode,
    rankColumn,
  ]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handlePerRowsChange = (
    newPerPage,
    newPage
  ) => {
    setPerPage(newPerPage);
    setPage(newPage);
  };

  const changeViewMode = (mode) => {
    setViewMode(mode);
    setPage(1);
  };

  const exportCSV = () => {
    if (!data || data.length === 0) {
      return;
    }

    const realKeys = columns.map(
      (column) => column.key
    );

    const csvRows = [
      realKeys.join(','),
    ];

    data.forEach((row) => {
      csvRows.push(
        realKeys
          .map((key) => {
            const value =
              row[key] === null ||
              row[key] === undefined
                ? ''
                : String(row[key]);

            return `"${value.replace(/"/g, '""')}"`;
          })
          .join(',')
      );
    });

    const blob = new Blob(
      [csvRows.join('\n')],
      {
        type: 'text/csv;charset=utf-8;',
      }
    );

    const url =
      window.URL.createObjectURL(blob);

    const anchor =
      document.createElement('a');

    anchor.href = url;
    anchor.download =
      `${tableName}_${viewMode}_export.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.URL.revokeObjectURL(url);
  };

  const customStyles = {
    headRow: {
      style: {
        backgroundColor: '#0B1F3A',
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: '13px',
        minHeight: '46px',
      },
    },

    headCells: {
      style: {
        color: '#FFFFFF',
        fontWeight: '600',
      },
    },

    cells: {
      style: {
        fontSize: '13px',
        color: '#0F172A',
      },
    },

    rows: {
      style: {
        minHeight: '42px',

        '&:nth-of-type(even)': {
          backgroundColor: '#F8FAFC',
        },
      },
    },
  };

  return (
    <div
      className="card"
      style={{
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}
      <div
        style={{
          padding: '18px 24px',
          borderBottom:
            '1px solid #E5E7EB',
        }}
      >
        {/* Title + Search + Export */}
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#111827',
              }}
            >
              {title ||
                tableName.replace(
                  /_/g,
                  ' '
                )}
            </div>

            <div
              style={{
                fontSize: '11px',
                color: '#64748B',
                marginTop: '4px',
              }}
            >
              {viewMode === 'normal' &&
                'All records'}

              {viewMode === 'top' &&
                `Top 5 by ${
                  rankColumn
                    ? rankColumn.replace(
                        /_/g,
                        ' '
                      )
                    : 'selected metric'
                }`}

              {viewMode === 'least' &&
                `Least 5 by ${
                  rankColumn
                    ? rankColumn.replace(
                        /_/g,
                        ' '
                      )
                    : 'selected metric'
                }`}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {/* Search */}
            <div
              style={{
                position: 'relative',
              }}
            >
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '10px',
                  color: '#6B7280',
                }}
              />

              <input
                type="text"
                placeholder="Search in table..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(
                    event.target.value
                  );
                  setPage(1);
                }}
                style={{
                  padding:
                    '8px 12px 8px 36px',
                  borderRadius: '7px',
                  border:
                    '1px solid #D1D5DB',
                  fontSize: '13px',
                  width: '230px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Export */}
            <button
              type="button"
              onClick={exportCSV}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 13px',
                background: '#F9FAFB',
                border:
                  '1px solid #D1D5DB',
                borderRadius: '7px',
                color: '#374151',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              <Download size={15} />
              Export
            </button>
          </div>
        </div>

        {/* =================================================
            TOP / LEAST CONTROLS
        ================================================= */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginTop: '16px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              color: '#64748B',
              fontWeight: '600',
            }}
          >
            View:
          </span>

          <button
            type="button"
            onClick={() =>
              changeViewMode('normal')
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: '16px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              background:
                viewMode === 'normal'
                  ? '#0B1F3A'
                  : '#F1F5F9',
              color:
                viewMode === 'normal'
                  ? '#fff'
                  : '#64748B',
            }}
          >
            <List size={13} />
            All
          </button>

          <button
            type="button"
            onClick={() =>
              changeViewMode('top')
            }
            disabled={!rankColumn}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: '16px',
              border: 'none',
              cursor: rankColumn
                ? 'pointer'
                : 'not-allowed',
              fontSize: '12px',
              fontWeight: '600',
              background:
                viewMode === 'top'
                  ? '#10B981'
                  : '#F1F5F9',
              color:
                viewMode === 'top'
                  ? '#fff'
                  : '#64748B',
              opacity: rankColumn
                ? 1
                : 0.5,
            }}
          >
            <ArrowUp size={13} />
            Top 5
          </button>

          <button
            type="button"
            onClick={() =>
              changeViewMode('least')
            }
            disabled={!rankColumn}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              borderRadius: '16px',
              border: 'none',
              cursor: rankColumn
                ? 'pointer'
                : 'not-allowed',
              fontSize: '12px',
              fontWeight: '600',
              background:
                viewMode === 'least'
                  ? '#F97316'
                  : '#F1F5F9',
              color:
                viewMode === 'least'
                  ? '#fff'
                  : '#64748B',
              opacity: rankColumn
                ? 1
                : 0.5,
            }}
          >
            <ArrowDown size={13} />
            Least 5
          </button>

          {/* Ranking column */}
          {columns.length > 0 && (
            <>
              <span
                style={{
                  marginLeft: '8px',
                  fontSize: '12px',
                  color: '#64748B',
                  fontWeight: '600',
                }}
              >
                Rank by:
              </span>

              <select
                value={rankColumn}
                onChange={(event) => {
                  setRankColumn(
                    event.target.value
                  );
                  setPage(1);
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: '7px',
                  border:
                    '1px solid #CBD5E1',
                  fontSize: '12px',
                  color: '#334155',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                {columns.map((column) => (
                  <option
                    key={column.key}
                    value={column.key}
                  >
                    {column.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* =====================================================
          TABLE
      ===================================================== */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          minHeight: 0,
        }}
      >
        {loading &&
          data.length === 0 && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'center',
                zIndex: 10,
                background:
                  'rgba(255,255,255,0.75)',
              }}
            >
              <Loader2
                size={32}
                className="animate-spin"
                color="#F97316"
              />
            </div>
          )}

        <DataTable
          columns={columns}
          data={data}
          progressPending={loading}
          pagination
          paginationServer={
            viewMode === 'normal'
          }
          paginationTotalRows={
            totalRows
          }
          onChangeRowsPerPage={
            handlePerRowsChange
          }
          onChangePage={
            handlePageChange
          }
          paginationPerPage={
            viewMode === 'normal'
              ? perPage
              : 5
          }
          paginationRowsPerPageOptions={[
            10,
            25,
            50,
            100,
          ]}
          customStyles={customStyles}
          responsive
          highlightOnHover
          fixedHeader
          fixedHeaderScrollHeight="100%"
          noDataComponent={
            <div
              style={{
                padding: '40px',
                color: '#64748B',
              }}
            >
              No records found
            </div>
          }
        />
      </div>
    </div>
  );
};

export default DynamicDataGrid;
