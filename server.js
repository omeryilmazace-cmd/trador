import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// AI Proxy for Local Dev
app.post('/api/analyze', async (req, res) => {
  console.log("[SERVER] POST /api/analyze", req.body);
  const { userNotes } = req.body;
  if (!userNotes) {
    return res.status(400).json({ error: 'Missing userNotes in request body' });
  }

  const apiKey = process.env.API_KEY;
  const baseUrl = process.env.API_BASE_URL || 'https://api.groq.com/openai/v1';

  console.log(`[SERVER] Using API Key: ${apiKey?.substring(0, 6)}...`);
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
    console.log("[SERVER] AI Raw Response Length:", content.length);

    // Filter out everything but the JSON part
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
      content = content.substring(firstBrace, lastBrace + 1);
    }

    try {
      const result = JSON.parse(content);
      if (!result.strategies || !Array.isArray(result.strategies)) {
        throw new Error("Invalid output format: 'strategies' array missing");
      }
      res.json({ strategies: result.strategies });
    } catch (parseError) {
      console.error("[SERVER] JSON Parse Error:", parseError.message);
      console.log("[SERVER] Faulty Content:", content);
      res.status(500).json({ error: "AI produced invalid JSON output. Details in logs." });
    }
  } catch (error) {
    console.error("[SERVER] AI Proxy Error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// API Endpoint: Deploy Strategy
app.post('/api/deploy', (req, res) => {
  const { strategy, agentKey } = req.body;

  if (!strategy || !agentKey) {
    return res.status(400).json({ error: 'Missing strategy or agent key' });
  }

  // LOGIC: In a real production app, this would:
  // 1. Decrypt/Verify the Agent Key.
  // 2. Spin up a background worker (e.g., BullMQ, Redis) to run the bot.
  // 3. Connect to Hyperliquid API.

  console.log(`[SERVER] 🚀 Strategy Deployed: "${strategy.name}"`);
  console.log(`[SERVER] 🔑 Agent Key Hash: ${agentKey.substring(0, 6)}...******`);
  console.log(`[SERVER] 📊 Timeframe: ${strategy.timeframe} | Risk: ${(strategy.stopLossPct * 100)}%`);

  // Simulate success
  res.json({
    success: true,
    message: 'Strategy Agent successfully initialized on server.',
    jobId: 'job_' + Math.random().toString(36).substr(2, 9)
  });
});

// Catch-all route to serve React Frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});