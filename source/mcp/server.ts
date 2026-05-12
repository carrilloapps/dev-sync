import * as fs from 'node:fs';
import * as path from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
	type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createAnalyzer, supportedSources, supportedTargets } from '../analyzers/index.js';
import { createExporter } from '../exporters/index.js';

type ConversationStats = {
	id: string;
	messageCount: number;
	totalChars: number;
	estimatedTokens: number;
	userMessages: number;
	assistantMessages: number;
	createdAt: string;
	updatedAt: string;
	sizeBytes: number;
	filePath: string;
};

type ResourceInfo = {
	type: string;
	name: string;
	basePath: string;
	totalConversations: number;
	totalSize: number;
	totalMessages: number;
	totalTokens: number;
	projects: string[];
};

const ALL_IDS = [
	'claude-code',
	'copilot',
	'gemini',
	'cursor',
	'windsurf',
	'opencode',
	'vscode',
	'jetbrains',
];

const TOOLS: Tool[] = [
	{
		name: 'list_agents',
		description: 'List all supported source agents and target IDEs',
		inputSchema: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					enum: ['sources', 'targets', 'all'],
					default: 'all',
				},
			},
		},
	},
	{
		name: 'sync_project',
		description: 'Sync a project from one agent/IDE to another, including conversations',
		inputSchema: {
			type: 'object',
			properties: {
				from: { type: 'string' },
				to: { type: 'string' },
				projectPath: { type: 'string' },
				overwrite: { type: 'boolean', default: false },
			},
			required: ['from', 'to', 'projectPath'],
		},
	},
	{
		name: 'list_conversations',
		description: 'List all conversations from a source agent or target IDE with detailed stats',
		inputSchema: {
			type: 'object',
			properties: {
				id: {
					type: 'string',
					description: 'Agent or IDE id (e.g., claude-code, opencode, vscode)',
				},
				projectPath: {
					type: 'string',
					description: 'Project path for target IDEs, optional for source agents',
				},
				detailed: { type: 'boolean', default: true },
			},
			required: ['id'],
		},
	},
	{
		name: 'get_conversation',
		description: 'Get detailed information about a specific conversation',
		inputSchema: {
			type: 'object',
			properties: {
				id: { type: 'string', description: 'Agent or IDE id' },
				conversationId: { type: 'string' },
				projectPath: { type: 'string' },
			},
			required: ['id', 'conversationId'],
		},
	},
	{
		name: 'export_conversation',
		description: 'Export a conversation from any source to any target IDE',
		inputSchema: {
			type: 'object',
			properties: {
				from: { type: 'string', description: 'Source agent/IDE id' },
				conversationId: { type: 'string' },
				to: { type: 'string', description: 'Target IDE id' },
				projectPath: { type: 'string' },
			},
			required: ['from', 'conversationId', 'to', 'projectPath'],
		},
	},
	{
		name: 'update_conversation',
		description: 'Update or append messages to a conversation in a target IDE',
		inputSchema: {
			type: 'object',
			properties: {
				id: { type: 'string', description: 'Target IDE id' },
				conversationId: { type: 'string' },
				messages: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							role: { type: 'string' },
							content: { type: 'string' },
						},
					},
				},
				projectPath: { type: 'string' },
			},
			required: ['id', 'conversationId', 'messages', 'projectPath'],
		},
	},
	{
		name: 'analyze_project',
		description: 'Analyze a project directory',
		inputSchema: {
			type: 'object',
			properties: {
				projectPath: { type: 'string' },
			},
			required: ['projectPath'],
		},
	},
	{
		name: 'get_project_state',
		description: 'Get the current sync state of a project for a target IDE',
		inputSchema: {
			type: 'object',
			properties: {
				projectPath: { type: 'string' },
				target: {
					type: 'string',
					enum: ['opencode', 'vscode', 'jetbrains', 'cursor'],
				},
			},
			required: ['projectPath', 'target'],
		},
	},
	{
		name: 'get_resources',
		description: 'Get storage resources info for an agent or target IDE',
		inputSchema: {
			type: 'object',
			properties: {
				id: { type: 'string', description: 'Agent or IDE id' },
				projectPath: {
					type: 'string',
					description: 'Project path for target IDEs',
				},
			},
			required: ['id'],
		},
	},
	{
		name: 'list_projects',
		description: 'List all projects with sessions for a source agent',
		inputSchema: {
			type: 'object',
			properties: {
				id: {
					type: 'string',
					enum: ['claude-code', 'copilot', 'gemini', 'cursor', 'windsurf'],
				},
			},
			required: ['id'],
		},
	},
];

export class AgentSyncMCPServer {
	private readonly server: Server;

	constructor() {
		this.server = new Server({ name: 'sync', version: '1.0.0' }, { capabilities: { tools: {} } });
		this.setupHandlers();
	}

	private setupHandlers() {
		this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
			tools: TOOLS,
		}));

		this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
			try {
				const { name, arguments: arguments_ } = request.params;
				switch (name) {
					case 'list_agents': {
						return this.handleListAgents(arguments_);
					}

					case 'sync_project': {
						return this.handleSyncProject(arguments_);
					}

					case 'list_conversations': {
						return this.handleListConversations(arguments_);
					}

					case 'get_conversation': {
						return this.handleGetConversation(arguments_);
					}

					case 'export_conversation': {
						return this.handleExportConversation(arguments_);
					}

					case 'update_conversation': {
						return this.handleUpdateConversation(arguments_);
					}

					case 'analyze_project': {
						return this.handleAnalyzeProject(arguments_);
					}

					case 'get_project_state': {
						return this.handleGetProjectState(arguments_);
					}

					case 'get_resources': {
						return this.handleGetResources(arguments_);
					}

					case 'list_projects': {
						return this.handleListProjects(arguments_);
					}

					default: {
						return {
							content: [{ type: 'text', text: `Unknown tool: ${name}` }],
						};
					}
				}
			} catch (error) {
				return {
					content: [
						{
							type: 'text',
							text: `Error: ${error instanceof Error ? error.message : String(error)}`,
						},
					],
				};
			}
		});
	}

	private estimateTokens(text: string): number {
		return Math.ceil(text.length / 4);
	}

	private getConversationStats(filePath: string, id: string): ConversationStats {
		const stats: ConversationStats = {
			id,
			messageCount: 0,
			totalChars: 0,
			estimatedTokens: 0,
			userMessages: 0,
			assistantMessages: 0,
			createdAt: '',
			updatedAt: '',
			sizeBytes: 0,
			filePath,
		};

		try {
			const content = fs.readFileSync(filePath, 'utf8');
			stats.sizeBytes = Buffer.byteLength(content, 'utf-8');
			const data = JSON.parse(content);
			const messages = data.messages || [];
			stats.messageCount = messages.length;
			stats.createdAt = data.timestamp || data.migratedAt || new Date().toISOString();
			stats.updatedAt = data.updatedAt || stats.createdAt;

			for (const message of messages) {
				const text = typeof message === 'string' ? message : message.content || '';
				stats.totalChars += text.length;
				stats.estimatedTokens += this.estimateTokens(text);
				const role = (message.role || 'unknown').toLowerCase();
				if (role === 'user' || role === 'human') stats.userMessages++;
				else if (role === 'assistant' || role === 'ai' || role === 'bot') stats.assistantMessages++;
			}
		} catch {}

		return stats;
	}

	private isSourceAgent(id: string): boolean {
		return ['claude-code', 'copilot', 'gemini', 'cursor', 'windsurf'].includes(id);
	}

	private isTargetIde(id: string): boolean {
		return ['opencode', 'vscode', 'jetbrains', 'cursor'].includes(id);
	}

	private getSourceDir(id: string, projectPath?: string): string | undefined {
		const directories: Record<string, string> = {
			'claude-code': path.join(process.env.APPDATA || '', 'Claude', 'claude-code'),
			copilot: path.join(process.env.APPDATA || '', 'Code', 'User'),
			gemini: path.join(process.env.LOCALAPPDATA || '', 'Google', 'Gemini'),
			cursor: path.join(process.env.APPDATA || '', 'Cursor'),
			windsurf: path.join(process.env.APPDATA || '', 'WindSurf'),
		};
		const base = directories[id];
		if (!base) return undefined;
		return projectPath
			? path.join(base, 'projects', this.hashPath(projectPath), 'sessions')
			: path.join(base, 'sessions');
	}

	private getTargetDir(id: string, projectPath: string): string | undefined {
		if (!projectPath) return undefined;
		const targetDirectories: Record<string, string> = {
			opencode: '.opencode',
			vscode: '.vscode',
			jetbrains: '.jetbrains',
			cursor: '.cursor',
		};
		const dir = targetDirectories[id];
		return dir ? path.join(projectPath, dir, 'sessions') : undefined;
	}

	private getConversationsDir(id: string, projectPath?: string): string | undefined {
		if (this.isSourceAgent(id)) {
			return this.getSourceDir(id, projectPath);
		}

		if (this.isTargetIde(id)) {
			return projectPath ? this.getTargetDir(id, projectPath) : undefined;
		}

		return undefined;
	}

	private getAllConversationStats(id: string, projectPath?: string): ConversationStats[] {
		const stats: ConversationStats[] = [];
		const dir = this.getConversationsDir(id, projectPath);
		if (!dir || !fs.existsSync(dir)) return stats;

		try {
			const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json');
			for (const file of files) {
				const filePath = path.join(dir, file);
				const convId = file.replace('.json', '');
				stats.push(this.getConversationStats(filePath, convId));
			}
		} catch {}

		return stats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
	}

	private handleListAgents(arguments_: any) {
		const type = arguments_?.type || 'all';
		const formatAgent = (a: any) => `  ${a.id.padEnd(15)} | ${a.name}`;
		const formatTarget = (t: any) => `  ${t.id.padEnd(15)} | ${t.name}`;

		if (type === 'sources') {
			return {
				content: [
					{
						type: 'text',
						text: `Source Agents (${supportedSources.length}):\n${supportedSources.map(formatAgent).join('\n')}`,
					},
				],
			};
		}

		if (type === 'targets') {
			return {
				content: [
					{
						type: 'text',
						text: `Target IDEs (${supportedTargets.length}):\n${supportedTargets.map(formatTarget).join('\n')}`,
					},
				],
			};
		}

		return {
			content: [
				{
					type: 'text',
					text: `Source Agents (${supportedSources.length}):\n${supportedSources.map(formatAgent).join('\n')}\n\nTarget IDEs (${supportedTargets.length}):\n${supportedTargets.map(formatTarget).join('\n')}`,
				},
			],
		};
	}

	private async handleSyncProject(arguments_: any) {
		const { from, to, projectPath, overwrite } = arguments_;

		if (this.isSourceAgent(from)) {
			const analyzer = createAnalyzer(from, projectPath);
			const result = await analyzer.analyze();
			const exporter = createExporter(to, projectPath, {
				overwrite: overwrite ?? false,
				preserveHistory: true,
				validateResults: true,
			});
			await exporter.export(result.projectContext, result.sessionData);

			const convStats = this.getAllConversationStats(from, projectPath);
			const totalTokens = convStats.reduce((sum, c) => sum + c.estimatedTokens, 0);
			const totalMsgs = convStats.reduce((sum, c) => sum + c.messageCount, 0);

			return {
				content: [
					{
						type: 'text',
						text:
							`Synced from ${from} to ${to}:\n` +
							`- Files: ${result.projectContext.sourceFiles.length}\n` +
							`- Languages: ${[...new Set(result.projectContext.sourceFiles.map((f: any) => f.language))].join(', ')}\n` +
							`- Conversations: ${convStats.length} (${totalMsgs} messages, ~${totalTokens} tokens)`,
					},
				],
			};
		}

		if (this.isTargetIde(from)) {
			const convStats = this.getAllConversationStats(from, projectPath);
			const exporter = createExporter(to, projectPath, {
				overwrite: overwrite ?? false,
				preserveHistory: true,
				validateResults: true,
			});

			const conversations = convStats.map((s) => {
				const content = fs.readFileSync(s.filePath, 'utf8');
				const data = JSON.parse(content);
				return {
					id: s.id,
					messages: data.messages || [],
					timestamp: s.createdAt,
				};
			});

			await exporter.export(
				{
					projectPath,
					sourceFiles: [],
					configFiles: [],
					dependencies: [],
					environment: {
						platform: 'windows' as const,
						nodeVersion: '',
						packageManager: 'npm' as const,
						shell: '',
					},
				},
				{ conversations, tools: [] }
			);

			const totalTokens = convStats.reduce((sum, c) => sum + c.estimatedTokens, 0);
			const totalMsgs = convStats.reduce((sum, c) => sum + c.messageCount, 0);

			return {
				content: [
					{
						type: 'text',
						text:
							`Synced from ${from} to ${to}:\n` +
							`- Conversations: ${convStats.length} (${totalMsgs} messages, ~${totalTokens} tokens)`,
					},
				],
			};
		}

		return {
			content: [{ type: 'text', text: `Unknown source: ${from}` }],
			isError: true,
		};
	}

	private handleListConversations(arguments_: any) {
		const { id, projectPath, detailed } = arguments_;
		const stats = this.getAllConversationStats(id, projectPath);

		if (stats.length === 0) {
			const dir = this.getConversationsDir(id, projectPath);
			return {
				content: [
					{
						type: 'text',
						text: `No conversations found for ${id}\nPath: ${dir || 'unknown'}`,
					},
				],
			};
		}

		const totalTokens = stats.reduce((sum, c) => sum + c.estimatedTokens, 0);
		const totalMsgs = stats.reduce((sum, c) => sum + c.messageCount, 0);
		const totalSize = stats.reduce((sum, c) => sum + c.sizeBytes, 0);

		if (detailed) {
			let output = `Conversations for ${id} (${stats.length} total):\n`;
			output += `Summary: ${totalMsgs} msgs | ~${totalTokens} tokens | ${this.formatBytes(totalSize)}\n\n`;

			for (const s of stats) {
				output += `┌─ ${s.id}\n`;
				output += `│  Messages: ${s.messageCount} (${s.userMessages} user, ${s.assistantMessages} assistant)\n`;
				output += `│  Size: ${this.formatBytes(s.sizeBytes)} | Tokens: ~${s.estimatedTokens}\n`;
				output += `│  Updated: ${new Date(s.updatedAt).toLocaleString()}\n`;
				output += `└─\n`;
			}

			return { content: [{ type: 'text', text: output }] };
		}

		return {
			content: [
				{
					type: 'text',
					text: `Conversations for ${id}:\n${stats.map((s) => `- ${s.id}: ${s.messageCount} msgs, ~${s.estimatedTokens} tokens`).join('\n')}`,
				},
			],
		};
	}

	private handleGetConversation(arguments_: any) {
		const { id, conversationId, projectPath } = arguments_;
		const dir = this.getConversationsDir(id, projectPath);
		if (!dir)
			return {
				content: [{ type: 'text', text: `Cannot determine directory for ${id}` }],
				isError: true,
			};

		const filePath = path.join(dir, `${conversationId}.json`);
		if (!fs.existsSync(filePath)) {
			return {
				content: [{ type: 'text', text: `Conversation ${conversationId} not found` }],
				isError: true,
			};
		}

		try {
			const content = fs.readFileSync(filePath, 'utf8');
			const data = JSON.parse(content);
			const messages = data.messages || [];
			const stats = this.getConversationStats(filePath, conversationId);

			let output = `Conversation: ${conversationId}\n`;
			output += `${'═'.repeat(50)}\n`;
			output += `Source: ${id}\n`;
			output += `Messages: ${stats.messageCount} | Tokens: ~${stats.estimatedTokens} | Size: ${this.formatBytes(stats.sizeBytes)}\n`;
			output += `User: ${stats.userMessages} | Assistant: ${stats.assistantMessages}\n`;
			output += `Created: ${stats.createdAt}\n`;
			output += `Updated: ${stats.updatedAt}\n\n`;

			for (const [i, message] of messages.entries()) {
				const role = message.role || 'unknown';
				const text = typeof message === 'string' ? message : message.content || '';
				const preview = text.length > 300 ? text.slice(0, 300) + '...' : text;
				output += `[${i + 1}] ${role.toUpperCase()}:\n${preview}\n\n`;
			}

			return { content: [{ type: 'text', text: output }] };
		} catch (error) {
			return {
				content: [{ type: 'text', text: `Error reading conversation: ${error}` }],
				isError: true,
			};
		}
	}

	private async handleExportConversation(arguments_: any) {
		const { from, conversationId, to, projectPath } = arguments_;

		const sourceDir = this.getConversationsDir(from, projectPath);
		if (!sourceDir)
			return {
				content: [
					{
						type: 'text',
						text: `Cannot determine source directory for ${from}`,
					},
				],
				isError: true,
			};

		const filePath = path.join(sourceDir, `${conversationId}.json`);
		if (!fs.existsSync(filePath)) {
			return {
				content: [
					{
						type: 'text',
						text: `Conversation ${conversationId} not found in ${from}`,
					},
				],
				isError: true,
			};
		}

		try {
			const content = fs.readFileSync(filePath, 'utf8');
			const data = JSON.parse(content);
			const exporter = createExporter(to, projectPath, {
				overwrite: false,
				preserveHistory: true,
				validateResults: true,
			});

			const convData = {
				id: conversationId,
				messages: data.messages || [],
				timestamp: data.timestamp || data.migratedAt || new Date().toISOString(),
			};

			if (this.isSourceAgent(from)) {
				const analyzer = createAnalyzer(from, projectPath);
				const result = await analyzer.analyze();
				await exporter.export(result.projectContext, {
					conversations: [convData],
					tools: [],
				});
			} else {
				await exporter.export(
					{
						projectPath,
						sourceFiles: [],
						configFiles: [],
						dependencies: [],
						environment: {
							platform: 'windows' as const,
							nodeVersion: '',
							packageManager: 'npm' as const,
							shell: '',
						},
					},
					{ conversations: [convData], tools: [] }
				);
			}

			return {
				content: [
					{
						type: 'text',
						text: `Exported ${conversationId} from ${from} to ${to}\nMessages: ${(data.messages || []).length}`,
					},
				],
			};
		} catch (error) {
			return {
				content: [{ type: 'text', text: `Error: ${error}` }],
				isError: true,
			};
		}
	}

	private handleUpdateConversation(arguments_: any) {
		const { id, conversationId, messages, projectPath } = arguments_;

		if (!this.isTargetIde(id)) {
			return {
				content: [
					{
						type: 'text',
						text: `Can only update conversations in target IDEs (opencode, vscode, jetbrains, cursor)`,
					},
				],
				isError: true,
			};
		}

		const dir = this.getTargetDir(id, projectPath);
		if (!dir)
			return {
				content: [{ type: 'text', text: `Cannot determine target directory for ${id}` }],
				isError: true,
			};

		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		const convFile = path.join(dir, `${conversationId}.json`);
		let existing = {
			messages: [] as any[],
			timestamp: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			migratedAt: new Date().toISOString(),
		};

		if (fs.existsSync(convFile)) {
			try {
				existing = JSON.parse(fs.readFileSync(convFile, 'utf8'));
			} catch {}
		}

		existing.messages = [...(existing.messages || []), ...messages];
		existing.updatedAt = new Date().toISOString();
		fs.writeFileSync(convFile, JSON.stringify(existing, null, 2));

		const stats = this.getConversationStats(convFile, conversationId);
		return {
			content: [
				{
					type: 'text',
					text: `Updated ${conversationId} in ${id}\nTotal messages: ${stats.messageCount}\nEstimated tokens: ~${stats.estimatedTokens}\nFile: ${convFile}`,
				},
			],
		};
	}

	private async handleAnalyzeProject(arguments_: any) {
		const { projectPath } = arguments_;

		if (!fs.existsSync(projectPath)) {
			return {
				content: [{ type: 'text', text: `Project path does not exist: ${projectPath}` }],
				isError: true,
			};
		}

		const files: any[] = [];
		const configFiles: any[] = [];
		const dependencies: any[] = [];
		let languages: string[] = [];
		const frameworks: string[] = [];

		const scanDir = (dir: string, depth = 0) => {
			if (depth > 5) return;
			try {
				const entries = fs.readdirSync(dir, { withFileTypes: true });
				for (const entry of entries) {
					const fullPath = path.join(dir, entry.name);
					if (entry.isDirectory()) {
						if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
							scanDir(fullPath, depth + 1);
						}
					} else {
						const extension = path.extname(entry.name);
						if (
							['.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.java', '.cpp', '.c'].includes(
								extension
							)
						) {
							files.push({
								path: path.relative(projectPath, fullPath),
								ext: extension,
							});
						}

						if (
							[
								'package.json',
								'tsconfig.json',
								'Cargo.toml',
								'go.mod',
								'pom.xml',
								'build.gradle',
							].includes(entry.name)
						) {
							configFiles.push({
								name: entry.name,
								path: path.relative(projectPath, fullPath),
							});
						}
					}
				}
			} catch {}
		};

		scanDir(projectPath);

		const extensionToLang: Record<string, string> = {
			'.ts': 'TypeScript',
			'.tsx': 'TypeScript',
			'.js': 'JavaScript',
			'.jsx': 'JavaScript',
			'.py': 'Python',
			'.rs': 'Rust',
			'.go': 'Go',
			'.java': 'Java',
		};
		languages = [...new Set(files.map((f) => extensionToLang[f.ext] || 'Unknown'))];

		const totalSize = 0;
		const totalLines = 0;

		return {
			content: [
				{
					type: 'text',
					text:
						`Project Analysis: ${projectPath}\n` +
						`${'═'.repeat(50)}\n` +
						`Files: ${files.length}\n` +
						`Languages: ${languages.join(', ') || 'none detected'}\n` +
						`Config files: ${configFiles.length}\n` +
						`${'═'.repeat(50)}\n` +
						`Source Agents: Claude Code, Copilot, Gemini, Cursor, WindSurf\n` +
						`Target IDEs: OpenCode, VS Code, JetBrains, Cursor`,
				},
			],
		};
	}

	private handleGetProjectState(arguments_: any) {
		const { projectPath, target } = arguments_;
		const targetDirectories: Record<string, string> = {
			opencode: '.opencode',
			vscode: '.vscode',
			jetbrains: '.jetbrains',
			cursor: '.cursor',
		};
		const configFile = path.join(
			projectPath,
			targetDirectories[target] || target,
			target === 'opencode' ? 'config.json' : 'workspace-state.json'
		);
		if (!fs.existsSync(configFile))
			return {
				content: [{ type: 'text', text: `No state found for ${target}` }],
			};
		const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
		return {
			content: [{ type: 'text', text: JSON.stringify(config, null, 2) }],
		};
	}

	private handleGetResources(arguments_: any) {
		const { id, projectPath } = arguments_;

		if (this.isSourceAgent(id)) {
			return this.getSourceResources(id, projectPath);
		}

		if (this.isTargetIde(id)) {
			return this.getTargetResources(id, projectPath);
		}

		return {
			content: [{ type: 'text', text: `Unknown id: ${id}` }],
			isError: true,
		};
	}

	private getSourceResources(
		agent: string,
		projectPath?: string
	): { content: Array<{ type: 'text'; text: string }> } {
		const baseDir = this.getSourceDir(agent, projectPath) || '';
		const resources: ResourceInfo = {
			type: 'source',
			name: agent,
			basePath: baseDir,
			totalConversations: 0,
			totalSize: 0,
			totalMessages: 0,
			totalTokens: 0,
			projects: [],
		};

		if (fs.existsSync(baseDir)) {
			try {
				const files = fs.readdirSync(baseDir).filter((f) => f.endsWith('.json'));
				for (const file of files) {
					const filePath = path.join(baseDir, file);
					const stats = this.getConversationStats(filePath, file.replace('.json', ''));
					resources.totalConversations++;
					resources.totalSize += stats.sizeBytes;
					resources.totalMessages += stats.messageCount;
					resources.totalTokens += stats.estimatedTokens;
				}

				const projectsDir = path.join(baseDir, 'projects');
				if (fs.existsSync(projectsDir)) {
					resources.projects = fs.readdirSync(projectsDir).filter((f) => {
						const sessionsPath = path.join(projectsDir, f, 'sessions');
						return (
							fs.existsSync(sessionsPath) &&
							fs.readdirSync(sessionsPath).some((s) => s.endsWith('.json'))
						);
					});
				}
			} catch {}
		}

		return {
			content: [
				{
					type: 'text',
					text:
						`Resources for Source: ${agent}\n` +
						`${'─'.repeat(50)}\n` +
						`Type: AI Coding Agent\n` +
						`Base path: ${resources.basePath}\n` +
						`Total conversations: ${resources.totalConversations}\n` +
						`Total messages: ${resources.totalMessages}\n` +
						`Total tokens (est.): ~${resources.totalTokens}\n` +
						`Total size: ${this.formatBytes(resources.totalSize)}\n` +
						`Projects: ${resources.projects.length}\n` +
						(resources.projects.length > 0
							? `Project hashes: ${resources.projects.join(', ')}`
							: ''),
				},
			],
		};
	}

	private getTargetResources(
		target: string,
		projectPath: string
	): { content: Array<{ type: 'text'; text: string }> } {
		if (!projectPath) {
			return {
				content: [{ type: 'text', text: `projectPath required for target IDEs` }],
			};
		}

		const targetDirectories: Record<string, string> = {
			opencode: '.opencode',
			vscode: '.vscode',
			jetbrains: '.jetbrains',
			cursor: '.cursor',
		};
		const targetDir = path.join(projectPath, targetDirectories[target] || target);

		let totalSize = 0;
		let totalFiles = 0;
		let totalConversations = 0;
		let totalTokens = 0;

		const walkDir = (dir: string) => {
			if (!fs.existsSync(dir)) return;
			try {
				const entries = fs.readdirSync(dir, { withFileTypes: true });
				for (const entry of entries) {
					const fullPath = path.join(dir, entry.name);
					if (entry.isDirectory()) {
						walkDir(fullPath);
					} else {
						totalFiles++;
						const { size } = fs.statSync(fullPath);
						totalSize += size;
						if (
							entry.name.endsWith('.json') &&
							entry.name !== 'index.json' &&
							entry.name !== 'config.json'
						) {
							totalConversations++;
							const stats = this.getConversationStats(fullPath, entry.name.replace('.json', ''));
							totalTokens += stats.estimatedTokens;
						}
					}
				}
			} catch {}
		};

		walkDir(targetDir);

		return {
			content: [
				{
					type: 'text',
					text:
						`Resources for Target: ${target}\n` +
						`${'─'.repeat(50)}\n` +
						`Type: IDE Configuration\n` +
						`Config dir: ${targetDir}\n` +
						`Total files: ${totalFiles}\n` +
						`Conversations: ${totalConversations}\n` +
						`Total tokens (est.): ~${totalTokens}\n` +
						`Total size: ${this.formatBytes(totalSize)}\n` +
						`Project path: ${projectPath}`,
				},
			],
		};
	}

	private handleListProjects(arguments_: any) {
		const { id } = arguments_;

		if (!this.isSourceAgent(id)) {
			return {
				content: [
					{
						type: 'text',
						text: `list_projects only works with source agents, not ${id}`,
					},
				],
				isError: true,
			};
		}

		const baseDir = this.getSourceDir(id, undefined);
		if (!baseDir)
			return {
				content: [{ type: 'text', text: `Unknown agent: ${id}` }],
				isError: true,
			};

		const projectsDir = path.join(baseDir, 'projects');
		if (!fs.existsSync(projectsDir)) {
			return {
				content: [{ type: 'text', text: `No projects directory for ${id}` }],
			};
		}

		try {
			const projects = fs.readdirSync(projectsDir);
			if (projects.length === 0) {
				return {
					content: [{ type: 'text', text: `No projects found for ${id}` }],
				};
			}

			let output = `Projects for ${id} (${projects.length}):\n\n`;
			for (const proj of projects) {
				const sessionsPath = path.join(projectsDir, proj, 'sessions');
				let convCount = 0;
				let totalTokens = 0;
				if (fs.existsSync(sessionsPath)) {
					const files = fs.readdirSync(sessionsPath).filter((f) => f.endsWith('.json'));
					convCount = files.length;
					for (const file of files) {
						const stats = this.getConversationStats(
							path.join(sessionsPath, file),
							file.replace('.json', '')
						);
						totalTokens += stats.estimatedTokens;
					}
				}

				output += `┌─ ${proj}\n`;
				output += `│  Sessions: ${convCount}\n`;
				output += `│  Tokens (est.): ~${totalTokens}\n`;
				output += `└─\n`;
			}

			return { content: [{ type: 'text', text: output }] };
		} catch (error) {
			return {
				content: [{ type: 'text', text: `Error: ${error}` }],
				isError: true,
			};
		}
	}

	private formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Number.parseFloat((bytes / k ** i).toFixed(2)) + ' ' + sizes[i];
	}

	private hashPath(p: string): string {
		let hash = 0;
		for (let i = 0; i < p.length; i++) {
			const char = p.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash &= hash;
		}

		return Math.abs(hash).toString(36);
	}

	async start() {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
	}
}

const server = new AgentSyncMCPServer();
server.start().catch(console.error);
