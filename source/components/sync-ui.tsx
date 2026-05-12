import React from 'react';
import { Text, Box } from 'ink';

type SyncStatusProperties = {
	readonly source: string;
	readonly target: string;
	readonly progress: number;
	readonly currentStep: string;
	readonly filesProcessed?: number;
	readonly totalFiles?: number;
};

export function SyncStatus({
	source,
	target,
	progress,
	currentStep,
	filesProcessed,
	totalFiles,
}: SyncStatusProperties) {
	const percentage = Math.round(progress * 100);
	const filled = Math.round(progress * 20);
	const empty = 20 - filled;

	return (
		<Box flexDirection="column" padding={1}>
			<Box>
				<Text bold color="cyan">
					🔄 OCSYNC - Agent Migration Tool
				</Text>
			</Box>
			<Box marginTop={1}>
				<Text>Source: </Text>
				<Text color="green">{source}</Text>
				<Text> → Target: </Text>
				<Text color="blue">OpenCode</Text>
			</Box>
			<Box marginTop={1}>
				<Text>Step: </Text>
				<Text color="yellow">{currentStep}</Text>
			</Box>
			<Box marginTop={1}>
				<Text>Progress: [</Text>
				<Text color="green">{'\u25A0'.repeat(filled)}</Text>
				<Text>{'\u25A1'.repeat(empty)}</Text>
				<Text>] {percentage}%</Text>
			</Box>
			{filesProcessed !== undefined && totalFiles !== undefined && (
				<Box marginTop={1}>
					<Text color="cyan">
						Files: {filesProcessed}/{totalFiles}
					</Text>
				</Box>
			)}
		</Box>
	);
}

type ResultDisplayProperties = {
	readonly success: boolean;
	readonly filesCreated: string[];
	readonly filesModified: string[];
	readonly errors: string[];
	readonly warnings: string[];
};

export function ResultDisplay({
	success,
	filesCreated,
	filesModified,
	errors,
	warnings,
}: ResultDisplayProperties) {
	return (
		<Box flexDirection="column" padding={1}>
			<Box>
				{success ? (
					<Text bold color="green">
						✅ Migration completed successfully!
					</Text>
				) : (
					<Text bold color="red">
						❌ Migration completed with errors
					</Text>
				)}
			</Box>

			{filesCreated.length > 0 && (
				<Box flexDirection="column" marginTop={1}>
					<Text bold>Created Files:</Text>
					{filesCreated.map((file, i) => (
						<Text key={i} color="cyan">
							{' '}
							+ {file}
						</Text>
					))}
				</Box>
			)}

			{warnings.length > 0 && (
				<Box flexDirection="column" marginTop={1}>
					<Text bold color="yellow">
						Warnings:
					</Text>
					{warnings.map((warning, i) => (
						<Text key={i} color="yellow">
							{' '}
							⚠ {warning}
						</Text>
					))}
				</Box>
			)}

			{errors.length > 0 && (
				<Box flexDirection="column" marginTop={1}>
					<Text bold color="red">
						Errors:
					</Text>
					{errors.map((error, i) => (
						<Text key={i} color="red">
							{' '}
							✗ {error}
						</Text>
					))}
				</Box>
			)}
		</Box>
	);
}

type AgentSelectorProperties = {
	readonly onSelect: (agent: string) => void;
	readonly detected?: string[];
};

export function AgentSelector({ onSelect, detected = [] }: AgentSelectorProperties) {
	const agents = ['claude-code', 'copilot', 'gemini'];

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="cyan">
				Select Source Agent:
			</Text>
			{agents.map((agent, i) => (
				<Box key={agent} marginTop={1}>
					<Text color="white">
						{' '}
						[{i + 1}] {agent}
					</Text>
					{detected.includes(agent) && <Text color="yellow"> (detected)</Text>}
				</Box>
			))}
			<Box marginTop={1}>
				<Text dimColor>Run with --source flag to select agent</Text>
			</Box>
			<Box marginTop={1}>
				<Text>Examples:</Text>
				<Text color="green"> ocsync --source=claude-code --path=./project</Text>
				<Text color="green"> ocsync --source=copilot --path=./project</Text>
				<Text color="green"> ocsync --source=gemini --path=./project</Text>
			</Box>
		</Box>
	);
}
