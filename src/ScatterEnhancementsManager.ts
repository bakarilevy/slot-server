import type {
  IGameState,
  ISymbol,
  IWinEvaluation,
  IScatterConfig,
  IScatterResult,
  IScatterTrigger,
} from './types.js';

/**
 * ScatterEnhancementsManager - Advanced scatter symbol mechanics
 * 
 * Features:
 * - Configurable scatter trigger conditions
 * - Scatter collection systems
 * - Progressive scatter triggers
 * - Scatter multiplier zones
 * - Scatter transformation mechanics
 * - Dynamic scatter behavior
 */
export class ScatterEnhancementsManager {
  private config: IScatterConfig;

  constructor(config: IScatterConfig) {
    this.config = config;
  }

  /**
   * Evaluate scatter symbols on the current grid
   */
  public evaluateScatters(gameState: IGameState): IScatterResult {
    const scatterPositions: Array<{ reel: number; row: number; symbol: ISymbol }> = [];
    let totalScatterCount = 0;
    let totalScatterValue = 0;

    // Find all scatter symbols on the grid
    gameState.grid.forEach((reel, reelIndex) => {
      reel.forEach((symbol, rowIndex) => {
        if (symbol.isScatter) {
          scatterPositions.push({
            reel: reelIndex,
            row: rowIndex,
            symbol,
          });
          totalScatterCount++;
          totalScatterValue += symbol.value || 0;
        }
      });
    });

    // Check for trigger conditions
    const triggers = this.checkTriggerConditions(totalScatterCount, scatterPositions);

    // Calculate any immediate scatter pays
    const scatterPays = this.calculateScatterPays(totalScatterCount, totalScatterValue);

    return {
      success: scatterPositions.length > 0,
      scatterCount: totalScatterCount,
      scatterValue: totalScatterValue,
      positions: scatterPositions,
      triggers,
      scatterPays,
      collectedScatters: 0, // Updated by collection system
    };
  }

  /**
   * Check if scatter conditions trigger bonus features
   */
  private checkTriggerConditions(
    scatterCount: number,
    positions: Array<{ reel: number; row: number; symbol: ISymbol }>
  ): IScatterTrigger[] {
    const triggers: IScatterTrigger[] = [];

    // Standard trigger: minimum scatter count
    if (scatterCount >= (this.config.minScattersForTrigger || 3)) {
      triggers.push({
        type: 'BONUS_TRIGGER',
        triggered: true,
        scatterCount,
        featureType: this.config.triggeredFeature || 'FREE_SPINS',
        awardedSpins: this.calculateAwardedSpins(scatterCount),
      });
    }

    // Check for specific reel combinations
    if (this.config.requireSpecificReels) {
      const reelSet = new Set(positions.map((p) => p.reel));
      const requiredReels = this.config.requiredReels || [];
      
      const hasAllRequired = requiredReels.every((reel) => reelSet.has(reel));
      
      if (hasAllRequired) {
        triggers.push({
          type: 'REEL_COMBINATION_TRIGGER',
          triggered: true,
          scatterCount,
          featureType: 'ENHANCED_BONUS',
          awardedSpins: this.calculateAwardedSpins(scatterCount) * 2,
        });
      }
    }

    // Check for scatter clusters (adjacent scatters)
    if (this.config.enableClusterTriggers) {
      const clusters = this.findScatterClusters(positions);
      
      clusters.forEach((cluster) => {
        if (cluster.size >= (this.config.clusterSizeForTrigger || 4)) {
          triggers.push({
            type: 'CLUSTER_TRIGGER',
            triggered: true,
            scatterCount: cluster.size,
            featureType: 'CLUSTER_BONUS',
            clusterPositions: cluster.positions,
          });
        }
      });
    }

    // Check for progressive trigger (accumulated over multiple spins)
    if (this.config.enableProgressiveTrigger) {
      // This would integrate with a persistent state manager
      // Placeholder for progressive logic
    }

    return triggers;
  }

  /**
   * Calculate number of spins awarded based on scatter count
   */
  private calculateAwardedSpins(scatterCount: number): number {
    const spinTable = this.config.spinAwardTable || {
      3: 10,
      4: 15,
      5: 20,
      6: 25,
    };

    // Find the best match in the table
    const matchingKey = Object.keys(spinTable)
      .map(Number)
      .filter((key) => scatterCount >= key)
      .sort((a, b) => b - a)[0];

    return matchingKey ? spinTable[matchingKey] : 0;
  }

  /**
   * Calculate immediate scatter payouts
   */
  private calculateScatterPays(count: number, totalValue: number): number {
    if (!this.config.enableScatterPays) {
      return 0;
    }

    const payTable = this.config.scatterPayTable || {};
    const basePay = payTable[count] || 0;

    // Apply multiplier if configured
    const multiplier = this.config.scatterMultiplier || 1;
    
    return (basePay + totalValue) * multiplier;
  }

  /**
   * Find clusters of adjacent scatter symbols
   */
  private findScatterClusters(
    positions: Array<{ reel: number; row: number; symbol: ISymbol }>
  ): Array<{ size: number; positions: Array<{ reel: number; row: number }> }> {
    const clusters: Array<{ size: number; positions: Array<{ reel: number; row: number }> }> = [];
    const visited = new Set<string>();

    positions.forEach((pos) => {
      const key = `${pos.reel}-${pos.row}`;
      
      if (!visited.has(key)) {
        const cluster = this.floodFillCluster(pos, positions, visited);
        
        if (cluster.length > 1) {
          clusters.push({
            size: cluster.length,
            positions: cluster,
          });
        }
      }
    });

    return clusters;
  }

  /**
   * Flood fill algorithm to find connected scatter positions
   */
  private floodFillCluster(
    start: { reel: number; row: number },
    allPositions: Array<{ reel: number; row: number; symbol: ISymbol }>,
    visited: Set<string>
  ): Array<{ reel: number; row: number }> {
    const cluster: Array<{ reel: number; row: number }> = [];
    const queue = [start];
    const positionSet = new Set(allPositions.map((p) => `${p.reel}-${p.row}`));

    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.reel}-${current.row}`;

      if (visited.has(key)) {
        continue;
      }

      visited.add(key);
      cluster.push(current);

      // Check adjacent positions (up, down, left, right, diagonals)
      const adjacentOffsets = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1],
      ];

      adjacentOffsets.forEach(([dReel, dRow]) => {
        const neighbor = {
          reel: current.reel + dReel,
          row: current.row + dRow,
        };
        const neighborKey = `${neighbor.reel}-${neighbor.row}`;

        if (positionSet.has(neighborKey) && !visited.has(neighborKey)) {
          queue.push(neighbor);
        }
      });
    }

    return cluster;
  }

  /**
   * Manage scatter collection system (collect scatters over multiple spins)
   */
  public manageScatterCollection(
    currentScatters: IScatterResult,
    collectedData: { count: number; values: number[]; spinsRemaining: number }
  ): { updated: typeof collectedData; collectionTrigger?: IScatterTrigger } {
    const updated = { ...collectedData };

    // Add current scatters to collection
    updated.count += currentScatters.scatterCount;
    currentScatters.positions.forEach((pos) => {
      updated.values.push(pos.symbol.value || 0);
    });

    let collectionTrigger: IScatterTrigger | undefined;

    // Check if collection target reached
    const targetCount = this.config.collectionTarget || 10;
    
    if (updated.count >= targetCount) {
      collectionTrigger = {
        type: 'COLLECTION_COMPLETE',
        triggered: true,
        scatterCount: updated.count,
        featureType: 'COLLECTION_BONUS',
        awardedSpins: this.config.collectionBonusSpins || 10,
        collectedValue: updated.values.reduce((sum, val) => sum + val, 0),
      };

      // Reset collection after trigger
      updated.count = 0;
      updated.values = [];
    }

    // Decrement spins remaining
    updated.spinsRemaining--;
    
    // Auto-trigger if spins run out
    if (updated.spinsRemaining <= 0 && updated.count > 0 && this.config.autoTriggerOnExpiry) {
      collectionTrigger = {
        type: 'COLLECTION_EXPIRY_TRIGGER',
        triggered: true,
        scatterCount: updated.count,
        featureType: 'MINI_BONUS',
        awardedSpins: Math.floor(updated.count / 2),
      };

      updated.count = 0;
      updated.values = [];
    }

    return { updated, collectionTrigger };
  }

  /**
   * Apply scatter transformation mechanics (e.g., scatters becoming wilds)
   */
  public transformScatters(
    gameState: IGameState,
    scatterPositions: Array<{ reel: number; row: number }>
  ): { modifiedGrid: ISymbol[][]; transformed: Array<{ reel: number; row: number }> } {
    const transformed: Array<{ reel: number; row: number }> = [];
    const modifiedGrid = gameState.grid.map((reel) => [...reel]);

    if (!this.config.enableTransformation) {
      return { modifiedGrid, transformed };
    }

    scatterPositions.forEach((pos) => {
      if (pos.reel >= 0 && pos.reel < modifiedGrid.length &&
          pos.row >= 0 && pos.row < modifiedGrid[pos.reel].length) {
        
        const transformType = this.config.transformationType || 'to_wild';
        
        if (transformType === 'to_wild') {
          modifiedGrid[pos.reel][pos.row] = {
            ...modifiedGrid[pos.reel][pos.row],
            isWild: true,
            isScatter: false,
            wildMultiplier: this.config.transformedWildMultiplier || 1,
          };
          transformed.push(pos);
        } else if (transformType === 'to_multiplier') {
          modifiedGrid[pos.reel][pos.row] = {
            ...modifiedGrid[pos.reel][pos.row],
            isScatter: false,
            value: (modifiedGrid[pos.reel][pos.row].value || 1) * 2,
          };
          transformed.push(pos);
        }
      }
    });

    return { modifiedGrid, transformed };
  }

  /**
   * Check for scatter in multiplier zones (special grid areas)
   */
  public checkMultiplierZones(scatterPositions: Array<{ reel: number; row: number }>): { totalMultiplier: number; zoneHits: Array<{ reel: number; row: number; multiplier: number }> } {
    const zoneHits: Array<{ reel: number; row: number; multiplier: number }> = [];
    let totalMultiplier = 1;

    const zones = this.config.multiplierZones || [];

    scatterPositions.forEach((pos) => {
      zones.forEach((zone) => {
        if (pos.reel >= zone.reelStart && pos.reel <= zone.reelEnd &&
            pos.row >= zone.rowStart && pos.row <= zone.rowEnd) {
          
          zoneHits.push({
            reel: pos.reel,
            row: pos.row,
            multiplier: zone.multiplier,
          });

          if (this.config.zoneMultiplierStacking === 'multiply') {
            totalMultiplier *= zone.multiplier;
          } else {
            totalMultiplier += (zone.multiplier - 1);
          }
        }
      });
    });

    return { totalMultiplier, zoneHits };
  }

  /**
   * Implement progressive scatter trigger (accumulates across game session)
   */
  public updateProgressiveScatter(
    currentCount: number,
    progressiveState: { accumulated: number; threshold: number; level: number }
  ): { updated: typeof progressiveState; triggered: boolean; reward?: any } {
    const updated = { ...progressiveState };
    updated.accumulated += currentCount;

    let triggered = false;
    let reward;

    if (updated.accumulated >= updated.threshold) {
      triggered = true;
      
      // Award progressive bonus
      reward = {
        type: 'PROGRESSIVE_SCATTER_BONUS',
        level: updated.level,
        accumulatedCount: updated.accumulated,
        awardedSpins: this.config.progressiveBonusSpins || (updated.level * 10),
        multiplier: this.config.progressiveMultiplier || updated.level,
      };

      // Reset or level up
      if (this.config.progressiveResetOnTrigger) {
        updated.accumulated = 0;
        updated.level = 1;
        updated.threshold = this.config.baseProgressiveThreshold || 20;
      } else {
        updated.level++;
        updated.threshold = Math.floor(updated.threshold * 1.5);
      }
    }

    return { updated, triggered, reward };
  }
}
