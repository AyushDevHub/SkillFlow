import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Browse from './pages/Browse';
import Room from './pages/Room';
import Auth from './pages/Auth';
import Toast from './components/Toast';

// ─── Auth Context ──────────────────────────────────────────────────
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

const API = import.meta.env.VITE_API_URL || '';

function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sf_user')); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('sf_token') || null);
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type = 'default') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const login = (data) => {
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('sf_user', JSON.stringify(data.user));
    localStorage.setItem('sf_token', data.token);
  };

  const logout = () => {
    setUser(null); setToken(null);
    localStorage.removeItem('sf_user');
    localStorage.removeItem('sf_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      <ToastContext.Provider value={toast}>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/room/:id" element={<Room />} />
            <Route path="/auth" element={user ? <Navigate to="/" /> : <Auth />} />
          </Routes>
          <Toast toasts={toasts} />
        </BrowserRouter>
      </ToastContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;
export { API };
