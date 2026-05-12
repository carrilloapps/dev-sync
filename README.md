# Agent Sync

**Universal sync tool for AI coding agents and IDEs with MCP support.**

[![npm version](https://img.shields.io/npm/v/agent-sync.svg)](https://www.npmjs.com/package/agent-sync)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![Twitter Follow](https://img.shields.io/twitter/follow/carrilloapps?style=social)](https://x.com/carrilloapps)

> Developed by [José Carrillo](https://carrillo.app) - Senior Fullstack Developer & Tech Lead

Agent Sync bridges the gap between AI coding agents and IDEs, enabling seamless project synchronization, conversation migration, and unified workspace management.

## Features

- **Multi-Agent Support**: Sync from Claude Code, Copilot, Gemini, Cursor, WindSurf, and more
- **Multi-IDE Targets**: Export to OpenCode, VS Code, JetBrains, Cursor, Sublime, Vim, Emacs, and others
- **MCP Protocol**: Full Model Context Protocol server for integration with AI clients
- **Conversation Management**: List, export, and update conversations across agents
- **Real-time Sync**: Watch mode for automatic project synchronization
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Key Use Case: Continue When Tokens Run Out

**The problem:** You're working with Claude Code, hit the token limit, and lose all context.

**The solution:** Agent Sync saves your conversation so you can continue in any IDE.

```bash
# Save from Claude Code
agent-sync --from=claude-code --to=opencode --path=./mi-proyecto

# Continue in VS Code, Cursor, JetBrains, etc.
# All your conversation context is preserved!
```

See [Practical Usage Guide](docs/USAGE_PRACTICAL.md) for detailed workflows.

## Quick Start

```bash
# Install globally
npm install -g agent-sync

# Or use with npx
npx agent-sync --from=claude-code --to=opencode --path=./my-project
```

## Usage

### CLI

```bash
# Sync from Claude Code to OpenCode
agent-sync --from=claude-code --to=opencode --path=./project

# Sync from Copilot to VS Code
agent-sync -f copilot -t vscode -p ./project

# List supported sources
agent-sync --listSources

# List supported targets
agent-sync --listTargets

# Watch mode for real-time sync
agent-sync --from=gemini --to=jetbrains --path=./project --watch
```

### MCP Server

```bash
# Start MCP server
npx agent-sync-mcp

# Or in configuration
{
  "mcpServers": {
    "agent-sync": {
      "command": "npx",
      "args": ["agent-sync-mcp"]
    }
  }
}
```

## Documentation

- [Installation Guide](docs/INSTALLATION.md) - Detailed installation instructions
- [Usage Guide](docs/USAGE.md) - Complete usage documentation
- [Practical Usage](docs/USAGE_PRACTICAL.md) - Real-world scenarios like continuing conversations when tokens run out
- [MCP Integration](docs/MCP.md) - MCP server setup and tools
- [API Reference](docs/API.md) - Programmatic API documentation
- [Contributing](CONTRIBUTING.md) - How to contribute to the project

## Supported Agents

| Agent | Description |
|-------|-------------|
| `claude-code` | Anthropic's Claude Code |
| `copilot` | GitHub Copilot |
| `gemini` | Google Gemini |
| `cursor` | Cursor IDE |
| `windsurf` | WindSurf IDE |
| `trae` | Trae IDE |
| `codepal` | CodePal |
| `aider` | Aider CLI |
| `continue` | Continue Dev |
| `replit` | Replit Agent |
| `devin` | Devin AI |

## Supported IDEs

| IDE | Config Directory |
|-----|-----------------|
| `opencode` | `.opencode/` |
| `vscode` | `.vscode/` |
| `jetbrains` | `.jetbrains/` |
| `cursor` | `.cursor/` |
| `sublime` | `.sublime/` |
| `vim` | `.vim/` |
| `emacs` | `.emacs.d/` |
| `atom` | `.atom/` |
| `lapce` | `.lapce/` |
| `zed` | `.zed/` |

## MCP Tools

- `list_agents` - List all supported agents and targets
- `sync_project` - Sync project between agents
- `list_conversations` - List conversations from an agent
- `export_conversation` - Export a specific conversation
- `update_conversation` - Update conversation with new messages
- `analyze_project` - Analyze project structure
- `get_project_state` - Get current sync state

## MCP Integration

Agent Sync provides a full MCP server for integration with:
- **IDEs**: VS Code, Cursor, JetBrains, Neovim, Emacs
- **AI Agents**: Claude Code, GitHub Copilot, WindSurf, and more

See the [MCP Integration Guide](docs/MCP.md) for detailed setup instructions for each IDE and AI agent.

## Requirements

- Node.js >= 18.0.0
- npm, yarn, or pnpm

## About the Author

**José Carrillo** - Senior Fullstack Developer & Tech Lead

<p align="left">
<a href="https://dev.to/carrilloapps" target="blank"><img src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/devto.svg" alt="José Carrillo on Dev.to" height="30" width="40" /></a>
<a href="https://x.com/carrilloapps" target="blank"><img src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/twitter.svg" alt="José Carrillo on X Twitter" height="30" width="40" /></a>
<a href="https://linkedin.com/in/carrilloapps" target="blank"><img src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/linked-in-alt.svg" alt="José Carrillo on LinkedIn" height="30" width="40" /></a>
<a href="https://stackoverflow.com/users/14580648" target="blank"><img src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/stack-overflow.svg" alt="José Carrillo on StackOverflow" height="30" width="40" /></a>
<a href="https://medium.com/@carrilloapps" target="blank"><img src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/medium.svg" alt="José Carrillo on Medium" height="30" width="40" /></a>
<a href="https://www.youtube.com/channel/uciwxfli0q78rqlmogbyve-g" target="blank"><img src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/youtube.svg" alt="José Carrillo on YouTube" height="30" width="40" /></a>
</p>

- Website: [carrillo.app](https://carrillo.app)
- Email: [m@carrillo.app](mailto:m@carrillo.app)
- Telegram: [@carrilloapps](https://t.me/carrilloapps)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.