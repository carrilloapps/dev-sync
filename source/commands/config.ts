import * as fs from 'node:fs';
import * as path from 'node:path';
import * as toml from '@iarna/toml';
import { type AgentSyncConfig, type MCPServerConfig, TOOL_CAPABILITIES } from '../config/index.js';
import { discoverConfigs, loadLocalConfig } from '../config/loader.js';

export type ConfigOptions = {
	json?: boolean;
	cwd?: string;
};

export async function configCommand(args: string[], options: ConfigOptions): Promise<void> {
	const [action, type, name, ...rest] = args;
	const cwd = options.cwd || process.cwd();

	switch (action) {
		case 'add': {
			await configAdd(type, name, rest, cwd, options);
			break;
		}

		case 'rm': {
			await configRm(type, name, cwd, options);
			break;
		}

		case 'ls': {
			await configLs(type, cwd, options);
			break;
		}

		case 'show': {
			await configShow(cwd, options);
			break;
		}

		default: {
			console.error(`Unknown config action: ${action}`);
			console.log('Usage: config <add|rm|ls|show> [type] [name]');
			process.exit(1);
		}
	}
}

async function configAdd(
	type: string,
	name: string,
	rest: string[],
	cwd: string,
	options: ConfigOptions
): Promise<void> {
	const configPath = path.join(cwd, '.agents', 'agentsync.toml');
	let config: AgentSyncConfig = {};

	if (fs.existsSync(configPath)) {
		try {
			const content = fs.readFileSync(configPath, 'utf-8');
			config = toml.parse(content) as AgentSyncConfig;
		} catch {
			// Invalid config, start fresh
		}
	}

	switch (type) {
		case 'tool': {
			config.tools ||= [];
			if (!config.tools.includes(name)) {
				config.tools.push(name);
			}

			break;
		}

		case 'mcp': {
			const mcpConfigIndex = rest.findIndex((r) => r.startsWith('--mcp-config='));
			if (mcpConfigIndex === -1) {
				console.error('Missing --mcp-config argument');
				process.exit(1);
			}

			const mcpConfigJson = rest[mcpConfigIndex].split('=')[1];
			const mcpServer = JSON.parse(mcpConfigJson);

			config.mcp ||= {};
			config.mcp[name] = mcpServer;
			break;
		}

		case 'preset': {
			config.extends ||= [];
			if (!config.extends.includes(name)) {
				config.extends.push(name);
			}

			break;
		}

		default: {
			console.error(`Unknown config type: ${type}`);
			process.exit(1);
		}
	}

	fs.mkdirSync(path.dirname(configPath), { recursive: true });
	fs.writeFileSync(configPath, toml.stringify(config as unknown as toml.JsonMap));

	if (options.json) {
		console.log(JSON.stringify({ success: true, type, name }, null, 2));
	} else {
		console.log(`Added ${type} '${name}' to config`);
	}
}

async function configRm(
	type: string,
	name: string,
	cwd: string,
	options: ConfigOptions
): Promise<void> {
	const configPath = path.join(cwd, '.agents', 'agentsync.toml');
	if (!fs.existsSync(configPath)) {
		console.error('No config file found');
		process.exit(1);
	}

	const content = fs.readFileSync(configPath, 'utf-8');
	const config = toml.parse(content) as AgentSyncConfig;

	switch (type) {
		case 'tool': {
			config.tools &&= config.tools.filter((t) => t !== name);
			break;
		}

		case 'mcp': {
			if (config.mcp) {
				// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
				delete config.mcp[name];
			}

			break;
		}

		case 'preset': {
			config.extends &&= config.extends.filter((e) => e !== name);
			break;
		}

		default: {
			console.error(`Unknown config type: ${type}`);
			process.exit(1);
		}
	}

	fs.writeFileSync(configPath, toml.stringify(config as unknown as toml.JsonMap));

	if (options.json) {
		console.log(JSON.stringify({ success: true, type, name }, null, 2));
	} else {
		console.log(`Removed ${type} '${name}' from config`);
	}
}

async function configLs(
	type: string | undefined,
	cwd: string,
	options: ConfigOptions
): Promise<void> {
	const discovered = discoverConfigs(cwd);
	const local = loadLocalConfig(cwd);

	const result: Record<string, unknown> = {};

	for (const { config } of discovered) {
		if (config.tools) result.tools = config.tools;
		if (config.mcp) result.mcp = config.mcp;
		if (config.extends) result.extends = config.extends;
		if (config.profiles) result.profiles = config.profiles;
	}

	// Merge local overrides
	if (local.tools) result.tools = local.tools;
	if (local.mcp) result.mcp = { ...(result.mcp as MCPServerConfig), ...local.mcp };
	if (local.extends) result.extends = [...((result.extends as string[]) || []), ...local.extends];

	if (options.json) {
		console.log(JSON.stringify(result, null, 2));
	} else {
		if (!type || type === 'tools') {
			console.log('Tools:');
			const tools = (result.tools as string[]) || [];
			for (const tool of tools) {
				console.log(`  - ${tool}`);
			}

			if (tools.length === 0) console.log('  (none)');
		}

		if (!type || type === 'mcp') {
			console.log('\nMCP Servers:');
			const mcp = (result.mcp as MCPServerConfig) || {};
			const entries = Object.entries(mcp);
			for (const [name, server] of entries) {
				console.log(`  - ${name}: ${server.command} ${(server.args || []).join(' ')}`);
			}

			if (entries.length === 0) console.log('  (none)');
		}

		if (!type || type === 'presets') {
			console.log('\nPresets:');
			const presets = (result.extends as string[]) || [];
			for (const preset of presets) {
				console.log(`  - ${preset}`);
			}

			if (presets.length === 0) console.log('  (none)');
		}
	}
}

async function configShow(cwd: string, options: ConfigOptions): Promise<void> {
	const discovered = discoverConfigs(cwd);
	const local = loadLocalConfig(cwd);

	const result: Record<string, unknown> = {};

	for (const { config, layer } of discovered) {
		result[layer] = config;
	}

	result.local = local;

	if (options.json) {
		console.log(JSON.stringify(result, null, 2));
	} else {
		console.log('Configuration hierarchy:');
		for (const { config, layer, path: configPath } of discovered) {
			console.log(`\n[${layer}] ${configPath}`);
			console.log(JSON.stringify(config, null, 2));
		}
	}
}
