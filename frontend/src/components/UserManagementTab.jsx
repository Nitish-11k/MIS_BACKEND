import React, { useState, useEffect } from 'react';
import { Users, Trash2, Plus, Shield, MapPin, Building, Key, Check } from 'lucide-react';

const UserManagementTab = ({ user }) => {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('BRANCH');
  const [region, setRegion] = useState('');
  const [branch, setBranch] = useState('');
  const [availableRegions, setAvailableRegions] = useState([]);
  
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/users');
      const data = await response.json();
      if (data.success) {
        setUsersList(data.users);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    
    // Fetch regions for the dropdown
    const fetchRegions = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/regions');
        const data = await response.json();
        if (data.success) {
          setAvailableRegions(data.regions);
          if (data.regions.length > 0) setRegion(data.regions[0]);
        }
      } catch (err) {
        console.error("Failed to fetch regions", err);
      }
    };
    fetchRegions();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!username || !password || !name) {
      setStatusMsg({ text: 'Username, password and name are required', type: 'error' });
      return;
    }
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          password, 
          name, 
          role, 
          region: role === 'RO' ? region : null, 
          branch: role === 'BRANCH' ? branch : null 
        })
      });
      const data = await response.json();
      if (data.success) {
        setStatusMsg({ text: 'User created successfully', type: 'success' });
        // Reset form
        setUsername('');
        setPassword('');
        setName('');
        setRole('BRANCH');
        setRegion('');
        setBranch('');
        fetchUsers();
      } else {
        setStatusMsg({ text: data.message || 'Error creating user', type: 'error' });
      }
    } catch (err) {
      setStatusMsg({ text: 'Network error', type: 'error' });
    }
    
    setTimeout(() => setStatusMsg({ text: '', type: '' }), 4000);
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/users/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.message || 'Error deleting user');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  if (user?.role !== 'HO') {
    return <div style={{ padding: '24px', color: '#EF4444' }}>Unauthorized Access</div>;
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ padding: '8px', background: '#0F172A', borderRadius: '8px' }}>
          <Users color="#D4AF37" size={24} />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0F172A', margin: 0, fontFamily: "'Playfair Display', serif" }}>
          User Management
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        
        {/* Create User Form */}
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '600', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} color="#3B82F6" /> Create New User
          </h3>
          
          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748B', marginBottom: '6px' }}>Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} type="text" placeholder="John Doe" style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '14px', outline: 'none' }} />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748B', marginBottom: '6px' }}>Username</label>
              <input value={username} onChange={e => setUsername(e.target.value)} type="text" placeholder="johndoe123" style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '14px', outline: 'none' }} />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748B', marginBottom: '6px' }}>Password</label>
              <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '14px', outline: 'none' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748B', marginBottom: '6px' }}>Role</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '14px', outline: 'none', background: '#FFFFFF' }}>
                <option value="HO">Head Office (Admin)</option>
                <option value="RO">Regional Office</option>
                <option value="BRANCH">Branch Level</option>
              </select>
            </div>

            {role === 'RO' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748B', marginBottom: '6px' }}>Assigned Region Name</label>
                <select value={region} onChange={e => setRegion(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '14px', outline: 'none', background: '#FFFFFF' }}>
                  {availableRegions.length === 0 && <option value="">Loading Regions...</option>}
                  {availableRegions.map((r, i) => (
                    <option key={i} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            {role === 'BRANCH' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748B', marginBottom: '6px' }}>Assigned Branch Code</label>
                <input value={branch} onChange={e => setBranch(e.target.value)} type="text" placeholder="e.g. 0011" style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '14px', outline: 'none' }} />
              </div>
            )}

            {statusMsg.text && (
              <div style={{ padding: '10px', borderRadius: '6px', fontSize: '13px', background: statusMsg.type === 'error' ? '#FEF2F2' : '#F0FDF4', color: statusMsg.type === 'error' ? '#EF4444' : '#10B981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {statusMsg.type === 'success' ? <Check size={16} /> : null}
                {statusMsg.text}
              </div>
            )}

            <button type="submit" style={{ background: '#0F172A', color: '#D4AF37', border: 'none', padding: '12px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' }}>
              Create Account
            </button>
          </form>
        </div>

        {/* Users List Table */}
        <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#0F172A' }}>Active System Users</h3>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>Loading users...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#F1F5F9', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#64748B' }}>USER DETAILS</th>
                    <th style={{ textAlign: 'left', padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#64748B' }}>ROLE</th>
                    <th style={{ textAlign: 'left', padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#64748B' }}>ASSIGNMENT</th>
                    <th style={{ textAlign: 'center', padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#64748B' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u, i) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #E2E8F0', background: i % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: '600', color: '#0F172A', fontSize: '14px' }}>{u.name}</div>
                        <div style={{ color: '#64748B', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                          <Key size={12} /> {u.username}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600',
                          background: u.role === 'HO' ? '#0F172A' : (u.role === 'RO' ? '#EFF6FF' : '#F0FDF4'),
                          color: u.role === 'HO' ? '#D4AF37' : (u.role === 'RO' ? '#3B82F6' : '#10B981')
                        }}>
                          {u.role === 'HO' ? 'Head Office' : (u.role === 'RO' ? 'Regional Office' : 'Branch')}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        {u.role === 'HO' ? (
                          <span style={{ color: '#94A3B8', fontSize: '13px' }}>All Data</span>
                        ) : u.role === 'RO' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0F172A', fontSize: '13px' }}><MapPin size={14} color="#64748B" /> {u.region}</div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0F172A', fontSize: '13px' }}><Building size={14} color="#64748B" /> {u.branch}</div>
                        )}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                        {u.id !== user.id && u.username !== 'admin' ? (
                          <button 
                            onClick={() => handleDeleteUser(u.id)}
                            style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Delete User"
                          >
                            <Trash2 size={18} />
                          </button>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '12px' }}>Protected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {usersList.length === 0 && !loading && (
                    <tr>
                      <td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default UserManagementTab;
