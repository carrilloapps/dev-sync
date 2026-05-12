import * as fs from 'node:fs';
import * as path from 'node:path';
import {
	type ProjectContext,
	type MigrationResult,
	WatchOptions,
	SessionInfo,
	SyncResult,
} from '../types/index.js';

export type SessionData = {
	conversations: ConversationInfo[];
	tools: ToolUsage[];
	memory?: {
		learnedPatterns: string[];
		customRules: string[];
	};
};

export type ConversationInfo = {
	id: string;
	messages: ConversationMessage[];
	timestamp: string;
};

export type ConversationMessage = {
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp?: string;
};

export type ToolUsage = {
	name: string;
	count: number;
	lastUsed: string;
};

export type ExporterOptions = {
	overwrite: boolean;
	preserveHistory: boolean;
	validateResults: boolean;
};

export type Exporter = {
	export(
		context: ProjectContext,
		sessionData?: any,
		options?: Partial<ExporterOptions>,
	): Promise<MigrationResult>;
	getId(): string;
	getName(): string;
};

export abstract class BaseExporter implements Exporter {
	protected projectPath: string;
	protected options: ExporterOptions;

	constructor(projectPath: string, options: ExporterOptions) {
		this.projectPath = projectPath;
		this.options = options;
	}

	abstract getId(): string;
	abstract getName(): string;

	abstract export(
		context: ProjectContext,
		sessionData?: SessionData | undefined,
		options?: Partial<ExporterOptions>,
	): Promise<MigrationResult>;

	protected ensureDir(dirPath: string): void {
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath, {recursive: true});
		}
	}

	protected writeJson(filePath: string, data: unknown): void {
		fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
	}

	protected getWorkspaceDir(): string {
		return path.join(this.projectPath, this.getConfigDir());
	}

	protected abstract getConfigDir(): string;

	protected exportConversations(
		convDir: string,
		conversations: ConversationInfo[],
	): void {
		if (conversations.length === 0) return;
		this.ensureDir(convDir);
		const index: Array<Record<string, unknown>> = [];
		for (const conv of conversations) {
			const convFile = `${conv.id}.json`;
			this.writeJson(path.join(convDir, convFile), {
				id: conv.id,
				messages: conv.messages,
				timestamp: conv.timestamp,
				migratedAt: new Date().toISOString(),
			});
			index.push({
				id: conv.id,
				file: convFile,
				messageCount: conv.messages.length,
			});
		}

		this.writeJson(path.join(convDir, 'index.json'), {
			migratedAt: new Date().toISOString(),
			conversations: index,
		});
	}
}

export function createExporter(
	target: string,
	projectPath: string,
	options: ExporterOptions,
): Exporter {
	switch (target) {
		case 'opencode': {
			return new OpenCodeExporterImpl(projectPath, options);
		}

		case 'vscode': {
			return new VSCodeExporterImpl(projectPath, options);
		}

		case 'jetbrains': {
			return new JetBrainsExporterImpl(projectPath, options);
		}

		case 'cursor': {
			return new CursorExporterImpl(projectPath, options);
		}

		case 'sublime': {
			return new SublimeExporterImpl(projectPath, options);
		}

		case 'vim': {
			return new VimExporterImpl(projectPath, options);
		}

		case 'emacs': {
			return new EmacsExporterImpl(projectPath, options);
		}

		case 'atom': {
			return new AtomExporterImpl(projectPath, options);
		}

		case 'zed': {
			return new ZedExporterImpl(projectPath, options);
		}

		case 'lapce': {
			return new LapceExporterImpl(projectPath, options);
		}

		case 'nova': {
			return new NovaExporterImpl(projectPath, options);
		}

		case 'onivim': {
			return new OnivimExporterImpl(projectPath, options);
		}

		case 'tabby': {
			return new TabbyExporterImpl(projectPath, options);
		}

		default: {
			throw new Error(
				`Unknown target: ${target}. Supported: ${ALL_TARGETS.map((t) => t.id).join(', ')}`,
			);
		}
	}
}

class OpenCodeExporterImpl extends BaseExporter {
	getId(): string {
		return 'opencode';
	}

	getName(): string {
		return 'OpenCode';
	}

	protected getConfigDir(): string {
		return '.opencode';
	}

	async export(
		context: ProjectContext,
		sessionData?: SessionData | undefined,
	): Promise<MigrationResult> {
		const result: MigrationResult = {
			success: false,
			filesCreated: [],
			filesModified: [],
			errors: [],
			warnings: [],
		};

		try {
			this.ensureDir(this.getWorkspaceDir());
			this.ensureDir(path.join(this.getWorkspaceDir(), 'sessions'));
			this.ensureDir(path.join(this.getWorkspaceDir(), 'cache'));
			this.ensureDir(path.join(this.getWorkspaceDir(), 'memory'));

			this.writeJson(path.join(this.getWorkspaceDir(), 'config.json'), {
				version: '1.0.0',
				migratedAt: new Date().toISOString(),
				project: {
					path: context.projectPath,
					files: context.sourceFiles.length,
					languages: [...new Set(context.sourceFiles.map((f) => f.language))],
				},
			});
			this.writeJson(
				path.join(this.getWorkspaceDir(), 'dependencies.json'),
				context.dependencies,
			);
			this.writeJson(
				path.join(this.getWorkspaceDir(), 'source-map.json'),
				context.sourceFiles.map((f) => ({
					path: f.path,
					language: f.language,
					framework: f.framework,
					lines: f.lines,
				})),
			);

			if (sessionData?.conversations && sessionData.conversations.length > 0) {
				const sessionsDir = path.join(this.getWorkspaceDir(), 'sessions');
				const conversationsFile: Array<Record<string, unknown>> = [];

				for (const conv of sessionData.conversations) {
					const convFile = `${conv.id}.json`;
					this.writeJson(path.join(sessionsDir, convFile), {
						id: conv.id,
						messages: conv.messages,
						migratedAt: new Date().toISOString(),
					});
					conversationsFile.push({
						id: conv.id,
						file: convFile,
						messageCount: conv.messages.length,
					});
				}

				this.writeJson(path.join(sessionsDir, 'index.json'), {
					migratedAt: new Date().toISOString(),
					conversations: conversationsFile,
					tools: sessionData.tools || [],
					memory: sessionData.memory || {
						learnedPatterns: [],
						customRules: [],
					},
				});
				result.filesCreated.push(
					'.opencode/sessions/*.json (conversation files)',
				);
			} else {
				this.writeJson(
					path.join(this.getWorkspaceDir(), 'sessions', 'index.json'),
					{
						migratedAt: new Date().toISOString(),
						conversations: [],
						tools: [],
						memory: {learnedPatterns: [], customRules: []},
					},
				);
			}

			result.success = true;
			result.filesCreated = [
				'.opencode/config.json',
				'.opencode/dependencies.json',
				'.opencode/source-map.json',
				'.opencode/sessions/index.json',
			];
		} catch (error) {
			result.errors.push(
				error instanceof Error ? error.message : String(error),
			);
		}

		return result;
	}
}

class VSCodeExporterImpl extends BaseExporter {
	getId(): string {
		return 'vscode';
	}

	getName(): string {
		return 'Visual Studio Code';
	}

	protected getConfigDir(): string {
		return '.vscode';
	}

	async export(
		context: ProjectContext,
		sessionData?: SessionData | undefined,
	): Promise<MigrationResult> {
		const result: MigrationResult = {
			success: false,
			filesCreated: [],
			filesModified: [],
			errors: [],
			warnings: [],
		};

		try {
			this.ensureDir(this.getWorkspaceDir());
			this.ensureDir(path.join(this.getWorkspaceDir(), 'conversation-history'));

			this.writeJson(
				path.join(this.getWorkspaceDir(), 'workspace-state.json'),
				{
					version: '1.0.0',
					migratedAt: new Date().toISOString(),
					languages: [...new Set(context.sourceFiles.map((f) => f.language))],
					files: context.sourceFiles.length,
				},
			);
			this.writeJson(
				path.join(this.getWorkspaceDir(), 'file-mappings.json'),
				context.sourceFiles.map((f) => ({
					path: f.path,
					language: f.language,
				})),
			);

			if (sessionData?.conversations && sessionData.conversations.length > 0) {
				const convDir = path.join(
					this.getWorkspaceDir(),
					'conversation-history',
				);
				const conversationsFile: Array<Record<string, unknown>> = [];

				for (const conv of sessionData.conversations) {
					const convFile = `${conv.id}.json`;
					this.writeJson(path.join(convDir, convFile), {
						id: conv.id,
						messages: conv.messages,
						migratedAt: new Date().toISOString(),
					});
					conversationsFile.push({
						id: conv.id,
						file: convFile,
						messageCount: conv.messages.length,
					});
				}

				this.writeJson(path.join(convDir, 'index.json'), {
					migratedAt: new Date().toISOString(),
					conversations: conversationsFile,
					tools: sessionData.tools || [],
				});
				result.filesCreated.push('.vscode/conversation-history/*.json');
			}

			result.success = true;
			result.filesCreated.push(
				'.vscode/workspace-state.json',
				'.vscode/file-mappings.json',
			);
		} catch (error) {
			result.errors.push(
				error instanceof Error ? error.message : String(error),
			);
		}

		return result;
	}
}

class JetBrainsExporterImpl extends BaseExporter {
	getId(): string {
		return 'jetbrains';
	}

	getName(): string {
		return 'JetBrains IDEs';
	}

	protected getConfigDir(): string {
		return '.jetbrains';
	}

	async export(
		context: ProjectContext,
		sessionData?: SessionData | undefined,
	): Promise<MigrationResult> {
		const result: MigrationResult = {
			success: false,
			filesCreated: [],
			filesModified: [],
			errors: [],
			warnings: [],
		};

		try {
			this.ensureDir(this.getWorkspaceDir());
			this.ensureDir(path.join(this.getWorkspaceDir(), 'workspace'));
			this.ensureDir(path.join(this.getWorkspaceDir(), 'chats'));

			this.writeJson(
				path.join(this.getWorkspaceDir(), 'workspace', 'project-state.json'),
				{
					version: '1.0.0',
					migratedAt: new Date().toISOString(),
					project: {
						name: path.basename(context.projectPath),
						path: context.projectPath,
					},
				},
			);
			this.writeJson(
				path.join(this.getWorkspaceDir(), 'file-index.json'),
				context.sourceFiles.map((f) => ({
					path: f.path,
					language: f.language,
				})),
			);

			if (sessionData?.conversations && sessionData.conversations.length > 0) {
				const chatsDir = path.join(this.getWorkspaceDir(), 'chats');
				const conversationsFile: Array<Record<string, unknown>> = [];

				for (const conv of sessionData.conversations) {
					const convFile = `${conv.id}.json`;
					this.writeJson(path.join(chatsDir, convFile), {
						id: conv.id,
						messages: conv.messages,
						migratedAt: new Date().toISOString(),
					});
					conversationsFile.push({
						id: conv.id,
						file: convFile,
						messageCount: conv.messages.length,
					});
				}

				this.writeJson(path.join(chatsDir, 'index.json'), {
					migratedAt: new Date().toISOString(),
					conversations: conversationsFile,
					tools: sessionData.tools || [],
				});
				result.filesCreated.push('.jetbrains/chats/*.json');
			}

			result.success = true;
			result.filesCreated.push(
				'.jetbrains/workspace/project-state.json',
				'.jetbrains/file-index.json',
			);
		} catch (error) {
			result.errors.push(
				error instanceof Error ? error.message : String(error),
			);
		}

		return result;
	}
}

class CursorExporterImpl extends BaseExporter {
	getId(): string {
		return 'cursor';
	}

	getName(): string {
		return 'Cursor IDE';
	}

	protected getConfigDir(): string {
		return '.cursor';
	}

	async export(
		context: ProjectContext,
		sessionData?: SessionData | undefined,
	): Promise<MigrationResult> {
		const result: MigrationResult = {
			success: false,
			filesCreated: [],
			filesModified: [],
			errors: [],
			warnings: [],
		};

		try {
			this.ensureDir(this.getWorkspaceDir());
			this.ensureDir(path.join(this.getWorkspaceDir(), 'sessions'));
			this.ensureDir(path.join(this.getWorkspaceDir(), 'mcp'));

			this.writeJson(path.join(this.getWorkspaceDir(), 'config.json'), {
				version: '1.0.0',
				migratedAt: new Date().toISOString(),
				languages: [...new Set(context.sourceFiles.map((f) => f.language))],
			});

			if (sessionData?.conversations && sessionData.conversations.length > 0) {
				const sessionsDir = path.join(this.getWorkspaceDir(), 'sessions');
				const conversationsFile: Array<Record<string, unknown>> = [];

				for (const conv of sessionData.conversations) {
					const convFile = `${conv.id}.json`;
					this.writeJson(path.join(sessionsDir, convFile), {
						id: conv.id,
						messages: conv.messages,
						migratedAt: new Date().toISOString(),
					});
					conversationsFile.push({
						id: conv.id,
						file: convFile,
						messageCount: conv.messages.length,
					});
				}

				this.writeJson(path.join(sessionsDir, 'index.json'), {
					migratedAt: new Date().toISOString(),
					conversations: conversationsFile,
					tools: sessionData.tools || [],
				});
				result.filesCreated.push('.cursor/sessions/*.json');
			} else {
				this.writeJson(
					path.join(this.getWorkspaceDir(), 'sessions', 'index.json'),
					{migratedAt: new Date().toISOString()},
				);
			}

			result.success = true;
			result.filesCreated.push(
				'.cursor/config.json',
				'.cursor/sessions/index.json',
			);
		} catch (error) {
			result.errors.push(
				error instanceof Error ? error.message : String(error),
			);
		}

		return result;
	}
}

export async function exportToTarget(
	target: string,
	projectPath: string,
	context: ProjectContext,
	sessionData?: SessionData | undefined,
	options?: Partial<ExporterOptions>,
): Promise<MigrationResult> {
	const exporter = createExporter(target, projectPath, {
		overwrite: options?.overwrite ?? false,
		preserveHistory: options?.preserveHistory ?? true,
		validateResults: options?.validateResults ?? true,
	});

	return exporter.export(context, sessionData, options);
}

export const ALL_TARGETS = [
	{id: 'opencode', name: 'OpenCode', configDir: '.opencode'},
	{id: 'vscode', name: 'Visual Studio Code', configDir: '.vscode'},
	{id: 'jetbrains', name: 'JetBrains IDEs', configDir: '.jetbrains'},
	{id: 'cursor', name: 'Cursor IDE', configDir: '.cursor'},
	{id: 'sublime', name: 'Sublime Text', configDir: '.sublime'},
	{id: 'vim', name: 'Vim/Neovim', configDir: '.vim'},
	{id: 'emacs', name: 'Emacs', configDir: '.emacs.d'},
	{id: 'atom', name: 'Atom', configDir: '.atom'},
	{id: 'zed', name: 'Zed', configDir: '.zed'},
	{id: 'lapce', name: 'Lapce', configDir: '.lapce'},
	{id: 'nova', name: 'Nova', configDir: '.nova'},
	{id: 'onivim', name: 'Onivim', configDir: '.onivim'},
	{id: 'tabby', name: 'Tabby', configDir: '.tabby'},
];

class SublimeExporterImpl extends BaseExporter {
	getId(): string {
		return 'sublime';
	}

	getName(): string {
		return 'Sublime Text';
	}

	protected getConfigDir(): string {
		return '.sublime';
	}

	async export(
		context: ProjectContext,
		sessionData?: SessionData | undefined,
	): Promise<MigrationResult> {
		const result: MigrationResult = {
			success: false,
			filesCreated: [],
			filesModified: [],
			errors: [],
			warnings: [],
		};
		try {
			this.ensureDir(this.getWorkspaceDir());
			this.ensureDir(path.join(this.getWorkspaceDir(), 'sessions'));
			this.writeJson(path.join(this.getWorkspaceDir(), 'workspace.json'), {
				version: '1.0.0',
				migratedAt: new Date().toISOString(),
				project: {
					name: path.basename(context.projectPath),
					files: context.sourceFiles.length,
				},
			});
			this.exportConversations(
				path.join(this.getWorkspaceDir(), 'sessions'),
				sessionData?.conversations || [],
			);
			result.success = true;
			result.filesCreated = ['.sublime/workspace.json', '.sublime/sessions/'];
		} catch (error) {
			result.errors.push(
				error instanceof Error ? error.message : String(error),
			);
		}

		return result;
	}
}

class VimExporterImpl extends BaseExporter {
	getId(): string {
		return 'vim';
	}

	getName(): string {
		return 'Vim/Neovim';
	}

	protected getConfigDir(): string {
		return '.vim';
	}

	async export(
		context: ProjectContext,
		sessionData?: SessionData | undefined,
	): Promise<MigrationResult> {
		const result: MigrationResult = {
			success: false,
			filesCreated: [],
			filesModified: [],
			errors: [],
			warnings: [],
		};
		try {
			this.ensureDir(this.getWorkspaceDir());
			this.writeJson(path.join(this.getWorkspaceDir(), 'session.vim'), {
				version: '1.0.0',
				migratedAt: new Date().toISOString(),
				files: context.sourceFiles.map((f) => f.path),
			});
			this.exportConversations(
				path.join(this.getWorkspaceDir(), 'sessions'),
				sessionData?.conversations || [],
			);
			result.success = true;
			result.filesCreated = ['.vim/session.vim', '.vim/sessions/'];
		} catch (error) {
			result.errors.push(
				error instanceof Error ? error.message : String(error),
			);
		}

		return result;
	}
}

class EmacsExporterImpl extends BaseExporter {
	getId(): string {
		return 'emacs';
	}

	getName(): string {
		return 'Emacs';
	}

	protected getConfigDir(): string {
		return '.emacs.d';
	}

	async export(
		context: ProjectContext,
		sessionData?: SessionData | undefined,
	): Promise<MigrationResult> {
		const result: MigrationResult = {
			success: false,
			filesCreated: [],
			filesModified: [],
			errors: [],
			warnings: [],
		};
		try {
			this.ensureDir(this.getWorkspaceDir());
			this.ensureDir(path.join(this.getWorkspaceDir(), 'sessions'));
			this.writeJson(path.join(this.getWorkspaceDir(), 'workspace.org'), {
				version: '1.0.0',
				migratedAt: new Date().toISOString(),
				project: path.basename(context.projectPath),
				files: context.sourceFiles.length,
			});
			this.exportConversations(
				path.join(this.getWorkspaceDir(), 'sessions'),
				sessionData?.conversations || [],
			);
			result.success = true;
			result.filesCreated = ['.emacs.d/workspace.org', '.emacs.d/sessions/'];
		} catch (error) {
			result.errors.push(
				error instanceof Error ? error.message : String(error),
			);
		}

		return result;
	}
}

class AtomExporterImpl extends BaseExporter {
	getId(): string {
		return 'atom';
	}

	getName(): string {
		return 'Atom';
	}

	protected getConfigDir(): string {
		return '.atom';
	}

	async export(
		context: ProjectContext,
		sessionData?: SessionData | undefined,
	): Promise<MigrationResult> {
		const result: MigrationResult = {
			success: false,
			filesCreated: [],
			filesModified: [],
			errors: [],
			warnings: [],
		};
		try {
			this.ensureDir(this.getWorkspaceDir());
			this.ensureDir(path.join(this.getWorkspaceDir(), 'sessions'));
			this.writeJson(path.join(this.getWorkspaceDir(), 'workspace.cson'), {
				version: '1.0.0',
				migratedAt: new Date().toISOString(),
				project: path.basename(context.projectPath),
			});
			this.exportConversations(
				path.join(this.getWorkspaceDir(), 'sessions'),
				sessionData?.conversations || [],
			);
			result.success = true;
			result.filesCreated = ['.atom/workspace.cson', '.atom/sessions/'];
		} catch (error) {
			result.errors.push(
				error instanceof Error ? error.message : String(error),
			);
		}

		return result;
	}
}

class ZedExporterImpl extends BaseExporter {
	getId(): string {
		return 'zed';
	}

	getName(): string {
		return 'Zed';
	}

	protected getConfigDir(): string {
		return '.zed';
	}

	async export(
		context: ProjectContext,
		sessionData?: SessionData | undefined,
	): Promise<MigrationResult> {
		const result: MigrationResult = {
			success: false,
			filesCreated: [],
			filesModified: [],
			errors: [],
			warnings: [],
		};
		try {
			this.ensureDir(this.getWorkspaceDir());
			this.ensureDir(path.join(this.getWorkspaceDir(), 'sessions'));
			this.writeJson(path.join(this.getWorkspaceDir(), 'workspace.json'), {
				version: '1.0.0',
				migratedAt: new Date().toISOString(),
				project: {
					name: path.basename(context.projectPath),
					files: context.sourceFiles.length,
				},
			});
			this.exportConversations(
				path.join(this.getWorkspaceDir(), 'sessions'),
				sessionData?.conversations || [],
			);
			result.success = true;
			result.filesCreated = ['.zed/workspace.json', '.zed/sessions/'];
		} catch (error) {
			result.errors.push(
				error instanceof Error ? error.message : String(error),
			);
		}

		return result;
	}
}

class LapceExporterImpl extends BaseExporter {
	getId(): string {
		return 'lapce';
	}

	getName(): string {
		return 'Lapce';
	}

	protected getConfigDir(): string {
		return '.lapce';
	}

	async export(
		context: ProjectContext,
		sessionData?: SessionData | undefined,
	): Promise<MigrationResult> {
		const result: MigrationResult = {
			success: false,
			filesCreated: [],
			filesModified: [],
			errors: [],
			warnings: [],
		};
		try {
			this.ensureDir(this.getWorkspaceDir());
			this.ensureDir(path.join(this.getWorkspaceDir(), 'sessions'));
			this.writeJson(path.join(this.getWorkspaceDir(), 'workspace.json'), {
				version: '1.0.0',
				migratedAt: new Date().toISOString(),
				project: path.basename(context.projectPath),
			});
			this.exportConversations(
				path.join(this.getWorkspaceDir(), 'sessions'),
				sessionData?.conversations || [],
			);
			result.success = true;
			result.filesCreated = ['.lapce/workspace.json', '.lapce/sessions/'];
		} catch (error) {
			result.errors.push(
				error instanceof Error ? error.message : String(error),
			);
		}

		return result;
	}
}

class NovaExporterImpl extends BaseExporter {
	getId(): string {
		return 'nova';
	}

	getName(): string {
		return 'Nova';
	}

	protected getConfigDir(): string {
		return '.nova';
	}

	async export(
		context: ProjectContext,
		sessionData?: SessionData | undefined,
	): Promise<MigrationResult> {
		const result: MigrationResult = {
			success: false,
			filesCreated: [],
			filesModified: [],
			errors: [],
			warnings: [],
		};
		try {
			this.ensureDir(this.getWorkspaceDir());
			this.ensureDir(path.join(this.getWorkspaceDir(), 'sessions'));
			this.writeJson(path.join(this.getWorkspaceDir(), 'workspace.json'), {
				version: '1.0.0',
				migratedAt: new Date().toISOString(),
				project: path.basename(context.projectPath),
			});
			this.exportConversations(
				path.join(this.getWorkspaceDir(), 'sessions'),
				sessionData?.conversations || [],
			);
			result.success = true;
			result.filesCreated = ['.nova/workspace.json', '.nova/sessions/'];
		} catch (error) {
			result.errors.push(
				error instanceof Error ? error.message : String(error),
			);
		}

		return result;
	}
}

class OnivimExporterImpl extends BaseExporter {
	getId(): string {
		return 'onivim';
	}

	getName(): string {
		return 'Onivim';
	}

	protected getConfigDir(): string {
		return '.onivim';
	}

	async export(
		context: ProjectContext,
		sessionData?: SessionData | undefined,
	): Promise<MigrationResult> {
		const result: MigrationResult = {
			success: false,
			filesCreated: [],
			filesModified: [],
			errors: [],
			warnings: [],
		};
		try {
			this.ensureDir(this.getWorkspaceDir());
			this.ensureDir(path.join(this.getWorkspaceDir(), 'sessions'));
			this.writeJson(path.join(this.getWorkspaceDir(), 'workspace.json'), {
				version: '1.0.0',
				migratedAt: new Date().toISOString(),
				project: path.basename(context.projectPath),
			});
			this.exportConversations(
				path.join(this.getWorkspaceDir(), 'sessions'),
				sessionData?.conversations || [],
			);
			result.success = true;
			result.filesCreated = ['.onivim/workspace.json', '.onivim/sessions/'];
		} catch (error) {
			result.errors.push(
				error instanceof Error ? error.message : String(error),
			);
		}

		return result;
	}
}

class TabbyExporterImpl extends BaseExporter {
	getId(): string {
		return 'tabby';
	}

	getName(): string {
		return 'Tabby';
	}

	protected getConfigDir(): string {
		return '.tabby';
	}

	async export(
		context: ProjectContext,
		sessionData?: SessionData | undefined,
	): Promise<MigrationResult> {
		const result: MigrationResult = {
			success: false,
			filesCreated: [],
			filesModified: [],
			errors: [],
			warnings: [],
		};
		try {
			this.ensureDir(this.getWorkspaceDir());
			this.ensureDir(path.join(this.getWorkspaceDir(), 'conversations'));
			this.writeJson(path.join(this.getWorkspaceDir(), 'config.json'), {
				version: '1.0.0',
				migratedAt: new Date().toISOString(),
				project: path.basename(context.projectPath),
			});
			this.exportConversations(
				path.join(this.getWorkspaceDir(), 'conversations'),
				sessionData?.conversations || [],
			);
			result.success = true;
			result.filesCreated = ['.tabby/config.json', '.tabby/conversations/'];
		} catch (error) {
			result.errors.push(
				error instanceof Error ? error.message : String(error),
			);
		}

		return result;
	}
}
