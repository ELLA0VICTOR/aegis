import React from 'react'
import { AdminPanel } from '../components/AdminPanel.jsx'
import { HexAddress } from '../components/HexAddress.jsx'
import { RiskGauge } from '../components/RiskGauge.jsx'
import { CONTRACT_ADDRESS } from '../lib/constants.js'

function AdminShieldIcon() {
  return (
    <svg width="22" height="26" viewBox="0 0 22 26" fill="none">
      <path
        d="M11 1L21 5V14C21 18.97 16.52 23.56 11 25C5.48 23.56 1 18.97 1 14V5L11 1Z"
        stroke="var(--accent-warn)"
        strokeWidth="1.5"
        fill="rgba(245,166,35,0.06)"
      />
      <path d="M11 9V13" stroke="var(--accent-warn)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="11" cy="16.5" r="0.9" fill="var(--accent-warn)" />
    </svg>
  )
}

function StatRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
      <span
        className="font-display"
        style={{ fontSize: '0.7rem', letterSpacing: '0.08em', color: 'var(--text-dim)' }}
      >
        {label}
      </span>
      <span
        className="font-mono font-medium"
        style={{ fontSize: '0.78rem', color: color || 'var(--text-primary)' }}
      >
        {value}
      </span>
    </div>
  )
}

function ProtocolSelector({ protocols, selectedProtocolId, setSelectedProtocolId }) {
  if (protocols.length === 0) return null

  return (
    <select
      value={selectedProtocolId ?? ''}
      onChange={event => setSelectedProtocolId(Number(event.target.value))}
      className="font-mono w-full sm:w-auto"
      style={{
        background: 'transparent',
        border: '1px solid var(--border)',
        color: 'var(--text-primary)',
        padding: '6px 10px',
        fontSize: '0.68rem',
      }}
    >
      {protocols.map(protocol => (
        <option key={protocol.protocol_id} value={protocol.protocol_id} style={{ color: '#111' }}>
          {protocol.protected_protocol} #{protocol.protocol_id}
        </option>
      ))}
    </select>
  )
}

export function Admin({
  protocols,
  state,
  loading,
  error,
  refetch,
  selectedProtocolId,
  setSelectedProtocolId,
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <header
        className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:flex-row sm:items-center sm:justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <AdminShieldIcon />
          <div>
            <div
              className="font-display font-bold"
              style={{ fontSize: '1rem', letterSpacing: '0.14em' }}
            >
              AEGIS ADMIN
            </div>
            <div
              className="font-mono"
              style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.08em' }}
            >
              MULTI-PROTOCOL COMMAND CENTER
            </div>
          </div>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <ProtocolSelector
            protocols={protocols}
            selectedProtocolId={selectedProtocolId}
            setSelectedProtocolId={setSelectedProtocolId}
          />
          <div
            className="flex items-center gap-2"
            style={{ minWidth: 0, color: 'var(--text-dim)' }}
          >
            <span className="font-mono" style={{ fontSize: '0.65rem' }}>
              Contract:
            </span>
            <HexAddress address={CONTRACT_ADDRESS} />
          </div>
        </div>
      </header>

      <main
        className="flex-1 p-4 sm:p-6"
        style={{ maxWidth: 1080, margin: '0 auto', width: '100%' }}
      >
        {loading ? (
          <div
            className="font-mono text-sm"
            style={{ color: 'var(--text-muted)', animation: 'blink-warning 1.2s infinite' }}
          >
            Loading contract state...
          </div>
        ) : error ? (
          <div className="card p-4" style={{ color: 'var(--accent-danger)' }}>
            <span className="font-mono text-sm">{error}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="flex flex-col gap-4">
              <div className="card p-4">
                <div
                  className="font-display font-semibold mb-4"
                  style={{ fontSize: '0.8rem', letterSpacing: '0.1em', color: 'var(--text-dim)' }}
                >
                  GLOBAL SUMMARY
                </div>

                <StatRow label="PROFILES" value={protocols.length} />
                <StatRow label="SELECTED ID" value={selectedProtocolId ?? 'NONE'} />
                <StatRow
                  label="ADMIN STATE"
                  value={state ? 'PROFILE LOADED' : 'CREATE FIRST PROFILE'}
                  color={state ? 'var(--accent-safe)' : 'var(--accent-warn)'}
                />
              </div>

              {state && (
                <div className="card p-4">
                  <div
                    className="font-display font-semibold mb-4"
                    style={{ fontSize: '0.8rem', letterSpacing: '0.1em', color: 'var(--text-dim)' }}
                  >
                    SELECTED PROFILE
                  </div>

                  <div className="flex justify-center mb-4">
                    <RiskGauge
                      level={state?.risk_level ?? 0}
                      category={state?.risk_category ?? 'NONE'}
                      paused={state?.paused ?? false}
                    />
                  </div>

                  <StatRow label="PROTOCOL" value={state?.protected_protocol ?? 'UNSET'} />
                  <StatRow label="PROFILE ID" value={state?.protocol_id ?? 'N/A'} />
                  <StatRow label="RISK LEVEL" value={`${state?.risk_level ?? 0} / 10`} />
                  <StatRow label="CATEGORY" value={state?.risk_category ?? 'NONE'} />
                  <StatRow
                    label="PAUSED"
                    value={state?.paused ? 'YES' : 'NO'}
                    color={state?.paused ? 'var(--accent-danger)' : 'var(--accent-safe)'}
                  />
                  <StatRow
                    label="MONITOR"
                    value={state?.monitor_enabled ? 'ENABLED' : 'DISABLED'}
                    color={state?.monitor_enabled ? 'var(--accent-safe)' : 'var(--accent-danger)'}
                  />
                  <StatRow label="SOURCES" value={state?.trusted_sources?.length ?? 0} />
                  <StatRow label="INCIDENTS" value={state?.incident_count ?? 0} />
                  <StatRow label="TOTAL CHECKS" value={state?.check_count ?? 0} />
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              <AdminPanel
                protocols={protocols}
                state={state}
                refetch={refetch}
                selectedProtocolId={selectedProtocolId}
                setSelectedProtocolId={setSelectedProtocolId}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
