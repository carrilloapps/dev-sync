import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolveConfig, discoverConfigs, loadLocalConfig, GLOBAL_AGENTS_DIR } from './loader.js';
import { ResolvedConfig, type DoctorResult, TOOL_CAPABILITIES, TOOL_DIRS } from './index.js';

export async function doctor(
	options: { cwd?: string; json?: boolean } = {}
): Promise<DoctorResult> {
	const cwd = options.cwd || process.cwd();
	const result: DoctorResult = {
		config: { valid: true, errors: [] },
		tools: { found: [], missing: [] },
		mcp: { configured: [], missing: [] },
		presets: { resolved: [], failed: [] },
		env: { required: [], missing: [] },
	};

	// Check config validity
	try {
		const discovered = discoverConfigs(cwd);
		const local = loadLocalConfig(cwd);

		if (discovered.length === 0 && Object.keys(local).length === 0) {
			result.config.errors.push('No configuration found');
			result.config.valid = false;
		}

		for (const { path: configPath, config } of discovered) {
			if (!config.tools || config.tools.length === 0) {
				result.config.errors.push(`${configPath}: No tools defined`);
			}

			for (const tool of config.tools || []) {
				if (!TOOL_CAPABILITIES[tool]) {
					result.config.errors.push(`${configPath}: Unknown tool '${tool}'`);
				}
			}
		}
	} catch (error) {
		result.config.valid = false;
		result.config.errors.push(`Config error: ${error}`);
	}

	// Check tools
	const config = resolveConfig(cwd);
	for (const tool of config.tools) {
		const toolDir = TOOL_DIRS[tool];
		const toolPath = path.join(cwd, toolDir);
		if (fs.existsSync(toolPath)) {
			result.tools.found.push(tool);
		} else {
			result.tools.missing.push(tool);
		}
	}

	// Check MCP servers
	result.mcp.configured = Object.keys(config.mcp);
	for (const [name, server] of Object.entries(config.mcp)) {
		if (server.env) {
			for (const key of Object.keys(server.env)) {
				const value = server.env[key] as string;
				if (value && typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
					const envVar = value.slice(1, -1);
					result.env.required.push(envVar);
					if (!process.env[envVar]) {
						result.env.missing.push(envVar);
					}
				}
			}
		}

		if (!server.command && !server.url) {
			result.mcp.missing.push(`${name}: missing command or url`);
		}
	}

	// Check presets
	for (const ext of config.extends) {
		try {
			const presetPath = resolvePreset(ext, cwd);
			if (presetPath && fs.existsSync(presetPath)) {
				result.presets.resolved.push(ext);
			} else {
				result.presets.failed.push(ext);
			}
		} catch {
			result.presets.failed.push(ext);
		}
	}

	return result;
}

function resolvePreset(ext: string, cwd: string): string | undefined {
	if (ext.startsWith('github:')) {
		// GitHub presets would need git clone - skip for now
		return undefined;
	}

	if (ext.startsWith('fs:')) {
		return path.resolve(cwd, ext.slice(3));
	}

	if (ext.startsWith('./') || ext.startsWith('../') || ext.startsWith('/')) {
		return path.resolve(cwd, ext);
	}

	// Relative path without prefix
	return path.resolve(cwd, ext);
}

export function printDoctor(result: DoctorResult): string {
	const lines: string[] = [];

	lines.push('=== Agent Sync Doctor ===\n', 'Config:');
	if (result.config.valid) {
		lines.push('  ✓ Configuration is valid');
	} else {
		lines.push('  ✗ Configuration has errors:');
		for (const error of result.config.errors) {
			lines.push(`    - ${error}`);
		}
	}

	lines.push('\nTools:');
	if (result.tools.found.length > 0) {
		lines.push(`  Found: ${result.tools.found.join(', ')}`);
	}

	if (result.tools.missing.length > 0) {
		lines.push(`  Missing directories: ${result.tools.missing.join(', ')}`);
	}

	lines.push('\nMCP Servers:');
	if (result.mcp.configured.length > 0) {
		lines.push(`  Configured: ${result.mcp.configured.join(', ')}`);
	}

	if (result.mcp.missing.length > 0) {
		lines.push('  Errors:');
		for (const mcp of result.mcp.missing) {
			lines.push(`    - ${mcp}`);
		}
	}

	lines.push('\nPresets:');
	if (result.presets.resolved.length > 0) {
		lines.push(`  Resolved: ${result.presets.resolved.join(', ')}`);
	}

	if (result.presets.failed.length > 0) {
		lines.push(`  Failed: ${result.presets.failed.join(', ')}`);
	}

	lines.push('\nEnvironment:');
	if (result.env.required.length > 0) {
		lines.push(`  Required: ${result.env.required.join(', ')}`);
	}

	if (result.env.missing.length > 0) {
		lines.push(`  Missing: ${result.env.missing.join(', ')}`);
	}

	return lines.join('\n');
}
