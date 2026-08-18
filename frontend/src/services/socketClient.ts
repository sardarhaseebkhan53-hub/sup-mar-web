import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from './apiClient';
let socket: Socket | null = null;
export function getSocket(){if(!socket){socket=io({path:'/socket.io',autoConnect:false,transports:['websocket','polling'],auth:(callback)=>callback({token:getAccessToken()})});}if(!socket.connected)socket.connect();return socket;}
export function disconnectSocket(){socket?.disconnect();socket=null;}
