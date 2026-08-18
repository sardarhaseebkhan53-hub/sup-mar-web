import type { Socket } from 'socket.io-client';
import { getAccessToken } from './apiClient';

/**
 * socket.io-client is intentionally loaded lazily via a dynamic import so it
 * only ships in the bundle when a logged-in user actually needs realtime
 * features (notifications/messages). This keeps it out of the initial page
 * payload for guests, improving LCP on public pages.
 */
let socketPromise: Promise<Socket> | null = null;
let socket: Socket | null = null;

async function loadSocket(): Promise<Socket> {
  if (socket) return socket;
  if (!socketPromise) {
    socketPromise = import('socket.io-client').then(({ io }) => {
      socket = io({ path: '/socket.io', autoConnect: false, transports: ['websocket', 'polling'], auth: (callback) => callback({ token: getAccessToken() }) });
      return socket;
    });
  }
  return socketPromise;
}

export async function getSocket(): Promise<Socket> {
  const target = await loadSocket();
  if (!target.connected) target.connect();
  return target;
}

export async function disconnectSocket(): Promise<void> {
  if (socket) socket.disconnect();
  socket = null;
  socketPromise = null;
}
