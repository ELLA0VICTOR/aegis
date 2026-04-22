import React, { useEffect, useState } from 'react'
import { RISK_COLORS } from '../lib/constants.js'

/**
 * SVG-based animated risk gauge.
 * Circular progress ring that fills based on risk level (0-10).
 */
export function RiskGauge({ level = 0, category = 'NONE', paused = false }) {
  const [animLevel, setAnimLevel] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setAnimLevel(level), 100)
    return () => clearTimeout(t)
  }, [level])

  const radius       = 54
  const circumference = 2 * Math.PI * radius  // ≈339.3
  const progress      = (animLevel / 10) * circumference
  const dashOffset    = circumference - progress

  const color = paused
    ? '#FF4444'
    : (RISK_COLORS[category] || 'var(--accent-safe)')

  const glowColor = paused
    ? 'rgba(255,68,68,0.5)'
    : level >= 7
      ? 'rgba(255,68,68,0.3)'
      : level >= 3
        ? 'rgba(245,166,35,0.25)'
        : 'rgba(0,212,170,0.2)'

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: 140, height: 140 }}
    >
      <svg
        width="140"
        height="140"
        viewBox="0 0 140 140"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Track */}
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="8"
        />
        {/* Progress ring */}
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.4s ease',
            filter: `drop-shadow(0 0 8px ${glowColor})`,
          }}
        />
        {/* Tick marks */}
        {Array.from({ length: 10 }, (_, i) => {
          const angle = (i / 10) * 360 - 90
          const rad   = (angle * Math.PI) / 180
          const x1    = 70 + (radius + 6)  * Math.cos(rad)
          const y1    = 70 + (radius + 6)  * Math.sin(rad)
          const x2    = 70 + (radius + 12) * Math.cos(rad)
          const y2    = 70 + (radius + 12) * Math.sin(rad)
          return (
            <line
              key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(255,255,255,0.08)" strokeWidth="1"
            />
          )
        })}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display font-bold"
          style={{
            fontSize: '2.5rem',
            lineHeight: 1,
            color,
            transition: 'color 0.4s',
          }}
        >
          {level}
        </span>
        <span
          className="font-display font-medium"
          style={{
            fontSize: '0.65rem',
            letterSpacing: '0.12em',
            color: 'var(--text-muted)',
            marginTop: 2,
          }}
        >
          {paused ? 'PAUSED' : category}
        </span>
      </div>
    </div>
  )
}
