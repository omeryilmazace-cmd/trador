import OpenAI from 'openai';

// Simplified Backtest for Server-side filtering
const runQuickBacktest = (strategy, data) => {
    if (!data || data.length < 50) return { totalPnL: 0, winRate: 0 };
    let equity = 10000;
    let openPrice = 0;
    let trades = 0;
    let wins = 0;

    for (let i = 20; i < data.length; i++) {
        const candle = data[i];
        if (openPrice === 0) {
            const signal = strategy.entryConditions.every(c => {
                if (c.indicator === 'RSI') {
                    // Very simplified RSI check for speed
                    return c.operator === '<' ? candle.close < candle.open : candle.close > candle.open;
                }
                return true;
            });
            if (signal) {
                openPrice = candle.close;
                trades++;
            }
        } else {
            const pnlPct = (candle.close - openPrice) / openPrice;
            if (pnlPct > strategy.takeProfitPct || pnlPct < -strategy.stopLossPct) {
                equity += equity * pnlPct;
                if (pnlPct > 0) wins++;
                openPrice = 0;
            }
        }
    }
    return { totalPnL: equity - 10000, winRate: trades > 0 ? wins / trades : 0 };
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { userNotes, data } = req.body;
    const apiKey = process.env.API_KEY;
    const baseUrl = process.env.API_BASE_URL || 'https://api.groq.com/openai/v1';

    if (!apiKey) return res.status(500).json({ error: 'API Key missing' });

    const openai = new OpenAI({ apiKey, baseURL: baseUrl });

    const SYSTEM_PROMPT = `Sen Pro-Level Kantitatif Strateji Analistisin. 
Görevin: Kullanıcı talebine göre EN AZ 3 FARKLI ve MANTIKLI trading stratejisi üretmek.

ÖNEMLİ: Sadece RSI kullanma. EMA_CROSS, MACD, BOLLINGER ve SMA_CROSS indikatörlerini aktif kullan.
Stratejiler birbirinden farklı mantıklara sahip olsun (örn. biri trend takip, biri mean reversion, biri scalping).

İNDİKATÖRLER VE PARAMETRELER:
- RSI: { period }
- EMA_CROSS: { fast, slow }
- SMA_CROSS: { fast, slow }
- MACD: { fast, slow, signal } -> value = threshold
- BOLLINGER: { period, stdDev }
- PRICE_LEVEL: { period }

ÇIKTI FORMATI (SADECE JSON):
{
  "strategies": [
    {
      "name": "Strateji İsmi",
      "description": "Açıklama",
      "timeframe": "1h",
      "entryConditions": [{ "indicator": "...", "operator": "...", "value": 0, "params": {} }],
      "exitConditions": [],
      "stopLossPct": 0.02,
      "takeProfitPct": 0.04,
      "riskPerTradePct": 0.01,
      "logicExplanation": "..."
    }
  ]
}`;

    try {
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `Kullanıcı Talebi: "${userNotes}"\nLütfen en iyi stratejileri üret.` }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });

        let content = completion.choices[0].message.content;

        // Robust JSON extract
        const firstBrace = content.indexOf('{');
        const lastBrace = content.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            content = content.substring(firstBrace, lastBrace + 1);
        }

        try {
            const result = JSON.parse(content);
            const strategies = result.strategies || [];
            res.status(200).json({ strategies });
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError.message);
            res.status(500).json({ error: 'AI produced invalid JSON output' });
        }

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: 'AI analysis failed' });
    }
}
