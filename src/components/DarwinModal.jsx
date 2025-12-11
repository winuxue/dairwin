import React, { useState, useEffect } from 'react';
import './DarwinModal.css';

const DarwinModal = ({ isOpen, onClose }) => {
  const [prompt, setPrompt] = useState('');

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
                // Here we would handle the submission
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default DarwinModal;
