/*
Copyright 2026 Benjamin Freeman Bird

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
import { useState, useEffect, useRef } from 'react';
import { fetchAIResponse, fetchVictorySpeech } from './debateEngine';
import type { ChatMessage, DebateTurn } from './debateEngine';
import './App.css';

// --- Custom Typewriter Component ---
const Typewriter = ({
  text,
  speed = 25,
  onComplete,
  isActive
}: {
  text: string;
  speed?: number;
  onComplete?: () => void;
  isActive: boolean;
}) => {
  const [displayedText, setDisplayedText] = useState('');

  // Ref to track if we have already finished typing this specific string
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    setDisplayedText('');
    hasCompletedRef.current = false; // Reset when new text comes in

    if (!text || !isActive) {
      if (!isActive && text) {
        // If not active but has text, just show the full text instantly (no re-typing)
        setDisplayedText(text);
      }
      return;
    }

    let i = 0;
    const typingInterval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typingInterval);

        // Ensure we only fire onComplete ONCE for this text
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          if (onComplete) onComplete();
        }
      }
    }, speed);

    return () => clearInterval(typingInterval);
  }, [text, speed, onComplete, isActive]);

  return <span>{displayedText}</span>;
};

// --- Main App ---
function App() {
  const [topic, setTopic] = useState('');
  const [isDebating, setIsDebating] = useState(false);
  const [round, setRound] = useState(0);
  const MAX_ROUNDS = 3;

  const [washingtonText, setWashingtonText] = useState('');
  const [caesarText, setCaesarText] = useState('');
  const [activeSpeaker, setActiveSpeaker] = useState<'None' | 'Caesar' | 'Washington'>('None');

  const [fullTranscript, setFullTranscript] = useState<DebateTurn[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // THE FIX: Two separate resolvers so they can't trigger each other
  const caesarResolveRef = useRef<(() => void) | null>(null);
  const washResolveRef = useRef<(() => void) | null>(null);

  const waitForCaesar = () => new Promise<void>((resolve) => { caesarResolveRef.current = resolve; });
  const waitForWashington = () => new Promise<void>((resolve) => { washResolveRef.current = resolve; });

  // Auto-scroll transcript AND to winner selection when it appears
  useEffect(() => {
    if (round > MAX_ROUNDS && !isDebating) {
      transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [round]);

  const startDebate = async () => {
    if (!topic || isDebating) return;
    setIsDebating(true);
    setFullTranscript([{ speaker: 'Moderator', text: `Debate Topic: ${topic}` }]);

    const caesarMemory: ChatMessage[] = [];
    const washMemory: ChatMessage[] = [];
    let lastWashReply = "";

    for (let currentRound = 1; currentRound <= MAX_ROUNDS; currentRound++) {
      setRound(currentRound);

      // ==========================================
      // CAESAR'S TURN
      // ==========================================
      setActiveSpeaker('Caesar');
      setCaesarText('');

      if (currentRound === 1) {
        caesarMemory.push({ role: 'user', content: `The topic is: ${topic}. What is your opening argument?` });
      } else {
        caesarMemory.push({ role: 'user', content: `The topic is: ${topic}. Washington just argued: "${lastWashReply}". As Julius Caesar, rebut his argument fiercely in the first person.` });
      }

      const caesarReply = await fetchAIResponse('caesar', caesarMemory);
      setCaesarText(caesarReply);
      caesarMemory.push({ role: 'assistant', content: caesarReply });

      // Wait specifically for Caesar's typewriter
      await waitForCaesar();
      await new Promise(r => setTimeout(r, 1000));
      setFullTranscript(prev => [...prev, { speaker: 'Caesar', text: caesarReply }]);

      // ==========================================
      // WASHINGTON'S TURN
      // ==========================================
      setActiveSpeaker('Washington');
      setWashingtonText('');

      washMemory.push({ role: 'user', content: `The topic is: ${topic}. Caesar just argued: "${caesarReply}". As George Washington, rebut his argument firmly in the first person.` });

      const washingtonReply = await fetchAIResponse('washington', washMemory);
      setWashingtonText(washingtonReply);
      washMemory.push({ role: 'assistant', content: washingtonReply });
      lastWashReply = washingtonReply;

      // Wait specifically for Washington's typewriter
      await waitForWashington();
      await new Promise(r => setTimeout(r, 1000));
      setFullTranscript(prev => [...prev, { speaker: 'Washington', text: washingtonReply }]);
    }

    setIsDebating(false);
    setActiveSpeaker('None');
    setRound(MAX_ROUNDS + 1);
  };

  const handleDeclareWinner = async (winner: 'Caesar' | 'Washington') => {
    setIsDebating(true);
    setWashingtonText('');
    setCaesarText('');
    setActiveSpeaker(winner);

    const victorySpeech = await fetchVictorySpeech(winner, topic);

    if (winner === 'Caesar') {
      setCaesarText(victorySpeech);
      await waitForCaesar(); // Re-use the waiter for the final speech
    } else {
      setWashingtonText(victorySpeech);
      await waitForWashington(); // Re-use the waiter for the final speech
    }

    await new Promise(r => setTimeout(r, 1000));
    setFullTranscript(prev => [...prev, { speaker: 'Moderator', text: `WINNER DECLARED: ${winner}` }, { speaker: winner, text: victorySpeech }]);
    setIsDebating(false);
    setActiveSpeaker('None');
    setRound(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') startDebate();
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Council of History</h1>
        <h2>A Virtual Debate</h2>
        <p>Running Locally via Ollama & NVIDIA Nemotron-Mini</p>

        <div className="input-area">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter a topic (e.g., Is absolute power necessary?)"
            disabled={isDebating || round > 0}
          />
          <button onClick={startDebate} disabled={isDebating || !topic || round > 0}>
            {isDebating && round <= MAX_ROUNDS ? `Debating (Round ${round}/${MAX_ROUNDS})...` : 'Start Debate'}
          </button>
        </div>
      </header>

      <main className="debate-arena">
        {/* Left Side: Caesar */}
        <div className={`character-panel theme-caesar ${activeSpeaker === 'Caesar' ? 'active' : ''}`}>
          <div className="visuals-row">
            <div className="decoration-box left">
              <img src="/resources/images/temple_of_caesar.png" alt="Temple of Caesar" />
            </div>
            <div className="portrait-container">
              <div className="portrait">
                <img src="/resources/images/julius_caesar.png" alt="Caesar" />
              </div>
            </div>
          </div>
          <div className="dialogue-box">
            <h3>Julius Caesar</h3>
            <p>
              <Typewriter
                text={caesarText}
                isActive={activeSpeaker === 'Caesar'}
                onComplete={() => { if (caesarResolveRef.current) caesarResolveRef.current(); }}
              />
              {!caesarText && activeSpeaker !== 'Caesar' && round > 0 && <span className="waiting">Waiting for turn...</span>}
              {activeSpeaker === 'Caesar' && !caesarText && <span className="thinking">Formulating strategy...</span>}
            </p>
          </div>
        </div>

        {/* Right Side: Washington */}
        <div className={`character-panel theme-washington ${activeSpeaker === 'Washington' ? 'active' : ''}`}>
          <div className="visuals-row">
            <div className="portrait-container">
              <div className="portrait">
                <img src="/resources/images/george_washington.png" alt="Washington" />
              </div>
            </div>
            <div className="decoration-box right">
              <img src="/resources/images/cherry_tree.png" alt="Cherry Tree" />
            </div>
          </div>
          <div className="dialogue-box">
            <h3>George Washington</h3>
            <p>
              <Typewriter
                text={washingtonText}
                isActive={activeSpeaker === 'Washington'}
                onComplete={() => { if (washResolveRef.current) washResolveRef.current(); }}
              />
              {!washingtonText && activeSpeaker !== 'Washington' && round > 0 && <span className="waiting">Waiting for turn...</span>}
              {activeSpeaker === 'Washington' && !washingtonText && <span className="thinking">Gathering thoughts...</span>}
            </p>
          </div>
        </div>
      </main>

      {round > MAX_ROUNDS && !isDebating && (
        <div className="winner-selection">
          <h2>The debate has concluded. Who won?</h2>
          <div className="winner-buttons">
            <button className="btn-caesar" onClick={() => handleDeclareWinner('Caesar')}>Crown Caesar</button>
            <button className="btn-washington" onClick={() => handleDeclareWinner('Washington')}>Elect Washington</button>
          </div>
        </div>
      )}
      <div ref={transcriptEndRef} />

      <div className="transcript-log">
        <h3>Debate Transcript</h3>
        <div className="transcript-messages">
          {fullTranscript.map((turn, idx) => (
            <div key={idx} className={`transcript-row ${turn.speaker.toLowerCase()}`}>
              <strong>{turn.speaker}: </strong>
              <span>{turn.text}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default App;