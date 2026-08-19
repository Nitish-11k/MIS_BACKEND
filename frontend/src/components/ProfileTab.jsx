import React from 'react';
import { User, Shield, MapPin, Building, Key, LogOut } from 'lucide-react';

const ProfileTab = ({ user, onLogout }) => {
  if (!user) return null;

  const roleDisplay = {
    'HO': 'Head Office Administrator',
    'RO': 'Regional Manager',
    'BRANCH': 'Branch Manager'
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', marginBottom: '24px', fontFamily: "'Playfair Display', serif" }}>
        User Profile
      </h2>

      <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: 'var(--shadow-premium)', overflow: 'hidden' }}>
        {/* Header Section */}
        <div style={{ background: '#0F172A', padding: '32px', display: 'flex', alignItems: 'center', gap: '24px', color: '#FFFFFF' }}>
          <div style={{ 
            width: '80px', height: '80px', borderRadius: '50%', 
            background: '#D4AF37', color: '#0F172A', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: '32px', fontWeight: '700', border: '4px solid rgba(255,255,255,0.2)'
          }}>
            {user.name ? user.name.substring(0, 2).toUpperCase() : 'U'}
          </div>
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700' }}>{user.name}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#CBD5E1', fontSize: '14px' }}>
              <Shield size={16} color="#D4AF37" />
              <span>{roleDisplay[user.role] || 'User'}</span>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div style={{ padding: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Username</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F8FAFC', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <User size={18} color="#0F172A" />
                <span style={{ fontSize: '15px', color: '#0F172A', fontWeight: '500' }}>{user.username}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>User ID</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F8FAFC', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <Key size={18} color="#0F172A" />
                <span style={{ fontSize: '15px', color: '#0F172A', fontWeight: '500' }}>{user.id}</span>
              </div>
            </div>

            {user.role !== 'HO' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Assigned Region</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F8FAFC', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <MapPin size={18} color="#0F172A" />
                  <span style={{ fontSize: '15px', color: '#0F172A', fontWeight: '500' }}>{user.region || 'All Regions'}</span>
                </div>
              </div>
            )}

            {user.role === 'BRANCH' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748B', textTransform: 'uppercase' }}>Assigned Branch Code</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F8FAFC', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <Building size={18} color="#0F172A" />
                  <span style={{ fontSize: '15px', color: '#0F172A', fontWeight: '500' }}>{user.branch}</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              onClick={onLogout}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', 
                background: '#EF4444', color: '#FFFFFF', border: 'none', 
                padding: '12px 24px', borderRadius: '8px', 
                fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#DC2626'}
              onMouseLeave={(e) => e.target.style.background = '#EF4444'}
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;
