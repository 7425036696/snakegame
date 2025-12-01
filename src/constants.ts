export const GRID_SIZE = 30; // 30x30 grid
export const INITIAL_SPEED = 100; // ms per frame (lower is faster)
export const SPEED_INCREMENT = 1; // Decrease ms per food eaten
export const MIN_SPEED = 50;

export const P1_START_POS = [{ x: 5, y: 15 }, { x: 4, y: 15 }, { x: 3, y: 15 }];
export const P2_START_POS = [{ x: 24, y: 15 }, { x: 25, y: 15 }, { x: 26, y: 15 }];

export const COLORS = {
  P1: '#00f3ff', // Cyan
  P1_GLOW: 'rgba(0, 243, 255, 0.5)',
  P2: '#ff00ff', // Magenta
  P2_GLOW: 'rgba(255, 0, 255, 0.5)',
  FOOD: '#fff200',
  FOOD_GLOW: 'rgba(255, 242, 0, 0.6)',
  GRID: '#1a1a2e',
  OBSTACLE: '#ff3333'
};
