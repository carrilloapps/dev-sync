import * as fs from 'node:fs';
import * as path from 'node:path';
import * as toml from 'toml';
import {
	type AgentSyncConfig,
	type DiscoveredConfig,
	type ResolvedConfig,
	type SkillFile,
	type CommandFile,
	type AgentFile,
	MCPServerConfig,
	type Profile,
} from './index.js';

export const GLOBAL_AGENTS_DIR =
	process.platform === 'win32'
		? path.join(process.env.APPDATA || '', 'sync', '.agents')
		: path.join(process.env.HOME || '', '.agents');

const PROJECT_AGENTS_DIR = '.agents';
const CONFIG_FILE = 'agentsync.toml';
const LOCAL_CONFIG = 'agentsync.local.toml';

export function findGitRoot(startPath: string): string | undefined {
	let current = path.isAbsolute(startPath) ? startPath : path.resolve(startPath);
	const visited = new Set<string>();

	while (!visited.has(current)) {
		visited.add(current);
		if (fs.existsSync(path.join(current, '.git'))) {
			return current;
		}

		const parent = path.dirname(current);
		if (parent === current) break;
		current = parent;
	}

	return undefined;
}

export function discoverConfigs(cwd: string): DiscoveredConfig[] {
	const configs: DiscoveredConfig[] = [];
	const gitRoot = findGitRoot(cwd);

	const globalConfigPath = path.join(GLOBAL_AGENTS_DIR, CONFIG_FILE);
	if (fs.existsSync(globalConfigPath)) {
		try {
			const content = fs.readFileSync(globalConfigPath, 'utf-8');
			const config = toml.parse(content) as AgentSyncConfig;
			configs.push({
				path: globalConfigPath,
				config,
				layer: 'global',
			});
		} catch {
			// Ignore invalid global config
		}
	}

	const searchPaths: Array<{ path: string; layer: DiscoveredConfig['layer'] }> = [];

	if (gitRoot) {
		const current = cwd;
		const cwdRelative = path.relative(gitRoot, cwd).split(path.sep);
		const parts = cwdRelative.filter((p) => p !== '.' && p !== '..');

		for (let i = 0; i <= parts.length; i++) {
			const agentPath = path.join(gitRoot, ...parts.slice(0, i), PROJECT_AGENTS_DIR, CONFIG_FILE);
			if (fs.existsSync(agentPath) && !searchPaths.some((s) => s.path === agentPath)) {
				searchPaths.push({
					path: agentPath,
					layer: i === 0 ? 'root' : i < parts.length ? 'team' : 'service',
				});
			}
		}
	} else {
		const agentPath = path.join(cwd, PROJECT_AGENTS_DIR, CONFIG_FILE);
		if (fs.existsSync(agentPath)) {
			searchPaths.push({ path: agentPath, layer: 'root' });
		}
	}

	for (const { path: configPath, layer } of searchPaths) {
		try {
			const content = fs.readFileSync(configPath, 'utf-8');
			const config = toml.parse(content) as AgentSyncConfig;
			const configDir = path.dirname(configPath);
			if (!configs.some((c) => c.path === configPath)) {
				configs.push({ path: configPath, config, layer });
			}
		} catch {
			// Ignore invalid configs
		}
	}

	return configs;
}

export function loadLocalConfig(cwd: string): AgentSyncConfig {
	const localPath = path.join(cwd, LOCAL_CONFIG);
	if (fs.existsSync(localPath)) {
		try {
			const content = fs.readFileSync(localPath, 'utf-8');
			return toml.parse(content) as AgentSyncConfig;
		} catch {
			// Ignore invalid local config
		}
	}

	return {};
}

function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
	const result = { ...base } as const;
	for (const key in override) {
		if (!Object.hasOwn(override, key)) {
			continue;
		}

		const baseValue = base[key];
		const overrideValue = override[key];
		if (Array.isArray(baseValue) && Array.isArray(overrideValue)) {
			result[key] = [...baseValue, ...overrideValue] as T[Extract<keyof T, string>];
		} else if (
			typeof baseValue === 'object' &&
			typeof overrideValue === 'object' &&
			baseValue !== null &&
			overrideValue !== null
		) {
			result[key] = deepMerge(
				baseValue as Record<string, unknown>,
				overrideValue as Record<string, unknown>
			) as T[Extract<keyof T, string>];
		} else if (overrideValue !== undefined) {
			result[key] = overrideValue as T[Extract<keyof T, string>];
		}
	}

	return result;
}

export function mergeConfigs(
	discovered: DiscoveredConfig[],
	local: AgentSyncConfig
): AgentSyncConfig {
	const merged: AgentSyncConfig = {
		tools: [],
		extends: [],
		mcp: {},
		profiles: {},
	};

	for (const { config } of discovered) {
		if (config.tools) {
			merged.tools = config.tools;
		}

		if (config.extends) {
			merged.extends = [...(merged.extends || []), ...config.extends];
		}

		if (config.mcp) {
			merged.mcp = { ...merged.mcp, ...config.mcp };
		}

		if (config.profiles) {
			merged.profiles = { ...merged.profiles, ...config.profiles };
		}
	}

	if (local.tools) {
		merged.tools = local.tools;
	}

	if (local.extends) {
		merged.extends = [...(merged.extends || []), ...local.extends];
	}

	if (local.mcp) {
		merged.mcp = { ...merged.mcp, ...local.mcp };
	}

	return merged;
}

export function getActiveProfile(
	config: AgentSyncConfig,
	cwd: string,
	envProfile?: string
): { profile: Profile | undefined; name: string | undefined } {
	const profileName =
		envProfile || (typeof process === 'undefined' ? undefined : process.env.AGENTSYNC_PROFILE);

	if (profileName && config.profiles?.[profileName]) {
		return { profile: config.profiles[profileName], name: profileName };
	}

	if (config.profiles) {
		for (const [name, profile] of Object.entries(config.profiles)) {
			if (profile.env && typeof process !== 'undefined' && process.env[profile.env]) {
				return { profile, name };
			}

			if (profile.paths && profile.paths.length > 0) {
				const relativeCwd = path.relative(process.cwd(), cwd);
				for (const pattern of profile.paths) {
					if (matchGlob(relativeCwd, pattern) || matchGlob(cwd, pattern)) {
						return { profile, name };
					}
				}
			}
		}
	}

	return { profile: undefined, name: undefined };
}

function matchGlob(str: string, pattern: string): boolean {
	const regex = pattern.replaceAll('.', '\\.').replaceAll('*', '.*').replaceAll('?', '.');
	return new RegExp(`^${regex}$`).test(str);
}

export function applyProfile(config: AgentSyncConfig, profile: Profile): AgentSyncConfig {
	const result = { ...config };

	if (profile.tools) {
		result.tools = profile.tools;
	}

	if (profile.mcp) {
		result.mcp = Object.fromEntries(
			Object.entries(result.mcp || {}).filter(([key]) => profile.mcp!.includes(key))
		);
	}

	if (profile.skills) {
		// Filter skills would be applied during content loading
		result.profiles = { ...result.profiles };
	}

	if (profile.extends) {
		result.extends = profile.extends;
	}

	return result;
}

export function resolveConfig(cwd: string, profileName?: string): ResolvedConfig {
	const discovered = discoverConfigs(cwd);
	const local = loadLocalConfig(cwd);
	const baseConfig = mergeConfigs(discovered, local);

	let config = baseConfig;
	const { profile } = getActiveProfile(baseConfig, cwd, profileName);
	if (profile) {
		config = applyProfile(baseConfig, profile);
	}

	const skills = loadContent<SkillFile>(cwd, 'skills', 'skill');
	const commands = loadContent<CommandFile>(cwd, 'commands', 'command');
	const agents = loadContent<AgentFile>(cwd, 'agents', 'agent');

	return {
		tools: config.tools || [],
		extends: config.extends || [],
		mcp: config.mcp || {},
		profiles: config.profiles || {},
		skills,
		commands,
		agents,
	};
}

type ContentLoadOptions<T> = {
	cwd: string;
	dir: 'skills' | 'commands' | 'agents';
	type: 'skill' | 'command' | 'agent';
};

function loadContent<
	T extends { frontmatter: Record<string, unknown>; source: 'global' | 'project' | 'preset' },
>(cwd: string, dir: 'skills' | 'commands' | 'agents', type: 'skill' | 'command' | 'agent'): T[] {
	const results: T[] = [];
	const globalDir = path.join(GLOBAL_AGENTS_DIR, dir);
	const projectDir = path.join(cwd, PROJECT_AGENTS_DIR, dir);

	const dirs = [
		{ dir: globalDir, source: 'global' as const },
		{ dir: projectDir, source: 'project' as const },
	];

	for (const { dir: contentDir, source } of dirs) {
		if (fs.existsSync(contentDir)) {
			const files = fs.readdirSync(contentDir).filter((f) => f.endsWith('.md'));
			for (const file of files) {
				const filePath = path.join(contentDir, file);
				try {
					const content = fs.readFileSync(filePath, 'utf-8');
					const { frontmatter, body } = parseFrontmatter(content);
					const name = path.basename(file, '.md');
					const result = {
						path: filePath,
						name,
						description: (frontmatter.description as string) || '',
						content: body,
						frontmatter,
						source,
					} as unknown as T;
					results.push(result);
				} catch {
					// Ignore unreadable files
				}
			}
		}
	}

	return results;
}

export function parseFrontmatter(content: string): {
	frontmatter: Record<string, unknown>;
	body: string;
} {
	const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(content);
	if (match) {
		try {
			const frontmatter = toml.parse(match[1]) as Record<string, unknown>;
			return { frontmatter, body: match[2] };
		} catch {
			return { frontmatter: {}, body: content };
		}
	}

	return { frontmatter: {}, body: content };
}

export function getToolDir(tool: string): string {
	const dirs: Record<string, string> = {
		claude: '.claude',
		opencode: '.agents',
		codex: '.codex',
		gemini: '.gemini',
		amp: '.amp',
		goose: '.goose',
		aider: '.aider',
		amazonq: '.amazonq',
		augment: '.augment',
		kiro: '.kiro',
		openhands: '.openhands',
		junie: '.junie',
		crush: '.crush',
		kilocode: '.kilocode',
		qwen: '.qwen',
		cursor: '.cursor',
		copilot: '.github',
		roocode: '.roo',
		cline: '.clinerules',
	};
	return dirs[tool] || `.${tool}`;
}
