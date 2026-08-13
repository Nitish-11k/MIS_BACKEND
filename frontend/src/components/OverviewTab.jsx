import React, { useMemo, useState } from 'react';
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
  LabelList
} from 'recharts';
import KPICard from './KPICard';

const COLORS = [
  '#F97316',
  '#10B981',
  '#3B82F6',
  '#EF4444',
  '#8B5CF6',
  '#14B8A6',
];

const OverviewTab = ({
  kpiData,
  accountMetrics,
  branchNpaData,
  barChartData,
  pieData,
  setActiveModal,
}) => {
  const [npaView, setNpaView] = useState('top');

  /*
   * Always sort from the actual NPA value.
   * We do NOT trust the order coming from backend.
   */
  const sortedNpaData = useMemo(() => {
    if (!Array.isArray(branchNpaData)) {
      return [];
    }

    return [...branchNpaData]
      .map((item) => ({
        ...item,
        NPA: Number(item.NPA) || 0,
        Covered: Number(item.Covered) || 0,
      }))
      .sort((a, b) => {
        if (npaView === 'top') {
          return b.NPA - a.NPA;
        }

        return a.NPA - b.NPA;
      });
  }, [branchNpaData, npaView]);

  /*
   * Exactly 5 records.
   */
  const displayNpaData = sortedNpaData.slice(0, 5);

  const totalNpa = displayNpaData.reduce(
    (sum, item) => sum + item.NPA,
    0
  );

  return (
    <div
      className="dashboard-content"
      style={{
        padding: '24px 32px',
        overflowY: 'auto',
      }}
    >
      {/* =======================================================
          KPI ROW
      ======================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: '20px',
          marginBottom: '24px',
        }}
      >
        <KPICard
          title="Total Deposits"
          value={kpiData.total_deposits}
          changePercent="8.3"
          changeType="positive"
          onClick={() => setActiveModal('deposits')}
        />

        <KPICard
          title="Total Loans"
          value={kpiData.total_loans}
          changePercent="5.7"
          changeType="positive"
          onClick={() => setActiveModal('loans')}
        />

        <KPICard
          title="Total NPA"
          value={kpiData.total_npa}
          changePercent="2.1"
          changeType="negative"
          warning={true}
          warningText="Click to view accounts >"
          onClick={() => setActiveModal('npa')}
        />

        <KPICard
          title="Opened Accounts"
          value={accountMetrics.opened}
          isCurrency={false}
          changePercent="12.4"
          changeType="positive"
          onClick={() => setActiveModal('opened')}
        />

        <KPICard
          title="Closed Accounts"
          value={accountMetrics.closed}
          isCurrency={false}
          changePercent="4.8"
          changeType="negative"
          onClick={() => setActiveModal('closed')}
        />
      </div>

      {/* =======================================================
          NPA TOP / LEAST 5
      ======================================================= */}
      <div
        style={{
          marginBottom: '24px',
        }}
      >
        <div
          className="card"
          style={{
            padding: '24px',
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              gap: '20px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: '700',
                  color: '#111827',
                }}
              >
                NPA Defaulting Branches
              </div>

              <div
                style={{
                  fontSize: '13px',
                  color: '#6B7280',
                  marginTop: '4px',
                }}
              >
                {npaView === 'top'
                  ? 'Highest 5 NPA branches'
                  : 'Lowest 5 NPA branches'}
                {' • '}
                Outstanding vs Covered (₹ Lakhs)
              </div>
            </div>

            {/* =================================================
                WORKING TOGGLE
            ================================================= */}
            <div
              style={{
                display: 'flex',
                background: '#F3F4F6',
                borderRadius: '22px',
                padding: '4px',
                gap: '4px',
              }}
            >
              <button
                type="button"
                onClick={() => setNpaView('top')}
                style={{
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  padding: '7px 16px',
                  borderRadius: '18px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background:
                    npaView === 'top'
                      ? '#F97316'
                      : 'transparent',
                  color:
                    npaView === 'top'
                      ? '#FFFFFF'
                      : '#6B7280',
                  transition: 'all 0.2s ease',
                }}
              >
                Top 5
              </button>

              <button
                type="button"
                onClick={() => setNpaView('least')}
                style={{
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  padding: '7px 16px',
                  borderRadius: '18px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background:
                    npaView === 'least'
                      ? '#F97316'
                      : 'transparent',
                  color:
                    npaView === 'least'
                      ? '#FFFFFF'
                      : '#6B7280',
                  transition: 'all 0.2s ease',
                }}
              >
                Least 5
              </button>
            </div>
          </div>

          {/* =================================================
              SUMMARY
          ================================================= */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                background: '#F8FAFC',
                borderRadius: '8px',
                padding: '12px 14px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: '#64748B',
                }}
              >
                Showing
              </div>

              <div
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#111827',
                  marginTop: '3px',
                }}
              >
                {displayNpaData.length} {displayNpaData.length === 1 ? 'Branch' : 'Branches'}
              </div>
            </div>

            <div
              style={{
                background: '#FFF7ED',
                borderRadius: '8px',
                padding: '12px 14px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: '#9A3412',
                }}
              >
                View
              </div>

              <div
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#C2410C',
                  marginTop: '3px',
                }}
              >
                {npaView === 'top'
                  ? 'Highest NPA'
                  : 'Lowest NPA'}
              </div>
            </div>

            <div
              style={{
                background: '#F0FDF4',
                borderRadius: '8px',
                padding: '12px 14px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: '#166534',
                }}
              >
                Visible NPA Amount
              </div>

              <div
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#166534',
                  marginTop: '3px',
                }}
              >
                ₹ {totalNpa.toLocaleString('en-IN', {
                  maximumFractionDigits: 2,
                })} L
              </div>
            </div>
          </div>

          {/* =================================================
              CHART
          ================================================= */}
          <div style={{ height: '360px' }}>
            {displayNpaData.length === 0 ? (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6B7280',
                  fontSize: '14px',
                }}
              >
                No NPA data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={displayNpaData}
                  layout="vertical"
                  margin={{
                    top: 5,
                    right: 60,
                    left: 60,
                    bottom: 5,
                  }}
                  barGap={4}
                >
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 11,
                      fill: '#64748B',
                    }}
                  />

                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 12,
                      fill: '#374151',
                    }}
                    width={140}
                  />

                  <Tooltip
                    cursor={{
                      fill: '#F8FAFC',
                    }}
                    formatter={(value, name) => [
                      `₹ ${Number(value).toLocaleString('en-IN', {
                        maximumFractionDigits: 2,
                      })} L`,
                      name === 'NPA'
                        ? 'Outstanding NPA'
                        : 'Covered',
                    ]}
                  />

                  <Bar
                    dataKey="NPA"
                    name="NPA"
                    fill="#EF4444"
                    barSize={16}
                    radius={[0, 4, 4, 0]}
                  >
                    <LabelList dataKey="NPA" position="right" formatter={(val) => `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })}L`} style={{ fontSize: '11px', fill: '#64748B' }} />
                  </Bar>

                  <Bar
                    dataKey="Covered"
                    name="Covered"
                    fill="#10B981"
                    barSize={16}
                    radius={[0, 4, 4, 0]}
                  >
                    <LabelList dataKey="Covered" position="right" formatter={(val) => `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })}L`} style={{ fontSize: '11px', fill: '#64748B' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* =======================================================
          CREDIT VS DEBIT + ACCOUNT DISTRIBUTION
      ======================================================= */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
        }}
      >
        {/* Credit vs Debit */}
        <div
          className="card"
          style={{
            padding: '24px',
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <div
              style={{
                fontSize: '15px',
                fontWeight: '700',
                color: '#111827',
              }}
            >
              Product-wise Credit vs Debit
            </div>

            <div
              style={{
                fontSize: '13px',
                color: '#6B7280',
              }}
            >
              ₹ in Lakhs
            </div>
          </div>

          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barChartData}
                margin={{
                  top: 5,
                  right: 10,
                  left: -20,
                  bottom: 5,
                }}
              >
                <XAxis
                  dataKey="name"
                  hide
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 11,
                    fill: '#6B7280',
                  }}
                />

                <Tooltip
                  cursor={{
                    fill: '#F9FAFB',
                  }}
                />

                <Bar
                  dataKey="Credit"
                  fill="#3B82F6"
                  barSize={15}
                  radius={[4, 4, 0, 0]}
                />

                <Bar
                  dataKey="Debit"
                  fill="#F97316"
                  barSize={15}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Account Distribution */}
        <div
          className="card"
          style={{
            padding: '24px',
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                fontSize: '15px',
                fontWeight: '700',
                color: '#111827',
              }}
            >
              Account Distribution
            </div>

            <div
              style={{
                fontSize: '13px',
                color: '#6B7280',
              }}
            >
              By account type
            </div>
          </div>

          <div
            style={{
              height: '300px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '50%',
                height: '100%',
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>

                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div
              style={{
                width: '50%',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {pieData.map((entry, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor:
                          COLORS[index % COLORS.length],
                      }}
                    />

                    <span
                      style={{
                        color: '#4B5563',
                      }}
                      title={entry.name}
                    >
                      {entry.name.substring(0, 18)}
                    </span>
                  </div>

                  <span
                    style={{
                      fontWeight: '700',
                      color: '#111827',
                    }}
                  >
                    {entry.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;