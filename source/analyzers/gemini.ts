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

export class GeminiAnalyzer {
	private readonly projectPath: string;

	constructor(projectPath: string) {
		this.projectPath = projectPath;
	}

	async analyze(): Promise<AnalyzerResult> {
		const projectContext = await this.extractProjectContext();
		const sessionData = await this.extractSessionData();

		return {
			source: 'gemini',
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
			'.kt',
			'.swift',
			'.go',
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
								'.gemini',
								'.idea',
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
			/import\s+(?:[\w.]+\.)?(\w+)\s*;?/g,
			/from\s+['"]([^'"]+)['"]/g,
			/require\s*\(['"]([^'"]+)['"]\)/g,
			/use\s+([\w:]+)[;\s]/g,
		];

		for (const pattern of patterns) {
			let match;
			while ((match = pattern.exec(content)) !== null) {
				imports.push(match[1] || match[0]);
			}
		}

		return [...new Set(imports)];
	}

	private extractExports(content: string): string[] {
		const exports: string[] = [];
		const patterns = [
			/(?:export|public)\s+(?:default\s+)?(?:class|function|const|interface|enum|type)\s+(\w+)/g,
			/module\.exports\s*[=:]\s*(\w+)/g,
			/__all__\s*=\s*\[([^\]]+)]/g,
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
			'.kt': 'Kotlin',
			'.swift': 'Swift',
			'.go': 'Go',
		};
		return langMap[extension] || 'Unknown';
	}

	private detectFramework(
		filename: string,
		content: string,
	): string | undefined {
		if (
			content.includes('import androidx') ||
			content.includes('AndroidJetpack')
		)
			return 'Android';
		if (content.includes('import SwiftUI') || content.includes('import UIKit'))
			return 'iOS/SwiftUI';
		if (
			content.includes('from flask import') ||
			content.includes('from django')
		)
			return 'Python Web';
		if (content.includes('func init') && content.includes('struct'))
			return 'Swift';
		if (content.includes('fun main') || content.includes('val '))
			return 'Kotlin';
		return undefined;
	}

	private async scanConfigFiles(): Promise<ConfigFile[]> {
		const configFiles: ConfigFile[] = [];
		const configNames = [
			'package.json',
			'tsconfig.json',
			'.babelrc',
			'babel.config.js',
			'requirements.txt',
			'Pipfile',
			'pyproject.toml',
			'setup.py',
			'go.mod',
			'go.sum',
			'Cargo.toml',
			'Gemfile',
			'Podfile',
			'build.gradle',
			'settings.gradle',
			'gradle.properties',
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
						content: {raw: content.slice(0, 500)},
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
		if (
			filename.includes('requirements') ||
			filename.includes('Pipfile') ||
			filename === 'setup.py'
		)
			return 'other';
		if (filename.includes('go.mod') || filename.includes('go.sum'))
			return 'other';
		if (
			filename.includes('Cargo') ||
			filename.includes('Gemfile') ||
			filename.includes('Podfile')
		)
			return 'other';
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

		const requestPath = path.join(this.projectPath, 'requirements.txt');
		if (fs.existsSync(requestPath)) {
			const content = fs.readFileSync(requestPath, 'utf8');
			for (const line of content.split('\n')) {
				const match = /^([\w-]+)([=<>!]+)(.+)$/.exec(line);
				if (match) {
					deps.push({name: match[1], version: match[3], type: 'production'});
				}
			}
		}

		const goModulePath = path.join(this.projectPath, 'go.mod');
		if (fs.existsSync(goModulePath)) {
			const content = fs.readFileSync(goModulePath, 'utf8');
			const requireMatch = /require\s*\(([\s\S]*?)\)/.exec(content);
			if (requireMatch) {
				for (const line of requireMatch[1].split('\n')) {
					const m = /^\s*(\S+)\s+v?(\S+)/.exec(line);
					if (m) {
						deps.push({name: m[1], version: m[2], type: 'production'});
					}
				}
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

		const geminiDir = this.getGeminiDir();
		if (!geminiDir || !fs.existsSync(geminiDir)) return undefined;

		const sessionsDir = path.join(geminiDir, 'sessions');
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
						if (content.history && Array.isArray(content.history)) {
							conversations.push({
								id: file.replace('.json', ''),
								timestamp: content.timestamp || new Date().toISOString(),
								messages: content.history.slice(0, 100),
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

	private getGeminiDir(): string | undefined {
		const home = process.env.HOME || process.env.USERPROFILE || '';
		const directories = {
			windows: path.join(process.env.LOCALAPPDATA || '', 'Google', 'Gemini'),
			linux: path.join(home, '.config', 'google-gemini'),
			mac: path.join(
				home,
				'Library',
				'Application Support',
				'Google',
				'Gemini',
			),
		};

		const platform =
			process.platform === 'win32'
				? 'windows'
				: process.platform === 'darwin'
					? 'mac'
					: 'linux';

		return directories[platform] || undefined;
	}

	private extractToolUsage(
		conversations: Conversation[],
	): Array<{name: string; count: number; lastUsed: string}> {
		const tools = new Map<string, {count: number; lastUsed: string}>();

		for (const conv of conversations) {
			for (const message of conv.messages) {
				const geminiToolMatches = message.content?.match(/@[a-zA-Z]+/g) || [];
				for (const match of geminiToolMatches) {
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

		if (context.sourceFiles.length === 0) {
			recs.push('No source files detected - ensure project path is correct');
		}

		const frameworks = [
			...new Set(
				context.sourceFiles.filter((f) => f.framework).map((f) => f.framework!),
			),
		];
		if (frameworks.length > 0) {
			recs.push(`Frameworks detected: ${frameworks.join(', ')}`);
		}

		return recs;
	}
}

export async function analyzeWithGemini(
	projectPath: string,
): Promise<AnalyzerResult> {
	const analyzer = new GeminiAnalyzer(projectPath);
	return analyzer.analyze();
}
