import React, {useState, useEffect} from 'react';
import {Text, Box} from 'ink';
import {
	createAnalyzer,
	supportedSources,
	supportedTargets,
} from './analyzers/index.js';
import {createExporter} from './exporters/index.js';
import {
	syncService,
	syncProject,
	watchProject,
	getActiveSessions,
	getHistory,
	type SyncResult,
} from './commands/sync-service.js';
import {type WatchOptions} from './types/index.js';

type AppProperties = {
	readonly sourceAgent?: string;
	readonly targetIDE?: string;
	readonly projectPath?: string;
	readonly overwrite?: boolean;
	readonly watchMode?: boolean;
	readonly showSession?: boolean;
	readonly showHistory?: boolean;
	readonly listSources?: boolean;
	readonly listTargets?: boolean;
};

export default function App({
	sourceAgent,
	targetIDE,
	projectPath: projectPathProperty,
	overwrite,
	watchMode,
	showSession,
	showHistory,
	listSources,
	listTargets,
}: AppProperties) {
	const [step, setStep] = useState<
		'idle' | 'syncing' | 'watching' | 'complete' | 'info'
	>('idle');
	const [progress, setProgress] = useState(0);
	const [currentStep, setCurrentStep] = useState('');
	const [result, setResult] = useState<SyncResult | undefined>(undefined);
	const [watchId, setWatchId] = useState<string | undefined>(undefined);
	const [sessions, setSessions] = useState<any[]>([]);
	const [history, setHistory] = useState<SyncResult[]>([]);
	const [error, setError] = useState<string | undefined>(undefined);
	const [projectPath] = useState(() => projectPathProperty || process.cwd());

	useEffect(() => {
		if (listSources) {
			setStep('info');
			return;
		}

		if (listTargets) {
			setStep('info');
			return;
		}

		if (showSession) {
			setSessions(getActiveSessions());
			setStep('info');
		} else if (showHistory) {
			setHistory(getHistory());
			setStep('info');
		} else if (sourceAgent && targetIDE && projectPath) {
			if (watchMode) {
				startWatching();
			} else {
				runSync();
			}
		}
	}, [
		sourceAgent,
		targetIDE,
		projectPath,
		watchMode,
		showSession,
		showHistory,
		listSources,
		listTargets,
	]);

	async function runSync() {
		try {
			setStep('syncing');
			setCurrentStep('Analyzing project...');
			setProgress(0.1);

			const analyzer = createAnalyzer(sourceAgent!, projectPath);
			const analysisResult = await analyzer.analyze();

			setProgress(0.4);
			setCurrentStep(`Exporting to ${targetIDE}...`);

			const exporterOptions = {
				overwrite: overwrite ?? false,
				preserveHistory: true,
				validateResults: true,
			};

			const exporter = createExporter(targetIDE!, projectPath, exporterOptions);
			const migrationResult = await exporter.export(
				analysisResult.projectContext,
				analysisResult.sessionData,
				{overwrite},
			);

			setProgress(0.8);
			setCurrentStep('Finalizing...');

			const syncResult: SyncResult = {
				success: migrationResult.success,
				analysis: analysisResult,
				migration: migrationResult,
				duration: Date.now(),
			};

			setProgress(1);
			setResult(syncResult);
			setStep('complete');

			if (!migrationResult.success) {
				setError(migrationResult.errors?.[0] || 'Sync failed');
			}
		} catch (error_) {
			setError(error_ instanceof Error ? error_.message : String(error_));
			setResult({
				success: false,
				analysis: undefined,
				migration: undefined,
				duration: 0,
			});
			setStep('complete');
		}
	}

	async function startWatching() {
		try {
			setStep('watching');
			setCurrentStep('Starting file watcher...');
			setProgress(0.3);

			const watchOptions: WatchOptions = {
				persistent: true,
				ignoreInitial: true,
				followSymlinks: false,
			};

			const id = await watchProject(projectPath, sourceAgent!, watchOptions);
			setWatchId(id);
			setProgress(1);
			setCurrentStep('Watching for changes...');
		} catch (error_) {
			setError(error_ instanceof Error ? error_.message : String(error_));
			setStep('complete');
		}
	}

	function renderProgressBar(progressValue: number): string {
		const filled = Math.round(progressValue * 20);
		return '█'.repeat(filled) + '░'.repeat(20 - filled);
	}

	if (step === 'info') {
		if (listSources) {
			return (
				<Box flexDirection="column" padding={1}>
					<Text bold color="cyan">
						Supported Source Agents:
					</Text>
					{supportedSources.map((source, i) => (
						<Box key={i} marginTop={1}>
							<Text color="green">{source.id.padEnd(15)}</Text>
							<Text color="white">- {source.name}</Text>
						</Box>
					))}
				</Box>
			);
		}

		if (listTargets) {
			return (
				<Box flexDirection="column" padding={1}>
					<Text bold color="cyan">
						Supported Target IDEs:
					</Text>
					{supportedTargets.map((target, i) => (
						<Box key={i} marginTop={1}>
							<Text color="green">{target.id.padEnd(15)}</Text>
							<Text color="white">- {target.name}</Text>
						</Box>
					))}
				</Box>
			);
		}

		if (showSession) {
			return (
				<Box flexDirection="column" padding={1}>
					<Text bold color="cyan">
						Active Sync Sessions
					</Text>
					{sessions.length === 0 ? (
						<Text color="yellow">No active sessions</Text>
					) : (
						sessions.map((session, i) => (
							<Box key={i} flexDirection="column" marginTop={1}>
								<Text>ID: {session.id}</Text>
								<Text>Started: {session.startedAt}</Text>
								<Text>Changes: {session.changesCount}</Text>
							</Box>
						))
					)}
				</Box>
			);
		}

		if (showHistory) {
			return (
				<Box flexDirection="column" padding={1}>
					<Text bold color="cyan">
						Sync History
					</Text>
					{history.length === 0 ? (
						<Text color="yellow">No sync history</Text>
					) : (
						history.map((item, i) => (
							<Box key={i} flexDirection="column" marginTop={1}>
								<Text color={item.success ? 'green' : 'red'}>
									{item.success ? '✓' : '✗'}{' '}
									{item.analysis?.projectContext.sourceFiles.length || 0} files
									in {item.duration}ms
								</Text>
							</Box>
						))
					)}
				</Box>
			);
		}
	}

	if (step === 'syncing' || step === 'watching') {
		return (
			<Box flexDirection="column" padding={1}>
				<Box>
					<Text bold color="cyan">
						AGENT-SYNC
					</Text>
					<Text color="white"> - Universal Agent Sync Tool</Text>
				</Box>
				<Box marginTop={1}>
					<Text>From: </Text>
					<Text color="green">{sourceAgent}</Text>
					<Text> → To: </Text>
					<Text color="blue">{targetIDE}</Text>
				</Box>
				<Box marginTop={1}>
					<Text>Project: </Text>
					<Text color="blue">{projectPath}</Text>
				</Box>
				<Box marginTop={1}>
					<Text>Step: </Text>
					<Text color="yellow">{currentStep}</Text>
				</Box>
				<Box marginTop={1}>
					<Text>Progress: [</Text>
					<Text color="green">{renderProgressBar(progress)}</Text>
					<Text>] {Math.round(progress * 100)}%</Text>
				</Box>
				{step === 'watching' && (
					<Box marginTop={1}>
						<Text color="magenta">Watching for file changes...</Text>
						<Text dimColor>Press Ctrl+C to stop</Text>
					</Box>
				)}
			</Box>
		);
	}

	if (step === 'complete' && result) {
		return (
			<Box flexDirection="column" padding={1}>
				<Box>
					{result.success ? (
						<Text bold color="green">
							✓ Sync completed successfully
						</Text>
					) : (
						<Text bold color="red">
							✗ Sync completed with errors
						</Text>
					)}
				</Box>
				{result.analysis && (
					<Box marginTop={1}>
						<Text>
							From: {sourceAgent} → To: {targetIDE}
						</Text>
						<Text>
							Files: {result.analysis.projectContext.sourceFiles.length}
						</Text>
						<Text>
							Languages:{' '}
							{[
								...new Set(
									result.analysis.projectContext.sourceFiles.map(
										(f) => f.language,
									),
								),
							].join(', ')}
						</Text>
						<Text>Duration: {result.duration}ms</Text>
					</Box>
				)}
				{result.migration?.filesCreated &&
					result.migration.filesCreated.length > 0 && (
						<Box marginTop={1} flexDirection="column">
							<Text bold>Created:</Text>
							{result.migration.filesCreated.map((file, i) => (
								<Text key={i} color="cyan">
									{' '}
									+ {file}
								</Text>
							))}
						</Box>
					)}
				{error && (
					<Box marginTop={1}>
						<Text color="red">Error: {error}</Text>
					</Box>
				)}
			</Box>
		);
	}

	return (
		<Box flexDirection="column" padding={1}>
			<Text>Run agent-sync --help for usage information</Text>
		</Box>
	);
}
