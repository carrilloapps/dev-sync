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

export class ClaudeCodeAnalyzer {
	private readonly projectPath: string;

	constructor(projectPath: string) {
		this.projectPath = projectPath;
	}

	async analyze(): Promise<AnalyzerResult> {
		const projectContext = await this.extractProjectContext();
		const sessionData = await this.extractSessionData();

		return {
			source: 'claude-code',
			projectContext,
			sessionData,
			recommendations: this.generateRecommendations(
				projectContext,
				sessionData,
			),
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
			'.rs',
			'.go',
			'.java',
		];

		const scanDir = (dir: string) => {
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
					const imports = this.extractImports(content, entry.name);
					const exports = this.extractExports(content, entry.name);

					files.push({
						path: relPath.replaceAll('\\', '/'),
						language: this.detectLanguage(entry.name),
						framework: this.detectFramework(entry.name, content),
						lines,
						imports,
						exports,
					});
				}
			}
		};

		scanDir(this.projectPath);
		return files;
	}

	private extractImports(content: string, filename: string): string[] {
		const imports: string[] = [];
		const importRegex = /(?:import|require|from)\s+['"]([^'"]+)['"]/g;
		let match;
		while ((match = importRegex.exec(content)) !== null) {
			imports.push(match[1]);
		}

		return imports;
	}

	private extractExports(content: string, filename: string): string[] {
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
			'.rs': 'Rust',
			'.go': 'Go',
			'.java': 'Java',
		};
		return langMap[extension] || 'Unknown';
	}

	private detectFramework(
		filename: string,
		content: string,
	): string | undefined {
		if (filename.includes('next')) return 'Next.js';
		if (filename.includes('react')) return 'React';
		if (content.includes('vue')) return 'Vue';
		if (content.includes('@angular/core')) return 'Angular';
		if (content.includes('def __init__')) return 'Django/Flask';
		if (content.includes('func main')) return 'Go';
		return undefined;
	}

	private async scanConfigFiles(): Promise<ConfigFile[]> {
		const configFiles: ConfigFile[] = [];
		const configPatterns: Record<string, string[]> = {
			package: ['package.json'],
			tsconfig: ['tsconfig.json', 'tsconfig.build.json'],
			babel: ['.babelrc', 'babel.config.json'],
			eslint: ['.eslintrc', '.eslintrc.json', 'eslint.config.js'],
			prettier: ['.prettierrc', '.prettierrc.json', 'prettier.config.js'],
			jest: ['jest.config.js', 'jest.config.ts'],
			webpack: ['webpack.config.js', 'webpack.config.ts'],
			vite: ['vite.config.ts', 'vite.config.js'],
			next: ['next.config.js', 'next.config.ts'],
		};

		for (const [type, filenames] of Object.entries(configPatterns)) {
			for (const filename of filenames) {
				const filePath = path.join(this.projectPath, filename);
				if (fs.existsSync(filePath)) {
					try {
						const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
						configFiles.push({
							path: filename,
							type: type as ConfigFile['type'],
							content,
						});
					} catch {
						const content = fs.readFileSync(filePath, 'utf8');
						configFiles.push({
							path: filename,
							type: 'other',
							content: {raw: content},
						});
					}
				}
			}
		}

		return configFiles;
	}

	private async extractDependencies(): Promise<Dependency[]> {
		const packagePath = path.join(this.projectPath, 'package.json');
		if (!fs.existsSync(packagePath)) return [];

		const package_ = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
		const deps: Dependency[] = [];

		for (const [name, version] of Object.entries(package_.dependencies || {})) {
			deps.push({name, version: String(version), type: 'production'});
		}

		for (const [name, version] of Object.entries(
			package_.devDependencies || {},
		)) {
			deps.push({name, version: String(version), type: 'development'});
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

		const packagePath = path.join(this.projectPath, 'package.json');
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

		const claudeDir = this.getClaudeCodeDir();
		if (!claudeDir || !fs.existsSync(claudeDir)) return undefined;

		const projectsDir = path.join(claudeDir, 'projects');
		if (fs.existsSync(projectsDir)) {
			const currentProjectHash = this.hashPath(this.projectPath);
			const projectSessionsDir = path.join(
				projectsDir,
				currentProjectHash,
				'sessions',
			);

			if (fs.existsSync(projectSessionsDir)) {
				const sessionFiles = fs
					.readdirSync(projectSessionsDir)
					.filter((f) => f.endsWith('.json'));
				for (const sessionFile of sessionFiles.slice(0, 10)) {
					try {
						const sessionContent = JSON.parse(
							fs.readFileSync(
								path.join(projectSessionsDir, sessionFile),
								'utf8',
							),
						);
						conversations.push({
							id: sessionFile.replace('.json', ''),
							timestamp: sessionContent.timestamp || new Date().toISOString(),
							messages: sessionContent.messages || [],
						});
					} catch {}
				}
			}
		}

		return {conversations, tools: this.extractToolUsage(conversations)};
	}

	private getClaudeCodeDir(): string | undefined {
		const home = process.env.HOME || process.env.USERPROFILE || '';
		const directories = {
			windows: path.join(process.env.APPDATA || '', 'Claude', 'claude-code'),
			linux: path.join(home, '.config', 'claude-code'),
			mac: path.join(home, 'Library', 'Application Support', 'claude-code'),
		};

		const platform =
			process.platform === 'win32'
				? 'windows'
				: process.platform === 'darwin'
					? 'mac'
					: 'linux';

		return directories[platform] || undefined;
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

	private generateRecommendations(
		context: ProjectContext,
		session?: SessionData,
	): string[] {
		const recs: string[] = [];

		if (context.dependencies.length === 0) {
			recs.push(
				'No package.json found - project may use different dependency system',
			);
		}

		const hasReact = context.dependencies.some((d) => d.name.includes('react'));
		if (hasReact) {
			recs.push('React project detected - ensure React 18 compatibility');
		}

		const hasTypeScript = context.configFiles.some(
			(c) => c.type === 'tsconfig',
		);
		if (
			!hasTypeScript &&
			context.sourceFiles.some((f) => f.language === 'JavaScript')
		) {
			recs.push(
				'Consider migrating JavaScript to TypeScript for better type safety',
			);
		}

		return recs;
	}
}

export async function analyzeWithClaudeCode(
	projectPath: string,
): Promise<AnalyzerResult> {
	const analyzer = new ClaudeCodeAnalyzer(projectPath);
	return analyzer.analyze();
}
