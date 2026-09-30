import React, { useState, useEffect, useRef, useCallback } from 'react';
import { soundManager } from './utils/audio';
import './App.css';

const GAME_DURATION = 30; // 30 seconds
const BASE_SPEED_MS = 1400; // Base interval to move chicken automatically
const MIN_SPEED_MS = 400;   // Fastest interval speed
const SPEED_DECREMENT = 180; // Speedup per 5 points level up

const FUNNY_TAUNTS = [
  "Bawk bawk!",
  "Too slow!",
  "Catch me if you can! 🐔",
  "Cluck cluck!",
  "You missed! 🤪",
  "Feathers flyin'!",
  "I'm fast as lightning!",
  "Nice try, human!",
  "Wing it!",
  "Egg-cellent speed!"
];

const FUNNY_CATCH_TEXTS = [
  "Ouch! Got me! 💥",
  "Squawk! 🐔",
  "Egg-splosive catch!",
  "Feathers everywhere!",
  "You got lucky!",
  "Bawk!! You caught me!"
];

export default function App() {
  const [gameState, setGameState] = useState('IDLE'); // 'IDLE', 'PLAYING', 'GAMEOVER'
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('chicken_high_score') || '0', 10);
  });
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [position, setPosition] = useState({ top: 50, left: 50 });
  const [bubbleText, setBubbleText] = useState("Bawk! Ready?");
  const [floatingEffects, setFloatingEffects] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCaughtAnim, setIsCaughtAnim] = useState(false);

  const gameAreaRef = useRef(null);
  const timerRef = useRef(null);
  const moveTimerRef = useRef(null);

  // Speed level based on score (increases every 5 points)
  const speedLevel = Math.floor(score / 5);
  const moveInterval = Math.max(MIN_SPEED_MS, BASE_SPEED_MS - speedLevel * SPEED_DECREMENT);

  // Move chicken to a random percentage position inside container
  const moveChicken = useCallback(() => {
    // Keep away from standard container padding (e.g., 10% to 85%)
    const newTop = Math.floor(Math.random() * 75) + 10;
    const newLeft = Math.floor(Math.random() * 75) + 10;

    setPosition({ top: newTop, left: newLeft });

    // Random taunt
    if (Math.random() > 0.4) {
      const randomTaunt = FUNNY_TAUNTS[Math.floor(Math.random() * FUNNY_TAUNTS.length)];
      setBubbleText(randomTaunt);
    }
  }, []);

  // Handle game timer
  useEffect(() => {
    if (gameState === 'PLAYING') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [gameState]);

  // Handle chicken automatic random movement
  useEffect(() => {
    if (gameState === 'PLAYING') {
      moveChicken();
      moveTimerRef.current = setInterval(() => {
        moveChicken();
        soundManager.playCluck();
      }, moveInterval);
    } else {
      clearInterval(moveTimerRef.current);
    }

    return () => clearInterval(moveTimerRef.current);
  }, [gameState, moveInterval, moveChicken]);

  // Start new game
  const startGame = () => {
    soundManager.initContext();
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setGameState('PLAYING');
    setBubbleText("Run chicken, run!");
    setFloatingEffects([]);
    moveChicken();
  };

  // End game logic
  const endGame = () => {
    setGameState('GAMEOVER');
    soundManager.playGameOver();
    setHighScore((prev) => {
      const newHigh = Math.max(prev, score);
      localStorage.setItem('chicken_high_score', newHigh.toString());
      return newHigh;
    });
  };

  // Trigger floating +1 effect on click
  const addFloatingEffect = (x, y, text) => {
    const id = Date.now() + Math.random();
    setFloatingEffects((prev) => [...prev, { id, x, y, text }]);
    setTimeout(() => {
      setFloatingEffects((prev) => prev.filter((item) => item.id !== id));
    }, 800);
  };

  // Handle chicken click/catch
  const handleChickenClick = (e) => {
    e.stopPropagation();
    if (gameState !== 'PLAYING') return;

    soundManager.playCatch();

    // Reset move timer so chicken instantly jumps away on catch
    clearInterval(moveTimerRef.current);

    const newScore = score + 1;
    setScore(newScore);

    // Play speed up sound when reaching new speed level (multiple of 5)
    if (newScore > 0 && newScore % 5 === 0) {
      soundManager.playSpeedUp();
      setBubbleText("⚡ SPEED LEVEL UP! ⚡");
    } else {
      const catchText = FUNNY_CATCH_TEXTS[Math.floor(Math.random() * FUNNY_CATCH_TEXTS.length)];
      setBubbleText(catchText);
    }

    // Animation visual pulse
    setIsCaughtAnim(true);
    setTimeout(() => setIsCaughtAnim(false), 200);

    // Add visual +1 feedback where clicked
    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (rect) {
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      addFloatingEffect(clickX, clickY, "+1 Point!");
    }

    // Jump to next location immediately
    moveChicken();
    moveTimerRef.current = setInterval(() => {
      moveChicken();
      soundManager.playCluck();
    }, moveInterval);
  };

  // Toggle Sound
  const toggleSound = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="game-container">
      {/* Header / Score Board */}
      <header className="game-header">
        <div className="title-section">
          <h1>🐔 Catch The Chicken</h1>
          <button className="sound-btn" onClick={toggleSound} title="Toggle Sound">
            {isMuted ? '🔇 Muted' : '🔊 Sound On'}
          </button>
        </div>

        <div className="stats-bar">
          <div className="stat-card">
            <span className="stat-label">⏱️ Time Left</span>
            <span className={`stat-value ${timeLeft <= 5 ? 'timer-warning' : ''}`}>
              {timeLeft}s
            </span>
          </div>

          <div className="stat-card">
            <span className="stat-label">⭐ Score</span>
            <span className="stat-value">{score}</span>
          </div>

          <div className="stat-card">
            <span className="stat-label">🚀 Speed Level</span>
            <span className="stat-value">Lvl {speedLevel + 1}</span>
          </div>

          <div className="stat-card desktop-only">
            <span className="stat-label">🏆 High Score</span>
            <span className="stat-value">{Math.max(highScore, score)}</span>
          </div>
        </div>
      </header>

      {/* Main Game Play Area */}
      <main className="game-area" ref={gameAreaRef}>
        {/* Floating text effects */}
        {floatingEffects.map((item) => (
          <div
            key={item.id}
            className="floating-text"
            style={{ left: `${item.x}px`, top: `${item.y}px` }}
          >
            {item.text}
          </div>
        ))}

        {/* Start Game Overlay */}
        {gameState === 'IDLE' && (
          <div className="overlay start-overlay">
            <h2>Catch the Chicken! 🐣</h2>
            <p>Click the chicken as many times as you can before time runs out!</p>
            <p className="hint">⚡ Warning: The chicken gets faster every 5 points!</p>
            <button className="btn primary-btn" onClick={startGame}>
              ▶️ Start Game
            </button>
          </div>
        )}

        {/* Game Active Chicken */}
        {gameState === 'PLAYING' && (
          <div
            className={`chicken-wrapper ${isCaughtAnim ? 'caught-pop' : ''}`}
            style={{ top: `${position.top}%`, left: `${position.left}%` }}
            onClick={handleChickenClick}
            onTouchStart={handleChickenClick}
          >
            <div className="speech-bubble">{bubbleText}</div>
            <div className="chicken-avatar" role="img" aria-label="Chicken">
              🐓
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState === 'GAMEOVER' && (
          <div className="overlay gameover-overlay">
            <h2>💥 Game Over! 💥</h2>
            <div className="final-score-card">
              <p className="score-heading">Your Score</p>
              <p className="final-score">{score}</p>
              <p className="high-score-tag">
                {score > 0 && score >= highScore ? '🎉 NEW HIGH SCORE! 🎉' : `Best Score: ${highScore}`}
              </p>
            </div>
            <div className="game-over-quote">
              {score >= 25 ? "🔥 Wow, ultimate chicken master!" :
               score >= 15 ? "🐔 Great job! Feather-rific!" :
               score >= 5  ? "🌾 Not bad! The chicken was tricky!" :
               "🐣 Quick, try again!"}
            </div>
            <button className="btn primary-btn restart-btn" onClick={startGame}>
              🔄 Play Again / Restart
            </button>
          </div>
        )}
      </main>

      {/* Footer Instructions */}
      <footer className="game-footer">
        <p>Tip: Click or tap the chicken before it vanishes! Speed increases every 5 catches.</p>
      </footer>
    </div>
  );
}
