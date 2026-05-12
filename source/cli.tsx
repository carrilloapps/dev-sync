#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import meow from 'meow';
import App from './app.js';
import { initCommand } from './commands/init.js';
import { syncCommand } from './commands/sync.js';
import { doctorCommand } from './commands/doctor.js';
import { cleanCommand } from './commands/clean.js';
import { configCommand } from './commands/config.js';
import { listCommand } from './commands/list.js';

const cli = meow(
	`
Usage
    $ ai-sync [command] [options]

 Commands
    init                        Initialize .agents/agentsync.toml
    doctor                      Run diagnostics
    clean                       Remove synced files
    config                      Manage configuration
    list                        List tools or agents

 Sync Options (run sync directly)
    --from, -f                 Source agent (required for sync)
    --to, -t                   Target IDE (required for sync)
    --path, -p                 Project path (default: current dir)
    --central                   Use agent as central source, sync to all
    --global                    Sync from global config (~/.agents/)
    --dry-run                   Preview without applying changes
    --watch, -w                 Watch mode for real-time sync

 Other Options
    --json, -j                  JSON output
    --cwd                        Working directory
    --tool                       Specific tool (alias for --to)
    --profile                    Profile name
    --copy                       Copy files (default)
    --link                       Use symlinks instead of copying

 Examples
    $ ai-sync init --tools claude,opencode
    $ ai-sync --from claude --to vscode --path ./my-project
    $ ai-sync -f claude -t opencode -p ./my-project
    $ ai-sync --central claude
    $ ai-sync --global
    $ ai-sync --dry-run
    $ ai-sync --watch
    $ ai-sync doctor --json
    $ ai-sync clean --dry-run
    $ ai-sync config ls
    $ ai-sync list agents
  `,
	{
		importMeta: import.meta,
		flags: {
			json: {
				type: 'boolean',
				short: 'j',
				default: false,
			},
			cwd: {
				type: 'string',
			},
			dryRun: {
				type: 'boolean',
				default: false,
			},
			tool: {
				type: 'string',
			},
			profile: {
				type: 'string',
			},
			copy: {
				type: 'boolean',
				default: true,
			},
			link: {
				type: 'boolean',
				default: false,
			},
			central: {
				type: 'string',
			},
			global: {
				type: 'boolean',
				default: false,
			},
			to: {
				type: 'string',
			},
			from: {
				type: 'string',
			},
		},
	}
);

const [command, ...args] = cli.input;

const options = {
	json: cli.flags.json,
	cwd: cli.flags.cwd || process.cwd(),
	dryRun: cli.flags.dryRun,
	tool: cli.flags.tool || cli.flags.to,
	profile: cli.flags.profile,
	copyMode: cli.flags.link ? ('link' as const) : ('copy' as const),
	central: cli.flags.central,
	global: cli.flags.global,
	from: cli.flags.from,
};

async function main() {
	if (command === 'init') {
		await initCommand(args, options);
		return;
	}

	if (command === 'doctor') {
		await doctorCommand(options);
		return;
	}

	if (command === 'clean') {
		await cleanCommand(options);
		return;
	}

	if (command === 'config') {
		await configCommand(args, options);
		return;
	}

	if (command === 'list') {
		await listCommand(args, options);
		return;
	}

	const hasSyncFlags = cli.flags.from || cli.flags.to || cli.flags.central || cli.flags.global;
	if (hasSyncFlags || !command) {
		await syncCommand(options);
		return;
	}

	render(
		React.createElement(App, {
			sourceAgent: cli.flags.from as string | undefined,
			targetIDE: cli.flags.to as string | undefined,
			projectPath: cli.flags.path as string | undefined,
			overwrite: cli.flags.overwrite as boolean,
			watchMode: cli.flags.watch as boolean,
			showSession: cli.flags.session as boolean,
			showHistory: cli.flags.history as boolean,
			listSources: cli.flags.listSources as boolean,
			listTargets: cli.flags.listTargets as boolean,
		})
	);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
