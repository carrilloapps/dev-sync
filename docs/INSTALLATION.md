# Installation Guide

Complete installation instructions for AI Sync on all platforms.

## Prerequisites

- **Node.js >= 20.0.0**
- **npm**, **yarn**, or **pnpm**

Check your Node version:
```bash
node --version
```

## Installation

### Using npm (Recommended)

```bash
npm install -g ai-sync-cli
```

### Using yarn

```bash
yarn global add ai-sync-cli
```

### Using pnpm

```bash
pnpm add -g ai-sync-cli
```

### Using npx (No Installation)

You can run AI Sync without installing:

```bash
npx ai-sync --from claude --to vscode --path ./project
```

## Verify Installation

After installation, verify it works:

```bash
# Check version
ai-sync --version

# Show help
ai-sync --help

# List supported agents
ai-sync list agents

# List supported IDEs
ai-sync list tools
```

## Package Binaries

After installation, you have three commands available:

| Command | Description |
|---------|-------------|
| `ai-sync` | Main CLI for syncing projects |
| `ai-sync-mcp` | MCP server for AI integration |
| `ai-sync-cli` | Alias for ai-sync |

## Platform-Specific Notes

### Windows

Global npm packages are installed at:
- `%AppData%\npm\ai-sync.cmd` ( executable)
- `%AppData%\npm\ai-sync-mcp.cmd` (MCP server)

If `ai-sync` is not found after installation, add npm to your PATH:
```powershell
$env:Path += ";$((npm prefix -g).Replace('/npm',''))\bin"
```

### macOS

Global packages are installed at:
- `/usr/local/bin/ai-sync`
- `/usr/local/bin/ai-sync-mcp`

### Linux

Global packages are installed at:
- `/usr/bin/ai-sync`
- `/usr/bin/ai-sync-mcp`

If you get a "Permission denied" error, either:
1. Use `sudo`:
   ```bash
   sudo npm install -g ai-sync-cli
   ```
2. Or fix npm permissions: https://docs.npmjs.com/resolving-eacces-permissions-errors

## Updating AI Sync

### npm

```bash
npm update -g ai-sync-cli
```

### yarn

```bash
yarn global upgrade ai-sync-cli
```

### pnpm

```bash
pnpm update -g ai-sync-cli
```

## Uninstalling

```bash
npm uninstall -g ai-sync-cli
```

## Troubleshooting

### "command not found: ai-sync"

1. Verify npm global bin is in your PATH:
   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   export PATH="$(npm prefix -g)/bin:$PATH"
   ```

2. Reload your shell:
   ```bash
   source ~/.bashrc  # or source ~/.zshrc
   ```

### Permission Errors

On Linux/macOS, if you get EACCES errors:

```bash
# Option 1: Use sudo
sudo npm install -g ai-sync-cli

# Option 2: Fix npm permissions
# See: https://docs.npmjs.com/resolving-eacces-permissions-errors
```

### Node Version Error

AI Sync requires Node.js 20+. If you see version errors:

```bash
# Check Node version
node --version

# Update Node.js (using nvm recommended)
nvm install 20
nvm use 20
```

## Development Installation

If you want to install from source:

```bash
git clone https://github.com/carrilloapps/ai-sync-cli.git
cd ai-sync-cli
npm install
npm run build
npm link
```

## Next Steps

- Read the [Usage Guide](USAGE.md) for all commands
- Set up [MCP Integration](MCP.md) for your IDE
- See [Practical Examples](USAGE_PRACTICAL.md) for real-world workflows
