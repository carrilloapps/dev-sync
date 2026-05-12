export type MCPServer = {
	command: string;
	args?: string[];
	env?: Record<string, string>;
	url?: string;
};

export type MCPServerConfig = Record<string, MCPServer>;

export type Profile = {
	tools?: string[];
	mcp?: string[];
	skills?: string[];
	commands?: string[];
	extends?: string[];
	paths?: string[];
	env?: string;
};

export type Profiles = Record<string, Profile>;

export type AgentSyncConfig = {
	tools?: string[];
	extends?: string[];
	mcp?: MCPServerConfig;
	profiles?: Profiles;
};

export type DiscoveredConfig = {
	path: string;
	config: AgentSyncConfig;
	layer: 'global' | 'root' | 'team' | 'service';
};

export type ResolvedConfig = {
	tools: string[];
	extends: string[];
	mcp: MCPServerConfig;
	profiles: Profiles;
	skills: SkillFile[];
	commands: CommandFile[];
	agents: AgentFile[];
};

export type SkillFile = {
	path: string;
	name: string;
	description: string;
	content: string;
	frontmatter: SkillFrontmatter;
	namespace?: string;
	source: 'global' | 'project' | 'preset';
};

export type SkillFrontmatter = {
	description: string;
	globs?: string;
	alwaysApply?: boolean;
	priority?: number;
	tags?: string[];
	[key: string]: unknown;
};

export type CommandFile = {
	path: string;
	name: string;
	description: string;
	argumentHint?: string;
	content: string;
	frontmatter: CommandFrontmatter;
	namespace?: string;
	source: 'global' | 'project' | 'preset';
};

export type CommandFrontmatter = {
	description: string;
	argumentHint?: string;
	[key: string]: unknown;
};

export type AgentFile = {
	path: string;
	name: string;
	description: string;
	content: string;
	frontmatter: AgentFrontmatter;
	namespace?: string;
	source: 'global' | 'project' | 'preset';
};

export type AgentFrontmatter = {
	description: string;
	instructions?: string;
	[key: string]: unknown;
};

export type PresetSource = {
	type: 'github' | 'fs';
	source: string;
	ref?: string;
};

export type SyncOptions = {
	cwd?: string;
	dryRun?: boolean;
	tool?: string;
	profile?: string;
	copyMode?: 'copy' | 'link';
	noToolDetection?: boolean;
	json?: boolean;
};

export type SyncResult = {
	changed: string[];
	added: string[];
	removed: string[];
	errors: string[];
	duration: number;
};

export type DoctorResult = {
	config: {
		valid: boolean;
		errors: string[];
	};
	tools: {
		found: string[];
		missing: string[];
	};
	mcp: {
		configured: string[];
		missing: string[];
	};
	presets: {
		resolved: string[];
		failed: string[];
	};
	env: {
		required: string[];
		missing: string[];
	};
};

export type ToolCapability = {
	skills: boolean;
	commands: boolean;
	mcp: boolean;
	method: 'copy' | 'native';
};

export const TOOL_CAPABILITIES: Record<string, ToolCapability> = {
	claude: { skills: true, commands: true, mcp: true, method: 'copy' },
	opencode: { skills: true, commands: true, mcp: true, method: 'native' },
	codex: { skills: true, commands: false, mcp: true, method: 'native' },
	gemini: { skills: true, commands: false, mcp: true, method: 'native' },
	amp: { skills: true, commands: true, mcp: true, method: 'native' },
	goose: { skills: true, commands: false, mcp: true, method: 'native' },
	aider: { skills: true, commands: false, mcp: false, method: 'native' },
	amazonq: { skills: true, commands: false, mcp: true, method: 'native' },
	augment: { skills: true, commands: true, mcp: true, method: 'native' },
	kiro: { skills: true, commands: false, mcp: true, method: 'native' },
	openhands: { skills: true, commands: false, mcp: true, method: 'native' },
	junie: { skills: true, commands: false, mcp: true, method: 'native' },
	crush: { skills: false, commands: false, mcp: true, method: 'copy' },
	kilocode: { skills: true, commands: false, mcp: true, method: 'native' },
	qwen: { skills: true, commands: false, mcp: true, method: 'native' },
	cursor: { skills: true, commands: true, mcp: true, method: 'copy' },
	copilot: { skills: true, commands: false, mcp: true, method: 'copy' },
	roocode: { skills: true, commands: true, mcp: true, method: 'copy' },
	cline: { skills: true, commands: false, mcp: false, method: 'copy' },
	windsurf: { skills: true, commands: true, mcp: true, method: 'copy' },
};

export const TOOL_DIRS: Record<string, string> = {
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
	windsurf: '.windsurf',
};

export { parseFrontmatter } from './loader.js';
export {
	GLOBAL_AGENTS_DIR,
	findGitRoot,
	discoverConfigs,
	loadLocalConfig,
	mergeConfigs,
	resolveConfig,
	getToolDir,
} from './loader.js';
export { sync, clean, initConfig } from './sync.js';
export { doctor, printDoctor } from './doctor.js';
