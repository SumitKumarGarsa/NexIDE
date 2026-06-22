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

    useEffect(() => {
        async function init() {
            if (!textareaRef.current) return;
            editorRef.current = Codemirror.fromTextArea(
                textareaRef.current,
                {
                    mode: { name: 'javascript', json: true },
                    theme: 'dracula',
                    autoCloseTags: true,
                    autoCloseBrackets: true,
                    lineNumbers: true,
                }
            );

            editorRef.current.on('change', (instance, changes) => {
                const { origin } = changes;
                const code = instance.getValue();
                onCodeChange(code);
                if (origin !== 'setValue') {
                    if (socketRef && socketRef.current) {
                        socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                            roomId,
                            code,
                        });
                    }
                }
            });
        }
        init();

        return () => {
            if (editorRef.current) {
                editorRef.current.toTextArea();
            }
        };
    }, []);

    useEffect(() => {
        if (editorRef.current) {
            let modeName = 'javascript';
            if (language === 'cpp') {
                modeName = 'text/x-c++src';
            } else if (language === 'c') {
                modeName = 'text/x-csrc';
            } else if (language === 'py') {
                modeName = 'python';
            } else if (language === 'java') {
                modeName = 'text/x-java';
            } else if (language === 'cs') {
                modeName = 'text/x-csharp';
            } else if (language === 'rust') {
                modeName = 'rust';
            } else if (language === 'go') {
                modeName = 'go';
            } else if (language === 'php') {
                modeName = 'php';
            } else if (language === 'ruby') {
                modeName = 'ruby';
            } else if (language === 'swift') {
                modeName = 'swift';
            } else if (language === 'kotlin') {
                modeName = 'text/x-kotlin';
            }
            editorRef.current.setOption('mode', { name: modeName, json: language === 'js' });
        }
    }, [language]);

    useEffect(() => {
        if (socket) {
            socket.on(ACTIONS.CODE_CHANGE, ({ code }) => {
                if (code !== null) {
                    editorRef.current.setValue(code);
                }
            });
        }

        return () => {
            if (socket) {
                socket.off(ACTIONS.CODE_CHANGE);
            }
        };
    }, [socket]);

    return <textarea ref={textareaRef} id="realtimeEditor"></textarea>;
};

export default Editor;
