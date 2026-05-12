import test from 'ava';
import type {
	ProjectContext,
	AnalyzerResult,
	SessionData,
	SyncResult,
	MigrationResult,
	Conversation,
	Message,
	ToolUsage,
	MemoryContext,
	Dependency,
	SourceFile,
	ConfigFile,
	EnvironmentInfo,
	WatchOptions,
	SessionInfo,
	CloudConfig,
} from './index.js';

test('ProjectContext type validation', (t) => {
	const context: ProjectContext = {
		projectPath: '/test/project',
		sourceFiles: [],
		configFiles: [],
		dependencies: [],
		environment: {
			platform: 'linux',
			nodeVersion: '20.0.0',
			packageManager: 'npm',
			shell: '/bin/bash',
		},
	};
	t.is(context.projectPath, '/test/project');
	t.is(context.environment.platform, 'linux');
});

test('AnalyzerResult type validation', (t) => {
	const result: AnalyzerResult = {
		source: 'claude-code',
		projectContext: {
			projectPath: '/test',
			sourceFiles: [],
			configFiles: [],
			dependencies: [],
			environment: {
				platform: 'mac',
				nodeVersion: '20.0.0',
				packageManager: 'npm',
				shell: '/zsh',
			},
		},
		recommendations: ['Test recommendation'],
	};
	t.is(result.source, 'claude-code');
	t.deepEqual(result.recommendations, ['Test recommendation']);
});

test('SessionData with memory context', (t) => {
	const session: SessionData = {
		conversations: [],
		tools: [],
		memory: {
			learnedPatterns: ['pattern1', 'pattern2'],
			customRules: ['rule1'],
		},
	};
	t.is(session.memory?.learnedPatterns.length, 2);
	t.is(session.memory?.customRules.length, 1);
});

test('SessionData without memory', (t) => {
	const session: SessionData = {
		conversations: [],
		tools: [],
	};
	t.is(session.memory, undefined);
});

test('SyncResult tracks analysis and migration', (t) => {
	const result: SyncResult = {
		success: true,
		analysis: undefined,
		migration: undefined,
		duration: 100,
	};
	t.true(result.success);
	t.is(result.duration, 100);
});

test('MigrationResult contains file tracking', (t) => {
	const result: MigrationResult = {
		success: true,
		filesCreated: ['file1.json', 'file2.json'],
		filesModified: ['existing.json'],
		errors: ['error 1'],
		warnings: ['Warning 1'],
	};
	t.is(result.filesCreated.length, 2);
	t.is(result.filesModified.length, 1);
	t.is(result.errors.length, 1);
	t.is(result.warnings.length, 1);
});

test('MigrationResult with failed status', (t) => {
	const result: MigrationResult = {
		success: false,
		filesCreated: [],
		filesModified: [],
		errors: ['Error occurred'],
		warnings: [],
	};
	t.false(result.success);
	t.true(result.errors.length > 0);
});

test('Conversation type with messages', (t) => {
	const conv: Conversation = {
		id: 'conv-1',
		timestamp: '2024-01-01T00:00:00Z',
		messages: [
			{ role: 'user', content: 'Hello' },
			{ role: 'assistant', content: 'Hi there!' },
		],
	};
	t.is(conv.messages.length, 2);
	t.is(conv.messages[0].role, 'user');
	t.is(conv.messages[1].role, 'assistant');
});

test('Message with attachments', (t) => {
	const msg: Message = {
		role: 'user',
		content: 'Check this file',
		attachments: ['/path/to/file.ts', '/path/to/config.json'],
	};
	t.is(msg.attachments?.length, 2);
});

test('ToolUsage tracking', (t) => {
	const tool: ToolUsage = {
		name: 'search_code',
		count: 42,
		lastUsed: '2024-01-01T12:00:00Z',
	};
	t.is(tool.count, 42);
	t.is(tool.name, 'search_code');
});

test('MemoryContext structure', (t) => {
	const memory: MemoryContext = {
		projectSummary: 'A test project',
		learnedPatterns: ['pattern1'],
		customRules: ['rule1', 'rule2'],
	};
	t.is(memory.projectSummary, 'A test project');
	t.is(memory.learnedPatterns.length, 1);
	t.is(memory.customRules.length, 2);
});

test('Dependency types', (t) => {
	const prodDep: Dependency = {
		name: 'react',
		version: '^18.0.0',
		type: 'production',
	};
	const devDep: Dependency = {
		name: 'typescript',
		version: '~5.0.0',
		type: 'development',
		peer: false,
	};
	t.is(prodDep.type, 'production');
	t.is(devDep.type, 'development');
	t.false(devDep.peer);
});

test('SourceFile structure', (t) => {
	const file: SourceFile = {
		path: 'src/index.ts',
		language: 'TypeScript',
		framework: 'React',
		lines: 100,
		imports: ['react', 'react-dom'],
		exports: ['default App'],
	};
	t.is(file.language, 'TypeScript');
	t.is(file.framework, 'React');
	t.is(file.lines, 100);
});

test('SourceFile without framework', (t) => {
	const file: SourceFile = {
		path: 'src/utils.ts',
		language: 'TypeScript',
		lines: 50,
		imports: [],
		exports: [],
	};
	t.is(file.framework, undefined);
});

test('ConfigFile types', (t) => {
	const configs: ConfigFile[] = [
		{ path: 'package.json', type: 'package', content: {} },
		{ path: 'tsconfig.json', type: 'tsconfig', content: {} },
		{ path: '.babelrc', type: 'babel', content: {} },
		{ path: '.eslintrc.json', type: 'eslint', content: {} },
		{ path: '.prettierrc', type: 'prettier', content: {} },
		{ path: 'jest.config.js', type: 'jest', content: {} },
		{ path: 'webpack.config.js', type: 'webpack', content: {} },
		{ path: 'vite.config.ts', type: 'vite', content: {} },
		{ path: 'next.config.js', type: 'next', content: {} },
		{ path: 'other.config', type: 'other', content: {} },
	];

	for (const config of configs) {
		t.truthy(config.path);
		t.truthy(config.type);
	}
});

test('EnvironmentInfo platforms', (t) => {
	const platforms: EnvironmentInfo['platform'][] = ['windows', 'linux', 'mac'];
	for (const platform of platforms) {
		const env: EnvironmentInfo = {
			platform,
			nodeVersion: '20.0.0',
			packageManager: 'npm',
			shell: '/bin/bash',
		};
		t.is(env.platform, platform);
	}
});

test('EnvironmentInfo package managers', (t) => {
	const managers: EnvironmentInfo['packageManager'][] = ['npm', 'yarn', 'pnpm'];
	for (const manager of managers) {
		const env: EnvironmentInfo = {
			platform: 'linux',
			nodeVersion: '20.0.0',
			packageManager: manager,
			shell: '/bin/bash',
		};
		t.is(env.packageManager, manager);
	}
});

test('WatchOptions defaults', (t) => {
	const opts: WatchOptions = {
		persistent: true,
		ignoreInitial: true,
		followSymlinks: false,
	};
	t.true(opts.persistent);
	t.true(opts.ignoreInitial);
	t.false(opts.followSymlinks);
});

test('WatchOptions with depth', (t) => {
	const opts: WatchOptions = {
		persistent: true,
		ignoreInitial: false,
		followSymlinks: true,
		depth: 5,
	};
	t.is(opts.depth, 5);
});

test('SessionInfo structure', (t) => {
	const info: SessionInfo = {
		id: 'session-1',
		startedAt: '2024-01-01T00:00:00Z',
		lastSync: '2024-01-01T01:00:00Z',
		filesTracked: 10,
		changesCount: 5,
	};
	t.is(info.id, 'session-1');
	t.is(info.filesTracked, 10);
});

test('SessionInfo without lastSync', (t) => {
	const info: SessionInfo = {
		id: 'session-1',
		startedAt: '2024-01-01T00:00:00Z',
		lastSync: undefined,
		filesTracked: 0,
		changesCount: 0,
	};
	t.is(info.lastSync, undefined);
});

test('CloudConfig structure', (t) => {
	const config: CloudConfig = {
		enabled: true,
		provider: 'opencode',
		endpoint: 'https://api.opencode.ai',
		apiKey: 'secret-key',
	};
	t.true(config.enabled);
	t.is(config.provider, 'opencode');
	t.is(config.endpoint, 'https://api.opencode.ai');
});

test('CloudConfig disabled', (t) => {
	const config: CloudConfig = {
		enabled: false,
		provider: 'custom',
	};
	t.false(config.enabled);
	t.is(config.endpoint, undefined);
	t.is(config.apiKey, undefined);
});
