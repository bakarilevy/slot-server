import { type IHistoryEntry, type ISpinResponseData } from './types.js';

export class HistoryManager {
  private history: IHistoryEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries: number = 100) {
    this.maxEntries = maxEntries;
  }

  /**
   * Add a spin result to history.
   */
  addEntry(
    result: number[][],
    bet: number,
    win: number,
    balance: number,
    gameMode: 0 | 1
  ): void {
    const entry: IHistoryEntry = {
      time: Date.now(),
      bet,
      win,
      balance,
      result: result.map(row => [...row]), // deep copy
      gameMode,
    };
    this.history.push(entry);
    if (this.history.length > this.maxEntries) {
      this.history.shift();
    }
  }

  /**
   * Get all history entries.
   */
  getEntries(): IHistoryEntry[] {
    return this.history.slice();
  }

  /**
   * Get the last N entries.
   */
  getLast(n: number): IHistoryEntry[] {
    return this.history.slice(-n);
  }

  /**
   * Clear history.
   */
  clear(): void {
    this.history = [];
  }
}