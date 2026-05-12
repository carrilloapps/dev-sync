import * as fs from 'node:fs';
import * as path from 'node:path';
import {
	type AnalyzerResult,
	type ProjectContext,
	type SourceFile,
	type ConfigFile,
	type Dependency,
	type EnvironmentInfo,
	type SessionData,
	type Conversation,
} from '../types/index.js';

export class CursorAnalyzer {
	private readonly projectPath: string;

	constructor(projectPath: string) {
		this.projectPath = projectPath;
	}

	async analyze(): Promise<AnalyzerResult> {
		const projectContext = await this.extractProjectContext();
		const sessionData = await this.extractSessionData();

		return {
			source: 'cursor',
			projectContext,
			sessionData,
			recommendations: this.generateRecommendations(projectContext),
		};
	}

	private async extractProjectContext(): Promise<ProjectContext> {
		const sourceFiles = await this.scanSourceFiles();
		const configFiles = await this.scanConfigFiles();
		const dependencies = await this.extractDependencies();
		const environment = await this.detectEnvironment();

		return {
			projectPath: this.projectPath,
			sourceFiles,
			configFiles,
			dependencies,
			environment,
		};
	}

	private async scanSourceFiles(): Promise<SourceFile[]> {
		const files: SourceFile[] = [];
		const extensions = [
			'.ts',
			'.tsx',
			'.js',
			'.jsx',
			'.py',
			'.java',
			'.go',
			'.rs',
		];

		const scanDir = (dir: string) => {
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
								'.cursor',
								'.vscode',
							].includes(entry.name)
						) {
							scanDir(fullPath);
						}
					} else if (
						extensions.some((extension) => entry.name.endsWith(extension))
					) {
						const relPath = path.relative(this.projectPath, fullPath);
						const content = fs.readFileSync(fullPath, 'utf8');
						const lines = content.split('\n').length;

						files.push({
							path: relPath.replaceAll('\\', '/'),
							language: this.detectLanguage(entry.name),
							framework: this.detectFramework(entry.name, content),
							lines,
							imports: this.extractImports(content),
							exports: this.extractExports(content),
						});
					}
				}
			} catch {}
		};

		scanDir(this.projectPath);
		return files;
	}

	private extractImports(content: string): string[] {
		const imports: string[] = [];
		const importRegex = /(?:import|require|from)\s+['"]([^'"]+)['"]/g;
		let match;
		while ((match = importRegex.exec(content)) !== null) {
			imports.push(match[1]);
		}

		return imports;
	}

	private extractExports(content: string): string[] {
		const exports: string[] = [];
		const exportRegex =
			/(?:export\s+(?:default\s+)?(?:function|class|const|let|var)|module\.exports)\s+(\w+)/g;
		let match;
		while ((match = exportRegex.exec(content)) !== null) {
			exports.push(match[1]);
		}

		return exports;
	}

	private detectLanguage(filename: string): string {
		const extension = path.extname(filename);
		const langMap: Record<string, string> = {
			'.ts': 'TypeScript',
			'.tsx': 'TypeScript',
			'.js': 'JavaScript',
			'.jsx': 'JavaScript',
			'.py': 'Python',
			'.java': 'Java',
			'.go': 'Go',
			'.rs': 'Rust',
		};
		return langMap[extension] || 'Unknown';
	}

	private detectFramework(
		filename: string,
		content: string,
	): string | undefined {
		if (content.includes("from 'react'") || content.includes('from "react"'))
			return 'React';
		if (content.includes("from 'next'") || content.includes('from "next"'))
			return 'Next.js';
		if (content.includes("from 'vue'") || content.includes('from "vue"'))
			return 'Vue';
		if (content.includes('def __init__')) return 'Django/Flask';
		if (content.includes('func main')) return 'Go';
		return undefined;
	}

	private async scanConfigFiles(): Promise<ConfigFile[]> {
		const configFiles: ConfigFile[] = [];
		const configNames = [
			'package.json',
			'tsconfig.json',
			'.cursorrc',
			'.cursorrules',
			'requirements.txt',
			'Pipfile',
			'go.mod',
			'Cargo.toml',
		];

		for (const configName of configNames) {
			const filePath = path.join(this.projectPath, configName);
			if (fs.existsSync(filePath)) {
				try {
					const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
					configFiles.push({
						path: configName,
						type: this.configType(configName),
						content,
					});
				} catch {
					configFiles.push({
						path: configName,
						type: 'other',
						content: {
							raw: fs.readFileSync(filePath, 'utf8').slice(0, 500),
						},
					});
				}
			}
		}

		return configFiles;
	}

	private configType(filename: string): ConfigFile['type'] {
		if (filename === 'package.json') return 'package';
		if (filename.startsWith('tsconfig')) return 'tsconfig';
		if (filename === '.cursorrules' || filename === '.cursorrc') return 'other';
		return 'other';
	}

	private async extractDependencies(): Promise<Dependency[]> {
		const deps: Dependency[] = [];

		const packageJsonPath = path.join(this.projectPath, 'package.json');
		if (fs.existsSync(packageJsonPath)) {
			const package_ = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
			for (const [name, version] of Object.entries(
				package_.dependencies || {},
			)) {
				deps.push({name, version: String(version), type: 'production'});
			}

			for (const [name, version] of Object.entries(
				package_.devDependencies || {},
			)) {
				deps.push({name, version: String(version), type: 'development'});
			}
		}

		return deps;
	}

	private async detectEnvironment(): Promise<EnvironmentInfo> {
		const platform =
			process.platform === 'win32'
				? 'windows'
				: process.platform === 'darwin'
					? 'mac'
					: 'linux';

		let packageManager: 'npm' | 'yarn' | 'pnpm' = 'npm';
		if (fs.existsSync(path.join(this.projectPath, 'pnpm-lock.yaml')))
			packageManager = 'pnpm';
		else if (fs.existsSync(path.join(this.projectPath, 'yarn.lock')))
			packageManager = 'yarn';

		return {
			platform,
			nodeVersion: process.version,
			packageManager,
			shell: process.env.SHELL || process.env.COMSPEC || 'unknown',
		};
	}

	private async extractSessionData(): Promise<SessionData | undefined> {
		const conversations: Conversation[] = [];

		const cursorDir = this.getCursorDir();
		if (!cursorDir || !fs.existsSync(cursorDir)) return undefined;

		const sessionsDir = path.join(cursorDir, 'sessions');
		if (fs.existsSync(sessionsDir)) {
			try {
				const files = fs
					.readdirSync(sessionsDir)
					.filter((f) => f.endsWith('.json'))
					.slice(0, 20);
				for (const file of files) {
					try {
						const content = JSON.parse(
							fs.readFileSync(path.join(sessionsDir, file), 'utf8'),
						);
						conversations.push({
							id: file.replace('.json', ''),
							timestamp: content.timestamp || new Date().toISOString(),
							messages: content.messages || [],
						});
					} catch {}
				}
			} catch {}
		}

		return {conversations, tools: this.extractToolUsage(conversations)};
	}

	private getCursorDir(): string | undefined {
		const home = process.env.HOME || process.env.USERPROFILE || '';
		const directories: Record<string, string> = {
			win32: path.join(process.env.APPDATA || '', 'Cursor'),
			darwin: path.join(home, 'Library', 'Application Support', 'Cursor'),
			linux: path.join(home, '.config', 'Cursor'),
		};

		return directories[process.platform] || undefined;
	}

	private extractToolUsage(
		conversations: Conversation[],
	): Array<{name: string; count: number; lastUsed: string}> {
		const tools = new Map<string, {count: number; lastUsed: string}>();

		for (const conv of conversations) {
			for (const message of conv.messages) {
				const toolMatches = message.content.match(/\/(\w+)/g) || [];
				for (const match of toolMatches) {
					const toolName = match.slice(1);
					const existing = tools.get(toolName) || {
						count: 0,
						lastUsed: conv.timestamp,
					};
					tools.set(toolName, {
						count: existing.count + 1,
						lastUsed: conv.timestamp,
					});
				}
			}
		}

		return [...tools.entries()].map(([name, data]) => ({
			name,
			...data,
		}));
	}

	private generateRecommendations(context: ProjectContext): string[] {
		const recs: string[] = [];

		const hasCursorRules = context.configFiles.some(
			(c) => c.path === '.cursorrules',
		);
		if (hasCursorRules) {
			recs.push('Cursor rules file detected - will preserve custom rules');
		}

		return recs;
	}
}

export async function analyzeWithCursor(
	projectPath: string,
): Promise<AnalyzerResult> {
	const analyzer = new CursorAnalyzer(projectPath);
	return analyzer.analyze();
}
