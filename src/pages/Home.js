import React, { useState } from 'react';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { isBackendConfigured } from '../socket';

const Home = () => {
    const navigate = useNavigate();

    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');
    const hasBackend = isBackendConfigured();

    const createNewRoom = (e) => {
        e.preventDefault();
        const id = uuidV4();
        setRoomId(id);
        toast.success('Created a new room');
    };

    const joinRoom = () => {
        if (!roomId || !username) {
            toast.error('ROOM ID & username is required');
            return;
        }

        if (!hasBackend) {
            toast.error(
                'Vercel deployment: REACT_APP_BACKEND_URL is not set. Please deploy the backend server and configure the environment variable in Vercel.',
                { duration: 7000 }
            );
        }

        // Redirect
        navigate(`/editor/${roomId}`, {
            state: {
                username,
            },
        });
    };

    const handleInputEnter = (e) => {
        if (e.code === 'Enter') {
            joinRoom();
        }
    };

    return (
        <div className="homePageWrapper">
            <div className="formWrapper">
                <div className="logoWrapper">
                    <span className="logoText">Nex<span className="logoAccent">IDE</span></span>
                </div>
                <h4 className="mainLabel">Paste invitation ROOM ID</h4>
                <div className="inputGroup">
                    <input
                        type="text"
                        className="inputBox"
                        placeholder="ROOM ID"
                        onChange={(e) => setRoomId(e.target.value)}
                        value={roomId}
                        onKeyUp={handleInputEnter}
                    />
                    <input
                        type="text"
                        className="inputBox"
                        placeholder="USERNAME"
                        onChange={(e) => setUsername(e.target.value)}
                        value={username}
                        onKeyUp={handleInputEnter}
                    />
                    <button className="btn joinBtn" onClick={joinRoom}>
                        Join
                    </button>
                    <span className="createInfo">
                        If you don't have an invite then create &nbsp;
                        <button
                            onClick={createNewRoom}
                            className="createNewBtn"
                            style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', display: 'inline' }}
                        >
                            new room
                        </button>
                    </span>

                    {!hasBackend && (
                        <div style={{
                            marginTop: '16px',
                            padding: '10px 14px',
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '8px',
                            color: '#fca5a5',
                            fontSize: '12px',
                            lineHeight: '1.5',
                            textAlign: 'left'
                        }}>
                            ⚠️ <strong>Backend URL missing:</strong> Real-time collaboration requires a live Socket.IO server. Please set <code>REACT_APP_BACKEND_URL</code> in your Vercel project settings.
                        </div>
                    )}
                </div>
            </div>
            <footer>
                <h4>
                    Developed by <span className="devName">Er. Sumit Kumar Garsa</span>
                </h4>
            </footer>
        </div>
    );
};

export default Home;
