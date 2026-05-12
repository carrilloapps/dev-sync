# Usage Guide

## Basic Usage

### Sync Project

Sync a project from one agent to another IDE:

```bash
agent-sync --from=claude-code --to=opencode --path=./my-project
```

### Short Flags

Use shorthand flags for faster input:

```bash
agent-sync -f claude-code -t opencode -p ./my-project
```

### Overwrite Existing

If target already exists, use `--overwrite`:

```bash
agent-sync -f copilot -t vscode -p ./project --overwrite
```

## Command Options

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--from` | `-f` | Source agent | Required |
| `--to` | `-t` | Target IDE | Required |
| `--path` | `-p` | Project path | Current directory |
| `--overwrite` | `-o` | Overwrite existing config | `false` |
| `--watch` | `-w` | Watch mode | `false` |
| `--session` | | Show active sessions | `false` |
| `--history` | | Show sync history | `false` |
| `--listSources` | | List source agents | `false` |
| `--listTargets` | | List target IDEs | `false` |

## Examples

### Claude Code to OpenCode

```bash
agent-sync --from=claude-code --to=opencode --path=~/projects/my-app
```

### Copilot to VS Code

```bash
agent-sync -f copilot -t vscode -p ~/projects/my-app
```

### Gemini to JetBrains

```bash
agent-sync --from=gemini --to=jetbrains --path=~/projects/my-app
```

### Cursor to OpenCode

```bash
agent-sync --from=cursor --to=opencode --path=~/projects/my-app
```

### WindSurf to Cursor

```bash
agent-sync --from=windsurf --to=cursor --path=~/projects/my-app
```

## Watch Mode

Watch for file changes and sync automatically:

```bash
agent-sync --from=claude-code --to=opencode --path=./project --watch
```

The watcher will:
- Detect new files added to the project
- Detect modifications to existing files
- Detect deleted files
- Automatically sync changes

Press `Ctrl+C` to stop watching.

## Information Commands

### List Sources

```bash
agent-sync --listSources
```

Output:
```
Supported Source Agents:
- claude-code    - Claude Code
- copilot        - GitHub Copilot
- gemini         - Google Gemini
- cursor         - Cursor
- windsurf       - WindSurf
```

### List Targets

```bash
agent-sync --listTargets
```

Output:
```
Supported Target IDEs:
- opencode       - OpenCode
- vscode         - Visual Studio Code
- jetbrains      - JetBrains IDEs
- cursor         - Cursor IDE
```

### Show History

```bash
agent-sync --history
```

### Show Sessions

```bash
agent-sync --session
```

## Output Directories

Each target creates its own configuration directory:

| Target | Directory | Files |
|--------|-----------|-------|
| OpenCode | `.opencode/` | config.json, dependencies.json, source-map.json, sessions/ |
| VS Code | `.vscode/` | workspace-state.json, file-mappings.json |
| JetBrains | `.jetbrains/` | workspace/project-state.json, file-index.json |
| Cursor | `.cursor/` | config.json, sessions/ |

## Exit Codes

- `0` - Success
- `1` - Error (missing arguments, invalid source/target, etc.)

## Environment Variables

None required. All configuration is done via CLI flags.

## Exit with Ctrl+C

Press `Ctrl+C` to cancel any operation or stop watch mode.