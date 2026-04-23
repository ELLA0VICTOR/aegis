import React from 'react'

export function StatusBanner({ paused, reason }) {
  if (!paused) return null

  return (
    <div
      className="flex w-full flex-col items-center justify-center gap-2 px-4 py-3 text-center sm:flex-row sm:gap-3"
      style={{
        background: 'rgba(255, 26, 26, 0.12)',
        borderBottom: '1px solid rgba(255, 68, 68, 0.35)',
        animation: 'pulse-border 1.5s ease-in-out infinite',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <path
          d="M8 1L15 14H1L8 1Z"
          stroke="#FF4444"
          strokeWidth="1.5"
          fill="rgba(255,68,68,0.1)"
          style={{ animation: 'blink-warning 1s infinite' }}
        />
        <path d="M8 6V9" stroke="#FF4444" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="11.5" r="0.75" fill="#FF4444" />
      </svg>

      <span
        className="font-display font-semibold"
        style={{
          color: '#FF4444',
          fontSize: '0.8rem',
          letterSpacing: '0.14em',
        }}
      >
        ALERT // PROTOCOL PAUSED // DEPOSITS SUSPENDED
      </span>

      {reason && (
        <span
          className="font-mono"
          style={{ color: 'rgba(255,68,68,0.7)', fontSize: '0.7rem', wordBreak: 'break-word' }}
        >
          /{reason.slice(0, 60)}/
        </span>
      )}
    </div>
  )
}
