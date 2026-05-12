import * as fs from 'node:fs';
import * as path from 'node:path';
import {type ProjectContext, type MigrationResult} from '../types/index.js';
import {BaseExporter, ExporterOptions} from './index.js';

export class VSCodeExporter extends BaseExporter {
	getId(): string {
		return 'vscode';
	}

	getName(): string {
		return 'Visual Studio Code';
	}

	protected getConfigDir(): string {
		return '.vscode';
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
			this.ensureDir(path.join(this.getWorkspaceDir(), 'workspace-state'));
			this.ensureDir(path.join(this.getWorkspaceDir(), 'history'));

			this.writeJson(
				path.join(this.getWorkspaceDir(), 'workspace-state.json'),
				this.buildWorkspaceState(context),
			);

			this.writeJson(
				path.join(this.getWorkspaceDir(), 'file-mappings.json'),
				this.buildSourceMap(context),
			);

			result.success = true;
			result.filesCreated = [
				'.vscode/workspace-state.json',
				'.vscode/file-mappings.json',
			];
		} catch (error) {
			result.errors.push(
				error instanceof Error ? error.message : String(error),
			);
		}

		return result;
	}

	private buildWorkspaceState(context: ProjectContext) {
		return {
			version: '1.0.0',
			migratedAt: new Date().toISOString(),
			platform: context.environment.platform,
			languages: [...new Set(context.sourceFiles.map((f) => f.language))],
			files: context.sourceFiles.length,
			lastModified: new Date().toISOString(),
		};
	}

	private buildSourceMap(context: ProjectContext) {
		return context.sourceFiles.map((f) => ({
			path: f.path,
			language: f.language,
			framework: f.framework,
		}));
	}
}

export class JetBrainsExporter extends BaseExporter {
	getId(): string {
		return 'jetbrains';
	}

	getName(): string {
		return 'JetBrains IDEs';
	}

	protected getConfigDir(): string {
		return '.jetbrains';
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
			this.ensureDir(path.join(this.getWorkspaceDir(), 'codestyles'));
			this.ensureDir(path.join(this.getWorkspaceDir(), 'workspace'));

			this.writeJson(
				path.join(this.getWorkspaceDir(), 'workspace', 'project-state.json'),
				this.buildProjectState(context),
			);

			this.writeJson(
				path.join(this.getWorkspaceDir(), 'file-index.json'),
				this.buildSourceMap(context),
			);

			result.success = true;
			result.filesCreated = [
				'.jetbrains/workspace/project-state.json',
				'.jetbrains/file-index.json',
			];
		} catch (error) {
			result.errors.push(
				error instanceof Error ? error.message : String(error),
			);
		}

		return result;
	}

	private buildProjectState(context: ProjectContext) {
		return {
			version: '1.0.0',
			migratedAt: new Date().toISOString(),
			project: {
				name: path.basename(context.projectPath),
				path: context.projectPath,
				languages: [...new Set(context.sourceFiles.map((f) => f.language))],
				frameworks: [
					...new Set(
						context.sourceFiles
							.filter((f) => f.framework)
							.map((f) => f.framework!),
					),
				],
			},
		};
	}

	private buildSourceMap(context: ProjectContext) {
		return context.sourceFiles.map((f) => ({
			path: f.path,
			language: f.language,
		}));
	}
}

export class CursorExporter extends BaseExporter {
	getId(): string {
		return 'cursor';
	}

	getName(): string {
		return 'Cursor IDE';
	}

	protected getConfigDir(): string {
		return '.cursor';
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
			this.ensureDir(path.join(this.getWorkspaceDir(), 'mcp'));

			this.writeJson(
				path.join(this.getWorkspaceDir(), 'config.json'),
				this.buildConfig(context),
			);

			this.writeJson(
				path.join(this.getWorkspaceDir(), 'sessions', 'index.json'),
				{migratedAt: new Date().toISOString()},
			);

			result.success = true;
			result.filesCreated = [
				'.cursor/config.json',
				'.cursor/sessions/index.json',
			];
		} catch (error) {
			result.errors.push(
				error instanceof Error ? error.message : String(error),
			);
		}

		return result;
	}

	private buildConfig(context: ProjectContext) {
		return {
			version: '1.0.0',
			migratedAt: new Date().toISOString(),
			languages: [...new Set(context.sourceFiles.map((f) => f.language))],
			frameworks: [
				...new Set(
					context.sourceFiles
						.filter((f) => f.framework)
						.map((f) => f.framework!),
				),
			],
		};
	}
}
