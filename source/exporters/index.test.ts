import test from 'ava';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { createExporter, exportToTarget, ALL_TARGETS } from './index.js';
import type { ProjectContext } from '../types/index.js';

const tempDir = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'agent-sync-export-'));

test.after(() => {
	try {
		fs.rmSync(tempDir, { recursive: true });
	} catch {}
});

const mockContext: ProjectContext = {
	projectPath: tempDir,
	sourceFiles: [
		{ path: 'src/index.ts', language: 'TypeScript', lines: 10, imports: [], exports: [] },
		{
			path: 'src/app.tsx',
			language: 'TypeScript',
			framework: 'React',
			lines: 50,
			imports: ['react'],
			exports: [],
		},
	],
	configFiles: [
		{ path: 'package.json', type: 'package', content: {} },
		{ path: 'tsconfig.json', type: 'tsconfig', content: {} },
	],
	dependencies: [
		{ name: 'react', version: '^18.0.0', type: 'production' },
		{ name: 'typescript', version: '~5.0.0', type: 'development' },
	],
	environment: {
		platform: 'linux',
		nodeVersion: '20.0.0',
		packageManager: 'npm',
		shell: '/bin/bash',
	},
};

test('OpenCodeExporter creates config files', async (t) => {
	const exporter = createExporter('opencode', tempDir, {
		overwrite: true,
		preserveHistory: true,
		validateResults: true,
	});
	const result = await exporter.export(mockContext);
	t.true(result.success);
	t.true(result.filesCreated.length >= 2);
});

test('VSCodeExporter creates workspace files', async (t) => {
	const exporter = createExporter('vscode', tempDir, {
		overwrite: true,
		preserveHistory: true,
		validateResults: true,
	});
	const result = await exporter.export(mockContext);
	t.true(result.success);
	t.true(result.filesCreated.length >= 2);
});

test('JetBrainsExporter creates project state', async (t) => {
	const exporter = createExporter('jetbrains', tempDir, {
		overwrite: true,
		preserveHistory: true,
		validateResults: true,
	});
	const result = await exporter.export(mockContext);
	t.true(result.success);
	t.true(result.filesCreated.length >= 2);
});

test('CursorExporter creates session files', async (t) => {
	const exporter = createExporter('cursor', tempDir, {
		overwrite: true,
		preserveHistory: true,
		validateResults: true,
	});
	const result = await exporter.export(mockContext);
	t.true(result.success);
	t.true(result.filesCreated.length >= 1);
});

test('SublimeExporter creates workspace', async (t) => {
	const exporter = createExporter('sublime', tempDir, {
		overwrite: true,
		preserveHistory: true,
		validateResults: true,
	});
	const result = await exporter.export(mockContext);
	t.true(result.success);
});

test('ZedExporter creates workspace', async (t) => {
	const exporter = createExporter('zed', tempDir, {
		overwrite: true,
		preserveHistory: true,
		validateResults: true,
	});
	const result = await exporter.export(mockContext);
	t.true(result.success);
});

test('VimExporter creates session vim', async (t) => {
	const exporter = createExporter('vim', tempDir, {
		overwrite: true,
		preserveHistory: true,
		validateResults: true,
	});
	const result = await exporter.export(mockContext);
	t.true(result.success);
});

test('EmacsExporter creates workspace org', async (t) => {
	const exporter = createExporter('emacs', tempDir, {
		overwrite: true,
		preserveHistory: true,
		validateResults: true,
	});
	const result = await exporter.export(mockContext);
	t.true(result.success);
});

test('LapceExporter creates workspace', async (t) => {
	const exporter = createExporter('lapce', tempDir, {
		overwrite: true,
		preserveHistory: true,
		validateResults: true,
	});
	const result = await exporter.export(mockContext);
	t.true(result.success);
});

test('NovaExporter creates workspace', async (t) => {
	const exporter = createExporter('nova', tempDir, {
		overwrite: true,
		preserveHistory: true,
		validateResults: true,
	});
	const result = await exporter.export(mockContext);
	t.true(result.success);
});

test('OnivimExporter creates workspace', async (t) => {
	const exporter = createExporter('onivim', tempDir, {
		overwrite: true,
		preserveHistory: true,
		validateResults: true,
	});
	const result = await exporter.export(mockContext);
	t.true(result.success);
});

test('OnivimExporter getId and getName work', (t) => {
	const exporter = createExporter('onivim', tempDir, {
		overwrite: true,
		preserveHistory: true,
		validateResults: true,
	});
	t.is(exporter.getId(), 'onivim');
	t.is(exporter.getName(), 'Onivim');
});

test('NovaExporter getId and getName work', (t) => {
	const exporter = createExporter('nova', tempDir, {
		overwrite: true,
		preserveHistory: true,
		validateResults: true,
	});
	t.is(exporter.getId(), 'nova');
	t.is(exporter.getName(), 'Nova');
});

test('LapceExporter getId and getName work', (t) => {
	const exporter = createExporter('lapce', tempDir, {
		overwrite: true,
		preserveHistory: true,
		validateResults: true,
	});
	t.is(exporter.getId(), 'lapce');
	t.is(exporter.getName(), 'Lapce');
});

test('TabbyExporter getId and getName work', (t) => {
	const exporter = createExporter('tabby', tempDir, {
		overwrite: true,
		preserveHistory: true,
		validateResults: true,
	});
	t.is(exporter.getId(), 'tabby');
	t.is(exporter.getName(), 'Tabby');
});

test('TabbyExporter creates config', async (t) => {
	const exporter = createExporter('tabby', tempDir, {
		overwrite: true,
		preserveHistory: true,
		validateResults: true,
	});
	const result = await exporter.export(mockContext);
	t.true(result.success);
});

test('Exporter getId returns correct id', (t) => {
	const exporter = createExporter('opencode', tempDir, {
		overwrite: false,
		preserveHistory: true,
		validateResults: true,
	});
	t.is(exporter.getId(), 'opencode');
});

test('Exporter getName returns correct name', (t) => {
	const exporter = createExporter('opencode', tempDir, {
		overwrite: false,
		preserveHistory: true,
		validateResults: true,
	});
	t.is(exporter.getName(), 'OpenCode');
});

test('exportToTarget function works', async (t) => {
	const result = await exportToTarget('opencode', tempDir, mockContext);
	t.true(result.success);
});

test('ALL_TARGETS has all expected targets', (t) => {
	t.is(ALL_TARGETS.length, 13);
	t.true(ALL_TARGETS.some((t) => t.id === 'opencode'));
	t.true(ALL_TARGETS.some((t) => t.id === 'vscode'));
	t.true(ALL_TARGETS.some((t) => t.id === 'jetbrains'));
	t.true(ALL_TARGETS.some((t) => t.id === 'zed'));
	t.true(ALL_TARGETS.some((t) => t.id === 'tabby'));
});
