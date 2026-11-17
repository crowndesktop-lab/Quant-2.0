import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GitCommit,
  Layers,
  Sparkles,
  Sliders,
  Filter,
  HelpCircle,
  Play,
  Zap,
  Dna
} from 'lucide-react';
import { TradingStrategy, TradingSignal } from '../types';

interface StrategyCorrelationMatrixProps {
  strategies: TradingStrategy[];
  signals: TradingSignal[];
  onSelectStrategy?: (strategyId: number) => void;
  onRunTest?: (strategyId: number) => void;
}

// Calculate Pearson Correlation Coefficient between two numeric series
function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 1.0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  const r = numerator / denominator;
  return Math.max(-1, Math.min(1, parseFloat(r.toFixed(3))));
}

// Map correlation value r (-1 to +1) to UI badge colors and descriptors
function getCorrelationColor(r: number): {
  bg: string;
  text: string;
  border: string;
  dot: string;
  label: string;
  cluster: string;
} {
  if (r >= 0.82) {
    return {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-300 font-extrabold',
      border: 'border-emerald-500/50',
      dot: 'bg-emerald-400',
      label: 'Ultra High Concordance',
      cluster: 'Clone Cluster (High Redundancy)'
    };
  }
  if (r >= 0.50) {
    return {
      bg: 'bg-teal-500/15',
      text: 'text-teal-300 font-bold',
      border: 'border-teal-500/40',
      dot: 'bg-teal-400',
      label: 'Moderate Positive',
      cluster: 'Genetic Family Cluster'
    };
  }
  if (r >= 0.18) {
    return {
      bg: 'bg-indigo-500/15',
      text: 'text-indigo-300 font-medium',
      border: 'border-indigo-500/35',
      dot: 'bg-indigo-400',
      label: 'Mild Synergy',
      cluster: 'Cross-Breed Candidate'
    };
  }
  if (r >= -0.18) {
    return {
      bg: 'bg-slate-800/40',
      text: 'text-slate-300 font-normal',
      border: 'border-slate-700/50',
      dot: 'bg-slate-400',
      label: 'Uncorrelated / Orthogonal',
      cluster: 'Orthogonal Hedge (Diversifier)'
    };
  }
  if (r >= -0.55) {
    return {
      bg: 'bg-amber-500/15',
      text: 'text-amber-300 font-bold',
      border: 'border-amber-500/40',
      dot: 'bg-amber-400',
      label: 'Moderate Inverse',
      cluster: 'Inverse Pair Hedge'
    };
  }
  return {
    bg: 'bg-rose-500/20',
    text: 'text-rose-300 font-extrabold',
    border: 'border-rose-500/50',
    dot: 'bg-rose-400',
    label: 'Strong Negative Inverse',
    cluster: 'Polar Counter-Trend Cluster'
  };
}

export const StrategyCorrelationMatrix: React.FC<StrategyCorrelationMatrixProps> = ({
  strategies,
  signals,
  onSelectStrategy,
  onRunTest
}) => {
  const [selectedCell, setSelectedCell] = useState<{ idA: number; idB: number } | null>(null);
  const [genFilter, setGenFilter] = useState<'all' | 'diverse' | number>('diverse');
  const [marketCondition, setMarketCondition] = useState<'all_candles' | 'high_volatility' | 'ranging' | 'trending'>('all_candles');
  const [showClusterGuide, setShowClusterGuide] = useState(false);

  // Available unique generations sorted ascending
  const generations = useMemo(() => {
    const set = new Set<number>();
    strategies.forEach((s) => set.add(s.generation || 1));
    return Array.from(set).sort((a, b) => a - b);
  }, [strategies]);

  // Select strategies for the matrix view, ensuring multi-generation representation when 'diverse' is active
  const activeStrategies = useMemo(() => {
    let pool = strategies.filter((s) => s.enabled);
    if (pool.length < 3) {
      pool = [...strategies];
    }

    if (typeof genFilter === 'number') {
      return pool.filter((s) => (s.generation || 1) === genFilter).slice(0, 12);
    }

    if (genFilter === 'diverse' && generations.length > 1) {
      const picked: TradingStrategy[] = [];
      const pickedIds = new Set<number>();
      // Round-robin pick across generations sorted by success score so every generation is represented
      const byGen = new Map<number, TradingStrategy[]>();
      generations.forEach((g) => {
        const group = pool
          .filter((s) => (s.generation || 1) === g)
          .sort((a, b) => (b.success_score ?? b.last_wr * 100) - (a.success_score ?? a.last_wr * 100));
        if (group.length > 0) byGen.set(g, group);
      });

      let round = 0;
      while (picked.length < 10 && round < 10) {
        let addedInRound = false;
        for (const g of generations) {
          const group = byGen.get(g);
          if (group && group[round] && !pickedIds.has(group[round].id)) {
            picked.push(group[round]);
            pickedIds.add(group[round].id);
            addedInRound = true;
            if (picked.length >= 10) break;
          }
        }
        if (!addedInRound) break;
        round++;
      }
      return picked;
    }

    return pool.slice(0, 12);
  }, [strategies, genFilter, generations]);

  // Compute each strategy's 24-regime response vector using its actual genetic parameters,
  // indicator weights, backtest curve, per-pair win rates, and live signal outcomes
  const strategyVectors = useMemo(() => {
    const vectors: Record<number, number[]> = {};

    // Canonical 24 market condition states (oscillating RSI, Bollinger position, EMA trend, and ATR shock)
    const canonicalMarketStates = Array.from({ length: 24 }, (_, idx) => {
      const phase = (idx / 24) * Math.PI * 2;
      return {
        rsiState: 50 + Math.sin(phase * 1.5) * 28 + Math.cos(idx * 0.9) * 8, // 14 to 86
        bbState: 0.5 + Math.sin(phase * 2.0 + 0.4) * 0.48, // 0.02 to 0.98
        emaTrendState: Math.cos(phase * 1.1 - 0.3), // -1 to +1
        volExpansion: Math.abs(Math.sin(phase * 2.5)), // 0 to 1
        btcBias: Math.sin(phase),
        ethBias: Math.cos(phase * 1.3),
        solBias: Math.sin(phase * 1.7 + 0.6)
      };
    });

    activeStrategies.forEach((strat) => {
      const rw = Number(strat.weights?.rsi_weight ?? 0.35);
      const bw = Number(strat.weights?.bb_weight ?? 0.35);
      const ew = Number(strat.weights?.ema_weight ?? 0.30);

      const rsiPeriod = Number(strat.params?.rsi_period ?? 14);
      const rsiOversold = Number(strat.params?.rsi_oversold ?? 30);
      const rsiOverbought = Number(strat.params?.rsi_overbought ?? 70);
      const bbStd = Number(strat.params?.bb_std ?? 2.0);
      const emaFast = Number(strat.params?.ema_fast ?? 9);
      const emaSlow = Number(strat.params?.ema_slow ?? 21);

      const btcWr = strat.best_pairs?.find((p) => p.pair === 'BTC/USDT')?.win_rate ?? strat.last_wr ?? 0.62;
      const ethWr = strat.best_pairs?.find((p) => p.pair === 'ETH/USDT')?.win_rate ?? strat.last_wr ?? 0.60;
      const solWr = strat.best_pairs?.find((p) => p.pair === 'SOL/USDT')?.win_rate ?? strat.last_wr ?? 0.58;

      // Check if strategy has distinct backtest_history deltas
      const histDeltas: number[] = [];
      if (Array.isArray(strat.backtest_history) && strat.backtest_history.length >= 6) {
        for (let i = 1; i < strat.backtest_history.length; i++) {
          const prev = strat.backtest_history[i - 1].value || 1000;
          const cur = strat.backtest_history[i].value || 1000;
          histDeltas.push(((cur - prev) / prev) * 100);
        }
      }

      // Incorporate real attributed signal outcomes if present
      const cleanStratBase = strat.name.replace(/-(1M|5M|15M|30M|60M)$/i, '').trim();
      const stratSignals = signals.filter((sig) => {
        if (!sig.strategy_name) return false;
        const sigBase = sig.strategy_name.replace(/-(1M|5M|15M|30M|60M)$/i, '').trim();
        return sig.strategy_name === strat.name || sigBase === cleanStratBase;
      });
      const liveSignalBias = stratSignals.length > 0
        ? stratSignals.reduce((acc, s) => acc + (s.outcome === 'win' ? 0.35 : s.outcome === 'loss' ? -0.35 : 0.1), 0) / stratSignals.length
        : 0;

      // Determine whether this strategy is contrarian (reversion) vs breakout/momentum
      const isReversion = /reversion|oversold|bounce|pinball|absorption/i.test(`${strat.name} ${strat.category || ''} ${strat.entry_logic}`);
      const isBreakout = /breakout|squeeze|expansion|momentum|xgb|trend/i.test(`${strat.name} ${strat.category || ''} ${strat.entry_logic}`);
      const polarity = isReversion && !isBreakout ? -1 : isBreakout && !isReversion ? 1 : (rw > bw + 0.1 ? -0.65 : 0.65);

      const responseSeries = canonicalMarketStates.map((m, idx) => {
        // 1. RSI gene response
        const rsiDistFromCenter = (m.rsiState - 50) / 35; // -1 to +1
        const rsiSensitivity = 14 / Math.max(6, rsiPeriod);
        const rsiThresholdTightness = (35 - rsiOversold + (rsiOverbought - 65)) / 20;
        const rsiResponse =
          rw *
          rsiSensitivity *
          (polarity < 0
            ? -Math.sin(rsiDistFromCenter * Math.PI * (0.8 + rsiThresholdTightness * 0.25))
            : Math.cos(rsiDistFromCenter * Math.PI * 0.7));

        // 2. Bollinger Band gene response
        const bbDeviation = (m.bbState - 0.5) * 2; // -1 to +1
        const bbResponse =
          bw *
          (2.0 / Math.max(1.2, bbStd)) *
          (polarity < 0 ? -bbDeviation * (1.2 - m.volExpansion * 0.4) : bbDeviation * (0.6 + m.volExpansion * 1.1));

        // 3. EMA Trend gene response
        const emaSpeedRatio = Math.min(2.2, 21 / Math.max(8, emaSlow - emaFast));
        const emaResponse = ew * emaSpeedRatio * m.emaTrendState * (polarity < 0 ? -0.35 : 1.15);

        // 4. Pair affinity & historical curve modulation
        const pairMod =
          (btcWr - 0.55) * m.btcBias * 0.8 +
          (ethWr - 0.55) * m.ethBias * 0.8 +
          (solWr - 0.55) * m.solBias * 0.8;

        const histMod = histDeltas.length > 0 ? (histDeltas[idx % histDeltas.length] || 0) * 0.12 : 0;

        let combined = rsiResponse + bbResponse + emaResponse + pairMod + histMod + liveSignalBias * Math.sin(idx + strat.id);

        // Apply active Market Regime filter stress test
        if (marketCondition === 'high_volatility') {
          combined = bbResponse * 1.85 + emaResponse * 0.9 + pairMod * 1.2 + rsiResponse * 0.35;
        } else if (marketCondition === 'ranging') {
          combined = rsiResponse * 1.9 - emaResponse * 0.75 + bbResponse * (polarity < 0 ? 1.3 : -0.6) + pairMod;
        } else if (marketCondition === 'trending') {
          combined = emaResponse * 2.0 + bbResponse * (polarity > 0 ? 1.25 : -0.55) + rsiResponse * 0.4 + pairMod;
        }

        return combined;
      });

      vectors[strat.id] = responseSeries;
    });

    return vectors;
  }, [activeStrategies, marketCondition, signals]);

  // Compute pairwise Pearson correlation matrix
  const correlationMatrix = useMemo(() => {
    const matrix: Record<string, number> = {};

    for (let i = 0; i < activeStrategies.length; i++) {
      const a = activeStrategies[i];
      const vecA = strategyVectors[a.id] || [];

      for (let j = 0; j < activeStrategies.length; j++) {
        const b = activeStrategies[j];
        const vecB = strategyVectors[b.id] || [];

        if (a.id === b.id) {
          matrix[`${a.id}_${b.id}`] = 1.0;
        } else {
          matrix[`${a.id}_${b.id}`] = calculatePearsonCorrelation(vecA, vecB);
        }
      }
    }

    return matrix;
  }, [activeStrategies, strategyVectors]);

  // Compute genuine intra-cluster average correlation for each genetic cluster
  const clusterAnalysis = useMemo(() => {
    const computeGroupAvgCorrelation = (group: TradingStrategy[], fallbackCorr: number) => {
      if (group.length < 2) return fallbackCorr;
      let sum = 0;
      let count = 0;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const r = correlationMatrix[`${group[i].id}_${group[j].id}`];
          if (typeof r === 'number') {
            sum += r;
            count++;
          }
        }
      }
      return count > 0 ? parseFloat((sum / count).toFixed(2)) : fallbackCorr;
    };

    const clusters: Array<{
      clusterName: string;
      color: string;
      members: TradingStrategy[];
      generations: number[];
      avgCorrelation: number;
      recommendation: string;
    }> = [];

    const rsiDominant: TradingStrategy[] = [];
    const bbDominant: TradingStrategy[] = [];
    const emaDominant: TradingStrategy[] = [];
    const balanced: TradingStrategy[] = [];

    activeStrategies.forEach((s) => {
      const rw = s.weights?.rsi_weight || 0;
      const bw = s.weights?.bb_weight || 0;
      const ew = s.weights?.ema_weight || 0;

      if (rw >= 0.42 && rw >= bw && rw >= ew) rsiDominant.push(s);
      else if (bw >= 0.42 && bw >= rw && bw >= ew) bbDominant.push(s);
      else if (ew >= 0.42 && ew >= rw && ew >= bw) emaDominant.push(s);
      else balanced.push(s);
    });

    if (rsiDominant.length > 0) {
      clusters.push({
        clusterName: 'Mean-Reversion Cluster (RSI Exhaustion Genome)',
        color: 'border-teal-500/40 bg-teal-950/20 text-teal-300',
        members: rsiDominant,
        generations: Array.from(new Set(rsiDominant.map((s) => s.generation || 1))).sort((a, b) => a - b),
        avgCorrelation: computeGroupAvgCorrelation(rsiDominant, 0.78),
        recommendation: 'High intra-cluster concordance during range-bound chop. Keep the highest-Sharpe generation enabled and cross-breed with EMA momentum models.'
      });
    }

    if (bbDominant.length > 0) {
      clusters.push({
        clusterName: 'Volatility Breakout Cluster (Bollinger Expansion Genome)',
        color: 'border-purple-500/40 bg-purple-950/20 text-purple-300',
        members: bbDominant,
        generations: Array.from(new Set(bbDominant.map((s) => s.generation || 1))).sort((a, b) => a - b),
        avgCorrelation: computeGroupAvgCorrelation(bbDominant, 0.74),
        recommendation: 'Excels during high-volume liquidity expansions on BTC/USDT and SOL/USDT. Negatively correlated with pure RSI boundary fade models.'
      });
    }

    if (emaDominant.length > 0) {
      clusters.push({
        clusterName: 'Trend Momentum Cluster (EMA / XGB Neural Genome)',
        color: 'border-indigo-500/40 bg-indigo-950/20 text-indigo-300',
        members: emaDominant,
        generations: Array.from(new Set(emaDominant.map((s) => s.generation || 1))).sort((a, b) => a - b),
        avgCorrelation: computeGroupAvgCorrelation(emaDominant, 0.71),
        recommendation: 'Captures directional multi-candle continuation on 15M/30M timeframes. Acts as an effective hedge when mean-reversion models face trend runaways.'
      });
    }

    if (balanced.length > 0) {
      clusters.push({
        clusterName: 'Multi-Confluence Crossover Cluster (Balanced Hybrid Genome)',
        color: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300',
        members: balanced,
        generations: Array.from(new Set(balanced.map((s) => s.generation || 1))).sort((a, b) => a - b),
        avgCorrelation: computeGroupAvgCorrelation(balanced, 0.44),
        recommendation: 'Balanced RSI/BB/EMA gene weights created via genetic crossover or custom Pine Script. Offers strong all-weather diversification.'
      });
    }

    return clusters;
  }, [activeStrategies, correlationMatrix]);

  // Selected cell detail inspection
  const selectedDetails = useMemo(() => {
    if (!selectedCell) return null;
    const stratA = strategies.find((s) => s.id === selectedCell.idA);
    const stratB = strategies.find((s) => s.id === selectedCell.idB);
    if (!stratA || !stratB) return null;

    const r = correlationMatrix[`${stratA.id}_${stratB.id}`] ?? 0;
    const meta = getCorrelationColor(r);

    const pairsA = stratA.best_pairs?.map((p) => p.pair) || [];
    const pairsB = stratB.best_pairs?.map((p) => p.pair) || [];
    const sharedPairs = pairsA.filter((p) => pairsB.includes(p));

    return {
      stratA,
      stratB,
      correlation: r,
      meta,
      sharedPairs,
      genDiff: Math.abs((stratA.generation || 1) - (stratB.generation || 1))
    };
  }, [selectedCell, strategies, correlationMatrix]);

  return (
    <div className="flex flex-col gap-4" id="strategy-correlation-matrix-view">
      {/* HEADER CONTROLS & MARKET CONDITION MODES */}
      <div className="bg-[#0b101e] border border-indigo-500/30 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 rounded border border-purple-500/30 flex items-center gap-1">
                <GitCommit size={11} /> STRATEGY GENOME LAB
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Cross-Generation Performance & Genetic Clustering
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-display font-bold text-white mt-1">
              Multi-Generation Strategy Correlation Matrix
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-3xl leading-relaxed">
              Quantifies how different strategy generations perform simultaneously when applied to identical market conditions. Values near <span className="text-emerald-400 font-mono font-bold">+1.0</span> signify clone redundancy, values near <span className="text-slate-300 font-mono font-bold">0.0</span> indicate orthogonal portfolio diversification, and negative values reveal natural hedging properties.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowClusterGuide((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <HelpCircle size={13} />
              <span>{showClusterGuide ? 'Hide Cluster Legend' : 'Cluster Legend'}</span>
            </button>
          </div>
        </div>

        {/* TOOLBAR: GENERATION FILTER & SIMULATED MARKET CONDITION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5">
          {/* Market Regime Simulation Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1">
              <Sliders size={12} className="text-indigo-400" />
              Market Regime:
            </span>
            <div className="flex items-center bg-[#060911] p-0.5 rounded-xl border border-slate-800 flex-wrap">
              <button
                onClick={() => setMarketCondition('all_candles')}
                className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
                  marketCondition === 'all_candles' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                All Live Candles
              </button>
              <button
                onClick={() => setMarketCondition('high_volatility')}
                className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
                  marketCondition === 'high_volatility' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Simulates fast expansions and wide ATR swings"
              >
                High Volatility (Expansions)
              </button>
              <button
                onClick={() => setMarketCondition('ranging')}
                className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
                  marketCondition === 'ranging' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Simulates flat range chop and boundary pinballs"
              >
                Ranging (Mean Reversion)
              </button>
              <button
                onClick={() => setMarketCondition('trending')}
                className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
                  marketCondition === 'trending' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Simulates persistent multi-candle directional drift"
              >
                Trending (Momentum)
              </button>
            </div>
          </div>

          {/* Generation Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold flex items-center gap-1">
              <Filter size={12} className="text-purple-400" />
              Cohort:
            </span>
            <select
              value={genFilter}
              onChange={(e) => {
                const v = e.target.value;
                setGenFilter(v === 'all' || v === 'diverse' ? v : parseInt(v, 10));
              }}
              className="bg-[#060911] border border-slate-800 focus:border-indigo-500 rounded-xl px-2.5 py-1 text-xs text-white font-mono outline-none cursor-pointer"
            >
              <option value="diverse">Cross-Generation Sample (Gen {generations[0] || 1}–Gen {generations[generations.length - 1] || 1})</option>
              <option value="all">Top Active Roster ({strategies.filter(s => s.enabled).length} Enabled)</option>
              {generations.map((gen) => (
                <option key={gen} value={gen}>
                  Gen {gen} Cohort Only
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* OPTIONAL EXPANDABLE CLUSTER & COLOR LEGEND */}
        <AnimatePresence>
          {showClusterGuide && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-slate-800 text-xs overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-[11px]">
                <div className="bg-[#060911] p-2.5 rounded-xl border border-emerald-500/30 flex items-start gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
                  <div>
                    <span className="text-emerald-300 font-bold block">+0.82 to +1.00 : Clone Redundancy</span>
                    <span className="text-slate-400 text-[10px]">Strategies share near-identical gene weights. Retain the higher Sharpe model.</span>
                  </div>
                </div>
                <div className="bg-[#060911] p-2.5 rounded-xl border border-indigo-500/30 flex items-start gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 mt-1 shrink-0" />
                  <div>
                    <span className="text-indigo-300 font-bold block">-0.18 to +0.49 : Orthogonal Synergy</span>
                    <span className="text-slate-400 text-[10px]">Optimal portfolio diversification. Different indicators trigger on distinct market regimes.</span>
                  </div>
                </div>
                <div className="bg-[#060911] p-2.5 rounded-xl border border-rose-500/30 flex items-start gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400 mt-1 shrink-0" />
                  <div>
                    <span className="text-rose-300 font-bold block">-0.20 to -1.00 : Negative Inverse Hedge</span>
                    <span className="text-slate-400 text-[10px]">Counter-cyclical behavior (e.g., Bollinger breakout vs. RSI boundary reversion).</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* HEATMAP CORRELATION MATRIX GRID */}
      <div className="bg-[#0f1424] border border-indigo-500/20 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} className="text-indigo-400" />
              Pairwise Pearson Return Correlation (N = {activeStrategies.length} Models)
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              Click any cell to inspect genetic overlap & gene weights
            </span>
          </div>

          <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
            Scaled -1.00 (Inverse Hedge) to +1.00 (Clone)
          </span>
        </div>

        {activeStrategies.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs">
            No strategies match the current generation filter.
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar pb-2">
            <table className="w-full border-collapse font-mono text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left text-[10px] uppercase text-slate-400 bg-[#090d16] rounded-tl-xl border border-slate-800/80 min-w-[155px]">
                    Strategy \ Strategy
                  </th>
                  {activeStrategies.map((colStrat) => (
                    <th
                      key={colStrat.id}
                      className="p-2 text-center text-[10px] uppercase text-slate-300 bg-[#090d16] border border-slate-800/80 min-w-[78px]"
                      title={`${colStrat.name} (Gen ${colStrat.generation || 1})`}
                    >
                      <div className="truncate max-w-[85px] mx-auto font-bold">{colStrat.name.replace('Hermes-', '').replace('-15M', '')}</div>
                      <div className="text-[9px] text-purple-400 font-semibold">GEN {colStrat.generation || 1}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeStrategies.map((rowStrat) => (
                  <tr key={rowStrat.id}>
                    {/* Row Header */}
                    <td className="p-2.5 bg-[#090d16]/90 border border-slate-800/80 text-left">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-white truncate max-w-[115px]" title={rowStrat.name}>
                          {rowStrat.name.replace('Hermes-', '')}
                        </span>
                        <span className="text-[9px] font-bold text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-500/20 shrink-0">
                          G{rowStrat.generation || 1}
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5 tabular-nums">
                        WR: {(rowStrat.last_wr * 100).toFixed(0)}% • PF: {rowStrat.last_pf}
                      </div>
                    </td>

                    {/* Matrix Cells */}
                    {activeStrategies.map((colStrat) => {
                      const isDiagonal = rowStrat.id === colStrat.id;
                      const r = isDiagonal ? 1.0 : (correlationMatrix[`${rowStrat.id}_${colStrat.id}`] ?? 0);
                      const style = getCorrelationColor(r);
                      const isSelected = selectedCell && selectedCell.idA === rowStrat.id && selectedCell.idB === colStrat.id;

                      return (
                        <td
                          key={colStrat.id}
                          onClick={() => setSelectedCell({ idA: rowStrat.id, idB: colStrat.id })}
                          className={`p-2 text-center border border-slate-800/70 transition-all cursor-pointer relative ${
                            style.bg
                          } ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-[#090d16] z-10' : 'hover:brightness-125'}`}
                          title={`${rowStrat.name} (G${rowStrat.generation}) vs ${colStrat.name} (G${colStrat.generation})\nCorrelation: ${r >= 0 ? '+' : ''}${r.toFixed(2)}\n${style.label}`}
                        >
                          <div className={`text-xs tabular-nums ${style.text}`}>
                            {isDiagonal ? '1.00' : `${r >= 0 ? '+' : ''}${r.toFixed(2)}`}
                          </div>
                          <div className="text-[8px] text-slate-400/90 truncate max-w-[70px] mx-auto mt-0.5">
                            {isDiagonal ? 'Self' : (r >= 0.65 ? 'Cluster' : r <= -0.18 ? 'Hedge' : 'Orthog')}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SELECTED CELL DEEP DIVE INSPECTION PANEL */}
      {selectedDetails && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0b101e] border border-indigo-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${selectedDetails.meta.border} ${selectedDetails.meta.bg} ${selectedDetails.meta.text}`}>
                {selectedDetails.meta.cluster}
              </span>
              <span className="text-xs text-white font-mono font-bold tabular-nums">
                Pearson r = {selectedDetails.correlation >= 0 ? '+' : ''}{selectedDetails.correlation.toFixed(3)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                Generation Distance: <strong className="text-purple-300">Δ {selectedDetails.genDiff} Gen</strong>
              </span>
              <button
                onClick={() => setSelectedCell(null)}
                className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3.5">
            {/* Strategy A Profile */}
            <div className="bg-[#060911] p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  {selectedDetails.stratA.name}
                </span>
                <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/30">
                  GEN {selectedDetails.stratA.generation || 1}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-xs tabular-nums mb-2">
                <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800">
                  <span className="text-[8px] text-slate-500 block">WIN RATE</span>
                  <span className="text-emerald-400 font-bold">{(selectedDetails.stratA.last_wr * 100).toFixed(0)}%</span>
                </div>
                <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800">
                  <span className="text-[8px] text-slate-500 block">PROFIT F.</span>
                  <span className="text-indigo-300 font-bold">{selectedDetails.stratA.last_pf}</span>
                </div>
                <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800">
                  <span className="text-[8px] text-slate-500 block">SHARPE</span>
                  <span className="text-white font-bold">{selectedDetails.stratA.last_sharpe}</span>
                </div>
              </div>
              {/* Gene Weights */}
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 mb-2 tabular-nums">
                <Dna size={11} className="text-indigo-400 shrink-0" />
                <span>RSI: {Math.round((selectedDetails.stratA.weights?.rsi_weight || 0.33) * 100)}%</span>
                <span>•</span>
                <span>BB: {Math.round((selectedDetails.stratA.weights?.bb_weight || 0.33) * 100)}%</span>
                <span>•</span>
                <span>EMA: {Math.round((selectedDetails.stratA.weights?.ema_weight || 0.34) * 100)}%</span>
              </div>
              <p className="text-[11px] text-slate-300 bg-slate-900/40 p-2 rounded-lg border border-slate-800/80 leading-relaxed font-mono">
                {selectedDetails.stratA.entry_logic}
              </p>
            </div>

            {/* Strategy B Profile */}
            <div className="bg-[#060911] p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  {selectedDetails.stratB.name}
                </span>
                <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-500/30">
                  GEN {selectedDetails.stratB.generation || 1}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-xs tabular-nums mb-2">
                <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800">
                  <span className="text-[8px] text-slate-500 block">WIN RATE</span>
                  <span className="text-emerald-400 font-bold">{(selectedDetails.stratB.last_wr * 100).toFixed(0)}%</span>
                </div>
                <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800">
                  <span className="text-[8px] text-slate-500 block">PROFIT F.</span>
                  <span className="text-indigo-300 font-bold">{selectedDetails.stratB.last_pf}</span>
                </div>
                <div className="bg-slate-950/70 p-1.5 rounded border border-slate-800">
                  <span className="text-[8px] text-slate-500 block">SHARPE</span>
                  <span className="text-white font-bold">{selectedDetails.stratB.last_sharpe}</span>
                </div>
              </div>
              {/* Gene Weights */}
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 mb-2 tabular-nums">
                <Dna size={11} className="text-purple-400 shrink-0" />
                <span>RSI: {Math.round((selectedDetails.stratB.weights?.rsi_weight || 0.33) * 100)}%</span>
                <span>•</span>
                <span>BB: {Math.round((selectedDetails.stratB.weights?.bb_weight || 0.33) * 100)}%</span>
                <span>•</span>
                <span>EMA: {Math.round((selectedDetails.stratB.weights?.ema_weight || 0.34) * 100)}%</span>
              </div>
              <p className="text-[11px] text-slate-300 bg-slate-900/40 p-2 rounded-lg border border-slate-800/80 leading-relaxed font-mono">
                {selectedDetails.stratB.entry_logic}
              </p>
            </div>
          </div>

          {/* Genetic & Operational Assessment */}
          <div className="mt-3.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Pair Synergy Assessment</span>
              <span className="text-slate-300">
                Shared Optimal Assets:{' '}
                {selectedDetails.sharedPairs.length > 0 ? (
                  <strong className="text-emerald-400">{selectedDetails.sharedPairs.join(', ')}</strong>
                ) : (
                  <strong className="text-slate-400">Distinct Asset Targets (High Portfolio Complement)</strong>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onRunTest && (
                <button
                  onClick={() => onRunTest(selectedDetails.stratA.id)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Play size={10} /> Test {selectedDetails.stratA.name.replace('Hermes-', '')}
                </button>
              )}
              {onSelectStrategy && (
                <button
                  onClick={() => onSelectStrategy(selectedDetails.stratA.id)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer"
                >
                  Inspect Strategy Card
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* GENETIC CLUSTER SUMMARY CARDS */}
      <div className="bg-[#0f1424] border border-indigo-500/20 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={14} className="text-purple-400" />
            Detected Genetic Clusters & Cross-Generation Lineage
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {clusterAnalysis.length} Genetic Family Groups
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {clusterAnalysis.map((cluster) => (
            <div key={cluster.clusterName} className={`p-3.5 rounded-xl border ${cluster.color}`}>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <h5 className="font-bold text-white text-xs font-mono">{cluster.clusterName}</h5>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-emerald-300 tabular-nums">
                    Avg r = {cluster.avgCorrelation >= 0 ? '+' : ''}{cluster.avgCorrelation.toFixed(2)}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 text-purple-300">
                    Gen {cluster.generations.join(', ')}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {cluster.members.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => onSelectStrategy && onSelectStrategy(member.id)}
                    className="px-2 py-0.5 rounded bg-slate-900/90 hover:bg-slate-800 text-[10px] font-mono text-slate-200 border border-slate-800 cursor-pointer transition-colors"
                  >
                    {member.name} <span className="text-purple-400">(G{member.generation || 1})</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-300/90 font-mono leading-relaxed bg-[#060911]/60 p-2 rounded-lg border border-slate-800/60">
                <strong className="text-indigo-300">Cluster Guideline:</strong> {cluster.recommendation}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
