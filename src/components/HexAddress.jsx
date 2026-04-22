import React from 'react'

/**
 * Renders a blockchain address with visual segmentation.
 * prefix(0x) | body(middle) | tail(last 4)
 * Uses IBM Plex Mono for that authentic blockchain look.
 */
export function HexAddress({ address, truncate = true, className = '' }) {
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    return (
      <span className={`hex-address ${className}`}>
        <span className="hex-prefix">0x</span>
        <span className="hex-body">{'·'.repeat(8)}</span>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}> not set</span>
      </span>
    )
  }

  const clean = address.startsWith('0x') ? address : `0x${address}`

  if (truncate) {
    const prefix = '0x'
    const body   = clean.slice(2, 6) + '···' + clean.slice(-6, -4)
    const tail   = clean.slice(-4)
    return (
      <span className={`hex-address ${className}`} title={clean}>
        <span className="hex-prefix">{prefix}</span>
        <span className="hex-body">{body}</span>
        <span className="hex-tail">{tail}</span>
      </span>
    )
  }

  const prefix = '0x'
  const body   = clean.slice(2, -4)
  const tail   = clean.slice(-4)
  return (
    <span className={`hex-address ${className}`} title={clean}>
      <span className="hex-prefix">{prefix}</span>
      <span className="hex-body">{body}</span>
      <span className="hex-tail">{tail}</span>
    </span>
  )
}
