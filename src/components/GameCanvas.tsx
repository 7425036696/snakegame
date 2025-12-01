
import React, { useRef, useEffect } from 'react';
import type{ Snake, Point, Particle } from '../types';
import { Direction } from '../types';
import { GRID_SIZE, COLORS } from '../constants';

interface GameCanvasProps {
  snakes: Snake[];
  food: Point;
  particles: Particle[];
  width: number;
  height: number;
  flashIntensity: number; // 0.0 to 1.0
  onSetDirection?: (dir: typeof Direction[keyof typeof Direction]) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ snakes, food, particles, width, height, flashIntensity, onSetDirection }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerDownRef = useRef(false);

  // cellSize is useful both for rendering and for pointer -> grid calculations
  const cellSize = width / GRID_SIZE;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no transparency on bg
    if (!ctx) return;

    // --- Render Config ---
    // const cellSize = width / GRID_SIZE; (moved up)
    const time = Date.now();
    
    // Global Pulse (Breathing effect)
    const basePulse = Math.sin(time / 500) * 0.1 + 0.9; // 0.8 to 1.0

    // Clear Canvas with Fade effect for trails? No, strict clear for crisp movement.
    ctx.fillStyle = COLORS.GRID;
    ctx.fillRect(0, 0, width, height);

    // Enable Additive Blending for Neon Glow overlap
    ctx.globalCompositeOperation = 'lighter';

    // --- Draw Grid ---
    // Make grid react to flash
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(0, 243, 255, ${0.03 + flashIntensity * 0.1})`;
    ctx.shadowBlur = 0;
    
    ctx.beginPath();
    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * cellSize;
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, height);
      ctx.moveTo(0, pos);
      ctx.lineTo(width, pos);
    }
    ctx.stroke();

    // --- Draw Food ---
    const foodX = food.x * cellSize + cellSize / 2;
    const foodY = food.y * cellSize + cellSize / 2;
    
    // Intense Food Pulse
    const foodPulse = Math.sin(time / 100) * 0.2 + 1.0 + flashIntensity; // Fast pulse + flash
    const foodRadius = (cellSize / 2.5) * foodPulse;

    ctx.shadowColor = COLORS.FOOD;
    ctx.shadowBlur = 20 * foodPulse;
    ctx.fillStyle = COLORS.FOOD;
    
    ctx.beginPath();
    ctx.arc(foodX, foodY, Math.max(0, foodRadius), 0, Math.PI * 2);
    ctx.fill();

    // White core for food
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(foodX, foodY, Math.max(0, foodRadius * 0.5), 0, Math.PI * 2);
    ctx.fill();

    // --- Draw Snakes ---
    snakes.forEach(snake => {
      if (snake.isDead) return;

      // Draw continuous path for body
      if (snake.body.length < 1) return;

      const path = new Path2D();
      // Start at center of head segment
      path.moveTo(
        snake.body[0].x * cellSize + cellSize / 2, 
        snake.body[0].y * cellSize + cellSize / 2
      );
      
      for (let i = 1; i < snake.body.length; i++) {
        path.lineTo(
          snake.body[i].x * cellSize + cellSize / 2,
          snake.body[i].y * cellSize + cellSize / 2
        );
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 1. Outer Glow (Wide, colored, soft)
      ctx.shadowColor = snake.color;
      ctx.shadowBlur = (20 + flashIntensity * 20) * basePulse;
      ctx.strokeStyle = snake.color;
      ctx.lineWidth = cellSize * 0.8;
      ctx.globalAlpha = 0.4;
      ctx.stroke(path);

      // 2. Inner Glow (Tighter, colored, bright)
      ctx.shadowBlur = (10 + flashIntensity * 10) * basePulse;
      ctx.lineWidth = cellSize * 0.6;
      ctx.globalAlpha = 0.8;
      ctx.stroke(path);

      // 3. Core (Thin, white, hot center)
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = cellSize * 0.25;
      ctx.globalAlpha = 1.0;
      ctx.stroke(path);

      // --- Draw Eyes on Head ---
      const head = snake.body[0];
      const hx = head.x * cellSize;
      const hy = head.y * cellSize;
      
      // Calculate eye positions based on direction
      const eyeSize = cellSize * 0.15;
      let eye1 = { x: 0, y: 0 };
      let eye2 = { x: 0, y: 0 };

      // Center coords relative to cell
      const cx = hx + cellSize/2;
      const cy = hy + cellSize/2;
      const spread = cellSize * 0.2; // distance from center line
      const forward = cellSize * 0.2; // distance forward

      switch (snake.direction) {
        case 'UP':
          eye1 = { x: cx - spread, y: cy - forward };
          eye2 = { x: cx + spread, y: cy - forward };
          break;
        case 'DOWN':
          eye1 = { x: cx - spread, y: cy + forward };
          eye2 = { x: cx + spread, y: cy + forward };
          break;
        case 'LEFT':
          eye1 = { x: cx - forward, y: cy - spread };
          eye2 = { x: cx - forward, y: cy + spread };
          break;
        case 'RIGHT':
          eye1 = { x: cx + forward, y: cy - spread };
          eye2 = { x: cx + forward, y: cy + spread };
          break;
      }

      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 5;
      ctx.fillStyle = '#ffffff';
      
      ctx.beginPath();
      ctx.arc(eye1.x, eye1.y, eyeSize, 0, Math.PI * 2);
      ctx.arc(eye2.x, eye2.y, eyeSize, 0, Math.PI * 2);
      ctx.fill();
    });

    // --- Draw Particles ---
    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      
      // Flash effect on particles
      const pPulse = 1 + flashIntensity;
      
      ctx.shadowBlur = 15 * pPulse;
      ctx.shadowColor = p.color;
      
      const px = p.x * cellSize;
      const py = p.y * cellSize;
      
      ctx.beginPath();
      ctx.arc(px, py, (cellSize / 3) * pPulse, 0, Math.PI * 2);
      ctx.fill();
      
      // White core for particles
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px, py, (cellSize / 6) * pPulse, 0, Math.PI * 2);
      ctx.fill();
    });
    
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;

  }, [snakes, food, particles, width, height, flashIntensity]);

  // Pointer handlers: map pointer/touch/mouse position to a direction relative to player's head
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const toGrid = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor(((clientX - rect.left) / rect.width) * GRID_SIZE);
      const y = Math.floor(((clientY - rect.top) / rect.height) * GRID_SIZE);
      return { x, y };
    };

    const computeDirFromPoint = (clientX: number, clientY: number) => {
      if (!snakes || snakes.length === 0) return null;
      const player = snakes.find(s => s.id === 1 && !s.isBot);
      if (!player || player.isDead) return null;
      const head = player.body[0];
      const gridPos = toGrid(clientX, clientY);
      const dx = gridPos.x - head.x;
      const dy = gridPos.y - head.y;

      if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? Direction.RIGHT : Direction.LEFT;
      }
      return dy > 0 ? Direction.DOWN : Direction.UP;
    };

    const onPointerDown = (e: PointerEvent) => {
      (e as any).stopPropagation?.();
      pointerDownRef.current = true;
      try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch {}
      const dir = computeDirFromPoint(e.clientX, e.clientY);
      if (dir && typeof onSetDirection === 'function') onSetDirection(dir);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointerDownRef.current) return;
      (e as any).stopPropagation?.();
      const dir = computeDirFromPoint(e.clientX, e.clientY);
      if (dir && typeof onSetDirection === 'function') onSetDirection(dir);
    };

    const onPointerUp = (e: PointerEvent) => {
      pointerDownRef.current = false;
      try { (e.target as Element).releasePointerCapture?.(e.pointerId); } catch {}
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [snakes, onSetDirection]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-xl shadow-2xl shadow-neon-blue/10 border-2 border-white/10"
      style={{ 
        maxWidth: '100%', 
        aspectRatio: '1/1',
        // Subtle screen shake when flash is high
        transform: flashIntensity > 0.5 
          ? `translate(${(Math.random()-0.5)*4}px, ${(Math.random()-0.5)*4}px)` 
          : 'none'
      }}
    />
  );
};

export default GameCanvas;
