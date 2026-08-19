import React, { useState } from 'react';
import { 
  User, Lock, Building2, Landmark, Shield, Briefcase, Coins, 
  Wallet, CreditCard, PiggyBank, CircleDollarSign,
  TrendingUp, BarChart3, PieChart
} from 'lucide-react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://127.0.0.1:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.message || 'Invalid username or password');
      }
    } catch (err) {
      setError('Failed to connect to server');
    }
  };

  // Background floating icons pushed to extreme edges (white space)
  const bgIcons = [
    { Icon: Shield, top: '12%', left: '8%', size: 56 },
    { Icon: Coins, top: '15%', left: '92%', size: 64 },
    { Icon: Wallet, top: '85%', left: '10%', size: 60 },
    { Icon: Landmark, top: '88%', left: '90%', size: 72 },
    { Icon: Briefcase, top: '45%', left: '5%', size: 48 },
    { Icon: CreditCard, top: '55%', left: '95%', size: 50 },
    { Icon: PiggyBank, top: '8%', left: '45%', size: 50 },
    { Icon: CircleDollarSign, top: '92%', left: '55%', size: 60 },
    { Icon: TrendingUp, top: '65%', left: '6%', size: 55 },
    { Icon: BarChart3, top: '75%', left: '96%', size: 45 },
    { Icon: PieChart, top: '25%', left: '4%', size: 55 }
  ];

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#F3F4F6',
      fontFamily: "'Inter', sans-serif",
      overflow: 'hidden'
    }}>
      {/* Floating Background Icons */}
      {bgIcons.map((item, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: item.top,
          left: item.left,
          opacity: 0.12,
          color: '#0F172A',
          transform: 'translate(-50%, -50%)'
        }}>
          <item.Icon size={item.size} strokeWidth={1.5} />
        </div>
      ))}

      {/* Outer rounded container (Shrinked) */}
      <div style={{
        position: 'relative',
        width: '900px',
        height: '600px',
        maxWidth: '95%',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-premium, 0 20px 50px rgba(0,0,0,0.15))',
        border: '1px solid #E2E8F0',
        zIndex: 10
      }}>
        {/* Background Image inside container */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: "url('/corporate_bg.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.9,
          filter: 'brightness(0.6)'
        }}></div>

        {/* Centered White Box */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '400px',
          backgroundColor: '#FFFFFF',
          padding: '45px 35px 35px',
          borderRadius: '16px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {/* Overlapping Bank Logo at Top Center */}
          <div style={{
            position: 'absolute',
            top: '-35px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '70px',
            height: '70px',
            backgroundColor: '#0F172A',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            border: '4px solid #FFFFFF'
          }}>
            <Building2 size={30} color="#D4AF37" />
          </div>

          <h2 style={{
            margin: '15px 0 8px',
            fontSize: '22px',
            fontWeight: '700',
            color: '#0F172A',
            fontFamily: "'Playfair Display', serif"
          }}>
            APEX BANKING MIS
          </h2>
          <p style={{ color: '#64748B', fontSize: '13px', marginBottom: '25px', fontWeight: '500', textAlign: 'center' }}>
            Secure Administrator Login
          </p>

          <div style={{ width: '100%' }}>
            <form onSubmit={handleLogin} style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '12px 16px', marginBottom: '16px', backgroundColor: '#F8FAFC' }}>
                <User size={18} color="#0F172A" style={{ marginRight: '12px' }} />
                <input
                  type="text"
                  placeholder="Enter User Name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', color: '#0F172A', fontWeight: '500', backgroundColor: 'transparent' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '12px 16px', marginBottom: '12px', backgroundColor: '#F8FAFC' }}>
                <Lock size={18} color="#0F172A" style={{ marginRight: '12px' }} />
                <input
                  type="password"
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', color: '#0F172A', fontWeight: '500', backgroundColor: 'transparent' }}
                />
              </div>

              {error && <div style={{ color: '#EF4444', fontSize: '12px', marginBottom: '12px', textAlign: 'center', fontWeight: '500' }}>{error}</div>}

              <div style={{ textAlign: 'right', marginBottom: '24px' }}>
                <span style={{ fontSize: '12px', color: '#3B82F6', cursor: 'pointer', fontWeight: '600' }}>Forgot password?</span>
              </div>

              <button
                type="submit"
                style={{ width: '100%', backgroundColor: '#0F172A', color: '#D4AF37', border: 'none', padding: '14px', borderRadius: '6px', fontSize: '14px', fontWeight: '700', letterSpacing: '1px', cursor: 'pointer', marginBottom: '20px', transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#1E293B'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#0F172A'}
              >
                SECURE LOGIN
              </button>

              <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748B' }}>
                Need an account? Please contact your <span style={{ color: '#D4AF37', fontWeight: '700' }}>Head Office Administrator</span>.
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
