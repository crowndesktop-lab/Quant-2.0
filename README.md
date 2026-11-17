# Hermes Quant Suite v2.0

An advanced ML-enhanced quant trading signal dashboard and strategic analysis platform, migrated from Python to a full-stack Node.js (React + Express + TypeScript) architecture running on port 3000.

## 🦅 Overview

Hermes is a full-stack quant suite that simulates an automated trading machine. It includes:
1. **Multi-Indicator OTC Market Scanner**: Fluctuating pricing feeds, technical overlays (RSI, Bollinger Bands, EMA trend crossovers, ATR volume), and signal emission logic.
2. **XGBoost ML Probability Engine**: Uses an upgraded gradient boosting tree mock classifier that yields real-time win probability metrics based on contradictions and momentum overlays.
3. **Genetic Strategy Generator (Lab)**: Simulates a crossover genetic algorithm to optimize, backtest, and promote next-generation trading models.
4. **Adaptive Threshold Controller**: Monitors trade win rates and drawdowns, dynamically tweaking filters to adjust system precision during volatile regimes.
5. **AI Strategic Analyst**: Integrates **Gemini (gemini-2.5-flash)** server-side to conduct deep strategic audits on closed signal history and produce natural language quant reports.

## 📁 Repository Structure

- `server.ts`: Full-stack Express server containing trading simulations, database persistency, and lazy-loaded Gemini integrations.
- `/src/App.tsx`: Rich, responsive dark-mode tailwind dashboard equipped with bento statistics grids, active scanner, terminal logger, and genetic-lab panels.
- `/src/types.ts`: TypeScript schemas for signals, strategies, thresholds, and performance metrics.
- `metadata.json`: Workspace configuration file defining permissions and capabilities.

## 🚀 Environment Configuration

To configure the server-side Gemini AI features, define the following in your environment or `.env` file:

```env
# Optional: Gemini API Key for deep trade auditing
GEMINI_API_KEY=your_gemini_api_key
```
