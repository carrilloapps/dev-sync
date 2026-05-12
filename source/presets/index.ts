import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import {
	type PresetSource,
	type SkillFile,
	type CommandFile,
	type AgentFile,
	parseFrontmatter,
} from '../config/index.js';
import { GLOBAL_AGENTS_DIR } from '../config/loader.js';

export type PresetContent = {
	skills: SkillFile[];
	commands: CommandFile[];
	agents: AgentFile[];
};

export function parsePresetSource(source: string): PresetSource | undefined {
	if (source.startsWith('github:')) {
		const parts = source.slice(7).split('@');
		const ref = parts[1] || 'main';
		return { type: 'github', source: parts[0], ref };
	}

	if (source.startsWith('fs:')) {
		return { type: 'fs', source: source.slice(3) };
	}

	if (source.startsWith('./') || source.startsWith('../') || source.startsWith('/')) {
		return { type: 'fs', source };
	}

	// Try as relative path
	return { type: 'fs', source };
}

export function resolvePresetPath(preset: PresetSource, cwd: string): string | undefined {
	switch (preset.type) {
		case 'github': {
			return undefined;
		}

		case 'fs': {
			if (path.isAbsolute(preset.source)) {
				return preset.source;
			}

			return path.resolve(cwd, preset.source);
		}
	}
}

export function loadPreset(preset: PresetSource, cwd: string): PresetContent {
	const content: PresetContent = {
		skills: [],
		commands: [],
		agents: [],
	};

	const presetPath = resolvePresetPath(preset, cwd);
	if (!presetPath || !fs.existsSync(presetPath)) {
		return content;
	}

	const stats = fs.statSync(presetPath);
	if (!stats.isDirectory()) {
		return content;
	}

	// Load skills
	const skillsDir = path.join(presetPath, 'skills');
	if (fs.existsSync(skillsDir) && fs.statSync(skillsDir).isDirectory()) {
		const files = fs.readdirSync(skillsDir).filter((f) => f.endsWith('.md'));
		for (const file of files) {
			const filePath = path.join(skillsDir, file);
			try {
				const fileContent = fs.readFileSync(filePath, 'utf-8');
				const { frontmatter, body } = parseFrontmatter(fileContent);
				const name = path.basename(file, '.md');
				const namespace = extractNamespace(preset);
				content.skills.push({
					path: filePath,
					name,
					description: (frontmatter.description as string) || '',
					content: body,
					frontmatter: frontmatter as SkillFile['frontmatter'],
					namespace,
					source: 'preset',
				});
			} catch {
				// Ignore unreadable files
			}
		}
	}

	// Load commands
	const commandsDir = path.join(presetPath, 'commands');
	if (fs.existsSync(commandsDir) && fs.statSync(commandsDir).isDirectory()) {
		const files = fs.readdirSync(commandsDir).filter((f) => f.endsWith('.md'));
		for (const file of files) {
			const filePath = path.join(commandsDir, file);
			try {
				const fileContent = fs.readFileSync(filePath, 'utf-8');
				const { frontmatter, body } = parseFrontmatter(fileContent);
				const name = path.basename(file, '.md');
				const namespace = extractNamespace(preset);
				content.commands.push({
					path: filePath,
					name,
					description: (frontmatter.description as string) || '',
					argumentHint: frontmatter['argument-hint'] as string | undefined,
					content: body,
					frontmatter: frontmatter as CommandFile['frontmatter'],
					namespace,
					source: 'preset',
				});
			} catch {
				// Ignore unreadable files
			}
		}
	}

	// Load agents
	const agentsDir = path.join(presetPath, 'agents');
	if (fs.existsSync(agentsDir) && fs.statSync(agentsDir).isDirectory()) {
		const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.md'));
		for (const file of files) {
			const filePath = path.join(agentsDir, file);
			try {
				const fileContent = fs.readFileSync(filePath, 'utf-8');
				const { frontmatter, body } = parseFrontmatter(fileContent);
				const name = path.basename(file, '.md');
				const namespace = extractNamespace(preset);
				content.agents.push({
					path: filePath,
					name,
					description: (frontmatter.description as string) || '',
					content: body,
					frontmatter: frontmatter as AgentFile['frontmatter'],
					namespace,
					source: 'preset',
				});
			} catch {
				// Ignore unreadable files
			}
		}
	}

	return content;
}

function extractNamespace(preset: PresetSource): string {
	switch (preset.type) {
		case 'github': {
			const parts = preset.source.split('/');
			return parts.at(-1) ?? 'unknown';
		}

		case 'fs': {
			const parts = preset.source.split('/');
			return parts.at(-1) ?? 'unknown';
		}
	}
}

export function loadAllPresets(sources: string[], cwd: string): PresetContent {
	const combined: PresetContent = {
		skills: [],
		commands: [],
		agents: [],
	};

	for (const source of sources) {
		const preset = parsePresetSource(source);
		if (preset) {
			const content = loadPreset(preset, cwd);
			combined.skills.push(...content.skills);
			combined.commands.push(...content.commands);
			combined.agents.push(...content.agents);
		}
	}

	return combined;
}

export async function cloneGitHubPreset(repo: string, ref: string, _cwd: string): Promise<string> {
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-sync-preset-'));
	const targetDir = path.join(tmpDir, 'preset');

	try {
		execSync(`git clone --depth 1 --branch ${ref} https://github.com/${repo}.git ${targetDir}`, {
			stdio: 'pipe',
		});
		return targetDir;
	} catch {
		fs.rmSync(tmpDir, { recursive: true, force: true });
		throw new Error(`Failed to clone preset: ${repo}`);
	}
}
