import type {
  IGameState,
  ISymbol,
  IWinEvaluation,
  IExpandingWildConfig,
  IExpandingWildResult,
  IStickyWildConfig,
  IStickyWildResult,
} from './types.js';

/**
 * ExpandingWildsManager - Handles expanding and sticky wild mechanics
 * 
 * Features:
 * - Wild expansion to cover entire reel
 * - Sticky wilds that persist for multiple spins
 * - Wild multiplier application
 * - Interaction with win evaluation
 * - Visual position tracking for animations
 */
export class ExpandingWildsManager {
  private expandConfig: IExpandingWildConfig;
  private stickyConfig: IStickyWildConfig;

  constructor(expandConfig: IExpandingWildConfig, stickyConfig?: IStickyWildConfig) {
    this.expandConfig = expandConfig;
    this.stickyConfig = stickyConfig || {
      enabled: false,
      persistSpins: 0,
      maxStickyWilds: Infinity,
    };
  }

  /**
   * Process expanding wilds on the current grid
   */
  public processExpandingWilds(gameState: IGameState): IExpandingWildResult {
    const expandedReels: number[] = [];
    const expandedPositions: Array<{ reel: number; row: number }> = [];
    let modifiedGrid = gameState.grid.map((reel) => [...reel]);

    // Check each reel for wild symbols that should expand
    for (let reel = 0; reel < modifiedGrid.length; reel++) {
      const shouldExpand = this.shouldReelExpand(modifiedGrid[reel], reel);

      if (shouldExpand) {
        expandedReels.push(reel);

        // Expand wild to cover entire reel (or configured rows)
        const rowsToExpand = this.expandConfig.expandToRows || modifiedGrid[reel].length;
        
        for (let row = 0; row < rowsToExpand; row++) {
          const originalSymbol = modifiedGrid[reel][row];
          
          // Only replace non-wild symbols
          if (!originalSymbol.isWild) {
            expandedPositions.push({ reel, row });
            modifiedGrid[reel][row] = {
              ...originalSymbol,
              isWild: true,
              wildMultiplier: this.expandConfig.wildMultiplier || 1,
              expandedFrom: originalSymbol.id,
            };
          }
        }
      }
    }

    return {
      success: expandedReels.length > 0,
      expandedReels,
      expandedPositions,
      modifiedGrid,
      totalExpanded: expandedPositions.length,
      appliedMultiplier: this.expandConfig.wildMultiplier || 1,
    };
  }

  /**
   * Determine if a reel should expand based on configuration
   */
  private shouldReelExpand(reel: ISymbol[], reelIndex: number): boolean {
    const wildCount = reel.filter((sym) => sym.isWild).length;

    if (wildCount === 0) {
      return false;
    }

    // Check expansion trigger conditions
    switch (this.expandConfig.triggerCondition) {
      case 'any_wild':
        return true;
      case 'multiple_wilds':
        return wildCount >= (this.expandConfig.minWildsForExpand || 2);
      case 'specific_positions':
        return this.hasWildInSpecificPositions(reel);
      case 'random':
        const probability = this.expandConfig.expansionProbability || 0.5;
        return Math.random() < probability;
      default:
        return wildCount > 0;
    }
  }

  /**
   * Check if wilds exist in specific configured positions
   */
  private hasWildInSpecificPositions(reel: ISymbol[]): boolean {
    const positions = this.expandConfig.specificPositions || [];
    return positions.some((pos) => reel[pos] && reel[pos].isWild);
  }

  /**
   * Apply sticky wilds logic for persistent wilds across spins
   */
  public processStickyWilds(
    gameState: IGameState,
    existingStickyWilds: Array<{ reel: number; row: number; remainingSpins: number }>
  ): IStickyWildResult {
    const updatedStickyWilds: Array<{ reel: number; row: number; remainingSpins: number }> = [];
    const removedStickyWilds: Array<{ reel: number; row: number }> = [];
    let modifiedGrid = gameState.grid.map((reel) => [...reel]);

    // Decrement spin counters and remove expired sticky wilds
    existingStickyWilds.forEach((sticky) => {
      const remainingSpins = sticky.remainingSpins - 1;

      if (remainingSpins <= 0) {
        removedStickyWilds.push({ reel: sticky.reel, row: sticky.row });
        // Remove the sticky wild from grid (revert to original or empty)
        modifiedGrid[sticky.reel][sticky.row] = {
          ...modifiedGrid[sticky.reel][sticky.row],
          isSticky: false,
          isWild: false,
        };
      } else {
        updatedStickyWilds.push({
          reel: sticky.reel,
          row: sticky.row,
          remainingSpins,
        });
      }
    });

    // Check if we've hit max sticky wilds limit
    const currentStickyCount = modifiedGrid.reduce(
      (sum, reel) => sum + reel.filter((sym) => sym.isSticky).length,
      0
    );

    return {
      success: updatedStickyWilds.length > 0 || removedStickyWilds.length > 0,
      activeStickyWilds: updatedStickyWilds,
      removedStickyWilds,
      modifiedGrid,
      totalActive: updatedStickyWilds.length,
      totalRemoved: removedStickyWilds.length,
      canAddMore: currentStickyCount < (this.stickyConfig.maxStickyWilds || Infinity),
    };
  }

  /**
   * Add new sticky wilds to the grid
   */
  public addStickyWilds(
    gameState: IGameState,
    positions: Array<{ reel: number; row: number }>,
    persistSpins?: number
  ): IStickyWildResult {
    const newStickyWilds: Array<{ reel: number; row: number; remainingSpins: number }> = [];
    let modifiedGrid = gameState.grid.map((reel) => [...reel]);
    const spinsToPersist = persistSpins || this.stickyConfig.persistSpins || 3;

    positions.forEach((pos) => {
      if (pos.reel >= 0 && pos.reel < modifiedGrid.length &&
          pos.row >= 0 && pos.row < modifiedGrid[pos.reel].length) {
        
        const currentSymbol = modifiedGrid[pos.reel][pos.row];
        
        // Convert symbol to sticky wild
        modifiedGrid[pos.reel][pos.row] = {
          ...currentSymbol,
          isWild: true,
          isSticky: true,
          remainingSpins: spinsToPersist,
          stickyId: `sticky_${pos.reel}_${pos.row}_${Date.now()}`,
        };

        newStickyWilds.push({
          reel: pos.reel,
          row: pos.row,
          remainingSpins: spinsToPersist,
        });
      }
    });

    return {
      success: newStickyWilds.length > 0,
      activeStickyWilds: newStickyWilds,
      removedStickyWilds: [],
      modifiedGrid,
      totalActive: newStickyWilds.length,
      totalRemoved: 0,
      canAddMore: newStickyWilds.length < (this.stickyConfig.maxStickyWilds || Infinity),
    };
  }

  /**
   * Calculate multiplier effect from wilds in a win line
   */
  public calculateWildMultiplier(winPositions: Array<{ reel: number; row: number }>, grid: ISymbol[][]): number {
    let totalMultiplier = 1;

    winPositions.forEach((pos) => {
      const symbol = grid[pos.reel][pos.row];
      
      if (symbol.isWild) {
        const wildMult = symbol.wildMultiplier || this.expandConfig.wildMultiplier || 1;
        
        // Apply multiplier stacking based on config
        if (this.expandConfig.multiplierStacking === 'multiply') {
          totalMultiplier *= wildMult;
        } else if (this.expandConfig.multiplierStacking === 'add') {
          totalMultiplier += (wildMult - 1);
        } else {
          // Default: use highest multiplier
          totalMultiplier = Math.max(totalMultiplier, wildMult);
        }
      }
    });

    return totalMultiplier;
  }

  /**
   * Check for special wild interactions (e.g., expanding wild meeting sticky wild)
   */
  public checkWildInteractions(grid: ISymbol[][]): { interactions: string[]; data?: any } {
    const interactions: string[] = [];
    const expandedReels: number[] = [];
    const stickyPositions: Array<{ reel: number; row: number }> = [];

    // Find all expanded reels
    grid.forEach((reel, reelIndex) => {
      if (reel.some((sym) => sym.expandedFrom)) {
        expandedReels.push(reelIndex);
      }
    });

    // Find all sticky wilds
    grid.forEach((reel, reelIndex) => {
      reel.forEach((sym, rowIndex) => {
        if (sym.isSticky) {
          stickyPositions.push({ reel: reelIndex, row: rowIndex });
        }
      });
    });

    // Check for interactions
    if (expandedReels.length > 0 && stickyPositions.length > 0) {
      const overlappingReels = expandedReels.filter((reel) =>
        stickyPositions.some((pos) => pos.reel === reel)
      );

      if (overlappingReels.length > 0) {
        interactions.push('EXPANDING_STICKY_OVERLAP');
      }
    }

    // Check for full screen wilds
    const fullScreenWild = grid.every((reel) => reel.every((sym) => sym.isWild));
    if (fullScreenWild) {
      interactions.push('FULL_SCREEN_WILDS');
    }

    return { interactions };
  }
}
