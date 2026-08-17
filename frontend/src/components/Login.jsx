import React, { useState } from 'react';
import { 
  User, Lock, Building2, Mail, Landmark, MapPin, KeyRound, 
  ArrowRight, ChevronLeft, Shield, Briefcase, Coins, 
  Wallet, CreditCard, Vault, PiggyBank, CircleDollarSign,
  TrendingUp, BarChart3, PieChart
} from 'lucide-react';

const Login = ({ onLogin }) => {
  const [mode, setMode] = useState('LOGIN'); // LOGIN, SIGNUP, OTP
  
  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Signup State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bank, setBank] = useState('');
  const [branch, setBranch] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  // OTP State
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin123') {
      onLogin();
    } else {
      setError('Invalid username or password');
    }
  };

  const handleSignup = (e) => {
    e.preventDefault();
    if (name && email && bank && branch && signupPassword) {
      setMode('OTP');
      setError('');
    } else {
      setError('Please fill all fields');
    }
  };

  const handleOTP = (e) => {
    e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length === 6) {
      onLogin();
    } else {
      setError('Please enter complete OTP');
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
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
        width: '900px', // Shrinked from 1000px
        height: '600px', // Shrinked from 650px
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
            {mode === 'LOGIN' && "Secure Administrator Login"}
            {mode === 'SIGNUP' && "Create your corporate account"}
            {mode === 'OTP' && "Verify your identity"}
          </p>

          <div style={{ width: '100%' }}>
            {/* ---------------- LOGIN MODE ---------------- */}
            {mode === 'LOGIN' && (
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

                <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748B' }}>
                  New to Apex Banking? <span onClick={() => { setMode('SIGNUP'); setError(''); }} style={{ color: '#D4AF37', fontWeight: '700', cursor: 'pointer' }}>SIGN UP</span> here
                </div>
              </form>
            )}

            {/* ---------------- SIGNUP MODE ---------------- */}
            {mode === 'SIGNUP' && (
              <form onSubmit={handleSignup} style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px 16px', marginBottom: '12px', backgroundColor: '#F8FAFC' }}>
                  <User size={16} color="#0F172A" style={{ marginRight: '12px' }} />
                  <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', color: '#0F172A', fontWeight: '500', backgroundColor: 'transparent' }} required />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px 16px', marginBottom: '12px', backgroundColor: '#F8FAFC' }}>
                  <Mail size={16} color="#0F172A" style={{ marginRight: '12px' }} />
                  <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', color: '#0F172A', fontWeight: '500', backgroundColor: 'transparent' }} required />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px 16px', backgroundColor: '#F8FAFC' }}>
                    <Landmark size={16} color="#0F172A" style={{ marginRight: '8px' }} />
                    <input type="text" placeholder="Bank Name" value={bank} onChange={(e) => setBank(e.target.value)} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', color: '#0F172A', fontWeight: '500', backgroundColor: 'transparent' }} required />
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px 16px', backgroundColor: '#F8FAFC' }}>
                    <MapPin size={16} color="#0F172A" style={{ marginRight: '8px' }} />
                    <input type="text" placeholder="Branch Code" value={branch} onChange={(e) => setBranch(e.target.value)} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', color: '#0F172A', fontWeight: '500', backgroundColor: 'transparent' }} required />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '10px 16px', marginBottom: '16px', backgroundColor: '#F8FAFC' }}>
                  <Lock size={16} color="#0F172A" style={{ marginRight: '12px' }} />
                  <input type="password" placeholder="Create Password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', color: '#0F172A', fontWeight: '500', backgroundColor: 'transparent' }} required />
                </div>

                {error && <div style={{ color: '#EF4444', fontSize: '12px', marginBottom: '12px', textAlign: 'center', fontWeight: '500' }}>{error}</div>}

                <button
                  type="submit"
                  style={{ width: '100%', backgroundColor: '#0F172A', color: '#D4AF37', border: 'none', padding: '14px', borderRadius: '6px', fontSize: '14px', fontWeight: '700', letterSpacing: '1px', cursor: 'pointer', marginBottom: '16px', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  PROCEED TO VERIFY <ArrowRight size={16} />
                </button>

                <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748B' }}>
                  Already have an account? <span onClick={() => { setMode('LOGIN'); setError(''); }} style={{ color: '#D4AF37', fontWeight: '700', cursor: 'pointer' }}>LOGIN</span>
                </div>
              </form>
            )}

            {/* ---------------- OTP MODE ---------------- */}
            {mode === 'OTP' && (
              <form onSubmit={handleOTP} style={{ width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ display: 'inline-flex', padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '50%', marginBottom: '16px' }}>
                    <KeyRound size={32} color="#D4AF37" />
                  </div>
                  <p style={{ color: '#0F172A', fontSize: '14px', fontWeight: '500', margin: 0 }}>
                    We've sent a verification code to<br/><strong style={{ color: '#D4AF37' }}>{email}</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value.replace(/[^0-9]/g, ''))}
                      style={{
                        width: '40px', height: '48px', textAlign: 'center', fontSize: '20px', fontWeight: '600',
                        border: '1px solid #E2E8F0', borderRadius: '6px', backgroundColor: '#F8FAFC', color: '#0F172A', outline: 'none'
                      }}
                      maxLength={1}
                    />
                  ))}
                </div>

                {error && <div style={{ color: '#EF4444', fontSize: '12px', marginBottom: '16px', textAlign: 'center', fontWeight: '500' }}>{error}</div>}

                <button
                  type="submit"
                  style={{ width: '100%', backgroundColor: '#0F172A', color: '#D4AF37', border: 'none', padding: '14px', borderRadius: '6px', fontSize: '14px', fontWeight: '700', letterSpacing: '1px', cursor: 'pointer', marginBottom: '16px', transition: 'background 0.2s' }}
                >
                  VERIFY & REGISTER
                </button>

                <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748B' }}>
                  Didn't receive code? <span style={{ color: '#D4AF37', fontWeight: '700', cursor: 'pointer' }}>RESEND</span>
                </div>
                <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748B', marginTop: '16px' }}>
                  <span onClick={() => setMode('SIGNUP')} style={{ color: '#0F172A', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><ChevronLeft size={14} /> Back to Sign Up</span>
                </div>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
