import React from 'react'
import { useContractState } from '../hooks/useContractState.js'
import { RiskGauge }     from '../components/RiskGauge.jsx'
import { IncidentFeed }  from '../components/IncidentFeed.jsx'
import { StatusBanner }  from '../components/StatusBanner.jsx'
import { SourceMonitor } from '../components/SourceMonitor.jsx'
import { HexAddress }    from '../components/HexAddress.jsx'
import { RISK_COLORS }   from '../lib/constants.js'

// ── Custom SVG shield logo ─────────────────────────────────────────────────
function AegisLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 32" fill="none">
      <path
        d="M14 1L26 6V17C26 23.6 20.6 29.4 14 31C7.4 29.4 2 23.6 2 17V6L14 1Z"
        stroke="var(--accent-safe)"
        strokeWidth="1.5"
        fill="rgba(0,212,170,0.06)"
      />
      <path
        d="M9 16l3.5 3.5L19 12"
        stroke="var(--accent-safe)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, color, delay = 0, subtext }) {
  return (
    <div
      className="card anim-fade-up px-4 py-4"
      style={{ animationDelay: `${delay}s` }}
    >
      <div
        className="font-display"
        style={{
          fontSize:      '0.65rem',
          letterSpacing: '0.1em',
          color:         'var(--text-dim)',
          marginBottom:  6,
        }}
      >
        {label}
      </div>
      <div
        className="font-display font-bold"
        style={{ fontSize: '1.8rem', lineHeight: 1, color: color || 'var(--text-primary)' }}
      >
        {value}
      </div>
      {subtext && (
        <div
          className="font-mono mt-1"
          style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}
        >
          {subtext}
        </div>
      )}
    </div>
  )
}

// ── Radar icon ─────────────────────────────────────────────────────────────
function RadarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6"   stroke="var(--accent-safe)" strokeWidth="1" opacity="0.4" />
      <circle cx="7" cy="7" r="3.5" stroke="var(--accent-safe)" strokeWidth="1" opacity="0.6" />
      <circle cx="7" cy="7" r="1"   fill="var(--accent-safe)" />
      <line
        x1="7" y1="7" x2="7" y2="1.5"
        stroke="var(--accent-safe)" strokeWidth="1"
        style={{ transformOrigin: '7px 7px', animation: 'spin 3s linear infinite' }}
      />
    </svg>
  )
}

// ── Log icon ───────────────────────────────────────────────────────────────
function LogIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="1" y="1" width="10" height="10" stroke="var(--accent-danger)" strokeWidth="1" opacity="0.6" />
      <line x1="1" y1="4"  x2="11" y2="4"  stroke="var(--accent-danger)" strokeWidth="0.5" opacity="0.3" />
      <line x1="1" y1="7"  x2="11" y2="7"  stroke="var(--accent-danger)" strokeWidth="0.5" opacity="0.3" />
      <line x1="3" y1="1"  x2="3"  y2="11" stroke="var(--accent-danger)" strokeWidth="0.5" opacity="0.15" />
    </svg>
  )
}

// ── Loading screen ─────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4">
        <AegisLogo size={40} />
        <span
          className="font-mono text-sm"
          style={{ color: 'var(--text-muted)', animation: 'blink-warning 1.2s infinite' }}
        >
          CONNECTING TO SENTINEL…
        </span>
      </div>
    </div>
  )
}

// ── Error screen ───────────────────────────────────────────────────────────
function ErrorScreen({ error, refetch }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="card p-6 text-center" style={{ maxWidth: 440 }}>
        <div
          className="font-display font-bold mb-2"
          style={{ color: 'var(--accent-danger)', letterSpacing: '0.08em' }}
        >
          CONTRACT UNREACHABLE
        </div>
        <div className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
          {error}
        </div>
        <div
          className="font-mono mt-3"
          style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}
        >
          Ensure GenLayer Studio is running and the deployed contract address is configured.
        </div>
        <button onClick={refetch} className="btn btn-safe mt-4">
          RETRY
        </button>
      </div>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export function Dashboard() {
  const { state, log, loading, error, refetch } = useContractState()

  if (loading) return <LoadingScreen />
  if (error)   return <ErrorScreen error={error} refetch={refetch} />

  const riskColor = RISK_COLORS[state?.risk_category] || 'var(--text-muted)'

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Pause Banner ── */}
      <StatusBanner paused={state?.paused} reason={state?.pause_reason} />

      {/* ── Header ── */}
      <header
        className="anim-fade-up flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <AegisLogo size={24} />
          <div>
            <div
              className="font-display font-bold"
              style={{ fontSize: '1.1rem', letterSpacing: '0.14em' }}
            >
              AEGIS
            </div>
            <div
              className="font-mono"
              style={{ fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '0.08em' }}
            >
              PROTECTING {state?.protected_protocol || 'UNSET'} // GENLAYER
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`status-dot ${state?.paused ? 'paused' : 'active'}`} />
            <span
              className="font-display"
              style={{
                fontSize:      '0.72rem',
                letterSpacing: '0.1em',
                color: state?.paused ? 'var(--accent-danger)' : 'var(--accent-safe)',
              }}
            >
              {state?.paused ? 'PAUSED' : 'ACTIVE'}
            </span>
          </div>
          <div
            className="font-mono"
            style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}
          >
            {state?.check_count ?? 0} checks
          </div>
          <button
            onClick={refetch}
            className="btn btn-safe"
            style={{ fontSize: '0.65rem', padding: '4px 10px' }}
          >
            REFRESH
          </button>
        </div>
      </header>

      {/* ── Main Grid ── */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Gauge + Stats ── */}
        <div className="flex flex-col gap-4">

          {/* Risk Gauge Card */}
          <div
            className="card anim-fade-up anim-delay-1 p-6 flex flex-col items-center gap-4"
          >
            <div
              className="font-display w-full"
              style={{
                fontSize:      '0.65rem',
                letterSpacing: '0.12em',
                color:         'var(--text-dim)',
                marginBottom:  -8,
              }}
            >
              THREAT LEVEL
            </div>

            <RiskGauge
              level={state?.risk_level ?? 0}
              category={state?.risk_category ?? 'NONE'}
              paused={state?.paused ?? false}
            />

            <div className="w-full text-center">
              <div
                className="font-display font-semibold"
                style={{ fontSize: '1rem', letterSpacing: '0.12em', color: riskColor }}
              >
                {state?.risk_category ?? 'NONE'}
              </div>
              {state?.pause_reason && (
                <div
                  className="font-mono mt-2 px-2"
                  style={{ fontSize: '0.65rem', color: 'var(--text-dim)', lineHeight: 1.5 }}
                >
                  {state.pause_reason.slice(0, 90)}
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="CAN DEPOSIT"
              value={state?.paused ? 'NO' : 'YES'}
              color={state?.paused ? 'var(--accent-danger)' : 'var(--accent-safe)'}
              delay={0.2}
            />
            <StatCard
              label="INCIDENTS"
              value={state?.incident_count ?? 0}
              color="var(--text-primary)"
              delay={0.3}
            />
            <StatCard
              label="MONITOR"
              value={state?.monitor_enabled ? 'ON' : 'OFF'}
              color={state?.monitor_enabled ? 'var(--accent-safe)' : 'var(--accent-danger)'}
              delay={0.35}
            />
            <StatCard
              label="TOTAL CHECKS"
              value={state?.check_count ?? 0}
              color="var(--text-muted)"
              delay={0.4}
            />
          </div>
        </div>

        {/* ── Middle: Source Monitor ── */}
        <div
          className="card anim-fade-up anim-delay-2 flex flex-col"
          style={{ minHeight: 400 }}
        >
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <RadarIcon />
            <span
              className="font-display"
              style={{ fontSize: '0.72rem', letterSpacing: '0.1em', color: 'var(--text-muted)' }}
            >
              MONITORED SOURCES
            </span>
          </div>
          <div className="flex-1 p-4">
            <SourceMonitor
              lastSourceUrl={state?.last_source_url}
              lastCheckedTs={state?.last_checked_ts}
              sources={[
                'https://api.llama.fi/tvl/uniswap',
                'https://rekt.news/',
                'https://defillama.com/hacks',
              ]}
            />
          </div>
        </div>

        {/* ── Right: Incident Feed ── */}
        <div className="card anim-fade-up anim-delay-3 flex flex-col">
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <LogIcon />
              <span
                className="font-display"
                style={{ fontSize: '0.72rem', letterSpacing: '0.1em', color: 'var(--text-muted)' }}
              >
                INCIDENT LOG
              </span>
            </div>
            <span
              className="font-mono"
              style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}
            >
              {log.length} records
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <IncidentFeed incidents={log} />
          </div>
        </div>

      </main>

      {/* ── Footer ── */}
      <footer
        className="px-6 py-3 flex items-center justify-between"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-4">
          <span
            className="font-mono"
            style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}
          >
            AEGIS v1.0 // GENLAYER INTELLIGENT CONTRACT
          </span>
          {state?.last_checked_ts && (
            <span
              className="font-mono"
              style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}
            >
              Last check: {state.last_checked_ts}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div
            className="status-dot"
            style={{
              background: 'var(--accent-safe)',
              boxShadow:  '0 0 6px var(--accent-safe)',
              animation:  'glow-pulse 2s infinite',
            }}
          />
          <span
            className="font-mono"
            style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}
          >
            Polling every 5s
          </span>
        </div>
      </footer>
    </div>
  )
}
