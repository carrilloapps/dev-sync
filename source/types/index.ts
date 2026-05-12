export type ProjectContext = {
	projectPath: string;
	sourceFiles: SourceFile[];
	configFiles: ConfigFile[];
	dependencies: Dependency[];
	environment: EnvironmentInfo;
};

export type SourceFile = {
	path: string;
	language: string;
	framework?: string | undefined;
	lines: number;
	imports: string[];
	exports: string[];
};

export type ConfigFile = {
	path: string;
	type:
		| 'package'
		| 'tsconfig'
		| 'babel'
		| 'eslint'
		| 'prettier'
		| 'jest'
		| 'webpack'
		| 'vite'
		| 'next'
		| 'other';
	content: Record<string, unknown>;
};

export type Dependency = {
	name: string;
	version: string;
	type: 'production' | 'development';
	peer?: boolean;
};

export type EnvironmentInfo = {
	platform: 'windows' | 'linux' | 'mac';
	nodeVersion: string;
	packageManager: 'npm' | 'yarn' | 'pnpm';
	shell: string;
};

export type AnalyzerResult = {
	source:
		| 'claude-code'
		| 'copilot'
		| 'gemini'
		| 'opencode'
		| 'cursor'
		| 'windsurf'
		| string;
	projectContext: ProjectContext;
	sessionData?: SessionData | undefined;
	recommendations?: string[];
};

export type SessionData = {
	conversations: Conversation[];
	tools: ToolUsage[];
	memory?: MemoryContext | undefined;
};

export type Conversation = {
	id: string;
	timestamp: string;
	messages: Message[];
};

export type Message = {
	role: 'user' | 'assistant' | 'system';
	content: string;
	attachments?: string[];
};

export type ToolUsage = {
	name: string;
	count: number;
	lastUsed: string;
};

export type MemoryContext = {
	projectSummary?: string;
	learnedPatterns: string[];
	customRules: string[];
	[key: string]: string | string[] | undefined;
};

export type MigratorOptions = {
	targetAgent: 'opencode';
	overwrite: boolean;
	preserveHistory: boolean;
	validateResults: boolean;
};

export type MigrationResult = {
	success: boolean;
	filesCreated: string[];
	filesModified: string[];
	errors: string[];
	warnings: string[];
};

export type WatchOptions = {
	persistent: boolean;
	ignoreInitial: boolean;
	followSymlinks: boolean;
	depth?: number;
	ignored?: string | string[];
	awaitWriteFinish?: {
		stabilityThreshold?: number;
		pollInterval?: number;
	};
};

export type SessionInfo = {
	id: string;
	startedAt: string;
	lastSync?: string | undefined;
	filesTracked: number;
	changesCount: number;
};

export type SyncResult = {
	success: boolean;
	analysis?: AnalyzerResult | undefined;
	migration?: MigrationResult | undefined;
	duration: number;
};

export type CloudConfig = {
	enabled: boolean;
	provider: 'opencode' | 'custom';
	endpoint?: string | undefined;
	apiKey?: string | undefined;
};
