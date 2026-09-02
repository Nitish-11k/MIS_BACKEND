import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import './index.css';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (user) {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        let [resource, config] = args;
        if (!config) config = {};
        if (!config.headers) config.headers = {};
        
        config.headers['X-User-Name'] = user.username || 'Unknown';
        config.headers['X-User-Role'] = user.role || 'Unknown';
        config.headers['X-User-Branch'] = user.branch || user.region || 'HO';
        
        return originalFetch(resource, config);
      };
      return () => {
        window.fetch = originalFetch;
      };
    }
  }, [user]);

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <>
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <Login onLogin={(userData) => setUser(userData)} />
      )}
    </>
  );
}

export default App;
