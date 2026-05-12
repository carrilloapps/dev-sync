import test from 'ava';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { createAnalyzer } from './index.js';

const tempDir = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'agent-sync-full-'));

test.after(() => {
	try {
		fs.rmSync(tempDir, { recursive: true });
	} catch {}
});

test('createAnalyzer throws for unknown source with correct error message', (t) => {
	const error = t.throws(() => {
		createAnalyzer('unknown-agent', tempDir);
	});
	t.true(error?.message.includes('Unknown source'));
	t.true(error?.message.includes('unknown-agent'));
});

test('createAnalyzer throws with all supported sources in error', (t) => {
	const error = t.throws(() => {
		createAnalyzer('invalid', tempDir);
	});
	for (const source of ['claude-code', 'copilot', 'gemini', 'aider', 'replit']) {
		t.true(error?.message.includes(source));
	}
});

test('analyzer analyze returns source in result', async (t) => {
	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	t.is(result.source, 'claude-code');
});

test('analyzer analyze returns projectContext with correct path', async (t) => {
	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	t.is(result.projectContext.projectPath, tempDir);
});

test('analyzer analyze returns empty sourceFiles for empty dir', async (t) => {
	const emptyDir = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'agent-sync-empty-'));
	const analyzer = createAnalyzer('claude-code', emptyDir);
	const result = await analyzer.analyze();
	t.deepEqual(result.projectContext.sourceFiles, []);
	fs.rmSync(emptyDir, { recursive: true });
});

test('analyzer analyze scans nested directories', async (t) => {
	const nestedDir = path.join(tempDir, 'src', 'components', 'ui');
	fs.mkdirSync(nestedDir, { recursive: true });
	fs.writeFileSync(path.join(nestedDir, 'Button.tsx'), 'export const Button = () => {}');

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	const buttonFile = result.projectContext.sourceFiles.find((f) => f.path.includes('Button.tsx'));
	t.truthy(buttonFile);
	t.is(buttonFile?.language, 'TypeScript');
});

test('analyzer analyze ignores node_modules', async (t) => {
	const nodeModulesDir = path.join(tempDir, 'node_modules', 'react');
	fs.mkdirSync(nodeModulesDir, { recursive: true });
	fs.writeFileSync(path.join(nodeModulesDir, 'index.js'), 'export default React');

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	const reactFile = result.projectContext.sourceFiles.find((f) => f.path.includes('react'));
	t.falsy(reactFile);
});

test('analyzer analyze ignores .git directory', async (t) => {
	const gitDir = path.join(tempDir, '.git', 'objects');
	fs.mkdirSync(gitDir, { recursive: true });
	fs.writeFileSync(path.join(gitDir, 'abc123'), 'fake git object');

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	const gitFile = result.projectContext.sourceFiles.find((f) => f.path.includes('.git'));
	t.falsy(gitFile);
});

test('analyzer analyze detects tsconfig.json as config', async (t) => {
	fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), JSON.stringify({ compilerOptions: {} }));

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	const tsconfig = result.projectContext.configFiles.find((f) => f.path === 'tsconfig.json');
	t.truthy(tsconfig);
	t.is(tsconfig?.type, 'tsconfig');
});

test('analyzer analyze detects Python files', async (t) => {
	fs.writeFileSync(path.join(tempDir, 'main.py'), 'def main():\n    pass');

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	const pyFile = result.projectContext.sourceFiles.find((f) => f.path.endsWith('.py'));
	t.truthy(pyFile);
	t.is(pyFile?.language, 'Python');
});

test('analyzer analyze detects Rust files', async (t) => {
	fs.writeFileSync(path.join(tempDir, 'main.rs'), 'fn main() {}');

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	const rsFile = result.projectContext.sourceFiles.find((f) => f.path.endsWith('.rs'));
	t.truthy(rsFile);
	t.is(rsFile?.language, 'Rust');
});

test('analyzer analyze detects Go files', async (t) => {
	fs.writeFileSync(path.join(tempDir, 'main.go'), 'package main\nfunc main() {}');

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	const goFile = result.projectContext.sourceFiles.find((f) => f.path.endsWith('.go'));
	t.truthy(goFile);
	t.is(goFile?.language, 'Go');
});

test('analyzer analyze detects Java files', async (t) => {
	fs.writeFileSync(
		path.join(tempDir, 'Main.java'),
		'public class Main { public static void main(String[] args) {} }'
	);

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	const javaFile = result.projectContext.sourceFiles.find((f) => f.path.endsWith('.java'));
	t.truthy(javaFile);
	t.is(javaFile?.language, 'Java');
});

test('analyzer analyze detects Angular framework', async (t) => {
	const srcDir = path.join(tempDir, 'src');
	fs.mkdirSync(srcDir, { recursive: true });
	fs.writeFileSync(path.join(srcDir, 'app.module.ts'), 'import { NgModule } from "@angular/core";');

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	const ngFile = result.projectContext.sourceFiles.find((f) => f.path === 'src/app.module.ts');
	t.truthy(ngFile);
	t.is(ngFile?.framework, 'Angular');
});

test('analyzer analyze detects Flask/Python framework', async (t) => {
	fs.writeFileSync(path.join(tempDir, 'app.py'), 'from flask import Flask\napp = Flask(__name__)');

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	const flaskFile = result.projectContext.sourceFiles.find((f) => f.path === 'app.py');
	t.truthy(flaskFile);
	t.is(flaskFile?.framework, 'Python');
});

test('analyzer analyze detects Go main package', async (t) => {
	fs.writeFileSync(path.join(tempDir, 'server.go'), 'package main\nfunc main() {}');

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	const goFile = result.projectContext.sourceFiles.find((f) => f.path === 'server.go');
	t.truthy(goFile);
	t.is(goFile?.framework, 'Go');
});

test('analyzer analyze detects Rust main function', async (t) => {
	fs.writeFileSync(path.join(tempDir, 'lib.rs'), 'fn main() {}\npub fn helper() {}');

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	const rsFile = result.projectContext.sourceFiles.find((f) => f.path === 'lib.rs');
	t.truthy(rsFile);
	t.is(rsFile?.framework, 'Rust');
});

test('analyzer analyze detects Android from AppCompatActivity', async (t) => {
	fs.writeFileSync(
		path.join(tempDir, 'MainActivity.java'),
		'public class MainActivity extends AppCompatActivity {}'
	);

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	const androidFile = result.projectContext.sourceFiles.find((f) => f.path === 'MainActivity.java');
	t.truthy(androidFile);
	t.is(androidFile?.framework, 'Android');
});

test('analyzer analyze returns recommendations for empty project', async (t) => {
	const emptyDir = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'agent-sync-empty2-'));
	const analyzer = createAnalyzer('claude-code', emptyDir);
	const result = await analyzer.analyze();
	t.true(result.recommendations!.includes('No source files detected'));
	t.true(result.recommendations!.includes('No dependencies found - may use system libraries'));
	fs.rmSync(emptyDir, { recursive: true });
});

test('analyzer analyze returns recommendations for React project', async (t) => {
	fs.writeFileSync(
		path.join(tempDir, 'package.json'),
		JSON.stringify({ dependencies: { react: '^18.0.0' } })
	);

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	t.true(
		result.recommendations!.includes('React project detected - ensure React 18+ compatibility')
	);
});

test('analyzer analyze extracts devDependencies', async (t) => {
	fs.writeFileSync(
		tempDir + '/package.json',
		JSON.stringify({
			dependencies: { react: '^18.0.0' },
			devDependencies: { typescript: '~5.0.0', jest: '^29.0.0' },
		})
	);

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	const devDeps = result.projectContext.dependencies.filter((d) => d.type === 'development');
	t.true(devDeps.length >= 2);
	t.true(devDeps.some((d) => d.name === 'typescript'));
	t.true(devDeps.some((d) => d.name === 'jest'));
});

test('analyzer analyze returns env info with correct platform', async (t) => {
	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	t.true(['windows', 'linux', 'mac'].includes(result.projectContext.environment.platform));
});

test('analyzer analyze returns env info with node version', async (t) => {
	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	t.truthy(result.projectContext.environment.nodeVersion);
	t.true(result.projectContext.environment.nodeVersion.startsWith('v'));
});

test('analyzer analyze returns env info with package manager', async (t) => {
	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	t.true(['npm', 'yarn', 'pnpm'].includes(result.projectContext.environment.packageManager));
});

test('analyzer analyze returns env info with shell', async (t) => {
	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	t.truthy(result.projectContext.environment.shell);
});

test('analyzer analyze handles malformed JSON gracefully', async (t) => {
	fs.writeFileSync(path.join(tempDir, 'package.json'), '{invalid json');

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	t.truthy(result.projectContext);
	t.deepEqual(result.projectContext.dependencies, []);
});

test('analyzer analyze extracts imports from source files', async (t) => {
	fs.writeFileSync(
		path.join(tempDir, 'index.ts'),
		"import React from 'react';\nimport { useState } from 'react';\nimport axios from 'axios';\nexport const x = 1;"
	);

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	const file = result.projectContext.sourceFiles.find((f) => f.path === 'index.ts');
	t.true(file!.imports.length >= 2);
	t.true(file!.imports.includes("from 'react'"));
});

test('analyzer analyze extracts exports from source files', async (t) => {
	fs.writeFileSync(
		path.join(tempDir, 'index.ts'),
		'export const x = 1;\nexport function y() {}\nexport default z;'
	);

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	const file = result.projectContext.sourceFiles.find((f) => f.path === 'index.ts');
	t.true(file!.exports.length >= 2);
});

test('analyzer analyze counts lines correctly', async (t) => {
	const lines = ['line 1', 'line 2', 'line 3', 'line 4', 'line 5'];
	fs.writeFileSync(path.join(tempDir, 'index.ts'), lines.join('\n'));

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	const file = result.projectContext.sourceFiles.find((f) => f.path === 'index.ts');
	t.is(file!.lines, 5);
});

test('createAnalyzer for goose returns valid analyzer', async (t) => {
	const analyzer = createAnalyzer('goose', tempDir);
	const result = await analyzer.analyze();
	t.is(result.source, 'goose');
});

test('createAnalyzer for aider-go returns valid analyzer', async (t) => {
	const analyzer = createAnalyzer('aider-go', tempDir);
	const result = await analyzer.analyze();
	t.is(result.source, 'aider-go');
});

test('createAnalyzer for mistral returns valid analyzer', async (t) => {
	const analyzer = createAnalyzer('mistral', tempDir);
	const result = await analyzer.analyze();
	t.is(result.source, 'mistral');
});

test('createAnalyzer for perplexity returns valid analyzer', async (t) => {
	const analyzer = createAnalyzer('perplexity', tempDir);
	const result = await analyzer.analyze();
	t.is(result.source, 'perplexity');
});

test('createAnalyzer for trae returns valid analyzer', async (t) => {
	const analyzer = createAnalyzer('trae', tempDir);
	const result = await analyzer.analyze();
	t.is(result.source, 'trae');
});

test('createAnalyzer for codepal returns valid analyzer', async (t) => {
	const analyzer = createAnalyzer('codepal', tempDir);
	const result = await analyzer.analyze();
	t.is(result.source, 'codepal');
});

test('createAnalyzer for continue returns valid analyzer', async (t) => {
	const analyzer = createAnalyzer('continue', tempDir);
	const result = await analyzer.analyze();
	t.is(result.source, 'continue');
});

test('createAnalyzer for devin returns valid analyzer', async (t) => {
	const analyzer = createAnalyzer('devin', tempDir);
	const result = await analyzer.analyze();
	t.is(result.source, 'devin');
});

test('analyzer getId returns correct id', async (t) => {
	const analyzer = createAnalyzer('claude-code', tempDir);
	t.is(analyzer.getId(), 'claude-code');
});

test('analyzer getName returns correct name', async (t) => {
	const analyzer = createAnalyzer('claude-code', tempDir);
	t.is(analyzer.getName(), 'Claude Code');
});

test('analyzer getName returns Copilot for copilot', async (t) => {
	const analyzer = createAnalyzer('copilot', tempDir);
	t.is(analyzer.getName(), 'GitHub Copilot');
});

test('analyzer getId and getName work together', async (t) => {
	const analyzer = createAnalyzer('gemini', tempDir);
	t.is(analyzer.getId(), 'gemini');
	t.is(analyzer.getName(), 'Google Gemini');
});

test('analyzer analyze returns sessionData', async (t) => {
	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	t.truthy(result.sessionData);
	t.true(Array.isArray(result.sessionData!.conversations));
	t.true(Array.isArray(result.sessionData!.tools));
});

test('analyzer analyze handles .next directory', async (t) => {
	const nextDir = path.join(tempDir, '.next');
	fs.mkdirSync(nextDir, { recursive: true });
	fs.writeFileSync(path.join(nextDir, 'cache.json'), '{}');

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	const nextFile = result.projectContext.sourceFiles.find((f) => f.path.includes('.next'));
	t.falsy(nextFile);
});

test('analyzer analyze handles coverage directory', async (t) => {
	const coverageDir = path.join(tempDir, 'coverage');
	fs.mkdirSync(coverageDir, { recursive: true });
	fs.writeFileSync(path.join(coverageDir, 'lcov.info'), '{}');

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	const coverageFile = result.projectContext.sourceFiles.find((f) => f.path.includes('coverage'));
	t.falsy(coverageFile);
});

test('analyzer analyze handles __pycache__ directory', async (t) => {
	const pycacheDir = path.join(tempDir, '__pycache__');
	fs.mkdirSync(pycacheDir, { recursive: true });
	fs.writeFileSync(path.join(pycacheDir, 'cache.pyc'), '{}');

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	const pycacheFile = result.projectContext.sourceFiles.find((f) => f.path.includes('__pycache__'));
	t.falsy(pycacheFile);
});

test('analyzer analyze handles build directory', async (t) => {
	const buildDir = path.join(tempDir, 'build');
	fs.mkdirSync(buildDir, { recursive: true });
	fs.writeFileSync(path.join(buildDir, 'bundle.js'), 'bundle');

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	const buildFile = result.projectContext.sourceFiles.find((f) => f.path.includes('build'));
	t.falsy(buildFile);
});

test('analyzer analyze handles target directory', async (t) => {
	const targetDir = path.join(tempDir, 'target');
	fs.mkdirSync(targetDir, { recursive: true });
	fs.writeFileSync(path.join(targetDir, 'output.txt'), 'output');

	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	const targetFile = result.projectContext.sourceFiles.find((f) => f.path.includes('target'));
	t.falsy(targetFile);
});

test('analyzer analyze returns sessionData with empty conversations when session dir missing', async (t) => {
	const analyzer = createAnalyzer('claude-code', tempDir);
	const result = await analyzer.analyze();
	t.deepEqual(result.sessionData, { conversations: [], tools: [] });
});
