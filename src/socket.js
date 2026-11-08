import { io } from 'socket.io-client';

export const getBackendUrl = () => {
    if (process.env.REACT_APP_BACKEND_URL) {
        return process.env.REACT_APP_BACKEND_URL;
    }
    if (typeof window !== 'undefined') {
        // If running the React development server on port 3000, target backend on port 5000
        if (window.location.port === '3000') {
            return `http://${window.location.hostname}:5000`;
        }
        // In production or when served by express backend, connect to the same host
        return window.location.origin;
    }
    return 'http://localhost:5000';
};

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempts: Infinity,
        timeout: 10000,
        transports: ['websocket', 'polling'],
    };
    return io(getBackendUrl(), options);
};
