
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Menu from './components/Menu';
import GameCanvas from './components/GameCanvas';
import { GameMode, Difficulty, GameStatus, Direction } from './types';
import type{ Snake, Point, Particle } from './types';


import { GRID_SIZE, INITIAL_SPEED, COLORS, P1_START_POS, P2_START_POS, SPEED_INCREMENT, MIN_SPEED } from './constants';
import { getBotMove } from './services/botService';
import { initAudio, playEatSound, playDieSound, playWinSound, playGameOverSound } from './services/audioService';
import { RotateCcw, Pause, Play, Home, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Hand } from 'lucide-react';

const App: React.FC = () => {
  // Game Configuration State
  const [mode, setMode] = useState<GameMode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  
  // Game Logic State
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [food, setFood] = useState<Point>({ x: 10, y: 10 });
  const [score, setScore] = useState<number[]>([0, 0]);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('snake_highscore') || '0');
  });
  
  // Visual Effects
  const [particles, setParticles] = useState<Particle[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  
  // Visual Tick for Animations (60fps)
  const [_visualTick, setVisualTick] = useState(0);
  const [flashIntensity, setFlashIntensity] = useState(0); // 0.0 to 1.0
  
  // Canvas sizing
  const [canvasSize, setCanvasSize] = useState(600);
  const containerRef = useRef<HTMLDivElement>(null);

  // Refs for loop management
  const snakesRef = useRef<Snake[]>([]);
  const statusRef = useRef<GameStatus>(GameStatus.MENU);
  const speedRef = useRef<number>(INITIAL_SPEED);
  const lastUpdateRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // Touch handling refs
  const touchStartRef = useRef<{ x: number, y: number } | null>(null);

  // Handle Resize
  const handleResize = useCallback(() => {
    if (containerRef.current) {
      // Calculate available space
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // On mobile, we want to maximize width. 
      // Reserve space for header (~80px) and controls (~150px) if in portrait.
      // In landscape, height is the limiting factor.
      
      const isLandscape = width > height;
      const horizontalPadding = 32;
      const verticalPadding = isLandscape ? 40 : 240; // More space for controls in portrait

      const maxWidth = width - horizontalPadding;
      const maxHeight = height - verticalPadding;

      const size = Math.min(maxWidth, maxHeight);
      setCanvasSize(Math.max(300, size));
    }
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Spawn Food
  const spawnFood = useCallback((currentSnakes: Snake[]) => {
    let newFood: Point;
    let isValid = false;
    let attempts = 0;
    
    // Safety break
    while (!isValid && attempts < 100) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      isValid = true;
      for (const snake of currentSnakes) {
        for (const segment of snake.body) {
          if (segment.x === newFood.x && segment.y === newFood.y) {
            isValid = false;
            break;
          }
        }
      }
      attempts++;
      if (isValid) setFood(newFood);
    }
  }, []);

  // Initialize Game
  const startGame = (selectedMode: GameMode, diff: Difficulty = Difficulty.MEDIUM) => {
    initAudio(); // Initialize AudioContext on user interaction
    setMode(selectedMode);
    setDifficulty(diff);
    setStatus(GameStatus.PLAYING);
    statusRef.current = GameStatus.PLAYING;
    setScore([0, 0]);
    setWinner(null);
    setParticles([]);
    setFlashIntensity(0);
    speedRef.current = INITIAL_SPEED;

    const initialSnakes: Snake[] = [
      {
        id: 1,
        body: JSON.parse(JSON.stringify(P1_START_POS)),
        direction: Direction.UP,
        nextDirection: Direction.UP,
        color: COLORS.P1,
        score: 0,
        isDead: false,
        isBot: false,
        name: 'Player 1'
      }
    ];

    if (selectedMode === GameMode.PLAYER_VS_BOT) {
      initialSnakes.push({
        id: 2,
        body: JSON.parse(JSON.stringify(P2_START_POS)),
        direction: Direction.UP,
        nextDirection: Direction.UP,
        color: COLORS.P2,
        score: 0,
        isDead: false,
        isBot: true,
        name: 'Bot'
      });
    }

    setSnakes(initialSnakes);
    snakesRef.current = initialSnakes;
    spawnFood(initialSnakes);
    lastUpdateRef.current = performance.now();
    cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(update);
  };

  const quitGame = () => {
    setStatus(GameStatus.MENU);
    statusRef.current = GameStatus.MENU;
    cancelAnimationFrame(animationFrameRef.current);
  };

  const togglePause = () => {
    if (status === GameStatus.PLAYING) {
      setStatus(GameStatus.PAUSED);
      statusRef.current = GameStatus.PAUSED;
    } else if (status === GameStatus.PAUSED) {
      setStatus(GameStatus.PLAYING);
      statusRef.current = GameStatus.PLAYING;
      lastUpdateRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(update);
    }
  };

  const restartGame = () => {
    if (mode) startGame(mode, difficulty);
  };

  // Create Explosion Effect
  const createExplosion = (x: number, y: number, color: string) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 15; i++) {
      newParticles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        life: 1.0,
        color
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  // Game Loop
  const update = useCallback((time: number) => {
    if (statusRef.current !== GameStatus.PLAYING) {
      return;
    }
    
    // Always run visual updates (60fps)
    setVisualTick(t => t + 1);
    
    // Decay flash
    setFlashIntensity(prev => {
        if (prev <= 0.01) return 0;
        return prev * 0.92; // Rapid decay
    });

    // Update particles
    setParticles(prev => prev.map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      life: p.life - 0.04
    })).filter(p => p.life > 0));

    const delta = time - lastUpdateRef.current;
    
    if (delta > speedRef.current) {
      lastUpdateRef.current = time;
      
      const currentSnakes = snakesRef.current.map(s => ({
        ...s, 
        body: [...s.body] // Deep copy body array
      }));
      
      let foodEaten = false;
      let gameOver = false;
      let gameWinner = null;

      // 1. Determine Directions
      currentSnakes.forEach(snake => {
        if (snake.isDead) return;

        if (snake.isBot) {
           const opponent = currentSnakes.find(s => s.id !== snake.id) || null;
           const move = getBotMove(snake, opponent, food, difficulty);
           snake.direction = move;
        } else {
           // Prevent 180 turn
           const nd = snake.nextDirection;
           const cd = snake.direction;
           const isOpposite = 
             (nd === Direction.UP && cd === Direction.DOWN) ||
             (nd === Direction.DOWN && cd === Direction.UP) ||
             (nd === Direction.LEFT && cd === Direction.RIGHT) ||
             (nd === Direction.RIGHT && cd === Direction.LEFT);
           
           if (!isOpposite) {
             snake.direction = nd;
           }
        }
      });

      // 2. Move Snakes
      currentSnakes.forEach(snake => {
        if (snake.isDead) return;

        const head = snake.body[0];
        let newHead = { ...head };

        switch (snake.direction) {
          case Direction.UP: newHead.y -= 1; break;
          case Direction.DOWN: newHead.y += 1; break;
          case Direction.LEFT: newHead.x -= 1; break;
          case Direction.RIGHT: newHead.x += 1; break;
        }
        
        snake.body.unshift(newHead);
        
        // Check Food
        if (newHead.x === food.x && newHead.y === food.y) {
          snake.score += 10;
          foodEaten = true;
          setFlashIntensity(0.5); // Flash on eat
          playEatSound();
          createExplosion(newHead.x, newHead.y, COLORS.FOOD);
          speedRef.current = Math.max(MIN_SPEED, speedRef.current - SPEED_INCREMENT);
        } else {
          snake.body.pop();
        }
      });

      // 3. Collision Detection
      const aliveSnakes = currentSnakes.filter(s => !s.isDead);
      
      aliveSnakes.forEach(snake => {
        const head = snake.body[0];
        let diedNow = false;

        // Wall Collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          snake.isDead = true;
          diedNow = true;
          createExplosion(head.x, head.y, snake.color);
        }

        // Body Collisions
        if (!diedNow) {
          currentSnakes.forEach(otherSnake => {
            if (otherSnake.isDead && otherSnake.body.length === 0) return;
            
            // Skip checking head against own head
            const startIdx = (otherSnake.id === snake.id) ? 1 : 0;
            
            for (let i = startIdx; i < otherSnake.body.length; i++) {
              const segment = otherSnake.body[i];
              if (head.x === segment.x && head.y === segment.y) {
                snake.isDead = true;
                diedNow = true;
                createExplosion(head.x, head.y, snake.color);
              }
            }
          });
        }
        
        if (diedNow) {
          playDieSound();
          setFlashIntensity(1.0); // Big flash on death
        }
      });

      // 4. Update Game State / Check Win
      const s1 = currentSnakes.find(s => s.id === 1);
      const s2 = currentSnakes.find(s => s.id === 2);

      if (mode === GameMode.SINGLE_PLAYER) {
        if (s1?.isDead) {
          gameOver = true;
          gameWinner = null;
        }
      } else {
        // Bot Mode
        if (s1?.isDead && s2?.isDead) {
          gameOver = true;
          gameWinner = "Draw!";
        } else if (s1?.isDead) {
          gameOver = true;
          gameWinner = `Bot Wins!`;
        } else if (s2?.isDead) {
          gameOver = true;
          gameWinner = `You Win!`;
        }
      }

      if (foodEaten && !gameOver) {
        spawnFood(currentSnakes);
      }

      snakesRef.current = currentSnakes;
      setSnakes(currentSnakes);
      setScore(currentSnakes.map(s => s.score));

      if (gameOver) {
        setStatus(GameStatus.GAME_OVER);
        statusRef.current = GameStatus.GAME_OVER;
        setWinner(gameWinner);
        
        if (gameWinner && gameWinner !== "Draw!" && !gameWinner.includes("Bot")) {
            playWinSound();
        } else if (mode === GameMode.SINGLE_PLAYER && highScore < (s1?.score || 0)) {
            playWinSound();
        } else {
            playGameOverSound();
        }
        
        const currentMax = Math.max(...currentSnakes.map(s => s.score));
        if (currentMax > highScore) {
          setHighScore(currentMax);
          localStorage.setItem('snake_highscore', currentMax.toString());
        }
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(update);
  }, [food, mode, difficulty, highScore, spawnFood]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow exiting menu or game over with Escape
      if (e.key === 'Escape') {
         if (statusRef.current === GameStatus.PLAYING) togglePause();
         else if (statusRef.current === GameStatus.PAUSED) quitGame();
      }

      if (statusRef.current !== GameStatus.PLAYING) return;

      const snakes = snakesRef.current;
      const s1 = snakes.find(s => s.id === 1);

      const isArrow = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key);

      if (isArrow || e.code === "Space") e.preventDefault();

      // P1 Controls (Arrows or WASD)
      if (s1 && !s1.isDead && !s1.isBot) {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') s1.nextDirection = Direction.UP;
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') s1.nextDirection = Direction.DOWN;
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') s1.nextDirection = Direction.LEFT;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') s1.nextDirection = Direction.RIGHT;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode]);

  // Start loop once
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [update]);

  // Touch Controls Handler (D-Pad)
  const handleTouchControl = (dir: Direction) => {
    if (statusRef.current !== GameStatus.PLAYING) return;
    initAudio(); // Ensure audio is ready
    const s1 = snakesRef.current.find(s => s.id === 1);
    if (s1) s1.nextDirection = dir;
  };

  // Swipe Handler
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartRef.current.x;
    const diffY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Minimum swipe distance threshold
    const threshold = 30;
    if (Math.abs(diffX) < threshold && Math.abs(diffY) < threshold) return; // Tap treated as ignore here

    const s1 = snakesRef.current.find(s => s.id === 1);
    if (!s1 || s1.isDead || s1.isBot) return;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      // Horizontal
      if (diffX > 0 && s1.direction !== Direction.LEFT) s1.nextDirection = Direction.RIGHT;
      else if (diffX < 0 && s1.direction !== Direction.RIGHT) s1.nextDirection = Direction.LEFT;
    } else {
      // Vertical
      if (diffY > 0 && s1.direction !== Direction.UP) s1.nextDirection = Direction.DOWN;
      else if (diffY < 0 && s1.direction !== Direction.DOWN) s1.nextDirection = Direction.UP;
    }
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-screen bg-neon-dark overflow-hidden flex flex-col items-center select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900/50 to-black z-0" />
      
      {/* Header */}
      <div className="z-10 w-full max-w-4xl p-2 md:p-4 flex justify-between items-center text-white shrink-0">
        <div className="flex items-center gap-2 md:gap-4">
           {status !== GameStatus.MENU && (
             <button onClick={quitGame} className="p-2 hover:bg-white/10 rounded-full transition-colors z-20">
               <Home className="w-5 h-5 md:w-6 md:h-6 text-neon-blue" />
             </button>
           )}
           <div className="flex flex-col">
             <span className="text-[10px] md:text-xs text-gray-400 uppercase tracking-widest">High Score</span>
             <span className="text-xl md:text-2xl font-black font-mono text-neon-yellow">{highScore}</span>
           </div>
        </div>
        
        {status !== GameStatus.MENU && (
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex flex-col items-end">
               <span className="text-[10px] md:text-xs text-neon-blue uppercase tracking-widest">YOU</span>
               <span className="text-xl md:text-xl font-bold font-mono">{score[0]}</span>
            </div>
            {mode === GameMode.PLAYER_VS_BOT && (
              <div className="flex flex-col items-start">
                 <span className="text-[10px] md:text-xs text-neon-pink uppercase tracking-widest">BOT</span>
                 <span className="text-xl md:text-xl font-bold font-mono">{score[1]}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Game Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full min-h-0">
        
        {status === GameStatus.MENU && <Menu onStart={startGame} />}

        {(status === GameStatus.PLAYING || status === GameStatus.PAUSED || status === GameStatus.GAME_OVER) && (
          <>
            <div className="relative">
               <GameCanvas 
                  snakes={snakes} 
                  food={food} 
                  particles={particles}
                  width={canvasSize}
                  height={canvasSize}
                  flashIntensity={flashIntensity}
                />
               
               {/* Pause Overlay */}
               {status === GameStatus.PAUSED && (
                 <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white rounded-lg z-30">
                   <Pause className="w-16 h-16 text-neon-blue mb-4 animate-pulse" />
                   <h2 className="text-3xl font-black uppercase tracking-widest mb-8">Paused</h2>
                   <div className="flex gap-4">
                     <button onClick={togglePause} className="px-6 py-2 bg-neon-blue text-black font-bold rounded hover:bg-white transition-colors flex items-center gap-2">
                       <Play className="w-4 h-4" /> Resume
                     </button>
                     <button onClick={quitGame} className="px-6 py-2 border border-white/20 hover:bg-white/10 rounded transition-colors">
                       Quit
                     </button>
                   </div>
                 </div>
               )}

               {/* Game Over Overlay */}
               {status === GameStatus.GAME_OVER && (
                 <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white rounded-lg animate-fade-in z-30">
                   <h2 className="text-4xl font-black uppercase tracking-tighter mb-2 text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-pink">
                     Game Over
                   </h2>
                   {winner && (
                     <p className="text-xl text-neon-yellow font-bold mb-6 animate-pulse-fast">{winner}</p>
                   )}
                   
                   <div className="flex flex-col gap-3 w-48">
                     <button onClick={restartGame} className="px-6 py-3 bg-neon-green text-black font-bold rounded hover:scale-105 transition-transform flex items-center justify-center gap-2">
                       <RotateCcw className="w-5 h-5" /> Play Again
                     </button>
                     <button onClick={quitGame} className="px-6 py-3 border border-white/20 hover:bg-white/10 rounded transition-colors flex items-center justify-center gap-2">
                       <Home className="w-5 h-5" /> Main Menu
                     </button>
                   </div>
                 </div>
               )}
            </div>

            {/* Mobile Hint */}
            {status === GameStatus.PLAYING && (
              <div className="md:hidden mt-2 text-xs text-white/40 flex items-center gap-2 animate-pulse">
                <Hand className="w-3 h-3" /> Swipe or use D-Pad
              </div>
            )}

            {/* Mobile/Touch Controls */}
            {status === GameStatus.PLAYING && (
               <div className="mt-4 md:hidden grid grid-cols-3 gap-1 w-48 shrink-0 z-20">
                  <div className="col-start-2 flex justify-center">
                    <button 
                      className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center active:bg-neon-blue/30 active:scale-95 transition-all"
                      onTouchStart={(e) => { e.stopPropagation(); handleTouchControl(Direction.UP); }}
                    >
                      <ChevronUp className="w-8 h-8 text-white/80" />
                    </button>
                  </div>
                  <div className="col-start-1 row-start-2 flex justify-center">
                    <button 
                      className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center active:bg-neon-blue/30 active:scale-95 transition-all"
                      onTouchStart={(e) => { e.stopPropagation(); handleTouchControl(Direction.LEFT); }}
                    >
                      <ChevronLeft className="w-8 h-8 text-white/80" />
                    </button>
                  </div>
                  <div className="col-start-2 row-start-2 flex justify-center">
                    <button 
                      className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center active:bg-neon-blue/30 active:scale-95 transition-all"
                      onTouchStart={(e) => { e.stopPropagation(); handleTouchControl(Direction.DOWN); }}
                    >
                      <ChevronDown className="w-8 h-8 text-white/80" />
                    </button>
                  </div>
                  <div className="col-start-3 row-start-2 flex justify-center">
                    <button 
                      className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center active:bg-neon-blue/30 active:scale-95 transition-all"
                      onTouchStart={(e) => { e.stopPropagation(); handleTouchControl(Direction.RIGHT); }}
                    >
                      <ChevronRight className="w-8 h-8 text-white/80" />
                    </button>
                  </div>
               </div>
            )}
            
            {/* Desktop Controls Hint */}
            {status === GameStatus.PLAYING && (
              <div className="hidden md:flex gap-4 mt-4 text-xs text-gray-500 font-mono">
                 <div className="flex items-center gap-1">
                    <span className="px-2 py-1 bg-white/10 rounded">ARROWS/WASD</span> <span>MOVE</span>
                 </div>
                 <div className="flex items-center gap-1">
                    <span className="px-2 py-1 bg-white/10 rounded">SPACE</span> <span>PAUSE</span>
                 </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default App;
