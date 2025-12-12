import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import './DarwinModal.css';

const WAKE_WORDS = ['hey darwin', 'hi darwin', 'hey darling', 'hey darin', 'hey derwin', 'darwin'];

const DarwinModal = ({ isOpen, onClose, onExecute, transcript, resetTranscript, aiMode, sessionKey }) => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const textareaRef = useRef(null);
  const lastProcessedTranscriptRef = useRef('');

  // Handle Session Reset (Wake Word)
  useEffect(() => {
    if (isOpen) {
        setMessages([]);
        setIsThinking(false);
        setPrompt('');
        setHasSubmitted(false);
        lastProcessedTranscriptRef.current = '';
    }
  }, [sessionKey, isOpen]);

  // Sync transcript with local prompt state
  useEffect(() => {
    if (isOpen && !isThinking) {
        if (!transcript) {
            // Transcript was reset (e.g. by manual edit or wake word)
            lastProcessedTranscriptRef.current = '';
            return;
        }

        let cleanTranscript = transcript;

        // Strip wake words from the beginning
        const wakeWordPattern = new RegExp(`^(${WAKE_WORDS.join('|')})[\\s.,]*`, 'i');
        cleanTranscript = cleanTranscript.replace(wakeWordPattern, '');

        // Capitalize only if it's the start
        if (cleanTranscript.length > 0 && lastProcessedTranscriptRef.current === '') {
            cleanTranscript = cleanTranscript.charAt(0).toUpperCase() + cleanTranscript.slice(1);
        }

        const last = lastProcessedTranscriptRef.current;

        // Append logic
        if (cleanTranscript !== last) {
            if (cleanTranscript.startsWith(last)) {
                // Typical append
                const diff = cleanTranscript.slice(last.length);
                setPrompt(prev => prev + diff);
            } else {
                // Correction or jump.
                // We attempt to replace the *last processed part* with the *new transcript*.
                // This is tricky if manual edits happened.
                // Simple heuristic: If prompt ends with 'last', replace it.
                // Otherwise, just append the whole thing?
                // Let's assume standard append behavior for robustness.
                // If it doesn't start with last, it's a correction.
                // We'll trust the engine's new view of the "session".
                // But we must preserve "Manual Edits" that occurred *before* the current voice session.

                // Since we resetTranscript() on manual edit, `last` is usually '' unless we spoke multiple phrases.
                // So if we spoke, `last`="Hello". Transcript becomes "Hello world". Diff=" world".
                // If engine corrects "Hello" to "Hullo", startsWith fails.

                // Fallback: If we can't cleanly diff, we just append the whole cleanTranscript if last was empty.
                if (last === '') {
                     setPrompt(prev => prev + cleanTranscript);
                } else {
                    // Complex correction. For now, let's just append to be safe against losing manual edits.
                    // Or better: Replace the suffix matching `last` with `cleanTranscript`.
                    setPrompt(prev => {
                        if (prev.endsWith(last)) {
                            return prev.slice(0, -last.length) + cleanTranscript;
                        }
                        return prev + " " + cleanTranscript;
                    });
                }
            }
            lastProcessedTranscriptRef.current = cleanTranscript;
        }
    }
  }, [transcript, isOpen, isThinking]);

  const handleExecution = async (cleanPrompt) => {
      console.log(`Execution triggered in ${aiMode} mode. Prompt:`, cleanPrompt);

      // Add to messages
      setMessages(prev => [...prev, { text: cleanPrompt, sender: 'user' }]);

      // Set thinking state
      setIsThinking(true);
      setHasSubmitted(true);

      // Clear input
      setPrompt('');
      resetTranscript();
      lastProcessedTranscriptRef.current = '';

      // Notify parent to stop listening
      if (onExecute) onExecute();

      if (aiMode === 'gemini') {
          await handleGeminiExecution(cleanPrompt);
      } else {
          await handleRasaExecution(cleanPrompt);
      }
  };

  const handleStartOver = () => {
      setHasSubmitted(false);
      setMessages([]);
      setPrompt('');
      resetTranscript();
      lastProcessedTranscriptRef.current = '';
  };

  const handleRasaExecution = async (cleanPrompt) => {
      try {
        const rasaUrl = import.meta.env.VITE_RASA_SERVER_URL || 'http://localhost:5005';
        const response = await fetch(`${rasaUrl}/webhooks/rest/webhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sender: "user",
                message: cleanPrompt
            }),
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        if (data && data.length > 0) {
            const botMessages = data.map(msg => {
                if (msg.custom && msg.custom.type === 'chart' && msg.custom.rows) {
                    return {
                        text: msg.text || '',
                        sender: 'bot',
                        custom: msg.custom
                    };
                }
                return {
                    text: msg.text || "Received non-text response",
                    sender: 'bot'
                };
            });
            setMessages(prev => [...prev, ...botMessages]);
        } else {
             setMessages(prev => [...prev, { text: "No response from AI.", sender: 'bot' }]);
        }

      } catch (error) {
          console.error('Error fetching from Rasa:', error);
          setMessages(prev => [...prev, { text: "Sorry, I'm having trouble connecting to the Rasa server.", sender: 'bot' }]);
      } finally {
          setIsThinking(false);
      }
  };

  const handleGeminiExecution = async (cleanPrompt) => {
      try {
          // 1. Fetch table structure
          let tableStructure = '';
          try {
              const res = await fetch('/sql/rep_propertiesByAgent.sql');
              if (res.ok) {
                  tableStructure = await res.text();
              } else {
                  console.error("Failed to fetch SQL structure file.");
                  tableStructure = "Could not load table structure.";
              }
          } catch (e) {
              console.error("Error fetching SQL file:", e);
              tableStructure = "Error loading table structure.";
          }

          // 2. Call Gemini
          const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
          if (!apiKey || apiKey === 'PLACEHOLDER_KEY') {
             throw new Error("Gemini API Key is missing in .env");
          }

          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

          const promptText = `
You are a SQL Server expert.
Using the following table structure:
\`\`\`sql
${tableStructure}
\`\`\`

Generate a SQL Server query to answer this question: "${cleanPrompt}".
Return ONLY the SQL query, nothing else. Do not use markdown formatting like \`\`\`sql.
          `;

          const result = await model.generateContent(promptText);
          const response = await result.response;
          const text = response.text();

          setMessages(prev => [...prev, { text: text, sender: 'bot' }]);

      } catch (error) {
          console.error('Error fetching from Gemini:', error);
          setMessages(prev => [...prev, { text: `Error: ${error.message}`, sender: 'bot' }]);
      } finally {
          setIsThinking(false);
      }
  };

  // Check for execution command (Voice)
  useEffect(() => {
    if (isOpen && prompt && !isThinking) {
      const lowerPrompt = prompt.toLowerCase();
      if (lowerPrompt.endsWith('execute') || lowerPrompt.endsWith('ejecutar') || lowerPrompt.endsWith(' execute') || lowerPrompt.endsWith(' ejecutar')) {
        let cleanPrompt = prompt;
        // Strip the execution command
        if (lowerPrompt.endsWith('execute')) {
            cleanPrompt = prompt.slice(0, -7).trim();
        } else if (lowerPrompt.endsWith('ejecutar')) {
            cleanPrompt = prompt.slice(0, -8).trim();
        }

        handleExecution(cleanPrompt);
      }
    }
  }, [prompt, isOpen, isThinking]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [prompt, isOpen]);

  const formatNumber = (value) => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value;
  };

  const isNumeric = (value) => {
    return typeof value === 'number';
  };

  const renderTableMessage = (custom) => {
    if (!custom.rows || custom.rows.length === 0) return null;

    const columns = Object.keys(custom.rows[0]);
    const numericColumns = new Set();
    columns.forEach(col => {
      if (custom.rows.some(row => isNumeric(row[col]))) {
        numericColumns.add(col);
      }
    });

    return (
      <div className="table-message-container">
        {custom.title && <div className="table-title">{custom.title}</div>}
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col} className={numericColumns.has(col) ? 'numeric' : ''}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {custom.rows.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {columns.map(col => (
                    <td key={col} className={numericColumns.has(col) ? 'numeric' : ''}>
                      {formatNumber(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <img
          src="/logo.png"
          alt="Darwin Logo"
          className={`logo ${isThinking ? 'thinking' : ''}`}
        />

        <div className="messages-container">
            {messages.map((msg, idx) => (
                <div key={idx} className={`chat-message ${msg.sender}`}>
                    {msg.text && <div>{msg.text}</div>}
                    {msg.custom && msg.custom.type === 'chart' && renderTableMessage(msg.custom)}
                </div>
            ))}
            {isThinking && <div className="thinking-text">Thinking...</div>}
        </div>

        {hasSubmitted ? (
            <button className="start-over-btn" onClick={handleStartOver}>
                Start Over
            </button>
        ) : (
            <div className="input-wrapper">
                <textarea
                    ref={textareaRef}
                    className="prompt-input"
                    placeholder={isThinking ? "" : `Ask Darwin (${aiMode === 'gemini' ? 'Gemini' : 'Rasa'})...`}
                    value={prompt}
                    onChange={(e) => {
                        setPrompt(e.target.value);
                        resetTranscript(); // Reset voice stream on manual edit to avoid conflicts
                    }}
                    autoFocus
                    rows={1}
                    disabled={isThinking}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (prompt.trim()) {
                                handleExecution(prompt);
                            }
                        }
                    }}
                />
            </div>
        )}
      </div>
    </div>
  );
};

export default DarwinModal;
