import {
  type IGameConfigData,
  type SymbolMap,
  type PaytableData,
  type ReelStrip,
  type PaylinePattern,
  type IInitResponse,
  type ISpinRequestData,
  type ISpinResponseData,
} from './types.js';

/**
 * Game data builder. Constructs a complete game configuration and provides
 * helpers to validate and export it for the client.
 */
export class GameData {
  private config: IGameConfigData;

  constructor(config: IGameConfigData) {
    this.config = this.validateConfig(config);
  }

  /**
   * Validate the configuration and fill defaults.
   */
  private validateConfig(config: IGameConfigData): IGameConfigData {
    const defaults = {
      reelCount: 5,
      rowCount: 3,
      features: { autoplay: true, fastSpin: true, realityCheck: true, fullscreen: true },
      defaultBet: 1,
      minBet: 0.1,
      maxBet: 100,
      betStep: 0.1,
      currency: {
        symbol: '$',
        decimalSeparator: '.',
        thousandSeparator: ',',
        minDecimalPlaces: 2,
      },
    };

    // Merge with defaults
    const result: IGameConfigData = {
      ...defaults,
      ...config,
      features: { ...defaults.features, ...config.features },
      currency: { ...defaults.currency, ...config.currency },
    };

    // Ensure reel strips match reelCount
    if (result.reelStrips.length !== result.reelCount) {
      throw new Error(`reelStrips length (${result.reelStrips.length}) must equal reelCount (${result.reelCount})`);
    }

    // Ensure all symbol IDs exist in symbolMap
    for (const strip of result.reelStrips) {
      for (const id of strip) {
        if (!result.symbolMap[id]) {
          throw new Error(`Symbol ID ${id} not found in symbolMap`);
        }
      }
    }

    // Ensure paytable symbols exist
    for (const id of Object.keys(result.paytableData)) {
      const numId = Number(id);
      if (!result.symbolMap[numId]) {
        throw new Error(`Paytable symbol ${numId} not found in symbolMap`);
      }
    }

    return result;
  }

  /**
   * Get the raw configuration object.
   */
  getConfig(): IGameConfigData {
    return this.config;
  }

  /**
   * Serialize to a plain object (for JSON transfer).
   */
  toJSON(): IGameConfigData {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Build a complete INIT response for a given player state.
   */
  buildInitResponse(balance: number, bet?: number): IInitResponse {
    return {
      balance,
      bet: bet ?? this.config.defaultBet ?? 1,
      config: this.config,
    };
  }

  /**
   * Process a spin request and generate a response.
   * This is a mock implementation – you would replace this with your actual
   * game logic (RNG, payline evaluation, etc.).
   */
  processSpin(request: ISpinRequestData): ISpinResponseData {
    // Example: produce a random result with a dummy win
    const totalStake = request.totalStake;
    const rowCount = this.config.rowCount;
    const reelCount = this.config.reelCount;

    // Generate random result (for demo, just pick random symbols from each reel)
    const result: number[][] = [];
    for (let r = 0; r < reelCount; r++) {
      const strip = this.config.reelStrips[r]!;
      const row: number[] = [];
      // Pick a random offset in the strip, then take rowCount consecutive symbols
      const offset = Math.floor(Math.random() * (strip.length - rowCount));
      for (let i = 0; i < rowCount; i++) {
        row.push(strip[offset + i]!);
      }
      result.push(row);
    }

    // Dummy win calculation: just 0 or a small win
    const winAmount = Math.random() > 0.7 ? totalStake * (1 + Math.random() * 2) : 0;

    // Balance after the spin (initial balance is not known here; caller will adjust)
    // We return the win; the client handles balance updates.

    const response: ISpinResponseData = {
      result,
      totalWin: winAmount,
      stakePerLine: request.stakePerLine,
      totalStake: request.totalStake,
      gameMode: request.gameMode,
      balanceAfter: 0, // will be filled by the server's actual balance logic
    };

    // Optionally add win lines if a win occurred
    if (winAmount > 0) {
      response.winLines = [
        {
          lineIndex: 0,
          symbolId: result[0]![0]!,
          multiplier: winAmount / request.totalStake,
          winAmount,
          positions: [{ reel: 0, row: 0 }],
        },
      ];
    }

    return response;
  }
}