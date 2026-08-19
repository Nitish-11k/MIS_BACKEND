import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import './index.css';

function App() {
  const [user, setUser] = useState(null);

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
