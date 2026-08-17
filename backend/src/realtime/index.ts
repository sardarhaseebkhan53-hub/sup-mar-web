import { Server } from 'socket.io';
import { env } from '../config/env.js';

export function configureRealtime(httpServer) {
  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: { origin: env.clientOrigins, credentials: true },
    transports: ['websocket', 'polling'],
  });

  // Phase 1 exposes no user data or chat events. Authenticated rooms and event handlers arrive in later phases.
  io.on('connection', (socket) => {
    socket.emit('system:ready', { realtime: true, features: [] });
  });
  return io;
}
