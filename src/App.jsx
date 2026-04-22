import React, { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { Dashboard } from './pages/Dashboard.jsx'
import { Admin }     from './pages/Admin.jsx'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'DASHBOARD' },
  { id: 'admin',     label: 'ADMIN'     },
]

export default function App() {
  const [page, setPage] = useState('dashboard')

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* ── Top Nav ── */}
      <nav
        className="flex items-center gap-1 px-6 py-2"
        style={{
          background:   'rgba(0,0,0,0.4)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {NAV_ITEMS.map(({ id, label }) => {
          const active = page === id
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              className="font-display"
              style={{
                fontSize:      '0.72rem',
                letterSpacing: '0.12em',
                padding:       '4px 14px',
                border:        'none',
                borderBottom:  active
                  ? '1px solid var(--accent-safe)'
                  : '1px solid transparent',
                background:    active ? 'rgba(0,212,170,0.08)' : 'transparent',
                color:         active ? 'var(--accent-safe)' : 'var(--text-dim)',
                cursor:        'pointer',
                transition:    'all 0.15s',
              }}
            >
              {label}
            </button>
          )
        })}

        {/* Spacer + Version tag */}
        <div style={{ flex: 1 }} />
        <span
          className="font-mono"
          style={{ fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '0.06em' }}
        >
          AEGIS // v1.0.0
        </span>
      </nav>

      {/* ── Page Render ── */}
      {page === 'dashboard' ? <Dashboard /> : <Admin />}

      {/* ── Toast Notifications ── */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background:    '#0F1114',
            color:         '#E8E3D5',
            border:        '1px solid rgba(255,255,255,0.08)',
            borderRadius:  '2px',
            fontFamily:    "'IBM Plex Mono', monospace",
            fontSize:      '0.78rem',
            padding:       '10px 14px',
          },
          success: {
            iconTheme: { primary: '#00D4AA', secondary: '#0F1114' },
            style: {
              background: '#0F1114',
              color:      '#00D4AA',
              border:     '1px solid rgba(0,212,170,0.3)',
            },
          },
          error: {
            iconTheme: { primary: '#FF4444', secondary: '#0F1114' },
            style: {
              background: '#0F1114',
              color:      '#FF4444',
              border:     '1px solid rgba(255,68,68,0.3)',
            },
          },
        }}
      />
    </div>
  )
}
