import type {
  IGameState,
  ISymbol,
  IWinEvaluation,
  IRespinsConfig,
  IRespinsResult,
  IMoneySymbol,
  IRespinsStep,
} from './types.js';

/**
 * RespinsManager - Handles Hold & Win / Respins mechanics
 * 
 * Features:
 * - Locking symbols for respin rounds
 * - Money symbol collection and value summation
 * - Reset symbols that grant additional respins
 * - Jackpot symbols (Mini, Minor, Major, Grand)
 * - Progressive feature triggers
 * - Configurable grid sizes and respin counts
 */
export class RespinsManager {
  private config: IRespinsConfig;

  constructor(config: IRespinsConfig) {
    this.config = config;
  }

  /**
   * Check if respin feature should be triggered
   */
  checkTrigger(gameState: IGameState): boolean {
    const { triggerType, minTriggerSymbols } = this.config;

    if (triggerType === 'symbol_count') {
      const specialSymbols = this.countSpecialSymbols(gameState);
      return specialSymbols >= minTriggerSymbols;
    }

    if (triggerType === 'specific_positions') {
      return this.checkSpecificPositions(gameState);
    }

    return false;
  }

  /**
   * Count special symbols (money, reset, jackpot) on the grid
   */
  private countSpecialSymbols(gameState: IGameState): number {
    let count = 0;
    const rows = gameState.grid.length;
    const cols = rows > 0 ? gameState.grid[0].length : 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const symbol = gameState.grid[row][col];
        if (this.isSpecialSymbol(symbol)) {
          count++;
        }
      }
    }

    return count;
  }

  /**
   * Check if special symbols are in required positions
   */
  private checkSpecificPositions(gameState: IGameState): boolean {
    const { triggerPositions } = this.config;
    if (!triggerPositions) return false;

    for (const pos of triggerPositions) {
      const { row, col, symbolId } = pos;
      if (row >= gameState.grid.length || col >= gameState.grid[0].length) {
        continue;
      }
      const symbol = gameState.grid[row][col];
      if (symbol.id === symbolId || this.isSpecialSymbol(symbol)) {
        continue; // Position satisfied
      }
      return false; // Required position not met
    }

    return true;
  }

  /**
   * Check if a symbol is a special respin symbol
   */
  private isSpecialSymbol(symbol: ISymbol): boolean {
    const moneySymbol = symbol as IMoneySymbol;
    return (
      moneySymbol.isMoneySymbol === true ||
      moneySymbol.isResetSymbol === true ||
      moneySymbol.isJackpotSymbol === true
    );
  }

  /**
   * Execute the respins feature
   */
  execute(gameState: IGameState): IRespinsResult {
    const steps: IRespinsStep[] = [];
    let remainingRespins = this.config.initialRespins || 3;
    const lockedPositions: Array<{ row: number; col: number }> = [];
    let totalValue = 0;
    let jackpotsCollected: string[] = [];

    // Initialize locked positions with triggering symbols
    const rows = gameState.grid.length;
    const cols = rows > 0 ? gameState.grid[0].length : 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const symbol = gameState.grid[row][col];
        if (this.isSpecialSymbol(symbol)) {
          lockedPositions.push({ row, col });
          const moneySymbol = symbol as IMoneySymbol;
          if (moneySymbol.value) {
            totalValue += moneySymbol.value;
          }
          if (moneySymbol.jackpotType) {
            jackpotsCollected.push(moneySymbol.jackpotType);
          }
        }
      }
    }

    // Create initial step
    steps.push({
      respinsRemaining: remainingRespins,
      lockedPositions: [...lockedPositions],
      newSymbols: [],
      valuesAdded: totalValue,
      jackpotsAwarded: [...jackpotsCollected],
      reason: 'initial_trigger',
    });

    // Execute respin rounds
    while (remainingRespins > 0 && lockedPositions.length < rows * cols) {
      remainingRespins--;

      // Spin new symbols for non-locked positions
      const newSymbols: Array<{ row: number; col: number; symbol: ISymbol }> = [];
      let stepValueAdded = 0;
      let stepJackpots: string[] = [];

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const isLocked = lockedPositions.some(
            (pos) => pos.row === row && pos.col === col
          );

          if (!isLocked) {
            // Generate new symbol (in real implementation, use RNG with weighted probabilities)
            const newSymbol = this.generateRespinsSymbol();
            newSymbols.push({ row, col, symbol: newSymbol });

            if (this.isSpecialSymbol(newSymbol)) {
              lockedPositions.push({ row, col });
              const moneySymbol = newSymbol as IMoneySymbol;

              if (moneySymbol.value) {
                stepValueAdded += moneySymbol.value;
                totalValue += moneySymbol.value;
              }

              if (moneySymbol.jackpotType) {
                stepJackpots.push(moneySymbol.jackpotType);
                jackpotsCollected.push(moneySymbol.jackpotType);
              }

              if (moneySymbol.isResetSymbol === true) {
                remainingRespins = this.config.initialRespins || 3;
              }
            }
          }
        }
      }

      steps.push({
        respinsRemaining: remainingRespins,
        lockedPositions: [...lockedPositions],
        newSymbols: newSymbols.map((ns) => ({
          row: ns.row,
          col: ns.col,
          symbolId: ns.symbol.id,
        })),
        valuesAdded: stepValueAdded,
        jackpotsAwarded: stepJackpots,
        reason: stepJackpots.length > 0 ? 'jackpot_collected' : newSymbols.length > 0 ? 'respins' : 'no_new_symbols',
      });

      // Check if no new special symbols were added (end feature early)
      if (newSymbols.every((ns) => !this.isSpecialSymbol(ns.symbol))) {
        if (this.config.endOnNoSpecial) {
          break;
        }
      }

      // Check for full screen bonus
      if (lockedPositions.length === rows * cols && this.config.fullScreenBonus) {
        totalValue *= this.config.fullScreenBonus.multiplier;
        steps[steps.length - 1].reason = 'full_screen_bonus';
        steps[steps.length - 1].valuesAdded = totalValue;
        break;
      }
    }

    return {
      triggered: true,
      steps,
      finalValue: totalValue,
      jackpotsCollected,
      lockedPositions,
      totalRespinsUsed: (this.config.initialRespins || 3) - remainingRespins,
    };
  }

  /**
   * Generate a special symbol for respins (weighted random)
   * In production, this should use a certified RNG with configurable weights
   */
  private generateRespinsSymbol(): ISymbol {
    const { symbolWeights } = this.config;
    const rand = Math.random();
    let cumulative = 0;

    if (symbolWeights) {
      for (const weight of symbolWeights) {
        cumulative += weight.probability;
        if (rand <= cumulative) {
          const symbol: IMoneySymbol = {
            id: weight.symbolId,
            value: weight.baseValue || 0,
            isWild: false,
            isScatter: false,
            isMoneySymbol: weight.isMoneySymbol,
            isResetSymbol: weight.isResetSymbol,
            isJackpotSymbol: weight.isJackpotSymbol,
            jackpotType: weight.jackpotType,
          };
          return symbol as unknown as ISymbol;
        }
      }
    }

    // Default fallback - regular symbol
    return {
      id: 'regular',
      value: 0,
      isWild: false,
      isScatter: false,
    };
  }

  /**
   * Calculate potential payout for respins feature
   */
  calculatePotentialPayout(betAmount: number): number {
    const { initialRespins, symbolWeights, fullScreenBonus } = this.config;
    
    if (!symbolWeights) return 0;

    let expectedValue = 0;
    const totalProbability = symbolWeights.reduce((sum, w) => sum + w.probability, 0);

    for (const weight of symbolWeights) {
      const symbolValue = weight.baseValue || 0;
      const probability = weight.probability / totalProbability;
      expectedValue += symbolValue * probability;
    }

    // Expected value per spin * number of spins
    let expectedTotal = expectedValue * (initialRespins || 3);
    
    // Add full screen bonus expectation (simplified)
    if (fullScreenBonus) {
      expectedTotal *= 1 + (fullScreenBonus.multiplier - 1) * 0.01; // 1% chance estimate
    }

    return expectedTotal * betAmount;
  }

  /**
   * Get configuration for client-side preview
   */
  getConfig(): IRespinsConfig {
    return { ...this.config };
  }
}
