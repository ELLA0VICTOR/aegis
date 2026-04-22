import React from 'react'
import toast, { Toaster } from 'react-hot-toast'

/**
 * Styled toast notification system for transaction events.
 * Wraps react-hot-toast with AEGIS visual style.
 */

export function TxToast() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background:  '#0F1114',
          color:       '#E8E3D5',
          border:      '1px solid rgba(255,255,255,0.08)',
          borderRadius: '2px',
          fontFamily:  "'IBM Plex Mono', monospace",
          fontSize:    '0.78rem',
          padding:     '10px 14px',
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
  )
}

// ── Convenience helpers ──────────────────────────────────────────────────

export function txSuccess(msg) {
  toast.success(msg, {
    style: {
      background: '#0F1114',
      color:      '#00D4AA',
      border:     '1px solid rgba(0,212,170,0.3)',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize:   '0.78rem',
    },
  })
}

export function txError(msg) {
  toast.error(msg, {
    style: {
      background: '#0F1114',
      color:      '#FF4444',
      border:     '1px solid rgba(255,68,68,0.3)',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize:   '0.78rem',
    },
  })
}

export function txPending(msg = 'Transaction submitted…') {
  return toast.loading(msg, {
    style: {
      background: '#0F1114',
      color:      'rgba(232,227,213,0.6)',
      border:     '1px solid rgba(255,255,255,0.08)',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize:   '0.78rem',
    },
  })
}
