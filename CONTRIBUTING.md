# Contributing to Agent Sync

Thank you for your interest in contributing to Agent Sync!

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported
2. Create a detailed issue with:
   - Node.js version
   - Operating system
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages if applicable

### Suggesting Features

1. Search existing issues first
2. Describe the use case clearly
3. Explain why this feature would benefit the project

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make changes with proper tests
4. Ensure code passes linting: `npm run lint`
5. Ensure code builds: `npm run build`
6. Submit a pull request with clear description

## Development Setup

```bash
# Clone the repository
git clone https://github.com/carrilloapps/agent-sync.git
cd agent-sync

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run linter
npm run lint
```

## Project Structure

```
agent-sync/
├── source/
│   ├── analyzers/     # Agent analyzers (Claude, Copilot, etc.)
│   ├── exporters/      # IDE exporters (OpenCode, VS Code, etc.)
│   ├── commands/       # CLI commands and sync service
│   ├── components/      # Ink UI components
│   ├── types/          # TypeScript type definitions
│   └── mcp/            # MCP server implementation
├── dist/               # Compiled output
└── docs/               # Documentation
```

## Coding Standards

- Use TypeScript for all new code
- Follow existing code style (enforced by XO/ESLint)
- Write meaningful commit messages
- Add tests for new functionality
- Update documentation for any API changes

## Commit Messages

Format: `<type>(<scope>): <description>`

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Maintenance

Example: `feat(mcp): add conversation export tool`

## License

By contributing, you agree that your contributions will be licensed under the MIT License.