// Re-export from the canonical socket module so existing imports don't break
export { initSocket, getIO, getIO as default, SOCKET_EVENTS, emitToUser, emitToSession } from '../socket/socket';
