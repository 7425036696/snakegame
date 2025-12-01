export type Point = {
  x: number;
  y: number;
};

// Direction
export const Direction = {
  UP: 'UP',
  DOWN: 'DOWN',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
} as const;

export type Direction = (typeof Direction)[keyof typeof Direction];

// GameMode
export const GameMode = {
  SINGLE_PLAYER: 'SINGLE_PLAYER',
  PLAYER_VS_BOT: 'PLAYER_VS_BOT',
} as const;

export type GameMode = (typeof GameMode)[keyof typeof GameMode];

// Difficulty
export const Difficulty = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
} as const;

export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

// GameStatus
export const GameStatus = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
} as const;

export type GameStatus = (typeof GameStatus)[keyof typeof GameStatus];

// Snake
export interface Snake {
  id: number;
  body: Point[];
  direction: Direction;
  nextDirection: Direction;
  color: string;
  score: number;
  isDead: boolean;
  isBot: boolean;
  name: string;
}

// Particle
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}
