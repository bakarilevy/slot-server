// ============== Core Game Data ==============

/**
 * Symbol mapping: symbol ID → texture key.
 * The client uses this to load the correct images.
 */
export type SymbolMap = Record<number, string>;

/**
 * A single payline pattern.
 * Each element is { reel: number; row: number } (0-indexed).
 */
export type PaylinePattern = { reel: number; row: number }[];

/**
 * Paytable data: symbol ID → multiplier by count (e.g., "x3": 50).
 * Keys should be like "x3", "x4", "x5" (or "x2" etc.)
 */
export type PaytableData = Record<number, Record<string, number>>;

/**
 * Reel strip: an array of symbol IDs (ordered bottom-to-top or top-to-bottom,
 * but the client will interpret it consistently).
 */
export type ReelStrip = number[];

/**
 * Symbol behavior types for special features.
 */
export type SymbolBehavior = 
  | 'normal'      // Standard paying symbol
  | 'wild'        // Substitutes for other symbols
  | 'scatter'     // Pays anywhere, triggers bonuses
  | 'bonus'       // Triggers bonus game
  | 'multiplier'  // Multiplies wins
  | 'expanding'   // Expands to cover reel
  | 'sticky'      // Sticks in place for respins
  | 'shifting'    // Shifts position after spin
  | 'split'       // Can count as 2 symbols
  ;

/**
 * Configuration for a symbol's properties.
 */
export interface ISymbolConfig {
  id: number;
  textureKey: string;
  behavior: SymbolBehavior;
  /** For wilds: which symbols it can substitute for (undefined = all) */
  substitutesFor?: number[];
  /** For multipliers: multiplier value */
  multiplierValue?: number;
  /** For scatters: minimum count for trigger */
  scatterMinCount?: number;
  /** For scatters/bonus: bonus triggered */
  triggersBonus?: boolean;
  /** For expanding: does it expand */
  expands?: boolean;
  /** For sticky: how many spins it stays */
  stickySpins?: number;
  /** Pay priority (higher = evaluated first) */
  payPriority?: number;
}

/**
 * Ways-to-win configuration (for "243 ways" or similar mechanics).
 */
export interface IWaysConfig {
  enabled: boolean;
  /** Number of ways (e.g., 243, 1024, 4096) */
  waysCount: number;
  /** Minimum matching symbols from left (default: 3) */
  minMatches: number;
  /** Use adjacent pays (left-to-right only or both directions) */
  direction: 'leftToRight' | 'bothDirections';
}

/**
 * Jackpot tier configuration.
 */
export interface IJackpotTier {
  id: string;
  name: string;
  seedAmount: number;
  currentAmount: number;
  triggerProbability: number;
  contributionRate: number; // Percentage of each bet that goes to jackpot
  minBetRequired?: number; // Minimum bet to be eligible
}

/**
 * Jackpot configuration.
 */
export interface IJackpotConfig {
  enabled: boolean;
  tiers: IJackpotTier[];
  /** Type: standalone, local (casino-wide), or wide-area */
  type: 'standalone' | 'local' | 'wideArea';
}

/**
 * Free spins configuration.
 */
export interface IFreeSpinsConfig {
  /** Scatter symbol ID that triggers free spins */
  scatterSymbolId: number;
  /** Minimum scatters needed */
  minTriggers: number;
  /** Free spins awarded per scatter count */
  spinsByCount: Record<number, number>;
  /** Multiplier applied during free spins */
  multiplier?: number;
  /** Can free spins be retriggered? */
  retriggerable: boolean;
  /** Additional spins on retrigger */
  retriggerSpins: Record<number, number>;
  /** Special expanding symbols during free spins */
  expandingSymbols?: number[];
  /** Sticky wilds during free spins */
  stickyWilds?: boolean;
}

/**
 * Gamble feature configuration.
 */
export interface IGambleConfig {
  enabled: boolean;
  /** Maximum amount that can be gambled */
  maxGambleAmount?: number;
  /** Maximum consecutive gambles */
  maxConsecutiveGambles: number;
  /** Types of gamble games available */
  gameTypes: ('card' | 'ladder' | 'wheel')[];
  /** Auto-collect at win amount */
  autoCollectAt?: number;
}

/**
 * Buy bonus feature configuration.
 */
export interface IBuyBonusConfig {
  enabled: boolean;
  /** Cost multiplier (e.g., 100x bet) */
  costMultiplier: number;
  /** Minimum bet required */
  minBetRequired?: number;
  /** Maximum purchases per session */
  maxPurchasesPerSession?: number;
  /** Cooldown between purchases (ms) */
  cooldownMs?: number;
}

/**
 * Tournament mode configuration.
 */
export interface ITournamentConfig {
  enabled: boolean;
  tournamentId: string;
  startTime: number;
  endTime: number;
  entryFee?: number;
  prizePool: number;
  scoringMethod: 'totalWin' | 'biggestWin' | 'totalSpins';
  leaderboard: ITournamentPlayer[];
}

export interface ITournamentPlayer {
  playerId: string;
  playerName: string;
  score: number;
  rank: number;
}

/**
 * Responsible gaming limits.
 */
export interface IResponsibleGamingLimits {
  /** Session time limit in minutes */
  sessionTimeLimit?: number;
  /** Loss limit per session */
  lossLimit?: number;
  /** Win goal (notify when reached) */
  winGoal?: number;
  /** Maximum bet allowed */
  maxBetLimit?: number;
  /** Reality check interval in minutes */
  realityCheckInterval?: number;
  /** Self-exclusion end date (ISO timestamp) */
  selfExclusionUntil?: string;
}

/**
 * Currency configuration.
 */
export interface ICurrencyConfig {
  code: string; // ISO currency code (e.g., "USD", "EUR")
  symbol: string;
  decimalSeparator: string;
  thousandSeparator: string;
  minDecimalPlaces: number;
  /** Exchange rate to base currency (for multi-currency) */
  exchangeRate?: number;
}

/**
 * Game configuration for the client engine.
 */
export interface IGameConfigData {
  /** Game identifier (e.g., "lucky7") */
  gameId: string;
  /** Game version */
  version?: string;
  /** Number of reels (default 5) */
  reelCount: number;
  /** Number of visible rows (default 3) */
  rowCount: number;
  /** Symbol configurations */
  symbols?: ISymbolConfig[];
  /** Legacy symbol map (ID → texture key) for backward compatibility */
  symbolMap: SymbolMap;
  /** Paytable data */
  paytableData: PaytableData;
  /** Reel strips (one array per reel) */
  reelStrips: ReelStrip[];
  /** Line patterns (paylines) */
  linePatterns: PaylinePattern[];
  /** Ways-to-win configuration */
  waysConfig?: IWaysConfig;
  /** Jackpot configuration */
  jackpotConfig?: IJackpotConfig;
  /** Free spins configuration */
  freeSpinsConfig?: IFreeSpinsConfig;
  /** Gamble feature configuration */
  gambleConfig?: IGambleConfig;
  /** Buy bonus configuration */
  buyBonusConfig?: IBuyBonusConfig;
  /** Currency settings */
  currency: ICurrencyConfig;
  /** Feature flags (autoplay, fastspin, etc.) */
  features: {
    autoplay: boolean;
    fastSpin: boolean;
    realityCheck: boolean;
    fullscreen: boolean;
    turboSpin?: boolean;
    quickStop?: boolean;
  };
  /** Default bet (in base currency units) */
  defaultBet: number;
  /** Minimum bet */
  minBet: number;
  /** Maximum bet */
  maxBet: number;
  /** Bet step (increment) */
  betStep: number;
  /** Available bet amounts (if using preset bets instead of steps) */
  betPresets?: number[];
  /** Number of selectable paylines (if variable) */
  selectableLines?: number[];
  /** Default number of lines */
  defaultLines: number;
  /** RTP percentage (e.g., 96.5) */
  rtp: number;
  /** Volatility level */
  volatility: 'low' | 'medium' | 'high' | 'veryHigh';
  /** Hit frequency percentage (e.g., 25.5) */
  hitFrequency?: number;
  /** Max win multiplier (e.g., 5000x) */
  maxWinMultiplier?: number;
  /** Responsible gaming limits */
  responsibleGaming?: IResponsibleGamingLimits;
  /** Tournament mode */
  tournament?: ITournamentConfig;
  /** Game rules text (localized keys) */
  rulesText?: Record<string, string>;
  /** Help screens (localized keys) */
  helpScreens?: Array<{ title: string; content: string; image?: string }>;
}

// ============== Messages (Client ↔ Server) ==============

/**
 * Response structure for an INIT message (sent from server to client).
 */
export interface IInitResponse {
  /** Player balance */
  balance: number;
  /** Current bet */
  bet: number;
  /** Game configuration (includes all static data) */
  config: IGameConfigData;
  /** Bonus offers (if any) */
  bonusOffers?: any;
  /** Additional game state */
  state?: any;
}

/**
 * Request structure for a SPIN message (client → server).
 */
export interface ISpinRequestData {
  action: 'spin' | 'autospin' | 'fastspin';
  stakePerLine: number;
  selectedLines: number;
  totalStake: number;
  /** Game mode — CHANGED: Formatted to camelCase to match the frontend expectations */
  gameMode: 0 | 1; 
}

/**
 * Request for buying a bonus feature.
 */
export interface IBuyBonusRequest {
  action: 'buyBonus';
  totalStake: number;
  gameMode: 0 | 1;
}

/**
 * Request for gamble feature.
 */
export interface IGambleRequest {
  action: 'gamble';
  gambleType: 'card' | 'ladder' | 'wheel';
  currentWin: number;
  choice?: number | string; // Depends on gamble type
}

/**
 * Gamble response.
 */
export interface IGambleResponse {
  result: 'win' | 'lose' | 'push';
  winAmount: number;
  canGambleAgain: boolean;
  consecutiveGambles: number;
}

/**
 * Jackpot contribution notification.
 */
export interface IJackpotContribution {
  tierId: string;
  contributedAmount: number;
  newJackpotAmount: number;
}

/**
 * Jackpot win notification.
 */
export interface IJackpotWin {
  tierId: string;
  tierName: string;
  winAmount: number;
  timestamp: number;
}

/**
 * Tournament spin request.
 */
export interface ITournamentSpinRequest {
  action: 'tournamentSpin';
  tournamentId: string;
  entryFee?: number;
}

/**
 * Tournament state response.
 */
export interface ITournamentState {
  tournamentId: string;
  playerName: string;
  playerRank: number;
  playerScore: number;
  timeRemaining: number;
  leaderboard: ITournamentPlayer[];
}

/**
 * A single winning line.
 */
export interface IWinLine {
  lineIndex: number;
  symbolId: number;
  multiplier: number;
  winAmount: number;
  positions: { reel: number; row: number }[];
  /** For ways-to-win: which way this represents */
  wayIndex?: number;
  /** For expanding symbols: was this an expanded position */
  expanded?: boolean;
}

/**
 * Extended win details for complex features.
 */
export interface IWinDetails {
  /** Base game wins */
  baseWins: IWinLine[];
  /** Scatter pays (anywhere pays) */
  scatterPays: Array<{ symbolId: number; count: number; winAmount: number }>;
  /** Wild substitutions made */
  wildSubstitutions: Array<{ reel: number; row: number; originalSymbol: number; wildSymbol: number }>;
  /** Multipliers applied */
  multipliersApplied: Array<{ source: string; value: number }>;
  /** Cascading/tumbling wins in sequence */
  cascadeSequence?: Array<{ step: number; wins: IWinLine[]; totalWin: number }>;
}

/**
 * Response structure for a SPIN message (server → client).
 */
export interface ISpinResponseData {
  /** 2D array of symbol IDs [reel][row] (visible positions) */
  result: number[][];
  /** Total win amount */
  totalWin: number;
  /** Stake per line used */
  stakePerLine: number;
  /** Total stake used */
  totalStake: number;
  /** Game mode (0 = main, 1 = bonus) */
  gameMode: 0 | 1;
  /** Free spins remaining (if any) */
  freeSpinsRemaining?: number;
  /** Bonus triggered? */
  bonusTriggered?: boolean;
  /** Bonus data (if triggered) */
  bonusData?: any;
  /** Winning lines (optional) */
  winLines?: IWinLine[];
  /** Detailed win breakdown */
  winDetails?: IWinDetails;
  /** New balance after the spin */
  balanceAfter: number;
  /** Jackpot contributions */
  jackpotContributions?: IJackpotContribution[];
  /** Jackpot won (if any) */
  jackpotWin?: IJackpotWin;
  /** Error message (if any) */
  error?: string;
  /** Spin ID for audit trail */
  spinId?: string;
  /** Server timestamp */
  timestamp?: number;
  /** RNG seed for verification (if using provably fair) */
  rngSeed?: string;
  /** Whether this is a cascading/tumbling spin */
  isCascade?: boolean;
  /** Cascade level (0 = initial spin, 1+ = subsequent cascades) */
  cascadeLevel?: number;
}

/**
 * Response for a BONUS message (server → client).
 */
export interface IBonusResponse {
  /** Bonus ID (if applicable) */
  bonusId?: string;
  /** Action (e.g., "accept", "decline", "pick", "end") */
  action?: string;
  /** Bonus state */
  state?: 'ACTIVE' | 'ENDED' | 'COMPLETE' | 'OFFERED';
  /** Data specific to the bonus type */
  data?: any;
}

// ============== Bonus Definitions ==============

/**
 * Free spin bonus state.
 */
export interface IFreeSpinBonus {
  type: 'freespin';
  spinsRemaining: number;
  multiplier: number;
  totalWin: number;
  bet: number;
}

/**
 * Pick bonus state.
 */
export interface IPickBonus {
  type: 'pick';
  items: { id: string; label: string; value: number }[];
  pickedIds: string[];
  totalWin: number;
}

/**
 * Extended bonus types for professional features.
 */
export interface IWheelBonus {
  type: 'wheel';
  segments: Array<{ id: string; value: number; probability: number; label?: string }>;
  currentRotation?: number;
  resultSegment?: string;
  totalWin: number;
}

export interface ICascadeBonus {
  type: 'cascade';
  currentLevel: number;
  maxLevels: number;
  multiplierPerLevel: number;
  currentMultiplier: number;
  totalWin: number;
}

export interface IRespinsBonus {
  type: 'respins';
  spinsRemaining: number;
  lockedPositions: Array<{ reel: number; row: number; symbolId: number }>;
  targetSymbol?: number; // Symbol to collect/lock
  totalWin: number;
}

export interface IHoldAndSpinBonus {
  type: 'holdAndSpin';
  initialSpins: number;
  spinsRemaining: number;
  grid: (number | null)[][]; // Null = empty position
  specialSymbols: Array<{ reel: number; row: number; type: string; value: number }>;
  totalWin: number;
  isComplete: boolean;
}

/**
 * Union of all bonus states.
 */
export type IBonusState = IFreeSpinBonus | IPickBonus | IWheelBonus | ICascadeBonus | IRespinsBonus | IHoldAndSpinBonus;

// ============== Session State ==============

/**
 * History entry (for HISTORY response).
 */
export interface IHistoryEntry {
  time: number; // Unix timestamp (milliseconds)
  bet: number;
  win: number;
  balance: number;
  result: number[][];
  gameMode: 0 | 1;
}

/**
 * History response.
 */
export interface IHistoryResponse {
  entries: IHistoryEntry[];
  total: number;
}

/**
 * Full player state tracked by the server.
 */
export interface IPlayerState {
  balance: number;
  bet: number;
  gameMode: 0 | 1;
  freeSpinsRemaining: number;
  bonusActive: boolean;
  bonusState?: IBonusState;
  lastSpinResult?: ISpinResponseData;
  history: IHistoryEntry[];
  /** Responsible gaming session tracking */
  sessionStartTime?: number;
  sessionLoss?: number;
  sessionWin?: number;
  consecutiveGambles?: number;
  /** Tournament state */
  tournamentScore?: number;
  tournamentRank?: number;
}

// ============== Debug & Testing ==============

/**
 * Debug mode configuration for testing and development.
 */
export interface IDebugConfig {
  /** Enable debug mode */
  enabled: boolean;
  /** Log all spin results with detailed breakdown */
  logSpins: boolean;
  /** Log RNG seeds for reproducibility */
  logRngSeeds: boolean;
  /** Force specific outcomes for testing */
  forcedOutcomes?: IForcedOutcome[];
  /** Skip balance checks (for testing) */
  skipBalanceChecks: boolean;
  /** Verbose logging level */
  verboseLevel: 'none' | 'errors' | 'warnings' | 'info' | 'debug';
  /** Output format for logs */
  outputFormat: 'console' | 'json' | 'file';
  /** File path for log output (if file format) */
  logFilePath?: string;
}

/**
 * Forced outcome for testing specific scenarios.
 */
export interface IForcedOutcome {
  /** Condition to trigger forced outcome */
  condition: {
    type: 'spinNumber' | 'randomSeed' | 'betAmount' | 'playerId';
    value: number | string;
  };
  /** Result to force */
  result: {
    symbols?: number[][];
    winAmount?: number;
    bonusTriggered?: boolean;
    jackpotWon?: string;
  };
}

/**
 * Debug log entry.
 */
export interface IDebugLogEntry {
  timestamp: number;
  level: 'error' | 'warning' | 'info' | 'debug';
  category: string;
  message: string;
  data?: any;
}

/**
 * Debug session state.
 */
export interface IDebugState {
  enabled: boolean;
  spinCount: number;
  lastRngSeed: string;
  forcedOutcomesApplied: number;
  errors: IDebugLogEntry[];
  warnings: IDebugLogEntry[];
  infoLogs: IDebugLogEntry[];
}

// ============== Audit & Compliance ==============

/**
 * Spin audit record for regulatory compliance.
 */
export interface IAuditRecord {
  spinId: string;
  playerId: string;
  gameId: string;
  timestamp: number;
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
  sessionId: string;
  /** Extended audit fields */
  deviceInfo?: string;
  location?: string;
  operatorId?: string;
  platform?: 'web' | 'mobile' | 'desktop';
}

/**
 * Player activity summary for reporting.
 */
export interface IPlayerActivitySummary {
  playerId: string;
  periodStart: number;
  periodEnd: number;
  totalSpins: number;
  totalStaked: number;
  totalWon: number;
  netResult: number;
  biggestWin: number;
  bonusTriggers: number;
  jackpotWins: number;
  sessionCount: number;
  averageSessionDuration: number;
}

// ============== WebSocket Message Types ==============

/**
 * Generic WebSocket message wrapper.
 */
export interface IWebSocketMessage<T = any> {
  type: string;
  data: T;
  messageId: string;
  timestamp: number;
}

/**
 * Server acknowledgment message.
 */
export interface IServerAck {
  messageId: string;
  status: 'success' | 'error';
  errorCode?: string;
  errorMessage?: string;
}

// ============== Utility Types ==============

/**
 * Deep partial type for optional updates.
 */
export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

/**
 * Nullable type helper.
 */
export type Nullable<T> = T | null;

/**
 * Result type for operations that can fail.
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// ============== Cascading Reels Types ==============

/**
 * Configuration for cascading/tumbling reel mechanics.
 */
export interface ICascadeConfig {
  /** Enable cascading feature */
  enabled: boolean;
  /** Maximum number of cascades allowed in sequence */
  maxCascades?: number;
  /** Initial multiplier at start of cascade sequence */
  initialMultiplier?: number;
  /** Multiplier increment per cascade */
  multiplierIncrement?: number;
  /** Symbol pool for filling empty positions */
  symbolPool?: ISymbol[];
  /** Stop cascades if no win increase occurs */
  stopOnNoWinIncrease?: boolean;
  /** Trigger special feature on cascade count */
  triggerOnCascadeCount?: number;
  /** Trigger special feature on multiplier threshold */
  triggerOnMultiplier?: number;
  /** Trigger special feature on consecutive wins */
  triggerOnConsecutiveWins?: number;
}

/**
 * Single step in a cascade sequence.
 */
export interface ICascadeStep {
  /** Cascade number in sequence (1-based) */
  cascadeNumber: number;
  /** Positions where symbols were removed */
  removedPositions: Array<{ reel: number; row: number; symbol: ISymbol }>;
  /** Symbols that dropped due to gravity */
  droppedSymbols: Array<{ symbol: ISymbol; fromRow: number; toRow: number; reel: number }>;
  /** New symbols added at top */
  newSymbols: Array<{ symbol: ISymbol; position: { reel: number; row: number } }>;
  /** Grid state after this cascade */
  resultingGrid: ISymbol[][];
  /** Wins evaluated in this step */
  winsInStep: IWinEvaluation[];
  /** Current multiplier */
  multiplier: number;
}

/**
 * Result of a full cascade sequence.
 */
export interface ICascadeResult {
  /** Whether cascades occurred */
  success: boolean;
  /** Total number of cascades */
  totalCascades: number;
  /** All steps in the cascade sequence */
  steps: ICascadeStep[];
  /** Final grid state */
  finalGrid: ISymbol[][];
  /** Final multiplier value */
  finalMultiplier: number;
  /** Total wins from all cascade steps */
  totalWinsFromCascades: number;
}

// ============== Expanding & Sticky Wilds Types ==============

/**
 * Trigger conditions for wild expansion.
 */
export type WildExpandTrigger = 'any_wild' | 'multiple_wilds' | 'specific_positions' | 'random';

/**
 * Configuration for expanding wild mechanics.
 */
export interface IExpandingWildConfig {
  /** Enable expanding wilds */
  enabled: boolean;
  /** Trigger condition for expansion */
  triggerCondition: WildExpandTrigger;
  /** Minimum wilds needed for 'multiple_wilds' trigger */
  minWildsForExpand?: number;
  /** Specific positions required for 'specific_positions' trigger */
  specificPositions?: number[];
  /** Probability for 'random' trigger (0-1) */
  expansionProbability?: number;
  /** Number of rows to expand to (default: entire reel) */
  expandToRows?: number;
  /** Multiplier applied by expanded wild */
  wildMultiplier?: number;
  /** How multipliers stack: 'multiply', 'add', or 'highest' */
  multiplierStacking?: 'multiply' | 'add' | 'highest';
}

/**
 * Result of expanding wild processing.
 */
export interface IExpandingWildResult {
  /** Whether expansion occurred */
  success: boolean;
  /** Reel indices that expanded */
  expandedReels: number[];
  /** All positions that became wild */
  expandedPositions: Array<{ reel: number; row: number }>;
  /** Modified grid with expanded wilds */
  modifiedGrid: ISymbol[][];
  /** Total positions expanded */
  totalExpanded: number;
  /** Applied multiplier value */
  appliedMultiplier: number;
}

/**
 * Configuration for sticky wild mechanics.
 */
export interface IStickyWildConfig {
  /** Enable sticky wilds */
  enabled: boolean;
  /** Number of spins sticky wilds persist */
  persistSpins: number;
  /** Maximum number of sticky wilds allowed */
  maxStickyWilds?: number;
}

/**
 * Result of sticky wild processing.
 */
export interface IStickyWildResult {
  /** Whether sticky wild state changed */
  success: boolean;
  /** Currently active sticky wilds */
  activeStickyWilds: Array<{ reel: number; row: number; remainingSpins: number }>;
  /** Sticky wilds that expired */
  removedStickyWilds: Array<{ reel: number; row: number }>;
  /** Modified grid */
  modifiedGrid: ISymbol[][];
  /** Total active sticky wilds */
  totalActive: number;
  /** Total removed sticky wilds */
  totalRemoved: number;
  /** Whether more sticky wilds can be added */
  canAddMore: boolean;
}

// ============== Scatter Enhancement Types ==============

/**
 * Type of scatter trigger.
 */
export type ScatterTriggerType = 
  | 'BONUS_TRIGGER'
  | 'REEL_COMBINATION_TRIGGER'
  | 'CLUSTER_TRIGGER'
  | 'COLLECTION_COMPLETE'
  | 'COLLECTION_EXPIRY_TRIGGER'
  | 'PROGRESSIVE_TRIGGER';

/**
 * Feature types triggered by scatters.
 */
export type ScatterFeatureType = 
  | 'FREE_SPINS'
  | 'ENHANCED_BONUS'
  | 'CLUSTER_BONUS'
  | 'COLLECTION_BONUS'
  | 'MINI_BONUS';

/**
 * Individual scatter trigger event.
 */
export interface IScatterTrigger {
  /** Type of trigger */
  type: ScatterTriggerType;
  /** Whether trigger activated */
  triggered: boolean;
  /** Number of scatters involved */
  scatterCount: number;
  /** Feature type awarded */
  featureType: ScatterFeatureType;
  /** Free spins awarded (if applicable) */
  awardedSpins?: number;
  /** Cluster positions (for cluster triggers) */
  clusterPositions?: Array<{ reel: number; row: number }>;
  /** Collected value (for collection triggers) */
  collectedValue?: number;
}

/**
 * Multiplier zone configuration for scatters.
 */
export interface IScatterMultiplierZone {
  reelStart: number;
  reelEnd: number;
  rowStart: number;
  rowEnd: number;
  multiplier: number;
}

/**
 * Configuration for advanced scatter mechanics.
 */
export interface IScatterConfig {
  /** Enable scatter features */
  enabled: boolean;
  /** Minimum scatters for bonus trigger */
  minScattersForTrigger?: number;
  /** Feature type triggered */
  triggeredFeature?: ScatterFeatureType;
  /** Spin award table by scatter count */
  spinAwardTable?: Record<number, number>;
  /** Enable immediate scatter pays */
  enableScatterPays?: boolean;
  /** Pay table for scatter counts */
  scatterPayTable?: Record<number, number>;
  /** Scatter pay multiplier */
  scatterMultiplier?: number;
  /** Require scatters on specific reels */
  requireSpecificReels?: boolean;
  /** Required reel indices */
  requiredReels?: number[];
  /** Enable cluster-based triggers */
  enableClusterTriggers?: boolean;
  /** Minimum cluster size for trigger */
  clusterSizeForTrigger?: number;
  /** Enable progressive scatter accumulation */
  enableProgressiveTrigger?: boolean;
  /** Base threshold for progressive trigger */
  baseProgressiveThreshold?: number;
  /** Bonus spins for progressive trigger */
  progressiveBonusSpins?: number;
  /** Multiplier for progressive bonus */
  progressiveMultiplier?: number;
  /** Reset progressive on trigger */
  progressiveResetOnTrigger?: boolean;
  /** Enable scatter collection system */
  enableCollection?: boolean;
  /** Target scatter count for collection */
  collectionTarget?: number;
  /** Bonus spins on collection complete */
  collectionBonusSpins?: number;
  /** Auto-trigger when collection spins expire */
  autoTriggerOnExpiry?: boolean;
  /** Enable scatter transformation */
  enableTransformation?: boolean;
  /** Transformation type: 'to_wild' or 'to_multiplier' */
  transformationType?: 'to_wild' | 'to_multiplier';
  /** Multiplier for transformed wilds */
  transformedWildMultiplier?: number;
  /** Enable multiplier zones */
  enableMultiplierZones?: boolean;
  /** Multiplier zone definitions */
  multiplierZones?: IScatterMultiplierZone[];
  /** Zone multiplier stacking: 'multiply' or 'add' */
  zoneMultiplierStacking?: 'multiply' | 'add';
}

/**
 * Result of scatter evaluation.
 */
export interface IScatterResult {
  /** Whether scatters present */
  success: boolean;
  /** Total scatter count */
  scatterCount: number;
  /** Total scatter value */
  scatterValue: number;
  /** Scatter positions on grid */
  positions: Array<{ reel: number; row: number; symbol: ISymbol }>;
  /** Triggers activated */
  triggers: IScatterTrigger[];
  /** Immediate scatter payout */
  scatterPays: number;
  /** Scatters collected (for collection system) */
  collectedScatters: number;
}

/**
 * Extended symbol interface with additional properties.
 */
export interface ISymbol {
  id: string | number;
  value?: number;
  isWild: boolean;
  isScatter: boolean;
  /** Weight for random generation */
  weight?: number;
  /** For wilds: multiplier value */
  wildMultiplier?: number;
  /** For expanding wilds: original symbol ID */
  expandedFrom?: string | number;
  /** For sticky wilds: is sticky */
  isSticky?: boolean;
  /** For sticky wilds: remaining spins */
  remainingSpins?: number;
  /** For sticky wilds: unique identifier */
  stickyId?: string;
}

/**
 * Win evaluation result.
 */
export interface IWinEvaluation {
  /** Symbol ID that won */
  symbolId: number;
  /** Win amount */
  amount: number;
  /** Positions in the win */
  positions: Array<{ reel: number; row: number }>;
  /** Line index (for line wins) */
  lineIndex?: number;
  /** Way index (for ways wins) */
  wayIndex?: number;
  /** Multiplier applied */
  multiplier?: number;
}

/**
 * Game state with grid representation.
 */
export interface IGameState {
  /** Grid of symbols [reel][row] */
  grid: ISymbol[][];
  /** Current bet */
  bet: number;
  /** Game mode */
  gameMode: number;
  /** Free spins remaining */
  freeSpinsRemaining?: number;
  /** Active bonus state */
  bonusState?: any;
}

// ============== Respins / Hold & Win Types ==============

/**
 * Money symbol interface for respins features.
 */
export interface IMoneySymbol extends ISymbol {
  /** Is this a money/value symbol */
  isMoneySymbol?: boolean;
  /** Cash value of the symbol */
  value?: number;
  /** Is this a reset symbol (resets respin counter) */
  isResetSymbol?: boolean;
  /** Is this a jackpot symbol */
  isJackpotSymbol?: boolean;
  /** Jackpot type if applicable */
  jackpotType?: 'mini' | 'minor' | 'major' | 'grand';
}

/**
 * Trigger type for respins feature.
 */
export type RespinsTriggerType = 'symbol_count' | 'specific_positions';

/**
 * Position requirement for specific_positions trigger.
 */
export interface IRespinsTriggerPosition {
  row: number;
  col: number;
  symbolId?: string | number;
}

/**
 * Weight configuration for symbol generation in respins.
 */
export interface IRespinsSymbolWeight {
  symbolId: string | number;
  probability: number;
  baseValue?: number;
  isMoneySymbol?: boolean;
  isResetSymbol?: boolean;
  isJackpotSymbol?: boolean;
  jackpotType?: 'mini' | 'minor' | 'major' | 'grand';
}

/**
 * Full screen bonus configuration.
 */
export interface IRespinsFullScreenBonus {
  multiplier: number;
  additionalAward?: number;
}

/**
 * Configuration for respins/hold & win mechanics.
 */
export interface IRespinsConfig {
  /** Enable respins feature */
  enabled: boolean;
  /** Initial number of respins awarded */
  initialRespins?: number;
  /** Trigger type */
  triggerType: RespinsTriggerType;
  /** Minimum special symbols needed for trigger */
  minTriggerSymbols?: number;
  /** Specific positions required for trigger */
  triggerPositions?: IRespinsTriggerPosition[];
  /** Symbol weights for respin rounds */
  symbolWeights?: IRespinsSymbolWeight[];
  /** End feature if no new special symbols land */
  endOnNoSpecial?: boolean;
  /** Full screen bonus configuration */
  fullScreenBonus?: IRespinsFullScreenBonus;
  /** Grid size for respins (if different from base game) */
  gridRows?: number;
  gridCols?: number;
}

/**
 * Single step in a respins sequence.
 */
export interface IRespinsStep {
  /** Respins remaining after this step */
  respinsRemaining: number;
  /** All locked positions */
  lockedPositions: Array<{ row: number; col: number }>;
  /** New symbols that landed */
  newSymbols: Array<{ row: number; col: number; symbolId: string | number }>;
  /** Value added in this step */
  valuesAdded: number;
  /** Jackpots awarded in this step */
  jackpotsAwarded: string[];
  /** Reason for this step */
  reason: 'initial_trigger' | 'respins' | 'jackpot_collected' | 'full_screen_bonus' | 'no_new_symbols';
}

/**
 * Result of respins feature execution.
 */
export interface IRespinsResult {
  /** Whether feature was triggered */
  triggered: boolean;
  /** All steps in the respins sequence */
  steps: IRespinsStep[];
  /** Final total value collected */
  finalValue: number;
  /** All jackpots collected */
  jackpotsCollected: string[];
  /** Final locked positions */
  lockedPositions: Array<{ row: number; col: number }>;
  /** Total respins used */
  totalRespinsUsed: number;
}

// --- Wallet & Transaction Types ---

export type TransactionType = 
  | 'bet' 
  | 'payout' 
  | 'deposit' 
  | 'withdrawal' 
  | 'bonus_payout' 
  | 'jackpot_win' 
  | 'cascade_win' 
  | 'scatter_win' 
  | 'fee' 
  | 'refund' 
  | 'transfer';

export interface IWalletBalance {
  userId: string;
  amount: string; // Use string for precise decimal handling
  version: number; // For optimistic locking
  currency?: string;
  updatedAt: Date;
}

export interface ITransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  referenceId: string; // e.g., roundId
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface IWalletConfig {
  currency?: string;
  precision?: number;
  allowNegative?: boolean;
  minBalance?: number;
  maxBalance?: number;
}

export interface ITransactionResult {
  success: boolean;
  balance?: string;
  transactionId?: string;
  error?: string;
  code?: string;
  message?: string;
}

/**
 * Storage Interface - Implement this to connect to your DB (Postgres, Mongo, etc.)
 */
export interface IWalletStorage {
  getBalance(userId: string): Promise<IWalletBalance | null>;
  updateBalance(userId: string, amount: string, version: number): Promise<IWalletBalance | null>;
  recordTransaction(transaction: ITransaction): Promise<void>;
  getTransactionHistory(userId: string, limit?: number): Promise<ITransaction[]>;
}