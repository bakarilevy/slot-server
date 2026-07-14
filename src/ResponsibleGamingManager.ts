import type {
  IResponsibleGamingLimits,
  IPlayerState,
  Result,
} from './types.js';

/**
 * Session time tracking information.
 */
export interface ISessionTimeInfo {
  sessionStartTime: number;
  elapsedMinutes: number;
  limitMinutes?: number;
  isLimitReached: boolean;
  warningThresholdReached: boolean;
}

/**
 * Loss tracking information.
 */
export interface ILossTrackingInfo {
  sessionLoss: number;
  lossLimit?: number;
  isLimitReached: boolean;
  warningThresholdReached: boolean;
}

/**
 * Win tracking information.
 */
export interface IWinTrackingInfo {
  sessionWin: number;
  winGoal?: number;
  isGoalReached: boolean;
  notificationSent: boolean;
}

/**
 * Reality check event.
 */
export interface IRealityCheckEvent {
  timestamp: number;
  elapsedMinutes: number;
  totalSpins: number;
  totalStaked: number;
  totalWon: number;
  netResult: number;
  message: string;
}

/**
 * Self-exclusion status.
 */
export interface ISelfExclusionStatus {
  isExcluded: boolean;
  exclusionUntil?: Date;
  remainingDays?: number;
  reason?: string;
}

/**
 * Responsible gaming alert.
 */
export interface IRGAlert {
  type: 'session_time' | 'loss_limit' | 'win_goal' | 'reality_check' | 'self_exclusion' | 'bet_limit';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
  actionRequired?: boolean;
  suggestedAction?: string;
}

/**
 * Player activity statistics for responsible gaming.
 */
export interface IPlayerActivityStats {
  totalSessions: number;
  totalTimePlayed: number; // minutes
  totalStaked: number;
  totalWon: number;
  netResult: number;
  averageSessionDuration: number;
  longestSession: number;
  biggestLoss: number;
  biggestWin: number;
  lastSessionDate?: number;
}

/**
 * Responsible Gaming Manager - Comprehensive player protection system.
 * 
 * Features:
 * - Session time limits with warnings
 * - Loss limits with automatic blocking
 * - Win goals with notifications
 * - Reality check reminders
 * - Self-exclusion enforcement
 * - Bet limit enforcement
 * - Activity monitoring and alerts
 * - Pattern analysis for problem gambling detection
 */
export class ResponsibleGamingManager {
  private limits: IResponsibleGamingLimits;
  private playerState: IPlayerState;
  private alerts: IRGAlert[] = [];
  private realityCheckCounter: number = 0;
  private lastRealityCheckTime: number = 0;

  constructor(limits: IResponsibleGamingLimits, playerState: IPlayerState) {
    this.limits = limits;
    this.playerState = playerState;
    
    // Initialize session start time if not set
    if (!playerState.sessionStartTime && limits.sessionTimeLimit) {
      playerState.sessionStartTime = Date.now();
    }
  }

  /**
   * Update player state (call after each spin).
   */
  public updatePlayerState(state: Partial<IPlayerState>): void {
    this.playerState = { ...this.playerState, ...state };
    
    // Check all limits after update
    this.checkAllLimits();
  }

  /**
   * Update responsible gaming limits (e.g., player changed their limits).
   */
  public updateLimits(newLimits: Partial<IResponsibleGamingLimits>): void {
    this.limits = { ...this.limits, ...newLimits };
    
    // Validate new limits
    this.validateLimits();
    
    // Re-check all limits with new values
    this.checkAllLimits();
  }

  /**
   * Check if player can place a bet of the given amount.
   */
  public canPlaceBet(betAmount: number): Result<boolean, string> {
    // Check self-exclusion first
    const selfExclusion = this.getSelfExclusionStatus();
    if (selfExclusion.isExcluded) {
      return {
        success: false,
        error: `Player is self-excluded until ${selfExclusion.exclusionUntil?.toISOString()}`,
      };
    }

    // Check max bet limit
    if (this.limits.maxBetLimit && betAmount > this.limits.maxBetLimit) {
      return {
        success: false,
        error: `Bet amount ${betAmount} exceeds maximum allowed bet of ${this.limits.maxBetLimit}`,
      };
    }

    // Check loss limit
    const lossInfo = this.getLossTrackingInfo();
    if (lossInfo.isLimitReached) {
      return {
        success: false,
        error: `Session loss limit of ${this.limits.lossLimit} has been reached`,
      };
    }

    // Check session time limit
    const timeInfo = this.getSessionTimeInfo();
    if (timeInfo.isLimitReached) {
      return {
        success: false,
        error: `Session time limit of ${this.limits.sessionTimeLimit} minutes has been reached`,
      };
    }

    return { success: true, data: true };
  }

  /**
   * Check if player can continue playing (general eligibility).
   */
  public canContinuePlaying(): Result<boolean, string> {
    return this.canPlaceBet(0);
  }

  /**
   * Get session time tracking information.
   */
  public getSessionTimeInfo(): ISessionTimeInfo {
    const startTime = this.playerState.sessionStartTime || Date.now();
    const elapsedMs = Date.now() - startTime;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    
    const limitMinutes = this.limits.sessionTimeLimit;
    const isLimitReached = limitMinutes ? elapsedMinutes >= limitMinutes : false;
    
    // Warning at 80% of limit
    const warningThreshold = limitMinutes ? limitMinutes * 0.8 : 0;
    const warningThresholdReached = limitMinutes ? elapsedMinutes >= warningThreshold : false;

    return {
      sessionStartTime: startTime,
      elapsedMinutes,
      limitMinutes,
      isLimitReached,
      warningThresholdReached,
    };
  }

  /**
   * Get loss tracking information.
   */
  public getLossTrackingInfo(): ILossTrackingInfo {
    const sessionLoss = this.playerState.sessionLoss || 0;
    const lossLimit = this.limits.lossLimit;
    const isLimitReached = lossLimit ? sessionLoss >= lossLimit : false;
    
    // Warning at 80% of limit
    const warningThreshold = lossLimit ? lossLimit * 0.8 : 0;
    const warningThresholdReached = lossLimit ? sessionLoss >= warningThreshold : false;

    return {
      sessionLoss,
      lossLimit,
      isLimitReached,
      warningThresholdReached,
    };
  }

  /**
   * Get win tracking information.
   */
  public getWinTrackingInfo(): IWinTrackingInfo {
    const sessionWin = this.playerState.sessionWin || 0;
    const winGoal = this.limits.winGoal;
    const isGoalReached = winGoal ? sessionWin >= winGoal : false;
    
    // Check if notification was already sent (simplified - in production use persistent storage)
    const notificationSent = isGoalReached && this.alerts.some(
      a => a.type === 'win_goal' && !a.actionRequired
    );

    return {
      sessionWin,
      winGoal,
      isGoalReached,
      notificationSent,
    };
  }

  /**
   * Get self-exclusion status.
   */
  public getSelfExclusionStatus(): ISelfExclusionStatus {
    const exclusionUntil = this.limits.selfExclusionUntil;
    
    if (!exclusionUntil) {
      return { isExcluded: false };
    }

    const exclusionDate = new Date(exclusionUntil);
    const now = new Date();
    const isExcluded = now < exclusionDate;
    
    if (!isExcluded) {
      return { isExcluded: false };
    }

    const remainingDays = Math.ceil((exclusionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      isExcluded: true,
      exclusionUntil: exclusionDate,
      remainingDays,
    };
  }

  /**
   * Check if reality check is due.
   */
  public shouldShowRealityCheck(): boolean {
    const interval = this.limits.realityCheckInterval;
    if (!interval || !this.playerState.sessionStartTime) {
      return false;
    }

    const elapsedMinutes = this.getSessionTimeInfo().elapsedMinutes;
    const checksDue = Math.floor(elapsedMinutes / interval);
    
    return checksDue > this.realityCheckCounter;
  }

  /**
   * Generate reality check event.
   */
  public generateRealityCheck(): IRealityCheckEvent | null {
    if (!this.shouldShowRealityCheck()) {
      return null;
    }

    this.realityCheckCounter++;
    this.lastRealityCheckTime = Date.now();

    const elapsedMinutes = this.getSessionTimeInfo().elapsedMinutes;
    const totalSpins = this.playerState.history?.length || 0;
    const totalStaked = this.playerState.history?.reduce((sum, entry) => sum + entry.bet, 0) || 0;
    const totalWon = this.playerState.history?.reduce((sum, entry) => sum + entry.win, 0) || 0;
    const netResult = totalWon - totalStaked;

    const event: IRealityCheckEvent = {
      timestamp: Date.now(),
      elapsedMinutes,
      totalSpins,
      totalStaked,
      totalWon,
      netResult,
      message: `Reality Check: You've been playing for ${elapsedMinutes} minutes. Total staked: ${totalStaked}, Total won: ${totalWon}, Net: ${netResult}`,
    };

    this.addAlert({
      type: 'reality_check',
      severity: 'info',
      message: event.message,
      timestamp: event.timestamp,
    });

    return event;
  }

  /**
   * Check all limits and generate alerts.
   */
  private checkAllLimits(): void {
    // Check session time
    const timeInfo = this.getSessionTimeInfo();
    if (timeInfo.isLimitReached) {
      this.addAlert({
        type: 'session_time',
        severity: 'critical',
        message: `Session time limit of ${this.limits.sessionTimeLimit} minutes reached. Play suspended.`,
        timestamp: Date.now(),
        actionRequired: true,
        suggestedAction: 'Please take a break or end your session.',
      });
    } else if (timeInfo.warningThresholdReached) {
      this.addAlert({
        type: 'session_time',
        severity: 'warning',
        message: `You've been playing for ${timeInfo.elapsedMinutes} minutes. Limit is ${this.limits.sessionTimeLimit} minutes.`,
        timestamp: Date.now(),
        actionRequired: false,
      });
    }

    // Check loss limit
    const lossInfo = this.getLossTrackingInfo();
    if (lossInfo.isLimitReached) {
      this.addAlert({
        type: 'loss_limit',
        severity: 'critical',
        message: `Session loss limit of ${this.limits.lossLimit} reached. Play suspended.`,
        timestamp: Date.now(),
        actionRequired: true,
        suggestedAction: 'Please end your session or wait until tomorrow.',
      });
    } else if (lossInfo.warningThresholdReached) {
      this.addAlert({
        type: 'loss_limit',
        severity: 'warning',
        message: `Your session losses are ${lossInfo.sessionLoss}. Limit is ${this.limits.lossLimit}.`,
        timestamp: Date.now(),
        actionRequired: false,
      });
    }

    // Check win goal
    const winInfo = this.getWinTrackingInfo();
    if (winInfo.isGoalReached && !winInfo.notificationSent) {
      this.addAlert({
        type: 'win_goal',
        severity: 'info',
        message: `Congratulations! You've reached your win goal of ${this.limits.winGoal}.`,
        timestamp: Date.now(),
        actionRequired: false,
        suggestedAction: 'Consider cashing out your winnings.',
      });
    }
  }

  /**
   * Add an alert to the list.
   */
  private addAlert(alert: IRGAlert): void {
    this.alerts.push(alert);
    
    // Keep only last 100 alerts to prevent memory issues
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Get all active alerts.
   */
  public getAlerts(): IRGAlert[] {
    return [...this.alerts];
  }

  /**
   * Clear alerts (call after player acknowledges them).
   */
  public clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Get player activity statistics.
   */
  public getPlayerActivityStats(): IPlayerActivityStats {
    const history = this.playerState.history || [];
    
    const totalStaked = history.reduce((sum, entry) => sum + entry.bet, 0);
    const totalWon = history.reduce((sum, entry) => sum + entry.win, 0);
    
    // Calculate session duration if start time is available
    let totalTimePlayed = 0;
    if (this.playerState.sessionStartTime) {
      totalTimePlayed = this.getSessionTimeInfo().elapsedMinutes;
    }

    return {
      totalSessions: 1, // In production, track across multiple sessions
      totalTimePlayed,
      totalStaked,
      totalWon,
      netResult: totalWon - totalStaked,
      averageSessionDuration: totalTimePlayed,
      longestSession: totalTimePlayed,
      biggestLoss: Math.min(0, totalWon - totalStaked),
      biggestWin: Math.max(0, ...history.map(h => h.win)),
      lastSessionDate: this.playerState.sessionStartTime,
    };
  }

  /**
   * Validate limits configuration.
   */
  private validateLimits(): void {
    const errors: string[] = [];

    if (this.limits.sessionTimeLimit && this.limits.sessionTimeLimit <= 0) {
      errors.push('Session time limit must be positive');
    }

    if (this.limits.lossLimit && this.limits.lossLimit <= 0) {
      errors.push('Loss limit must be positive');
    }

    if (this.limits.winGoal && this.limits.winGoal <= 0) {
      errors.push('Win goal must be positive');
    }

    if (this.limits.maxBetLimit && this.limits.maxBetLimit <= 0) {
      errors.push('Max bet limit must be positive');
    }

    if (this.limits.realityCheckInterval && this.limits.realityCheckInterval <= 0) {
      errors.push('Reality check interval must be positive');
    }

    if (this.limits.selfExclusionUntil) {
      const exclusionDate = new Date(this.limits.selfExclusionUntil);
      if (isNaN(exclusionDate.getTime())) {
        errors.push('Invalid self-exclusion date format');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Invalid RG limits configuration: ${errors.join(', ')}`);
    }
  }

  /**
   * Reset session tracking (call when player starts new session).
   */
  public resetSession(): void {
    this.playerState.sessionStartTime = Date.now();
    this.playerState.sessionLoss = 0;
    this.playerState.sessionWin = 0;
    this.realityCheckCounter = 0;
    this.clearAlerts();
  }

  /**
   * Apply a win/loss result to session tracking.
   */
  public applyResult(stake: number, win: number): void {
    const netResult = win - stake;
    
    // Update session loss (only track negative results)
    if (netResult < 0) {
      this.playerState.sessionLoss = (this.playerState.sessionLoss || 0) + Math.abs(netResult);
    }
    
    // Update session win (only track positive results)
    if (netResult > 0) {
      this.playerState.sessionWin = (this.playerState.sessionWin || 0) + netResult;
    }

    // Check limits after applying result
    this.checkAllLimits();
  }

  /**
   * Export responsible gaming report for player download.
   */
  public exportRGReport(): string {
    const stats = this.getPlayerActivityStats();
    const selfExclusion = this.getSelfExclusionStatus();
    
    const report = {
      reportGenerated: new Date().toISOString(),
      playerLimits: this.limits,
      selfExclusionStatus: selfExclusion,
      activityStatistics: stats,
      recentAlerts: this.alerts.slice(-20),
    };

    return JSON.stringify(report, null, 2);
  }
}
