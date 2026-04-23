import React, { useMemo, useState } from 'react'
import toast from 'react-hot-toast'

const TELEGRAM_HANDLE = '@Viktor_kun0'
const TELEGRAM_URL = 'https://t.me/Viktor_kun0'

function TelegramIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21.4 4.6L18.2 19c-.2 1-.8 1.3-1.7.8l-4.7-3.4-2.2 2.1c-.2.2-.4.4-.9.4l.3-4.8 8.8-7.9c.4-.3-.1-.5-.6-.2L6.3 13 1.6 11.5c-1-.3-1-1 .2-1.4L20 3.2c.8-.3 1.6.2 1.4 1.4Z"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="rgba(0,212,170,0.08)"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ProtocolSignalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 11.5h10" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <path d="M3 9l2-2 2 1.5L11 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="3" cy="9" r="1" fill="currentColor" />
      <circle cx="5" cy="7" r="1" fill="currentColor" />
      <circle cx="7" cy="8.5" r="1" fill="currentColor" />
      <circle cx="11" cy="4" r="1" fill="currentColor" />
    </svg>
  )
}

export function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [protocolName, setProtocolName] = useState('')
  const [sources, setSources] = useState('')
  const [notes, setNotes] = useState('')

  const message = useMemo(() => {
    const name = protocolName.trim() || '[protocol name]'
    const sourceBlock = sources.trim() || '[official site / status / governance / source links]'
    const reason = notes.trim() || '[why it should be added to Aegis]'

    return [
      'Aegis protocol request',
      '',
      `Protocol: ${name}`,
      `Sources: ${sourceBlock}`,
      `Why add it: ${reason}`,
    ].join('\n')
  }, [notes, protocolName, sources])

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message)
      toast.success('Request copied. Paste it into Telegram.', {
        style: {
          background: '#0F1114',
          color: '#00D4AA',
          border: '1px solid rgba(0,212,170,0.3)',
        },
      })
    } catch {
      toast.error('Could not copy the request automatically.', {
        style: {
          background: '#0F1114',
          color: '#FF4444',
          border: '1px solid rgba(255,68,68,0.3)',
        },
      })
    }
  }

  async function openTelegram() {
    await copyMessage()
    window.open(TELEGRAM_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="feedback-widget">
      {open ? (
        <div className="card feedback-panel">
          <div className="feedback-panel__header">
            <div className="feedback-panel__title">
              <ProtocolSignalIcon />
              <span className="font-display">SUGGEST PROTOCOL</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="font-mono feedback-close"
            >
              CLOSE
            </button>
          </div>

          <p className="font-mono feedback-copy">
            Want a new protocol listed in Aegis? Send it straight to {TELEGRAM_HANDLE}.
          </p>

          <div className="feedback-fields">
            <input
              type="text"
              placeholder="Protocol name"
              value={protocolName}
              onChange={event => setProtocolName(event.target.value)}
              className="feedback-input font-mono"
            />
            <textarea
              placeholder="Official site / status page / governance / useful source links"
              value={sources}
              onChange={event => setSources(event.target.value)}
              className="feedback-input feedback-input--textarea font-mono"
            />
            <textarea
              placeholder="Why should Aegis add this protocol?"
              value={notes}
              onChange={event => setNotes(event.target.value)}
              className="feedback-input feedback-input--textarea font-mono"
            />
          </div>

          <div className="feedback-actions">
            <button type="button" onClick={copyMessage} className="btn btn-warn">
              COPY REQUEST
            </button>
            <button type="button" onClick={openTelegram} className="btn btn-safe">
              <span className="feedback-btn__icon">
                <TelegramIcon />
              </span>
              OPEN TELEGRAM
            </button>
          </div>

          <div className="feedback-hint font-mono">
            We copy the request first so you can paste it into Telegram quickly.
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="feedback-trigger"
        >
          <span className="feedback-trigger__icon">
            <TelegramIcon />
          </span>
          <span className="font-display">SUGGEST PROTOCOL</span>
        </button>
      )}
    </div>
  )
}
