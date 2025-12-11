import React, { useState, useEffect } from 'react';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import DarwinModal from './components/DarwinModal';
import './App.css';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const commands = [
    {
      command: ['Hey Darwin', 'Hi Darwin', 'Hey Darling', 'Hey Darin', 'Hey Derwin', 'Darwin'],
      callback: () => {
        console.log("Wake word detected!");
        setIsModalOpen(true);
      },
      matchInterim: true,
      isFuzzyMatch: true,
      fuzzyMatchingThreshold: 0.5,
      bestMatchOnly: false
    }
  ];

  const {
    listening,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition({ commands });

  useEffect(() => {
    if (browserSupportsSpeechRecognition && !listening) {
        // Attempt to start listening. Note: Browsers usually block this without user interaction.
        // We will add a manual start button as fallback/initializer.
        SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
    }
  }, [browserSupportsSpeechRecognition, listening]);

  if (!browserSupportsSpeechRecognition) {
    return <div style={{ color: 'white' }}>Browser doesn't support speech recognition.</div>;
  }

  return (
    <div className="app-container">
       <div className="status-indicator">
          <p>Microphone: {listening ? 'Active' : 'Inactive'}</p>
          <p className="instruction">Say "Hey Darwin" to start.</p>
          {!listening && (
            <button
                className="enable-mic-btn"
                onClick={() => SpeechRecognition.startListening({ continuous: true, language: 'en-US' })}
            >
              Start Listening
            </button>
          )}
       </div>

      <DarwinModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

export default App;
