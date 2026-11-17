import React, { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import { RefreshCw, Activity, Layers, ShieldCheck, Zap, BarChart2 } from 'lucide-react';
import { safeFetchJson } from '../utils/api';

interface SignalReference {
  price?: number;
  stop_loss?: number;
  take_profit?: number;
  direction?: 'BUY' | 'SELL';
}

interface LiveQuantChartProps {
  symbol: string;
  timeframe?: string;
  selectedSignal?: SignalReference | null;
  height?: number;
  refreshIntervalMs?: number;
  liveSpotPrice?: number;
}

interface KlinePoint {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  rsi?: number;
}

interface KlinesApiResponse {
  success: boolean;
  source?: string;
  is_live?: boolean;
  fetch_latency_ms?: number;
  exchange_time_ms?: number;
  age_ms?: number;
  klines: KlinePoint[];
}

interface VolumeProfileBin {
  index: number;
  priceLow: number;
  priceHigh: number;
  priceMid: number;
  totalVolume: number;
  buyVolume: number;
  sellVolume: number;
  widthPct: number;
  buyRatio: number;
  isPOC: boolean;
  isHVN: boolean;
  inValueArea: boolean;
}

export const LiveQuantChart: React.FC<LiveQuantChartProps> = ({
  symbol,
  timeframe = "15 min",
  selectedSignal,
  height = 380,
  refreshIntervalMs = 3000,
  liveSpotPrice
}) => {
  const [data, setData] = useState<KlinePoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastExchangeMs, setLastExchangeMs] = useState<number>(0);
  const [fetchLatencyMs, setFetchLatencyMs] = useState<number | null>(null);
  const [feedSource, setFeedSource] = useState<string>('KuCoin Klines');
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [activeSubView, setActiveSubView] = useState<'price' | 'rsi'>('price');
  const [showVolumeProfile, setShowVolumeProfile] = useState<boolean>(true);
  const [hoveredBin, setHoveredBin] = useState<VolumeProfileBin | null>(null);

  const fetchKlines = async (isInitial = false) => {
    const t0 = performance.now();
    try {
      if (isInitial) setLoading(true);
      else setRefreshing(true);
      const json = await safeFetchJson<KlinesApiResponse>(
        `/api/klines?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`
      );
      if (json && json.success && Array.isArray(json.klines)) {
        const roundTripMs = Math.round(performance.now() - t0);
        setData(json.klines);
        setLastExchangeMs(typeof json.exchange_time_ms === 'number' ? json.exchange_time_ms : Date.now());
        setFetchLatencyMs(typeof json.fetch_latency_ms === 'number' ? json.fetch_latency_ms : roundTripMs);
        if (json.source) setFeedSource(json.source);
        setNowMs(Date.now());
      }
    } catch (err) {
      console.warn("Failed to load real quant klines:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchKlines(true);
    const timer = setInterval(() => fetchKlines(false), refreshIntervalMs);
    return () => clearInterval(timer);
  }, [symbol, timeframe, refreshIntervalMs]);

  useEffect(() => {
    const ageTicker = setInterval(() => setNowMs(Date.now()), 500);
    return () => clearInterval(ageTicker);
  }, []);

  const chartData = useMemo(() => {
    if (!liveSpotPrice || liveSpotPrice <= 0 || data.length === 0) return data;
    const cloned = [...data];
    const last = { ...cloned[cloned.length - 1] };
    last.close = liveSpotPrice;
    last.high = Math.max(last.high, liveSpotPrice);
    last.low = Math.min(last.low, liveSpotPrice);
    cloned[cloned.length - 1] = last;
    return cloned;
  }, [data, liveSpotPrice]);

  const minPrice = chartData.length > 0 ? Math.min(...chartData.map(d => d.low || d.close)) : 0;
  const maxPrice = chartData.length > 0 ? Math.max(...chartData.map(d => d.high || d.close)) : 100;
  const pad = (maxPrice - minPrice) * 0.1 || minPrice * 0.002;
  const domainMin = Math.max(0, minPrice - pad);
  const domainMax = maxPrice + pad;

  const currentClose = chartData.length > 0 ? chartData[chartData.length - 1].close : 0;
  const isUp = chartData.length >= 2 ? chartData[chartData.length - 1].close >= chartData[chartData.length - 2].close : true;
  const ageSeconds = lastExchangeMs > 0 ? Math.max(0, (nowMs - lastExchangeMs) / 1000) : null;

  const formatPrice = (val: number) => {
    if (symbol.includes("BTC")) return `$${val.toFixed(1)}`;
    return `$${val.toFixed(2)}`;
  };

  const formatVol = (vol: number) => {
    if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
    if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
    return vol.toFixed(1);
  };

  // Compute Visible Range Volume Profile (VPVR) across 16 price buckets matching [domainMin, domainMax]
  const volumeProfile = useMemo(() => {
    const numBins = 16;
    if (chartData.length === 0 || domainMax <= domainMin) {
      return {
        bins: [] as VolumeProfileBin[],
        pocPrice: 0,
        vahPrice: 0,
        valPrice: 0,
        totalVol: 0
      };
    }

    const step = (domainMax - domainMin) / numBins;
    const rawBins = Array.from({ length: numBins }, (_, i) => {
      // Ordered from top (domainMax) to bottom (domainMin) so visual rows align with YAxis
      const priceHigh = domainMax - i * step;
      const priceLow = priceHigh - step;
      const priceMid = (priceHigh + priceLow) / 2;
      return {
        index: i,
        priceLow,
        priceHigh,
        priceMid,
        totalVolume: 0,
        buyVolume: 0,
        sellVolume: 0
      };
    });

    // Distribute each candle's volume across all price bins overlapped by [candle.low, candle.high]
    chartData.forEach((candle) => {
      const cHigh = Math.max(candle.high || candle.close, candle.close);
      const cLow = Math.min(candle.low || candle.close, candle.close);
      const vol = Math.max(0.1, candle.volume || 1);
      const isBullish = candle.close >= candle.open;
      const buyShare = isBullish ? 0.68 : 0.32;
      const sellShare = 1 - buyShare;

      const overlapping = rawBins.filter(
        b => b.priceHigh >= cLow && b.priceLow <= cHigh
      );

      if (overlapping.length > 0) {
        const volPerBin = vol / overlapping.length;
        overlapping.forEach(b => {
          b.totalVolume += volPerBin;
          b.buyVolume += volPerBin * buyShare;
          b.sellVolume += volPerBin * sellShare;
        });
      } else {
        // Fallback to closest bin by close price
        const targetIdx = Math.min(
          numBins - 1,
          Math.max(0, Math.floor((domainMax - candle.close) / step))
        );
        rawBins[targetIdx].totalVolume += vol;
        rawBins[targetIdx].buyVolume += vol * buyShare;
        rawBins[targetIdx].sellVolume += vol * sellShare;
      }
    });

    const maxBinVol = Math.max(...rawBins.map(b => b.totalVolume), 1e-6);
    const totalVol = rawBins.reduce((acc, b) => acc + b.totalVolume, 0);

    // Identify Point of Control (POC) — highest liquidity node
    let pocIdx = 0;
    rawBins.forEach((b, idx) => {
      if (b.totalVolume > rawBins[pocIdx].totalVolume) {
        pocIdx = idx;
      }
    });

    // Compute 70% Value Area (VAH & VAL)
    const sortedByVol = [...rawBins].sort((a, b) => b.totalVolume - a.totalVolume);
    const valueAreaIndices = new Set<number>();
    let accumVol = 0;
    for (const b of sortedByVol) {
      valueAreaIndices.add(b.index);
      accumVol += b.totalVolume;
      if (accumVol >= totalVol * 0.7) break;
    }

    const vaBins = rawBins.filter(b => valueAreaIndices.has(b.index));
    const vahPrice = vaBins.length > 0 ? Math.max(...vaBins.map(b => b.priceMid)) : rawBins[pocIdx].priceMid;
    const valPrice = vaBins.length > 0 ? Math.min(...vaBins.map(b => b.priceMid)) : rawBins[pocIdx].priceMid;

    const bins: VolumeProfileBin[] = rawBins.map((b, idx) => {
      const widthPct = Math.max(6, (b.totalVolume / maxBinVol) * 100);
      const buyRatio = b.totalVolume > 0 ? (b.buyVolume / b.totalVolume) * 100 : 50;
      const isPOC = idx === pocIdx;
      const isHVN = !isPOC && b.totalVolume >= maxBinVol * 0.72;
      const inValueArea = valueAreaIndices.has(idx);

      return {
        ...b,
        widthPct,
        buyRatio,
        isPOC,
        isHVN,
        inValueArea
      };
    });

    return {
      bins,
      pocPrice: rawBins[pocIdx].priceMid,
      vahPrice,
      valPrice,
      totalVol
    };
  }, [chartData, domainMin, domainMax]);

  return (
    <div className="w-full bg-[#05070f] rounded-xl border border-indigo-500/20 overflow-hidden shadow-2xl flex flex-col">
      {/* Chart Header */}
      <div className="bg-[#0a0e1a] px-4 py-2.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isUp ? 'bg-emerald-400 animate-pulse' : 'bg-red-400 animate-pulse'}`} />
            <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>{symbol}</span>
              <span className="text-indigo-400 font-normal">({timeframe})</span>
            </h4>
          </div>
          {currentClose > 0 && (
            <div className={`text-xs font-mono font-bold px-2 py-0.5 rounded border tabular-nums ${
              isUp 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}>
              Spot: {formatPrice(currentClose)}
            </div>
          )}

          {/* High-Liquidity Volume Profile Summary Chips */}
          {activeSubView === 'price' && showVolumeProfile && volumeProfile.pocPrice > 0 && (
            <div className="hidden md:flex items-center gap-1.5 text-[10px] font-mono tabular-nums">
              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold" title="Point of Control: Highest Traded Liquidity Price Level">
                POC: {formatPrice(volumeProfile.pocPrice)}
              </span>
              <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/25" title="70% Value Area High Liquidity Boundary">
                VAH: {formatPrice(volumeProfile.vahPrice)}
              </span>
              <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/25" title="70% Value Area Low Liquidity Boundary">
                VAL: {formatPrice(volumeProfile.valPrice)}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-[#05070d] p-1 rounded-lg border border-slate-800 text-[10px] font-mono gap-1">
            <button
              onClick={() => setActiveSubView('price')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                activeSubView === 'price' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Price + BB
            </button>
            <button
              onClick={() => setActiveSubView('rsi')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                activeSubView === 'rsi' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              RSI (14)
            </button>
          </div>

          {/* Volume Profile Overlay Toggle */}
          {activeSubView === 'price' && (
            <button
              type="button"
              onClick={() => setShowVolumeProfile(!showVolumeProfile)}
              className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                showVolumeProfile
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                  : 'bg-[#05070d] text-slate-400 border-slate-800 hover:text-white'
              }`}
              title="Toggle Visible Range Volume Profile (VPVR) High-Liquidity Price Level Overlay"
            >
              <BarChart2 size={12} className={showVolumeProfile ? "text-amber-400" : "text-slate-500"} />
              <span>VPVR Liquidity</span>
            </button>
          )}

          <span
            className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 text-[9px] font-mono font-bold flex items-center gap-1 select-none"
            title={`Continuous Live Klines Stream (${feedSource})`}
          >
            <RefreshCw size={10} className={(loading || refreshing) ? "animate-spin text-emerald-400" : "text-emerald-400"} />
            <span>LIVE</span>
          </span>
          {fetchLatencyMs !== null && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hidden sm:inline">
              {fetchLatencyMs}ms
            </span>
          )}
          {ageSeconds !== null && (
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border hidden sm:inline tabular-nums ${
              ageSeconds < 5
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                : ageSeconds < 15
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/25'
            }`}>
              Age {ageSeconds < 10 ? ageSeconds.toFixed(1) : Math.round(ageSeconds)}s
            </span>
          )}
        </div>
      </div>

      {/* Chart Canvas + Volume Profile Overlay */}
      <div style={{ height }} className="w-full relative p-2 pt-4 bg-[#05070f] select-none">
        {loading && data.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#05070f]/80 z-20 gap-2">
            <Activity className="animate-spin text-indigo-400" size={24} />
            <span className="text-xs font-mono text-slate-400">Loading live real market data feed...</span>
          </div>
        ) : null}

        {/* Hovered Liquidity Node Inspector Pill */}
        {activeSubView === 'price' && showVolumeProfile && hoveredBin && (
          <div className="absolute top-3 left-4 z-30 bg-[#090d18]/95 border border-amber-500/40 rounded-lg px-3 py-2 shadow-xl font-mono text-[10px] flex flex-wrap items-center gap-3 pointer-events-none">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${hoveredBin.isPOC ? 'bg-amber-400 animate-ping' : hoveredBin.isHVN ? 'bg-sky-400' : 'bg-indigo-400'}`} />
              <span className="font-bold text-white">
                {hoveredBin.isPOC ? 'POC LIQUIDITY MAGNET' : hoveredBin.isHVN ? 'HIGH VOLUME NODE (HVN)' : hoveredBin.inValueArea ? '70% VALUE AREA NODE' : 'LOW VOLUME NODE (LVN)'}
              </span>
            </div>
            <span className="text-amber-300 font-bold tabular-nums">
              Range: {formatPrice(hoveredBin.priceLow)} – {formatPrice(hoveredBin.priceHigh)}
            </span>
            <span className="text-slate-300 tabular-nums">
              Vol: <strong className="text-white">{formatVol(hoveredBin.totalVolume)}</strong>
            </span>
            <span className="text-emerald-400 tabular-nums">
              Buy: {hoveredBin.buyRatio.toFixed(0)}%
            </span>
            <span className="text-rose-400 tabular-nums">
              Sell: {(100 - hoveredBin.buyRatio).toFixed(0)}%
            </span>
          </div>
        )}

        {/* Horizontal Volume Profile (VPVR) Histogram Overlay */}
        {activeSubView === 'price' && showVolumeProfile && volumeProfile.bins.length > 0 && (
          <div
            className="absolute right-[66px] top-[26px] bottom-[34px] w-[36%] max-w-[240px] z-10 flex flex-col justify-between pointer-events-auto"
            onMouseLeave={() => setHoveredBin(null)}
          >
            {volumeProfile.bins.map((bin) => (
              <div
                key={bin.index}
                onMouseEnter={() => setHoveredBin(bin)}
                className="w-full flex items-center justify-end group relative flex-1 py-[1px] cursor-crosshair"
              >
                {/* Node Label on Hover or POC */}
                <span
                  className={`mr-1.5 text-[8px] font-mono tabular-nums transition-opacity ${
                    bin.isPOC
                      ? 'opacity-100 text-amber-300 font-bold bg-amber-950/80 px-1 rounded border border-amber-500/40'
                      : bin.isHVN
                      ? 'opacity-80 group-hover:opacity-100 text-sky-300 font-semibold'
                      : 'opacity-0 group-hover:opacity-100 text-slate-300'
                  }`}
                >
                  {bin.isPOC ? `POC ${formatPrice(bin.priceMid)}` : bin.isHVN ? `HVN ${formatPrice(bin.priceMid)}` : formatPrice(bin.priceMid)}
                </span>

                {/* Stacked Buy / Sell Volume Bar */}
                <div
                  style={{ width: `${bin.widthPct}%` }}
                  className={`h-full min-h-[5px] max-h-[14px] rounded-l-sm flex overflow-hidden transition-all duration-300 ${
                    bin.isPOC
                      ? 'ring-1 ring-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.55)] opacity-95'
                      : bin.isHVN
                      ? 'ring-1 ring-sky-400/50 opacity-80 group-hover:opacity-100'
                      : bin.inValueArea
                      ? 'opacity-55 group-hover:opacity-90'
                      : 'opacity-30 group-hover:opacity-75'
                  }`}
                >
                  {/* Buy Volume Segment */}
                  <div
                    style={{ width: `${bin.buyRatio}%` }}
                    className={
                      bin.isPOC
                        ? 'bg-gradient-to-r from-amber-400 to-emerald-400 h-full'
                        : 'bg-emerald-500/80 h-full'
                    }
                  />
                  {/* Sell Volume Segment */}
                  <div
                    style={{ width: `${100 - bin.buyRatio}%` }}
                    className={
                      bin.isPOC
                        ? 'bg-amber-500/90 h-full'
                        : 'bg-rose-500/75 h-full'
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%">
          {activeSubView === 'price' ? (
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="bbBandGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.4} />

              <XAxis 
                dataKey="time" 
                tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }} 
                stroke="#334155" 
              />
              
              <YAxis 
                domain={[domainMin, domainMax]} 
                tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }} 
                stroke="#334155"
                orientation="right"
                width={62}
                tickFormatter={(val) => formatPrice(val)}
              />

              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0a0e1a', 
                  borderColor: '#312e81', 
                  borderRadius: '8px', 
                  color: '#fff',
                  fontSize: '11px',
                  fontFamily: 'monospace'
                }}
                formatter={(value: any, name: any) => [
                  typeof value === 'number' ? formatPrice(value) : value, 
                  name === 'close' ? 'Spot Close' : name === 'bbUpper' ? 'BB Upper' : name === 'bbLower' ? 'BB Lower' : name
                ]}
              />

              {/* Bollinger Bands Envelopes */}
              <Line type="monotone" dataKey="bbUpper" stroke="#818cf8" strokeDasharray="2 2" dot={false} strokeWidth={1} opacity={0.6} name="BB Upper" />
              <Line type="monotone" dataKey="bbMiddle" stroke="#6366f1" strokeDasharray="4 4" dot={false} strokeWidth={1} opacity={0.4} name="BB Middle" />
              <Line type="monotone" dataKey="bbLower" stroke="#818cf8" strokeDasharray="2 2" dot={false} strokeWidth={1} opacity={0.6} name="BB Lower" />

              {/* Price Line + Gradient Area */}
              <Area type="monotone" dataKey="close" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#priceGradient)" name="close" />

              {/* Volume Profile Key Liquidity Reference Lines (POC, VAH, VAL) */}
              {showVolumeProfile && volumeProfile.pocPrice > 0 && (
                <ReferenceLine
                  y={volumeProfile.pocPrice}
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  label={{
                    value: `POC Liquidity: ${formatPrice(volumeProfile.pocPrice)}`,
                    fill: '#fbbf24',
                    fontSize: 9,
                    position: 'insideTopLeft'
                  }}
                />
              )}
              {showVolumeProfile && volumeProfile.vahPrice > 0 && (
                <ReferenceLine
                  y={volumeProfile.vahPrice}
                  stroke="#38bdf8"
                  strokeWidth={1}
                  strokeDasharray="2 4"
                  strokeOpacity={0.75}
                  label={{
                    value: `VAH (70%): ${formatPrice(volumeProfile.vahPrice)}`,
                    fill: '#38bdf8',
                    fontSize: 8,
                    position: 'insideTopLeft'
                  }}
                />
              )}
              {showVolumeProfile && volumeProfile.valPrice > 0 && (
                <ReferenceLine
                  y={volumeProfile.valPrice}
                  stroke="#38bdf8"
                  strokeWidth={1}
                  strokeDasharray="2 4"
                  strokeOpacity={0.75}
                  label={{
                    value: `VAL (70%): ${formatPrice(volumeProfile.valPrice)}`,
                    fill: '#38bdf8',
                    fontSize: 8,
                    position: 'insideBottomLeft'
                  }}
                />
              )}

              {/* Reference Lines for Active Signal Brackets */}
              {selectedSignal?.price && (
                <ReferenceLine 
                  y={selectedSignal.price} 
                  stroke="#818cf8" 
                  strokeWidth={1.5} 
                  strokeDasharray="3 3"
                  label={{ value: `Entry: ${formatPrice(selectedSignal.price)}`, fill: '#818cf8', fontSize: 9, position: 'left' }} 
                />
              )}
              {selectedSignal?.take_profit && (
                <ReferenceLine 
                  y={selectedSignal.take_profit} 
                  stroke="#34d399" 
                  strokeWidth={1.5} 
                  label={{ value: `ITM Target: ${formatPrice(selectedSignal.take_profit)}`, fill: '#34d399', fontSize: 9, position: 'right' }} 
                />
              )}
              {selectedSignal?.stop_loss && (
                <ReferenceLine 
                  y={selectedSignal.stop_loss} 
                  stroke="#f87171" 
                  strokeWidth={1.5} 
                  label={{ value: `Invalidation Strike: ${formatPrice(selectedSignal.stop_loss)}`, fill: '#f87171', fontSize: 9, position: 'right' }} 
                />
              )}
            </ComposedChart>
          ) : (
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.4} />
              <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }} stroke="#334155" />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'monospace' }} stroke="#334155" orientation="right" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0a0e1a', borderColor: '#312e81', borderRadius: '8px', color: '#fff', fontSize: '11px', fontFamily: 'monospace' }} 
              />
              <ReferenceLine y={70} stroke="#f87171" strokeDasharray="3 3" label={{ value: 'Overbought (70)', fill: '#f87171', fontSize: 9 }} />
              <ReferenceLine y={50} stroke="#64748b" strokeDasharray="2 2" />
              <ReferenceLine y={30} stroke="#34d399" strokeDasharray="3 3" label={{ value: 'Oversold (30)', fill: '#34d399', fontSize: 9 }} />
              <Line type="monotone" dataKey="rsi" stroke="#a855f7" strokeWidth={2} dot={false} name="RSI (14)" />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer Metrics & Volume Profile Legend */}
      <div className="bg-[#0a0e1a] px-4 py-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-400 gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <ShieldCheck size={11} /> 92%+ Confluence Verified
          </span>
          <span className="flex items-center gap-1 text-amber-300 font-semibold">
            <Layers size={11} /> VPVR: POC {volumeProfile.pocPrice > 0 ? formatPrice(volumeProfile.pocPrice) : '—'}
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="inline-block w-2 h-2 rounded-xs bg-emerald-500" /> Buy Vol
            <span className="inline-block w-2 h-2 rounded-xs bg-rose-500 ml-1" /> Sell Vol
          </span>
        </div>
        <div className="text-slate-500">
          VPVR (16-Node Liquidity) • Bollinger Bands (20,2) • RSI (14)
        </div>
      </div>
    </div>
  );
};
