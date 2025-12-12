import React, { useState, useEffect } from 'react';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import DarwinModal from './components/DarwinModal';
import './App.css';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shouldListen, setShouldListen] = useState(true);
  const [aiMode, setAiMode] = useState('rasa'); // 'rasa' or 'gemini'

  const commands = [
    {
      command: ['Hey Darwin', 'Hi Darwin', 'Hey Darling', 'Hey Darin', 'Hey Derwin', 'Darwin'],
      callback: ({ resetTranscript }) => {
        console.log("Wake word detected!");
        setIsModalOpen(true);
        resetTranscript();
      },
      matchInterim: true,
      isFuzzyMatch: true,
      fuzzyMatchingThreshold: 0.5,
      bestMatchOnly: false
    }
  ];

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition({ commands });

  useEffect(() => {
    if (transcript) {
        console.log("Detected speech:", transcript);
    }
  }, [transcript]);

  // Manage listening state
  useEffect(() => {
    if (!browserSupportsSpeechRecognition) return;

    if (shouldListen && !listening) {
        SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
    } else if (!shouldListen && listening) {
        SpeechRecognition.stopListening();
    }
  }, [shouldListen, listening, browserSupportsSpeechRecognition]);

  if (!browserSupportsSpeechRecognition) {
    return <div style={{ color: 'white' }}>Browser doesn't support speech recognition.</div>;
  }

  const handleModalClose = () => {
    setIsModalOpen(false);
    setShouldListen(true);
  };

  const handleExecution = () => {
    setShouldListen(false);
  };

  return (
    <div className="app-container">
       <div className="status-indicator">
          <p>Microphone: {listening ? 'Active' : 'Inactive'}</p>
          <p className="instruction">Say "Hey Darwin" to start.</p>
          {!listening && shouldListen && (
            <button
                className="enable-mic-btn"
                onClick={() => setShouldListen(true)}
            >
              Start Listening
            </button>
          )}

          <div className="mode-toggle">
            <span className={aiMode === 'rasa' ? 'active' : ''}>Rasa</span>
            <label className="switch">
                <input
                    type="checkbox"
                    checked={aiMode === 'gemini'}
                    onChange={() => setAiMode(prev => prev === 'rasa' ? 'gemini' : 'rasa')}
                />
                <span className="slider round"></span>
            </label>
            <span className={aiMode === 'gemini' ? 'active' : ''}>Gemini</span>
          </div>
       </div>

      <DarwinModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onExecute={handleExecution}
        transcript={transcript}
        resetTranscript={resetTranscript}
        aiMode={aiMode}
      />
    </div>
  );
}

export default App;
