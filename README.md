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

## Sync Modes

AI Sync offers multiple ways to sync depending on your workflow:

### 1. Direct Sync (Point to Point)

Sync from one specific agent to one specific IDE:

```bash
# Basic syntax
ai-sync --from <agent> --to <ide> --path ./project

# Examples
ai-sync --from claude --to vscode --path ./my-app
ai-sync --from copilot --to jetbrains --path ./backend
ai-sync --from gemini --to cursor --path ./ai-project
ai-sync --from windsurf --to opencode --path ./workspace
```

### 2. Central Mode (One Source, Many Targets)

Use ANY agent as the central source. AI Sync detects all other agents/IDEs in the project and syncs from the central one to all of them:

```bash
# Use Claude as central source (syncs to ALL detected tools)
ai-sync --central claude

# Use Copilot as central source
ai-sync --central copilot

# Use WindSurf as central source
ai-sync --central windsurf

# Works with ANY supported agent:
# claude, copilot, gemini, cursor, windsurf, aider, continue,
# amazonq, codex, devin, replit, and 15+ more
```

How Central Mode works:

```
    ┌─────────────┐
    │   (any)     │  ← You choose: claude, copilot, gemini, etc.
    │   Agent     │  ← This becomes the central source
    └──────┬──────┘
           │
    ┌──────┼──────┬─────────┬─────────┐
    ▼      ▼      ▼         ▼         ▼
 OpenCode  VSCode  Cursor  JetBrains  WindSurf
    │      │       │         │         │
    └──────┴───────┴─────────┴─────────┘
                    │
             All synced from central source
```

### 3. Global Mode (Your Personal Library)

Sync from a global configuration (`~/.agents/`) to all projects:

```bash
# Sync from global config to project
ai-sync --global
```

### 4. Watch Mode (Real-time Sync)

Watch for file changes and auto-sync:

```bash
# Watch and sync automatically
ai-sync --from claude --to vscode --path ./project --watch
```

### 5. Dry Run (Preview)

Preview what will be synced without making changes:

```bash
# See what would happen
ai-sync --from claude --to vscode --path ./project --dry-run
```

## MCP Server

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

## Common Workflows

### Token Limit Workflow

```bash
# 1. You're working with Claude, close to token limit
ai-sync --from claude --to vscode --path ./my-project

# 2. Open VS Code, continue from where Claude left off
```

### Team Collaboration

```bash
# Use Copilot as central source (team standard)
ai-sync --central copilot

# Everyone syncs from Copilot's context
```

### Personal Productivity

```bash
# Set up your personal skills once
mkdir -p ~/.agents/skills
# Add your custom prompts, commands, etc.

# Sync to any project
ai-sync --global
```

## Command Options

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--from` | `-f` | Source agent | Required for direct sync |
| `--to` | `-t` | Target IDE | Required for direct sync |
| `--path` | `-p` | Project path | Current directory |
| `--central` | | Agent ID as central source | Syncs to all detected |
| `--global` | | Use global config | Syncs from ~/.agents/ |
| `--watch` | `-w` | Watch mode | false |
| `--dry-run` | | Preview only | false |
| `--overwrite` | `-o` | Overwrite existing | false |
| `--profile` | | Profile name | |
| `--json` | `-j` | JSON output | false |

## Other Commands

```bash
# Initialize config in project
ai-sync init
ai-sync init --tools claude,opencode,copilot

# Check configuration
ai-sync doctor
ai-sync doctor --json

# Clean synced files
ai-sync clean
ai-sync clean --dry-run

# Manage configuration
ai-sync config ls
ai-sync config show
ai-sync config add tool claude
ai-sync config rm tool opencode

# List supported tools
ai-sync list agents   # Show all agents
ai-sync list tools    # Show all IDEs
```

## Features

- **Sync Anywhere** - Move between Claude, Copilot, Gemini, Cursor, WindSurf, and 20+ agents
- **All IDEs** - Export to VS Code, JetBrains, Zed, Vim, Emacs, and more
- **Conversations Travel** - Your session context follows you, not just files
- **Real-time Watch** - Auto-sync as you code
- **Central Mode** - Any agent can be the source for all others
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

## Supported Agents (--from or --central)

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
| Trae | `trae` |
| CodePal | `codepal` |
| Kiro | `kiro` |
| OpenHands | `openhands` |
| Junie | `junie` |
| Crush | `crush` |
| KiloCode | `kilocode` |
| Qwen | `qwen` |
| Amp | `amp` |
| Goose | `goose` |
| RooCode | `roocode` |
| Cline | `cline` |

## Supported IDEs (--to)

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
| Sublime | `.sublime/` |
| Atom | `.atom/` |
| Onivim | `.onivim/` |
| Tabby | `.tabby/` |

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
