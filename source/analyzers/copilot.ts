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

export class CopilotAnalyzer {
	private readonly projectPath: string;

	constructor(projectPath: string) {
		this.projectPath = projectPath;
	}

	async analyze(): Promise<AnalyzerResult> {
		const projectContext = await this.extractProjectContext();
		const sessionData = await this.extractSessionData();

		return {
			source: 'copilot',
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
		const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cs', '.go'];

		const scanDir = (dir: string) => {
			try {
				const entries = fs.readdirSync(dir, { withFileTypes: true });
				for (const entry of entries) {
					const fullPath = path.join(dir, entry.name);
					if (entry.isDirectory()) {
						if (
							!['node_modules', '.git', 'dist', 'build', 'target', '.vscode'].includes(entry.name)
						) {
							scanDir(fullPath);
						}
					} else if (extensions.some((extension) => entry.name.endsWith(extension))) {
						const relPath = path.relative(this.projectPath, fullPath);
						const content = fs.readFileSync(fullPath, 'utf8');
						const lines = content.split('\n').length;
						const imports = this.extractImports(content);
						const exports = this.extractExports(content);

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
			} catch {}
		};

		scanDir(this.projectPath);
		return files;
	}

	private extractImports(content: string): string[] {
		const imports: string[] = [];
		const patterns = [
			/import\s+.*?from\s+['"]([^'"]+)['"]/g,
			/require\s*\(['"]([^'"]+)['"]\)/g,
			/using\s+(\w+\.)*(\w+);/g,
			/use\s+(\w+)(?::|\s+)/g,
		];

		for (const pattern of patterns) {
			let match;
			while ((match = pattern.exec(content)) !== null) {
				imports.push(match[1]);
			}
		}

		return [...new Set(imports)];
	}

	private extractExports(content: string): string[] {
		const exports: string[] = [];
		const patterns = [
			/export\s+(?:default\s+)?(?:function|class|const|let|var|interface|type)\s+(\w+)/g,
			/module\.exports\s*=\s*(\w+)/g,
			/public\s+(?:class|static|readonly)\s+(\w+)/g,
		];

		for (const pattern of patterns) {
			let match;
			while ((match = pattern.exec(content)) !== null) {
				exports.push(match[1]);
			}
		}

		return [...new Set(exports)];
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
			'.cs': 'C#',
			'.go': 'Go',
			'.rs': 'Rust',
		};
		return langMap[extension] || 'Unknown';
	}

	private detectFramework(filename: string, content: string): string | undefined {
		if (content.includes('@Injectable') || content.includes('NgModule')) return 'Angular';
		if (content.includes('@Component') || content.includes('@Directive')) return 'Angular';
		if (content.includes("from 'react'") || content.includes('from "react"')) return 'React';
		if (content.includes("from 'next'") || content.includes('from "next"')) return 'Next.js';
		if (content.includes("from 'vue'") || content.includes('from "vue"')) return 'Vue';
		if (content.includes('def ') && content.includes(':')) return 'Python';
		if (content.includes('namespace ') && content.includes('class ')) return '.NET';
		return undefined;
	}

	private async scanConfigFiles(): Promise<ConfigFile[]> {
		const configFiles: ConfigFile[] = [];
		const configNames = [
			'package.json',
			'tsconfig.json',
			'.babelrc',
			'babel.config.js',
			'.eslintrc.json',
			'eslint.config.js',
			'.prettierrc',
			'prettier.config.js',
			'jest.config.js',
			'webpack.config.js',
			'vite.config.ts',
			'next.config.js',
			'requirements.txt',
			'Pipfile',
			'Gemfile',
			'go.mod',
			'Cargo.toml',
			'.csproj',
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
					const content = fs.readFileSync(filePath, 'utf8');
					configFiles.push({
						path: configName,
						type: 'other',
						content: { raw: content.slice(0, 500) },
					});
				}
			}
		}

		return configFiles;
	}

	private configType(filename: string): ConfigFile['type'] {
		if (filename === 'package.json') return 'package';
		if (filename.startsWith('tsconfig')) return 'tsconfig';
		if (filename.includes('babel')) return 'babel';
		if (filename.includes('eslint')) return 'eslint';
		if (filename.includes('prettier')) return 'prettier';
		if (filename.includes('jest')) return 'jest';
		if (filename.includes('webpack')) return 'webpack';
		if (filename.includes('vite')) return 'vite';
		if (filename.includes('next')) return 'next';
		if (filename.includes('requirements') || filename.includes('Pipfile')) return 'other';
		return 'other';
	}

	private async extractDependencies(): Promise<Dependency[]> {
		const deps: Dependency[] = [];

		const packageJsonPath = path.join(this.projectPath, 'package.json');
		if (fs.existsSync(packageJsonPath)) {
			const package_ = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
			for (const [name, version] of Object.entries(package_.dependencies || {})) {
				deps.push({ name, version: String(version), type: 'production' });
			}

			for (const [name, version] of Object.entries(package_.devDependencies || {})) {
				deps.push({ name, version: String(version), type: 'development' });
			}
		}

		const requestPath = path.join(this.projectPath, 'requirements.txt');
		if (fs.existsSync(requestPath)) {
			const content = fs.readFileSync(requestPath, 'utf8');
			for (const line of content.split('\n')) {
				const match = /^([\w-]+)([=<>!]+)(.+)$/.exec(line);
				if (match) {
					deps.push({ name: match[1], version: match[3], type: 'production' });
				}
			}
		}

		return deps;
	}

	private async detectEnvironment(): Promise<EnvironmentInfo> {
		const platform =
			process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'mac' : 'linux';

		let packageManager: 'npm' | 'yarn' | 'pnpm' = 'npm';
		if (fs.existsSync(path.join(this.projectPath, 'pnpm-lock.yaml'))) packageManager = 'pnpm';
		else if (fs.existsSync(path.join(this.projectPath, 'yarn.lock'))) packageManager = 'yarn';

		return {
			platform,
			nodeVersion: process.version,
			packageManager,
			shell: process.env.SHELL || process.env.COMSPEC || 'unknown',
		};
	}

	private async extractSessionData(): Promise<SessionData | undefined> {
		const conversations: Conversation[] = [];

		const vscodeDir = this.getVSCodeDir();
		if (!vscodeDir) return undefined;

		const copilotDir = path.join(vscodeDir, 'copilot');
		const sessionsDir = path.join(copilotDir, 'sessions');

		if (fs.existsSync(sessionsDir)) {
			try {
				const files = fs
					.readdirSync(sessionsDir)
					.filter((f) => f.endsWith('.json'))
					.slice(0, 20);
				for (const file of files) {
					try {
						const content = JSON.parse(fs.readFileSync(path.join(sessionsDir, file), 'utf8'));
						if (content.messages && Array.isArray(content.messages)) {
							conversations.push({
								id: file.replace('.json', ''),
								timestamp: content.timestamp || new Date().toISOString(),
								messages: content.messages.slice(0, 100),
							});
						}
					} catch {}
				}
			} catch {}
		}

		return {
			conversations,
			tools: this.extractToolUsage(conversations),
		};
	}

	private getVSCodeDir(): string | undefined {
		const home = process.env.HOME || process.env.USERPROFILE || '';
		const directories = {
			windows: path.join(process.env.APPDATA || '', 'Code', 'User'),
			linux: path.join(home, '.config', 'Code', 'User'),
			mac: path.join(home, 'Library', 'Application Support', 'Code', 'User'),
		};

		const platform =
			process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'mac' : 'linux';

		return directories[platform] || undefined;
	}

	private extractToolUsage(
		conversations: Conversation[]
	): Array<{ name: string; count: number; lastUsed: string }> {
		const tools = new Map<string, { count: number; lastUsed: string }>();

		for (const conv of conversations) {
			for (const message of conv.messages) {
				if (message.role === 'assistant' && typeof message.content === 'string') {
					const copilotSuggestions = message.content.match(/copilot:[\s\S]*?(?=\n\n|$)/gi) || [];
					for (const suggestion of copilotSuggestions) {
						const existing = tools.get('suggestion') || {
							count: 0,
							lastUsed: conv.timestamp,
						};
						tools.set('suggestion', {
							count: existing.count + 1,
							lastUsed: conv.timestamp,
						});
					}
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

		const languages = [...new Set(context.sourceFiles.map((f) => f.language))];
		if (languages.length > 3) {
			recs.push(`Multi-language project detected: ${languages.join(', ')}`);
		}

		const hasFramework = context.sourceFiles.some((f) => f.framework);
		if (!hasFramework) {
			recs.push('No common framework detected - verify compatibility');
		}

		return recs;
	}
}

export async function analyzeWithCopilot(projectPath: string): Promise<AnalyzerResult> {
	const analyzer = new CopilotAnalyzer(projectPath);
	return analyzer.analyze();
}
