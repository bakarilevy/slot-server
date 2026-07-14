import {
  type IGameConfigData,
  type PaylinePattern,
  type PaytableData,
  type IWinLine,
  type ISpinResponseData,
  type ISpinRequestData, // Imported the clean, updated request interface
} from './types.js';
import { Random } from './Random.js';

export class SpinEvaluator {
  private config: IGameConfigData;
  private rng: Random;

  constructor(config: IGameConfigData, rng: Random) {
    this.config = config;
    this.rng = rng;
  }

  /**
   * Generate a random spin result (visible symbols for each reel).
   * Returns a 2D array: [reelIndex][rowIndex]
   */
  generateResult(): number[][] {
    const { reelCount, rowCount, reelStrips } = this.config;
    const result: number[][] = [];

    for (let r = 0; r < reelCount; r++) {
      const strip = reelStrips[r]!;
      const offset = this.rng.nextInt(0, strip.length - rowCount);
      const row: number[] = [];
      for (let i = 0; i < rowCount; i++) {
        row.push(strip[offset + i]!);
      }
      result.push(row);
    }
    return result;
  }

  /**
   * Evaluate the result against all paylines and the paytable.
   * Returns win lines and total win amount.
   */
  // FIXED: Added stakePerLine as a parameter since it belongs to the request payload, not the class instance
  evaluateResult(result: number[][], stakePerLine: number): { winLines: IWinLine[]; totalWin: number } {
    // FIXED: Destructured linePatterns and paytableData correctly out of this.config
    const { linePatterns, paytableData } = this.config; 
    const winLines: IWinLine[] = [];
    let totalWin = 0;

    for (let li = 0; li < linePatterns.length; li++) {
      const pattern = linePatterns[li]!;
      // Get the symbol IDs along this line
      const symbols = pattern.map(pos => result[pos.reel]?.[pos.row]);
      if (symbols.some(s => s === undefined)) continue;

      // Find the longest matching run from the left
      const firstSymbol = symbols[0]!;
      let count = 1;
      for (let i = 1; i < symbols.length; i++) {
        if (symbols[i] === firstSymbol) {
          count++;
        } else {
          break;
        }
      }

      // Look up multiplier in paytable for this symbol and count
      const symbolPaytable = paytableData[firstSymbol];
      if (!symbolPaytable) continue;
      const multiplierKey = `x${count}`; // e.g., "x3"
      const multiplier = symbolPaytable[multiplierKey];
      if (!multiplier || multiplier === 0) continue;

      const winAmount = (stakePerLine || 1) * multiplier;
      totalWin += winAmount;
      winLines.push({
        lineIndex: li,
        symbolId: firstSymbol,
        multiplier,
        winAmount,
        positions: pattern.slice(0, count),
      });
    }

    return { winLines, totalWin };
  }

  /**
   * Full spin processing: generate result, evaluate, build response.
   */
  // FIXED: Swapped the messy inline type for the clean, updated ISpinRequestData interface
  spin(request: ISpinRequestData): Omit<ISpinResponseData, 'balanceAfter'> {
    const result = this.generateResult();
    const stakePerLine = request.stakePerLine;
    // FIXED: Forwarded stakePerLine to the evaluation processor method loop pass
    const { winLines, totalWin } = this.evaluateResult(result, stakePerLine);

    return {
      result,
      totalWin,
      stakePerLine: request.stakePerLine,
      totalStake: request.totalStake,
      gameMode: request.gameMode,
      winLines: winLines.length > 0 ? winLines : undefined,
    };
  }
}
