import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { useTransaction } from '../hooks/useTransactionStatus.js'

const toastStyle = {
  success: { background: '#0F1114', color: '#00D4AA', border: '1px solid rgba(0,212,170,0.3)' },
  error:   { background: '#0F1114', color: '#FF4444', border: '1px solid rgba(255,68,68,0.3)' },
}

export function AdminPanel({ state, refetch }) {
  const { execute, txStatus } = useTransaction()
  const [reason,      setReason]      = useState('')
  const [fakeLevel,   setFakeLevel]   = useState(8)
  const [fakeReason,  setFakeReason]  = useState('')
  const [fakeLabel,   setFakeLabel]   = useState('')
  const [manualLevel, setManualLevel] = useState(0)

  const isPending = txStatus === 'pending'

  async function run(fn, args, successMsg) {
    try {
      await execute(fn, args)
      toast.success(successMsg, { style: toastStyle.success })
      setTimeout(refetch, 2000)
    } catch (err) {
      toast.error(err.message?.slice(0, 100) || 'Transaction failed', {
        style: toastStyle.error,
      })
    }
  }

  const inputStyle = {
    width:       '100%',
    background:  'transparent',
    border:      '1px solid rgba(255,255,255,0.1)',
    borderRadius: '1px',
    padding:     '8px 12px',
    fontFamily:  'var(--font-mono)',
    fontSize:    '0.8rem',
    color:       'var(--text-primary)',
    outline:     'none',
  }

  const fakeLevelColor =
    fakeLevel >= 7 ? 'var(--accent-danger)'
    : fakeLevel >= 3 ? 'var(--accent-warn)'
    : 'var(--accent-safe)'

  return (
    <div className="flex flex-col gap-6">

      {/* ── Manual Pause/Unpause ── */}
      <section className="card p-4">
        <h3
          className="font-display font-semibold mb-3"
          style={{ letterSpacing: '0.08em', fontSize: '0.85rem', color: 'var(--text-muted)' }}
        >
          MANUAL OVERRIDE
        </h3>
        <input
          type="text"
          placeholder="Reason for override..."
          value={reason}
          onChange={e => setReason(e.target.value)}
          style={inputStyle}
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={() =>
              run('admin_override_pause', [true, reason || 'Manual pause'], 'Pause submitted')
            }
            disabled={isPending || state?.paused}
            className="btn btn-danger flex-1"
          >
            PAUSE PROTOCOL
          </button>
          <button
            onClick={() =>
              run('admin_override_pause', [false, reason || 'Manual unpause'], 'Unpause submitted')
            }
            disabled={isPending || !state?.paused}
            className="btn btn-safe flex-1"
          >
            RESUME PROTOCOL
          </button>
        </div>
      </section>

      {/* ── Fake Incident Injection ── */}
      <section className="card p-4">
        <h3
          className="font-display font-semibold mb-3"
          style={{ letterSpacing: '0.08em', fontSize: '0.85rem', color: 'var(--text-muted)' }}
        >
          INJECT TEST INCIDENT
        </h3>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <label
              className="font-mono"
              style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: 80 }}
            >
              Risk Level
            </label>
            <input
              type="range" min="0" max="10" value={fakeLevel}
              onChange={e => setFakeLevel(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span
              className="font-display font-bold"
              style={{
                fontSize:  '1.2rem',
                color:     fakeLevelColor,
                minWidth:  20,
                textAlign: 'center',
              }}
            >
              {fakeLevel}
            </span>
          </div>
          <input
            type="text"
            placeholder="Incident description..."
            value={fakeReason}
            onChange={e => setFakeReason(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Source label (e.g. rekt_news)..."
            value={fakeLabel}
            onChange={e => setFakeLabel(e.target.value)}
            style={inputStyle}
          />
          <button
            onClick={() =>
              run(
                'admin_inject_fake_incident',
                [fakeLevel, fakeReason || 'Test incident', fakeLabel || 'test'],
                'Fake incident injected'
              )
            }
            disabled={isPending}
            className="btn btn-warn mt-1"
            style={{ width: '100%' }}
          >
            INJECT FAKE INCIDENT
          </button>
        </div>
      </section>

      {/* ── Manual Risk Level Set ── */}
      <section className="card p-4">
        <h3
          className="font-display font-semibold mb-3"
          style={{ letterSpacing: '0.08em', fontSize: '0.85rem', color: 'var(--text-muted)' }}
        >
          MANUAL RISK LEVEL
        </h3>
        <div className="flex gap-2">
          <input
            type="number" min="0" max="10" value={manualLevel}
            onChange={e => setManualLevel(Number(e.target.value))}
            style={{ ...inputStyle, maxWidth: 80 }}
          />
          <button
            onClick={() =>
              run(
                'admin_set_risk_level',
                [manualLevel, reason || 'Admin manual set'],
                'Risk level set'
              )
            }
            disabled={isPending}
            className="btn btn-warn"
            style={{ flex: 1 }}
          >
            SET LEVEL {manualLevel}
          </button>
        </div>
      </section>

      {/* ── Toggle Monitor ── */}
      <section className="card p-4">
        <h3
          className="font-display font-semibold mb-3"
          style={{ letterSpacing: '0.08em', fontSize: '0.85rem', color: 'var(--text-muted)' }}
        >
          MONITOR CONTROL
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() =>
              run('admin_set_monitor_enabled', [true], 'Monitor enabled')
            }
            disabled={isPending || state?.monitor_enabled}
            className="btn btn-safe flex-1"
          >
            ENABLE MONITOR
          </button>
          <button
            onClick={() =>
              run('admin_set_monitor_enabled', [false], 'Monitor disabled')
            }
            disabled={isPending || !state?.monitor_enabled}
            className="btn btn-danger flex-1"
          >
            DISABLE MONITOR
          </button>
        </div>
      </section>

      {/* ── Clear Log ── */}
      <section className="card p-4">
        <h3
          className="font-display font-semibold mb-3"
          style={{ letterSpacing: '0.08em', fontSize: '0.85rem', color: 'var(--text-muted)' }}
        >
          MAINTENANCE
        </h3>
        <button
          onClick={() => run('admin_clear_log', [], 'Log cleared')}
          disabled={isPending}
          className="btn btn-danger"
          style={{ width: '100%' }}
        >
          CLEAR INCIDENT LOG &amp; RESET STATE
        </button>
      </section>

      {/* ── TX Status ── */}
      {isPending && (
        <div
          className="flex items-center gap-2 mt-2"
          style={{ color: 'var(--accent-safe)', fontSize: '0.75rem' }}
        >
          <div
            className="status-dot"
            style={{ background: 'var(--accent-safe)', animation: 'blink-warning 0.8s infinite' }}
          />
          <span className="font-mono">Transaction pending…</span>
        </div>
      )}
    </div>
  )
}
