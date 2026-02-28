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

## Local Dev Test Loop

`packages/localhost-aixyz` is the local testing infrastructure for the CLI. It is a private aixyz agent that serves a free A2A endpoint at `http://localhost:3000` so you can test `use-agently a2a` without hitting production agents or spending real funds.

```bash
# Terminal 1 — start the local agent (requires OPENAI_API_KEY in packages/localhost-aixyz/.env.local)
bun run --filter localhost-aixyz dev

# Terminal 2 — send a message via the CLI
use-agently a2a http://localhost:3000 -m "Hello!"
```

The agent exposes a free endpoint (`accepts: { scheme: "free" }`), so no wallet balance is needed. Set `OPENAI_API_KEY` in `packages/localhost-aixyz/.env.local` before starting the dev server.

Always use this agent when developing or testing changes to `use-agently` to maintain conformity and ensure every change is exercised end-to-end.

## Architecture

- **Monorepo**: Bun workspaces with `packages/*` layout, Turborepo for task orchestration
- **`packages/localhost-aixyz`**: Local development agent (private, not published)
  - `aixyz.config.ts` — Agent metadata and skills
  - `app/agent.ts` — Free A2A endpoint (`accepts: { scheme: "free" }`) with echo tool
  - `app/tools/echo.ts` — Simple echo tool for testing
- **`packages/use-agently`**: The CLI package
  - `src/bin.ts` — Executable entry point (`#!/usr/bin/env bun`)
  - `src/cli.ts` — Commander.js program setup, registers all commands
  - `src/config.ts` — Config persistence at `~/.use-agently/config.json` (load, save, backup)
  - `src/client.ts` — Creates x402 payment-wrapped fetch and A2A protocol clients
  - `src/wallets/wallet.ts` — Wallet interface abstraction with factory `loadWallet()`
  - `src/wallets/evm-private-key.ts` — EVM private key wallet implementation (viem + @x402/evm)
  - `src/commands/` — One file per CLI command (init, whoami, balance, agents, a2a)
  - Build output: `build/use-agently` (standalone binary via `bun build --compile`)

### Wallet Abstraction

The wallet system is designed for extensibility. `Wallet` interface requires `type`, `address`, and `getX402Schemes()`. New wallet types are added by creating an implementation and registering it in the `loadWallet()` factory switch. Config stores `{ wallet: { type: "evm-private-key", ...fields } }`.

### Key Dependencies

- **commander** — CLI command framework
- **viem** — EVM wallet generation, account management, on-chain reads
- **@x402/fetch** + **@x402/evm** — Wraps fetch to auto-handle 402 Payment Required via x402 protocol
- **@a2a-js/sdk** — A2A protocol client (agent card resolution, JSON-RPC/REST transport)

## Tooling

- **Runtime/Package Manager**: Bun (>= 1.3.0)
- **Build**: Turborepo orchestrates tasks; Bun compiler creates standalone executables
- **Formatting**: Prettier (printWidth: 120), enforced via pre-commit hook (husky + lint-staged)
- **CI**: GitHub Actions runs build, test, and format check on PRs

## Publishing

npm publishing is triggered by GitHub releases. Version is extracted from git tags (`v1.0.0` format). Tags containing `.beta` or similar publish with `next` dist-tag.

## Documentation

When CLI commands, features, or behavior change, always update these files to keep them in sync:

- `README.md` — Project README (install, quick start, command reference, how it works)
- `skills/use-agently/SKILL.md` — Claude Code skill reference (prerequisites, commands, workflows, tips)
