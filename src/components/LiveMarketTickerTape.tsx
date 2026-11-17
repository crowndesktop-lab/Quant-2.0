import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Globe, Zap, Clock } from 'lucide-react';
import { safeFetchJson } from '../utils/api';

export interface TickerPrice {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  change24h: number;
  high: number;
  low: number;
  vol24h?: number;
  type: 'forex' | 'crypto';
  source?: string;
  exchange_time_ms?: number;
  age_ms?: number;
}

interface MarketPricesApiResponse {
  success: boolean;
  timestamp: string;
  exchange_time_ms?: number;
  age_ms?: number;
  fetch_latency_ms?: number;
  source?: string;
  is_live?: boolean;
  prices: TickerPrice[];
}

interface LiveMarketTickerTapeProps {
  onSelectSymbol?: (symbol: string) => void;
  selectedSymbol?: string;
  refreshIntervalMs?: number;
  onFeedUpdate?: (payload: {
    prices: TickerPrice[];
    fetchLatencyMs: number;
    exchangeTimeMs: number;
    source: string;
    isLive: boolean;
  }) => void;
}

export const LiveMarketTickerTape: React.FC<LiveMarketTickerTapeProps> = ({
  onSelectSymbol,
  selectedSymbol,
  refreshIntervalMs = 1500,
  onFeedUpdate
}) => {
  const [prices, setPrices] = useState<TickerPrice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastExchangeMs, setLastExchangeMs] = useState<number>(0);
  const [fetchLatencyMs, setFetchLatencyMs] = useState<number | null>(null);
  const [feedSource, setFeedSource] = useState<string>('KuCoin Spot');
  const [isLive, setIsLive] = useState<boolean>(true);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const fetchPrices = async (force = false) => {
    const t0 = performance.now();
    try {
      const url = force ? '/api/market-prices?force=1' : '/api/market-prices';
      const data = await safeFetchJson<MarketPricesApiResponse>(url);
      if (data && data.success && Array.isArray(data.prices)) {
        const roundTripMs = Math.round(performance.now() - t0);
        const reportedLatency = typeof data.fetch_latency_ms === 'number' ? data.fetch_latency_ms : roundTripMs;
        const exTime = typeof data.exchange_time_ms === 'number' ? data.exchange_time_ms : Date.now();
        const src = data.source || 'KuCoin Spot';
        const liveFlag = data.is_live !== false;

        setPrices(data.prices);
        setLastExchangeMs(exTime);
        setFetchLatencyMs(reportedLatency);
        setFeedSource(src);
        setIsLive(liveFlag);
        setNowMs(Date.now());

        if (onFeedUpdate) {
          onFeedUpdate({
            prices: data.prices,
            fetchLatencyMs: reportedLatency,
            exchangeTimeMs: exTime,
            source: src,
            isLive: liveFlag
          });
        }
      }
    } catch (err) {
      console.warn("Failed to load ticker tape prices:", err);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(() => fetchPrices(false), refreshIntervalMs);
    return () => clearInterval(interval);
  }, [refreshIntervalMs]);

  useEffect(() => {
    const ticker = setInterval(() => setNowMs(Date.now()), 500);
    return () => clearInterval(ticker);
  }, []);

  const ageSeconds = lastExchangeMs > 0 ? Math.max(0, (nowMs - lastExchangeMs) / 1000) : null;
  const ageColorClass =
    ageSeconds === null
      ? 'text-slate-400 border-slate-700/60 bg-slate-900/60'
      : ageSeconds < 4
      ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
      : ageSeconds < 12
      ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
      : 'text-rose-300 border-rose-500/30 bg-rose-500/10';

  const formatPrice = (p: TickerPrice) => {
    if (p.symbol.includes("BTC")) return `$${p.price.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
    return `$${p.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatVol = (vol?: number) => {
    if (!vol || vol <= 0) return '24h Live';
    if (vol >= 1_000_000_000) return `Vol $${(vol / 1_000_000_000).toFixed(2)}B`;
    if (vol >= 1_000_000) return `Vol $${(vol / 1_000_000).toFixed(1)}M`;
    if (vol >= 1_000) return `Vol $${(vol / 1_000).toFixed(0)}K`;
    return `Vol $${vol.toFixed(0)}`;
  };

  return (
    <div className="w-full bg-[#05070f] border border-indigo-500/20 rounded-xl p-2.5 shadow-lg flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Globe className="text-indigo-400 animate-spin-slow" size={14} />
          <span className="text-xs font-mono font-bold text-white tracking-wider uppercase flex items-center gap-1.5">
            Live Crypto Spot Feed ({feedSource})
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 flex-wrap">
          {fetchLatencyMs !== null && (
            <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 flex items-center gap-1" title="Upstream Exchange API Roundtrip Latency">
              <Zap size={9} className="text-indigo-400" />
              {fetchLatencyMs}ms
            </span>
          )}
          {ageSeconds !== null && (
            <span className={`px-1.5 py-0.5 rounded border flex items-center gap-1 tabular-nums ${ageColorClass}`} title="Live Quote Age vs Exchange Tick Timestamp">
              <Clock size={9} />
              Age {ageSeconds < 10 ? ageSeconds.toFixed(1) : Math.round(ageSeconds)}s
            </span>
          )}
          <span
            className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 flex items-center gap-1 select-none"
            title="Continuous 1.5s Live Exchange Spot Stream"
          >
            <RefreshCw size={9} className={loading ? "animate-spin text-emerald-400" : "text-emerald-400"} />
            <span>LIVE</span>
          </span>
        </div>
      </div>

      {/* Spot Quotes Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-1 pt-0.5">
        {prices.map((p) => {
          const isSelected = selectedSymbol === p.symbol;
          const isPositive = p.change24h >= 0;

          return (
            <button
              key={p.symbol}
              onClick={() => onSelectSymbol && onSelectSymbol(p.symbol)}
              className={`flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-lg border text-xs font-mono transition-all cursor-pointer shadow-sm ${
                isSelected
                  ? 'bg-gradient-to-r from-indigo-900/80 to-purple-900/80 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                  : 'bg-[#0a0e1a]/90 hover:bg-[#10172a] border-slate-800/80 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col text-left">
                <span className="font-bold text-[11px] text-white flex items-center gap-1.5">
                  {p.symbol}
                  <span className="text-[8px] px-1 py-0.2 rounded font-bold bg-amber-500/20 text-amber-300">
                    {p.source ? p.source.split(' ')[0].toUpperCase() : 'SPOT'}
                  </span>
                </span>
                <span className="text-white font-bold tabular-nums">{formatPrice(p)}</span>
              </div>

              <div className="flex flex-col items-end text-right">
                <div className={`flex items-center text-[10px] font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPositive ? <TrendingUp size={10} className="mr-0.5" /> : <TrendingDown size={10} className="mr-0.5" />}
                  {isPositive ? '+' : ''}{p.change24h}%
                </div>
                <span className="text-[9px] text-slate-500 tabular-nums">{formatVol(p.vol24h)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

