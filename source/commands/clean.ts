import { clean } from '../config/sync.js';

export type CleanOptions = {
	json?: boolean;
	cwd?: string;
	dryRun?: boolean;
	tool?: string;
};

export async function cleanCommand(options: CleanOptions): Promise<void> {
	const cwd = options.cwd || process.cwd();

	try {
		const result = await clean({
			dryRun: options.dryRun,
			tool: options.tool,
			cwd,
		});

		if (options.json) {
			console.log(JSON.stringify(result, null, 2));
		} else {
			if (options.dryRun) {
				console.log('Dry run - no files will be removed:');
			}

			if (result.removed.length > 0) {
				console.log(`\nRemoved (${result.removed.length}):`);
				for (const file of result.removed.slice(0, 20)) {
					console.log(`  - ${file}`);
				}

				if (result.removed.length > 20) {
					console.log(`  ... and ${result.removed.length - 20} more`);
				}
			} else {
				console.log('No files to remove.');
			}

			console.log(`\nCompleted in ${result.duration}ms`);
		}
	} catch (error) {
		if (options.json) {
			console.log(JSON.stringify({ error: String(error) }, null, 2));
		} else {
			console.error(`Clean failed: ${error}`);
		}

		process.exit(1);
	}
}
