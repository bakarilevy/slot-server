import { Random } from './Random.js';
import {
  type IJackpotConfig,
  type IJackpotTier,
  type IJackpotContribution,
  type IJackpotWin,
} from './types.js';

/**
 * Manages progressive jackpot systems.
 * Handles contributions, tier tracking, and jackpot triggers.
 */
export class JackpotManager {
  private config: IJackpotConfig;
  private rng: Random;
  private tiers: Map<string, IJackpotTier>;

  constructor(config: IJackpotConfig, rng: Random) {
    this.config = config;
    this.rng = rng;
    this.tiers = new Map();
    
    // Initialize tiers
    if (config.enabled && config.tiers) {
      for (const tier of config.tiers) {
        this.tiers.set(tier.id, { ...tier });
      }
    }
  }

  /**
   * Calculate jackpot contribution from a bet.
   * Returns contributions for each tier.
   */
  calculateContribution(totalStake: number): IJackpotContribution[] {
    const contributions: IJackpotContribution[] = [];

    if (!this.config.enabled) {
      return contributions;
    }

    for (const [tierId, tier] of this.tiers.entries()) {
      const contributedAmount = totalStake * (tier.contributionRate / 100);
      tier.currentAmount += contributedAmount;

      contributions.push({
        tierId,
        contributedAmount,
        newJackpotAmount: tier.currentAmount,
      });
    }

    return contributions;
  }

  /**
   * Check if a jackpot was triggered.
   * Uses probability-based triggering.
   */
  checkTrigger(): IJackpotWin | null {
    if (!this.config.enabled) {
      return null;
    }

    for (const [tierId, tier] of this.tiers.entries()) {
      const roll = this.rng.next();
      if (roll < tier.triggerProbability) {
        const winAmount = tier.currentAmount;
        
        // Reset tier to seed amount
        tier.currentAmount = tier.seedAmount;

        return {
          tierId,
          tierName: tier.name,
          winAmount,
          timestamp: Date.now(),
        };
      }
    }

    return null;
  }

  /**
   * Get current jackpot amounts for all tiers.
   */
  getCurrentAmounts(): Record<string, number> {
    const amounts: Record<string, number> = {};
    for (const [tierId, tier] of this.tiers.entries()) {
      amounts[tierId] = tier.currentAmount;
    }
    return amounts;
  }

  /**
   * Get a specific tier's current amount.
   */
  getTierAmount(tierId: string): number | undefined {
    const tier = this.tiers.get(tierId);
    return tier?.currentAmount;
  }

  /**
   * Update a tier's current amount (for external sync).
   */
  updateTierAmount(tierId: string, amount: number): void {
    const tier = this.tiers.get(tierId);
    if (tier) {
      tier.currentAmount = amount;
    }
  }

  /**
   * Check if a bet is eligible for jackpot (based on minBetRequired).
   */
  isBetEligible(totalStake: number): boolean {
    if (!this.config.enabled) {
      return false;
    }

    for (const tier of this.tiers.values()) {
      if (tier.minBetRequired !== undefined && totalStake < tier.minBetRequired) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get configuration for a specific tier.
   */
  getTierConfig(tierId: string): IJackpotTier | undefined {
    return this.tiers.get(tierId);
  }

  /**
   * Get all tier configurations.
   */
  getAllTiers(): IJackpotTier[] {
    return Array.from(this.tiers.values());
  }

  /**
   * Reset all tiers to seed amounts.
   */
  resetAll(): void {
    for (const tier of this.tiers.values()) {
      tier.currentAmount = tier.seedAmount;
    }
  }
}
