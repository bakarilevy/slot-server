import { Random } from './Random.js';
import {
  type IGambleConfig,
  type IGambleRequest,
  type IGambleResponse,
} from './types.js';

/**
 * Manages gamble mini-games (card guess, ladder, wheel).
 * Allows players to risk their winnings for a chance to multiply.
 */
export class GambleManager {
  private config: IGambleConfig;
  private rng: Random;
  private consecutiveGambles: number = 0;
  private currentGambleWin: number = 0;

  constructor(config: IGambleConfig, rng: Random) {
    this.config = config;
    this.rng = rng;
  }

  /**
   * Check if gamble feature is enabled and available.
   */
  canGamble(currentWin: number): boolean {
    if (!this.config.enabled) {
      return false;
    }

    if (currentWin <= 0) {
      return false;
    }

    if (this.config.maxGambleAmount !== undefined && currentWin > this.config.maxGambleAmount) {
      return false;
    }

    if (this.consecutiveGambles >= this.config.maxConsecutiveGambles) {
      return false;
    }

    if (this.config.autoCollectAt !== undefined && currentWin >= this.config.autoCollectAt) {
      return false;
    }

    return true;
  }

  /**
   * Process a gamble request.
   */
  processGamble(request: IGambleRequest): IGambleResponse {
    const { gambleType, currentWin, choice } = request;

    if (!this.canGamble(currentWin)) {
      return {
        result: 'lose',
        winAmount: 0,
        canGambleAgain: false,
        consecutiveGambles: this.consecutiveGambles,
      };
    }

    let result: 'win' | 'lose' | 'push';
    let winAmount = 0;

    switch (gambleType) {
      case 'card':
        // Card guess: guess higher or lower than 7, or red/black
        result = this.playCardGame(choice);
        winAmount = result === 'win' ? currentWin * 2 : 0;
        break;

      case 'ladder':
        // Ladder climb: random chance to move up or fall down
        result = this.playLadderGame(choice);
        winAmount = result === 'win' ? currentWin * 1.5 : 0;
        break;

      case 'wheel':
        // Wheel spin: multiple segments with different multipliers
        result = this.playWheelGame(choice);
        winAmount = result === 'win' ? currentWin * this.rng.nextInt(2, 5) : 0;
        break;

      default:
        result = 'lose';
        winAmount = 0;
    }

    if (result === 'win') {
      this.consecutiveGambles++;
      this.currentGambleWin = winAmount;
    } else if (result === 'lose') {
      this.consecutiveGambles = 0;
      this.currentGambleWin = 0;
    }

    return {
      result,
      winAmount,
      canGambleAgain: this.canGamble(winAmount),
      consecutiveGambles: this.consecutiveGambles,
    };
  }

  /**
   * Card game: guess if card is red or black (50/50 chance).
   */
  private playCardGame(choice?: number | string): 'win' | 'lose' | 'push' {
    const isRed = this.rng.next() < 0.5;
    const playerChoosesRed = choice === 'red' || choice === 0 || choice === undefined;

    if ((playerChoosesRed && isRed) || (!playerChoosesRed && !isRed)) {
      return 'win';
    }
    return 'lose';
  }

  /**
   * Ladder game: 60% chance to win, 40% to lose.
   */
  private playLadderGame(choice?: number | string): 'win' | 'lose' | 'push' {
    const winChance = 0.6;
    return this.rng.next() < winChance ? 'win' : 'lose';
  }

  /**
   * Wheel game: multiple outcomes based on wheel segments.
   */
  private playWheelGame(choice?: number | string): 'win' | 'lose' | 'push' {
    const segments = [
      { value: 0, weight: 20 }, // Lose
      { value: 1, weight: 30 }, // Push (get bet back)
      { value: 2, weight: 30 }, // 2x win
      { value: 3, weight: 15 }, // 3x win
      { value: 5, weight: 5 },  // 5x win (jackpot)
    ];

    const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0);
    let roll = this.rng.next() * totalWeight;

    for (const segment of segments) {
      roll -= segment.weight;
      if (roll <= 0) {
        if (segment.value === 0) return 'lose';
        if (segment.value === 1) return 'push';
        return 'win';
      }
    }

    return 'lose';
  }

  /**
   * Get current consecutive gamble count.
   */
  getConsecutiveGambles(): number {
    return this.consecutiveGambles;
  }

  /**
   * Reset gamble state (e.g., after collecting winnings).
   */
  reset(): void {
    this.consecutiveGambles = 0;
    this.currentGambleWin = 0;
  }

  /**
   * Get the current gamble win amount.
   */
  getCurrentGambleWin(): number {
    return this.currentGambleWin;
  }

  /**
   * Get gamble configuration.
   */
  getConfig(): IGambleConfig {
    return this.config;
  }
}
