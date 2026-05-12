import * as fs from 'node:fs';
import * as path from 'node:path';
import { type ProjectContext, type MigrationResult } from '../types/index.js';
import { BaseExporter } from './index.js';

export class OpenCodeExporter extends BaseExporter {
	getId(): string {
		return 'opencode';
	}

	getName(): string {
		return 'OpenCode';
	}

	protected getConfigDir(): string {
		return '.opencode';
	}

	async export(context: ProjectContext): Promise<MigrationResult> {
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

			this.writeJson(path.join(this.getWorkspaceDir(), 'config.json'), this.buildConfig(context));

			this.writeJson(path.join(this.getWorkspaceDir(), 'dependencies.json'), context.dependencies);

			this.writeJson(
				path.join(this.getWorkspaceDir(), 'source-map.json'),
				this.buildSourceMap(context)
			);

			this.writeJson(path.join(this.getWorkspaceDir(), 'sessions', 'index.json'), {
				migratedAt: new Date().toISOString(),
				conversations: [],
				tools: [],
				memory: { learnedPatterns: [], customRules: [] },
			});

			result.success = true;
			result.filesCreated = [
				'.opencode/config.json',
				'.opencode/dependencies.json',
				'.opencode/source-map.json',
				'.opencode/sessions/index.json',
			];
		} catch (error) {
			result.errors.push(error instanceof Error ? error.message : String(error));
		}

		return result;
	}

	private buildConfig(context: ProjectContext) {
		return {
			version: '1.0.0',
			migratedAt: new Date().toISOString(),
			source: context.environment,
			project: {
				path: context.projectPath,
				files: context.sourceFiles.length,
				languages: [...new Set(context.sourceFiles.map((f) => f.language))],
				frameworks: [
					...new Set(context.sourceFiles.filter((f) => f.framework).map((f) => f.framework!)),
				],
				totalLines: context.sourceFiles.reduce((sum, f) => sum + f.lines, 0),
			},
			dependencies: {
				count: context.dependencies.length,
				production: context.dependencies.filter((d) => d.type === 'production').length,
				development: context.dependencies.filter((d) => d.type === 'development').length,
			},
			configFiles: context.configFiles.map((c) => ({
				name: c.path,
				type: c.type,
			})),
		};
	}

	private buildSourceMap(context: ProjectContext) {
		return context.sourceFiles.map((f) => ({
			path: f.path,
			language: f.language,
			framework: f.framework,
			lines: f.lines,
			imports: f.imports,
			exports: f.exports,
		}));
	}
}
