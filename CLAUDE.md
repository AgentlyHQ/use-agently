# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bun-based TypeScript monorepo for `use-agently`, a CLI tool for the Agently platform — a decentralized marketplace for AI agents using ERC-8004 and the x402 payment protocol. The CLI manages local EVM wallets, discovers agents, and communicates with them via the A2A (Agent-to-Agent) protocol.

## Commands

```bash
# Install dependencies
bun install

# Build all packages (compiles to standalone binary via bun build --compile)
bun run build

# Run the CLI in development mode
bun run --filter use-agently dev

# Format code
bun run format

# Run tests
bun run test
```

All top-level commands use Turborepo (`turbo`) to orchestrate across packages.

## Architecture

- **Monorepo**: Bun workspaces with `packages/*` layout, Turborepo for task orchestration
- **`packages/use-agently`**: The CLI package
  - `src/bin.ts` — Executable entry point (`#!/usr/bin/env bun`)
  - `src/cli.ts` — Commander.js program setup, registers all commands
  - `src/config.ts` — Config persistence at `~/.use-agently/config.json` (load, save, backup)
  - `src/client.ts` — Creates x402 payment-wrapped fetch and A2A protocol clients
  - `src/wallets/wallet.ts` — Wallet interface abstraction with factory `loadWallet()`
  - `src/wallets/evm-private-key.ts` — EVM private key wallet implementation (viem + @x402/evm)
  - `src/commands/` — One file per CLI command (init, whoami, balance, agents, a2a)
  - Build output: `build/use-agently` (standalone binary via `bun build --compile`)
- **`packages/localhost-aixyz`**: Local dev test server (private, not published)
  - Bootstrapped with `create-aixyz-app` — serves a fully functional A2A + x402 agent locally
  - Used as the conformity test target: route CLI commands to it via `--base-url`
  - Run with `bun run --filter localhost-aixyz dev` (starts on `http://localhost:3000` by default)

### Wallet Abstraction

The wallet system is designed for extensibility. `Wallet` interface requires `type`, `address`, and `getX402Schemes()`. New wallet types are added by creating an implementation and registering it in the `loadWallet()` factory switch. Config stores `{ wallet: { type: "evm-private-key", ...fields } }`.

### Key Dependencies

- **commander** — CLI command framework
- **viem** — EVM wallet generation, account management, on-chain reads
- **@x402/fetch** + **@x402/evm** — Wraps fetch to auto-handle 402 Payment Required via x402 protocol
- **@a2a-js/sdk** — A2A protocol client (agent card resolution, JSON-RPC/REST transport)
- **aixyz** — SDK powering `packages/localhost-aixyz` local dev server

## Tooling

- **Runtime/Package Manager**: Bun (>= 1.3.0)
- **Build**: Turborepo orchestrates tasks; Bun compiler creates standalone executables
- **Linting**: ESLint with typescript-eslint (type-checked recommended rules), flat config at root
- **Formatting**: Prettier (printWidth: 120), enforced via pre-commit hook (husky + lint-staged)
- **CI**: GitHub Actions runs build, test, and format check on PRs

## Publishing

npm publishing is triggered by GitHub releases. Version is extracted from git tags (`v1.0.0` format). Tags containing `.beta` or similar publish with `next` dist-tag.

## Documentation

When CLI commands, features, or behavior change, always update these files to keep them in sync:

- `README.md` — Project README (install, quick start, command reference, how it works)
- `skills/use-agently/SKILL.md` — Claude Code skill reference (prerequisites, commands, workflows, tips)
- `AGENTS.md` — Agent guidance file (mirrors this file)

## Testing Infrastructure

The `packages/localhost-aixyz` package is a local [aixyz](https://aixyz.sh) agent server bootstrapped with `create-aixyz-app`. It provides a real A2A + x402 conformant endpoint you can always run locally to verify CLI behaviour without hitting production.

### Dev test loop

1. Start the local agent server:

   ```bash
   cd packages/localhost-aixyz
   cp .env.example .env.local   # add your OPENAI_API_KEY
   bun install
   bun run dev                  # starts on http://localhost:3000
   ```

2. Point the CLI at the local server using `--base-url`:

   ```bash
   # List agents served by the local server
   bun run --filter use-agently dev agents --base-url http://localhost:3000

   # Send a message to the local agent
   bun run --filter use-agently dev a2a localhost-aixyz --base-url http://localhost:3000 -m "Convert 100 meters to feet"
   ```

3. Verify the output matches expectations, then repeat.

This loop guarantees that every CLI change is validated against a real, locally-running A2A server before being committed.
