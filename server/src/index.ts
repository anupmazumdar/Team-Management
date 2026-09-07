import http from 'http';
import path from 'path';
import fs from 'fs';
import { app } from './app.js';
import { ENV } from './config/env.js';
import { initSocketIO } from './socket/socketHandler.js';

const server = http.createServer(app);

// Initialize WebSockets
initSocketIO(server);

// Start Server
const PORT = Number(process.env.PORT) || ENV.PORT || 5000;
const uploadsPath = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Hustlex Team Workspace server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`📁 Uploads served from ${uploadsPath}`);
});
