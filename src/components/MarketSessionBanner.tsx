import React, { useState } from 'react';
import { 
  Globe, 
  Clock, 
  Cpu, 
  Zap, 
  Shield, 
  ChevronDown, 
  Check, 
  RotateCcw, 
  Sparkles,
  Sliders,
  TrendingUp
} from 'lucide-react';
import { MarketSessionInfo, MarketSessionType } from '../types';

interface MarketSessionBannerProps {
  sessionInfo?: MarketSessionInfo;
  onOverrideSession: (sessionType: string) => Promise<void>;
  loading?: boolean;
}

export const MarketSessionBanner: React.FC<MarketSessionBannerProps> = ({
  sessionInfo,
  onOverrideSession,
  loading = false
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [overrideLoading, setOverrideLoading] = useState(false);

  const sessionsList: { type: MarketSessionType | 'AUTO'; label: string; icon: string; timeWindow: string; color: string }[] = [
    { type: 'AUTO', label: 'Auto-Detect (Live UTC)', icon: '🌐', timeWindow: 'Live Automated UTC Clock', color: 'from-indigo-500 to-cyan-500' },
    { type: 'Asian (Tokyo)', label: 'Asian (Tokyo)', icon: '🌅', timeWindow: '22:00 – 07:00 UTC', color: 'from-amber-500 to-orange-500' },
    { type: 'London Open', label: 'London Open', icon: '🇬🇧', timeWindow: '07:00 – 09:00 UTC', color: 'from-sky-500 to-blue-600' },
    { type: 'London Main Session', label: 'London Main Session', icon: '🏛️', timeWindow: '09:00 – 12:00 UTC', color: 'from-indigo-500 to-purple-600' },
    { type: 'New York Open', label: 'New York Open', icon: '🗽', timeWindow: '12:00 – 13:00 UTC', color: 'from-emerald-500 to-teal-600' },
    { type: 'London–New York Overlap', label: 'London–New York Overlap', icon: '⚡', timeWindow: '13:00 – 16:00 UTC', color: 'from-cyan-500 to-indigo-600' },
    { type: 'New York Close', label: 'New York Close', icon: 'nb', timeWindow: '16:00 – 21:00 UTC', color: 'from-rose-500 to-pink-600' },
    { type: 'Low Liquidity / Holiday Session', label: 'Low Liquidity / Holiday Session', icon: '🌙', timeWindow: 'Weekend / Off-Hours', color: 'from-slate-500 to-zinc-600' }
  ];

  const handleSelect = async (sessionType: string) => {
    setOverrideLoading(true);
    setIsDropdownOpen(false);
    try {
      await onOverrideSession(sessionType);
    } finally {
      setOverrideLoading(false);
    }
  };

  const getSessionBadgeColor = (type?: MarketSessionType) => {
    switch (type) {
      case 'Asian (Tokyo)':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
      case 'London Open':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30 shadow-[0_0_15px_rgba(56,189,248,0.2)]';
      case 'London Main Session':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]';
      case 'New York Open':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
      case 'London–New York Overlap':
        return 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.3)] animate-pulse';
      case 'New York Close':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.2)]';
      case 'Low Liquidity / Holiday Session':
      default:
        return 'bg-slate-500/10 text-slate-300 border-slate-500/30 shadow-[0_0_15px_rgba(100,116,139,0.2)]';
    }
  };

  const currentSessionObj = sessionsList.find(s => s.type === sessionInfo?.session_type) || sessionsList[0];

  return (
    <div className="w-full mb-6 bg-gradient-to-br from-[#0a0f1d]/95 via-[#0d152a]/90 to-[#070b16]/95 border border-indigo-500/20 rounded-2xl p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl relative overflow-hidden group">
      
      {/* Background ambient light streak */}
      <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/15 transition-all duration-500" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
        
        {/* LEFT COLUMN: Market Session Detection & Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-600/30 to-purple-600/20 rounded-2xl border border-indigo-400/30 flex items-center justify-center shrink-0 shadow-inner">
            <span className="text-2xl">{currentSessionObj.icon || '🌐'}</span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Globe size={11} className="text-indigo-400" />
                STEP 1 • LIVE MARKET SESSION DETECTED
              </span>
              
              {sessionInfo?.custom_override && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Sliders size={9} />
                  MANUAL OVERRIDE ACTIVE
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-display font-bold text-white flex items-center gap-2">
              {sessionInfo?.session_type || 'Asian (Tokyo)'}
              <span className={`text-xs font-mono px-2.5 py-0.5 rounded-full border font-bold ${getSessionBadgeColor(sessionInfo?.session_type)}`}>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1.5" />
                {sessionInfo?.status || 'ACTIVE'}
              </span>
            </h2>

            <p className="text-xs text-slate-400 mt-0.5 font-sans flex items-center gap-2">
              <Clock size={12} className="text-cyan-400" />
              <span className="text-slate-300 font-mono font-medium">{currentSessionObj.timeWindow}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 font-mono text-[11px]">UTC Hour: {sessionInfo?.utc_hour ?? new Date().getUTCHours()}:00</span>
            </p>
          </div>
        </div>

        {/* MIDDLE COLUMN: Activated Engine Info */}
        <div className="flex-1 bg-[#060a14]/80 rounded-xl p-3 sm:p-3.5 border border-indigo-500/15 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Cpu size={12} className="text-cyan-400" />
              AUTOMATICALLY ACTIVATED ANALYSIS ENGINE:
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Min Win Prob: {((sessionInfo?.min_win_probability || 0.88) * 100).toFixed(0)}%+
            </span>
          </div>

          <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Sparkles size={14} className="text-amber-400 shrink-0" />
            <span className="truncate">{sessionInfo?.engine_name || 'Hermes High-Volume Overlap Confluence Engine'}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[11px] text-slate-400 font-sans">
            <span className="flex items-center gap-1 text-slate-300">
              <Zap size={11} className="text-amber-400" />
              <span className="font-medium text-slate-400">Mode:</span> {sessionInfo?.volatility_mode || 'High Volatility'}
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <Shield size={11} className="text-emerald-400" />
              <span className="font-medium text-slate-400">Position Scale:</span> {sessionInfo?.position_scale || '1.0x Standard'}
            </span>
            <span className="flex items-center gap-1 text-slate-300">
              <TrendingUp size={11} className="text-indigo-400" />
              <span className="font-medium text-slate-400">Rec. TF:</span> {sessionInfo?.recommended_timeframe || '15 min'}
            </span>
          </div>

          {/* Target Asset Pills */}
          {sessionInfo?.target_assets && sessionInfo.target_assets.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] text-slate-500 font-mono font-semibold">Priority Pairs:</span>
              {sessionInfo.target_assets.map(asset => (
                <span key={asset} className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded text-[10px] font-mono font-bold">
                  {asset}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Operator Session Selector Dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={loading || overrideLoading}
            className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-mono font-bold border border-indigo-400/40 shadow-[0_0_15px_rgba(99,102,241,0.3)] flex items-center justify-between sm:justify-start gap-2.5 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
            title="Click to manually override or reset market session detection"
          >
            <div className="flex items-center gap-2">
              <Sliders size={14} className="text-amber-300" />
              <span>{sessionInfo?.custom_override ? 'CHANGE SESSION' : 'OVERRIDE SESSION'}</span>
            </div>
            <ChevronDown size={14} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Session Selector Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-[#0b101f] border border-indigo-500/30 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] p-2 z-50 backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-3 py-2 border-b border-indigo-500/20 flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">SELECT MARKET SESSION</span>
                {sessionInfo?.custom_override && (
                  <button 
                    onClick={() => handleSelect('AUTO')}
                    className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 underline cursor-pointer"
                  >
                    <RotateCcw size={10} /> Reset to Auto
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {sessionsList.map(s => {
                  const isSelected = s.type === 'AUTO' ? !sessionInfo?.custom_override : sessionInfo?.session_type === s.type;
                  return (
                    <button
                      key={s.type}
                      onClick={() => handleSelect(s.type)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-sans flex items-start gap-2.5 transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/20 border border-indigo-400/40 text-white font-bold' 
                          : 'hover:bg-indigo-500/10 text-slate-300 hover:text-white border border-transparent'
                      }`}
                    >
                      <span className="text-base leading-none">{s.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs truncate">{s.label}</span>
                          {isSelected && <Check size={14} className="text-emerald-400 shrink-0" />}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{s.timeWindow}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
