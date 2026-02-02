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
    if (!data || data.length < 50) return [];

    const results: OptimizationResult[] = [];
    const entryConds = baseConfig.entryConditions;

    // 1. Define Parameter Grids
    const slRanges = [0.01, 0.02, 0.03]; // 1%, 2%, 3%
    const tpRanges = [0.02, 0.04, 0.06]; // 2%, 4%, 6%

    // We'll test combinations of SL/TP and also variations of the first indicator's primary parameter
    const firstCond = entryConds[0];
    const paramVariations: number[] = [];

    if (firstCond) {
        if (firstCond.indicator === 'RSI') paramVariations.push(7, 10, 14, 21);
        if (firstCond.indicator === 'EMA_CROSS' || firstCond.indicator === 'SMA_CROSS') paramVariations.push(5, 9, 12, 20);
    } else {
        paramVariations.push(0); // Dummy for loop if no indicators to vary
    }

    const totalIterations = slRanges.length * tpRanges.length * (paramVariations.length || 1);
    let currentIteration = 0;

    for (const sl of slRanges) {
        for (const tp of tpRanges) {
            for (const param of paramVariations) {
                // Create a variation
                const newEntryConds = [...entryConds];
                if (firstCond && param !== 0) {
                    const newFirst = { ...firstCond, params: { ...firstCond.params } };
                    if (newFirst.indicator === 'RSI') newFirst.params.period = param;
                    if (newFirst.indicator === 'EMA_CROSS' || newFirst.indicator === 'SMA_CROSS') newFirst.params.fast = param;
                    newEntryConds[0] = newFirst;
                }

                const variation: StrategyConfig = {
                    ...baseConfig,
                    entryConditions: newEntryConds,
                    stopLossPct: sl,
                    takeProfitPct: tp,
                    name: `Opt: SL ${(sl * 100).toFixed(0)}% TP ${(tp * 100).toFixed(0)}% ${firstCond ? `P:${param}` : ''}`
                };

                const stats = runBacktest(variation, data);

                // Scoring: Focus on Net Profit, Win Rate, and Drawdown
                // We add a small bias for trade count to avoid over-fitting on 1 lucky trade
                const tradeBias = Math.min(stats.totalTrades / 10, 1);
                const score = ((stats.totalPnL * stats.winRate) / (stats.maxDrawdown + 0.01)) * tradeBias;

                results.push({
                    config: variation,
                    stats,
                    score
                });

                currentIteration++;
                onProgress?.((currentIteration / totalIterations) * 100);

                // Yield to browser UI frequently
                await new Promise(r => setTimeout(r, 0));
            }
        }
    }

    // Return top 5 unique-ish results (sorted by score)
    return results
        .filter(r => r.stats.totalTrades > 2)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
};
