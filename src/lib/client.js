import { createAccount, createClient } from 'genlayer-js'
import { localnet } from 'genlayer-js/chains'
import { ADMIN_PRIVATE_KEY, CONTRACT_ADDRESS, GENLAYER_RPC_URL } from './constants.js'

let _client = null

function getReadAccount() {
  if (ADMIN_PRIVATE_KEY) {
    return createAccount(ADMIN_PRIVATE_KEY)
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

export async function writeContract(functionName, args = [], account) {
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

export { CONTRACT_ADDRESS }
