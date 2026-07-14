import {
  type IDebugConfig,
  type IDebugState,
  type IDebugLogEntry,
  type IForcedOutcome,
  type ISpinResponseData,
} from './types.js';

/**
 * Debug Manager for testing and development.
 * Provides logging, forced outcomes, and state inspection.
 */
export class DebugManager {
  private config: IDebugConfig;
  private spinCount: number = 0;
  private lastRngSeed: string = '';
  private forcedOutcomesApplied: number = 0;
  private logs: {
    errors: IDebugLogEntry[];
    warnings: IDebugLogEntry[];
    infoLogs: IDebugLogEntry[];
    debugLogs: IDebugLogEntry[];
  } = {
    errors: [],
    warnings: [],
    infoLogs: [],
    debugLogs: [],
  };

  constructor(config?: Partial<IDebugConfig>) {
    this.config = {
      enabled: config?.enabled ?? false,
      logSpins: config?.logSpins ?? false,
      logRngSeeds: config?.logRngSeeds ?? false,
      forcedOutcomes: config?.forcedOutcomes ?? [],
      skipBalanceChecks: config?.skipBalanceChecks ?? false,
      verboseLevel: config?.verboseLevel ?? 'warnings',
      outputFormat: config?.outputFormat ?? 'console',
      logFilePath: config?.logFilePath,
    };
  }

  /**
   * Update debug configuration.
   */
  configure(config: Partial<IDebugConfig>): void {
    this.config = { ...this.config, ...config };
    this.log('info', 'config', 'Debug configuration updated', { config });
  }

  /**
   * Check if debug mode is enabled.
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get current debug state.
   */
  getState(): IDebugState {
    return {
      enabled: this.config.enabled,
      spinCount: this.spinCount,
      lastRngSeed: this.lastRngSeed,
      forcedOutcomesApplied: this.forcedOutcomesApplied,
      errors: this.logs.errors,
      warnings: this.logs.warnings,
      infoLogs: this.logs.infoLogs,
    };
  }

  /**
   * Reset debug state and logs.
   */
  reset(): void {
    this.spinCount = 0;
    this.lastRngSeed = '';
    this.forcedOutcomesApplied = 0;
    this.logs = {
      errors: [],
      warnings: [],
      infoLogs: [],
      debugLogs: [],
    };
    this.log('info', 'system', 'Debug state reset');
  }

  /**
   * Log a message at specified level.
   */
  log(
    level: IDebugLogEntry['level'],
    category: string,
    message: string,
    data?: any
  ): void {
    if (!this.config.enabled) return;

    const shouldLog = this.shouldLogLevel(level);
    if (!shouldLog) return;

    const entry: IDebugLogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
    };

    // Store in appropriate log array
    switch (level) {
      case 'error':
        this.logs.errors.push(entry);
        break;
      case 'warning':
        this.logs.warnings.push(entry);
        break;
      case 'info':
        this.logs.infoLogs.push(entry);
        break;
      case 'debug':
        this.logs.debugLogs.push(entry);
        break;
    }

    // Output based on format
    this.outputLog(entry);
  }

  /**
   * Log a spin result.
   */
  logSpin(spinId: string, result: ISpinResponseData, rngSeed: string): void {
    if (!this.config.enabled || !this.config.logSpins) return;

    this.spinCount++;
    this.lastRngSeed = rngSeed;

    this.log('debug', 'spin', `Spin #${this.spinCount}`, {
      spinId,
      totalWin: result.totalWin,
      bonusTriggered: result.bonusTriggered,
      cascadeLevel: result.cascadeLevel,
      rngSeed,
    });

    if (this.config.logRngSeeds) {
      this.log('debug', 'rng', `RNG Seed for spin #${this.spinCount}`, { seed: rngSeed });
    }
  }

  /**
   * Check and apply forced outcome if conditions match.
   */
  checkForcedOutcome(params: {
    spinNumber: number;
    rngSeed: string;
    betAmount: number;
    playerId: string;
  }): ISpinResponseData | null {
    if (!this.config.enabled || !this.config.forcedOutcomes) return null;

    for (const forced of this.config.forcedOutcomes) {
      let matches = false;

      switch (forced.condition.type) {
        case 'spinNumber':
          matches = forced.condition.value === params.spinNumber;
          break;
        case 'randomSeed':
          matches = forced.condition.value === params.rngSeed;
          break;
        case 'betAmount':
          matches = forced.condition.value === params.betAmount;
          break;
        case 'playerId':
          matches = forced.condition.value === params.playerId;
          break;
      }

      if (matches && forced.result) {
        this.forcedOutcomesApplied++;
        this.log('warning', 'forced', `Forced outcome applied for spin #${params.spinNumber}`, {
          condition: forced.condition,
          result: forced.result,
        });

        // Create minimal response with forced values
        return {
          result: forced.result.symbols || [],
          totalWin: forced.result.winAmount || 0,
          stakePerLine: 0,
          totalStake: 0,
          gameMode: 0,
          balanceAfter: 0,
          bonusTriggered: forced.result.bonusTriggered ?? false,
        } as ISpinResponseData;
      }
    }

    return null;
  }

  /**
   * Check if balance checks should be skipped.
   */
  shouldSkipBalanceCheck(): boolean {
    return this.config.enabled && this.config.skipBalanceChecks;
  }

  /**
   * Get all logs (optionally filtered by level).
   */
  getLogs(level?: IDebugLogEntry['level']): IDebugLogEntry[] {
    if (!level) {
      return [
        ...this.logs.errors,
        ...this.logs.warnings,
        ...this.logs.infoLogs,
        ...this.logs.debugLogs,
      ].sort((a, b) => a.timestamp - b.timestamp);
    }

    switch (level) {
      case 'error':
        return this.logs.errors;
      case 'warning':
        return this.logs.warnings;
      case 'info':
        return this.logs.infoLogs;
      case 'debug':
        return this.logs.debugLogs;
    }
  }

  /**
   * Export logs as JSON.
   */
  exportLogs(): string {
    return JSON.stringify(this.getLogs(), null, 2);
  }

  /**
   * Clear all logs.
   */
  clearLogs(): void {
    this.logs = {
      errors: [],
      warnings: [],
      infoLogs: [],
      debugLogs: [],
    };
  }

  /**
   * Determine if a log level should be output based on verboseLevel config.
   */
  private shouldLogLevel(level: IDebugLogEntry['level']): boolean {
    const levels = ['none', 'errors', 'warnings', 'info', 'debug'];
    const currentIndex = levels.indexOf(this.config.verboseLevel);
    const levelIndex = levels.indexOf(level);

    return levelIndex <= currentIndex && levelIndex > 0;
  }

  /**
   * Output log entry based on outputFormat config.
   */
  private outputLog(entry: IDebugLogEntry): void {
    if (this.config.outputFormat === 'console') {
      const prefix = `[${new Date(entry.timestamp).toISOString()}] [${entry.level.toUpperCase()}] ${entry.category}:`;
      
      switch (entry.level) {
        case 'error':
          console.error(prefix, entry.message, entry.data || '');
          break;
        case 'warning':
          console.warn(prefix, entry.message, entry.data || '');
          break;
        case 'info':
          console.info(prefix, entry.message, entry.data || '');
          break;
        case 'debug':
          console.log(prefix, entry.message, entry.data || '');
          break;
      }
    } else if (this.config.outputFormat === 'json') {
      console.log(JSON.stringify(entry));
    }
    // File output would require Node.js fs module - implement in server layer
  }

  /**
   * Get statistics about logged events.
   */
  getStatistics(): {
    totalLogs: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    debugCount: number;
    spinsTracked: number;
    forcedOutcomesApplied: number;
  } {
    return {
      totalLogs: this.logs.errors.length + this.logs.warnings.length + 
                 this.logs.infoLogs.length + this.logs.debugLogs.length,
      errorCount: this.logs.errors.length,
      warningCount: this.logs.warnings.length,
      infoCount: this.logs.infoLogs.length,
      debugCount: this.logs.debugLogs.length,
      spinsTracked: this.spinCount,
      forcedOutcomesApplied: this.forcedOutcomesApplied,
    };
  }
}
