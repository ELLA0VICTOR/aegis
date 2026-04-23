import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { SOURCE_NAMES } from '../lib/constants.js'
import { useTransaction } from '../hooks/useTransactionStatus.js'

export function SourceMonitor({ selectedProtocolId, lastSourceUrl, lastCheckedTs, sources = [] }) {
  const { execute, txStatus } = useTransaction()
  const [running, setRunning] = useState(null)

  async function triggerCheck(url) {
    if (selectedProtocolId == null) return

    setRunning(url)
    try {
      await execute('run_risk_check', [selectedProtocolId, url])
      toast.success('Risk check submitted', {
        style: {
          background: '#0F1114',
          color: '#00D4AA',
          border: '1px solid rgba(0,212,170,0.3)',
        },
      })
    } catch (err) {
      toast.error(`Check failed: ${err.message?.slice(0, 80)}`, {
        style: {
          background: '#0F1114',
          color: '#FF4444',
          border: '1px solid rgba(255,68,68,0.3)',
        },
      })
    } finally {
      setRunning(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {sources.length === 0 && (
        <div className="card px-3 py-4">
          <div
            className="font-mono"
            style={{ fontSize: '0.68rem', color: 'var(--text-dim)', lineHeight: 1.5 }}
          >
            No trusted sources configured for this profile yet.
          </div>
        </div>
      )}

      {sources.map((url, i) => {
        const isLast = url === lastSourceUrl
        const name = SOURCE_NAMES[url] || url.replace('https://', '')
        const isRunning = running === url

        return (
          <div
            key={i}
            className="card flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center"
            style={{
              borderColor: isLast ? 'rgba(0,212,170,0.2)' : 'var(--border)',
              background: isLast ? 'rgba(0,212,170,0.03)' : 'var(--bg-card)',
            }}
          >
            <div
              className="status-dot flex-shrink-0"
              style={{
                background: isLast ? 'var(--accent-safe)' : 'rgba(255,255,255,0.15)',
                boxShadow: isLast ? '0 0 8px var(--accent-safe)' : 'none',
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="font-ui text-sm" style={{ color: 'var(--text-primary)', marginBottom: 2 }}>
                {name}
              </div>
              <div
                className="font-mono"
                style={{
                  fontSize: '0.62rem',
                  color: 'var(--text-dim)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {url}
              </div>
              {isLast && lastCheckedTs && (
                <div
                  className="font-mono"
                  style={{
                    fontSize: '0.6rem',
                    color: 'var(--accent-safe)',
                    opacity: 0.7,
                    marginTop: 2,
                  }}
                >
                  Last checked: {lastCheckedTs}
                </div>
              )}
            </div>
            <button
              onClick={() => triggerCheck(url)}
              disabled={selectedProtocolId == null || !!running || txStatus === 'pending'}
              className="btn btn-safe w-full flex-shrink-0 sm:w-auto"
              style={{ fontSize: '0.65rem', padding: '4px 10px' }}
            >
              {isRunning ? 'SCANNING...' : 'SCAN'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
