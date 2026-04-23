# AEGIS

AEGIS is a multi-protocol DeFi risk sentinel built on GenLayer.

It lets an admin create protocol profiles, attach real trusted web sources to each profile, run live web-assisted risk checks, and automatically pause deposits for a protocol when the assessed risk crosses a critical threshold.

## What It Does

- Creates any number of protocol profiles from one contract deployment
- Stores per-profile risk state, pause state, monitoring state, and incident history on-chain
- Reads live web evidence from admin-approved sources
- Uses GenLayer validator consensus to score protocol-specific risk
- Auto-pauses a profile when the risk score is `7` or higher
- Supports manual overrides and fake incident injection for testing

This is not a generic price oracle and it does not move funds by itself. The current MVP is the decision engine and pause-state layer that other DeFi products could integrate with.

## Stack

### Contract

- GenLayer Intelligent Contract in Python
- `TreeMap`, `DynArray`, `u8`, `u256`
- `gl.vm.run_nondet_unsafe(...)` for live risk evaluation
- `gl.nondet.web.get(...)` plus `gl.nondet.exec_prompt(...)` for web-assisted protocol assessment

### Frontend

- React
- Vite
- Tailwind CSS
- `genlayer-js`

### Backend signer

- Node.js
- Express
- `genlayer-js`
- bearer-token authentication with origin allowlisting

## Multi-Protocol Model

One deployed contract can manage many protocols at once.

Each protocol profile has its own:

- `protected_protocol`
- `protocol_aliases_csv`
- trusted source whitelist
- `risk_level`
- `risk_category`
- `paused`
- `pause_reason`
- `monitor_enabled`
- `check_count`
- incident log

Nothing is hardcoded to one specific protocol anymore. Production safety still depends on the admin supplying good sources for each profile.

## Project Structure

```text
aegis/
|-- contracts/
|   `-- aegis.py
|-- server/
|   |-- index.js
|   |-- package.json
|   `-- .env.example
|-- src/
|   |-- components/
|   |-- hooks/
|   |-- lib/
|   |-- pages/
|   |-- App.jsx
|   |-- index.css
|   `-- main.jsx
|-- tests/
|   |-- test_aegis_fake.py
|   `-- test_aegis_real.py
|-- .env.example
|-- index.html
|-- package.json
`-- README.md
```

## Deploy

### 1. Install dependencies

```bash
npm install
```

### 2. Deploy in GenLayer Studio

Open GenLayer Studio, load `contracts/aegis.py`, and deploy with:

```text
admin_address = "0xYourAdminAddressHere"
```

After deployment, copy the contract address.

### 3. Configure the frontend

Create a local `.env` file:

```text
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
VITE_BACKEND_URL=https://your-render-service.onrender.com
VITE_GENLAYER_RPC_URL=https://studio.genlayer.com/api
```

`VITE_ADMIN_PRIVATE_KEY` is optional and should only be used for local-only fallback testing. Do not set it in Vercel.

### 4. Configure the Render signer backend

Create `server/.env` from `server/.env.example`:

```text
CONTRACT_ADDRESS=0xYourDeployedContractAddress
GENLAYER_RPC_URL=https://studio.genlayer.com/api
ADMIN_PRIVATE_KEY=0xYourAdminPrivateKey
ADMIN_API_TOKEN=replace-with-a-long-random-token
ALLOWED_ORIGINS=http://localhost:5173,https://your-vercel-app.vercel.app
```

Render service settings:

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`

The private key stays on Render only.

### 5. Run the app

```bash
npm run dev
```

### 6. Build for production

```bash
npm run build
```

## Contract API

### View methods

- `get_admin()`
- `get_protocol_count()`
- `get_protocol_ids()`
- `list_protocols()`
- `get_protocol(profile_id)`
- `get_incident_log(profile_id)`
- `get_trusted_sources(profile_id)`

### Write methods

- `admin_create_protocol(protected_protocol, protocol_aliases_csv, trusted_sources_text)`
- `admin_update_protocol_context(profile_id, protected_protocol, protocol_aliases_csv="")`
- `admin_update_trusted_sources(profile_id, trusted_sources_text)`
- `admin_set_monitor_enabled(profile_id, enabled)`
- `run_risk_check(profile_id, source_url)`
- `admin_override_pause(profile_id, should_pause, reason)`
- `admin_set_risk_level(profile_id, level, reason)`
- `admin_inject_fake_incident(profile_id, risk_level, reason, source_label)`
- `admin_clear_protocol(profile_id)`

## Risk Behavior

- `0-2` -> `NONE`
- `3-4` -> `ELEVATED`
- `5-6` -> `HIGH`
- `7-8` -> `CRITICAL`
- `9-10` -> `EMERGENCY`

If a profile reaches `7` or above during `run_risk_check`, AEGIS automatically pauses that profile.

Incident logging is selective:

- routine low-risk scans can update `check_count` without creating an incident record
- incidents are logged for meaningful elevated risk or pause events

## How Live Checks Work

For a selected protocol profile:

1. The admin or frontend triggers `run_risk_check(profile_id, source_url)`.
2. The contract verifies the source is in that profile's whitelist.
3. The contract fetches the live page content.
4. It checks whether the page actually mentions the protected protocol or one of its aliases.
5. If there is a relevant match, GenLayer evaluates the excerpt and returns a bounded risk score plus a short reason.
6. Validators independently re-run the same logic and compare stable derived fields.
7. The profile state is updated on-chain.

This keeps the system protocol-aware instead of reacting to unrelated hacks elsewhere in DeFi.

## Frontend Flow

### Dashboard

- choose a protocol profile
- see current risk state and pause state
- see the incident feed
- trigger live scans from trusted sources

### Admin

- create protocol profiles
- edit protocol names and aliases
- update trusted source lists
- enable or disable monitoring
- manually pause or resume a profile
- manually set risk level
- inject fake incidents for testing
- clear a profile's state

When `VITE_BACKEND_URL` is configured, the frontend sends writes through the signer backend and keeps the private key out of the browser. The admin API token is entered at runtime and stored only for the current browser session.

## Example Profile Setup

Example input for a `Uniswap` profile:

```text
Protocol name:
Uniswap

Aliases:
UNI,Uniswap Protocol

Trusted source URLs:
https://api.llama.fi/tvl/uniswap
https://rekt.news/
https://defillama.com/hacks
```

You can create a different profile with completely different real sources after deployment. The contract is no longer locked to one protocol.

## Testing

### Studio / frontend testing

- create a profile
- run a real scan from the dashboard
- confirm `check_count` and `last_checked_ts` update
- use `admin_inject_fake_incident(...)` to test elevated-risk and auto-pause flows quickly

### Linting

```bash
genvm-lint lint contracts/aegis.py
genvm-lint validate contracts/aegis.py
genvm-lint check contracts/aegis.py --json
```

### Python tests

Fake and real test files are included:

- `tests/test_aegis_fake.py`
- `tests/test_aegis_real.py`

The fake tests validate profile creation, source management, admin actions, and pause logic without depending on live web updates.

## Security Notes

- trusted sources are per-profile and admin-controlled
- a source must be explicitly whitelisted before it can be scanned
- the contract only pauses the affected profile, not every profile globally
- there is no token transfer or treasury movement in this MVP
- admin writes require the configured admin address
- the signer backend only allows a fixed whitelist of contract write methods
- the signer backend requires a bearer token and can restrict allowed origins
- `.env` is ignored by git so private keys stay local

## Production Notes

AEGIS becomes useful when paired with high-signal sources, especially:

- official status pages
- official governance forums
- official incident writeups
- carefully chosen third-party monitoring pages

Better sources produce better risk checks. The safest workflow is:

1. admin defines protocol name and aliases
2. admin supplies or approves trusted sources
3. AEGIS monitors only those sources

## Current Version

- multi-protocol contract deployment
- frontend profile switching
- real web-assisted checks
- fake incident simulation for testing
- mobile-friendly dashboard and admin controls

Built for GenLayer as a real, configurable DeFi risk sentinel rather than a single-protocol demo.
