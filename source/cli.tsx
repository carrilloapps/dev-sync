#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import App from './app.js';

const cli = meow(
	`
  Usage
    $ agent-sync [options]

  Options
    --from, -f          Source agent (claude-code, copilot, gemini, cursor, windsurf)
    --to, -t            Target IDE (opencode, vscode, jetbrains, cursor)
    --path, -p          Project path to sync (default: current directory)
    --overwrite         Overwrite existing config
    --watch, -w         Watch for changes and sync automatically
    --session           Show current sync session info
    --history           Show sync history
    --listSources       List all supported source agents
    --listTargets       List all supported target IDEs

  Examples
    $ agent-sync --from=claude-code --to=opencode --path=./my-project
    $ agent-sync -f copilot -t vscode -p ./my-project
    $ agent-sync --from=gemini --to=jetbrains --path=./project --watch
  `,
	{
		importMeta: import.meta,
		flags: {
			from: {
				type: 'string',
				short: 'f',
			},
			to: {
				type: 'string',
				short: 't',
			},
			path: {
				type: 'string',
				short: 'p',
			},
			overwrite: {
				type: 'boolean',
				short: 'o',
				default: false,
			},
			watch: {
				type: 'boolean',
				short: 'w',
				default: false,
			},
			session: {
				type: 'boolean',
				default: false,
			},
			history: {
				type: 'boolean',
				default: false,
			},
			listSources: {
				type: 'boolean',
				default: false,
			},
			listTargets: {
				type: 'boolean',
				default: false,
			},
		},
	},
);

const sourceAgent = cli.flags.from;
const targetIDE = cli.flags.to;
const projectPath = cli.flags.path;

render(
	<App
		sourceAgent={sourceAgent}
		targetIDE={targetIDE}
		projectPath={projectPath}
		overwrite={cli.flags.overwrite}
		watchMode={cli.flags.watch}
		showSession={cli.flags.session}
		showHistory={cli.flags.history}
		listSources={cli.flags.listSources}
		listTargets={cli.flags.listTargets}
	/>,
);
