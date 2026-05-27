import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useToast, API } from '../App';

export default function Auth() {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (tab === 'register' && !form.name.trim()) return toast('Name required', 'error');
    if (!form.email.trim() || !form.password.trim()) return toast('All fields required', 'error');
    if (form.password.length < 6) return toast('Password must be at least 6 characters', 'error');

    setLoading(true);
    try {
      const endpoint = tab === 'login' ? 'login' : 'register';
      const body = tab === 'login'
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };

      const res = await fetch(`${API}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      login(data);
      toast(`Welcome${tab === 'login' ? ' back' : ''}, ${data.user.name}!`, 'success');
      navigate('/');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => { if (e.key === 'Enter') submit(); };

  return (
    <div style={{
      minHeight: 'calc(100vh - 60px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #FDF6EE 0%, #FBF0E4 60%, #F5EBF7 100%)',
      padding: '40px 20px'
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontFamily: "'Fraunces', serif", fontSize: '1.8rem', fontWeight: 600,
            color: 'var(--text)', marginBottom: 8
          }}>
            Skill<span style={{ color: 'var(--accent)' }}>Flow</span>
          </div>
          <p style={{ fontSize: '0.9rem' }}>Share what you know. Learn what you need.</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 32 }}>
          {/* Tabs */}
          <div style={{
            display: 'flex', background: 'var(--border-soft)',
            borderRadius: 'var(--r-sm)', padding: 3, marginBottom: 28
          }}>
            {['login', 'register'].map(t => (
              <button key={t}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: '5px',
                  fontSize: '0.875rem', fontWeight: 500,
                  background: tab === t ? 'var(--surface)' : 'transparent',
                  color: tab === t ? 'var(--text)' : 'var(--text-3)',
                  boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
                  transition: 'all .15s',
                }}
                onClick={() => setTab(t)}>
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {tab === 'register' && (
              <div className="input-group">
                <label>Full Name</label>
                <input className="input" placeholder="Your name" value={form.name}
                  onChange={e => set('name', e.target.value)} onKeyDown={onKey} autoFocus />
              </div>
            )}
            <div className="input-group">
              <label>Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email}
                onChange={e => set('email', e.target.value)} onKeyDown={onKey}
                autoFocus={tab === 'login'} />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input className="input" type="password" placeholder="••••••••" value={form.password}
                onChange={e => set('password', e.target.value)} onKeyDown={onKey} />
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 24 }}
            onClick={submit} disabled={loading}>
            {loading ? 'Please wait…' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 16 }}>
            {tab === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 500, cursor: 'pointer', padding: 0 }}
              onClick={() => setTab(tab === 'login' ? 'register' : 'login')}>
              {tab === 'login' ? 'Register' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
