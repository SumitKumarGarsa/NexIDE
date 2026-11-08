import { io } from 'socket.io-client';

export const getBackendUrl = () => {
    if (process.env.REACT_APP_BACKEND_URL) {
        return process.env.REACT_APP_BACKEND_URL.replace(/\/+$/, '');
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

export const isBackendConfigured = () => {
    if (process.env.REACT_APP_BACKEND_URL) {
        return true;
    }
    if (typeof window !== 'undefined') {
        // Localhost development has local server.js
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return true;
        }
        // When deployed on Vercel and REACT_APP_BACKEND_URL is missing
        if (window.location.hostname.endsWith('vercel.app')) {
            return false;
        }
    }
    return true;
};

export const initSocket = async () => {
    const backendUrl = getBackendUrl();
    const options = {
        'force new connection': true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ['websocket', 'polling'],
    };
    return io(backendUrl, options);
};
