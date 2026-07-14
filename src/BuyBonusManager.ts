import {
  type IBuyBonusConfig,
  type ISpinResponseData,
} from './types.js';

/**
 * Manages "buy bonus" feature.
 * Allows players to purchase direct entry to bonus rounds.
 */
export class BuyBonusManager {
  private config: IBuyBonusConfig;
  private purchasesThisSession: number = 0;
  private lastPurchaseTime: number = 0;

  constructor(config: IBuyBonusConfig) {
    this.config = config;
  }

  /**
   * Check if buying bonus is enabled and available.
   */
  canBuyBonus(currentBet: number): { canBuy: boolean; reason?: string; cost?: number } {
    if (!this.config.enabled) {
      return { canBuy: false, reason: 'Buy bonus feature is disabled' };
    }

    if (this.config.minBetRequired !== undefined && currentBet < this.config.minBetRequired) {
      return { 
        canBuy: false, 
        reason: `Minimum bet of ${this.config.minBetRequired} required` 
      };
    }

    if (this.config.maxPurchasesPerSession !== undefined && 
        this.purchasesThisSession >= this.config.maxPurchasesPerSession) {
      return { 
        canBuy: false, 
        reason: `Maximum purchases (${this.config.maxPurchasesPerSession}) reached for this session` 
      };
    }

    if (this.config.cooldownMs !== undefined) {
      const timeSinceLastPurchase = Date.now() - this.lastPurchaseTime;
      if (timeSinceLastPurchase < this.config.cooldownMs) {
        const remainingCooldown = this.config.cooldownMs - timeSinceLastPurchase;
        return { 
          canBuy: false, 
          reason: `Please wait ${Math.ceil(remainingCooldown / 1000)} seconds before purchasing again` 
        };
      }
    }

    const cost = currentBet * this.config.costMultiplier;
    return { canBuy: true, cost };
  }

  /**
   * Calculate the cost to buy bonus.
   */
  calculateCost(currentBet: number): number {
    return currentBet * this.config.costMultiplier;
  }

  /**
   * Record a bonus purchase.
   */
  recordPurchase(): void {
    this.purchasesThisSession++;
    this.lastPurchaseTime = Date.now();
  }

  /**
   * Get the number of purchases made this session.
   */
  getPurchasesThisSession(): number {
    return this.purchasesThisSession;
  }

  /**
   * Reset session tracking.
   */
  resetSession(): void {
    this.purchasesThisSession = 0;
    this.lastPurchaseTime = 0;
  }

  /**
   * Get configuration.
   */
  getConfig(): IBuyBonusConfig {
    return this.config;
  }

  /**
   * Create a spin response that triggers bonus (for buy bonus feature).
   * This marks the spin as having triggered the bonus.
   */
  createBonusTriggerSpin(
    baseSpinResult: Omit<ISpinResponseData, 'balanceAfter'>,
    bonusData: any
  ): Omit<ISpinResponseData, 'balanceAfter'> {
    return {
      ...baseSpinResult,
      bonusTriggered: true,
      bonusData,
      freeSpinsRemaining: bonusData?.freeSpins || 0,
    };
  }
}
