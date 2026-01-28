import { Candle, StrategyConfig, Timeframe } from './types';

export const MOCK_ASSETS = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'HYPE/USD'];

// Deterministic random number generator for consistent chart data
let seed = 1234;
function random() {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

// Generate realistic looking crypto walk
export const generateMockData = (days: number = 30): Candle[] => {
  const data: Candle[] = [];
  let price = 42000; // Starting BTC price
  const now = new Date();
  const startTime = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).getTime();
  const interval = 3600 * 1000; // 1 hour

  for (let i = 0; i < days * 24; i++) {
    const time = startTime + i * interval;
    const volatility = 0.015; // 1.5% volatility
    const change = (random() - 0.5) * volatility * price;
    
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + (random() * price * 0.005);
    const low = Math.min(open, close) - (random() * price * 0.005);
    const volume = 1000 + random() * 5000;

    data.push({
      timestamp: time,
      open,
      high,
      low,
      close,
      volume,
      dateStr: new Date(time).toLocaleDateString() + ' ' + new Date(time).getHours() + ':00'
    });

    price = close;
  }
  return data;
};

export const INITIAL_CAPITAL = 10000;

export const PRESET_STRATEGIES: StrategyConfig[] = [
  {
    name: "Classic RSI Reversion",
    description: "Standard mean reversion. Buy when oversold (<30), sell when overbought (>70).",
    timeframe: Timeframe.H1,
    entryConditions: [
      { indicator: 'RSI', operator: '<', value: 30, params: { period: 14 } }
    ],
    exitConditions: [
      { indicator: 'RSI', operator: '>', value: 70, params: { period: 14 } }
    ],
    stopLossPct: 0.02,
    takeProfitPct: 0.05,
    riskPerTradePct: 0.02,
    logicExplanation: "Capitalizes on temporary price deviations. Assumes price will return to the mean after extending too far."
  },
  {
    name: "Golden Cross Trend",
    description: "Trend following. Buy when fast SMA crosses above slow SMA.",
    timeframe: Timeframe.H1,
    entryConditions: [
      { indicator: 'SMA_CROSS', operator: 'crosses_above', value: 0, params: { fast: 12, slow: 26 } }
    ],
    exitConditions: [
      { indicator: 'SMA_CROSS', operator: 'crosses_below', value: 0, params: { fast: 12, slow: 26 } }
    ],
    stopLossPct: 0.03,
    takeProfitPct: 0.10,
    riskPerTradePct: 0.02,
    logicExplanation: "Classic trend-following system approximating MACD logic. Captures major market moves by ignoring minor noise."
  },
  {
    name: "The Vulture Scalper",
    description: "High risk. Buys deep crashes (RSI < 20) for a quick bounce.",
    timeframe: Timeframe.M15,
    entryConditions: [
      { indicator: 'RSI', operator: '<', value: 20, params: { period: 9 } }
    ],
    exitConditions: [
      { indicator: 'RSI', operator: '>', value: 45, params: { period: 9 } }
    ],
    stopLossPct: 0.015,
    takeProfitPct: 0.03,
    riskPerTradePct: 0.01,
    logicExplanation: "Contrarian strategy. Assumes extreme panic selling is almost always followed by a 'dead cat bounce' or relief rally."
  },
  {
    name: "Momentum Surfer",
    description: "Buys when price is STRONG (RSI > 55) and holding above SMA 50.",
    timeframe: Timeframe.H4,
    entryConditions: [
      { indicator: 'RSI', operator: '>', value: 55, params: { period: 14 } },
      { indicator: 'PRICE_LEVEL', operator: '>', value: 0, params: { period: 50 } } // Price > SMA 50
    ],
    exitConditions: [
      { indicator: 'PRICE_LEVEL', operator: '<', value: 0, params: { period: 20 } } // Exit when Price < SMA 20 (trailing stop feel)
    ],
    stopLossPct: 0.04,
    takeProfitPct: 0.15,
    riskPerTradePct: 0.02,
    logicExplanation: "Momentum continuation. Instead of buying low, we buy high and sell higher, riding the established trend strength."
  }
];