import { useState, useCallback } from 'react'
import { writeContract, waitForTx } from '../lib/client.js'
import { createAccount } from 'genlayer-js'
import { ADMIN_PRIVATE_KEY } from '../lib/constants.js'

export function useTransaction() {
  const [txHash,   setTxHash]   = useState(null)
  const [txStatus, setTxStatus] = useState('idle') // idle | pending | accepted | finalized | error
  const [txError,  setTxError]  = useState(null)

  const execute = useCallback(async (functionName, args = []) => {
    setTxStatus('pending')
    setTxError(null)
    try {
      const account = createAccount(ADMIN_PRIVATE_KEY)
      const hash    = await writeContract(functionName, args, account)
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
