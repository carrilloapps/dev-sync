import * as fs from 'node:fs';
import * as path from 'node:path';
import chokidar, {type FSWatcher} from 'chokidar';
import {createAnalyzer} from '../analyzers/index.js';
import {createExporter} from '../exporters/index.js';
import {
	type AnalyzerResult,
	type MigrationResult,
	type WatchOptions,
} from '../types/index.js';

export type SyncResult = {
	success: boolean;
	analysis: AnalyzerResult | undefined;
	migration: MigrationResult | undefined;
	duration: number;
};

export type SyncOptions = {
	sourceAgent: string;
	targetAgent: string;
	projectPath: string;
	overwrite?: boolean;
	preserveHistory?: boolean;
	watch?: boolean;
	excludePatterns?: string[];
	includePatterns?: string[];
};

export type SessionInfo = {
	id: string;
	startedAt: string;
	lastSync: string;
	filesTracked: number;
	changesCount: number;
};

export class SyncService {
	private readonly watchers = new Map<string, FSWatcher>();
	private readonly syncHistory: SyncResult[] = [];
	private readonly sessions = new Map<string, SessionInfo>();

	async sync(options: SyncOptions): Promise<SyncResult> {
		const startTime = Date.now();
		let analysis: AnalyzerResult | undefined;
		let migration: MigrationResult | undefined;

		try {
			console.log(`Analyzing project from ${options.sourceAgent}...`);
			const analyzer = createAnalyzer(options.sourceAgent, options.projectPath);
			analysis = await analyzer.analyze();

			console.log(
				`Project analyzed: ${analysis.projectContext.sourceFiles.length} files found`,
			);
			console.log(`Migrating to ${options.targetAgent} format...`);

			const exporter = createExporter(
				options.targetAgent,
				options.projectPath,
				{
					overwrite: options.overwrite ?? false,
					preserveHistory: options.preserveHistory ?? true,
					validateResults: true,
				},
			);

			migration = await exporter.export(
				analysis.projectContext,
				analysis.sessionData,
			);

			const result: SyncResult = {
				success: migration.success,
				analysis,
				migration,
				duration: Date.now() - startTime,
			};

			this.syncHistory.push(result);
			return result;
		} catch {
			return {
				success: false,
				analysis,
				migration,
				duration: Date.now() - startTime,
			};
		}
	}

	async watch(
		projectPath: string,
		sourceAgent: string,
		options: WatchOptions = {
			persistent: true,
			ignoreInitial: true,
			followSymlinks: false,
		},
	): Promise<string> {
		const watchId = `watch_${Date.now()}`;
		const excludePatterns = options.ignored || [
			'**/node_modules/**',
			'**/.git/**',
			'**/dist/**',
			'**/build/**',
			'**/.opencode/**',
			'**/.vscode/**',
			'**/.cursor/**',
			'**/.jetbrains/**',
		];

		const watcher = chokidar.watch(projectPath, {
			persistent: options.persistent,
			ignoreInitial: options.ignoreInitial,
			followSymlinks: options.followSymlinks,
			depth: options.depth ?? 10,
			ignored: excludePatterns,
			awaitWriteFinish: options.awaitWriteFinish ?? {
				stabilityThreshold: 300,
				pollInterval: 100,
			},
		});

		watcher.on('add', (filePath) => {
			this.handleFileChange('add', filePath, watchId);
		});
		watcher.on('change', (filePath) => {
			this.handleFileChange('change', filePath, watchId);
		});
		watcher.on('unlink', (filePath) => {
			this.handleFileChange('unlink', filePath, watchId);
		});
		watcher.on('error', (error) => {
			console.error(`Watch error: ${error}`);
		});

		this.watchers.set(watchId, watcher);

		this.sessions.set(watchId, {
			id: watchId,
			startedAt: new Date().toISOString(),
			lastSync: new Date().toISOString(),
			filesTracked: 0,
			changesCount: 0,
		});

		console.log(`Watching ${projectPath} for changes...`);
		return watchId;
	}

	async stopWatch(watchId: string): Promise<void> {
		const watcher = this.watchers.get(watchId);
		if (watcher) {
			await watcher.close();
			this.watchers.delete(watchId);
			this.sessions.delete(watchId);
			console.log(`Stopped watching: ${watchId}`);
		}
	}

	getActiveSessions(): SessionInfo[] {
		return [...this.sessions.values()];
	}

	getHistory(): SyncResult[] {
		return [...this.syncHistory];
	}

	private handleFileChange(
		event: string,
		filePath: string,
		watchId: string,
	): void {
		const session = this.sessions.get(watchId);
		if (session) {
			session.lastSync = new Date().toISOString();
			session.changesCount++;
			const watched = this.watchers.get(watchId)?.getWatched();
			session.filesTracked = Array.isArray(watched) ? watched.length : 0;
		}

		const relativePath = path.relative(process.cwd(), filePath);
		console.log(`[${event}] ${relativePath}`);
	}
}

export const syncService = new SyncService();

export async function syncProject(options: SyncOptions): Promise<SyncResult> {
	return syncService.sync(options);
}

export async function watchProject(
	projectPath: string,
	sourceAgent: string,
	options?: WatchOptions,
): Promise<string> {
	return syncService.watch(
		projectPath,
		sourceAgent,
		options ?? {persistent: true, ignoreInitial: true, followSymlinks: false},
	);
}

export async function stopWatching(watchId: string): Promise<void> {
	return syncService.stopWatch(watchId);
}

export function getActiveSessions(): SessionInfo[] {
	return syncService.getActiveSessions();
}

export function getHistory(): SyncResult[] {
	return syncService.getHistory();
}
