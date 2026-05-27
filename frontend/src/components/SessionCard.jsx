import React from 'react';
import { useNavigate } from 'react-router-dom';

function timeAgo(dt) {
  const diff = Date.now() - new Date(dt + 'Z').getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SessionCard({ session }) {
  const navigate = useNavigate();
  const isLive = session.status === 'live';

  return (
    <div className="card" style={{ cursor: 'pointer', padding: 20 }}
      onClick={() => navigate(`/room/${session.id}`)}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span className={`badge ${isLive ? 'badge-live' : 'badge-ended'}`}>
          {isLive ? 'LIVE' : 'Recorded'}
        </span>
        <span className="badge badge-cat">{session.category}</span>
      </div>

      {/* Title */}
      <h3 style={{ marginBottom: 6, lineHeight: 1.3, fontSize: '1rem' }}>{session.title}</h3>
      {session.description && (
        <p style={{ fontSize: '0.8rem', marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {session.description}
        </p>
      )}

      {/* Tags */}
      {session.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
          {session.tags.slice(0, 3).map(tag => (
            <span key={tag} className="badge badge-tag">{tag}</span>
          ))}
        </div>
      )}

      <hr className="divider" style={{ margin: '12px 0' }} />

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="avatar avatar-sm" style={{ background: session.host_color }}>
            {session.host_name?.[0]?.toUpperCase()}
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-2)' }}>
            {session.host_name}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--text-3)' }}>
          {isLive && (
            <span>👁 {session.viewer_count || 0}</span>
          )}
          <span>💬 {session.comment_count || 0}</span>
          <span>{timeAgo(session.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
