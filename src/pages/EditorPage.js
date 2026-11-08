import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import Preloader from '../components/Preloader';
import { initSocket, getBackendUrl, isBackendConfigured } from '../socket';
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from 'react-router-dom';

const languagesList = [
    {
        id: 'js',
        name: 'JavaScript (NodeJS)',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" fill="#F7DF1E" stroke="#F7DF1E"/>
                <text x="12" y="16" fill="#000" fontSize="11" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">JS</text>
            </svg>
        )
    },
    {
        id: 'cpp',
        name: 'C++ (GCC 13.2.0)',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" fill="#00599C" stroke="#00599C"/>
                <text x="12" y="15" fill="#fff" fontSize="8" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">C++</text>
            </svg>
        )
    },
    {
        id: 'c',
        name: 'C (GCC 13.2.0)',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" fill="#3949AB" stroke="#3949AB"/>
                <text x="12" y="16" fill="#fff" fontSize="11" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">C</text>
            </svg>
        )
    },
    {
        id: 'py',
        name: 'Python (CPython 3.14)',
        icon: (
            <svg viewBox="0 0 24 24">
                <path d="M12.001 2c-5.523 0-10 4.477-10 10s4.477 10 10 10 10-4.477 10-10-4.477-10-10-10zm2 14.5c0 .828-.672 1.5-1.5 1.5h-1c-.828 0-1.5-.672-1.5-1.5v-1c0-.828.672-1.5 1.5-1.5h1c.828 0 1.5.672 1.5 1.5v1zm-2-4c-.828 0-1.5-.672-1.5-1.5v-3c0-.828.672-1.5 1.5-1.5s1.5.672 1.5 1.5v3c0 .828-.672 1.5-1.5 1.5z" fill="#3776AB"/>
            </svg>
        )
    },
    {
        id: 'java',
        name: 'Java (OpenJDK 21)',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" fill="#E76F51" stroke="#E76F51"/>
                <text x="12" y="16" fill="#fff" fontSize="10" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">JAVA</text>
            </svg>
        )
    },
    {
        id: 'cs',
        name: 'C# (Mono 6.12)',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" fill="#178600" stroke="#178600"/>
                <text x="12" y="16" fill="#fff" fontSize="11" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">C#</text>
            </svg>
        )
    },
    {
        id: 'rust',
        name: 'Rust (Rust 1.82.0)',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" fill="#E43717" stroke="#E43717"/>
                <text x="12" y="16" fill="#fff" fontSize="10" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">RS</text>
            </svg>
        )
    },
    {
        id: 'go',
        name: 'Go (Go 1.23.2)',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" fill="#00ADD8" stroke="#00ADD8"/>
                <text x="12" y="15" fill="#fff" fontSize="11" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">GO</text>
            </svg>
        )
    },
    {
        id: 'php',
        name: 'PHP (PHP 8.3.12)',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="12" rx="10" ry="7" fill="#777BB4" stroke="#777BB4"/>
                <text x="12" y="15" fill="#fff" fontSize="9" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">PHP</text>
            </svg>
        )
    },
    {
        id: 'ruby',
        name: 'Ruby (Ruby 3.4.9)',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12,3 21,9 12,21 3,9" fill="#CC342D" stroke="#CC342D"/>
            </svg>
        )
    },
    {
        id: 'swift',
        name: 'Swift (Swift 6.0.1)',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" fill="#F05138" stroke="#F05138"/>
                <text x="12" y="15" fill="#fff" fontSize="11" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">SW</text>
            </svg>
        )
    }
];

const EditorPage = () => {
    const socketRef = useRef(null);
    const codeRef = useRef(null);
    const dropdownRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();

    // Current username with fallback to session or friendly default
    const currentUsername = useRef(
        location.state?.username ||
        (typeof window !== 'undefined' ? sessionStorage.getItem('nexide_username') : null) ||
        ('Coder_' + Math.floor(100 + Math.random() * 900))
    ).current;

    useEffect(() => {
        if (location.state?.username && typeof window !== 'undefined') {
            sessionStorage.setItem('nexide_username', location.state.username);
        }
    }, [location.state]);

    // Initialize with local user so their card is immediately present
    const [clients, setClients] = useState([
        { socketId: 'local', username: currentUsername }
    ]);
    const [socket, setSocket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isConsoleOpen, setIsConsoleOpen] = useState(true);
    const [logs, setLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [language, setLanguage] = useState('js');
    const [stdin, setStdin] = useState('');
    const [isSelectOpen, setIsSelectOpen] = useState(false);

    // Keep a ref of the language to avoid stale closures in socket callbacks
    // without forcing the socket connection to reset when the language changes.
    const langRef = useRef(language);
    useEffect(() => {
        langRef.current = language;
    }, [language]);

    // Handle dropdown click-outside closing
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsSelectOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        // Auto-dismiss preloader within 1.5s so the workspace is immediately usable
        const readyTimer = setTimeout(() => {
            if (isMounted) setLoading(false);
        }, 1500);

        const init = async () => {
            try {
                const s = await initSocket();
                if (!isMounted) return;
                socketRef.current = s;
                setSocket(s);

                s.on('connect', () => {
                    clearTimeout(readyTimer);
                    if (isMounted) setLoading(false);
                    s.emit(ACTIONS.JOIN, {
                        roomId,
                        username: currentUsername,
                    });
                });

                s.on('connect_error', () => {
                    // Graceful fallback to standalone workspace mode without kicking user out
                    if (isMounted) setLoading(false);
                });

                s.on('connect_failed', () => {
                    if (isMounted) setLoading(false);
                });

            // Listening for joined event
            socketRef.current.on(
                ACTIONS.JOINED,
                ({ clients, username, socketId }) => {
                    if (username !== currentUsername) {
                        toast.success(`${username} joined the room.`);
                        console.log(`${username} joined`);

                        // Sync current code to the newly joined user specifically
                        socketRef.current.emit(ACTIONS.SYNC_CODE, {
                            code: codeRef.current,
                            socketId,
                        });
                        // Sync current language to the newly joined user specifically
                        socketRef.current.emit(ACTIONS.SYNC_LANGUAGE, {
                            language: langRef.current,
                            socketId,
                        });
                    } else {
                        // Dismiss loader once the local client has joined successfully
                        setLoading(false);
                    }
                    setClients(clients);
                }
            );

            // Listen for collaborative language changes from other users
            socketRef.current.on(ACTIONS.LANGUAGE_CHANGE, ({ language: newLang }) => {
                setLanguage(newLang);
                langRef.current = newLang;
                toast.success(`Editor language switched to ${getLanguageDisplayName(newLang)}`);
            });

            // Listening for disconnected
            socketRef.current.on(
                ACTIONS.DISCONNECTED,
                ({ socketId, username }) => {
                    toast.success(`${username} left the room.`);
                    setClients((prev) => {
                        return prev.filter(
                            (client) => client.socketId !== socketId
                        );
                    });
                }
            );
            } catch (err) {
                if (isMounted) setLoading(false);
            }
        };
        init();
        return () => {
            isMounted = false;
            clearTimeout(readyTimer);
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.LANGUAGE_CHANGE);
                socketRef.current.off(ACTIONS.DISCONNECTED);
                socketRef.current.off('connect');
                socketRef.current.off('connect_error');
                socketRef.current.off('connect_failed');
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array means the socket connection is created exactly once

    const handleLanguageSelect = (langId) => {
        setLanguage(langId);
        setIsSelectOpen(false);
        if (socketRef.current) {
            socketRef.current.emit(ACTIONS.LANGUAGE_CHANGE, {
                roomId,
                language: langId,
            });
        }
    };

    const getLanguageDisplayName = (lang) => {
        const selected = languagesList.find(l => l.id === lang);
        return selected ? selected.name : lang;
    };

    const getSelectedLanguageIcon = () => {
        const selected = languagesList.find(l => l.id === language);
        return selected ? selected.icon : null;
    };

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID has been copied to your clipboard');
        } catch (err) {
            toast.error('Could not copy the Room ID');
            console.error(err);
        }
    }

    function leaveRoom() {
        reactNavigator('/');
    }

    const runCode = async () => {
        setIsConsoleOpen(true);
        setIsRunning(true);
        toast.success(`Running code in ${getLanguageDisplayName(language)}...`);
        setLogs([{ type: 'system', text: `Compiling and executing ${getLanguageDisplayName(language)} code...` }]);

        const codeToRun = codeRef.current || '';

        try {
            const backendUrl = getBackendUrl();
            let data;
            try {
                const response = await fetch(`${backendUrl}/compile`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        code: codeToRun,
                        language: language,
                        input: stdin,
                    }),
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                data = await response.json();
            } catch (proxyErr) {
                console.warn('Backend /compile unavailable, executing directly via Wandbox API:', proxyErr);
                const compilerMap = {
                    cpp: 'gcc-13.2.0',
                    c: 'gcc-13.2.0-c',
                    py: 'cpython-3.14.0',
                    java: 'openjdk-jdk-21+35',
                    cs: 'dotnetcore-8.0.402',
                    rust: 'rust-1.82.0',
                    go: 'go-1.23.2',
                    php: 'php-8.3.12',
                    ruby: 'ruby-3.4.9',
                    swift: 'swift-6.0.1',
                    js: 'nodejs-20.17.0',
                };
                const compiler = compilerMap[language];
                if (!compiler) throw proxyErr;

                const wandboxRes = await fetch('https://wandbox.org/api/compile.json', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        compiler,
                        code: codeToRun,
                        stdin: stdin || '',
                    }),
                });
                const wandboxData = await wandboxRes.json();
                data = {};
                if (wandboxData.compiler_error) {
                    data.error = wandboxData.compiler_error;
                } else if (wandboxData.program_error) {
                    data.error = wandboxData.program_error;
                } else if (wandboxData.program_output) {
                    data.output = wandboxData.program_output;
                } else {
                    data.output = '';
                }
            }

            console.log('Compiler Response:', data);

            const consoleLogs = [];
            if (data.error) {
                consoleLogs.push({
                    type: 'error',
                    text: data.error
                });
            } else if (data.output) {
                consoleLogs.push({
                    type: 'log',
                    text: data.output
                });
            } else {
                consoleLogs.push({
                    type: 'system',
                    text: 'Code executed successfully with no output.'
                });
            }

            setLogs(consoleLogs);
        } catch (err) {
            setLogs([{ type: 'error', text: `Failed to compile: ${err.message}` }]);
        } finally {
            setIsRunning(false);
        }
    };

    

    return (
        <>
            {loading && <Preloader message="Connecting to workspace..." />}
            <div className="mainWrap">
                <div className="aside">
                    <div className="asideInner">
                        <div className="logoWrapper">
                            <span className="logoText">Nex<span className="logoAccent">IDE</span></span>
                        </div>

                        <div className="langSelectContainer">
                            <label className="langSelectLabel">Language</label>

                            {/* Premium Custom Dropdown Language Selector */}
                            <div className="customSelectWrapper" ref={dropdownRef}>
                                <button
                                    className={`customSelectBtn ${isSelectOpen ? 'active' : ''}`}
                                    onClick={() => setIsSelectOpen(!isSelectOpen)}
                                >
                                    <span className="customSelectValue">
                                        <span className="langIcon">{getSelectedLanguageIcon()}</span>
                                        {getLanguageDisplayName(language)}
                                    </span>
                                    <span className="customSelectArrow"></span>
                                </button>

                                {isSelectOpen && (
                                    <div className="customSelectDropdown">
                                        {languagesList.map(lang => (
                                            <div
                                                key={lang.id}
                                                className={`customSelectOption ${language === lang.id ? 'selected' : ''}`}
                                                onClick={() => handleLanguageSelect(lang.id)}
                                            >
                                                <span className="langIcon">{lang.icon}</span>
                                                {lang.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <h3>Connected</h3>
                        <div className="clientsList">
                            {clients.map((client) => (
                                <Client
                                    key={client.socketId}
                                    username={client.username}
                                />
                            ))}
                        </div>
                    </div>
                    <button className="btn runBtn" onClick={runCode} disabled={isRunning}>
                        {isRunning ? 'Running...' : 'Run Code'}
                    </button>
                    <button
                        className="btn copyBtn"
                        onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                        style={{ marginBottom: '10px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#a78bfa' }}
                    >
                        {isConsoleOpen ? 'Hide Console' : 'Show Console'}
                    </button>
                    <button className="btn copyBtn" onClick={copyRoomId}>
                        Copy ROOM ID
                    </button>
                    <button className="btn leaveBtn" onClick={leaveRoom}>
                        Leave
                    </button>
                </div>
                <div className="editorWrap">
                    <Editor
                        socket={socket}
                        socketRef={socketRef}
                        roomId={roomId}
                        language={language}
                        onCodeChange={(code) => {
                            codeRef.current = code;
                        }}
                    />

                    {/* Console / Output Runner Panel */}
                    {isConsoleOpen && (
                        <div className="consolePanel">
                            <div className="consoleHeader">
                                <div className="consoleTitle">
                                    <span className={`consoleDot ${isRunning ? 'running' : ''}`}></span>
                                    Console Output & Stdin
                                </div>
                                <button className="consoleCloseBtn" onClick={() => setIsConsoleOpen(false)}>
                                    Dismiss Console
                                </button>
                            </div>
                            <div className="consoleSplit">
                                <div className="consoleInput">
                                    <div className="consoleSectionTitle">Stdin (Input)</div>
                                    <textarea
                                        value={stdin}
                                        onChange={(e) => setStdin(e.target.value)}
                                        placeholder="Type standard input here (e.g. arguments or numbers)..."
                                    />
                                </div>
                                <div className="consoleOutput">
                                    <div className="consoleSectionTitle">Stdout/Stderr (Output)</div>
                                    <div className="consoleBody">
                                        {logs.map((log, index) => (
                                            <div key={index} className={`consoleLine ${log.type}`}>
                                                {log.text}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default EditorPage;