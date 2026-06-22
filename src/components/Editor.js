import React, { useEffect, useRef } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/python/python';
import 'codemirror/mode/rust/rust';
import 'codemirror/mode/go/go';
import 'codemirror/mode/php/php';
import 'codemirror/mode/ruby/ruby';
import 'codemirror/mode/swift/swift';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import ACTIONS from '../Actions';

const Editor = ({ socket, socketRef, roomId, language, onCodeChange }) => {
    const editorRef = useRef(null);
    const textareaRef = useRef(null);
    // Use a ref to hold the latest onCodeChange callback to avoid stale closures
    const onCodeChangeRef = useRef(onCodeChange);
    useEffect(() => {
        onCodeChangeRef.current = onCodeChange;
    }, [onCodeChange]);

    // Initialize CodeMirror once on mount
    useEffect(() => {
        if (!textareaRef.current) return;

        editorRef.current = Codemirror.fromTextArea(textareaRef.current, {
            mode: { name: 'javascript', json: true },
            theme: 'dracula',
            autoCloseTags: true,
            autoCloseBrackets: true,
            lineNumbers: true,
            lineWrapping: false,
            extraKeys: { 'Ctrl-Space': 'autocomplete' },
        });

        // Make the editor fill all available height
        editorRef.current.setSize('100%', '100%');

        editorRef.current.on('change', (instance, changes) => {
            const { origin } = changes;
            const code = instance.getValue();
            // Always call the latest onCodeChange via ref (no stale closure)
            onCodeChangeRef.current(code);
            if (origin !== 'setValue') {
                if (socketRef && socketRef.current) {
                    socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                        roomId,
                        code,
                    });
                }
            }
        });

        return () => {
            if (editorRef.current) {
                editorRef.current.toTextArea();
                editorRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update editor syntax mode when language changes
    useEffect(() => {
        if (!editorRef.current) return;

        const modeMap = {
            js: { name: 'javascript', json: false },
            cpp: { name: 'text/x-c++src' },
            c: { name: 'text/x-csrc' },
            py: { name: 'python' },
            java: { name: 'text/x-java' },
            cs: { name: 'text/x-csharp' },
            rust: { name: 'rust' },
            go: { name: 'go' },
            php: { name: 'php' },
            ruby: { name: 'ruby' },
            swift: { name: 'swift' },
        };

        const mode = modeMap[language] || { name: 'javascript' };
        editorRef.current.setOption('mode', mode);
    }, [language]);

    // Listen for incoming code changes from other clients
    useEffect(() => {
        if (!socket) return;

        const handleCodeChange = ({ code }) => {
            if (code !== null && editorRef.current) {
                const currentValue = editorRef.current.getValue();
                // Only update if content actually differs to avoid cursor jump
                if (currentValue !== code) {
                    editorRef.current.setValue(code);
                }
            }
        };

        socket.on(ACTIONS.CODE_CHANGE, handleCodeChange);

        return () => {
            socket.off(ACTIONS.CODE_CHANGE, handleCodeChange);
        };
    }, [socket]);

    return (
        <div className="editorContainer">
            <textarea ref={textareaRef} id="realtimeEditor"></textarea>
        </div>
    );
};

export default Editor;
