import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import './DarwinModal.css';

const WAKE_WORDS = ['hey darwin', 'hi darwin', 'hey darling', 'hey darin', 'hey derwin', 'darwin'];

const DarwinModal = ({ isOpen, onClose, onExecute, transcript, resetTranscript, aiMode }) => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const textareaRef = useRef(null);

  // Sync transcript with local prompt state and clean wake words
  useEffect(() => {
    if (isOpen && !isThinking) {
        // If transcript is empty (reset), prompt should be empty
        if (!transcript) {
            setPrompt('');
            return;
        }

        let cleanTranscript = transcript;

        // Strip wake words from the beginning
        const wakeWordPattern = new RegExp(`^(${WAKE_WORDS.join('|')})[\\s.,]*`, 'i');
        cleanTranscript = cleanTranscript.replace(wakeWordPattern, '');

        // Capitalize the first letter if we stripped something and it's not empty
        if (cleanTranscript.length > 0) {
            cleanTranscript = cleanTranscript.charAt(0).toUpperCase() + cleanTranscript.slice(1);
        }

        setPrompt(cleanTranscript);
    }
  }, [transcript, isOpen, isThinking]);

  const handleExecution = async (cleanPrompt) => {
      console.log(`Execution triggered in ${aiMode} mode. Prompt:`, cleanPrompt);

      // Add to messages
      setMessages(prev => [...prev, { text: cleanPrompt, sender: 'user' }]);

      // Set thinking state
      setIsThinking(true);

      // Clear input
      setPrompt('');
      resetTranscript();

      // Notify parent to stop listening
      if (onExecute) onExecute();

      if (aiMode === 'gemini') {
          await handleGeminiExecution(cleanPrompt);
      } else {
          await handleRasaExecution(cleanPrompt);
      }
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
            // Append bot messages
            const botMessages = data.map(msg => ({ text: msg.text || "Received non-text response", sender: 'bot' }));
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
          const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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

  // Check for execution command
  useEffect(() => {
    if (isOpen && prompt && !isThinking) {
      const lowerPrompt = prompt.toLowerCase();
      if (lowerPrompt.endsWith('execute') || lowerPrompt.endsWith('ejecutar') || lowerPrompt.endsWith(' execute') || lowerPrompt.endsWith(' ejecutar')) {
        let cleanPrompt = prompt;
        if (lowerPrompt.endsWith('execute')) {
            cleanPrompt = prompt.slice(0, -7).trim();
        } else if (lowerPrompt.endsWith('ejecutar')) {
            cleanPrompt = prompt.slice(0, -8).trim();
        }

        handleExecution(cleanPrompt);
      }
    }
  }, [prompt, isOpen, isThinking]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
        setMessages([]);
        setIsThinking(false);
        setPrompt('');
    }
  }, [isOpen]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [prompt, isOpen]);

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
                    {msg.text}
                </div>
            ))}
            {isThinking && <div className="thinking-text">Thinking...</div>}
        </div>

        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            className="prompt-input"
            placeholder={isThinking ? "" : `Ask Darwin (${aiMode === 'gemini' ? 'Gemini' : 'Rasa'})...`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
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
      </div>
    </div>
  );
};

export default DarwinModal;
