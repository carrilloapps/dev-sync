import * as path from 'node:path';

export const ALL_SOURCES: Array<{
	id: string;
	name: string;
	platform: string;
	sessionPath: string;
}> = [
	{
		id: 'claude-code',
		name: 'Claude Code',
		platform: 'all',
		sessionPath: 'sessions',
	},
	{
		id: 'copilot',
		name: 'GitHub Copilot',
		platform: 'all',
		sessionPath: 'copilot/sessions',
	},
	{
		id: 'gemini',
		name: 'Google Gemini',
		platform: 'all',
		sessionPath: 'sessions',
	},
	{ id: 'cursor', name: 'Cursor', platform: 'all', sessionPath: 'sessions' },
	{
		id: 'windsurf',
		name: 'WindSurf',
		platform: 'all',
		sessionPath: 'sessions',
	},
	{ id: 'trae', name: 'Trae', platform: 'all', sessionPath: 'sessions' },
	{ id: 'codepal', name: 'CodePal', platform: 'all', sessionPath: 'sessions' },
	{ id: 'aider', name: 'Aider', platform: 'all', sessionPath: '.aider' },
	{
		id: 'continue',
		name: 'Continue',
		platform: 'all',
		sessionPath: '.continue',
	},
	{
		id: 'codegeek',
		name: 'CodeGeek',
		platform: 'all',
		sessionPath: 'sessions',
	},
	{
		id: 'replit',
		name: 'Replit Agent',
		platform: 'all',
		sessionPath: '.replit',
	},
	{ id: 'devin', name: 'Devin', platform: 'all', sessionPath: 'sessions' },
];

export const ALL_TARGETS: Array<{
	id: string;
	name: string;
	configDir: string;
	configFile: string;
}> = [
	{
		id: 'opencode',
		name: 'OpenCode',
		configDir: '.opencode',
		configFile: 'config.json',
	},
	{
		id: 'vscode',
		name: 'Visual Studio Code',
		configDir: '.vscode',
		configFile: 'workspace-state.json',
	},
	{
		id: 'jetbrains',
		name: 'JetBrains IDEs',
		configDir: '.jetbrains',
		configFile: 'workspace/project-state.json',
	},
	{
		id: 'cursor',
		name: 'Cursor IDE',
		configDir: '.cursor',
		configFile: 'config.json',
	},
	{
		id: 'sublime',
		name: 'Sublime Text',
		configDir: '.sublime',
		configFile: 'workspace.json',
	},
	{
		id: 'vim',
		name: 'Vim/Neovim',
		configDir: '.vim',
		configFile: 'session.vim',
	},
	{
		id: 'emacs',
		name: 'Emacs',
		configDir: '.emacs.d',
		configFile: 'workspace.org',
	},
	{
		id: 'atom',
		name: 'Atom',
		configDir: '.atom',
		configFile: 'workspace.cson',
	},
	{
		id: 'nova',
		name: 'Nova',
		configDir: '.nova',
		configFile: 'workspace.json',
	},
	{
		id: 'lapce',
		name: 'Lapce',
		configDir: '.lapce',
		configFile: 'workspace.json',
	},
	{ id: 'zed', name: 'Zed', configDir: '.zed', configFile: 'workspace.json' },
	{
		id: 'onivim',
		name: 'Onivim',
		configDir: '.onivim',
		configFile: 'workspace.json',
	},
];

export type ConversationMessage = {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: string;
	attachments?: string[];
	metadata?: Record<string, any>;
};

export type Conversation = {
	id: string;
	agent: string;
	projectPath?: string;
	startedAt: string;
	updatedAt: string;
	messages: ConversationMessage[];
	context?: {
		files?: string[];
		dependencies?: string[];
		language?: string;
	};
};

export type ProjectSyncState = {
	projectPath: string;
	target: string;
	lastSync: string;
	filesCount: number;
	languages: string[];
	frameworks: string[];
	conversationsCount: number;
};

export function getAgentDir(agentId: string, projectPath?: string): string | undefined {
	const home = process.env.HOME || process.env.USERPROFILE || '';
	const directories: Record<string, string> = {
		'claude-code':
			process.platform === 'win32'
				? path.join(process.env.APPDATA || '', 'Claude', 'claude-code')
				: process.platform === 'darwin'
					? path.join(home, 'Library', 'Application Support', 'claude-code')
					: path.join(home, '.config', 'claude-code'),
		copilot:
			process.platform === 'win32'
				? path.join(process.env.APPDATA || '', 'Code', 'User')
				: process.platform === 'darwin'
					? path.join(home, 'Library', 'Application Support', 'Code', 'User')
					: path.join(home, '.config', 'Code', 'User'),
		gemini:
			process.platform === 'win32'
				? path.join(process.env.LOCALAPPDATA || '', 'Google', 'Gemini')
				: process.platform === 'darwin'
					? path.join(home, 'Library', 'Application Support', 'Google', 'Gemini')
					: path.join(home, '.config', 'google-gemini'),
		cursor:
			process.platform === 'win32'
				? path.join(process.env.APPDATA || '', 'Cursor')
				: process.platform === 'darwin'
					? path.join(home, 'Library', 'Application Support', 'Cursor')
					: path.join(home, '.config', 'Cursor'),
		windsurf:
			process.platform === 'win32'
				? path.join(process.env.APPDATA || '', 'WindSurf')
				: process.platform === 'darwin'
					? path.join(home, 'Library', 'Application Support', 'WindSurf')
					: path.join(home, '.config', 'WindSurf'),
		trae:
			process.platform === 'win32'
				? path.join(process.env.APPDATA || '', 'Trae')
				: path.join(home, '.config', 'trae'),
		aider: path.join(home, '.aider'),
		continue: path.join(home, '.continue'),
		replit: path.join(home, '.replit'),
	};

	const baseDir = directories[agentId];
	if (!baseDir) return undefined;

	if (projectPath) {
		return path.join(baseDir, 'projects', hashPath(projectPath), 'sessions');
	}

	return path.join(baseDir, 'sessions');
}

export function getTargetDir(targetId: string, projectPath: string): string | undefined {
	const directories: Record<string, string> = {
		opencode: '.opencode',
		vscode: '.vscode',
		jetbrains: '.jetbrains',
		cursor: '.cursor',
		sublime: '.sublime',
		vim: '.vim',
		emacs: '.emacs.d',
		atom: '.atom',
		nova: '.nova',
		lapce: '.lapce',
		zed: '.zed',
		onivim: '.onivim',
	};

	const dir = directories[targetId];
	return dir ? path.join(projectPath, dir) : undefined;
}

function hashPath(p: string): string {
	let hash = 0;
	for (let i = 0; i < p.length; i++) {
		const char = p.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash &= hash;
	}

	return Math.abs(hash).toString(36);
}
