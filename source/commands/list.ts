import { TOOL_CAPABILITIES, TOOL_DIRS } from '../config/index.js';

export type ListOptions = {
	json?: boolean;
};

export async function listCommand(args: string[], options: ListOptions): Promise<void> {
	const [type] = args;

	switch (type) {
		case 'tools': {
			await listTools(options);
			break;
		}

		case 'agents': {
			await listAgents(options);
			break;
		}

		default: {
			console.log('Usage: list <tools|agents>');
			process.exit(1);
		}
	}
}

async function listTools(options: ListOptions): Promise<void> {
	const tools = Object.entries(TOOL_CAPABILITIES).map(([name, caps]) => ({
		name,
		skills: caps.skills,
		commands: caps.commands,
		mcp: caps.mcp,
		method: caps.method,
	}));

	if (options.json) {
		console.log(JSON.stringify(tools, null, 2));
	} else {
		console.log('Supported tools:\n');
		console.log(
			'Tool'.padEnd(15) + 'Skills'.padEnd(10) + 'Commands'.padEnd(12) + 'MCP'.padEnd(10) + 'Method'
		);
		console.log('-'.repeat(60));
		for (const tool of tools) {
			console.log(
				tool.name.padEnd(15) +
					(tool.skills ? '✓' : '-').padEnd(10) +
					(tool.commands ? '✓' : '-').padEnd(12) +
					(tool.mcp ? '✓' : '-').padEnd(10) +
					tool.method
			);
		}
	}
}

async function listAgents(options: ListOptions): Promise<void> {
	const agents = Object.entries(TOOL_DIRS).map(([name, dir]) => ({
		name,
		directory: dir,
	}));

	if (options.json) {
		console.log(JSON.stringify(agents, null, 2));
	} else {
		console.log('Agent directories:\n');
		for (const agent of agents) {
			console.log(`  ${agent.name.padEnd(15)} → ${agent.directory}`);
		}
	}
}
