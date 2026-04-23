import React, { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useTransaction } from '../hooks/useTransactionStatus.js'

const toastStyle = {
  success: { background: '#0F1114', color: '#00D4AA', border: '1px solid rgba(0,212,170,0.3)' },
  error: { background: '#0F1114', color: '#FF4444', border: '1px solid rgba(255,68,68,0.3)' },
}

export function AdminPanel({
  protocols,
  state,
  refetch,
  selectedProtocolId,
  setSelectedProtocolId,
}) {
  const { execute, txStatus } = useTransaction()
  const [reason, setReason] = useState('')
  const [fakeLevel, setFakeLevel] = useState(8)
  const [fakeReason, setFakeReason] = useState('')
  const [fakeLabel, setFakeLabel] = useState('')
  const [manualLevel, setManualLevel] = useState(0)
  const [protocolName, setProtocolName] = useState('')
  const [protocolAliases, setProtocolAliases] = useState('')
  const [trustedSourcesText, setTrustedSourcesText] = useState('')
  const [newProtocolName, setNewProtocolName] = useState('')
  const [newProtocolAliases, setNewProtocolAliases] = useState('')
  const [newTrustedSources, setNewTrustedSources] = useState('')
  const lastProtocolRef = useRef('')
  const lastAliasesRef = useRef('')
  const lastSourcesRef = useRef('')

  const isPending = txStatus === 'pending'
  const hasSelectedProfile = selectedProtocolId != null && !!state

  useEffect(() => {
    const nextProtocol = state?.protected_protocol ?? ''
    if (protocolName === '' || protocolName === lastProtocolRef.current) {
      setProtocolName(nextProtocol)
    }
    lastProtocolRef.current = nextProtocol
  }, [state?.protected_protocol, protocolName])

  useEffect(() => {
    const nextAliases = state?.protocol_aliases_csv ?? ''
    if (protocolAliases === '' || protocolAliases === lastAliasesRef.current) {
      setProtocolAliases(nextAliases)
    }
    lastAliasesRef.current = nextAliases
  }, [state?.protocol_aliases_csv, protocolAliases])

  useEffect(() => {
    const nextSources = (state?.trusted_sources ?? []).join('\n')
    if (trustedSourcesText === '' || trustedSourcesText === lastSourcesRef.current) {
      setTrustedSourcesText(nextSources)
    }
    lastSourcesRef.current = nextSources
  }, [state?.trusted_sources, trustedSourcesText])

  async function run(fn, args, successMsg, onSuccess) {
    try {
      await execute(fn, args)
      toast.success(successMsg, { style: toastStyle.success })
      setTimeout(async () => {
        await refetch()
        if (onSuccess) onSuccess()
      }, 1500)
    } catch (err) {
      toast.error(err.message?.slice(0, 100) || 'Transaction failed', {
        style: toastStyle.error,
      })
    }
  }

  const inputStyle = {
    width: '100%',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '1px',
    padding: '8px 12px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.8rem',
    color: 'var(--text-primary)',
    outline: 'none',
  }

  const fakeLevelColor =
    fakeLevel >= 7
      ? 'var(--accent-danger)'
      : fakeLevel >= 3
        ? 'var(--accent-warn)'
        : 'var(--accent-safe)'

  return (
    <div className="flex flex-col gap-6">
      <section className="card p-4">
        <h3
          className="font-display font-semibold mb-3"
          style={{ letterSpacing: '0.08em', fontSize: '0.85rem', color: 'var(--text-muted)' }}
        >
          CREATE PROTOCOL PROFILE
        </h3>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="Protocol name..."
            value={newProtocolName}
            onChange={e => setNewProtocolName(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Aliases, comma separated..."
            value={newProtocolAliases}
            onChange={e => setNewProtocolAliases(e.target.value)}
            style={inputStyle}
          />
          <textarea
            placeholder="Trusted source URLs, one per line..."
            value={newTrustedSources}
            onChange={e => setNewTrustedSources(e.target.value)}
            style={{ ...inputStyle, minHeight: 110, resize: 'vertical' }}
          />
          <button
            onClick={() =>
              run(
                'admin_create_protocol',
                [newProtocolName, newProtocolAliases, newTrustedSources],
                'Protocol profile created',
                () => {
                  const newestProfile = protocols.length
                  setSelectedProtocolId(newestProfile)
                  setNewProtocolName('')
                  setNewProtocolAliases('')
                  setNewTrustedSources('')
                }
              )
            }
            disabled={isPending}
            className="btn btn-safe"
            style={{ width: '100%' }}
          >
            CREATE PROFILE
          </button>
        </div>
      </section>

      <section className="card p-4">
        <h3
          className="font-display font-semibold mb-3"
          style={{ letterSpacing: '0.08em', fontSize: '0.85rem', color: 'var(--text-muted)' }}
        >
          EDIT SELECTED PROFILE
        </h3>
        {!hasSelectedProfile ? (
          <div className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            Create and select a profile first.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Protected protocol name..."
              value={protocolName}
              onChange={e => setProtocolName(e.target.value)}
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Aliases, comma separated..."
              value={protocolAliases}
              onChange={e => setProtocolAliases(e.target.value)}
              style={inputStyle}
            />
            <textarea
              placeholder="Trusted source URLs, one per line..."
              value={trustedSourcesText}
              onChange={e => setTrustedSourcesText(e.target.value)}
              style={{ ...inputStyle, minHeight: 110, resize: 'vertical' }}
            />
            <div className="mt-1 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() =>
                  run(
                    'admin_update_protocol_context',
                    [selectedProtocolId, protocolName, protocolAliases],
                    'Protocol context updated'
                  )
                }
                disabled={isPending}
                className="btn btn-safe flex-1"
              >
                UPDATE PROTOCOL
              </button>
              <button
                onClick={() =>
                  run(
                    'admin_update_trusted_sources',
                    [selectedProtocolId, trustedSourcesText],
                    'Trusted sources updated'
                  )
                }
                disabled={isPending}
                className="btn btn-warn flex-1"
              >
                UPDATE SOURCES
              </button>
            </div>
          </div>
        )}
      </section>

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
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() =>
              run(
                'admin_override_pause',
                [selectedProtocolId, true, reason || 'Manual pause'],
                'Pause submitted'
              )
            }
            disabled={isPending || !hasSelectedProfile || state?.paused}
            className="btn btn-danger flex-1"
          >
            PAUSE PROTOCOL
          </button>
          <button
            onClick={() =>
              run(
                'admin_override_pause',
                [selectedProtocolId, false, reason || 'Manual unpause'],
                'Unpause submitted'
              )
            }
            disabled={isPending || !hasSelectedProfile || !state?.paused}
            className="btn btn-safe flex-1"
          >
            RESUME PROTOCOL
          </button>
        </div>
      </section>

      <section className="card p-4">
        <h3
          className="font-display font-semibold mb-3"
          style={{ letterSpacing: '0.08em', fontSize: '0.85rem', color: 'var(--text-muted)' }}
        >
          INJECT TEST INCIDENT
        </h3>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <label
              className="font-mono"
              style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: 80 }}
            >
              Risk Level
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={fakeLevel}
              onChange={e => setFakeLevel(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span
              className="font-display font-bold"
              style={{
                fontSize: '1.2rem',
                color: fakeLevelColor,
                minWidth: 20,
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
                [selectedProtocolId, fakeLevel, fakeReason || 'Test incident', fakeLabel || 'test'],
                'Fake incident injected'
              )
            }
            disabled={isPending || !hasSelectedProfile}
            className="btn btn-warn mt-1"
            style={{ width: '100%' }}
          >
            INJECT FAKE INCIDENT
          </button>
        </div>
      </section>

      <section className="card p-4">
        <h3
          className="font-display font-semibold mb-3"
          style={{ letterSpacing: '0.08em', fontSize: '0.85rem', color: 'var(--text-muted)' }}
        >
          MANUAL RISK LEVEL
        </h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="number"
            min="0"
            max="10"
            value={manualLevel}
            onChange={e => setManualLevel(Number(e.target.value))}
            style={{ ...inputStyle, maxWidth: 80 }}
          />
          <button
            onClick={() =>
              run(
                'admin_set_risk_level',
                [selectedProtocolId, manualLevel, reason || 'Admin manual set'],
                'Risk level set'
              )
            }
            disabled={isPending || !hasSelectedProfile}
            className="btn btn-warn"
            style={{ flex: 1 }}
          >
            SET LEVEL {manualLevel}
          </button>
        </div>
      </section>

      <section className="card p-4">
        <h3
          className="font-display font-semibold mb-3"
          style={{ letterSpacing: '0.08em', fontSize: '0.85rem', color: 'var(--text-muted)' }}
        >
          MONITOR CONTROL
        </h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() =>
              run('admin_set_monitor_enabled', [selectedProtocolId, true], 'Monitor enabled')
            }
            disabled={isPending || !hasSelectedProfile || state?.monitor_enabled}
            className="btn btn-safe flex-1"
          >
            ENABLE MONITOR
          </button>
          <button
            onClick={() =>
              run('admin_set_monitor_enabled', [selectedProtocolId, false], 'Monitor disabled')
            }
            disabled={isPending || !hasSelectedProfile || !state?.monitor_enabled}
            className="btn btn-danger flex-1"
          >
            DISABLE MONITOR
          </button>
        </div>
      </section>

      <section className="card p-4">
        <h3
          className="font-display font-semibold mb-3"
          style={{ letterSpacing: '0.08em', fontSize: '0.85rem', color: 'var(--text-muted)' }}
        >
          MAINTENANCE
        </h3>
        <button
          onClick={() => run('admin_clear_protocol', [selectedProtocolId], 'Protocol state cleared')}
          disabled={isPending || !hasSelectedProfile}
          className="btn btn-danger"
          style={{ width: '100%' }}
        >
          CLEAR SELECTED PROFILE STATE
        </button>
      </section>

      {isPending && (
        <div
          className="flex items-center gap-2 mt-2"
          style={{ color: 'var(--accent-safe)', fontSize: '0.75rem' }}
        >
          <div
            className="status-dot"
            style={{ background: 'var(--accent-safe)', animation: 'blink-warning 0.8s infinite' }}
          />
          <span className="font-mono">Transaction pending...</span>
        </div>
      )}
    </div>
  )
}
