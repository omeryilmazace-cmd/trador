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
    const slRanges = [0.01, 0.02, 0.03];
    const tpRanges = [0.04, 0.06, 0.08];

    const firstCond = entryConds[0];
    const paramVariations: number[] = [];
    const valueVariations: number[] = [];
    const operatorVariations: string[] = [];

    if (firstCond) {
        if (firstCond.indicator === 'RSI') {
            paramVariations.push(7, 14, 21);
            valueVariations.push(30, 70); // oversold vs overbought
            operatorVariations.push('<', '>');
        } else if (firstCond.indicator === 'EMA_CROSS' || firstCond.indicator === 'SMA_CROSS') {
            paramVariations.push(9, 12, 20);
            valueVariations.push(0);
            operatorVariations.push('crosses_above', 'crosses_below');
        } else if (firstCond.indicator === 'BOLLINGER') {
            paramVariations.push(20, 26);
            valueVariations.push(0);
            operatorVariations.push('<', '>');
        } else {
            paramVariations.push(0);
            valueVariations.push(firstCond.value);
            operatorVariations.push(firstCond.operator);
        }
    } else {
        paramVariations.push(0);
        valueVariations.push(0);
        operatorVariations.push('');
    }

    const totalIterations = slRanges.length * tpRanges.length * paramVariations.length * valueVariations.length * operatorVariations.length;
    let currentIteration = 0;

    for (const sl of slRanges) {
        for (const tp of tpRanges) {
            for (const param of paramVariations) {
                for (const val of valueVariations) {
                    for (const oper of operatorVariations) {
                        const newEntryConds = [...entryConds];
                        if (firstCond) {
                            const newFirst = {
                                ...firstCond,
                                operator: oper as any,
                                value: val,
                                params: { ...firstCond.params }
                            };
                            if (newFirst.indicator === 'RSI') newFirst.params.period = param;
                            if (newFirst.indicator === 'EMA_CROSS' || newFirst.indicator === 'SMA_CROSS') newFirst.params.fast = param;
                            if (newFirst.indicator === 'BOLLINGER') newFirst.params.period = param;
                            newEntryConds[0] = newFirst;
                        }

                        const variation: StrategyConfig = {
                            ...baseConfig,
                            entryConditions: newEntryConds,
                            stopLossPct: sl,
                            takeProfitPct: tp,
                            name: `Opt: ${oper} ${val}${param !== 0 ? ` (P:${param})` : ''}`
                        };

                        const stats = runBacktest(variation, data);
                        const tradeBias = Math.min(stats.totalTrades / 5, 1);
                        const score = ((stats.totalPnL * (stats.winRate + 0.1)) / (stats.maxDrawdown + 0.02)) * tradeBias;

                        results.push({ config: variation, stats, score });

                        currentIteration++;
                        if (currentIteration % 20 === 0) {
                            onProgress?.((currentIteration / totalIterations) * 100);
                            await new Promise(r => setTimeout(r, 0));
                        }
                    }
                }
            }
        }
    }

    return results
        .filter(r => r.stats.totalTrades > 1)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
};
