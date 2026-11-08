import { io } from 'socket.io-client';
import { P2PRoom } from './p2pSocket';

export const getBackendUrl = () => {
    if (process.env.REACT_APP_BACKEND_URL) {
        return process.env.REACT_APP_BACKEND_URL.replace(/\/+$/, '');
    }
    if (typeof window !== 'undefined') {
        // If running the React development server on port 3000, target backend on port 5000
        if (window.location.port === '3000') {
            return `http://${window.location.hostname}:5000`;
        }
    }
    return null;
};

export const initSocket = async (roomId, username) => {
    const backendUrl = getBackendUrl();

    // If explicit backend URL is provided (e.g. localhost dev or deployed backend), use Socket.IO
    if (backendUrl) {
        try {
            const options = {
                'force new connection': true,
                reconnectionAttempts: 2,
                timeout: 3000,
                transports: ['websocket', 'polling'],
            };
            return io(backendUrl, options);
        } catch (err) {
            console.warn('Socket.IO connection failed, using P2P WebRTC fallback:', err);
        }
    }

    // Default on Vercel: use direct peer-to-peer WebRTC collaboration!
    // No backend deployment or server setup required.
    return new P2PRoom(roomId, username);
};
