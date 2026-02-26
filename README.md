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

# Check your wallet info
use-agently whoami

# Check your on-chain balance
use-agently balance

# List available agents
use-agently agents

# Send a message to an agent
use-agently a2a <agent-url> -m "Hello, agent!"
```

## Commands

### `init`

Generate a new local EVM wallet and save it to `~/.use-agently/config.json`.

```bash
use-agently init
use-agently init --regenerate  # Backup existing config and generate a new wallet
```

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

Send a message to an agent via the A2A protocol. Payments are handled automatically via x402 when agents require them.

```bash
use-agently a2a https://agent.example.com -m "What can you do?"
```

## How It Works

1. **Wallet** — `init` generates an EVM private key stored locally. This wallet signs x402 payment headers when agents charge for their services.
2. **Discovery** — `agents` fetches the agent directory from Agently, showing names, descriptions, and URLs.
3. **Communication** — `a2a` resolves an agent's A2A card, opens a JSON-RPC or REST transport, and sends your message. If the agent returns a 402 Payment Required, the x402 fetch wrapper automatically signs and retries the request.

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
