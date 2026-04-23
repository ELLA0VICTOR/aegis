import { createAccount, createClient } from 'genlayer-js'
import { localnet } from 'genlayer-js/chains'
import { ADMIN_PRIVATE_KEY, BACKEND_URL, CONTRACT_ADDRESS, GENLAYER_RPC_URL } from './constants.js'

let _client = null

function normalizePrivateKey(value) {
  const trimmed = (value || '').trim()
  if (!trimmed) return ''
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return `0x${trimmed}`
  }
  return trimmed
}

function getReadAccount() {
  const normalizedKey = normalizePrivateKey(ADMIN_PRIVATE_KEY)

  if (normalizedKey) {
    try {
      return createAccount(normalizedKey)
    } catch {
      // Keep reads working even if the admin key is malformed.
      return createAccount()
    }
  }

  return createAccount()
}

function normalizeResult(value) {
  if (typeof value === 'bigint') {
    return Number.isSafeInteger(Number(value)) ? Number(value) : value.toString()
  }

  if (Array.isArray(value)) {
    return value.map(normalizeResult)
  }

  if (value instanceof Map) {
    return Object.fromEntries(
      Array.from(value.entries(), ([key, entryValue]) => [key, normalizeResult(entryValue)])
    )
  }

  if (typeof value === 'string') {
    const addressMatch = value.match(/^Address\("(.+)"\)$/)
    return addressMatch ? addressMatch[1] : value
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, normalizeResult(entryValue)])
    )
  }

  return value
}

export function getClient() {
  if (!_client) {
    _client = createClient({
      chain: localnet,
      account: getReadAccount(),
      ...(GENLAYER_RPC_URL ? { endpoint: GENLAYER_RPC_URL } : {}),
    })
  }
  return _client
}

export async function readContract(functionName, args = []) {
  const client = getClient()
  const result = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
  })
  return normalizeResult(result)
}

export async function writeContractLocally(functionName, args = []) {
  const normalizedKey = normalizePrivateKey(ADMIN_PRIVATE_KEY)
  if (!normalizedKey) {
    throw new Error('No local admin signer configured')
  }

  const account = createAccount(normalizedKey)
  const client = getClient()
  return client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    account,
  })
}

export async function waitForTx(hash) {
  const client = getClient()
  return client.waitForTransactionReceipt({ hash, status: 'FINALIZED' })
}

export async function submitBackendTransaction(functionName, args = [], token = '') {
  if (!BACKEND_URL) {
    throw new Error('Backend signer URL is not configured')
  }

  const response = await fetch(`${BACKEND_URL}/api/admin/tx`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ functionName, args }),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error || 'Backend transaction request failed')
  }

  return payload
}

export { CONTRACT_ADDRESS }
