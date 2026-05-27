import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useToast, API } from '../App';

const CATEGORIES = ['Programming', 'Design', 'Music', 'Language', 'Cooking', 'Business', 'Fitness', 'Art', 'Math', 'Science', 'Other'];

export default function CreateSessionModal({ onClose }) {
  const { token } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', category: 'Programming', tags: '' });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim()) return toast('Title is required', 'error');
    setLoading(true);
    try {
      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const res = await fetch(`${API}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, tags })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast('Session created! Starting now…', 'success');
      onClose();
      navigate(`/room/${data.session.id}?host=1`);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">Start Teaching</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="input-group">
            <label>Title *</label>
            <input className="input" placeholder="What are you teaching today?" value={form.title}
              onChange={e => set('title', e.target.value)} autoFocus />
          </div>
          <div className="input-group">
            <label>Description</label>
            <textarea className="input" placeholder="Brief description of this session…" value={form.description}
              onChange={e => set('description', e.target.value)} rows={3} />
          </div>
          <div className="input-group">
            <label>Category</label>
            <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Tags (comma separated)</label>
            <input className="input" placeholder="react, hooks, beginners" value={form.tags}
              onChange={e => set('tags', e.target.value)} />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? 'Creating…' : '🎥 Go Live'}
          </button>
        </div>
      </div>
    </div>
  );
}
