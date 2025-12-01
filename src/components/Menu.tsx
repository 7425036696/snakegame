
import React from 'react';
import { GameMode, Difficulty } from '../types';
import { Gamepad2, Bot, Zap, Skull, Shield } from 'lucide-react';

interface MenuProps {
  onStart: (mode: GameMode, difficulty?: Difficulty) => void;
}

const Menu: React.FC<MenuProps> = ({ onStart }) => {
  const [selectedMode, setSelectedMode] = React.useState<GameMode | null>(null);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4 space-y-8 animate-fade-in z-10 relative">
      <div className="text-center space-y-2">
        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-pink drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] tracking-tighter">
          NEON SNAKE
        </h1>
        <p className="text-gray-400 text-lg md:text-xl font-light tracking-widest uppercase">
          Cyberpunk Battle Arena
        </p>
      </div>

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl shadow-neon-blue/20">
        {!selectedMode ? (
          <div className="space-y-4">
            <button
              onClick={() => onStart(GameMode.SINGLE_PLAYER)}
              className="w-full group relative flex items-center justify-between p-4 bg-slate-800 hover:bg-neon-blue hover:text-black transition-all duration-300 rounded-xl border border-white/5 overflow-hidden"
            >
              <div className="flex items-center gap-4 z-10">
                <Gamepad2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-lg">Single Player</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            </button>

            <button
              onClick={() => setSelectedMode(GameMode.PLAYER_VS_BOT)}
              className="w-full group relative flex items-center justify-between p-4 bg-slate-800 hover:bg-neon-pink hover:text-black transition-all duration-300 rounded-xl border border-white/5"
            >
              <div className="flex items-center gap-4 z-10">
                <Bot className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-lg">Vs AI Bot</span>
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-slide-up">
            <h3 className="text-center text-xl font-bold text-white mb-6">Select AI Difficulty</h3>
            
            <button
              onClick={() => onStart(GameMode.PLAYER_VS_BOT, Difficulty.EASY)}
              className="w-full flex items-center p-4 bg-slate-800 hover:bg-green-400 hover:text-black transition-all rounded-xl border border-green-400/30 gap-4"
            >
              <Shield className="w-6 h-6" />
              <div className="text-left">
                <div className="font-bold">Rookie</div>
                <div className="text-xs opacity-70">For beginners</div>
              </div>
            </button>

            <button
              onClick={() => onStart(GameMode.PLAYER_VS_BOT, Difficulty.MEDIUM)}
              className="w-full flex items-center p-4 bg-slate-800 hover:bg-yellow-400 hover:text-black transition-all rounded-xl border border-yellow-400/30 gap-4"
            >
              <Zap className="w-6 h-6" />
              <div className="text-left">
                <div className="font-bold">Veteran</div>
                <div className="text-xs opacity-70">Balanced challenge</div>
              </div>
            </button>

            <button
              onClick={() => onStart(GameMode.PLAYER_VS_BOT, Difficulty.HARD)}
              className="w-full flex items-center p-4 bg-slate-800 hover:bg-red-500 hover:text-white transition-all rounded-xl border border-red-500/30 gap-4"
            >
              <Skull className="w-6 h-6" />
              <div className="text-left">
                <div className="font-bold">Cyber Psycho</div>
                <div className="text-xs opacity-70">Good luck.</div>
              </div>
            </button>

            <button
              onClick={() => setSelectedMode(null)}
              className="w-full p-2 text-sm text-gray-400 hover:text-white transition-colors mt-4"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
      
      <div className="text-xs text-gray-600 absolute bottom-4">
        Use Arrow Keys to Move
      </div>
    </div>
  );
};

export default Menu;
