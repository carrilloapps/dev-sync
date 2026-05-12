# Installation Guide

## Prerequisites

- Node.js >= 20.0.0
- npm, yarn, or pnpm

## Installation Methods

### npm (Recommended)

```bash
# Global installation
npm install -g ai-sync-cli

# Verify installation
ai-sync --version
```

### yarn

```bash
yarn global add ai-sync-cli
```

### pnpm

```bash
pnpm add -g ai-sync-cli
```

### npx (No Installation)

```bash
npx ai-sync --from=claude --to=opencode --path=./my-project
```

## npm Package Details

[![npm version](https://img.shields.io/npm/v/ai-sync-cli.svg)](https://www.npmjs.com/package/ai-sync-cli)
[![npm downloads](https://img.shields.io/npm/dm/ai-sync-cli.svg)](https://www.npmjs.com/package/ai-sync-cli)

**Package**: [ai-sync-cli on npm](https://www.npmjs.com/package/ai-sync-cli)

## Post-Installation

After installation, verify everything is working:

```bash
# Show help
ai-sync --help

# List supported sources
ai-sync list agents

# List supported targets
ai-sync list tools
```

## Platform-Specific Notes

### Windows

On Windows, the global npm packages are typically located at:
- `%AppData%\npm\ai-sync.cmd`

### macOS/Linux

On Unix systems, global packages are typically at:
- `/usr/local/bin/ai-sync` (macOS)
- `/usr/bin/ai-sync` (Linux)

## Updating

```bash
# npm
npm update -g ai-sync-cli

# yarn
yarn global upgrade ai-sync-cli

# pnpm
pnpm update -g ai-sync-cli
```

## Uninstalling

```bash
npm uninstall -g ai-sync-cli
```

## Verify Installation

```bash
$ ai-sync --version
ai-sync v1.0.0
```

## Troubleshooting

### Permission Errors (Linux/macOS)

If you encounter permission errors, use `sudo`:

```bash
sudo npm install -g ai-sync-cli
```

Or fix npm permissions: https://docs.npmjs.com/resolving-eacces-permissions-errors

### Command Not Found

If `ai-sync` is not found after installation, ensure the npm global bin is in your PATH:

```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH="$(npm prefix -g)/bin:$PATH"
```

Then reload: `source ~/.bashrc` or `source ~/.zshrc`
