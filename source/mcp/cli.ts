#!/usr/bin/env node
import {AgentSyncMCPServer} from './server.js';

const server = new AgentSyncMCPServer();
server.start().catch(console.error);
