import React from 'react';
import { Search, Bell, Calendar } from 'lucide-react';

const Header = () => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <header className="header">
      <div className="header-title">
        <h1>Good morning, Arthur 👋</h1>
        <p>Here's what's happening with your business today.</p>
      </div>

      <div className="header-actions">
        <button className="icon-btn">
          <Search size={20} />
        </button>
        
        <div className="date-picker">
          <Calendar size={16} className="text-secondary" />
          <span>{currentDate}</span>
        </div>

        <button className="icon-btn" style={{ position: 'relative' }}>
          <Bell size={20} />
          <span style={{
            position: 'absolute',
            top: '8px',
            right: '10px',
            width: '8px',
            height: '8px',
            backgroundColor: 'var(--accent-primary)',
            borderRadius: '50%',
            border: '2px solid var(--bg-secondary)'
          }}></span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '12px', cursor: 'pointer' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>Arthur Taylor</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Admin</div>
          </div>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            color: 'var(--accent-primary)'
          }}>
            AT
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
