import React, { useState, useEffect } from 'react';
import { Calendar, Bell, X, Info, CheckCircle, AlertTriangle, Menu, MoreVertical, RefreshCw, Filter, ChevronDown, ChevronUp } from 'lucide-react';

const FilterBar = ({
  isMobile,
  isSidebarOpen,
  setIsSidebarOpen,
  branches,
  selectedBranch,
  setSelectedBranch,
  selectedPeriod,
  setSelectedPeriod,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  selectedProduct,
  setSelectedProduct,
  setActiveModal
}) => {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  // Local states for filters to apply on click
  const [localPeriod, setLocalPeriod] = useState(selectedPeriod);
  const [localBranch, setLocalBranch] = useState(selectedBranch);
  const [localStartDate, setLocalStartDate] = useState(startDate || '');
  const [localEndDate, setLocalEndDate] = useState(endDate || '');
  const [localProduct, setLocalProduct] = useState(selectedProduct || 'All Products');
  const [status, setStatus] = useState('All');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/notifications?branch_code=${selectedBranch}`);
        const data = await response.json();
        setNotifications(data);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };
    fetchNotifications();
  }, [selectedBranch]);

  const handleApplyFilters = () => {
    setSelectedPeriod(localPeriod);
    setSelectedBranch(localBranch);
    setStartDate(localStartDate);
    setEndDate(localEndDate);
    if (setSelectedProduct) setSelectedProduct(localProduct);
  };

  const handleReset = () => {
    setLocalPeriod('30D');
    setSelectedPeriod('30D');
    setLocalStartDate('');
    setStartDate('');
    setLocalEndDate('');
    setEndDate('');
    setLocalBranch('ALL');
    setSelectedBranch('ALL');
    setLocalProduct('All Products');
    if (setSelectedProduct) setSelectedProduct('All Products');
    setStatus('All');
  };

  return (
    <div className="dashboard-header-wrapper" style={{ display: 'flex', flexDirection: 'column', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 100 }}>
      {/* TOP TIER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {isMobile && (
            <div onClick={() => setIsSidebarOpen(true)} style={{ padding: '8px', background: '#F8FAFC', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Menu size={20} color="#0F172A" />
            </div>
          )}
          <div>
            <h1 style={{ fontSize: 'clamp(20px, 4vw, 24px)', fontWeight: '700', margin: '0 0 4px 0', color: '#0F172A', fontFamily: "'Playfair Display', serif" }}>Banking MIS Dashboard</h1>
            <p style={{ margin: '0', color: '#64748B', fontSize: '13px' }}>Last Updated: 12 Aug 2026, 14:35 IST</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          
          {/* Data Status Box */}
          <div style={{ display: 'flex', flexDirection: 'column', background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '6px 16px', borderRadius: '8px', marginRight: '8px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }}></div>
              Data Status: <span style={{ color: '#10B981' }}>Live</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>Last Synced 2 min ago</div>
          </div>

          {/* Notification Bell */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setIsNotificationOpen(true)}
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Bell size={18} color="#64748B" />
              {notifications.length > 0 && (
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#EF4444', color: '#fff', fontSize: '10px', fontWeight: 'bold', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {notifications.length}
                </span>
              )}
            </button>
          </div>
          
          {/* Toggle Filters Button */}
          <button 
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            style={{ background: isFiltersExpanded ? '#1E293B' : '#FFFFFF', color: isFiltersExpanded ? '#FFFFFF' : '#0F172A', border: '1px solid #E2E8F0', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', fontSize: '13px', transition: 'all 0.2s' }}
          >
            <Filter size={16} color={isFiltersExpanded ? "#FFFFFF" : "#64748B"} />
            Filters {isFiltersExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          <button style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex' }}>
            <MoreVertical size={18} color="#64748B" />
          </button>
        </div>
      </div>

      {/* BOTTOM TIER - FILTER ROW */}
      <div style={{ 
        background: '#F8FAFC', 
        padding: isFiltersExpanded ? '12px 32px' : '0 32px', 
        display: 'flex', 
        alignItems: 'flex-end', 
        gap: '24px', 
        flexWrap: 'wrap', 
        borderTop: isFiltersExpanded ? '1px solid #E2E8F0' : 'none',
        height: isFiltersExpanded ? 'auto' : '0px',
        overflow: 'hidden',
        opacity: isFiltersExpanded ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        
        {/* Period Pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '11px', fontWeight: '600', color: '#0F172A' }}>Period</label>
          <div style={{ display: 'flex', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
            {['7D', '30D', '90D', 'YTD', 'ALL'].map(p => (
              <div 
                key={p} 
                onClick={() => { setLocalPeriod(p); setLocalStartDate(''); setLocalEndDate(''); }}
                style={{ 
                  padding: '8px 16px', 
                  fontSize: '13px', 
                  fontWeight: localPeriod === p ? '600' : '500', 
                  cursor: 'pointer',
                  background: localPeriod === p ? '#D4AF37' : 'transparent',
                  color: localPeriod === p ? '#FFFFFF' : '#64748B',
                  borderRight: '1px solid #E2E8F0'
                }}
              >
                {p === 'ALL' ? 'All Time' : p}
              </div>
            ))}
          </div>
        </div>

        {/* Custom Range Box */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '11px', fontWeight: '600', color: '#0F172A' }}>Custom Date Range</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '6px 12px', borderRadius: '6px' }}>
            <Calendar size={14} color="#64748B" />
            <input 
              type="date"
              value={localStartDate}
              onChange={(e) => {
                setLocalStartDate(e.target.value);
                if (e.target.value) setLocalPeriod('CUSTOM');
              }}
              style={{ outline: 'none', border: 'none', background: 'transparent', fontWeight: '500', color: '#0F172A', fontSize: '13px', cursor: 'pointer', maxWidth: '110px' }}
            />
            <span style={{ color: '#94A3B8', fontSize: '13px' }}>-</span>
            <input 
              type="date"
              value={localEndDate}
              onChange={(e) => {
                setLocalEndDate(e.target.value);
                if (e.target.value) setLocalPeriod('CUSTOM');
              }}
              style={{ outline: 'none', border: 'none', background: 'transparent', fontWeight: '500', color: '#0F172A', fontSize: '13px', cursor: 'pointer', maxWidth: '110px' }}
            />
          </div>
        </div>

        {/* Branch Dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '11px', fontWeight: '600', color: '#0F172A' }}>Branch</label>
          <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '8px 12px', borderRadius: '6px' }}>
            <select 
              value={localBranch} 
              onChange={(e) => setLocalBranch(e.target.value)}
              style={{ outline: 'none', border: 'none', background: 'transparent', fontWeight: '500', color: '#0F172A', fontSize: '13px', minWidth: '140px', cursor: 'pointer' }}
            >
              <option value="ALL">All Branches</option>
              {branches.map((b, i) => (
                <option key={i} value={b.code}>{b.code} - {b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '11px', fontWeight: '600', color: '#0F172A' }}>Product</label>
          <div style={{ display: 'flex', alignItems: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '8px 12px', borderRadius: '6px' }}>
            <select 
              value={localProduct} 
              onChange={(e) => setLocalProduct(e.target.value)}
              style={{ outline: 'none', border: 'none', background: 'transparent', fontWeight: '500', color: '#0F172A', fontSize: '13px', minWidth: '140px', cursor: 'pointer' }}
            >
              <option value="All Products">All Products</option>
              <option value="Savings">Savings</option>
              <option value="Current">Current</option>
              <option value="Loans">Loans</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
          <button 
            onClick={handleApplyFilters}
            style={{ background: '#D4AF37', color: '#FFFFFF', border: 'none', padding: '8px 24px', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={(e) => e.target.style.background = '#C09A2E'}
            onMouseLeave={(e) => e.target.style.background = '#D4AF37'}
          >
            Apply Filters
          </button>
          <button 
            onClick={handleReset}
            style={{ background: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }}
            onMouseEnter={(e) => e.target.style.background = '#F8FAFC'}
            onMouseLeave={(e) => e.target.style.background = '#FFFFFF'}
          >
            <RefreshCw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Slide-in Notification Panel */}
      <div 
        style={{ 
          position: 'fixed', top: 0, right: 0, bottom: 0, width: '350px', background: '#fff', 
          boxShadow: '-4px 0 15px rgba(0,0,0,0.1)', 
          transform: isNotificationOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 9999, display: 'flex', flexDirection: 'column'
        }}
      >
        <div style={{ padding: '20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={18} color="#D4AF37" /> Notifications
          </h2>
          <button 
            onClick={() => setIsNotificationOpen(false)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.length === 0 && (
            <div style={{ textAlign: 'center', color: '#64748B', padding: '40px 0', fontSize: '13px' }}>
              No notifications at this time.
            </div>
          )}
          {notifications.map(notif => (
            <div 
              key={notif.id}
              onClick={() => {
                if (notif.action === 'modal' && notif.modal_type) {
                  if (notif.branch_code && notif.branch_code !== 'ALL') {
                    setLocalBranch(notif.branch_code);
                    setSelectedBranch(notif.branch_code);
                  }
                  setActiveModal(notif.modal_type);
                  setIsNotificationOpen(false);
                }
              }}
              style={{ 
                padding: '16px', borderRadius: '8px', 
                border: notif.action === 'modal' ? '1px solid #D4AF37' : '1px solid #E2E8F0',
                background: notif.type === 'warning' ? '#FEF2F2' : (notif.type === 'success' ? '#F0FDF4' : '#F8FAFC'),
                cursor: notif.action === 'modal' ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { if(notif.action==='modal') { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(212,175,55,0.15)'; } }}
              onMouseLeave={(e) => { if(notif.action==='modal') { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; } }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ marginTop: '2px' }}>
                  {notif.type === 'success' && <CheckCircle size={16} color="#10B981" />}
                  {notif.type === 'warning' && <AlertTriangle size={16} color="#EF4444" />}
                  {notif.type === 'info' && <Info size={16} color="#3B82F6" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#0F172A' }}>{notif.title}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.4' }}>{notif.message}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '500' }}>{notif.time}</span>
                    {notif.action === 'modal' && (
                      <span style={{ fontSize: '11px', color: '#D4AF37', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        View Details &rarr;
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Background Overlay for Notification Panel */}
      {isNotificationOpen && (
        <div 
          onClick={() => setIsNotificationOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 9998, backdropFilter: 'blur(2px)' }}
        />
      )}
    </div>
  );
};

export default FilterBar;
