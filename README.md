# AEGIS — Protocol Sentinel

> GenLayer Intelligent Contract system for on-chain DeFi hack detection and emergency protocol pause.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  AEGIS Intelligent Contract  (contracts/aegis.py)               │
│                                                                 │
│  ┌──────────────┐   ┌───────────────┐   ┌──────────────────┐  │
│  │ Trusted URL  │──▶│  LLM Analysis │──▶│  On-Chain State  │  │
│  │  Whitelist   │   │  Risk Score   │   │  risk_level u8   │  │
│  └──────────────┘   └───────────────┘   │  paused bool     │  │
│                                         │  incident_log    │  │
│                                         └──────────────────┘  │
│                                                 │              │
│                          risk_level ≥ 7 ────────▶ auto-pause   │
└─────────────────────────────────────────────────────────────────┘
         ▲
         │  genlayer-js SDK
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  React Frontend  (src/)                                         │
│  Dashboard: RiskGauge + IncidentFeed + SourceMonitor           │
│  Admin:     ManualPause + FakeInject + RiskOverride            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Deploy the Contract (GenLayer Studio)

1. Open GenLayer Studio at [http://localhost:8080](http://localhost:8080)
2. Load `contracts/aegis.py`
3. Deploy with these constructor arguments:
   ```
   admin_address = "0xYourAdminAddressHere"
   protected_protocol = "Uniswap"
   protocol_aliases_csv = "UNI,Uniswap Protocol"
   ```
4. Copy the deployed contract address

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```bash
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
VITE_ADMIN_PRIVATE_KEY=0xYourAdminPrivateKey   # local dev only
VITE_NETWORK=localnet
```

### 4. Run Frontend

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Contract Methods

### View Methods (free, no transaction)

| Method | Returns | Description |
|--------|---------|-------------|
| `get_risk_level()` | `int` | Current risk score (0–10) |
| `is_paused()` | `bool` | True if protocol is paused |
| `can_deposit()` | `bool` | True if deposits are allowed |
| `get_pause_reason()` | `str` | Reason string for current pause |
| `get_risk_category()` | `str` | NONE/ELEVATED/HIGH/CRITICAL/EMERGENCY |
| `get_protocol_context()` | `dict` | Protected protocol name and aliases |
| `get_full_state()` | `dict` | All state in one call |
| `get_incident_log()` | `list` | Up to 20 most recent incidents |
| `get_trusted_sources()` | `list` | Whitelisted URLs |
| `get_admin()` | `str` | Admin address |

### Write Methods (require transaction)

| Method | Auth | Description |
|--------|------|-------------|
| `run_risk_check(source_url)` | Anyone | Live web + LLM risk check on trusted URL |
| `admin_override_pause(should_pause, reason)` | Admin | Manual pause/unpause |
| `admin_update_protocol_context(protocol, aliases)` | Admin | Update the protected protocol context |
| `admin_inject_fake_incident(level, reason, label)` | Admin | Inject test incident |
| `admin_set_risk_level(level, reason)` | Admin | Directly set risk level |
| `admin_set_monitor_enabled(enabled)` | Admin | Toggle monitoring on/off |
| `admin_clear_log()` | Admin | Clear log and reset state |

---

## Risk Levels

| Score | Category | Behavior |
|-------|----------|----------|
| 0–2 | NONE | Normal — deposits allowed |
| 3–4 | ELEVATED | Unusual activity — monitoring |
| 5–6 | HIGH | Potential attack signal |
| 7–8 | CRITICAL | **AUTO-PAUSE triggered** |
| 9–10 | EMERGENCY | **AUTO-PAUSE triggered** |

---

## Testing

```bash
# Fake incident tests — no internet required, runs instantly
pytest tests/test_aegis_fake.py -v

# Real web source tests — requires GenLayer node + internet
pytest tests/test_aegis_real.py -v -m real -s

# Skip real tests in CI
pytest tests/ -m "not real"
```

---

## Trusted Sources

The contract only fetches from these whitelisted URLs:

- `https://api.llama.fi/tvl/uniswap` — DeFiLlama Uniswap TVL API
- `https://rekt.news/` — DeFi hack news
- `https://defillama.com/hacks` — DeFiLlama hacks tracker

To add sources: edit `TRUSTED_SOURCES` in `contracts/aegis.py` and redeploy.

---

## Security Properties

- **URL Whitelist enforced**: `run_risk_check` rejects any URL not in `TRUSTED_SOURCES`
- **Equivalence Principle**: Validators re-run the risk check independently; only ±1 risk-score tolerance allowed
- **No autonomous fund movement**: v1 only toggles a `paused` flag — it never transfers tokens
- **Admin-only writes**: All state-mutating admin methods verify `gl.message.sender_address == self.admin`
- **Integer-only math**: All counters use `u8`/`u256` — no floating point

---

## Project Structure

```
aegis/
├── contracts/
│   └── aegis.py              ← GenLayer Intelligent Contract
├── tests/
│   ├── test_aegis_fake.py    ← Offline tests (fake incident injection)
│   └── test_aegis_real.py    ← Live web tests (marked 'real')
├── src/
│   ├── main.jsx              ← React entry point
│   ├── App.jsx               ← Root + nav
│   ├── index.css             ← Global styles + CSS variables
│   ├── lib/
│   │   ├── client.js         ← genlayer-js singleton
│   │   └── constants.js      ← Contract address, colors, config
│   ├── hooks/
│   │   ├── useContractState.js     ← Polls contract state every 5s
│   │   └── useTransactionStatus.js ← Tx lifecycle management
│   ├── components/
│   │   ├── RiskGauge.jsx     ← Animated SVG circular gauge
│   │   ├── IncidentFeed.jsx  ← Scrollable incident log
│   │   ├── StatusBanner.jsx  ← Full-width PAUSED alert banner
│   │   ├── AdminPanel.jsx    ← Manual override controls
│   │   ├── SourceMonitor.jsx ← Source list with scan triggers
│   │   ├── TxToast.jsx       ← Toast notification helpers
│   │   └── HexAddress.jsx    ← Monospace address display
│   └── pages/
│       ├── Dashboard.jsx     ← Main monitoring view
│       └── Admin.jsx         ← Admin command center
├── .env.example
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## Frontend Design

**Aesthetic**: OBSIDIAN SENTINEL — dark operations center aesthetic.

- **Background**: `#0A0B0D` with SVG hex-grid overlay
- **Fonts**: Rajdhani (display) · IBM Plex Mono (addresses/data) · Outfit (UI)
- **Accent Safe**: `#00D4AA` teal-green
- **Accent Warn**: `#F5A623` amber  
- **Accent Danger**: `#FF4444` red
- **No shadows** — glow effects only
- **Staggered page load** with `animation-delay`
- **5-second polling** with optimistic UI updates

---

*Built for the GenLayer Hackathon. AEGIS — because lives depend on it.*
