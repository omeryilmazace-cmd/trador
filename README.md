# StrategyFactory AI

**Autonomous Quantitative Trading Platform**

StrategyFactory AI is a sophisticated fintech platform that empowers users to design, backtest, and deploy trading strategies without writing a single line of code. By leveraging Generative AI (Google Gemini), it translates natural language intent and chart patterns into executable quantitative logic.

## 🚀 Features

- **AI-Powered Strategy Generation**: Describe your strategy in plain English (e.g., "Buy when RSI < 30 and price is above SMA 200") and let the AI build the logic.
- **Interactive Backtesting**: Visualize strategy performance instantly with realistic candle-by-candle execution simulation.
- **Paper Trading**: Test strategies in a risk-free environment before deploying capital.
- **Hyperliquid Integration**: Seamlessly deploy strategies to the Hyperliquid DEX via secure API Agents.
- **Risk Management**: Built-in safeguards, including drawdown analysis, stop-loss/take-profit enforcement, and volatility checks.

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Recharts, Lucide React
- **AI Engine**: Google Gemini API (`@google/genai`)
- **Build Tool**: Vite
- **Deployment**: Ready for Railway / Vercel

## 📦 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/TradersEntertainment/strategyfactoryLast.git
   cd strategyfactoryLast
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   API_KEY=your_google_gemini_api_key_here
   ```

4. **Run Local Development Server**
   ```bash
   npm run dev
   ```

## 🚢 Deployment (Railway)

1. Push this repo to GitHub.
2. Connect your GitHub repo to [Railway](https://railway.app/).
3. Add `API_KEY` to the Railway Service Variables.
4. Deploy!

## 🛡️ License

Private - TradersEntertainment
