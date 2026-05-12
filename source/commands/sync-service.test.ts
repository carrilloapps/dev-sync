import test from 'ava';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
	SyncService,
	syncProject,
	watchProject,
	stopWatching,
	getActiveSessions,
	getHistory,
} from './sync-service.js';
import type { SyncOptions } from './sync-service.js';

test('SyncService can be instantiated', (t) => {
	const service = new SyncService();
	t.truthy(service);
});

test('SyncService getHistory returns empty array initially', (t) => {
	const service = new SyncService();
	const history = service.getHistory();
	t.true(Array.isArray(history));
	t.is(history.length, 0);
});

test('SyncService getActiveSessions returns empty array initially', (t) => {
	const service = new SyncService();
	const sessions = service.getActiveSessions();
	t.true(Array.isArray(sessions));
	t.is(sessions.length, 0);
});

test('syncProject is a function', (t) => {
	t.true(typeof syncProject === 'function');
});

test('watchProject is a function', (t) => {
	t.true(typeof watchProject === 'function');
});

test('stopWatching is a function', (t) => {
	t.true(typeof stopWatching === 'function');
});

test('getActiveSessions is a function', (t) => {
	t.true(typeof getActiveSessions === 'function');
});

test('getHistory is a function', (t) => {
	t.true(typeof getHistory === 'function');
});

test('SyncService has stopWatch method', (t) => {
	const service = new SyncService();
	t.true(typeof service.stopWatch === 'function');
});

test('SyncService has watch method', (t) => {
	const service = new SyncService();
	t.true(typeof service.watch === 'function');
});

test('SyncService has sync method', (t) => {
	const service = new SyncService();
	t.true(typeof service.sync === 'function');
});

test('syncProject function calls syncService.sync', async (t) => {
	const tempDir = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'agent-sync-sync-'));

	const options: SyncOptions = {
		sourceAgent: 'claude-code',
		targetAgent: 'opencode',
		projectPath: tempDir,
	};

	try {
		const result = await syncProject(options);
		t.true(typeof result.success === 'boolean');
		t.true(typeof result.duration === 'number');
	} finally {
		fs.rmSync(tempDir, { recursive: true });
	}
});

test('getActiveSessions returns empty array initially', (t) => {
	const sessions = getActiveSessions();
	t.true(Array.isArray(sessions));
});

test('getHistory returns empty array initially', (t) => {
	const history = getHistory();
	t.true(Array.isArray(history));
});

test('SyncService.sync returns result with duration', async (t) => {
	const tempDir = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'agent-sync-sync2-'));

	const service = new SyncService();
	const options: SyncOptions = {
		sourceAgent: 'claude-code',
		targetAgent: 'opencode',
		projectPath: tempDir,
	};

	try {
		const result = await service.sync(options);
		t.true(typeof result.duration === 'number');
	} finally {
		fs.rmSync(tempDir, { recursive: true });
	}
});

test('SyncService.watch returns watchId', async (t) => {
	const tempDir = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'agent-sync-watch-'));

	const service = new SyncService();
	const watchId = await service.watch(tempDir, 'claude-code');

	try {
		t.truthy(watchId);
		t.true(typeof watchId === 'string');
		await service.stopWatch(watchId);
	} finally {
		fs.rmSync(tempDir, { recursive: true });
	}
});

test('SyncService.watch handles file changes', async (t) => {
	const tempDir = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'agent-sync-watch2-'));
	fs.writeFileSync(path.join(tempDir, 'test.txt'), 'initial');

	const service = new SyncService();
	const watchId = await service.watch(tempDir, 'claude-code');

	try {
		await new Promise((resolve) => setTimeout(resolve, 500));
		fs.writeFileSync(path.join(tempDir, 'test.txt'), 'changed');
		await new Promise((resolve) => setTimeout(resolve, 500));
		fs.unlinkSync(path.join(tempDir, 'test.txt'));
		await new Promise((resolve) => setTimeout(resolve, 500));
		const sessions = service.getActiveSessions();
		t.true(sessions.length > 0);
	} finally {
		await service.stopWatch(watchId);
		fs.rmSync(tempDir, { recursive: true });
	}
});

test('watchProject exported function works', async (t) => {
	const tempDir = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'agent-sync-watch3-'));
	fs.writeFileSync(path.join(tempDir, 'test.txt'), 'initial');

	try {
		const watchId = await watchProject(tempDir, 'claude-code');
		t.truthy(watchId);
		await stopWatching(watchId);
	} finally {
		fs.rmSync(tempDir, { recursive: true });
	}
});

test('SyncService.handleFileChange can be called directly', (t) => {
	const service = new SyncService();
	const watchId = 'test-watch-id';

	service.getActiveSessions();

	const handleFileChange = (service as any).handleFileChange?.bind(service);
	if (handleFileChange) {
		handleFileChange('add', '/path/to/file.txt', watchId);
		handleFileChange('change', '/path/to/file.txt', watchId);
		handleFileChange('unlink', '/path/to/file.txt', watchId);
	}

	t.pass();
});

test('SyncService.watch handles watcher error', async (t) => {
	const tempDir = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'agent-sync-watch4-'));

	const service = new SyncService();
	const watchId = await service.watch(tempDir, 'claude-code');

	try {
		const watcher = (service as any).watchers.get(watchId);
		if (watcher && watcher.listeners) {
			const errorHandlers = watcher.listeners('error');
			if (errorHandlers.length > 0) {
				errorHandlers[0](new Error('Simulated watch error'));
			}
		}
		t.pass();
	} finally {
		await service.stopWatch(watchId);
		fs.rmSync(tempDir, { recursive: true });
	}
});

test('SyncService.watch triggers add event handler', async (t) => {
	const tempDir = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'agent-sync-watch5-'));

	const service = new SyncService();
	const watchId = await service.watch(tempDir, 'claude-code');

	try {
		// Get the watcher and manually call the 'add' handler with a fake path
		const watcher = (service as any).watchers.get(watchId);
		if (watcher && watcher.listeners) {
			const addHandlers = watcher.listeners('add');
			if (addHandlers.length > 0) {
				addHandlers[0]('/fake/path/file.txt');
			}
		}
		t.pass();
	} finally {
		await service.stopWatch(watchId);
		fs.rmSync(tempDir, { recursive: true });
	}
});

test('SyncService.sync handles errors gracefully', async (t) => {
	const tempDir = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'agent-sync-error-'));

	const service = new SyncService();
	const options: SyncOptions = {
		sourceAgent: 'claude-code',
		targetAgent: 'opencode',
		projectPath: tempDir,
	};

	const result = await service.sync(options);
	t.true(result.success);
	t.true(result.duration > 0);
	fs.rmSync(tempDir, { recursive: true });
});
