import React, { useEffect, useMemo, useState } from 'react';
import DataTable from 'react-data-table-component';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';

const API_BASE = 'http://localhost:8000';

const COLORS = [
  '#F97316',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EF4444',
  '#14B8A6',
  '#EAB308',
  '#6366F1',
];

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;

  const cleaned = String(value)
    .replace(/,/g, '')
    .replace(/[₹$]/g, '')
    .trim();

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : 0;
};

const formatINR = (value) => {
  const number = toNumber(value);

  return `₹ ${new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(number)}`;
};

const formatLakhs = (value) => {
  return `₹ ${new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(toNumber(value) / 100000)} L`;
};

const formatCompact = (value) => {
  const number = toNumber(value);

  if (Math.abs(number) >= 10000000) {
    return `₹ ${(number / 10000000).toFixed(2)} Cr`;
  }

  if (Math.abs(number) >= 100000) {
    return `₹ ${(number / 100000).toFixed(2)} L`;
  }

  if (Math.abs(number) >= 1000) {
    return `₹ ${(number / 1000).toFixed(2)} K`;
  }

  return formatINR(number);
};

const StatCard = ({ title, value, subtitle }) => {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '18px',
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: '12px',
          color: '#64748B',
          marginBottom: '8px',
          fontWeight: '600',
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#0F172A',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        title={String(value)}
      >
        {value}
      </div>

      {subtitle && (
        <div
          style={{
            marginTop: '6px',
            fontSize: '11px',
            color: '#94A3B8',
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};

const ChartCard = ({ title, subtitle, children }) => {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '18px',
        minHeight: '330px',
      }}
    >
      <div style={{ marginBottom: '14px' }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: '700',
            color: '#0F172A',
          }}
        >
          {title}
        </div>

        {subtitle && (
          <div
            style={{
              marginTop: '4px',
              fontSize: '11px',
              color: '#64748B',
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      <div style={{ height: '260px' }}>
        {children}
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #E2E8F0',
        borderRadius: '8px',
        padding: '10px 12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      {label && (
        <div
          style={{
            fontSize: '12px',
            fontWeight: '700',
            color: '#0F172A',
            marginBottom: '6px',
          }}
        >
          {label}
        </div>
      )}

      {payload.map((item, index) => (
        <div
          key={index}
          style={{
            fontSize: '11px',
            color: '#475569',
            marginTop: '3px',
          }}
        >
          {item.name}: {formatINR(item.value)}
        </div>
      ))}
    </div>
  );
};

const SmartModal = ({ type, branchCode, period, onClose }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const config = useMemo(() => {
    switch (type) {
      case 'deposits':
        return {
          endpoint: '/api/deposit-branch-wise',
          title: 'Deposit Analysis',
          amountKey: 'value',
          amountLabel: 'Deposit Balance',
        };

      case 'loans':
        return {
          endpoint: '/api/loan-branch-wise',
          title: 'Loan Analysis',
          amountKey: 'value',
          amountLabel: 'Loan Balance',
        };

      case 'npa':
        return {
          endpoint: '/api/npa-branch-wise',
          title: 'NPA Analysis',
          amountKey: 'value',
          amountLabel: 'NPA Balance',
        };

      case 'opened':
        return {
          endpoint: '/api/opened-branch-wise',
          title: 'Accounts Opened Analysis',
          amountKey: 'value',
          amountLabel: 'Opened Accounts',
          isCount: true,
        };

      case 'closed':
        return {
          endpoint: '/api/closed-branch-wise',
          title: 'Accounts Closed Analysis',
          amountKey: 'value',
          amountLabel: 'Closed Accounts',
          isCount: true,
        };

      case 'total':
        return {
          endpoint: '/api/total-branch-wise',
          title: 'Total Accounts Analysis',
          amountKey: 'value',
          amountLabel: 'Total Accounts',
          isCount: true,
        };

      default:
        return null;
    }
  }, [type]);

  useEffect(() => {
    if (!config) return;

    const controller = new AbortController();

    const loadData = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams({
          branch_code: branchCode || 'ALL',
          period: period || 'ALL',
        });

        const response = await fetch(
          `${API_BASE}${config.endpoint}?${params.toString()}`,
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`API failed: ${response.status}`);
        }

        const result = await response.json();

        setData(Array.isArray(result) ? result : []);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('SmartModal API error:', error);
          setData([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => controller.abort();
  }, [config, branchCode, period]);

  const normalizedData = useMemo(() => {
    return data
      .map((row, index) => {
        const name =
          row.name ||
          row.branch_name ||
          row.BRANCH_NAME ||
          `Branch ${index + 1}`;

        const rawValue =
          row.value ??
          row.deposits ??
          row.Deposits ??
          row.loans ??
          row.Loans ??
          row.NPA ??
          row.npa ??
          row.opened ??
          row.closed ??
          0;

        return {
          ...row,
          id: index,
          name,
          numericValue: toNumber(rawValue),
        };
      })
      .filter((row) => {
        if (!search.trim()) return true;

        return row.name
          .toLowerCase()
          .includes(search.trim().toLowerCase());
      });
  }, [data, search]);

  const totalValue = useMemo(() => {
    return normalizedData.reduce(
      (sum, row) => sum + row.numericValue,
      0
    );
  }, [normalizedData]);

  const sortedData = useMemo(() => {
    return [...normalizedData].sort(
      (a, b) => b.numericValue - a.numericValue
    );
  }, [normalizedData]);

  const topData = sortedData.slice(0, 8);

  const pieData = sortedData
    .filter((row) => row.numericValue > 0)
    .slice(0, 6)
    .map((row) => ({
      name: row.name,
      value: row.numericValue,
    }));

  const tableColumns = [
    {
      name: 'Branch',
      selector: (row) => row.name,
      sortable: true,
      grow: 2,
      wrap: true,
    },
    {
      name: config?.isCount ? config.amountLabel : `${config?.amountLabel} (₹)`,
      selector: (row) => row.numericValue,
      sortable: true,
      right: true,
      grow: 1,
      cell: (row) =>
        config?.isCount
          ? row.numericValue.toLocaleString('en-IN')
          : formatINR(row.numericValue),
    },
    ...(type === 'opened' || type === 'closed' || type === 'total'
      ? [
          {
            name: 'Deposit Accounts',
            selector: (row) => row.deposit_accounts || 0,
            sortable: true,
            right: true,
            cell: (row) => (row.deposit_accounts || 0).toLocaleString('en-IN'),
          },
          {
            name: 'Loan Accounts',
            selector: (row) => row.loan_accounts || 0,
            sortable: true,
            right: true,
            cell: (row) => (row.loan_accounts || 0).toLocaleString('en-IN'),
          },
        ]
      : []),
    {
      name: 'Share',
      selector: (row) => row.numericValue,
      sortable: true,
      right: true,
      cell: (row) => {
        if (!totalValue) return '0%';

        return `${((row.numericValue / totalValue) * 100).toFixed(2)}%`;
      },
    },
  ];

  if (!config) return null;

  return (
    <div
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.62)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: 'min(1400px, 96vw)',
          height: 'min(900px, 94vh)',
          background: '#F8FAFC',
          borderRadius: '16px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.20)',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: '#fff',
            borderBottom: '1px solid #E5E7EB',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#0F172A',
              }}
            >
              {config.title}
            </div>

            <div
              style={{
                marginTop: '4px',
                fontSize: '12px',
                color: '#64748B',
              }}
            >
              Branch: {branchCode === 'ALL' ? 'All Branches' : branchCode}
              {' • '}
              Period: {period || 'ALL'}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: '#F1F5F9',
              color: '#334155',
              borderRadius: '8px',
              padding: '9px 14px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '20px',
          }}
        >
          {loading ? (
            <div
              style={{
                minHeight: '500px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                fontSize: '14px',
              }}
            >
              Loading real-time MIS data...
            </div>
          ) : (
            <>
              {/* KPI summary */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '14px',
                  marginBottom: '18px',
                }}
              >
                <StatCard
                  title={`Total ${config.amountLabel}`}
                  value={
                    config.isCount
                      ? totalValue.toLocaleString('en-IN')
                      : formatCompact(totalValue)
                  }
                  subtitle="Based on API result"
                />

                <StatCard
                  title="Branches"
                  value={normalizedData.length.toLocaleString('en-IN')}
                  subtitle="Branches returned for selected filter"
                />

                <StatCard
                  title="Highest"
                  value={
                    sortedData.length
                      ? config.isCount
                        ? sortedData[0].numericValue.toLocaleString('en-IN')
                        : formatCompact(sortedData[0].numericValue)
                      : '0'
                  }
                  subtitle={
                    sortedData.length
                      ? sortedData[0].name
                      : 'No data'
                  }
                />
              </div>

              {normalizedData.length === 0 ? (
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    minHeight: '400px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748B',
                  }}
                >
                  No data available for the selected branch and period.
                </div>
              ) : (
                <>
                  {/* Visuals */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.35fr 1fr',
                      gap: '18px',
                      marginBottom: '18px',
                    }}
                  >
                    <ChartCard
                      title={`Top ${Math.min(8, topData.length)} ${config.isCount ? 'Branches' : 'Balances'}`}
                      subtitle={
                        config.isCount
                          ? 'Branch-wise account count'
                          : 'Branch-wise balance'
                      }
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={topData}
                          layout="vertical"
                          margin={{
                            top: 5,
                            right: 20,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                          />

                          <XAxis
                            type="number"
                            tickFormatter={(value) =>
                              config.isCount
                                ? value.toLocaleString('en-IN')
                                : formatCompact(value)
                            }
                          />

                          <YAxis
                            type="category"
                            dataKey="name"
                            width={120}
                            tick={{ fontSize: 11 }}
                          />

                          <Tooltip content={<CustomTooltip />} />

                          <Bar
                            dataKey="numericValue"
                            name={config.amountLabel}
                            fill="#15559F"
                            radius={[0, 5, 5, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard
                      title="Distribution"
                      subtitle="Share of total"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={65}
                            outerRadius={100}
                            paddingAngle={2}
                          >
                            {pieData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ))}
                          </Pie>

                          <Tooltip
                            formatter={(value) =>
                              config.isCount
                                ? value.toLocaleString('en-IN')
                                : formatINR(value)
                            }
                          />

                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            wrapperStyle={{
                              fontSize: '10px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  </div>

                  {/* Search + Table */}
                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      padding: '16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '14px',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: '700',
                            color: '#0F172A',
                          }}
                        >
                          Detailed Data
                        </div>

                        <div
                          style={{
                            fontSize: '11px',
                            color: '#64748B',
                            marginTop: '3px',
                          }}
                        >
                          Sorted by highest value
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder="Search branch..."
                        value={search}
                        onChange={(event) =>
                          setSearch(event.target.value)
                        }
                        style={{
                          width: '260px',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          padding: '9px 12px',
                          outline: 'none',
                          fontSize: '13px',
                        }}
                      />
                    </div>

                    <DataTable
                      columns={tableColumns}
                      data={sortedData}
                      pagination
                      paginationPerPage={10}
                      paginationRowsPerPageOptions={[
                        10,
                        25,
                        50,
                        100,
                      ]}
                      responsive
                      highlightOnHover
                      striped
                      dense
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartModal;
