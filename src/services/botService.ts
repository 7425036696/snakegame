
import type { Point, Snake  } from '../types';
import { Direction,Difficulty } from '../types';

import { GRID_SIZE } from '../constants';

// Helper to get next coordinate
const getNextCoord = (head: Point, dir: Direction): Point => {
  switch (dir) {
    case Direction.UP: return { x: head.x, y: head.y - 1 };
    case Direction.DOWN: return { x: head.x, y: head.y + 1 };
    case Direction.LEFT: return { x: head.x - 1, y: head.y };
    case Direction.RIGHT: return { x: head.x + 1, y: head.y };
  }
};

// Check if a point is safe (not hitting walls or any snake body)
const isSafe = (pt: Point, snakes: Snake[]): boolean => {
  // Walls
  if (pt.x < 0 || pt.x >= GRID_SIZE || pt.y < 0 || pt.y >= GRID_SIZE) return false;
  
  // Bodies
  for (const snake of snakes) {
    if (snake.isDead) continue;
    for (const segment of snake.body) {
      if (pt.x === segment.x && pt.y === segment.y) return false;
    }
  }
  return true;
};

// Simple Manhattan distance
const getDistance = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

// BFS to find shortest path to food
const bfsToFood = (start: Point, target: Point, snakes: Snake[]): Direction | null => {
  const queue: { pos: Point; firstMove: Direction }[] = [];
  const visited = new Set<string>();

  const moves = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];

  // Initialize queue with adjacent safe moves
  for (const move of moves) {
    const next = getNextCoord(start, move);
    if (isSafe(next, snakes)) {
      queue.push({ pos: next, firstMove: move });
      visited.add(`${next.x},${next.y}`);
    }
  }

  while (queue.length > 0) {
    const { pos, firstMove } = queue.shift()!;
    if (pos.x === target.x && pos.y === target.y) {
      return firstMove;
    }

    for (const move of moves) {
      const next = getNextCoord(pos, move);
      if (isSafe(next, snakes) && !visited.has(`${next.x},${next.y}`)) {
        visited.add(`${next.x},${next.y}`);
        queue.push({ pos: next, firstMove });
      }
    }
  }
  return null;
};

// Flood fill to count accessible space from a point
const countAccessibleSpace = (start: Point, snakes: Snake[], maxDepth: number = 50): number => {
    const queue = [start];
    const visited = new Set<string>();
    visited.add(`${start.x},${start.y}`);
    let count = 0;

    const moves = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];

    while (queue.length > 0 && count < maxDepth) {
        const curr = queue.shift()!;
        count++;

        for (const move of moves) {
            const next = getNextCoord(curr, move);
            if (isSafe(next, snakes) && !visited.has(`${next.x},${next.y}`)) {
                visited.add(`${next.x},${next.y}`);
                queue.push(next);
            }
        }
    }
    return count;
};

export const getBotMove = (
  bot: Snake,
  opponent: Snake | null,
  food: Point,
  difficulty: Difficulty
): Direction => {
  const head = bot.body[0];
  const snakes = [bot];
  if (opponent) snakes.push(opponent);

  const possibleMoves = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
  const safeMoves = possibleMoves.filter(dir => {
    // Don't reverse
    if (dir === Direction.UP && bot.direction === Direction.DOWN) return false;
    if (dir === Direction.DOWN && bot.direction === Direction.UP) return false;
    if (dir === Direction.LEFT && bot.direction === Direction.RIGHT) return false;
    if (dir === Direction.RIGHT && bot.direction === Direction.LEFT) return false;
    
    const next = getNextCoord(head, dir);
    return isSafe(next, snakes);
  });

  if (safeMoves.length === 0) return bot.direction; // Die gracefully

  // Easy: Just pick a random safe move sometimes, or try to go to food vaguely
  if (difficulty === Difficulty.EASY) {
    // 30% chance to move randomly among safe moves
    if (Math.random() < 0.3) {
      return safeMoves[Math.floor(Math.random() * safeMoves.length)];
    }
    // Otherwise greedy distance
    return safeMoves.sort((a, b) => {
      const distA = getDistance(getNextCoord(head, a), food);
      const distB = getDistance(getNextCoord(head, b), food);
      return distA - distB;
    })[0];
  }

  // Medium: Greedy distance
  if (difficulty === Difficulty.MEDIUM) {
    return safeMoves.sort((a, b) => {
      const distA = getDistance(getNextCoord(head, a), food);
      const distB = getDistance(getNextCoord(head, b), food);
      return distA - distB;
    })[0];
  }

  // Hard: BFS for shortest path. If blocked, max survival via Flood Fill
  if (difficulty === Difficulty.HARD) {
    const bestPath = bfsToFood(head, food, snakes);
    
    // If a path to food exists, verify it doesn't lead to a tiny trapped dead end immediately
    if (bestPath) {
        const nextPos = getNextCoord(head, bestPath);
        // Simple check: do we have *some* space after this move?
        if (countAccessibleSpace(nextPos, snakes, 10) > 3) {
            return bestPath;
        }
    }
    
    // Survival Mode: Pick the move that maximizes accessible space (flood fill)
    let maxSpace = -1;
    let bestSurvivalMove = safeMoves[0];

    for (const move of safeMoves) {
        const nextPos = getNextCoord(head, move);
        const space = countAccessibleSpace(nextPos, snakes, 100);
        if (space > maxSpace) {
            maxSpace = space;
            bestSurvivalMove = move;
        }
    }
    return bestSurvivalMove;
  }

  return bot.direction;
};
