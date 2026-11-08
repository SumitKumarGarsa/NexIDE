import { Peer } from 'peerjs';
import ACTIONS from './Actions';

export class P2PRoom {
    constructor(roomId, username) {
        this.roomId = roomId;
        this.username = username;
        // Clean room ID for peer name
        const cleanId = (roomId || 'default').replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
        this.hostId = `nexide-room-${cleanId}`;
        this.listeners = {};
        this.peers = new Map(); // connId -> conn
        this.clients = [{ socketId: 'local', username: this.username }];
        this.isHost = false;
        this.peer = null;
        this.hostConn = null;
        this.connected = false;
        this.init();
    }

    on(event, cb) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(cb);
    }

    off(event, cb) {
        if (!this.listeners[event]) return;
        if (!cb) {
            delete this.listeners[event];
        } else {
            this.listeners[event] = this.listeners[event].filter(fn => fn !== cb);
        }
    }

    emitEvent(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => {
                try {
                    cb(data);
                } catch (err) {
                    console.error(`Error in P2P event handler for ${event}:`, err);
                }
            });
        }
    }

    emit(event, data) {
        if (this.isHost) {
            // Handle host-initiated actions
            if (event === ACTIONS.SYNC_CODE) {
                const targetPeer = this.peers.get(data.socketId);
                if (targetPeer && targetPeer.open) {
                    targetPeer.send({ type: ACTIONS.CODE_CHANGE, code: data.code });
                }
            } else if (event === ACTIONS.SYNC_LANGUAGE) {
                const targetPeer = this.peers.get(data.socketId);
                if (targetPeer && targetPeer.open) {
                    targetPeer.send({ type: ACTIONS.LANGUAGE_CHANGE, language: data.language });
                }
            } else if (event === ACTIONS.CODE_CHANGE || event === ACTIONS.LANGUAGE_CHANGE) {
                this.broadcast({ type: event, ...data });
            }
        } else if (this.hostConn && this.hostConn.open) {
            this.hostConn.send({ type: event, ...data });
        }
    }

    init() {
        try {
            // Attempt to claim the Host slot for this room
            this.peer = new Peer(this.hostId);

            this.peer.on('open', (id) => {
                console.log('NexIDE: Claimed Room Host role:', id);
                this.isHost = true;
                this.connected = true;
                this.emitEvent('connect');
                this.emitEvent(ACTIONS.JOINED, {
                    clients: this.clients,
                    username: this.username,
                    socketId: 'local'
                });
            });

            this.peer.on('connection', (conn) => {
                conn.on('open', () => {
                    this.peers.set(conn.peer, conn);
                });

                conn.on('data', (msg) => {
                    this.handleHostMessage(conn, msg);
                });

                conn.on('close', () => {
                    const client = this.clients.find(c => c.socketId === conn.peer);
                    this.clients = this.clients.filter(c => c.socketId !== conn.peer);
                    this.peers.delete(conn.peer);
                    if (client) {
                        this.broadcast({
                            type: ACTIONS.DISCONNECTED,
                            socketId: conn.peer,
                            username: client.username,
                            clients: this.clients,
                        });
                        this.emitEvent(ACTIONS.DISCONNECTED, {
                            socketId: conn.peer,
                            username: client.username
                        });
                        this.emitEvent(ACTIONS.JOINED, {
                            clients: this.clients,
                            username: this.username,
                            socketId: 'local'
                        });
                    }
                });
            });

            this.peer.on('error', (err) => {
                if (err.type === 'unavailable-id') {
                    // Host slot is already taken: connect as client peer to the host
                    console.log('NexIDE: Host exists, joining as collaborative client...');
                    if (this.peer && !this.peer.destroyed) {
                        this.peer.destroy();
                    }
                    this.initClient();
                } else {
                    console.warn('NexIDE P2P Host error:', err);
                }
            });
        } catch (err) {
            console.warn('Failed to initialize host peer:', err);
            this.initClient();
        }
    }

    initClient() {
        try {
            this.peer = new Peer();

            this.peer.on('open', (myId) => {
                console.log('NexIDE: Client Peer ID created:', myId);
                this.myId = myId;
                const conn = this.peer.connect(this.hostId, { reliable: true });
                this.hostConn = conn;

                conn.on('open', () => {
                    console.log('NexIDE: Connected directly to room host!');
                    this.connected = true;
                    this.emitEvent('connect');
                    conn.send({
                        type: ACTIONS.JOIN,
                        roomId: this.roomId,
                        username: this.username,
                        socketId: myId
                    });
                });

                conn.on('data', (msg) => {
                    this.handleClientMessage(msg);
                });

                conn.on('close', () => {
                    this.connected = false;
                    this.emitEvent(ACTIONS.DISCONNECTED, {
                        socketId: this.hostId,
                        username: 'Host'
                    });
                });
            });

            this.peer.on('error', (err) => {
                console.warn('NexIDE P2P Client error:', err);
            });
        } catch (err) {
            console.warn('Failed to initialize client peer:', err);
        }
    }

    handleHostMessage(conn, msg) {
        if (!msg || !msg.type) return;
        const { type } = msg;

        if (type === ACTIONS.JOIN) {
            const newClient = { socketId: conn.peer, username: msg.username || 'Coder' };
            if (!this.clients.some(c => c.socketId === conn.peer)) {
                this.clients.push(newClient);
            }

            // Notify local host UI
            this.emitEvent(ACTIONS.JOINED, {
                clients: this.clients,
                username: msg.username,
                socketId: conn.peer,
            });

            // Broadcast updated clients list to all connected peers
            this.broadcast({
                type: ACTIONS.JOINED,
                clients: this.clients,
                username: msg.username,
                socketId: conn.peer
            });
        } else if (type === ACTIONS.CODE_CHANGE) {
            // Apply code change to host UI
            this.emitEvent(ACTIONS.CODE_CHANGE, msg);
            // Relay code change to all other peers
            this.peers.forEach((peerConn, peerId) => {
                if (peerId !== conn.peer && peerConn.open) {
                    peerConn.send(msg);
                }
            });
        } else if (type === ACTIONS.LANGUAGE_CHANGE) {
            this.emitEvent(ACTIONS.LANGUAGE_CHANGE, msg);
            this.peers.forEach((peerConn, peerId) => {
                if (peerId !== conn.peer && peerConn.open) {
                    peerConn.send(msg);
                }
            });
        }
    }

    handleClientMessage(msg) {
        if (!msg || !msg.type) return;
        const { type } = msg;

        if (type === ACTIONS.JOINED) {
            this.clients = msg.clients || this.clients;
            this.emitEvent(ACTIONS.JOINED, msg);
        } else if (type === ACTIONS.CODE_CHANGE) {
            this.emitEvent(ACTIONS.CODE_CHANGE, msg);
        } else if (type === ACTIONS.LANGUAGE_CHANGE) {
            this.emitEvent(ACTIONS.LANGUAGE_CHANGE, msg);
        } else if (type === ACTIONS.DISCONNECTED) {
            if (msg.clients) this.clients = msg.clients;
            this.emitEvent(ACTIONS.DISCONNECTED, msg);
        }
    }

    broadcast(msg) {
        this.peers.forEach((conn) => {
            if (conn.open) {
                conn.send(msg);
            }
        });
    }

    disconnect() {
        this.connected = false;
        if (this.hostConn) {
            try { this.hostConn.close(); } catch (e) {}
        }
        this.peers.forEach(conn => {
            try { conn.close(); } catch (e) {}
        });
        if (this.peer && !this.peer.destroyed) {
            try { this.peer.destroy(); } catch (e) {}
        }
    }
}
