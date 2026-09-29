/**
 * components/GameBoard.tsx (2048-merge-5x8)
 * ─────────────────────────────────────────────────────────────────────────────
 * Gameplay Board component powered by PixiJS v8 Canvas.
 *
 * Renders the full 5×8 grid, lanes, 3D beveled blocks, ghost placement guide,
 * flying shoot animation, domino cascade slide animation, combo beacons,
 * bottom launcher dock, and unified WebGL particle & shockwave system.
 */

import { forwardRef } from 'react';
import {
  PixiGameBoard,
  PixiGameBoardHandle,
  PixiGameBoardProps,
} from './PixiGameBoard';

export type GameBoardProps = PixiGameBoardProps;
export type GameBoardHandle = PixiGameBoardHandle;

export const GameBoard = forwardRef<GameBoardHandle, GameBoardProps>((props, ref) => {
  return <PixiGameBoard ref={ref} {...props} />;
});
