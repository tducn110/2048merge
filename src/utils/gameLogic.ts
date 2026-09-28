import { Grid, TileData, SpecialComboEvent } from '../types';

export const COLS = 5;
export const ROWS = 8;

export function createEmptyGrid(): Grid {
  const grid: Grid = [];
  for (let r = 0; r < ROWS; r++) {
    const row: (TileData | null)[] = [];
    for (let c = 0; c < COLS; c++) {
      row.push(null);
    }
    grid.push(row);
  }
  return grid;
}

export function generateInitialGrid(): Grid {
  const grid = createEmptyGrid();
  // Spawn a few initial friendly starting tiles in the top 2 rows
  const startingValues = [2, 4, 2, 4, 8];
  for (let c = 0; c < COLS; c++) {
    // 60% chance of tile at row 0
    if (Math.random() > 0.2) {
      const val = startingValues[Math.floor(Math.random() * startingValues.length)];
      grid[0][c] = {
        id: `init-${0}-${c}-${Date.now()}-${Math.random()}`,
        value: val,
        row: 0,
        col: c,
      };
    }
  }
  return grid;
}

// User specified: "hàng ngang sẽ xuất hiện một ô 02 hoặc 04 hoặc 08 một cách ngẫu nhiên"
export function getRandomSpawnValue(highestTile: number = 8): number {
  // Primarily 2, 4, 8 as requested
  const r = Math.random();
  if (highestTile >= 256 && Math.random() < 0.15) {
    // Very rarely allow 16 if player has reached high numbers
    return 16;
  }
  if (r < 0.5) return 2;
  if (r < 0.85) return 4;
  return 8;
}

export interface ShootResult {
  valid: boolean;
  targetRow: number;
  isMerge: boolean;
  mergedValue?: number;
}

export function previewShoot(grid: Grid, col: number, incomingValue: number): ShootResult {
  // Find where this incoming tile will hit in column 'col'
  // Row 0 is ceiling. Tiles stack downward from row 0: 0, 1, 2, 3...
  let lastOccupiedRow = -1;
  for (let r = 0; r < ROWS; r++) {
    if (grid[r][col] !== null) {
      lastOccupiedRow = r;
    } else {
      break;
    }
  }

  if (lastOccupiedRow === -1) {
    // Column is empty, will fly up to Row 0
    return { valid: true, targetRow: 0, isMerge: false };
  }

  const occupiedTile = grid[lastOccupiedRow][col]!;
  if (occupiedTile.value === incomingValue) {
    // Can merge into this occupied tile!
    return {
      valid: true,
      targetRow: lastOccupiedRow,
      isMerge: true,
      mergedValue: incomingValue * 2,
    };
  }

  // Cannot merge with occupied tile. Check if there's space below it
  const nextRow = lastOccupiedRow + 1;
  if (nextRow < ROWS) {
    return { valid: true, targetRow: nextRow, isMerge: false };
  }

  // Column is completely full (8 tiles) and bottom tile doesn't match
  return { valid: false, targetRow: -1, isMerge: false };
}

// Compact column upwards so there are no empty gaps between ceiling and bottom
export function compactGridUpwards(grid: Grid): { newGrid: Grid; moved: boolean } {
  const newGrid = createEmptyGrid();
  let moved = false;

  for (let c = 0; c < COLS; c++) {
    const colTiles: TileData[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (grid[r][c] !== null) {
        colTiles.push(grid[r][c]!);
      }
    }

    for (let r = 0; r < colTiles.length; r++) {
      const tile = colTiles[r];
      if (tile.row !== r) moved = true;
      newGrid[r][c] = {
        ...tile,
        row: r,
        col: c,
      };
    }
  }

  return { newGrid, moved };
}

// 1. Combo Chữ T Ngược (Inverted T ⊥ - 4 khối tạo thành chữ T ngược hoặc chữ T)
export function findInvertedTMatches(grid: Grid): SpecialComboEvent | null {
  // Check each potential center junction (r, c)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const center = grid[r][c];
      if (!center) continue;
      const val = center.value;

      // Orientation 1: Classic Inverted T (⊥): horizontal bar (r, c-1), (r, c), (r, c+1) + stem above (r-1, c)
      if (
        c >= 1 &&
        c < COLS - 1 &&
        r >= 1 &&
        grid[r][c - 1]?.value === val &&
        grid[r][c + 1]?.value === val &&
        grid[r - 1][c]?.value === val
      ) {
        const newValue = val * 8;
        return {
          id: `t-inv-${Date.now()}-${r}-${c}`,
          type: 'inverted_t',
          title: 'COMBO CHỮ T NGƯỢC ⊥!',
          scoreBonus: newValue * 10,
          tiles: [
            { row: r, col: c, value: val },
            { row: r, col: c - 1, value: val },
            { row: r, col: c + 1, value: val },
            { row: r - 1, col: c, value: val },
          ],
          target: { row: r, col: c, newValue },
        };
      }

      // Orientation 2: Standard T: horizontal bar (r, c-1), (r, c), (r, c+1) + stem below (r+1, c)
      if (
        c >= 1 &&
        c < COLS - 1 &&
        r < ROWS - 1 &&
        grid[r][c - 1]?.value === val &&
        grid[r][c + 1]?.value === val &&
        grid[r + 1][c]?.value === val
      ) {
        const newValue = val * 8;
        return {
          id: `t-down-${Date.now()}-${r}-${c}`,
          type: 'inverted_t',
          title: 'COMBO CHỮ T 4 KHỐI!',
          scoreBonus: newValue * 10,
          tiles: [
            { row: r, col: c, value: val },
            { row: r, col: c - 1, value: val },
            { row: r, col: c + 1, value: val },
            { row: r + 1, col: c, value: val },
          ],
          target: { row: r, col: c, newValue },
        };
      }

      // Orientation 3: Sideways T (stem right ⊢): vertical bar (r-1, c), (r, c), (r+1, c) + stem right (r, c+1)
      if (
        r >= 1 &&
        r < ROWS - 1 &&
        c < COLS - 1 &&
        grid[r - 1][c]?.value === val &&
        grid[r + 1][c]?.value === val &&
        grid[r][c + 1]?.value === val
      ) {
        const newValue = val * 8;
        return {
          id: `t-right-${Date.now()}-${r}-${c}`,
          type: 'inverted_t',
          title: 'COMBO CHỮ T NGHIÊNG ⊥!',
          scoreBonus: newValue * 10,
          tiles: [
            { row: r, col: c, value: val },
            { row: r - 1, col: c, value: val },
            { row: r + 1, col: c, value: val },
            { row: r, col: c + 1, value: val },
          ],
          target: { row: r, col: c, newValue },
        };
      }

      // Orientation 4: Sideways T (stem left ⊣): vertical bar (r-1, c), (r, c), (r+1, c) + stem left (r, c-1)
      if (
        r >= 1 &&
        r < ROWS - 1 &&
        c >= 1 &&
        grid[r - 1][c]?.value === val &&
        grid[r + 1][c]?.value === val &&
        grid[r][c - 1]?.value === val
      ) {
        const newValue = val * 8;
        return {
          id: `t-left-${Date.now()}-${r}-${c}`,
          type: 'inverted_t',
          title: 'COMBO CHỮ T NGHIÊNG ⊥!',
          scoreBonus: newValue * 10,
          tiles: [
            { row: r, col: c, value: val },
            { row: r - 1, col: c, value: val },
            { row: r + 1, col: c, value: val },
            { row: r, col: c - 1, value: val },
          ],
          target: { row: r, col: c, newValue },
        };
      }
    }
  }
  return null;
}

// 2. Combo Vuông Góc (Right-Angle / Góc Vuông L-Shape 90° - 3 khối tạo thành góc vuông)
export function findCornerMatches(grid: Grid): SpecialComboEvent | null {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const corner = grid[r][c];
      if (!corner) continue;
      const val = corner.value;

      // Corner 1 (Top-Left ┌): (r, c), (r, c+1), (r+1, c)
      if (
        c < COLS - 1 &&
        r < ROWS - 1 &&
        grid[r][c + 1]?.value === val &&
        grid[r + 1][c]?.value === val
      ) {
        const newValue = val * 4;
        return {
          id: `cr-tl-${Date.now()}-${r}-${c}`,
          type: 'corner',
          title: 'COMBO VUÔNG GÓC 90°!',
          scoreBonus: newValue * 6,
          tiles: [
            { row: r, col: c, value: val },
            { row: r, col: c + 1, value: val },
            { row: r + 1, col: c, value: val },
          ],
          target: { row: r, col: c, newValue },
        };
      }

      // Corner 2 (Top-Right ┐): (r, c), (r, c-1), (r+1, c)
      if (
        c >= 1 &&
        r < ROWS - 1 &&
        grid[r][c - 1]?.value === val &&
        grid[r + 1][c]?.value === val
      ) {
        const newValue = val * 4;
        return {
          id: `cr-tr-${Date.now()}-${r}-${c}`,
          type: 'corner',
          title: 'COMBO VUÔNG GÓC 90°!',
          scoreBonus: newValue * 6,
          tiles: [
            { row: r, col: c, value: val },
            { row: r, col: c - 1, value: val },
            { row: r + 1, col: c, value: val },
          ],
          target: { row: r, col: c, newValue },
        };
      }

      // Corner 3 (Bottom-Left └): (r, c), (r, c+1), (r-1, c)
      if (
        c < COLS - 1 &&
        r >= 1 &&
        grid[r][c + 1]?.value === val &&
        grid[r - 1][c]?.value === val
      ) {
        const newValue = val * 4;
        return {
          id: `cr-bl-${Date.now()}-${r}-${c}`,
          type: 'corner',
          title: 'COMBO VUÔNG GÓC 90°!',
          scoreBonus: newValue * 6,
          tiles: [
            { row: r, col: c, value: val },
            { row: r, col: c + 1, value: val },
            { row: r - 1, col: c, value: val },
          ],
          target: { row: r, col: c, newValue },
        };
      }

      // Corner 4 (Bottom-Right ┘): (r, c), (r, c-1), (r-1, c)
      if (
        c >= 1 &&
        r >= 1 &&
        grid[r][c - 1]?.value === val &&
        grid[r - 1][c]?.value === val
      ) {
        const newValue = val * 4;
        return {
          id: `cr-br-${Date.now()}-${r}-${c}`,
          type: 'corner',
          title: 'COMBO VUÔNG GÓC 90°!',
          scoreBonus: newValue * 6,
          tiles: [
            { row: r, col: c, value: val },
            { row: r, col: c - 1, value: val },
            { row: r - 1, col: c, value: val },
          ],
          target: { row: r, col: c, newValue },
        };
      }
    }
  }
  return null;
}

// Find standard adjacent matches for a tile
export function findAdjacentMatches(grid: Grid, targetRow: number, targetCol: number): { row: number; col: number }[] {
  const current = grid[targetRow]?.[targetCol];
  if (!current) return [];

  const val = current.value;
  const matches: { row: number; col: number }[] = [];
  const dirs = [
    [-1, 0], // up
    [1, 0],  // down
    [0, -1], // left
    [0, 1],  // right
  ];

  for (const [dr, dc] of dirs) {
    const nr = targetRow + dr;
    const nc = targetCol + dc;
    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
      const neighbor = grid[nr][nc];
      if (neighbor && neighbor.value === val) {
        matches.push({ row: nr, col: nc });
      }
    }
  }

  return matches;
}

// Check if any move is possible
export function isGameOver(grid: Grid, incomingValue: number): boolean {
  for (let c = 0; c < COLS; c++) {
    const preview = previewShoot(grid, c, incomingValue);
    if (preview.valid) return false;
  }
  return true;
}
