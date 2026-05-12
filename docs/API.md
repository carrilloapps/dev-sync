# API Reference

AI Sync provides a programmatic API for integration with other tools and workflows.

## Import

```typescript
import { createAnalyzer, createExporter, syncProject, supportedSources, supportedTargets } from 'ai-sync-cli';
```

## Functions

### createAnalyzer

Create an analyzer for a specific agent.

```typescript
import { createAnalyzer } from 'ai-sync-cli';

const analyzer = createAnalyzer('claude', '/path/to/project');
const result = await analyzer.analyze();

console.log(result.projectContext.sourceFiles.length);
console.log(result.projectContext.dependencies);
```

**Parameters:**
- `agent` (string): Agent ID ('claude', 'copilot', 'gemini', 'cursor', 'windsurf')
- `projectPath` (string): Path to the project

**Returns:** `Analyzer` object with `analyze()` method

### createExporter

Create an exporter for a specific IDE.

```typescript
import { createExporter } from 'ai-sync-cli';

const exporter = createExporter('opencode', '/path/to/project', {
  overwrite: false,
  preserveHistory: true,
  validateResults: true
});

const result = await exporter.export(projectContext, sessionData);
```

**Parameters:**
- `target` (string): Target IDE ID
- `projectPath` (string): Path to the project
- `options` (ExporterOptions): Configuration options

**Returns:** `Exporter` object with `export()` method

### syncProject

Synchronize a project directly.

```typescript
import { syncProject } from 'ai-sync-cli';

const result = await syncProject({
  sourceAgent: 'claude',
  targetAgent: 'opencode',
  projectPath: '/path/to/project',
  overwrite: false
});

console.log(result.success);
console.log(result.analysis?.projectContext.sourceFiles.length);
console.log(result.migration?.filesCreated);
```

**Parameters:**
- `options` (SyncOptions): Sync configuration

**Returns:** `SyncResult` object

## SyncOptions

```typescript
interface SyncOptions {
  sourceAgent: string;      // Agent ID
  targetAgent: string;     // Target IDE ID
  projectPath: string;      // Project path
  overwrite?: boolean;      // Overwrite existing (default: false)
  preserveHistory?: boolean; // Preserve history (default: true)
  watch?: boolean;          // Watch mode (default: false)
  excludePatterns?: string[]; // Patterns to exclude
  includePatterns?: string[]; // Patterns to include
}
```

## SyncResult

```typescript
interface SyncResult {
  success: boolean;           // Whether sync succeeded
  analysis: AnalyzerResult | null;  // Analysis results
  migration: MigrationResult | null; // Migration results
  duration: number;            // Time taken in ms
}
```

## AnalyzerResult

```typescript
interface AnalyzerResult {
  source: string;                      // Agent ID
  projectContext: ProjectContext;      // Project information
  sessionData?: SessionData;            // Session/conversation data
  recommendations?: string[];          // recommendations
}
```

## ProjectContext

```typescript
interface ProjectContext {
  projectPath: string;
  sourceFiles: SourceFile[];
  configFiles: ConfigFile[];
  dependencies: Dependency[];
  environment: EnvironmentInfo;
}
```

## SourceFile

```typescript
interface SourceFile {
  path: string;           // Relative path
  language: string;       // Programming language
  framework?: string;     // Detected framework
  lines: number;          // Total lines
  imports: string[];       // Import statements
  exports: string[];      // Export statements
}
```

## MigrationResult

```typescript
interface MigrationResult {
  success: boolean;
  filesCreated: string[];
  filesModified: string[];
  errors: string[];
  warnings: string[];
}
```

## Supported Agents

```typescript
import { supportedSources } from 'ai-sync-cli';

for (const agent of supportedSources) {
  console.log(agent.id, agent.name);
}
```

**Available Agents:**
- `claude` - Claude Code
- `copilot` - GitHub Copilot
- `gemini` - Google Gemini
- `cursor` - Cursor
- `windsurf` - WindSurf
- `aider` - Aider
- `continue` - Continue Dev
- `replit` - Replit
- `codex` - Codex
- `amazonq` - Amazon Q
- And 15+ more...

## Supported Targets

```typescript
import { supportedTargets } from 'ai-sync-cli';

for (const target of supportedTargets) {
  console.log(target.id, target.name);
}
```

**Available Targets:**
- `opencode` - OpenCode
- `vscode` - Visual Studio Code
- `jetbrains` - JetBrains IDEs
- `cursor` - Cursor IDE
- `zed` - Zed
- `vim` - Vim/Neovim
- `emacs` - Emacs
- And 5+ more...

## SessionData

```typescript
interface SessionData {
  conversations: Conversation[];
  tools: ToolUsage[];
  memory?: MemoryContext;
}
```

## Example: Full Sync Workflow

```typescript
import { syncProject, createAnalyzer } from 'ai-sync-cli';

async function syncWorkflow() {
  // Analyze first
  const analyzer = createAnalyzer('claude', './my-project');
  const analysis = await analyzer.analyze();

  console.log(`Found ${analysis.projectContext.sourceFiles.length} files`);
  console.log(`Languages: ${[...new Set(analysis.projectContext.sourceFiles.map(f => f.language))].join(', ')}`);

  // Sync to multiple targets
  for (const target of ['opencode', 'vscode', 'cursor']) {
    const result = await syncProject({
      sourceAgent: 'claude',
      targetAgent: target,
      projectPath: './my-project'
    });

    console.log(`${target}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  }
}

syncWorkflow().catch(console.error);
```

## Example: Export Specific Conversation

```typescript
import { createAnalyzer, createExporter } from 'ai-sync-cli';

async function exportConversation() {
  const analyzer = createAnalyzer('claude', './my-project');
  const analysis = await analyzer.analyze();

  // Find specific conversation
  const conv = analysis.sessionData?.conversations.find(c => c.id === 'session_123');
  if (!conv) {
    console.log('Conversation not found');
    return;
  }

  // Export to OpenCode
  const exporter = createExporter('opencode', './my-project', {
    overwrite: false,
    preserveHistory: true,
    validateResults: true
  });

  await exporter.export(analysis.projectContext, {
    conversations: [conv],
    tools: analysis.sessionData?.tools || []
  });

  console.log('Conversation exported');
}

exportConversation().catch(console.error);
```

## Error Handling

```typescript
import { syncProject } from 'ai-sync-cli';

try {
  const result = await syncProject({
    sourceAgent: 'claude',
    targetAgent: 'opencode',
    projectPath: './my-project'
  });

  if (!result.success) {
    console.error('Sync failed:', result.migration?.errors);
  }
} catch (error) {
  console.error('Exception:', error.message);
}
```
