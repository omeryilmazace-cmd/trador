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
    // 1. Slice data based on lookback
    const testData = baseConfig.lookbackCandles && baseConfig.lookbackCandles > 0
        ? data.slice(-baseConfig.lookbackCandles)
        : data;

    if (!testData || testData.length < 50) return [];

    const results: OptimizationResult[] = [];
    const deepClone = (obj: any) => JSON.parse(JSON.stringify(obj));

    // 2. Define Deterministic Grids (No randomness)
    const slRanges = baseConfig.riskParametersEnabled !== false ? [0.01, 0.02, 0.03] : [0];
    const tpRanges = baseConfig.riskParametersEnabled !== false ? [0.03, 0.05, 0.10] : [0];

    // Indicator Specific Variations
    const paramVariations = [7, 10, 14, 21, 28];
    const rsiValues = [25, 30, 70, 75];
    const rsiOps = ['<', '>'] as const;

    const firstCond = baseConfig.entryConditions[0];

    // Simple progress tracking
    const totalCombos = slRanges.length * tpRanges.length * (firstCond ? paramVariations.length * rsiValues.length * rsiOps.length : 1);
    let count = 0;

    for (const sl of slRanges) {
        for (const tp of tpRanges) {
            if (firstCond) {
                for (const p of paramVariations) {
                    for (const v of rsiValues) {
                        for (const op of rsiOps) {
                            const variation = deepClone(baseConfig);
                            variation.stopLossPct = sl;
                            variation.takeProfitPct = tp;

                            const cond = variation.entryConditions[0];
                            cond.params.period = p;
                            cond.value = v;
                            if (cond.indicator === 'RSI') cond.operator = op;

                            // Sync exit if it exists and matches
                            const exit = variation.exitConditions[0];
                            if (exit && exit.indicator === cond.indicator) {
                                exit.params.period = p;
                            }

                            const stats = runBacktest(variation, testData);
                            // Corrected scoring: Profit Factor + Net PnL - Drawdown
                            const score = (stats.totalPnL * (stats.profitFactor + 1)) / (stats.maxDrawdown + 0.01);

                            results.push({ config: variation, stats, score });

                            count++;
                            if (count % 20 === 0) {
                                onProgress?.((count / totalCombos) * 100);
                                await new Promise(r => setTimeout(r, 0));
                            }
                        }
                    }
                }
            } else {
                const variation = deepClone(baseConfig);
                variation.stopLossPct = sl;
                variation.takeProfitPct = tp;
                const stats = runBacktest(variation, testData);
                const score = stats.totalPnL / (stats.maxDrawdown + 0.01);
                results.push({ config: variation, stats, score });
                count++;
            }
        }
    }

    return results
        .filter(r => r.stats.totalTrades >= 2)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
};
