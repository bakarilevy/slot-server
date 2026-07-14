import { type IGameConfigData, type SymbolMap, type PaytableData, type ReelStrip, type PaylinePattern } from './types.js';

export class ConfigBuilder {
  private config: Partial<IGameConfigData> = {};

  setGameId(id: string): this {
    this.config.gameId = id;
    return this;
  }

  setReelCount(count: number): this {
    this.config.reelCount = count;
    return this;
  }

  setRowCount(count: number): this {
    this.config.rowCount = count;
    return this;
  }

  setSymbolMap(map: SymbolMap): this {
    this.config.symbolMap = map;
    return this;
  }

  setPaytableData(data: PaytableData): this {
    this.config.paytableData = data;
    return this;
  }

  setReelStrips(strips: ReelStrip[]): this {
    this.config.reelStrips = strips;
    return this;
  }

  setLinePatterns(patterns: PaylinePattern[]): this {
    this.config.linePatterns = patterns;
    return this;
  }

  setCurrency(code: string, symbol: string, decimalSeparator: string = '.', thousandSeparator: string = ',', minDecimalPlaces: number = 2): this {
    this.config.currency = { code, symbol, decimalSeparator, thousandSeparator, minDecimalPlaces };
    return this;
  }

  setFeatures(features: IGameConfigData['features']): this {
    this.config.features = features;
    return this;
  }

  setBetRange(min: number, max: number, step: number, defaultBet?: number): this {
    this.config.minBet = min;
    this.config.maxBet = max;
    this.config.betStep = step;
    this.config.defaultBet = defaultBet ?? min;
    return this;
  }

  build(): IGameConfigData {
    const required: (keyof IGameConfigData)[] = [
      'gameId', 'reelCount', 'rowCount', 'symbolMap',
      'paytableData', 'reelStrips', 'linePatterns'
    ];
    for (const key of required) {
      if (this.config[key] === undefined) {
        throw new Error(`ConfigBuilder: Missing required field "${key}"`);
      }
    }

    return {
      ...this.config,
      gameId: this.config.gameId!, // Assert that gameId is definitely present after validation
      reelCount: this.config.reelCount!,
      rowCount: this.config.rowCount!,
      symbolMap: this.config.symbolMap!,
      paytableData: this.config.paytableData!,
      reelStrips: this.config.reelStrips!,
      linePatterns: this.config.linePatterns!,
      currency: this.config.currency || { code: 'USD', symbol: '$', decimalSeparator: '.', thousandSeparator: ',', minDecimalPlaces: 2 },
      features: this.config.features || { autoplay: true, fastSpin: true, realityCheck: true, fullscreen: true },
      defaultBet: this.config.defaultBet ?? 1,
      minBet: this.config.minBet ?? 0.1,
      maxBet: this.config.maxBet ?? 100,
      betStep: this.config.betStep ?? 0.1,
      defaultLines: this.config.defaultLines ?? this.config.linePatterns!.length,
      rtp: this.config.rtp ?? 96.5,
      volatility: this.config.volatility ?? 'medium',
    };
  }
}