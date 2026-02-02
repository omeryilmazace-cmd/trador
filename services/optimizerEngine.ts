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

    // Deep clone helper
    const deepClone = (obj: any) => JSON.parse(JSON.stringify(obj));

    // Define Parameter Grids
    const slRanges = [0.01, 0.02, 0.03];
    const tpRanges = [0.03, 0.05, 0.08];

    const paramVariations = [7, 14, 21, 28];
    const valueVariations = [25, 30, 35, 70, 75, 80];

    // Testing variations across both entry and exit if they exist
    const totalIterations = 50;

    for (let i = 0; i < totalIterations; i++) {
        const variation = deepClone(baseConfig);

        variation.stopLossPct = slRanges[Math.floor(Math.random() * slRanges.length)];
        variation.takeProfitPct = tpRanges[Math.floor(Math.random() * tpRanges.length)];

        if (variation.entryConditions[0]) {
            const cond = variation.entryConditions[0];
            cond.params.period = paramVariations[Math.floor(Math.random() * paramVariations.length)];
            cond.value = valueVariations[Math.floor(Math.random() * valueVariations.length)];
            if (cond.indicator === 'RSI') {
                cond.operator = Math.random() > 0.5 ? '<' : '>';
            }
        }

        if (variation.exitConditions[0]) {
            const cond = variation.exitConditions[0];
            cond.params.period = paramVariations[Math.floor(Math.random() * paramVariations.length)];
            cond.value = valueVariations[Math.floor(Math.random() * valueVariations.length)];
            if (cond.indicator === 'RSI') {
                cond.operator = Math.random() > 0.5 ? '<' : '>';
            }
        }

        variation.name = `Optimized #${i + 1}`;
        const stats = runBacktest(variation, data);

        const tradeBias = Math.min(stats.totalTrades / 5, 1);
        const score = ((stats.totalPnL * (stats.winRate + 0.1)) / (stats.maxDrawdown + 0.02)) * tradeBias;

        results.push({ config: variation, stats, score });

        if (i % 5 === 0) {
            onProgress?.((i / totalIterations) * 100);
            await new Promise(r => setTimeout(r, 0));
        }
    }

    return results
        .filter(r => r.stats.totalTrades > 2)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
};
