import { 
  type IWalletStorage, 
  type ITransaction, 
  type IWalletBalance, 
  type TransactionType, 
  type IWalletConfig, 
  type ITransactionResult 
} from './types.js';

/**
 * In-Memory Implementation of IWalletStorage
 * Useful for testing or serverless environments without a DB connection.
 * NOT recommended for production persistent storage.
 */
export class InMemoryWalletStorage implements IWalletStorage {
  private balances: Map<string, IWalletBalance> = new Map();
  private transactions: Map<string, ITransaction[]> = new Map();

  async getBalance(userId: string): Promise<IWalletBalance | null> {
    return this.balances.get(userId) || null;
  }

  async updateBalance(
    userId: string, 
    amount: string, 
    version: number
  ): Promise<IWalletBalance | null> {
    const current = this.balances.get(userId);
    
    // Optimistic locking check
    if (current && current.version !== version) {
      return null; // Conflict detected
    }

    const newBalance = current 
      ? parseFloat(current.amount) + parseFloat(amount)
      : parseFloat(amount);

    const updatedBalance: IWalletBalance = {
      userId,
      amount: newBalance.toFixed(4), // Adjust precision as needed
      version: (current?.version || 0) + 1,
      updatedAt: new Date()
    };

    this.balances.set(userId, updatedBalance);
    return updatedBalance;
  }

  async recordTransaction(transaction: ITransaction): Promise<void> {
    const userTxns = this.transactions.get(transaction.userId) || [];
    userTxns.push(transaction);
    this.transactions.set(transaction.userId, userTxns);
  }

  async getTransactionHistory(userId: string, limit: number = 50): Promise<ITransaction[]> {
    const userTxns = this.transactions.get(userId) || [];
    return userTxns.slice(-limit);
  }
}

/**
 * WalletManager
 * Handles atomic financial operations for the slot engine.
 */
export class WalletManager {
  private storage: IWalletStorage;
  private config: IWalletConfig;

  constructor(storage: IWalletStorage, config: IWalletConfig) {
    this.storage = storage;
    this.config = config;
  }

  /**
   * Place a bet (deduct funds)
   */
  async placeBet(userId: string, amount: number, gameId: string, roundId: string): Promise<ITransactionResult> {
    return this.executeTransaction(userId, -amount, 'bet', { gameId, roundId });
  }

  /**
   * Credit winnings
   */
  async creditWin(userId: string, amount: number, gameId: string, roundId: string, winType: 'normal' | 'bonus' | 'jackpot' = 'normal'): Promise<ITransactionResult> {
    let type: TransactionType = 'payout';
    if (winType === 'bonus') type = 'bonus_payout';
    if (winType === 'jackpot') type = 'jackpot_win';
    
    return this.executeTransaction(userId, amount, type, { gameId, roundId });
  }

  /**
   * Core transaction logic with optimistic locking
   */
  private async executeTransaction(
    userId: string, 
    amount: number, 
    type: TransactionType, 
    metadata: { gameId: string, roundId: string }
  ): Promise<ITransactionResult> {
    
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // 1. Get current state
        const currentBalance = await this.storage.getBalance(userId);
        const currentAmount = currentBalance ? parseFloat(currentBalance.amount) : 0;
        const version = currentBalance?.version || 0;

        // 2. Validate constraints
        if (amount < 0 && currentAmount + amount < 0) {
          return { success: false, error: 'Insufficient funds', code: 'INSUFFICIENT_FUNDS' };
        }

        const newAmount = currentAmount + amount;
        
        // 3. Attempt update (atomic via storage implementation)
        const updatedBalance = await this.storage.updateBalance(userId, amount.toString(), version);

        if (!updatedBalance) {
          // Optimistic lock failure, retry
          attempt++;
          continue;
        }

        // 4. Record Ledger Entry
        const transaction: ITransaction = {
          id: crypto.randomUUID(),
          userId,
          type,
          amount: amount.toString(),
          balanceBefore: currentAmount.toString(),
          balanceAfter: newAmount.toString(),
          referenceId: metadata.roundId,
          metadata: { gameId: metadata.gameId },
          createdAt: new Date()
        };

        await this.storage.recordTransaction(transaction);

        return {
          success: true,
          balance: updatedBalance.amount,
          transactionId: transaction.id
        };

      } catch (error) {
        return { success: false, error: (error as Error).message, code: 'INTERNAL_ERROR' };
      }
    }

    return { success: false, error: 'Transaction failed after retries', code: 'CONFLICT' };
  }

  /**
   * Transfer funds between users (e.g., P2P features)
   */
  async transfer(fromId: string, toId: string, amount: number): Promise<ITransactionResult> {
    // Implementation would require a distributed lock or DB transaction block
    // This is a simplified conceptual example
    const debit = await this.placeBet(fromId, amount, 'transfer', `tx-${Date.now()}`);
    if (!debit.success) return debit;

    const credit = await this.creditWin(toId, amount, 'transfer', `tx-${Date.now()}`, 'normal');
    if (!credit.success) {
      // Rollback logic needed here in production
      return { success: false, error: 'Transfer partial failure', code: 'ROLLBACK_REQUIRED' };
    }

    return { success: true, message: 'Transfer complete' };
  }
}