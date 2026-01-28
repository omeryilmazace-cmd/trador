import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

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