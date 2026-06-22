const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const ACTIONS = require('./src/Actions');

const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom CORS middleware to allow cross-origin requests from React development port
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.static('build'));

app.post('/compile', async (req, res) => {
    const { code, language, input } = req.body;
    
    // Map language parameter to corresponding Wandbox compiler ID
    let compiler = '';
    if (language === 'cpp') {
        compiler = 'gcc-13.2.0';
    } else if (language === 'c') {
        compiler = 'gcc-13.2.0-c';
    } else if (language === 'py') {
        compiler = 'cpython-3.14.0';
    } else if (language === 'java') {
        compiler = 'openjdk-jdk-21+35';
    } else if (language === 'cs') {
        compiler = 'dotnetcore-8.0.402';
    } else if (language === 'rust') {
        compiler = 'rust-1.82.0';
    } else if (language === 'go') {
        compiler = 'go-1.23.2';
    } else if (language === 'php') {
        compiler = 'php-8.3.12';
    } else if (language === 'ruby') {
        compiler = 'ruby-3.4.9';
    } else if (language === 'swift') {
        compiler = 'swift-6.0.1';
    } else if (language === 'js') {
        compiler = 'nodejs-20.17.0';
    } else {
        return res.status(400).json({ error: 'Unsupported language for compilation' });
    }

    try {
        const response = await fetch('https://wandbox.org/api/compile.json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                compiler,
                code,
                stdin: input || '',
            }),
        });
        const data = await response.json();
        
        // Map output/compiler error from Wandbox format
        const result = {};
        if (data.compiler_error) {
            result.error = data.compiler_error;
        } else if (data.program_error) {
            result.error = data.program_error;
        } else if (data.program_output) {
            result.output = data.program_output;
        } else {
            result.output = '';
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const userSocketMap = {};
function getAllConnectedClients(roomId) {
    // Map
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    // Sync language to a specific newly joined socket only
    socket.on(ACTIONS.SYNC_LANGUAGE, ({ socketId, language }) => {
        io.to(socketId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
    });

    socket.on(ACTIONS.LANGUAGE_CHANGE, ({ roomId, language }) => {
        socket.in(roomId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
