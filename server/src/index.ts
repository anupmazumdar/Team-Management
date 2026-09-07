import http from 'http';
import path from 'path';
import { app } from './app.js';
import { ENV } from './config/env.js';
import { initSocketIO } from './socket/socketHandler.js';

const server = http.createServer(app);

// Initialize WebSockets
initSocketIO(server);

// Start Server
const PORT = ENV.PORT || 5000;
const uploadsPath = path.resolve(process.cwd(), 'uploads');

server.listen(PORT, () => {
  console.log(`🚀 Hustlex Team Workspace server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`📁 Uploads served from ${uploadsPath}`);
});
