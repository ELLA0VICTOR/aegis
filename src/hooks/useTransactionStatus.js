import { useState, useCallback } from 'react'
import { submitBackendTransaction, waitForTx, writeContractLocally } from '../lib/client.js'
import { BACKEND_URL } from '../lib/constants.js'
import { getAdminApiToken } from '../lib/adminSession.js'

export function useTransaction() {
  const [txHash,   setTxHash]   = useState(null)
  const [txStatus, setTxStatus] = useState('idle') // idle | pending | accepted | finalized | error
  const [txError,  setTxError]  = useState(null)

  const execute = useCallback(async (functionName, args = [], options = {}) => {
    setTxStatus('pending')
    setTxError(null)
    try {
      let hash = ''
      const access = options.access || 'admin'

      if (BACKEND_URL) {
        const adminToken = getAdminApiToken()
        if (access === 'admin' && !adminToken) {
          throw new Error('Set the admin API token first for admin actions')
        }

        const response = await submitBackendTransaction(functionName, args, {
          token: access === 'admin' ? adminToken : '',
          access,
        })
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
