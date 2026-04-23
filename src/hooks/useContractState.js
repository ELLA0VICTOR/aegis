import { useState, useEffect, useCallback, useRef } from 'react'
import { readContract } from '../lib/client.js'
import { POLL_INTERVAL_MS } from '../lib/constants.js'

export function useContractState(selectedProtocolId) {
  const [protocols, setProtocols] = useState([])
  const [state, setState] = useState(null)
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [resolvedProtocolId, setResolvedProtocolId] = useState(null)
  const pollRef = useRef(null)

  const fetchState = useCallback(async () => {
    try {
      const protocolList = await readContract('list_protocols', [])
      setProtocols(protocolList)

      if (protocolList.length === 0) {
        setState(null)
        setLog([])
        setResolvedProtocolId(null)
        setError(null)
        return
      }

      const selectedMatch = protocolList.find(
        protocol => protocol.protocol_id === selectedProtocolId
      )
      const activeProtocolId = selectedMatch
        ? selectedMatch.protocol_id
        : protocolList[0].protocol_id

      setResolvedProtocolId(activeProtocolId)

      const [protocolState, incidentLog] = await Promise.all([
        readContract('get_protocol', [activeProtocolId]),
        readContract('get_incident_log', [activeProtocolId]),
      ])

      setState(protocolState)
      setLog([...incidentLog].reverse())
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to read contract state')
    } finally {
      setLoading(false)
    }
  }, [selectedProtocolId])

  useEffect(() => {
    fetchState()
    pollRef.current = setInterval(fetchState, POLL_INTERVAL_MS)
    return () => clearInterval(pollRef.current)
  }, [fetchState])

  return {
    protocols,
    state,
    log,
    loading,
    error,
    refetch: fetchState,
    resolvedProtocolId,
  }
}
