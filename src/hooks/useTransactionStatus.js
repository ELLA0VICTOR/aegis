import { useState, useCallback } from 'react'
import { submitBackendTransaction, waitForTx, writeContractLocally } from '../lib/client.js'
import { BACKEND_URL } from '../lib/constants.js'
import { getAdminApiToken } from '../lib/adminSession.js'

export function useTransaction() {
  const [txHash,   setTxHash]   = useState(null)
  const [txStatus, setTxStatus] = useState('idle') // idle | pending | accepted | finalized | error
  const [txError,  setTxError]  = useState(null)

  const execute = useCallback(async (functionName, args = []) => {
    setTxStatus('pending')
    setTxError(null)
    try {
      let hash = ''

      if (BACKEND_URL) {
        const adminToken = getAdminApiToken()
        if (!adminToken) {
          throw new Error('Set the admin API token first')
        }

        const response = await submitBackendTransaction(functionName, args, adminToken)
        hash = response.hash
      } else {
        hash = await writeContractLocally(functionName, args)
      }

      setTxHash(hash)
      setTxStatus('accepted')

      // Wait for finality in background
      waitForTx(hash)
        .then(() => setTxStatus('finalized'))
        .catch(()  => setTxStatus('finalized')) // finalized either way

      return hash
    } catch (err) {
      setTxStatus('error')
      setTxError(err.message || 'Transaction failed')
      throw err
    }
  }, [])

  const reset = useCallback(() => {
    setTxHash(null)
    setTxStatus('idle')
    setTxError(null)
  }, [])

  return { txHash, txStatus, txError, execute, reset }
}
