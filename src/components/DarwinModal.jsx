import React, { useState, useEffect, useRef } from 'react';
import './DarwinModal.css';

const DarwinModal = ({ isOpen, onClose, transcript, resetTranscript }) => {
  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef(null);

  // Sync transcript with local prompt state
  useEffect(() => {
    if (isOpen && transcript) {
      setPrompt(transcript);
    }
  }, [transcript, isOpen]);

  // Check for execution command
  useEffect(() => {
    if (isOpen && prompt) {
      const lowerPrompt = prompt.toLowerCase();
      if (lowerPrompt.endsWith('execute') || lowerPrompt.endsWith('ejecutar') || lowerPrompt.endsWith(' execute') || lowerPrompt.endsWith(' ejecutar')) {
        // Extract the clean command (remove the trigger word)
        // We handle both "execute" and "ejecutar"
        let cleanPrompt = prompt;
        if (lowerPrompt.endsWith('execute')) {
            cleanPrompt = prompt.slice(0, -7).trim();
        } else if (lowerPrompt.endsWith('ejecutar')) {
            cleanPrompt = prompt.slice(0, -8).trim();
        }

        console.log('Voice execution triggered. Prompt:', cleanPrompt);
        // Clear the input and transcript
        setPrompt('');
        resetTranscript();

        // Optionally close the modal or keep it open for results.
        // For now, we will just log the execution as requested.
      }
    }
  }, [prompt, isOpen, resetTranscript]);

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
          className="logo"
        />
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            className="prompt-input"
            placeholder="Ask Darwin anything..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            autoFocus
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                console.log('User asked:', prompt);
                setPrompt('');
                resetTranscript();
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default DarwinModal;
