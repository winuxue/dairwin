import React, { useState, useEffect } from 'react';
import './DarwinModal.css';

const DarwinModal = ({ isOpen, onClose, transcript, resetTranscript }) => {
  const [prompt, setPrompt] = useState('');

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
          <input
            type="text"
            className="prompt-input"
            placeholder="Ask Darwin anything..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
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
