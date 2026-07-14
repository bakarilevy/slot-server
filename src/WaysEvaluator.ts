import {
  type IWaysConfig,
  type IWinLine,
  type PaytableData,
} from './types.js';

/**
 * Evaluator for "ways to win" mechanics (e.g., 243 ways, 1024 ways).
 * Instead of fixed paylines, wins are awarded for matching symbols
 * on adjacent reels starting from the leftmost reel.
 */
export class WaysEvaluator {
  private config: IWaysConfig;
  private paytableData: PaytableData;
  private reelCount: number;
  private rowCount: number;

  constructor(
    config: IWaysConfig,
    paytableData: PaytableData,
    reelCount: number,
    rowCount: number
  ) {
    this.config = config;
    this.paytableData = paytableData;
    this.reelCount = reelCount;
    this.rowCount = rowCount;
  }

  /**
   * Evaluate a spin result for ways-to-win.
   * Returns win lines and total win amount.
   */
  evaluate(result: number[][], stakePerLine: number): { winLines: IWinLine[]; totalWin: number; ways: number } {
    const { minMatches, direction } = this.config;
    const winLines: IWinLine[] = [];
    let totalWin = 0;
    let totalWays = 0;

    // For each symbol type, count how many appear on each reel
    const symbolCountsPerReel: Map<number, number[]> = new Map();

    for (let r = 0; r < this.reelCount; r++) {
      const reelSymbols = result[r] || [];
      for (const symbolId of reelSymbols) {
        if (!symbolCountsPerReel.has(symbolId)) {
          symbolCountsPerReel.set(symbolId, new Array(this.reelCount).fill(0));
        }
        const counts = symbolCountsPerReel.get(symbolId)!;
        counts[r]++;
      }
    }

    // Evaluate each symbol type
    for (const [symbolId, counts] of symbolCountsPerReel.entries()) {
      const symbolPaytable = this.paytableData[symbolId];
      if (!symbolPaytable) continue;

      // Count consecutive reels with at least one matching symbol from left
      let consecutiveReels = 0;
      const positions: { reel: number; row: number }[] = [];

      for (let r = 0; r < this.reelCount; r++) {
        if (counts[r] > 0) {
          consecutiveReels++;
          // Add all positions where this symbol appears on this reel
          const reelSymbols = result[r] || [];
          for (let row = 0; row < reelSymbols.length; row++) {
            if (reelSymbols[row] === symbolId) {
              positions.push({ reel: r, row });
            }
          }
        } else {
          break;
        }
      }

      // Check if we have enough matches
      if (consecutiveReels >= minMatches) {
        const multiplierKey = `x${consecutiveReels}`;
        const multiplier = symbolPaytable[multiplierKey];

        if (multiplier && multiplier > 0) {
          // Calculate ways: product of symbol counts on each consecutive reel
          let ways = 1;
          for (let r = 0; r < consecutiveReels; r++) {
            ways *= counts[r];
          }

          // For "both directions", also check from right to left
          if (direction === 'bothDirections') {
            let consecutiveFromRight = 0;
            for (let r = this.reelCount - 1; r >= 0; r--) {
              if (counts[r] > 0) {
                consecutiveFromRight++;
              } else {
                break;
              }
            }
            if (consecutiveFromRight >= minMatches && consecutiveFromRight > consecutiveReels) {
              // Use the better direction
              ways = 1;
              for (let r = this.reelCount - consecutiveFromRight; r < this.reelCount; r++) {
                ways *= counts[r];
              }
              consecutiveReels = consecutiveFromRight;
            }
          }

          const winAmount = stakePerLine * multiplier * ways;
          totalWin += winAmount;
          totalWays += ways;

          winLines.push({
            lineIndex: symbolId, // Use symbol ID as line index for ways
            symbolId,
            multiplier,
            winAmount,
            positions: positions.slice(0, consecutiveReels * this.rowCount),
            wayIndex: totalWays,
          });
        }
      }
    }

    return { winLines, totalWin, ways: totalWays };
  }

  /**
   * Get the maximum possible ways for this configuration.
   */
  getMaxWays(): number {
    return Math.pow(this.rowCount, this.reelCount);
  }

  /**
   * Check if ways-to-win is enabled.
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}
