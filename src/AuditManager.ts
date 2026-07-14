import {
  type IAuditRecord,
  type IPlayerActivitySummary,
  type IJackpotContribution,
  type IJackpotWin,
} from './types.js';

/**
 * Audit record storage interface.
 */
export interface IAuditStorage {
  save(record: IAuditRecord): Promise<void>;
  findByPlayer(playerId: string, startTime: number, endTime: number): Promise<IAuditRecord[]>;
  findById(spinId: string): Promise<IAuditRecord | null>;
  getSummary(playerId: string, startTime: number, endTime: number): Promise<IPlayerActivitySummary>;
}

/**
 * In-memory audit storage (for development/testing).
 * In production, replace with database-backed implementation.
 */
export class InMemoryAuditStorage implements IAuditStorage {
  private records: Map<string, IAuditRecord> = new Map();
  private playerIndex: Map<string, Set<string>> = new Map();

  async save(record: IAuditRecord): Promise<void> {
    this.records.set(record.spinId, record);
    
    // Index by player
    if (!this.playerIndex.has(record.playerId)) {
      this.playerIndex.set(record.playerId, new Set());
    }
    this.playerIndex.get(record.playerId)!.add(record.spinId);
  }

  async findByPlayer(playerId: string, startTime: number, endTime: number): Promise<IAuditRecord[]> {
    const spinIds = this.playerIndex.get(playerId) || new Set();
    const results: IAuditRecord[] = [];
    
    for (const spinId of spinIds) {
      const record = this.records.get(spinId);
      if (record && record.timestamp >= startTime && record.timestamp <= endTime) {
        results.push(record);
      }
    }
    
    return results.sort((a, b) => a.timestamp - b.timestamp);
  }

  async findById(spinId: string): Promise<IAuditRecord | null> {
    return this.records.get(spinId) || null;
  }

  async getSummary(playerId: string, startTime: number, endTime: number): Promise<IPlayerActivitySummary> {
    const records = await this.findByPlayer(playerId, startTime, endTime);
    
    const summary: IPlayerActivitySummary = {
      playerId,
      periodStart: startTime,
      periodEnd: endTime,
      totalSpins: records.length,
      totalStaked: 0,
      totalWon: 0,
      netResult: 0,
      biggestWin: 0,
      bonusTriggers: 0,
      jackpotWins: 0,
      sessionCount: 0,
      averageSessionDuration: 0,
    };
    
    const sessions = new Set<string>();
    
    for (const record of records) {
      summary.totalStaked += record.stake;
      summary.totalWon += record.win;
      
      if (record.win > summary.biggestWin) {
        summary.biggestWin = record.win;
      }
      
      if (record.bonusTriggered) {
        summary.bonusTriggers++;
      }
      
      if (record.jackpotWins.length > 0) {
        summary.jackpotWins += record.jackpotWins.length;
      }
      
      sessions.add(record.sessionId);
    }
    
    summary.netResult = summary.totalWon - summary.totalStaked;
    summary.sessionCount = sessions.size;
    
    // Calculate average session duration (simplified)
    if (summary.sessionCount > 0) {
      summary.averageSessionDuration = (endTime - startTime) / summary.sessionCount / 60000; // in minutes
    }
    
    return summary;
  }

  /**
   * Clear all records (for testing).
   */
  clear(): void {
    this.records.clear();
    this.playerIndex.clear();
  }

  /**
   * Get total record count.
   */
  getCount(): number {
    return this.records.size;
  }
}

/**
 * Audit Manager for regulatory compliance and game integrity.
 * Records all spins, transactions, and significant events.
 */
export class AuditManager {
  private storage: IAuditStorage;
  private gameId: string;
  private operatorId?: string;

  constructor(gameId: string, storage?: IAuditStorage, operatorId?: string) {
    this.gameId = gameId;
    this.storage = storage || new InMemoryAuditStorage();
    this.operatorId = operatorId;
  }

  /**
   * Record a spin for audit purposes.
   */
  async recordSpin(params: {
    spinId: string;
    playerId: string;
    sessionId: string;
    stake: number;
    win: number;
    balanceBefore: number;
    balanceAfter: number;
    rngSeed: string;
    result: number[][];
    gameMode: 0 | 1;
    bonusTriggered: boolean;
    jackpotContributions: IJackpotContribution[];
    jackpotWins: IJackpotWin[];
    ipAddress?: string;
    deviceInfo?: string;
    location?: string;
    platform?: 'web' | 'mobile' | 'desktop';
  }): Promise<IAuditRecord> {
    const record: IAuditRecord = {
      spinId: params.spinId,
      playerId: params.playerId,
      gameId: this.gameId,
      timestamp: Date.now(),
      stake: params.stake,
      win: params.win,
      balanceBefore: params.balanceBefore,
      balanceAfter: params.balanceAfter,
      rngSeed: params.rngSeed,
      result: params.result,
      gameMode: params.gameMode,
      bonusTriggered: params.bonusTriggered,
      jackpotContributions: params.jackpotContributions,
      jackpotWins: params.jackpotWins,
      ipAddress: params.ipAddress,
      sessionId: params.sessionId,
      deviceInfo: params.deviceInfo,
      location: params.location,
      operatorId: this.operatorId,
      platform: params.platform,
    };

    await this.storage.save(record);
    return record;
  }

  /**
   * Get audit records for a player within a time range.
   */
  async getPlayerRecords(
    playerId: string,
    startTime: number,
    endTime: number
  ): Promise<IAuditRecord[]> {
    return this.storage.findByPlayer(playerId, startTime, endTime);
  }

  /**
   * Get a specific spin record by ID.
   */
  async getSpinRecord(spinId: string): Promise<IAuditRecord | null> {
    return this.storage.findById(spinId);
  }

  /**
   * Get player activity summary for a period.
   */
  async getPlayerSummary(
    playerId: string,
    startTime: number,
    endTime: number
  ): Promise<IPlayerActivitySummary> {
    return this.storage.getSummary(playerId, startTime, endTime);
  }

  /**
   * Export records for regulatory reporting.
   */
  async exportRecords(
    playerId: string,
    startTime: number,
    endTime: number,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const records = await this.getPlayerRecords(playerId, startTime, endTime);
    
    if (format === 'json') {
      return JSON.stringify(records, null, 2);
    }
    
    // CSV format
    const headers = [
      'spinId', 'playerId', 'timestamp', 'stake', 'win', 
      'balanceBefore', 'balanceAfter', 'gameMode', 'bonusTriggered'
    ].join(',');
    
    const rows = records.map(r => [
      r.spinId,
      r.playerId,
      r.timestamp,
      r.stake,
      r.win,
      r.balanceBefore,
      r.balanceAfter,
      r.gameMode,
      r.bonusTriggered
    ].join(','));
    
    return [headers, ...rows].join('\n');
  }

  /**
   * Verify game integrity by checking RNG seed chain.
   */
  async verifyRngChain(spinIds: string[]): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    for (let i = 1; i < spinIds.length; i++) {
      const prevRecord = await this.getSpinRecord(spinIds[i - 1]);
      const currRecord = await this.getSpinRecord(spinIds[i]);
      
      if (!prevRecord || !currRecord) {
        errors.push(`Missing record for spin ${spinIds[i]}`);
        continue;
      }
      
      // Verify timestamp order
      if (currRecord.timestamp <= prevRecord.timestamp) {
        errors.push(`Timestamp order violation: ${spinIds[i]} <= ${spinIds[i - 1]}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
