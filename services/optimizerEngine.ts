import { StrategyConfig, Candle, BacktestResult } from '../types';
import { runBacktest } from './backtestEngine';

export interface OptimizationResult {
    config: StrategyConfig;
    stats: BacktestResult;
    score: number;
}

export const optimizeStrategy = async (
    baseConfig: StrategyConfig,
    data: Candle[],
    onProgress?: (progress: number) => void
): Promise<OptimizationResult[]> => {
    const results: OptimizationResult[] = [];

    // 1. Identify what to optimize
    // For MVP: We will optimize RSI periods, SL/TP, and try indicator combinations.

    const entryConds = baseConfig.entryConditions;
    const exitConds = baseConfig.exitConditions;

    // Simple Power Set of Entry Conditions (Binary combinations)
    const getSubsets = <T>(array: T[]): T[][] => {
        return array.reduce((subsets, value) => subsets.concat(subsets.map(set => [value, ...set])), [[]] as T[][]);
    };

    const entrySubsets = getSubsets(entryConds).filter(s => s.length > 0);
    const totalIterations = entrySubsets.length;
    let currentIteration = 0;

    for (const subset of entrySubsets) {
        // Create a variation
        const variation: StrategyConfig = {
            ...baseConfig,
            entryConditions: subset,
            name: `Opt: ${subset.map(c => c.indicator).join(' + ')}`
        };

        const stats = runBacktest(variation, data);

        // Scoring: PnLxWinRate / Drawdown (simplified)
        const score = (stats.totalPnL * (stats.winRate || 0.1)) / (stats.maxDrawdown || 0.01);

        results.push({
            config: variation,
            stats,
            score
        });

        currentIteration++;
        onProgress?.((currentIteration / totalIterations) * 100);

        // Yield to browser UI
        if (currentIteration % 5 === 0) await new Promise(r => setTimeout(r, 0));
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 5);
};
