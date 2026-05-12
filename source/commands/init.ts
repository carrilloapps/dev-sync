import * as fs from 'node:fs';
import * as path from 'node:path';
import { TOOL_CAPABILITIES, TOOL_DIRS } from '../config/index.js';

export type InitOptions = {
	json?: boolean;
	cwd?: string;
};

export async function initCommand(args: string[], options: InitOptions): Promise<void> {
	const cwd = options.cwd || process.cwd();
	let tools: string[] = [];

	// Parse --tools flag
	const toolsFlag = args.find((arg) => arg.startsWith('--tools='));
	if (toolsFlag) {
		tools = toolsFlag
			.split('=')[1]
			.split(',')
			.map((t) => t.trim());
	}

	// If no tools specified, detect available
	if (tools.length === 0) {
		tools = detectAvailableTools(cwd);
	}

	const configPath = initConfig(tools, cwd);

	if (options.json) {
		console.log(
			JSON.stringify(
				{
					success: true,
					configPath,
					tools,
				},
				null,
				2
			)
		);
	} else {
		console.log(`Initialized sync config at ${configPath}`);
		console.log(`Tools: ${tools.join(', ')}`);
	}
}

function detectAvailableTools(cwd: string): string[] {
	const available: string[] = [];

	for (const [tool, dir] of Object.entries(TOOL_DIRS)) {
		const toolPath = path.join(cwd, dir);
		if (fs.existsSync(toolPath)) {
			available.push(tool);
		}
	}

	// Default to common tools if none detected
	if (available.length === 0) {
		available.push('claude', 'opencode', 'codex');
	}

	return available;
}

export function initConfig(tools: string[], cwd?: string): string {
	const configDir = path.join(cwd || process.cwd(), '.agents');
	const configPath = path.join(configDir, 'agentsync.toml');

	const configContent = `# Agent Sync Configuration
tools = ${JSON.stringify(tools)}

# MCP Servers (defined = enabled)
# [mcp.github]
# command = "npx"
# args = ["-y", "@modelcontextprotocol/server-github"]

# Presets from GitHub or filesystem
# extends = ["github:company/standards"]

# Role-based profiles
# [profiles.development]
# tools = ["claude", "opencode"]
# mcp = ["github"]

# [profiles.production]
# tools = ["claude"]
# mcp = ["github", "postgres"]
`;

	fs.mkdirSync(configDir, { recursive: true });
	fs.writeFileSync(configPath, configContent);

	// Also create directories for skills, commands, agents
	const skillsDir = path.join(configDir, 'skills');
	const commandsDir = path.join(configDir, 'commands');
	const agentsDir = path.join(configDir, 'agents');

	fs.mkdirSync(skillsDir, { recursive: true });
	fs.mkdirSync(commandsDir, { recursive: true });
	fs.mkdirSync(agentsDir, { recursive: true });

	// Create .gitignore
	const gitignorePath = path.join(configDir, '.gitignore');
	fs.writeFileSync(
		gitignorePath,
		`# Keep directories but ignore content
*
!.gitkeep
skills/.gitkeep
commands/.gitkeep
agents/.gitkeep
`
	);

	// Create .gitkeep files
	fs.writeFileSync(path.join(skillsDir, '.gitkeep'), '');
	fs.writeFileSync(path.join(commandsDir, '.gitkeep'), '');
	fs.writeFileSync(path.join(agentsDir, '.gitkeep'), '');

	return configPath;
}
