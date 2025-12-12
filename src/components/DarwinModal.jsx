import React, { useState, useEffect, useRef } from 'react';
import './DarwinModal.css';

const WAKE_WORDS = ['hey darwin', 'hi darwin', 'hey darling', 'hey darin', 'hey derwin', 'darwin'];

const DarwinModal = ({ isOpen, onClose, onExecute, transcript, resetTranscript }) => {
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
      console.log('Execution triggered. Prompt:', cleanPrompt);

      // Add to messages
      setMessages(prev => [...prev, { text: cleanPrompt, sender: 'user' }]);

      // Set thinking state
      setIsThinking(true);

      // Clear input
      setPrompt('');
      resetTranscript();

      // Notify parent to stop listening
      if (onExecute) onExecute();

      // Send to Rasa
      try {
        const response = await fetch('http://localhost:5005/webhooks/rest/webhook', {
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
          setMessages(prev => [...prev, { text: "Sorry, I'm having trouble connecting to the server.", sender: 'bot' }]);
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
            placeholder={isThinking ? "" : "Ask Darwin anything..."}
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
