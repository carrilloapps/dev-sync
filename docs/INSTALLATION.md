# Installation Guide

## Prerequisites

- Node.js >= 18.0.0
- npm, yarn, or pnpm

## Installation Methods

### npm (Recommended)

```bash
# Global installation
npm install -g agent-sync

# Verify installation
agent-sync --version
```

### yarn

```bash
yarn global add agent-sync
```

### pnpm

```bash
pnpm add -g agent-sync
```

### npx (No Installation)

```bash
npx agent-sync --from=claude-code --to=opencode --path=./my-project
```

## npm Package Details

[![npm version](https://img.shields.io/npm/v/agent-sync.svg)](https://www.npmjs.com/package/agent-sync)
[![npm downloads](https://img.shields.io/npm/dm/agent-sync.svg)](https://www.npmjs.com/package/agent-sync)

**Package**: [agent-sync on npm](https://www.npmjs.com/package/agent-sync)

## Post-Installation

After installation, verify everything is working:

```bash
# Show help
agent-sync --help

# List supported sources
agent-sync --listSources

# List supported targets
agent-sync --listTargets
```

## Platform-Specific Notes

### Windows

On Windows, the global npm packages are typically located at:
- `%AppData%\npm\agent-sync.cmd`

### macOS/Linux

On Unix systems, global packages are typically at:
- `/usr/local/bin/agent-sync` (macOS)
- `/usr/bin/agent-sync` (Linux)

## Updating

```bash
# npm
npm update -g agent-sync

# yarn
yarn global upgrade agent-sync

# pnpm
pnpm update -g agent-sync
```

## Uninstalling

```bash
npm uninstall -g agent-sync
```

## Verify Installation

```bash
$ agent-sync --version
agent-sync v0.1.0
```

## Troubleshooting

### Permission Errors (Linux/macOS)

If you encounter permission errors, use `sudo`:

```bash
sudo npm install -g agent-sync
```

Or fix npm permissions: https://docs.npmjs.com/resolving-eacces-permissions-errors

### Command Not Found

If `agent-sync` is not found after installation, ensure the npm global bin is in your PATH:

```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH="$(npm prefix -g)/bin:$PATH"
```

Then reload: `source ~/.bashrc` or `source ~/.zshrc`