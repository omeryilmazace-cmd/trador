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

    const SYSTEM_PROMPT = `Sen deneyimli bir Kantitatif Strateji Analistisin. 
Kullanıcının verdiği notlara ve piyasa verilerine (son 50 mum) dayanarak en az 3 farklı trade stratejisi üretmelisin. 

Kurallar:
1. EMA_CROSS, SMA_CROSS, RSI, MACD ve BOLLINGER indikatörlerini kullanabilirsin.
2. EMA_CROSS ve SMA_CROSS için 'crosses_above' veya 'crosses_below' operatörlerini kullan.
3. Yanıtın MUTLAKA şu JSON formatında olmalı: { "strategies": [ { "name": "...", "description": "...", "timeframe": "1h", "entryConditions": [...], "exitConditions": [...], "stopLossPct": 0.02, "takeProfitPct": 0.04, "riskPerTradePct": 0.01, "logicExplanation": "..." } ] }
4. SADECE JSON döndür, başka açıklama yazma.`;

    try {
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `Kullanıcı Notu: ${userNotes}\nPiyasa Özeti: Son Fiyat ${req.body.data?.[req.body.data.length - 1]?.close || 'N/A'}` }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            max_tokens: 2000
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
        console.error("AI Error:", error.message);
        res.status(500).json({ error: error.message });
    }
}
