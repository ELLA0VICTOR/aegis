import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { createAccount, createClient } from 'genlayer-js'
import { localnet } from 'genlayer-js/chains'

dotenv.config()

const PORT = Number(process.env.PORT || 3001)
const CONTRACT_ADDRESS = (process.env.CONTRACT_ADDRESS || '').trim()
const GENLAYER_RPC_URL = (process.env.GENLAYER_RPC_URL || 'https://studio.genlayer.com/api').trim()
const ADMIN_API_TOKEN = (process.env.ADMIN_API_TOKEN || '').trim()
const ALLOWED_ORIGINS = parseOrigins(process.env.ALLOWED_ORIGINS || '')
const ADMIN_PRIVATE_KEY = normalizePrivateKey(process.env.ADMIN_PRIVATE_KEY || '')

const ADMIN_FUNCTIONS = new Set([
  'admin_create_protocol',
  'admin_update_protocol_context',
  'admin_update_trusted_sources',
  'admin_set_monitor_enabled',
  'admin_override_pause',
  'admin_set_risk_level',
  'admin_inject_fake_incident',
  'admin_clear_protocol',
])
const PUBLIC_FUNCTIONS = new Set(['run_risk_check'])

validateStartup()

const adminAccount = createAccount(ADMIN_PRIVATE_KEY)
const client = createClient({
  chain: localnet,
  account: adminAccount,
  ...(GENLAYER_RPC_URL ? { endpoint: GENLAYER_RPC_URL } : {}),
})

const app = express()

app.use(cors(buildCorsOptions()))
app.use(express.json({ limit: '16kb' }))

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'aegis-signer',
    contractAddress: CONTRACT_ADDRESS,
    adminAddress: adminAccount.address,
  })
})

app.post('/api/admin/tx', requireAdminToken, async (req, res) => {
  const { functionName, args = [] } = req.body || {}

  if (!ADMIN_FUNCTIONS.has(functionName)) {
    return res.status(403).json({ ok: false, error: 'Function is not allowed by the admin signer backend' })
  }

  return processTransaction(functionName, args, res)
})

app.post('/api/public/tx', async (req, res) => {
  const { functionName, args = [] } = req.body || {}

  if (!PUBLIC_FUNCTIONS.has(functionName)) {
    return res.status(403).json({ ok: false, error: 'Function is not allowed by the public signer backend' })
  }

  if (!Array.isArray(args)) {
    return res.status(400).json({ ok: false, error: 'Args must be an array' })
  }

  if (JSON.stringify(args).length > 8000) {
    return res.status(400).json({ ok: false, error: 'Args payload is too large' })
  }

  return processTransaction(functionName, args, res)
})

app.listen(PORT, () => {
  console.log(`AEGIS signer listening on :${PORT}`)
})

function normalizePrivateKey(value) {
  const trimmed = value.trim()
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return `0x${trimmed}`
  }
  return trimmed
}

function parseOrigins(value) {
  return value
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
}

function buildCorsOptions() {
  if (ALLOWED_ORIGINS.length === 0) {
    return { origin: true }
  }

  return {
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true)
      }

      return callback(new Error('Origin not allowed by AEGIS signer'))
    },
  }
}

function requireAdminToken(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const expectedHeader = `Bearer ${ADMIN_API_TOKEN}`

  if (authHeader !== expectedHeader) {
    return res.status(401).json({ ok: false, error: 'Invalid or missing admin API token' })
  }

  return next()
}

function sanitizeError(error) {
  const message = error instanceof Error ? error.message : String(error)
  return message.slice(0, 240)
}

async function processTransaction(functionName, args, res) {
  if (!Array.isArray(args)) {
    return res.status(400).json({ ok: false, error: 'Args must be an array' })
  }

  if (JSON.stringify(args).length > 8000) {
    return res.status(400).json({ ok: false, error: 'Args payload is too large' })
  }

  try {
    const hash = await client.writeContract({
      address: CONTRACT_ADDRESS,
      functionName,
      args,
      account: adminAccount,
    })

    return res.json({ ok: true, hash })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: sanitizeError(error),
    })
  }
}

function validateStartup() {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Missing CONTRACT_ADDRESS')
  }

  if (!ADMIN_PRIVATE_KEY) {
    throw new Error('Missing ADMIN_PRIVATE_KEY')
  }

  if (!ADMIN_API_TOKEN) {
    throw new Error('Missing ADMIN_API_TOKEN')
  }
}
