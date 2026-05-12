import test from 'ava';
import { getAgentDir, getTargetDir, ALL_SOURCES, ALL_TARGETS } from './registry.js';

test('getAgentDir returns valid directory for claude-code', (t) => {
	const result = getAgentDir('claude-code', '/test/project');
	t.true(typeof result === 'string');
	t.regex(result!, /claude-code|sessions/);
});

test('getAgentDir returns valid directory without projectPath', (t) => {
	const result = getAgentDir('claude-code');
	t.true(typeof result === 'string');
	t.regex(result!, /claude-code|sessions/);
});

test('getAgentDir returns valid directory for copilot', (t) => {
	const result = getAgentDir('copilot', '/test/project');
	t.true(typeof result === 'string');
});

test('getAgentDir returns undefined for unknown agent', (t) => {
	const result = getAgentDir('unknown-agent' as any, '/test/project');
	t.is(result, undefined);
});

test('getTargetDir returns valid directory for opencode', (t) => {
	const result = getTargetDir('opencode', '/test/project');
	t.true(typeof result === 'string');
	t.regex(result!, /\.opencode/);
});

test('getTargetDir returns valid directory for vscode', (t) => {
	const result = getTargetDir('vscode', '/test/project');
	t.true(typeof result === 'string');
	t.regex(result!, /\.vscode/);
});

test('getTargetDir returns valid directory for jetbrains', (t) => {
	const result = getTargetDir('jetbrains', '/test/project');
	t.true(typeof result === 'string');
	t.regex(result!, /\.jetbrains/);
});

test('getTargetDir returns valid directory for cursor', (t) => {
	const result = getTargetDir('cursor', '/test/project');
	t.true(typeof result === 'string');
	t.regex(result!, /\.cursor/);
});

test('getTargetDir returns valid directory for sublime', (t) => {
	const result = getTargetDir('sublime', '/test/project');
	t.true(typeof result === 'string');
	t.regex(result!, /\.sublime/);
});

test('getTargetDir returns valid directory for vim', (t) => {
	const result = getTargetDir('vim', '/test/project');
	t.true(typeof result === 'string');
	t.regex(result!, /\.vim/);
});

test('getTargetDir returns valid directory for emacs', (t) => {
	const result = getTargetDir('emacs', '/test/project');
	t.true(typeof result === 'string');
	t.regex(result!, /\.emacs\.d/);
});

test('getTargetDir returns valid directory for atom', (t) => {
	const result = getTargetDir('atom', '/test/project');
	t.true(typeof result === 'string');
	t.regex(result!, /\.atom/);
});

test('getTargetDir returns valid directory for zed', (t) => {
	const result = getTargetDir('zed', '/test/project');
	t.true(typeof result === 'string');
	t.regex(result!, /\.zed/);
});

test('getTargetDir returns valid directory for lapce', (t) => {
	const result = getTargetDir('lapce', '/test/project');
	t.true(typeof result === 'string');
	t.regex(result!, /\.lapce/);
});

test('getTargetDir returns valid directory for nova', (t) => {
	const result = getTargetDir('nova', '/test/project');
	t.true(typeof result === 'string');
	t.regex(result!, /\.nova/);
});

test('getTargetDir returns valid directory for onivim', (t) => {
	const result = getTargetDir('onivim', '/test/project');
	t.true(typeof result === 'string');
	t.regex(result!, /\.onivim/);
});

test('getTargetDir returns undefined for unknown target', (t) => {
	const result = getTargetDir('unknown-target' as any, '/test/project');
	t.is(result, undefined);
});

test('ALL_SOURCES has all expected agents', (t) => {
	const ids = ALL_SOURCES.map((s) => s.id);
	t.true(ids.includes('claude-code'));
	t.true(ids.includes('copilot'));
	t.true(ids.includes('gemini'));
	t.true(ids.includes('cursor'));
	t.true(ids.includes('windsurf'));
	t.true(ids.includes('aider'));
	t.true(ids.includes('replit'));
});

test('ALL_TARGETS has all expected targets', (t) => {
	const ids = ALL_TARGETS.map((t) => t.id);
	t.true(ids.includes('opencode'));
	t.true(ids.includes('vscode'));
	t.true(ids.includes('jetbrains'));
	t.true(ids.includes('cursor'));
	t.true(ids.includes('sublime'));
	t.true(ids.includes('vim'));
	t.true(ids.includes('emacs'));
	t.true(ids.includes('atom'));
	t.true(ids.includes('zed'));
	t.true(ids.includes('lapce'));
	t.true(ids.includes('nova'));
	t.true(ids.includes('onivim'));
});

test('ALL_SOURCES entries have required properties', (t) => {
	for (const source of ALL_SOURCES) {
		t.truthy(source.id);
		t.truthy(source.name);
		t.truthy(source.platform);
		t.truthy(source.sessionPath);
	}
});

test('ALL_TARGETS entries have required properties', (t) => {
	for (const target of ALL_TARGETS) {
		t.truthy(target.id);
		t.truthy(target.name);
		t.truthy(target.configDir);
	}
});

test('ALL_SOURCES has at least 10 agents', (t) => {
	t.true(ALL_SOURCES.length >= 10);
});

test('ALL_TARGETS has at least 10 targets', (t) => {
	t.true(ALL_TARGETS.length >= 10);
});

test('getAgentDir returns valid paths for aider', (t) => {
	const result = getAgentDir('aider', '/test/project');
	t.true(typeof result === 'string');
});

test('getAgentDir returns valid paths for continue', (t) => {
	const result = getAgentDir('continue', '/test/project');
	t.true(typeof result === 'string');
});

test('getAgentDir returns valid paths for replit', (t) => {
	const result = getAgentDir('replit', '/test/project');
	t.true(typeof result === 'string');
});

test('getAgentDir handles codegeek agent', (t) => {
	const result = getAgentDir('codegeek', '/test/project');
	t.is(result, undefined);
});

test('getAgentDir handles devin agent', (t) => {
	const result = getAgentDir('devin', '/test/project');
	t.is(result, undefined);
});

test('getAgentDir handles codepal agent', (t) => {
	const result = getAgentDir('codepal', '/test/project');
	t.is(result, undefined);
});

test('getAgentDir handles trae agent', (t) => {
	const result = getAgentDir('trae', '/test/project');
	t.true(typeof result === 'string');
});
