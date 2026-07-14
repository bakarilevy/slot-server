import type {
  IGameState,
  ISymbol,
  ICascadeConfig,
  ICascadeResult,
  IWinEvaluation,
  ReelStrip,
} from './types.js';

/**
 * CascadingReelsManager - Handles tumbling/cascading reel mechanics
 * 
 * Features:
 * - Symbol removal after wins
 * - Gravity-based symbol drops
 * - New symbol generation at top
 * - Chain reaction evaluation
 * - Progressive multiplier support
 * - Cascade termination conditions
 */
export class CascadingReelsManager {
  private config: ICascadeConfig;

  constructor(config: ICascadeConfig) {
    this.config = config;
  }

  /**
   * Execute a full cascade sequence until no more wins occur
   */
  public executeCascade(
    gameState: IGameState,
    initialWins: IWinEvaluation[]
  ): ICascadeResult {
    const cascadeResults: ICascadeResult['steps'] = [];
    let currentGameState = { ...gameState };
    let remainingWins = [...initialWins];
    let totalMultiplier = this.config.initialMultiplier || 1;
    let cascadeCount = 0;
    const maxCascades = this.config.maxCascades || Infinity;

    // Continue cascading while there are wins and under limit
    while (remainingWins.length > 0 && cascadeCount < maxCascades) {
      cascadeCount++;

      // Step 1: Remove winning symbols
      const removedPositions = this.removeWinningSymbols(
        currentGameState.grid,
        remainingWins
      );

      // Step 2: Apply gravity (drop symbols down)
      const dropResult = this.applyGravity(currentGameState.grid, removedPositions);

      // Step 3: Fill empty positions with new symbols
      const newSymbols = this.fillEmptyPositions(dropResult.grid);

      // Step 4: Update multiplier if configured
      if (this.config.multiplierIncrement) {
        totalMultiplier += this.config.multiplierIncrement;
      }

      // Step 5: Evaluate new wins
      const newWins = this.evaluateWins(newSymbols.grid);

      // Record this cascade step
      cascadeResults.push({
        cascadeNumber: cascadeCount,
        removedPositions,
        droppedSymbols: dropResult.droppedSymbols,
        newSymbols: newSymbols.addedSymbols,
        resultingGrid: newSymbols.grid,
        winsInStep: newWins,
        multiplier: totalMultiplier,
      });

      // Prepare for next iteration
      currentGameState.grid = newSymbols.grid;
      remainingWins = newWins;

      // Check for special termination conditions
      if (this.config.stopOnNoWinIncrease && newWins.length === 0) {
        break;
      }
    }

    return {
      success: cascadeCount > 0,
      totalCascades: cascadeCount,
      steps: cascadeResults,
      finalGrid: currentGameState.grid,
      finalMultiplier: totalMultiplier,
      totalWinsFromCascades: cascadeResults.reduce(
        (sum, step) => sum + step.winsInStep.length,
        0
      ),
    };
  }

  /**
   * Remove symbols that are part of winning combinations
   */
  private removeWinningSymbols(
    grid: ISymbol[][],
    wins: IWinEvaluation[]
  ): Array<{ reel: number; row: number; symbol: ISymbol }> {
    const removedPositions: Array<{ reel: number; row: number; symbol: ISymbol }> = [];
    const positionsToRemove = new Set<string>();

    // Collect all positions to remove (avoid duplicates)
    wins.forEach((win) => {
      win.positions.forEach((pos) => {
        const key = `${pos.reel}-${pos.row}`;
        if (!positionsToRemove.has(key)) {
          positionsToRemove.add(key);
          removedPositions.push({
            reel: pos.reel,
            row: pos.row,
            symbol: grid[pos.reel][pos.row],
          });
        }
      });
    });

    // Actually remove the symbols (set to null or empty)
    positionsToRemove.forEach((key) => {
      const [reelStr, rowStr] = key.split('-');
      const reel = parseInt(reelStr, 10);
      const row = parseInt(rowStr, 10);
      grid[reel][row] = {
        id: 'EMPTY',
        value: 0,
        isWild: false,
        isScatter: false,
      } as ISymbol;
    });

    return removedPositions;
  }

  /**
   * Apply gravity to make symbols fall down into empty positions
   */
  private applyGravity(
    grid: ISymbol[][],
    removedPositions: Array<{ reel: number; row: number; symbol: ISymbol }>
  ): { grid: ISymbol[][]; droppedSymbols: Array<{ symbol: ISymbol; fromRow: number; toRow: number; reel: number }> } {
    const droppedSymbols: Array<{ symbol: ISymbol; fromRow: number; toRow: number; reel: number }> = [];
    const numRows = grid.length > 0 ? grid[0].length : 0;

    // Process each reel independently
    for (let reel = 0; reel < grid.length; reel++) {
      const column: ISymbol[] = [];
      
      // Collect all non-empty symbols from bottom to top
      for (let row = numRows - 1; row >= 0; row--) {
        if (grid[reel][row].id !== 'EMPTY') {
          column.push(grid[reel][row]);
        }
      }

      // Pad with empty spaces at the top (which will be filled later)
      while (column.length < numRows) {
        column.push({
          id: 'EMPTY',
          value: 0,
          isWild: false,
          isScatter: false,
        } as ISymbol);
      }

      // Reverse back to top-to-bottom order and update grid
      column.reverse();
      
      // Track which symbols dropped
      for (let row = 0; row < numRows; row++) {
        const originalSymbol = grid[reel][row];
        const newSymbol = column[row];
        
        if (originalSymbol.id !== 'EMPTY' && newSymbol.id !== 'EMPTY' && originalSymbol.id !== newSymbol.id) {
          // Find where this symbol came from
          for (let origRow = row + 1; origRow < numRows; origRow++) {
            if (grid[reel][origRow].id === newSymbol.id) {
              droppedSymbols.push({
                symbol: newSymbol,
                fromRow: origRow,
                toRow: row,
                reel,
              });
              break;
            }
          }
        }
      }
      
      grid[reel] = column;
    }

    return { grid, droppedSymbols };
  }

  /**
   * Fill empty positions at the top with new random symbols
   */
  private fillEmptyPositions(grid: ISymbol[][]): { grid: ISymbol[][]; addedSymbols: Array<{ symbol: ISymbol; position: { reel: number; row: number } }> } {
    const addedSymbols: Array<{ symbol: ISymbol; position: { reel: number; row: number } }> = [];
    const symbolPool = this.config.symbolPool || [];

    if (symbolPool.length === 0) {
      throw new Error('Symbol pool must be provided for cascade filling');
    }

    for (let reel = 0; reel < grid.length; reel++) {
      for (let row = 0; row < grid[reel].length; row++) {
        if (grid[reel][row].id === 'EMPTY') {
          // Generate new symbol based on weights
          const newSymbol = this.generateWeightedSymbol(symbolPool);
          grid[reel][row] = newSymbol;
          addedSymbols.push({
            symbol: newSymbol,
            position: { reel, row },
          });
        }
      }
    }

    return { grid, addedSymbols };
  }

  /**
   * Generate a symbol based on weighted probabilities
   */
  private generateWeightedSymbol(symbolPool: ISymbol[]): ISymbol {
    const totalWeight = symbolPool.reduce((sum, sym) => sum + (sym.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const symbol of symbolPool) {
      random -= symbol.weight || 1;
      if (random <= 0) {
        return { ...symbol };
      }
    }

    return { ...symbolPool[symbolPool.length - 1] };
  }

  /**
   * Evaluate wins on the current grid state
   * This is a simplified version - in production you'd integrate with your WinEvaluator
   */
  private evaluateWins(grid: ISymbol[][]): IWinEvaluation[] {
    // Placeholder - should integrate with actual win evaluation logic
    // For now, return empty array (actual implementation would call WinEvaluator)
    return [];
  }

  /**
   * Check if a cascade sequence should trigger special features
   */
  public checkCascadeTriggers(cascadeResult: ICascadeResult): { triggers: string[]; data?: any } {
    const triggers: string[] = [];

    // Check for cascade count achievements
    if (cascadeResult.totalCascades >= (this.config.triggerOnCascadeCount || Infinity)) {
      triggers.push('CASCADE_COUNT_ACHIEVED');
    }

    // Check for multiplier thresholds
    if (cascadeResult.finalMultiplier >= (this.config.triggerOnMultiplier || Infinity)) {
      triggers.push('MULTIPLIER_THRESHOLD');
    }

    // Check for consecutive cascades with wins
    const consecutiveWins = cascadeResult.steps.filter((step) => step.winsInStep.length > 0).length;
    if (consecutiveWins >= (this.config.triggerOnConsecutiveWins || Infinity)) {
      triggers.push('CONSECUTIVE_WINS');
    }

    return { triggers };
  }
}
