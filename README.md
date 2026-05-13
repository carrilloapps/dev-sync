# AI Sync

**Universal sync tool for AI coding agents and IDEs. Never lose context when switching tools.**

[![npm version](https://img.shields.io/npm/v/ai-sync-cli.svg)](https://www.npmjs.com/package/ai-sync-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)

## The Problem

You're deep in a conversation with Claude Code, building a complex feature. Then:
- The session hits the token limit
- You need to switch to VS Code for debugging
- Your colleague uses Copilot and needs your context

**Without AI Sync:** You lose everything. Start over, re-explain, lose hours.

**With AI Sync:** Your conversation travels with you. Seamless handoff between any AI tool.

## Quick Start

```bash
# Install
npm install -g ai-sync-cli

# Sync from Claude to VS Code (direct, no subcommand needed)
ai-sync --from claude --to vscode --path ./my-project
```

## How It Works

```
Claude Code ──────► VS Code
     │                   │
     └───── AI Sync ─────┘
              │
     ┌───────┴───────┐
     ▼               ▼
   Cursor       JetBrains
```

## Installation

```bash
# npm
npm install -g ai-sync-cli

# yarn
yarn global add ai-sync-cli

# pnpm
pnpm add -g ai-sync-cli

# No install? Use npx
npx ai-sync --from claude --to vscode --path ./project
```

## Usage Examples

### Basic Sync

```bash
# Claude → VS Code (flags work directly, no sync subcommand)
ai-sync --from claude --to vscode --path ./my-app

# Short flags
ai-sync -f claude -t vscode -p ./my-app

# Preview what will sync (dry run)
ai-sync --dry-run
```

### Real-time Watch Mode

```bash
# Watch for changes and auto-sync
ai-sync --from claude --to opencode --path ./project --watch
```

### Central Mode (One Source, All Targets)

Use Claude as central source, sync to ALL detected tools:

```
    ┌─────────────┐
    │   Claude    │  (Central Source)
    └──────┬──────┘
           │
    ┌──────┼──────┬─────────┬─────────┐
    ▼      ▼      ▼         ▼         ▼
OpenCode  VSCode  Cursor  JetBrains  WindSurf
```

```bash
# Use Claude as central source, sync to ALL detected tools
ai-sync --central claude
```

### Global Mode (Your Personal Library)

```bash
# Sync from your global skills/commands library
ai-sync --global
```

### MCP Server

The MCP server is included in the same package:

```bash
# Start the MCP server
npx ai-sync-mcp

# Configure in Claude Desktop
{
  "mcpServers": {
    "ai-sync": {
      "command": "npx",
      "args": ["ai-sync-mcp"]
    }
  }
}
```

### List Available Tools

```bash
# Show all supported agents
ai-sync list agents

# Show all supported IDEs
ai-sync list tools
```

### Diagnostics

```bash
# Check configuration and connectivity
ai-sync doctor

# JSON output for automation
ai-sync doctor --json
```

## Workflow Example

```
1. User working with Claude Code
         │
         ▼
2. Hits token limit
         │
         ▼
3. Run: ai-sync --from claude --to vscode
         │
         ▼
4. VS Code has full conversation history
         │
         ▼
5. Continue where Claude left off ✓
```

## Features

- **Sync Anywhere** - Move between Claude, Copilot, Gemini, Cursor, WindSurf, and 20+ agents
- **All IDEs** - Export to VS Code, JetBrains, Zed, Vim, Emacs, and more
- **Conversations Travel** - Your session context follows you, not just files
- **Real-time Watch** - Auto-sync as you code
- **Central Mode** - One agent as source, all others sync automatically
- **MCP Built-in** - Full Model Context Protocol server for AI integration

## Configuration

Create `.agents/agentsync.toml` in your project:

```toml
# Tools to sync
tools = ["claude", "opencode", "vscode"]

# MCP servers
[mcp.github]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]

# Profiles
[profiles.frontend]
tools = ["claude", "cursor"]

[profiles.backend]
tools = ["claude", "jetbrains"]
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `list_agents` | List all supported agents and IDEs |
| `sync_project` | Sync a project between agents |
| `list_conversations` | List all conversations with stats |
| `export_conversation` | Export a specific conversation |
| `update_conversation` | Add messages to a conversation |
| `analyze_project` | Get project structure and context |
| `get_project_state` | Get current sync state |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     AI Sync CLI                         │
│                   (ai-sync command)                     │
└─────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │ Analyzers│   │  Sync  │   │  MCP    │
   │         │   │ Engine │   │ Server  │
   └────┬────┘   └────┬────┘   └────┬────┘
        │             │             │
        ▼             ▼             ▼
   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │ Claude  │   │ VS Code │   │  IDEs   │
   │ Copilot │   │ Cursor  │   │  via    │
   │ Gemini  │   │ JetBrains│  │  stdio  │
   └─────────┘   └─────────┘   └─────────┘
```

## Supported Agents

| Agent | ID |
|-------|-----|
| Claude Code | `claude` |
| GitHub Copilot | `copilot` |
| Google Gemini | `gemini` |
| Cursor | `cursor` |
| WindSurf | `windsurf` |
| Aider | `aider` |
| Continue | `continue` |
| Amazon Q | `amazonq` |
| Codex | `codex` |
| Devin | `devin` |
| Replit | `replit` |
| And 15+ more... | |

## Supported IDEs

| IDE | Directory |
|-----|----------|
| OpenCode | `.agents/` |
| VS Code | `.vscode/` |
| JetBrains | `.jetbrains/` |
| Cursor | `.cursor/` |
| Zed | `.zed/` |
| Vim/Neovim | `.vim/` |
| Emacs | `.emacs.d/` |
| WindSurf | `.windsurf/` |
| Lapce | `.lapce/` |
| Nova | `.nova/` |

## Documentation

- [Installation Guide](docs/INSTALLATION.md) - Detailed installation
- [Usage Guide](docs/USAGE.md) - All commands and options
- [Practical Examples](docs/USAGE_PRACTICAL.md) - Real-world workflows
- [MCP Setup](docs/MCP.md) - IDE and agent integration
- [API Reference](docs/API.md) - Programmatic usage

## Requirements

- Node.js >= 20.0.0
- npm, yarn, or pnpm

## License

MIT License - see [LICENSE](LICENSE)

---

Built by [José Carrillo](https://carrillo.app)
