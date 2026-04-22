import React from 'react'
import { RISK_COLORS } from '../lib/constants.js'

function CategoryBadge({ category }) {
  const color = RISK_COLORS[category] || 'var(--text-dim)'
  return (
    <span
      className="font-display font-semibold"
      style={{
        fontSize:      '0.6rem',
        letterSpacing: '0.1em',
        color,
        border:        `1px solid ${color}40`,
        padding:       '1px 6px',
        borderRadius:  '1px',
      }}
    >
      {category}
    </span>
  )
}

export function IncidentFeed({ incidents = [] }) {
  if (incidents.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12"
        style={{ color: 'var(--text-dim)' }}
      >
        <svg
          width="32" height="32" viewBox="0 0 32 32" fill="none"
          style={{ marginBottom: 12 }}
        >
          <circle
            cx="16" cy="16" r="14"
            stroke="currentColor" strokeWidth="1" opacity="0.3"
          />
          <path
            d="M12 16l3 3 5-5"
            stroke="var(--accent-safe)" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
        <span className="font-ui text-sm" style={{ opacity: 0.4 }}>
          No incidents recorded
        </span>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col gap-0 overflow-y-auto"
      style={{ maxHeight: 320 }}
    >
      {incidents.map((incident, i) => (
        <div
          key={i}
          className="flex items-start gap-3 py-3 px-3"
          style={{
            borderBottom:   'var(--border) 1px solid',
            animation:      'fade-up 0.3s ease forwards',
            animationDelay: `${i * 0.04}s`,
            opacity:        0,
          }}
        >
          {/* Risk level number */}
          <span
            className="font-display font-bold flex-shrink-0"
            style={{
              fontSize: '1.4rem',
              lineHeight: 1,
              color: RISK_COLORS[incident.category] || 'var(--text-muted)',
              minWidth: 28,
            }}
          >
            {incident.risk_level}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <CategoryBadge category={incident.category} />
              {incident.auto_paused && (
                <span
                  className="font-display"
                  style={{
                    fontSize:      '0.6rem',
                    letterSpacing: '0.1em',
                    color:         'var(--accent-danger)',
                    opacity:       0.8,
                  }}
                >
                  AUTO-PAUSED
                </span>
              )}
            </div>
            <p
              className="font-mono"
              style={{
                fontSize:   '0.72rem',
                color:      'var(--text-muted)',
                lineHeight: 1.5,
              }}
            >
              {incident.reason}
            </p>
            <div
              className="font-mono mt-1"
              style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}
            >
              <span>{incident.timestamp}</span>
              <span style={{ margin: '0 6px', opacity: 0.3 }}>·</span>
              <span style={{ color: 'var(--text-dim)' }}>
                {incident.source_url.replace('https://', '').split('/')[0]}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
