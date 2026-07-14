import {
  type IGameConfigData,
  type IInitResponse,
  type ISpinRequestData,
  type ISpinResponseData,
  type IBonusResponse,
  type IHistoryResponse,
  type IPlayerState,
  type IWinLine,
} from './types.js';
import { Random } from './Random.js';
import { SpinEvaluator } from './SpinEvaluator.js';
import { BonusManager } from './BonusManager.js';
import { HistoryManager } from './HistoryManager.js';

export interface IBalanceProvider {
  getBalance(playerId: string): number;
  setBalance(playerId: string, amount: number): void;
}

export class GameSession {
  private config: IGameConfigData;
  private playerId: string;
  private balanceProvider: IBalanceProvider;
  private state: IPlayerState;
  private spinEvaluator: SpinEvaluator;
  private bonusManager: BonusManager;
  private historyManager: HistoryManager;
  private rng: Random;

  constructor(
    config: IGameConfigData,
    playerId: string,
    balanceProvider: IBalanceProvider,
    seed?: number
  ) {
    this.config = config;
    this.playerId = playerId;
    this.balanceProvider = balanceProvider;

    this.rng = new Random(seed);
    this.spinEvaluator = new SpinEvaluator(config, this.rng);
    this.bonusManager = new BonusManager(this.rng);
    this.historyManager = new HistoryManager(100);

    const initialBalance = balanceProvider.getBalance(playerId);
    this.state = {
      balance: initialBalance,
      bet: config.defaultBet || 1,
      gameMode: 0,
      freeSpinsRemaining: 0,
      bonusActive: false,
      history: [],
    };
  }

  /**
   * Get the current full player state.
   */
  getState(): IPlayerState {
    return { ...this.state };
  }

  /**
   * Build the INIT response for the client.
   */
  getInitResponse(): IInitResponse {
    return {
      balance: this.state.balance,
      bet: this.state.bet,
      config: this.config,
      bonusOffers: null, // you can add offers here
      state: {
        gameMode: this.state.gameMode,
        freeSpinsRemaining: this.state.freeSpinsRemaining,
        bonusActive: this.state.bonusActive,
      },
    };
  }

  /**
   * Set the player's bet.
   */
  setBet(bet: number): void {
    if (bet < this.config.minBet! || bet > this.config.maxBet!) {
      throw new Error(`Bet must be between ${this.config.minBet} and ${this.config.maxBet}`);
    }
    this.state.bet = bet;
  }

  /**
   * Process a spin request.
   */
  spin(request: ISpinRequestData): ISpinResponseData {
    const totalStake = request.totalStake;
    const stakePerLine = request.stakePerLine;

    // Check balance
    if (this.state.balance < totalStake) {
      return { ...this.createErrorResponse('Insufficient balance'), balanceAfter: this.state.balance };
    }

    // Deduct the stake
    this.state.balance -= totalStake;
    this.balanceProvider.setBalance(this.playerId, this.state.balance);

    // If in bonus mode, handle free spin
    let spinResult: Omit<ISpinResponseData, 'balanceAfter'>;
    let isBonusSpin = false;

    if (this.bonusManager.isActive() && this.bonusManager.getState()?.type === 'freespin') {
      // Generate a spin result (without balance)
      const rawResult = this.spinEvaluator.generateResult();
      
      // FIXED: Forwarded request.action to correctly satisfy the required ISpinRequestData structure mapping rule
      const evaluated = this.spinEvaluator.spin({
        action: request.action,
        stakePerLine: request.stakePerLine,
        selectedLines: request.selectedLines,
        totalStake: request.totalStake,
        gameMode: 1,
      });
      // Apply bonus multiplier
      const bonusSpinResult = this.bonusManager.processFreeSpin(evaluated);
      spinResult = bonusSpinResult;
      isBonusSpin = true;
    } else {
      // Normal spin
      spinResult = this.spinEvaluator.spin(request);
    }

    // Check for bonus trigger (only on non-bonus spins)
    let bonusTriggered = false;
    let bonusData = null;
    if (!isBonusSpin) {
      const trigger = this.bonusManager.checkTrigger(spinResult.result);
      if (trigger.triggered) {
        bonusTriggered = true;
        bonusData = trigger.data;
        // Start free spins
        const freeSpins = bonusData.freeSpins || 5;
        const multiplier = bonusData.multiplier || 1;
        this.bonusManager.startFreeSpins(freeSpins, multiplier, request.stakePerLine);
        this.state.bonusActive = true;
        this.state.freeSpinsRemaining = freeSpins;
        spinResult.freeSpinsRemaining = freeSpins;
        spinResult.bonusTriggered = true;
        spinResult.bonusData = bonusData;
      }
    }

    // Add win to balance (if any)
    const winAmount = spinResult.totalWin || 0;
    if (winAmount > 0) {
      this.state.balance += winAmount;
      this.balanceProvider.setBalance(this.playerId, this.state.balance);
    }

    // Update free spins remaining
    if (spinResult.freeSpinsRemaining !== undefined) {
      this.state.freeSpinsRemaining = spinResult.freeSpinsRemaining;
      if (this.state.freeSpinsRemaining <= 0) {
        this.state.bonusActive = false;
        this.bonusManager.endBonus();
      }
    }

    // Add to history
    this.historyManager.addEntry(
      spinResult.result,
      request.totalStake,
      winAmount,
      this.state.balance,
      request.gameMode
    );

    // Build final response
    const response: ISpinResponseData = {
      ...spinResult,
      balanceAfter: this.state.balance,
    };

    // If there are win lines, include them
    if (spinResult.winLines) {
      response.winLines = spinResult.winLines;
    }

    return response;
  }

  /**
   * Get history.
   */
  getHistory(limit: number = 20): IHistoryResponse {
    const entries = this.historyManager.getLast(limit);
    return {
      entries,
      total: this.historyManager.getEntries().length,
    };
  }

  /**
   * Process a bonus action (e.g., pick).
   */
  bonusAction(action: string, payload?: any): IBonusResponse {
    if (action === 'pick' && payload?.itemId) {
      const result = this.bonusManager.pickItem(payload.itemId);
      // Add win to balance
      const win = result.win;
      if (win > 0) {
        this.state.balance += win;
        this.balanceProvider.setBalance(this.playerId, this.state.balance);
      }
      const remaining = result.remaining;
      if (remaining.length === 0) {
        this.bonusManager.endBonus();
        this.state.bonusActive = false;
        return {
          state: 'COMPLETE',
          data: { totalWin: (this.bonusManager.getState() as any)?.totalWin || 0 },
        };
      }
      return {
        state: 'ACTIVE',
        data: { remaining, lastWin: win },
      };
    }
    throw new Error(`Unknown bonus action: ${action}`);
  }

  /**
   * Helper to create an error response.
   */
  private createErrorResponse(error: string): Omit<ISpinResponseData, 'balanceAfter'> {
    return {
      result: [],
      totalWin: 0,
      stakePerLine: 0,
      totalStake: 0,
      gameMode: 0,
      error,
    };
  }
}
