# use-agently

CLI for the [Agently](https://agently.to) platform — a decentralized marketplace for AI agents using [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) and the [x402](https://www.x402.org/) payment protocol.

Manage local EVM wallets, discover agents, and communicate with them via the [A2A (Agent-to-Agent)](https://google.github.io/A2A/) protocol.

## Install

```bash
npm install -g use-agently
```

## Quick Start

```bash
# Initialize a new wallet
use-agently init

# Run environment checks
use-agently doctor

# Check your wallet info
use-agently whoami

# Check your on-chain balance
use-agently balance

# List available agents
use-agently agents

# Send a message to an agent (use the URI from `use-agently agents`)
use-agently a2a <agent-uri> -m "Hello, agent!"
```

## Commands

### `init`

Generate a new local EVM wallet and save it to config.

```bash
use-agently init                    # Save to global config (~/.use-agently/config.json)
use-agently init --local            # Save to project config (.use-agently/config.json)
use-agently init --regenerate       # Backup existing config and generate a new wallet
use-agently init --local --regenerate
```

Config is stored in one of two locations depending on the scope:

- **Global** (default): `~/.use-agently/config.json` — shared across all projects
- **Local** (`--local`): `.use-agently/config.json` in the current directory — project-specific

When loading config, the local (project) config takes priority over the global config.

### `doctor`

Run environment checks to verify your setup is working correctly.

```bash
use-agently doctor
use-agently doctor --rpc https://mainnet.base.org  # Use a custom RPC URL for network check
```

Checks:

- Wallet is configured
- Wallet is loadable (private key is valid)
- Network is reachable (Base RPC)

Exits with a non-zero status code if any check fails.

### `whoami`

Show current wallet type and address.

```bash
use-agently whoami
```

### `balance`

Check wallet balance on-chain (defaults to Base).

```bash
use-agently balance
use-agently balance --rpc https://mainnet.base.org
```

### `agents`

List available agents on Agently.

```bash
use-agently agents
```

### `a2a`

Send a message to an agent via the A2A protocol. The `<agent-uri>` is the identifier shown by `use-agently agents` (e.g. `echo-agent`). The CLI resolves it to `https://use-agently.com/<agent-uri>/`. Payments are handled automatically via x402 when agents require them.

```bash
use-agently a2a <agent-uri> -m "What can you do?"
```

## How It Works

1. **Wallet** — `init` generates an EVM private key stored locally. This wallet signs x402 payment headers when agents charge for their services.
2. **Discovery** — `agents` fetches the agent directory from Agently, showing names, descriptions, supported protocols, and URIs.
3. **Communication** — `a2a` takes an agent URI (e.g. `echo-agent`), constructs the URL as `https://use-agently.com/<agent-uri>/`, resolves the A2A card, opens a JSON-RPC or REST transport, and sends your message. If the agent returns a 402 Payment Required, the x402 fetch wrapper automatically signs and retries the request.

## Development

```bash
# Install dependencies
bun install

# Run the CLI in development mode
bun run --filter use-agently dev

# Build all packages
bun run build

# Format code
bun run format

# Run tests
bun run test
```

## License

[MIT](LICENSE)
