// Contract configuration
export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  '0xa3b7C6E1454cb11a243B2a5dDb05161d725f08E1'

// Admin private key for demo write operations only
export const ADMIN_PRIVATE_KEY = import.meta.env.VITE_ADMIN_PRIVATE_KEY || ''

// RPC endpoint used by genlayer-js
export const GENLAYER_RPC_URL =
  import.meta.env.VITE_GENLAYER_RPC_URL ||
  'https://studio.genlayer.com/api'

// Risk level color mapping
export const RISK_COLORS = {
  NONE: '#00D4AA',
  ELEVATED: '#F5A623',
  HIGH: '#FF8C00',
  CRITICAL: '#FF4444',
  EMERGENCY: '#FF0000',
  MANUAL_PAUSE: '#FF4444',
  UNKNOWN: 'rgba(232,227,213,0.3)',
}

// Polling interval in ms
export const POLL_INTERVAL_MS = 5000

// Trusted sources display names
export const SOURCE_NAMES = {
  'https://api.llama.fi/tvl/uniswap': 'DeFiLlama - Uniswap TVL',
  'https://rekt.news/': 'Rekt News',
  'https://defillama.com/hacks': 'DeFiLlama - Hacks',
}
