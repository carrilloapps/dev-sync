# Changelog

All notable changes will be documented in this file.

## [1.0.0] - 2026-05-12

### Added

- **Universal sync tool** for AI coding agents and IDEs
- **20 supported agents**: Claude, Copilot, Gemini, Cursor, WindSurf, Codex, Amazon Q, Augment, Kiro, OpenHands, Junie, Crush, KiloCode, Qwen, Amp, Goose, RooCode, Cline, Aider, Continue, Replit, Devin, CodePal, Trae
- **12 supported IDE targets**: OpenCode, VS Code, JetBrains, Cursor, Sublime, Vim, Emacs, Atom, Lapce, Zed, Nova, Onivim, Tabby
- **MCP Server** with full protocol support
- **TOML configuration** (`.agents/agentsync.toml`)
- **Hierarchical config discovery** (global → root → team → service)
- **Monorepo support** with per-directory configs
- **Profile system** (role-based configurations)
- **Preset system** (GitHub + filesystem sources)
- **Namespace isolation** to prevent conflicts
- **CLI commands**: init, sync, doctor, clean, config, list
- **Sync modes**: `--central` (sync from one agent to all), `--global` (sync from global config)
- **TUI interface** with Ink/React
- **143 tests** passing
- **Framework detection** (React, Angular, Flask, Go, Rust, etc.)
- **Session sync** and project context analysis
