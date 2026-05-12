import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { resolveConfig, getToolDir, parseFrontmatter } from './loader.js';
import {
	type ResolvedConfig,
	type SyncOptions,
	type SyncResult,
	TOOL_CAPABILITIES,
	TOOL_DIRS,
	type SkillFile,
	type CommandFile,
	AgentFile,
	type MCPServerConfig,
} from './index.js';

const AGENTS_DIR = '.agents';
const NAMESPACE_SEPARATOR = '--';

export async function sync(options: SyncOptions = {}): Promise<SyncResult> {
	const start = Date.now();
	const cwd = options.cwd || process.cwd();
	const result: SyncResult = {
		changed: [],
		added: [],
		removed: [],
		errors: [],
		duration: 0,
	};

	try {
		const config = resolveConfig(cwd, options.profile);
		const tools = options.tool ? [options.tool] : config.tools;

		const toolResults = await Promise.all(
			tools.map(async (tool) => {
				const capability = TOOL_CAPABILITIES[tool];
				if (!capability) {
					return { tool, error: `Unknown tool: ${tool}` };
				}

				try {
					return { tool, result: await syncTool(tool, config, options, cwd) };
				} catch (error) {
					return { tool, error: `Failed to sync ${tool}: ${error}` };
				}
			})
		);

		for (const { tool, result: toolResult, error } of toolResults) {
			if (error) {
				if (error.startsWith('Unknown tool')) {
					result.errors.push(error);
				} else {
					result.errors.push(error);
				}
			} else if (toolResult) {
				result.added.push(...toolResult.added);
				result.changed.push(...toolResult.changed);
				result.removed.push(...toolResult.removed);
			}
		}

		result.duration = Date.now() - start;
	} catch (error) {
		result.errors.push(`Sync failed: ${error}`);
		result.duration = Date.now() - start;
	}

	return result;
}

type ToolSyncResult = {
	added: string[];
	changed: string[];
	removed: string[];
};

async function syncTool(
	tool: string,
	config: ResolvedConfig,
	options: SyncOptions,
	cwd: string
): Promise<ToolSyncResult> {
	const result: ToolSyncResult = { added: [], changed: [], removed: [] };
	const capability = TOOL_CAPABILITIES[tool];
	const toolDir = path.join(cwd, getToolDir(tool));

	if (capability.method === 'native') {
		// For native readers, just ensure .agents directory exists
		const agentsDir = path.join(cwd, AGENTS_DIR);
		if (!options.dryRun) {
			fs.mkdirSync(agentsDir, { recursive: true });
		}

		result.added.push(agentsDir);
		return result;
	}

	// For copy/link methods, write files to tool directory
	if (!options.dryRun) {
		fs.mkdirSync(toolDir, { recursive: true });
	}

	if (capability.skills) {
		const skillsResult = await syncSkills(tool, config.skills, toolDir, options);
		result.added.push(...skillsResult.added);
		result.changed.push(...skillsResult.changed);
	}

	if (capability.commands) {
		const commandsResult = await syncCommands(tool, config.commands, toolDir, options);
		result.added.push(...commandsResult.added);
		result.changed.push(...commandsResult.changed);
	}

	if (capability.mcp) {
		const mcpResult = await syncMCP(tool, config.mcp, toolDir, options);
		result.added.push(...mcpResult.added);
		result.changed.push(...mcpResult.changed);
	}

	return result;
}

async function syncSkills(
	tool: string,
	skills: SkillFile[],
	toolDir: string,
	options: SyncOptions
): Promise<ToolSyncResult> {
	const result: ToolSyncResult = { added: [], changed: [], removed: [] };
	const skillsDir = path.join(toolDir, 'skills');
	const outputDir = options.dryRun ? null : skillsDir;

	if (!options.dryRun) {
		fs.mkdirSync(skillsDir, { recursive: true });
	}

	const namespace = getNamespace(tool);

	for (const skill of skills) {
		const filename = skill.namespace
			? `${skill.namespace}${NAMESPACE_SEPARATOR}${skill.name}.md`
			: `${namespace}${NAMESPACE_SEPARATOR}${skill.name}.md`;
		const outputPath = path.join(skillsDir, filename);

		const content = formatSkillContent(skill, tool);

		if (options.dryRun) {
			result.added.push(outputPath);
		} else {
			const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf-8') : null;
			if (!existing || existing !== content) {
				fs.writeFileSync(outputPath, content);
				if (existing) {
					result.changed.push(outputPath);
				} else {
					result.added.push(outputPath);
				}
			}
		}
	}

	return result;
}

async function syncCommands(
	tool: string,
	commands: CommandFile[],
	toolDir: string,
	options: SyncOptions
): Promise<ToolSyncResult> {
	const result: ToolSyncResult = { added: [], changed: [], removed: [] };
	const commandsDir = path.join(toolDir, 'commands');
	const outputDir = options.dryRun ? null : commandsDir;

	if (!options.dryRun) {
		fs.mkdirSync(commandsDir, { recursive: true });
	}

	const namespace = getNamespace(tool);

	for (const command of commands) {
		const filename = command.namespace
			? `${command.namespace}${NAMESPACE_SEPARATOR}${command.name}.md`
			: `${namespace}${NAMESPACE_SEPARATOR}${command.name}.md`;
		const outputPath = path.join(commandsDir, filename);

		const content = formatCommandContent(command, tool);

		if (options.dryRun) {
			result.added.push(outputPath);
		} else {
			const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf-8') : null;
			if (!existing || existing !== content) {
				fs.writeFileSync(outputPath, content);
				if (existing) {
					result.changed.push(outputPath);
				} else {
					result.added.push(outputPath);
				}
			}
		}
	}

	return result;
}

async function syncMCP(
	tool: string,
	mcp: MCPServerConfig,
	toolDir: string,
	options: SyncOptions
): Promise<ToolSyncResult> {
	const result: ToolSyncResult = { added: [], changed: [], removed: [] };

	if (tool === 'claude') {
		const mcpPath = path.join(toolDir, '.mcp.json');
		const content = JSON.stringify(
			Object.fromEntries(
				Object.entries(mcp).map(([key, server]) => [
					key,
					{
						command: server.command,
						args: server.args || [],
						env: server.env || {},
						url: server.url,
					},
				])
			),
			null,
			2
		);

		if (options.dryRun) {
			result.added.push(mcpPath);
		} else {
			fs.writeFileSync(mcpPath, content);
			result.added.push(mcpPath);
		}
	}

	return result;
}

function getNamespace(tool: string): string {
	return tool;
}

function formatSkillContent(skill: SkillFile, tool: string): string {
	const frontmatter = {
		...skill.frontmatter,
		description: skill.description,
	};

	let content = '---\n';
	for (const [key, value] of Object.entries(frontmatter)) {
		if (value !== undefined && value !== null) {
			content +=
				typeof value === 'object' ? `${key} = ${JSON.stringify(value)}\n` : `${key} = ${value}\n`;
		}
	}

	content += '---\n\n';
	content += skill.content;
	return content;
}

function formatCommandContent(command: CommandFile, tool: string): string {
	const frontmatter = {
		...command.frontmatter,
		description: command.description,
		...(command.argumentHint && { 'argument-hint': command.argumentHint }),
	};

	let content = '---\n';
	for (const [key, value] of Object.entries(frontmatter)) {
		if (value !== undefined && value !== null) {
			content +=
				typeof value === 'object' ? `${key} = ${JSON.stringify(value)}\n` : `${key} = ${value}\n`;
		}
	}

	content += '---\n\n';
	content += command.content;
	return content;
}

export async function clean(options: SyncOptions = {}): Promise<SyncResult> {
	const start = Date.now();
	const cwd = options.cwd || process.cwd();
	const result: SyncResult = {
		changed: [],
		added: [],
		removed: [],
		errors: [],
		duration: 0,
	};

	const config = resolveConfig(cwd, options.profile);
	const tools = options.tool ? [options.tool] : config.tools;

	for (const tool of tools) {
		const capability = TOOL_CAPABILITIES[tool];
		if (!capability || capability.method === 'native') {
			continue;
		}

		const toolDir = path.join(cwd, getToolDir(tool));

		if (fs.existsSync(toolDir)) {
			const dirsToClean = [];
			if (capability.skills) dirsToClean.push('skills');
			if (capability.commands) dirsToClean.push('commands');

			for (const dir of dirsToClean) {
				const fullPath = path.join(toolDir, dir);
				if (fs.existsSync(fullPath)) {
					const files = fs.readdirSync(fullPath).filter((f) => f.includes(NAMESPACE_SEPARATOR));
					for (const file of files) {
						const filePath = path.join(fullPath, file);
						if (!options.dryRun) {
							fs.unlinkSync(filePath);
						}

						result.removed.push(filePath);
					}
				}
			}
		}
	}

	result.duration = Date.now() - start;
	return result;
}

export function initConfig(tools: string[], cwd?: string): string {
	const configPath = path.join(cwd || process.cwd(), AGENTS_DIR, 'agentsync.toml');
	const configContent = `# Agent Sync Configuration
# Learn more: https://github.com/carrilloapps/agentsync

tools = ${JSON.stringify(tools)}

# MCP Servers (defined = enabled)
# [mcp.github]
# command = "npx"
# args = ["-y", "@modelcontextprotocol/server-github"]

# Presets (GitHub or filesystem)
# extends = ["github:company/standards"]

# Profiles (role-based configs)
# [profiles.development]
# tools = ["claude", "opencode"]
# mcp = ["github"]

# [profiles.production]
# tools = ["claude"]
# mcp = ["github", "postgres"]
`;

	fs.mkdirSync(path.dirname(configPath), { recursive: true });
	fs.writeFileSync(configPath, configContent);

	return configPath;
}
