import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API } from '../App';
import SessionCard from '../components/SessionCard';

const CATEGORIES = ['all', 'Programming', 'Design', 'Music', 'Language', 'Cooking', 'Business', 'Fitness', 'Art', 'Math', 'Science', 'Other'];
const STATUSES = [
  { value: '', label: 'All' },
  { value: 'live', label: '🔴 Live' },
  { value: 'ended', label: 'Recorded' },
];

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const category = params.get('category') || 'all';
  const status = params.get('status') || '';

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (category !== 'all') qs.set('category', category);
    if (status) qs.set('status', status);
    if (search) qs.set('q', search);
    fetch(`${API}/api/sessions?${qs}`)
      .then(r => r.json())
      .then(d => setSessions(d.sessions || []))
      .finally(() => setLoading(false));
  }, [category, status, search]);

  useEffect(() => { load(); }, [load]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  return (
    <div className="page">
      <div className="container">
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ marginBottom: 8 }}>Browse Sessions</h1>
          <p>Discover live and recorded skill sessions</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <input className="input" placeholder="Search sessions…" value={searchInput}
            onChange={e => setSearchInput(e.target.value)} style={{ maxWidth: 380 }} />
          <button className="btn btn-outline btn-sm" type="submit">Search</button>
          {search && (
            <button type="button" className="btn btn-ghost btn-sm"
              onClick={() => { setSearch(''); setSearchInput(''); }}>
              Clear
            </button>
          )}
        </form>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Status filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            {STATUSES.map(s => (
              <button key={s.value}
                className="btn btn-sm"
                style={{
                  background: status === s.value ? 'var(--text)' : 'var(--surface)',
                  color: status === s.value ? '#fff' : 'var(--text-2)',
                  border: '1.5px solid',
                  borderColor: status === s.value ? 'var(--text)' : 'var(--border)',
                }}
                onClick={() => setParam('status', s.value)}>
                {s.label}
              </button>
            ))}
          </div>
          <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
          {/* Category pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map(c => (
              <button key={c}
                className="btn btn-sm"
                style={{
                  background: category === c ? 'var(--accent)' : 'var(--surface)',
                  color: category === c ? '#fff' : 'var(--text-2)',
                  border: '1.5px solid',
                  borderColor: category === c ? 'var(--accent)' : 'var(--border)',
                  textTransform: c === 'all' ? 'none' : 'none',
                }}
                onClick={() => setParam('category', c === 'all' ? '' : c)}>
                {c === 'all' ? 'All Categories' : c}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 16 }}>
          {loading ? '' : `${sessions.length} session${sessions.length !== 1 ? 's' : ''} found`}
        </div>

        {loading ? (
          <div className="loader-center"><div className="spinner" /></div>
        ) : sessions.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🔍</div>
            <h3>No sessions found</h3>
            <p>Try different filters or be the first to teach in this category</p>
          </div>
        ) : (
          <div className="sessions-grid">
            {sessions.map(s => <SessionCard key={s.id} session={s} />)}
          </div>
        )}
      </div>
    </div>
  );
}
