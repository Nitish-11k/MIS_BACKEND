import React, { useState, useEffect } from 'react';
import { Calendar, Bell, X, Info, CheckCircle, AlertTriangle } from 'lucide-react';

const FilterBar = ({
  branches,
  selectedBranch,
  setSelectedBranch,
  selectedPeriod,
  setSelectedPeriod,
  exactDate,
  setExactDate,
  setActiveModal
}) => {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
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

  return (
    <div className="dashboard-header sticky-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 32px 16px 32px', borderBottom: '1px solid #E5E7EB', background: '#FFFFFF', position: 'sticky', top: 0, zIndex: 100 }}>
      <div className="header-title-section">
        <h1 className="header-title" style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0', color: '#111827' }}>Banking MIS Dashboard</h1>
        <p className="header-subtitle" style={{ margin: '0', color: '#6B7280', fontSize: '13px' }}>Last Updated: 12 Aug 2026, 14:35 IST</p>
      </div>
      
      <div className="header-controls" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Exact Date Picker */}
        <div className="branch-selector-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F9FAFB', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <Calendar size={16} color="#6B7280" />
          <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Process Date:</span>
          <input 
            type="date"
            value={exactDate}
            onChange={(e) => {
              setExactDate(e.target.value);
              if (e.target.value) setSelectedPeriod('ALL');
            }}
            style={{ outline: 'none', border: 'none', background: 'transparent', fontWeight: '500', color: '#374151', fontSize: '14px', cursor: 'pointer' }}
          />
        </div>

        {/* Period Dropdown */}
        <div className="branch-selector-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F9FAFB', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', opacity: exactDate ? 0.5 : 1, pointerEvents: exactDate ? 'none' : 'auto' }}>
          <select 
            className="branch-selector" 
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              setExactDate('');
            }}
            style={{ outline: 'none', border: 'none', background: 'transparent', fontWeight: '500', color: '#374151', fontSize: '14px', cursor: 'pointer' }}
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="7D">7D</option>
            <option value="30D">30D</option>
            <option value="YTD">YTD</option>
          </select>
        </div>

        {/* Branch Dropdown */}
        <div className="branch-selector-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F9FAFB', padding: '8px 12px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <select 
            className="branch-selector" 
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            style={{ outline: 'none', border: 'none', background: 'transparent', fontWeight: '500', color: '#374151', fontSize: '14px', minWidth: '120px', cursor: 'pointer' }}
          >
            <option value="ALL">All Branches</option>
            {branches.map((b, i) => (
              <option key={i} value={b.code}>{b.code} - {b.name}</option>
            ))}
          </select>
        </div>
        
        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setIsNotificationOpen(true)}
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Bell size={18} color="#4B5563" />
            {notifications.length > 0 && (
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#EF4444', color: '#fff', fontSize: '10px', fontWeight: 'bold', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {notifications.length}
              </span>
            )}
          </button>
        </div>

      </div>

      {/* Slide-in Notification Panel */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '350px',
          background: '#fff',
          boxShadow: '-4px 0 15px rgba(0,0,0,0.1)',
          transform: isNotificationOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ padding: '20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F9FAFB' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={18} color="#F97316" /> Notifications
          </h2>
          <button 
            onClick={() => setIsNotificationOpen(false)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.length === 0 && (
            <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0', fontSize: '13px' }}>
              No notifications at this time.
            </div>
          )}
          {notifications.map(notif => (
            <div 
              key={notif.id} 
              onClick={() => {
                if (notif.action === 'modal' && notif.modal_type) {
                  if (notif.branch_code && notif.branch_code !== 'ALL') {
                    setSelectedBranch(notif.branch_code);
                  }
                  setActiveModal(notif.modal_type);
                  setIsNotificationOpen(false);
                }
              }}
              style={{ 
                padding: '16px', 
                borderRadius: '8px', 
                border: notif.action === 'modal' ? '1px solid #F97316' : '1px solid #E5E7EB', 
                background: notif.type === 'warning' ? '#FEF2F2' : (notif.type === 'success' ? '#F0FDF4' : '#F8FAFC'),
                cursor: notif.action === 'modal' ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { if(notif.action==='modal') { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(249,115,22,0.15)'; } }}
              onMouseLeave={(e) => { if(notif.action==='modal') { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; } }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ marginTop: '2px' }}>
                  {notif.type === 'success' && <CheckCircle size={16} color="#16A34A" />}
                  {notif.type === 'warning' && <AlertTriangle size={16} color="#DC2626" />}
                  {notif.type === 'info' && <Info size={16} color="#0284C7" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{notif.title}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#4B5563', lineHeight: '1.4' }}>{notif.message}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '500' }}>{notif.time}</span>
                    {notif.action === 'modal' && (
                      <span style={{ fontSize: '11px', color: '#F97316', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        View Details →
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
