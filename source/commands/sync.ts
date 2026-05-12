import * as fs from 'node:fs';
import * as path from 'node:path';
import { sync as doSync, clean as doClean } from '../config/sync.js';
import { resolveConfig } from '../config/loader.js';
import { TOOL_CAPABILITIES, TOOL_DIRS } from '../config/index.js';

export type SyncOptions = {
	json?: boolean;
	cwd?: string;
	dryRun?: boolean;
	tool?: string;
	profile?: string;
	copyMode?: 'copy' | 'link';
	central?: string;
	global?: boolean;
	from?: string;
};

export async function syncCommand(options: SyncOptions): Promise<void> {
	const cwd = options.cwd || process.cwd();

	try {
		let result;

		if (options.central) {
			result = await syncCentral(options.central, cwd, options);
		} else if (options.global) {
			result = await syncGlobal(cwd, options);
		} else {
			result = await doSync({
				dryRun: options.dryRun,
				tool: options.tool,
				profile: options.profile,
				copyMode: options.copyMode,
				json: options.json,
				cwd,
			});
		}

		if (options.json) {
			console.log(JSON.stringify(result, null, 2));
		} else {
			if (options.dryRun) {
				console.log('Dry run - no changes made:');
			}

			if (result.added.length > 0) {
				console.log(`\nAdded (${result.added.length}):`);
				for (const file of result.added.slice(0, 10)) {
					console.log(`  + ${file}`);
				}

				if (result.added.length > 10) {
					console.log(`  ... and ${result.added.length - 10} more`);
				}
			}

			if (result.changed.length > 0) {
				console.log(`\nChanged (${result.changed.length}):`);
				for (const file of result.changed.slice(0, 10)) {
					console.log(`  ~ ${file}`);
				}

				if (result.changed.length > 10) {
					console.log(`  ... and ${result.changed.length - 10} more`);
				}
			}

			if (result.removed.length > 0) {
				console.log(`\nRemoved (${result.removed.length}):`);
				for (const file of result.removed.slice(0, 10)) {
					console.log(`  - ${file}`);
				}

				if (result.removed.length > 10) {
					console.log(`  ... and ${result.removed.length - 10} more`);
				}
			}

			if (result.errors.length > 0) {
				console.log(`\nErrors (${result.errors.length}):`);
				for (const error of result.errors) {
					console.log(`  ! ${error}`);
				}
			}

			if (
				result.added.length === 0 &&
				result.changed.length === 0 &&
				result.removed.length === 0 &&
				result.errors.length === 0
			) {
				console.log('No changes needed.');
			}

			console.log(`\nCompleted in ${result.duration}ms`);
		}
	} catch (error) {
		if (options.json) {
			console.log(JSON.stringify({ error: String(error) }, null, 2));
		} else {
			console.error(`Sync failed: ${error}`);
		}

		process.exit(1);
	}
}

async function syncCentral(
	centralAgent: string,
	cwd: string,
	options: SyncOptions
): Promise<{
	added: string[];
	changed: string[];
	removed: string[];
	errors: string[];
	duration: number;
}> {
	const start = Date.now();
	const result = {
		added: [] as string[],
		changed: [] as string[],
		removed: [] as string[],
		errors: [] as string[],
		duration: 0,
	};

	console.log(`Central mode: syncing from ${centralAgent} to all detected tools...\n`);

	const detectedTools = detectAvailableTools(cwd);
	const targetTools = detectedTools.filter((tool) => tool !== centralAgent);

	if (targetTools.length === 0) {
		result.errors.push(`No other tools detected besides ${centralAgent}`);
		result.duration = Date.now() - start;
		return result;
	}

	console.log(`Central source: ${centralAgent}`);
	console.log(`Target tools: ${targetTools.join(', ')}\n`);

	for (const tool of targetTools) {
		const sourceDir = TOOL_DIRS[centralAgent];
		const targetDir = TOOL_DIRS[tool];

		console.log(`Syncing ${centralAgent} (${sourceDir}) → ${tool} (${targetDir})...`);

		try {
			const sourcePath = path.join(cwd, sourceDir);
			const targetPath = path.join(cwd, targetDir);

			if (!fs.existsSync(sourcePath)) {
				result.errors.push(`Source directory not found: ${sourcePath}`);
				console.log(`  ✗ Source not found: ${sourcePath}`);
				continue;
			}

			if (!options.dryRun) {
				fs.mkdirSync(targetPath, { recursive: true });
			}

			const sourceFiles = getAgentFiles(sourcePath, centralAgent);

			for (const file of sourceFiles) {
				const relativePath = path.relative(sourcePath, file);
				const targetFile = path.join(targetPath, relativePath);
				const targetDir2 = path.dirname(targetFile);

				if (!options.dryRun) {
					fs.mkdirSync(targetDir2, { recursive: true });
				}

				if (options.dryRun) {
					result.added.push(targetFile);
					console.log(`  + ${relativePath}`);
				} else {
					const content = fs.readFileSync(file, 'utf-8');
					const transformed = transformContent(content, centralAgent, tool);

					if (fs.existsSync(targetFile)) {
						const existing = fs.readFileSync(targetFile, 'utf-8');
						if (existing !== transformed) {
							fs.writeFileSync(targetFile, transformed);
							result.changed.push(targetFile);
							console.log(`  ~ ${relativePath}`);
						}
					} else {
						fs.writeFileSync(targetFile, transformed);
						result.added.push(targetFile);
						console.log(`  + ${relativePath}`);
					}
				}
			}

			console.log(`  ✓ Synced successfully`);
		} catch (error) {
			const errMsg = `Failed to sync ${tool}: ${error}`;
			result.errors.push(errMsg);
			console.log(`  ✗ ${errMsg}`);
		}
	}

	result.duration = Date.now() - start;
	return result;
}

async function syncGlobal(
	cwd: string,
	options: SyncOptions
): Promise<{
	added: string[];
	changed: string[];
	removed: string[];
	errors: string[];
	duration: number;
}> {
	const start = Date.now();
	const result = {
		added: [] as string[],
		changed: [] as string[],
		removed: [] as string[],
		errors: [] as string[],
		duration: 0,
	};

	const globalAgentsDir =
		process.platform === 'win32'
			? path.join(process.env.APPDATA || '', 'sync', '.agents')
			: path.join(process.env.HOME || '', '.agents');

	console.log(`Global mode: syncing from ${globalAgentsDir} to project...\n`);

	if (!fs.existsSync(globalAgentsDir)) {
		result.errors.push(`Global config not found: ${globalAgentsDir}`);
		result.duration = Date.now() - start;
		return result;
	}

	const detectedTools = detectAvailableTools(cwd);

	if (detectedTools.length === 0) {
		result.errors.push('No tools detected in project');
		result.duration = Date.now() - start;
		return result;
	}

	console.log(`Global source: ${globalAgentsDir}`);
	console.log(`Target tools: ${detectedTools.join(', ')}\n`);

	const globalFiles = getAgentFiles(globalAgentsDir, 'global');

	for (const tool of detectedTools) {
		const targetDir = TOOL_DIRS[tool];

		console.log(`Syncing global → ${tool} (${targetDir})...`);

		try {
			const targetPath = path.join(cwd, targetDir);

			if (!options.dryRun) {
				fs.mkdirSync(targetPath, { recursive: true });
			}

			for (const file of globalFiles) {
				const relativePath = path.relative(globalAgentsDir, file);
				const targetFile = path.join(targetPath, relativePath);
				const targetDir2 = path.dirname(targetFile);

				if (!options.dryRun) {
					fs.mkdirSync(targetDir2, { recursive: true });
				}

				if (options.dryRun) {
					result.added.push(targetFile);
					console.log(`  + ${relativePath}`);
				} else {
					const content = fs.readFileSync(file, 'utf-8');
					const transformed = transformContent(content, 'global', tool);

					if (fs.existsSync(targetFile)) {
						const existing = fs.readFileSync(targetFile, 'utf-8');
						if (existing !== transformed) {
							fs.writeFileSync(targetFile, transformed);
							result.changed.push(targetFile);
							console.log(`  ~ ${relativePath}`);
						}
					} else {
						fs.writeFileSync(targetFile, transformed);
						result.added.push(targetFile);
						console.log(`  + ${relativePath}`);
					}
				}
			}

			console.log(`  ✓ Synced successfully`);
		} catch (error) {
			const errMsg = `Failed to sync ${tool}: ${error}`;
			result.errors.push(errMsg);
			console.log(`  ✗ ${errMsg}`);
		}
	}

	result.duration = Date.now() - start;
	return result;
}

function detectAvailableTools(cwd: string): string[] {
	const available: string[] = [];

	for (const [tool, dir] of Object.entries(TOOL_DIRS)) {
		const toolPath = path.join(cwd, dir);
		if (fs.existsSync(toolPath)) {
			available.push(tool);
		}
	}

	return available;
}

function getAgentFiles(agentPath: string, agentName: string): string[] {
	const files: string[] = [];
	const dirsToCheck = ['skills', 'commands', 'agents', 'mcp'];

	for (const dir of dirsToCheck) {
		const fullPath = path.join(agentPath, dir);
		if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
			const dirFiles = getFilesRecursive(fullPath);
			files.push(...dirFiles);
		}
	}

	return files;
}

function getFilesRecursive(dir: string): string[] {
	const files: string[] = [];
	const entries = fs.readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...getFilesRecursive(fullPath));
		} else if (entry.isFile() && entry.name.endsWith('.md')) {
			files.push(fullPath);
		}
	}

	return files;
}

function transformContent(content: string, _source: string, _target: string): string {
	return content;
}
