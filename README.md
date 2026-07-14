# Slot Server

A professional server-side companion library for the [Slot Engine client](https://github.com/bakarilevy/slot-engine).  
It provides comprehensive types, game logic managers, and utilities to handle all server-side operations for modern slot games including spins, bonuses, jackpots, gamble features, and regulatory compliance.

## Features

### Core Features
- **Full game state management** - Balance, bet, free spins, bonus tracking
- **Configurable game data** - Symbols, paytables, reel strips, paylines
- **Spin evaluation** - Win calculation with payline and ways-to-win support
- **Bonus system** - Free spins, pick'em games, and extensible bonus framework
- **History tracking** - Complete spin history with audit trail

### Advanced Features
- **Progressive Jackpots** - Multi-tier jackpot system with contribution tracking
- **Ways-to-Win** - Support for 243/1024/4096 ways mechanics
- **Gamble Feature** - Card guess, ladder climb, and wheel mini-games
- **Buy Bonus** - Direct bonus purchase with configurable limits and cooldowns

### Enhanced Gameplay Features (NEW)
- **Cascading Reels** - Tumbling mechanics with symbol removal, gravity drops, chain reactions, and progressive multipliers
- **Expanding Wilds** - Wild expansion to cover entire reels with configurable triggers and multiplier stacking
- **Sticky Wilds** - Persistent wilds that stay in place for multiple spins
- **Scatter Enhancements** - Advanced scatter mechanics including cluster triggers, collection systems, progressive scatters, transformation mechanics, and multiplier zones
- **Respins / Hold & Win** - Locking symbols for respin rounds, money symbol collection, reset symbols, jackpot symbols (Mini/Minor/Major/Grand), full screen bonuses, and weighted symbol generation

### Compliance & Operations (NEW)
- **Audit System** - Complete spin audit records for regulatory compliance with export capabilities
- **Debug Mode** - Comprehensive debugging tools with logging, forced outcomes, and state inspection
- **Responsible Gaming** - Session limits, reality checks, self-exclusion support
- **Tournament Mode** - Leaderboards, scoring, and time-limited competitions

## Installation

```bash
npm install slot-server
```

## Quick Start

```ts
import { 
  ConfigBuilder, 
  GameSession, 
  sampleConfig,
  JackpotManager,
  WaysEvaluator,
  GambleManager,
  BuyBonusManager,
  CascadingReelsManager,
  ExpandingWildsManager,
  ScatterEnhancementsManager,
  RespinsManager,
  AuditManager,
  DebugManager
} from 'slot-server';

// 1. Build your game configuration
const config = new ConfigBuilder()
  .setGameId('my-game')
  .setReelCount(5)
  .setRowCount(3)
  .setSymbolMap({ 0: 'symbol0', 1: 'symbol1', ... })
  .setPaytableData({ 0: { x3: 10, x4: 20, x5: 50 }, ... })
  .setReelStrips([[...], ...])
  .setLinePatterns([...])
  .setBetRange(0.1, 100, 0.1, 1)
  .build();

// Or use the sample config:
// const config = sampleConfig;

// 2. Implement a balance provider (e.g., using a database)
const balanceProvider = {
  getBalance: (playerId) => getFromDB(playerId),
  setBalance: (playerId, amount) => updateDB(playerId, amount),
};

// 3. Create a game session for a player
const session = new GameSession(config, 'player-123', balanceProvider);

// 4. Send INIT response to client
const initResponse = session.getInitResponse();
// Send via WebSocket: ws.send(JSON.stringify({ type: 'INIT', data: initResponse }))

// 5. Process a spin request
const spinRequest = {
  action: 'spin',
  stakePerLine: 1,
  selectedLines: 5,
  totalStake: 5,
  gameMode: 0, // 0 = main game, 1 = bonus/free spins
};
const spinResult = session.spin(spinRequest);
// Send result to client: ws.send(JSON.stringify({ type: 'SPIN', data: spinResult }))

// 6. Handle bonus actions (e.g., pick'em games)
const bonusResult = session.bonusAction('pick', { itemId: 'item-123' });
```

## Advanced Usage

### Progressive Jackpots

```ts
import { Random, JackpotManager } from 'slot-server';

const rng = new Random();
const jackpotConfig = {
  enabled: true,
  type: 'standalone' as const,
  tiers: [
    {
      id: 'mini',
      name: 'Mini Jackpot',
      seedAmount: 100,
      currentAmount: 100,
      triggerProbability: 0.001,
      contributionRate: 0.5, // 0.5% of each bet
    },
    {
      id: 'major',
      name: 'Major Jackpot',
      seedAmount: 1000,
      currentAmount: 1000,
      triggerProbability: 0.0001,
      contributionRate: 0.3,
    },
  ],
};

const jackpotManager = new JackpotManager(jackpotConfig, rng);

// On each spin, calculate contributions
const contributions = jackpotManager.calculateContribution(totalStake);

// Check for jackpot trigger
const jackpotWin = jackpotManager.checkTrigger();
if (jackpotWin) {
  console.log(`Jackpot won: ${jackpotWin.tierName} - $${jackpotWin.winAmount}`);
}
```

### Ways-to-Win Evaluation

```ts
import { WaysEvaluator } from 'slot-server';

const waysConfig = {
  enabled: true,
  waysCount: 243,
  minMatches: 3,
  direction: 'leftToRight' as const,
};

const evaluator = new WaysEvaluator(
  waysConfig,
  paytableData,
  reelCount,
  rowCount
);

const result = evaluator.evaluate(spinResult, stakePerLine);
console.log(`Total ways: ${result.ways}, Total win: ${result.totalWin}`);
```

### Gamble Feature

```ts
import { Random, GambleManager } from 'slot-server';

const rng = new Random();
const gambleConfig = {
  enabled: true,
  maxGambleAmount: 500,
  maxConsecutiveGambles: 5,
  gameTypes: ['card', 'ladder', 'wheel'] as const,
  autoCollectAt: 1000,
};

const gambleManager = new GambleManager(gambleConfig, rng);

// Player wants to gamble their win
if (gambleManager.canGamble(currentWin)) {
  const gambleRequest = {
    action: 'gamble',
    gambleType: 'card',
    currentWin,
    choice: 'red', // or 'black'
  };
  const gambleResult = gambleManager.processGamble(gambleRequest);
  
  if (gambleResult.result === 'win') {
    console.log(`Won $${gambleResult.winAmount}!`);
  }
}
```

### Buy Bonus Feature

```ts
import { BuyBonusManager } from 'slot-server';

const buyBonusConfig = {
  enabled: true,
  costMultiplier: 100, // 100x bet
  minBetRequired: 1,
  maxPurchasesPerSession: 3,
  cooldownMs: 5000, // 5 seconds between purchases
};

const buyBonusManager = new BuyBonusManager(buyBonusConfig);

// Check if player can buy bonus
const canBuy = buyBonusManager.canBuyBonus(currentBet);
if (canBuy.canBuy) {
  console.log(`Cost: $${canBuy.cost}`);
  buyBonusManager.recordPurchase();
  // Trigger bonus round
}
```

### Cascading Reels

```ts
import { CascadingReelsManager } from 'slot-server';

const cascadeConfig = {
  enabled: true,
  maxCascades: 10,
  initialMultiplier: 1,
  multiplierIncrement: 1, // +1 per cascade
  symbolPool: [...], // Your symbol pool for filling empty positions
  stopOnNoWinIncrease: true,
};

const cascadeManager = new CascadingReelsManager(cascadeConfig);

// After initial spin evaluation with wins
const cascadeResult = cascadeManager.executeCascade(gameState, initialWins);

console.log(`Total cascades: ${cascadeResult.totalCascades}`);
console.log(`Final multiplier: ${cascadeResult.finalMultiplier}`);
console.log(`Total wins from cascades: ${cascadeResult.totalWinsFromCascades}`);

// Send cascade steps to client for animation
cascadeResult.steps.forEach(step => {
  ws.send(JSON.stringify({
    type: 'CASCADE_STEP',
    data: {
      cascadeNumber: step.cascadeNumber,
      removedPositions: step.removedPositions,
      droppedSymbols: step.droppedSymbols,
      newSymbols: step.newSymbols,
      winsInStep: step.winsInStep,
      multiplier: step.multiplier,
    }
  }));
});
```

### Expanding & Sticky Wilds

```ts
import { ExpandingWildsManager } from 'slot-server';

const expandConfig = {
  enabled: true,
  triggerCondition: 'any_wild' as const,
  wildMultiplier: 2,
  multiplierStacking: 'multiply' as const,
};

const stickyConfig = {
  enabled: true,
  persistSpins: 3,
  maxStickyWilds: 5,
};

const wildsManager = new ExpandingWildsManager(expandConfig, stickyConfig);

// Process expanding wilds after spin
const expandResult = wildsManager.processExpandingWilds(gameState);

if (expandResult.success) {
  console.log(`Expanded ${expandResult.totalExpanded} positions`);
  console.log(`Applied multiplier: ${expandResult.appliedMultiplier}`);
  
  // Send expansion data to client
  ws.send(JSON.stringify({
    type: 'WILDS_EXPANDED',
    data: {
      expandedReels: expandResult.expandedReels,
      expandedPositions: expandResult.expandedPositions,
      modifiedGrid: expandResult.modifiedGrid,
    }
  }));
}

// Manage sticky wilds across spins
let activeStickyWilds = []; // Persist this between spins

const stickyResult = wildsManager.processStickyWilds(gameState, activeStickyWilds);
activeStickyWilds = stickyResult.activeStickyWilds;

// Add new sticky wilds (e.g., from bonus feature)
const newStickyResult = wildsManager.addStickyWilds(
  gameState,
  [{ reel: 2, row: 1 }, { reel: 3, row: 1 }],
  5 // persist for 5 spins
);
```

### Scatter Enhancements

```ts
import { ScatterEnhancementsManager } from 'slot-server';

const scatterConfig = {
  enabled: true,
  minScattersForTrigger: 3,
  triggeredFeature: 'FREE_SPINS' as const,
  spinAwardTable: { 3: 10, 4: 15, 5: 20 },
  enableScatterPays: true,
  scatterPayTable: { 3: 5, 4: 20, 5: 100 },
  enableClusterTriggers: true,
  clusterSizeForTrigger: 4,
  enableCollection: true,
  collectionTarget: 10,
  collectionBonusSpins: 15,
  enableTransformation: true,
  transformationType: 'to_wild' as const,
  enableMultiplierZones: true,
  multiplierZones: [
    { reelStart: 1, reelEnd: 3, rowStart: 1, rowEnd: 1, multiplier: 2 }
  ],
};

const scatterManager = new ScatterEnhancementsManager(scatterConfig);

// Evaluate scatters on current grid
const scatterResult = scatterManager.evaluateScatters(gameState);

if (scatterResult.success) {
  console.log(`Found ${scatterResult.scatterCount} scatters`);
  console.log(`Scatter pays: ${scatterResult.scatterPays}`);
  
  // Process triggers
  scatterResult.triggers.forEach(trigger => {
    if (trigger.triggered) {
      console.log(`Triggered: ${trigger.type} - ${trigger.featureType}`);
      
      if (trigger.awardedSpins) {
        console.log(`Awarded ${trigger.awardedSpins} free spins`);
      }
    }
  });
  
  // Send scatter data to client
  ws.send(JSON.stringify({
    type: 'SCATTER_EVALUATED',
    data: {
      positions: scatterResult.positions,
      triggers: scatterResult.triggers,
      scatterPays: scatterResult.scatterPays,
    }
  }));
}

// Manage scatter collection system
let collectedData = { count: 0, values: [], spinsRemaining: 20 };
const { updated, collectionTrigger } = scatterManager.manageScatterCollection(
  scatterResult,
  collectedData
);
collectedData = updated;

if (collectionTrigger) {
  console.log('Collection bonus triggered!');
  // Award collection bonus
}
```

### Respins / Hold & Win

```ts
import { RespinsManager } from 'slot-server';

const respinsConfig = {
  enabled: true,
  initialRespins: 3,
  triggerType: 'symbol_count' as const,
  minTriggerSymbols: 6,
  symbolWeights: [
    { symbolId: 'money_1', probability: 0.4, baseValue: 1, isMoneySymbol: true },
    { symbolId: 'money_5', probability: 0.25, baseValue: 5, isMoneySymbol: true },
    { symbolId: 'money_10', probability: 0.15, baseValue: 10, isMoneySymbol: true },
    { symbolId: 'reset', probability: 0.08, isResetSymbol: true },
    { symbolId: 'jackpot_mini', probability: 0.05, isJackpotSymbol: true, jackpotType: 'mini' as const, baseValue: 25 },
    { symbolId: 'jackpot_major', probability: 0.02, isJackpotSymbol: true, jackpotType: 'major' as const, baseValue: 100 },
  ],
  endOnNoSpecial: true,
  fullScreenBonus: { multiplier: 3 },
};

const respinsManager = new RespinsManager(respinsConfig);

// Check if respins should trigger
const shouldTrigger = respinsManager.checkTrigger(gameState);

if (shouldTrigger) {
  console.log('Hold & Win feature triggered!');
  
  // Execute the respins feature
  const respinsResult = respinsManager.execute(gameState);
  
  console.log(`Final value: ${respinsResult.finalValue}`);
  console.log(`Total respins used: ${respinsResult.totalRespinsUsed}`);
  console.log(`Jackpots collected: ${respinsResult.jackpotsCollected.join(', ')}`);
  
  // Send step-by-step updates to client for animation
  respinsResult.steps.forEach((step, index) => {
    ws.send(JSON.stringify({
      type: 'RESPINS_STEP',
      data: {
        stepNumber: index + 1,
        respinsRemaining: step.respinsRemaining,
        lockedPositions: step.lockedPositions,
        newSymbols: step.newSymbols,
        valuesAdded: step.valuesAdded,
        jackpotsAwarded: step.jackpotsAwarded,
        reason: step.reason,
      }
    }));
  });
  
  // Send final result
  ws.send(JSON.stringify({
    type: 'RESPINS_COMPLETE',
    data: {
      totalValue: respinsResult.finalValue,
      jackpotsCollected: respinsResult.jackpotsCollected,
      totalRespinsUsed: respinsResult.totalRespinsUsed,
    }
  }));
}

// Calculate potential payout for RTP verification
const potentialPayout = respinsManager.calculatePotentialPayout(betAmount);
console.log(`Expected respins payout: ${potentialPayout}`);
```

### Audit System

```ts
import { AuditManager, InMemoryAuditStorage } from 'slot-server';

// Create audit manager with in-memory storage (use database in production)
const auditStorage = new InMemoryAuditStorage();
const auditManager = new AuditManager('my-game', auditStorage, 'operator-123');

// Record each spin for compliance
await auditManager.recordSpin({
  spinId: 'spin-uuid-here',
  playerId: 'player-123',
  sessionId: 'session-456',
  stake: 5.00,
  win: 10.50,
  balanceBefore: 100.00,
  balanceAfter: 105.50,
  rngSeed: 'abc123xyz',
  result: [[...]], // 2D symbol array
  gameMode: 0,
  bonusTriggered: false,
  jackpotContributions: [],
  jackpotWins: [],
  ipAddress: '192.168.1.1',
  deviceInfo: 'Chrome on Windows',
  location: 'US-NJ',
  platform: 'web',
});

// Retrieve player history for dispute resolution
const records = await auditManager.getPlayerRecords(
  'player-123',
  Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
  Date.now()
);

// Get activity summary for reporting
const summary = await auditManager.getPlayerSummary(
  'player-123',
  startTime,
  endTime
);

// Export records for regulatory submission
const jsonExport = await auditManager.exportRecords(
  'player-123',
  startTime,
  endTime,
  'json' // or 'csv'
);

// Verify RNG integrity
const verification = await auditManager.verifyRngChain(spinIds);
if (!verification.valid) {
  console.error('RNG chain verification failed:', verification.errors);
}
```

### Debug Mode

```ts
import { DebugManager } from 'slot-server';

// Initialize debug manager
const debugManager = new DebugManager({
  enabled: true,
  logSpins: true,
  logRngSeeds: true,
  skipBalanceChecks: false,
  verboseLevel: 'debug', // 'none' | 'errors' | 'warnings' | 'info' | 'debug'
  outputFormat: 'console', // 'console' | 'json' | 'file'
});

// Force specific outcomes for testing
debugManager.configure({
  forcedOutcomes: [
    {
      condition: { type: 'spinNumber', value: 10 },
      result: {
        symbols: [[1, 2, 3], [4, 5, 6], ...],
        winAmount: 100,
        bonusTriggered: true,
      },
    },
    {
      condition: { type: 'betAmount', value: 50 },
      result: {
        winAmount: 500,
        jackpotWon: 'mini',
      },
    },
  ],
});

// Check for forced outcome before spin
const forcedResult = debugManager.checkForcedOutcome({
  spinNumber: 10,
  rngSeed: 'abc123',
  betAmount: 50,
  playerId: 'player-123',
});

if (forcedResult) {
  console.log('Using forced outcome for testing');
  return forcedResult;
}

// Log spin results
debugManager.logSpin('spin-uuid', spinResult, 'rng-seed-here');

// Get debug state and statistics
const state = debugManager.getState();
const stats = debugManager.getStatistics();

console.log(`Spins tracked: ${stats.spinsTracked}`);
console.log(`Forced outcomes applied: ${stats.forcedOutcomesApplied}`);
console.log(`Errors logged: ${stats.errorCount}`);

// Export logs for analysis
const logs = debugManager.exportLogs();

// Reset debug state
debugManager.reset();
```

## Architecture

The library is designed to work seamlessly with the Slot Engine client:

```
┌─────────────────┐         WebSocket         ┌──────────────────┐
│  Slot Server    │ ◄──────────────────────► │  Slot Engine     │
│  (This Library) │                          │  (Client)        │
├─────────────────┤                          ├──────────────────┤
│ • GameSession   │                          │ • ReelRenderer   │
│ • SpinEvaluator │                          │ • UIManager      │
│ • BonusManager  │◄──── Game State ───────► │ • PaylineRender  │
│ • JackpotMgr    │                          │ • ParticleSys    │
│ • HistoryMgr    │                          │ • SoundManager   │
│ • CascadeMgr    │                          │ • CascadeAnim    │
│ • WildsMgr      │                          │ • WildEffects    │
│ • ScatterMgr    │                          │ • ScatterFX      │
└─────────────────┘                          └──────────────────┘
```

## Message Protocol

All communication follows a standard WebSocket message format:

```ts
// Client → Server
{
  type: 'SPIN',
  data: {
    action: 'spin',
    stakePerLine: 1,
    selectedLines: 5,
    totalStake: 5,
    gameMode: 0
  },
  messageId: 'uuid-here',
  timestamp: 1234567890
}

// Server → Client
{
  type: 'SPIN',
  data: {
    result: [[...]],
    totalWin: 10.50,
    winLines: [...],
    balanceAfter: 95.50,
    bonusTriggered: false
  },
  messageId: 'uuid-here',
  timestamp: 1234567890
}
```

## Responsible Gaming

The library includes comprehensive responsible gaming features through the `ResponsibleGamingManager`:

- **Session Time Limits** - Track and limit play duration with warnings at 80% threshold
- **Loss Limits** - Stop play when loss threshold reached with automatic blocking
- **Win Goals** - Notify players when they reach their win targets
- **Reality Checks** - Periodic reminders showing time played, stakes, wins, and net result
- **Self-Exclusion** - Block access during exclusion period with date validation
- **Bet Limits** - Enforce maximum bet amounts
- **Activity Monitoring** - Track player statistics and generate alerts
- **RG Reports** - Export player activity reports for transparency

### Usage Example

```ts
import { ResponsibleGamingManager } from 'slot-server';

// Initialize with limits and player state
const limits = {
  sessionTimeLimit: 60, // minutes
  lossLimit: 100,
  winGoal: 500,
  maxBetLimit: 10,
  realityCheckInterval: 15,
};

const playerState = {
  balance: 1000,
  bet: 1,
  gameMode: 0 as const,
  freeSpinsRemaining: 0,
  bonusActive: false,
  history: [],
};

const rgManager = new ResponsibleGamingManager(limits, playerState);

// Check if player can place a bet before spinning
const canBet = rgManager.canPlaceBet(5);
if (!canBet.success) {
  console.error(`Bet rejected: ${canBet.error}`);
  return;
}

// Apply spin results to tracking
rgManager.applyResult(stake, win);

// Update player state after each spin
rgManager.updatePlayerState({
  sessionLoss: updatedLoss,
  sessionWin: updatedWin,
});

// Check for reality check
if (rgManager.shouldShowRealityCheck()) {
  const realityCheck = rgManager.generateRealityCheck();
  // Send to client for display
  ws.send(JSON.stringify({ type: 'REALITY_CHECK', data: realityCheck }));
}

// Get active alerts
const alerts = rgManager.getAlerts();
alerts.forEach(alert => {
  if (alert.actionRequired) {
    // Critical alert requiring immediate action
    console.warn(`${alert.type}: ${alert.message}`);
  }
});

// Get player activity statistics
const stats = rgManager.getPlayerActivityStats();
console.log('Player Stats:', stats);

// Export RG report for player download
const report = rgManager.exportRGReport();
```

### Alert Types

The manager generates alerts with different severity levels:

- **info** - Win goals reached, general notifications
- **warning** - Approaching limits (80% threshold)
- **critical** - Limits reached, self-exclusion active (requires action)

### Self-Exclusion

```ts
// Set self-exclusion until a specific date
rgManager.updateLimits({
  selfExclusionUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
});

// Check exclusion status
const status = rgManager.getSelfExclusionStatus();
if (status.isExcluded) {
  console.log(`Excluded until ${status.exclusionUntil}, ${status.remainingDays} days remaining`);
}
```

### Session Management

```ts
// Reset session tracking when player starts new session
rgManager.resetSession();

// Get session time info
const timeInfo = rgManager.getSessionTimeInfo();
console.log(`Playing for ${timeInfo.elapsedMinutes} minutes`);
console.log(`Limit: ${timeInfo.limitMinutes} minutes`);
console.log(`Warning reached: ${timeInfo.warningThresholdReached}`);
```

## Audit & Compliance

The `AuditManager` provides complete regulatory compliance:

```ts
import { AuditManager, InMemoryAuditStorage } from 'slot-server';

const auditStorage = new InMemoryAuditStorage();
const auditManager = new AuditManager(auditStorage);

// Record every spin
await auditManager.recordSpin({
  spinId: 'spin-123',
  playerId: 'player-456',
  gameId: 'my-slot',
  stake: 5,
  win: 0,
  balanceBefore: 1000,
  balanceAfter: 995,
  rngSeed: 'abc123',
  result: [[...], ...],
  jackpotContributions: [],
  jackpotWins: [],
});

// Retrieve player history for disputes
const history = await auditManager.getPlayerHistory('player-456', startTime, endTime);

// Generate activity summary for reporting
const summary = await auditManager.getActivitySummary('player-456', lastMonthStart, lastMonthEnd);

// Export records for regulators
const jsonExport = await auditManager.exportRecords('json');
const csvExport = await auditManager.exportRecords('csv');
```

## Debug Mode

The `DebugManager` provides comprehensive testing tools:

```ts
import { DebugManager } from 'slot-server';

const debugManager = new DebugManager({
  enabled: true,
  logSpins: true,
  logRngSeeds: true,
  skipBalanceChecks: true, // For testing only
  verboseLevel: 'debug',
  outputFormat: 'console',
});

// Force specific outcomes for testing
debugManager.setForcedOutcome({
  condition: { type: 'spinNumber', value: 10 },
  result: { bonusTriggered: true, winAmount: 500 },
});

// Log spin results
debugManager.logSpin(spinRequest, spinResult, 'info');

// Get debug statistics
const stats = debugManager.getStatistics();
console.log(`Total spins: ${stats.spinCount}`);

// Export logs for analysis
const logs = debugManager.exportLogs('json');
```

## Wallet & Transaction Management
The `WalletManager` provides a database-agnostic, atomic transaction system designed for real-money gaming. It ensures financial integrity through double-entry ledger logic (recording `balanceBefore` and `balanceAfter` for every operation) and optimistic locking to prevent race conditions.

### Key Features
- Atomic Transactions: All balance updates are wrapped in transaction blocks with rollback support.
- Optimistic Locking: Prevents concurrent modification issues using version checking.
- Double-Entry Ledger: Immutable history of every credit and debit.
- Pluggable Storage: Implements the `IWalletStorage` interface to work with any database (PostgreSQL, MongoDB, Redis, etc.).
- Precision Handling: Configurable decimal precision for different currencies.

### Basic Usage
```ts
import { WalletManager, InMemoryWalletStorage } from 'slot-server';

// 1. Initialize Storage (Use InMemoryWalletStorage for testing/dev)
const storage = new InMemoryWalletStorage();

// 2. Initialize Manager
const walletManager = new WalletManager(storage, {
  currency: 'USD',
  precision: 2,
  allowNegativeBalance: false
});

// 3. Create a wallet for a player
await walletManager.createWallet('player-123', '100.00');

// 4. Place a Bet (Debit)
const betResult = await walletManager.placeBet('player-123', '10.00', {
  referenceId: 'spin-uuid-999',
  gameId: 'slot-game-01'
});

if (!betResult.success) {
  console.error('Bet failed:', betResult.error);
  return;
}

console.log(`New Balance: ${betResult.balance}`);

// 5. Process a Payout (Credit)
const winAmount = '25.00';
const payoutResult = await walletManager.credit('player-123', winAmount, 'payout', {
  referenceId: 'spin-uuid-999',
  description: 'Line hit payout'
});
```

### Implementing Custom Storage
To integrate with your production database, implement the `IWalletStorage` interface:
```ts
import { IWalletStorage, IWalletBalance, ITransaction } from 'slot-server';
import { db, userBalances, transactions } from './my-database-schema'; // Your DB schema

class PostgresWalletStorage implements IWalletStorage {
  async getBalance(userId: string): Promise<IWalletBalance | null> {
    const result = await db.select().from(userBalances).where({ userId });
    return result[0] || null;
  }

  async saveTransaction(tx: ITransaction): Promise<void> {
    await db.insert(transactions).values({
      id: tx.id,
      userId: tx.userId,
      type: tx.type,
      amount: tx.amount,
      balanceBefore: tx.balanceBefore,
      balanceAfter: tx.balanceAfter,
      referenceId: tx.referenceId,
      createdAt: new Date(tx.createdAt)
    });
  }

  async updateBalance(userId: string, newBalance: string, version: number): Promise<boolean> {
    // Implement optimistic locking here
    const result = await db
      .update(userBalances)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where({ userId, version }) // 'version' column required for locking
      .returning();
    
    return result.length > 0;
  }
  
  // ... implement other required methods
}
```

### Integration with Game Session
A common pattern is to wrap the game spin cycle with wallet operations:
```ts
async function handleSpin(sessionId: string, playerId: string, betAmount: string) {
  // 1. Debit Bet
  const betTx = await walletManager.placeBet(playerId, betAmount, { referenceId: sessionId });
  if (!betTx.success) throw new Error('Insufficient funds');

  try {
    // 2. Evaluate Game Logic
    const gameResult = slotEngine.spin(betAmount);
    
    // 3. Credit Wins (if any)
    if (gameResult.totalWin > 0) {
      await walletManager.credit(playerId, gameResult.totalWin.toString(), 'payout', {
        referenceId: sessionId
      });
    }

    return gameResult;
  } catch (error) {
    // 4. Rollback on Critical Error (Optional depending on requirements)
    await walletManager.refund(playerId, betAmount, 'error_refund', { referenceId: sessionId });
    throw error;
  }
}
```
### Transaction Types
The system supports the following standard transaction types:
- `bet`: Wager placement
- `payout`: Standard win payment
- `jackpot_win`: Progressive jackpot award
- `bonus_payout`: Feature round winnings
- `deposit`: External funds added
- `withdrawal`: External funds added
- `fee`: House fee or commission
- `refund`: Reversal of a previous transaction

## API Reference

See the generated TypeScript definitions (`dist/index.d.ts`) for complete API documentation.

## License

MIT