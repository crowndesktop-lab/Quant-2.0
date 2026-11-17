import React, { useState } from 'react';
import { LiveQuantChart } from './LiveQuantChart';
import { TradingSignal } from '../types';

interface LiveTradingViewChartProps {
  symbol: string;
  timeframe?: string; // e.g. "15 min", "30 min", "1 min", "1 hour"
  height?: number | string;
  activeSignal?: TradingSignal | null;
}

export const LiveTradingViewChart: React.FC<LiveTradingViewChartProps> = ({
  symbol,
  timeframe = "15 min",
  height = 420,
  activeSignal
}) => {
  const [hasError, setHasError] = useState<boolean>(false);

  // Map internal symbol to TradingView symbol name
  const getTradingViewSymbol = (s: string) => {
    const clean = s.toUpperCase().trim();
    if (clean.includes("ETH")) return "BINANCE:ETHUSDT";
    if (clean.includes("SOL")) return "BINANCE:SOLUSDT";
    return "BINANCE:BTCUSDT";
  };

  // Map timeframe to TradingView interval string
  const getInterval = (tf: string) => {
    if (tf.includes("1 min") || tf === "1") return "1";
    if (tf.includes("15 min") || tf === "15") return "15";
    if (tf.includes("30 min") || tf === "30") return "30";
    if (tf.includes("60 min") || tf.includes("1 hour") || tf === "60") return "60";
    return "15";
  };

  const tvSymbol = getTradingViewSymbol(symbol);
  const interval = getInterval(timeframe);

  const widgetConfig = JSON.stringify({
    autosize: true,
    symbol: tvSymbol,
    interval: interval,
    timezone: "Etc/UTC",
    theme: "dark",
    style: "1", // 1 = Candlesticks
    locale: "en",
    enable_publishing: false,
    allow_symbol_change: true,
    backgroundColor: "rgba(5, 7, 15, 1)",
    gridColor: "rgba(30, 41, 59, 0.3)",
    hide_side_toolbar: false,
    hide_top_toolbar: false,
    withdateranges: true,
    calendar: false,
    studies: [
      "STD;Bollinger_Bands",
      "STD;RSI"
    ],
    support_host: "https://www.tradingview.com"
  });

  const srcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          html, body { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #05070f; overflow: hidden; }
          .tradingview-widget-container { width: 100%; height: 100%; }
        </style>
      </head>
      <body>
        <div class="tradingview-widget-container">
          <div class="tradingview-widget-container__widget" style="height:100%;width:100%;"></div>
          <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>
          ${widgetConfig}
          </script>
        </div>
      </body>
    </html>
  `;

  if (hasError) {
    return <LiveQuantChart symbol={symbol} timeframe={timeframe} height={typeof height === 'number' ? height : 420} />;
  }

  return (
    <div className="w-full bg-[#05070f] rounded-xl border border-indigo-500/20 overflow-hidden shadow-2xl flex flex-col relative">
      <div className="bg-[#0a0e1a] px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            TradingView Live Market Feed • {symbol} ({timeframe})
          </span>
        </div>
        <div className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
          Real-time Streaming Quotes
        </div>
      </div>
            <iframe
        title={`TradingView Chart ${symbol}`}
        srcDoc={srcDoc}
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
        className="w-full border-0 relative bg-[#05070f] z-0"
        onError={() => setHasError(true)}
      />
      {activeSignal && (
        <div className="absolute top-14 right-4 z-10 pointer-events-none">
          <div className={`flex flex-col gap-1.5 p-3 rounded-lg border shadow-2xl backdrop-blur-md ${
            activeSignal.direction === 'BUY' 
              ? 'bg-emerald-950/80 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
              : 'bg-red-950/80 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                activeSignal.direction === 'BUY' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
              }`}>
                ENGINE {activeSignal.direction}
              </span>
              <span className="text-white font-mono font-bold text-sm">{activeSignal.asset}</span>
            </div>
            {activeSignal.price && (
              <div className="text-xs font-mono text-slate-300">
                Entry: <span className="text-white font-bold">{activeSignal.price}</span>
              </div>
            )}
            <div className="flex gap-3">
              {activeSignal.take_profit && (
                <div className="text-[10px] font-mono text-emerald-400 font-bold">
                  TP: {activeSignal.take_profit}
                </div>
              )}
              {activeSignal.stop_loss && (
                <div className="text-[10px] font-mono text-red-400 font-bold">
                  SL: {activeSignal.stop_loss}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

