# Usage Guide

Complete reference for all AI Sync commands and options.

## Quick Reference

```bash
# Sync from agent to IDE
ai-sync --from claude --to vscode --path ./project

# Central mode (one agent syncs to all detected)
ai-sync --central claude

# Global mode (from ~/.agents/)
ai-sync --global

# Watch for changes
ai-sync --from claude --to vscode --path ./project --watch

# Preview what would sync
ai-sync --from claude --to vscode --path ./project --dry-run
```

## Sync Options

These flags can be used directly without a subcommand:

| Flag | Short | Description | Example |
|------|-------|-------------|---------|
| `--from` | `-f` | Source agent ID | `--from claude` |
| `--to` | `-t` | Target IDE ID | `--to vscode` |
| `--path` | `-p` | Project path | `--path ./my-project` |
| `--central` | | Use agent as central source | `--central claude` |
| `--global` | | Sync from global config | `--global` |
| `--watch` | `-w` | Watch mode | `--watch` |
| `--dry-run` | | Preview only | `--dry-run` |
| `--overwrite` | `-o` | Overwrite existing | `--overwrite` |
| `--profile` | | Use named profile | `--profile dev` |
| `--json` | `-j` | JSON output | `--json` |

## Commands

### ai-sync (Direct)

The main sync command. Use flags directly:

```bash
# Basic sync
ai-sync --from claude --to vscode --path ./project

# Short flags
ai-sync -f claude -t vscode -p ./project

# With options
ai-sync -f claude -t vscode -p ./project --watch --overwrite
```

### ai-sync init

Initialize a new configuration in the current directory:

```bash
# Create default config
ai-sync init

# Specify tools to use
ai-sync init --tools claude,copilot,vscode

# Initialize in specific directory
cd my-project && ai-sync init
```

Creates `.agents/agentsync.toml`:

```toml
tools = ["claude", "opencode", "vscode"]

# MCP servers
[mcp.github]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]
```

### ai-sync doctor

Run diagnostics to check configuration and connectivity:

```bash
# Human-readable output
ai-sync doctor

# JSON for automation
ai-sync doctor --json
```

Checks:
- Configuration file validity
- Agent directory discovery
- IDE directory discovery
- MCP server status
- Disk space

### ai-sync clean

Remove synced files from target IDEs:

```bash
# Preview what would be removed
ai-sync clean --dry-run

# Remove synced files
ai-sync clean

# Clean specific tool
ai-sync clean --tool vscode
```

### ai-sync config

Manage configuration:

```bash
# List all config
ai-sync config ls

# List MCP servers
ai-sync config ls mcp

# Show resolved config
ai-sync config show

# Add a tool
ai-sync config add tool claude

# Add MCP server
ai-sync config add mcp github --mcp-config '{"command":"npx","args":["-y","@modelcontextprotocol/server-github"]}'

# Remove a tool
ai-sync config rm tool opencode
```

### ai-sync list

List supported agents and IDEs:

```bash
# List all supported agents
ai-sync list agents

# List all supported IDEs
ai-sync list tools
```

## Sync Modes

### 1. Direct Sync (Point to Point)

Sync from one specific agent to one specific IDE:

```bash
ai-sync --from claude --to vscode --path ./project
```

### 2. Central Mode

Use any agent as the central source. AI Sync detects all other tools in the project and syncs from the central agent to all of them:

```bash
# Claude is central source
ai-sync --central claude

# Copilot is central source
ai-sync --central copilot

# Gemini is central source
ai-sync --central gemini
```

How it works:
```
    ┌─────────────┐
    │   (any)    │  ← Choose any supported agent
    │   Agent    │  ← This becomes the central source
    └──────┬──────┘
           │
    ┌─────┼─────┬─────────┬─────────┐
    ▼      ▼     ▼         ▼         ▼
  Open  VSCode Cursor  JetBrains  WindSurf
    │      │     │         │         │
    └──────┴─────┴─────────┴─────────┘
                    │
             All synced from central source
```

### 3. Global Mode

Sync from your personal global library (`~/.agents/`) to the current project:

```bash
ai-sync --global
```

### 4. Watch Mode

Watch for file changes and auto-sync:

```bash
ai-sync --from claude --to vscode --path ./project --watch
```

```
File Change ──► Detect ──► Sync ──► Apply
     ▲                              │
     └──────────────────────────────┘
              (continuous loop)
```

Press `Ctrl+C` to stop watching.

### 5. Dry Run Mode

Preview what would be synced without making changes:

```bash
ai-sync --from claude --to vscode --path ./project --dry-run
```

## Profiles

Use profiles to define different sync configurations:

```bash
# Use a specific profile
ai-sync --profile frontend

# In agentsync.toml:
[profiles.frontend]
tools = ["claude", "cursor"]

[profiles.backend]
tools = ["claude", "jetbrains"]

[profiles.full]
tools = ["claude", "copilot", "opencode", "vscode", "cursor"]
```

## Output Directories

Each IDE stores configuration in its own directory:

| IDE | Directory | What's Synced |
|-----|-----------|---------------|
| Claude | `.claude/` | Skills, commands, MCP |
| OpenCode | `.agents/` | Full context, sessions |
| VS Code | `.vscode/` | Settings, extensions |
| JetBrains | `.jetbrains/` | Workspace, project files |
| Cursor | `.cursor/` | Config, sessions |
| WindSurf | `.windsurf/` | Skills, commands |
| Zed | `.zed/` | Settings |
| Vim/Neovim | `.vim/` | Config, sessions |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AGENTSYNC_PROFILE` | Default profile to use |

## TOML Configuration

Full configuration file at `.agents/agentsync.toml`:

```toml
# Required: List of tools to sync
tools = ["claude", "opencode", "vscode", "cursor"]

# Optional: MCP server definitions
[mcp.github]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-github"]

[mcp.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem"]
wait = true

# Optional: Profiles for different workflows
[profiles.development]
tools = ["claude", "cursor"]
mcp = ["github"]

[profiles.production]
tools = ["claude"]
mcp = ["github", "filesystem"]

# Optional: Path-based profile activation
[profiles.frontend]
paths = ["./frontend", "./ui"]

# Optional: Environment-based profile
[profiles.staging]
env = "STAGING"
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (missing arguments, invalid source/target, etc.) |

## Examples

### Basic Workflows

```bash
# Token limit reached - save and switch
ai-sync --from claude --to vscode --path ./my-project

# Continue with Copilot team standard
ai-sync --central copilot

# Set up new project with your tools
cd new-project
ai-sync init --tools claude,vscode,cursor

# Keep in sync while working
ai-sync --from claude --to vscode --path ./project --watch
```

### Advanced Workflows

```bash
# Sync to multiple targets
ai-sync --from claude --to opencode --path ./project
ai-sync --from claude --to jetbrains --path ./project

# Use profile
ai-sync --profile frontend --central claude

# Preview before sync
ai-sync --from claude --to vscode --path ./project --dry-run --json

# Clean and re-sync
ai-sync clean --tool vscode
ai-sync --from claude --to vscode --path ./project
```

## Getting Help

```bash
# Show all options
ai-sync --help

# Show help for specific command
ai-sync init --help
ai-sync config --help
```
