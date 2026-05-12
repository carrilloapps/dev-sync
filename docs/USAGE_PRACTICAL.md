# Practical Usage Guide

## Scenario: Continuar una conversación cuando se acaban los tokens

Este es el caso de uso principal de Agent Sync. Cuando estás trabajando con Claude Code y se acaban los tokens, puedes continuar en cualquier otro IDE o agente compatible.

### Flujo de Trabajo

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USANDO CLAUDE CODE                          │
│                                                                     │
│  1. Estás trabajando en un proyecto复杂的                              │
│  2. Te acercas al límite de tokens                                  │
│  3. Tienes una conversación activa con contexto valioso              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        AGENT-SYNC SAVE                             │
│                                                                     │
│  agent-sync --from=claude-code --to=opencode --path=./mi-proyecto   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        CONTINUAS EN OTRO                           │
│                                                                     │
│  Abres VS Code, Cursor, JetBrains o cualquier IDE soportado        │
│  y tienes todo el contexto disponible                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Paso a Paso

#### 1. Guardar desde Claude Code

```bash
# Instalar agent-sync si no lo has hecho
npm install -g agent-sync

# Sincronizar el proyecto con conversaciones
agent-sync --from=claude-code --to=opencode --path=./mi-proyecto
```

Esto crea en tu proyecto:
```
mi-proyecto/
├── .opencode/
│   ├── config.json
│   ├── dependencies.json
│   ├── source-map.json
│   └── sessions/
│       ├── index.json              # Índice de conversaciones
│       ├── session_abc123.json     # Tu conversación guardada
│       └── ...
```

#### 2. Continuar en otro IDE

##### En VS Code:
```bash
# Abrir el proyecto
cd mi-proyecto && code .
```

Las conversaciones se guardan en `.vscode/conversation-history/` y puedes usar el MCP para acceder a ellas.

##### En Cursor:
```bash
cursor mi-proyecto
```

##### En JetBrains:
```bash
idea mi-proyecto
```

#### 3. Usar MCP para acceder al contexto

En cualquier IDE con MCP configurado:

```bash
# Listar conversaciones disponibles
npx agent-sync-mcp
# Luego usar tool: list_conversations

# Ver una conversación específica
npx agent-sync-mcp
# Luego usar tool: export_conversation
```

### Ejemplo Práctico

```bash
# 1. Desde Claude Code, guardas tu sesión
$ agent-sync --from=claude-code --to=opencode --path=./mi-proyecto
✔ Analyzing project...
✔ Found 42 files
✔ Extracting conversations...
✔ Exporting to .opencode/...
Done! 3 conversations migrated.

# 2. Abres VS Code
$ cd mi-proyecto && code .

# 3. En VS Code, preguntas a tu AI:
#    "Continúa donde quedamos, estábamos implementando el login"

# El AI puede leer .opencode/sessions/ para obtener el contexto
```

### Archivos Generados

#### `.opencode/sessions/index.json`
```json
{
  "migratedAt": "2024-01-15T10:30:00Z",
  "conversations": [
    {"id": "session_abc123", "file": "session_abc123.json", "messageCount": 47}
  ],
  "tools": [
    {"name": "Read", "count": 15, "lastUsed": "2024-01-15T10:00:00Z"},
    {"name": "Write", "count": 8, "lastUsed": "2024-01-15T10:00:00Z"}
  ],
  "memory": {
    "learnedPatterns": ["custom auth flow", "React hooks patterns"],
    "customRules": ["use TypeScript strict mode"]
  }
}
```

#### `.opencode/sessions/session_abc123.json`
```json
{
  "id": "session_abc123",
  "messages": [
    {"role": "user", "content": "Implementa login con JWT", "timestamp": "2024-01-15T09:00:00Z"},
    {"role": "assistant", "content": "Voy a implementar el login...", "timestamp": "2024-01-15T09:00:05Z"},
    {"role": "assistant", "content": "He creado auth.ts con el flujo de JWT", "timestamp": "2024-01-15T09:01:00Z"}
  ],
  "migratedAt": "2024-01-15T10:30:00Z"
}
```

### Sincronización entre Agentes

Agent Sync también permite migrar entre agentes de AI:

```bash
# De Claude Code a Copilot
agent-sync --from=claude-code --to=copilot --path=./mi-proyecto

# De Gemini a WindSurf
agent-sync --from=gemini --to=windsurf --path=./mi-proyecto

# De Cursor a Claude Code (¡sí, funciona en ambas direcciones!)
agent-sync --from=cursor --to=claude-code --path=./mi-proyecto
```

### Watch Mode (Sincronización Automática)

Para proyectos en progreso:

```bash
# Mantén sincronizado automáticamente
agent-sync --from=claude-code --to=opencode --path=./mi-proyecto --watch
```

Cada cambio que hagas se sincroniza automáticamente.

### Integración MCP Completa

#### Listar conversaciones
```json
{"name": "list_conversations", "arguments": {"agent": "claude-code", "projectPath": "./mi-proyecto"}}
```

#### Exportar una conversación específica
```json
{"name": "export_conversation", "arguments": {
  "agent": "claude-code",
  "conversationId": "session_abc123",
  "to": "opencode",
  "projectPath": "./mi-proyecto"
}}
```

#### Analizar proyecto
```json
{"name": "analyze_project", "arguments": {
  "agent": "claude-code",
  "projectPath": "./mi-proyecto"
}}
```

### Soporte de Plataformas

| Plataforma | Path de Claude Code |
|------------|---------------------|
| Windows | `%APPDATA%\Claude\claude-code` |
| macOS | `~/Library/Application Support/claude-code` |
| Linux | `~/.config/claude-code` |

### Solución de Problemas

#### "No conversations found"
- Verifica que tienes conversaciones guardadas en el path correcto
- El path debe coincidir con el proyecto que estabas usando

#### "Permission denied"
- En Linux/macOS: `sudo npm install -g agent-sync`
- O usa un Node.js version manager

#### MCP no responde
```bash
# Reinicia el servidor
pkill -f agent-sync-mcp
npx agent-sync-mcp
```