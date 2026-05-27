import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App';
import SessionCard from '../components/SessionCard';

const CATEGORIES = ['Programming', 'Design', 'Music', 'Language', 'Cooking', 'Business', 'Fitness', 'Art', 'Math', 'Science', 'Other'];

const heroStyle = {
  background: 'linear-gradient(135deg, #FDF6EE 0%, #FBF0E4 50%, #F5EBF7 100%)',
  borderBottom: '1px solid var(--border)',
  padding: '72px 0 64px',
};

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [live, setLive] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/sessions?status=live`)
      .then(r => r.json())
      .then(d => setLive(d.sessions || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* Hero */}
      <section style={heroStyle}>
        <div className="container">
          <div style={{ maxWidth: 560 }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '.1em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 14 }}>
              Share Knowledge. Build Together.
            </p>
            <h1 style={{ marginBottom: 18 }}>
              Teach live.<br />
              <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>Learn anything.</span>
            </h1>
            <p style={{ fontSize: '1.05rem', maxWidth: 440, marginBottom: 32, color: 'var(--text-2)' }}>
              Real-time skill sharing with live video. Watch, learn, and download sessions from people who know their craft.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {user ? (
                <button className="btn btn-primary" onClick={() => navigate('/browse')}>
                  Browse Sessions →
                </button>
              ) : (
                <>
                  <Link to="/auth" className="btn btn-primary">Start Teaching Free</Link>
                  <Link to="/browse" className="btn btn-outline">Browse Sessions</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats row */}
      <section style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="container">
          <div style={{ display: 'flex', gap: 0, padding: '20px 0' }}>
            {[
              { label: 'Live Now', value: live.length, highlight: true },
              { label: 'Categories', value: CATEGORIES.length },
              { label: 'Free Forever', value: '100%' },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, textAlign: 'center', padding: '8px 0',
                borderRight: i < 2 ? '1px solid var(--border)' : 'none'
              }}>
                <div style={{
                  fontFamily: "'Fraunces', serif", fontSize: '1.6rem', fontWeight: 600,
                  color: s.highlight ? 'var(--live)' : 'var(--accent)'
                }}>{s.value}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', fontWeight: 500, letterSpacing: '.03em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live sessions */}
      <section className="page">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h2 style={{ marginBottom: 4 }}>
                <span style={{ color: 'var(--live)' }}>●</span> Happening Now
              </h2>
              <p style={{ fontSize: '0.85rem' }}>Jump into a live session</p>
            </div>
            <Link to="/browse" className="btn btn-outline btn-sm">View all →</Link>
          </div>

          {loading ? (
            <div className="loader-center"><div className="spinner" /></div>
          ) : live.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🎥</div>
              <h3>No live sessions right now</h3>
              <p style={{ marginBottom: 20 }}>Be the first to go live and share what you know</p>
              {user
                ? null
                : <Link to="/auth" className="btn btn-primary btn-sm">Sign up to teach</Link>
              }
            </div>
          ) : (
            <div className="sessions-grid">
              {live.map(s => <SessionCard key={s.id} session={s} />)}
            </div>
          )}

          {/* Categories */}
          <div style={{ marginTop: 64 }}>
            <h2 style={{ marginBottom: 8 }}>Browse by Category</h2>
            <p style={{ marginBottom: 24 }}>Find sessions in what you want to learn</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {CATEGORIES.map(c => (
                <Link key={c}
                  to={`/browse?category=${c}`}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 'var(--r-sm)',
                    border: '1.5px solid var(--border)',
                    background: 'var(--surface)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'var(--text)',
                    transition: 'all .15s',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.color = 'var(--accent)'; e.target.style.background = 'var(--accent-bg)'; }}
                  onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text)'; e.target.style.background = 'var(--surface)'; }}
                >
                  {c}
                </Link>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div style={{ marginTop: 72, padding: '48px 0', borderTop: '1px solid var(--border)' }}>
            <h2 style={{ textAlign: 'center', marginBottom: 40 }}>How it works</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
              {[
                { n: '01', title: 'Sign up free', desc: 'Create an account in seconds. No credit card needed.' },
                { n: '02', title: 'Go live', desc: 'Click "Teach", turn on camera, start sharing your knowledge.' },
                { n: '03', title: 'People join', desc: 'Viewers watch your live stream in real-time via WebRTC.' },
                { n: '04', title: 'Download & comment', desc: 'After the session, viewers can download the recording and leave feedback.' },
              ].map(step => (
                <div key={step.n} style={{ textAlign: 'center' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'var(--accent-bg)', color: 'var(--accent)',
                    fontFamily: "'Fraunces', serif", fontSize: '1rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 14px'
                  }}>{step.n}</div>
                  <h3 style={{ marginBottom: 6, fontSize: '0.95rem' }}>{step.title}</h3>
                  <p style={{ fontSize: '0.82rem' }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
