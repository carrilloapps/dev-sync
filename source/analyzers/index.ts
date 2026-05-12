import * as fs from 'node:fs';
import * as path from 'node:path';
import {
	type AnalyzerResult,
	ProjectContext,
	SessionData as TypeSessionData,
	Conversation as TypeConversation,
	type EnvironmentInfo,
} from '../types/index.js';
import {type SessionData, type ConversationInfo} from '../exporters/index.js';

export type Analyzer = {
	analyze(): Promise<AnalyzerResult>;
	getId(): string;
	getName(): string;
};

export type SourceAgent =
	| 'claude-code'
	| 'copilot'
	| 'gemini'
	| 'cursor'
	| 'windsurf'
	| 'trae'
	| 'codepal'
	| 'aider'
	| 'continue'
	| 'replit'
	| 'devin'
	| 'goose'
	| 'aider-go'
	| 'mistral'
	| 'perplexity';

export type TargetIDE =
	| 'opencode'
	| 'vscode'
	| 'jetbrains'
	| 'cursor'
	| 'sublime'
	| 'vim'
	| 'emacs'
	| 'atom'
	| 'zed'
	| 'lapce'
	| 'nova'
	| 'onivim'
	| 'tabby';

export const ALL_SOURCES: Array<{
	id: SourceAgent;
	name: string;
	platform: string;
}> = [
	{id: 'claude-code', name: 'Claude Code', platform: 'all'},
	{id: 'copilot', name: 'GitHub Copilot', platform: 'all'},
	{id: 'gemini', name: 'Google Gemini', platform: 'all'},
	{id: 'cursor', name: 'Cursor', platform: 'all'},
	{id: 'windsurf', name: 'WindSurf', platform: 'all'},
	{id: 'trae', name: 'Trae', platform: 'all'},
	{id: 'codepal', name: 'CodePal', platform: 'all'},
	{id: 'aider', name: 'Aider', platform: 'all'},
	{id: 'continue', name: 'Continue Dev', platform: 'all'},
	{id: 'replit', name: 'Replit Agent', platform: 'all'},
	{id: 'devin', name: 'Devin AI', platform: 'all'},
	{id: 'goose', name: 'Goose', platform: 'all'},
	{id: 'aider-go', name: 'Aider Go', platform: 'all'},
	{id: 'mistral', name: 'Mistral Codestral', platform: 'all'},
	{id: 'perplexity', name: 'Perplexity', platform: 'all'},
];

export const ALL_TARGETS: Array<{
	id: TargetIDE;
	name: string;
	configDir: string;
}> = [
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

export const supportedSources = ALL_SOURCES;
export const supportedTargets = ALL_TARGETS;

export function createAnalyzer(source: string, projectPath: string): Analyzer {
	const sourceInfo = ALL_SOURCES.find((s) => s.id === source);
	if (!sourceInfo) {
		throw new Error(
			`Unknown source: ${source}. Supported: ${ALL_SOURCES.map((s) => s.id).join(', ')}`,
		);
	}

	return {
		async analyze(): Promise<AnalyzerResult> {
			return analyzeProject(source, projectPath);
		},
		getId() {
			return source;
		},
		getName() {
			return sourceInfo.name;
		},
	};
}

function getSourceAgentPaths(): Record<
	string,
	{base: string; projects: string; sessions: string}
> {
	const home = process.env.HOME || process.env.USERPROFILE || '';
	const {platform} = process;

	const getDir = (p: string) =>
		platform === 'win32'
			? path.join(process.env.APPDATA || '', p)
			: platform === 'darwin'
				? path.join(home, 'Library', 'Application Support', p)
				: path.join(home, '.config', p);

	return {
		'claude-code': {
			base: getDir('Claude'),
			projects: 'projects',
			sessions: 'sessions',
		},
		copilot: {
			base: getDir('Code/User'),
			projects: 'projects',
			sessions: 'copilot/sessions',
		},
		gemini: {
			base: getDir('Google/Gemini'),
			projects: 'projects',
			sessions: 'sessions',
		},
		cursor: {
			base: getDir('Cursor'),
			projects: 'projects',
			sessions: 'sessions',
		},
		windsurf: {
			base: getDir('WindSurf'),
			projects: 'projects',
			sessions: 'sessions',
		},
		trae: {base: getDir('Trae'), projects: 'projects', sessions: 'sessions'},
		codepal: {
			base: getDir('CodePal'),
			projects: 'projects',
			sessions: 'sessions',
		},
		aider: {base: path.join(home, '.aider'), projects: '', sessions: ''},
		continue: {
			base: path.join(home, '.continue'),
			projects: '',
			sessions: '',
		},
		replit: {base: path.join(home, '.replit'), projects: '', sessions: ''},
		goose: {
			base: getDir('goose'),
			projects: 'projects',
			sessions: 'sessions',
		},
		'aider-go': {
			base: path.join(home, '.aider.go'),
			projects: '',
			sessions: '',
		},
		mistral: {
			base: getDir('Mistral'),
			projects: 'projects',
			sessions: 'sessions',
		},
		perplexity: {
			base: getDir('Perplexity'),
			projects: 'projects',
			sessions: 'sessions',
		},
	};
}

async function analyzeProject(
	source: string,
	projectPath: string,
): Promise<AnalyzerResult> {
	const sourceFiles: Array<{
		path: string;
		language: string;
		framework?: string;
		lines: number;
		imports: string[];
		exports: string[];
	}> = [];
	const configFiles: Array<{
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
	}> = [];
	const dependencies: Array<{
		name: string;
		version: string;
		type: 'production' | 'development';
	}> = [];

	const scanDir = (dir: string, depth = 0) => {
		if (depth > 5 || !fs.existsSync(dir)) return;
		try {
			const entries = fs.readdirSync(dir, {withFileTypes: true});
			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);
				if (entry.isDirectory()) {
					if (
						![
							'node_modules',
							'.git',
							'dist',
							'build',
							'target',
							'__pycache__',
							'.next',
							'coverage',
						].includes(entry.name)
					) {
						scanDir(fullPath, depth + 1);
					}
				} else {
					const extension = path.extname(entry.name);
					const codeExtensions = [
						'.ts',
						'.tsx',
						'.js',
						'.jsx',
						'.py',
						'.rs',
						'.go',
						'.java',
						'.cpp',
						'.c',
						'.cs',
						'.rb',
						'.php',
						'.swift',
						'.kt',
					];

					if (codeExtensions.includes(extension)) {
						try {
							const content = fs.readFileSync(fullPath, 'utf8');
							const lines = content.split('\n').length;
							const imports = (
								content.match(/(?:import|require|from)\s+['"][^'"]+['"]/g) || []
							).slice(0, 20);
							const exports = (
								content.match(
									/export\s+(?:default\s+)?(?:function|class|const|let|var)/g,
								) || []
							).slice(0, 20);

							sourceFiles.push({
								path: path
									.relative(projectPath, fullPath)
									.replaceAll('\\', '/'),
								language: getLanguage(extension),
								framework: detectFramework(entry.name, content),
								lines,
								imports,
								exports,
							});
						} catch {}
					}

					if (
						[
							'package.json',
							'tsconfig.json',
							'Cargo.toml',
							'go.mod',
							'pom.xml',
							'build.gradle',
							'requirements.txt',
							'Gemfile',
							'Podfile',
						].includes(entry.name)
					) {
						try {
							const typeMap: Record<string, 'package' | 'tsconfig' | 'other'> =
								{
									'package.json': 'package',
									'tsconfig.json': 'tsconfig',
								};
							if (entry.name === 'package.json') {
								const package_ = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
								for (const [n, v] of Object.entries(
									package_.dependencies || {},
								)) {
									dependencies.push({
										name: n,
										version: String(v),
										type: 'production',
									});
								}

								for (const [n, v] of Object.entries(
									package_.devDependencies || {},
								)) {
									dependencies.push({
										name: n,
										version: String(v),
										type: 'development',
									});
								}
							}

							configFiles.push({
								path: entry.name,
								type: typeMap[entry.name] || 'other',
								content: {},
							});
						} catch {}
					}
				}
			}
		} catch {}
	};

	scanDir(projectPath);

	const conversations = loadConversations(source, projectPath);

	return {
		source: source as any,
		projectContext: {
			projectPath,
			sourceFiles,
			configFiles,
			dependencies,
			environment: getEnvironmentInfo(),
		},
		sessionData: conversations,
		recommendations: generateRecommendations(sourceFiles, dependencies),
	};
}

function loadConversations(
	source: string,
	projectPath?: string,
): SessionData | undefined {
	const paths = getSourceAgentPaths();
	const sourcePath = paths[source];
	if (!sourcePath) return undefined;

	let baseDir: string;
	if (projectPath && sourcePath.projects) {
		const hash = hashPath(projectPath);
		baseDir = path.join(
			sourcePath.base,
			sourcePath.projects,
			hash,
			sourcePath.sessions,
		);
	} else {
		baseDir = path.join(sourcePath.base, sourcePath.sessions);
	}

	if (!fs.existsSync(baseDir)) return {conversations: [], tools: []};

	try {
		const files = fs
			.readdirSync(baseDir)
			.filter((f) => f.endsWith('.json') && f !== 'index.json');
		const conversations: ConversationInfo[] = [];

		for (const file of files.slice(0, 20)) {
			try {
				const content = fs.readFileSync(path.join(baseDir, file), 'utf8');
				const data = JSON.parse(content);
				conversations.push({
					id: file.replace('.json', ''),
					messages: data.messages || [],
					timestamp:
						data.timestamp || data.migratedAt || new Date().toISOString(),
				});
			} catch {}
		}

		return {conversations, tools: []};
	} catch {
		return {conversations: [], tools: []};
	}
}

function getLanguage(extension: string): string {
	const map: Record<string, string> = {
		'.ts': 'TypeScript',
		'.tsx': 'TypeScript',
		'.js': 'JavaScript',
		'.jsx': 'JavaScript',
		'.py': 'Python',
		'.rs': 'Rust',
		'.go': 'Go',
		'.java': 'Java',
		'.cpp': 'C++',
		'.c': 'C',
		'.cs': 'C#',
		'.rb': 'Ruby',
		'.php': 'PHP',
		'.swift': 'Swift',
		'.kt': 'Kotlin',
		'.html': 'HTML',
		'.css': 'CSS',
		'.scss': 'SCSS',
		'.json': 'JSON',
		'.md': 'Markdown',
	};
	return map[extension] || 'Unknown';
}

function detectFramework(
	filename: string,
	content: string,
): string | undefined {
	const lower = filename.toLowerCase();
	if (lower.includes('next')) return 'Next.js';
	if (lower.includes('react')) return 'React';
	if (content.includes('vue') || content.includes('<template>')) return 'Vue';
	if (content.includes('@angular/core') || content.includes('NgModule'))
		return 'Angular';
	if (
		content.includes('def __init__') ||
		content.includes('flask') ||
		content.includes('django')
	)
		return 'Python';
	if (content.includes('func main') || content.includes('package main'))
		return 'Go';
	if (content.includes('fn main') || content.includes('impl ')) return 'Rust';
	if (content.includes('class ') && content.includes('extends '))
		return content.includes('AppCompatActivity') ? 'Android' : 'Java';
	return undefined;
}

function generateRecommendations(
	files: Array<{language: string}>,
	deps: Array<{name: string}>,
): string[] {
	const recs: string[] = [];
	if (files.length === 0) recs.push('No source files detected');
	if (deps.length === 0)
		recs.push('No dependencies found - may use system libraries');

	const hasReact = deps.some((d) => d.name.includes('react'));
	const hasVue = deps.some((d) => d.name.includes('vue'));
	const hasAngular = deps.some((d) => d.name.includes('@angular'));

	if (hasReact)
		recs.push('React project detected - ensure React 18+ compatibility');
	if (hasVue) recs.push('Vue project detected');
	if (hasAngular) recs.push('Angular project detected');

	return recs;
}

function getEnvironmentInfo(): EnvironmentInfo {
	return {
		platform:
			process.platform === 'win32'
				? 'windows'
				: process.platform === 'darwin'
					? 'mac'
					: 'linux',
		nodeVersion: process.version,
		packageManager: fs.existsSync(path.join(process.cwd(), 'pnpm-lock.yaml'))
			? 'pnpm'
			: fs.existsSync(path.join(process.cwd(), 'yarn.lock'))
				? 'yarn'
				: 'npm',
		shell: process.env.SHELL || process.env.COMSPEC || 'unknown',
	};
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
