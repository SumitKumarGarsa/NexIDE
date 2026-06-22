import React from 'react';

const Preloader = ({ message = 'Initializing NexIDE...' }) => {
    return (
        <div className="preloaderWrapper">
            <div className="preloaderContent">
                <svg className="preloaderSpinner" viewBox="0 0 50 50">
                    <circle
                        className="path"
                        cx="25"
                        cy="25"
                        r="20"
                        fill="none"
                        strokeWidth="5"
                    ></circle>
                </svg>
                <h3 className="preloaderText">{message}</h3>
                <p className="preloaderSubtext">Setting up collaborative workspace...</p>
            </div>
        </div>
    );
};

export default Preloader;
