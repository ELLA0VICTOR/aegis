import { useState, useEffect, useCallback, useRef } from 'react'
import { readContract } from '../lib/client.js'
import { POLL_INTERVAL_MS } from '../lib/constants.js'

export function useContractState() {
  const [state,   setState]   = useState(null)
  const [log,     setLog]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const pollRef = useRef(null)

  const fetchState = useCallback(async () => {
    try {
      const [fullState, incidentLog] = await Promise.all([
        readContract('get_full_state',   []),
        readContract('get_incident_log', []),
      ])
      setState(fullState)
      setLog([...incidentLog].reverse()) // most recent first
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to read contract state')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchState()
    pollRef.current = setInterval(fetchState, POLL_INTERVAL_MS)
    return () => clearInterval(pollRef.current)
  }, [fetchState])

  return { state, log, loading, error, refetch: fetchState }
}
