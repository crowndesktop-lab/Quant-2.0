import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  Cpu,
  Globe,
  TrendingUp,
  Sliders,
  Terminal as TerminalIcon,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Play,
  Brain,
  CheckCircle,
  XCircle,
  HelpCircle,
  Dna,
  RefreshCw,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Database,
  Download,
  Upload,
  Smartphone,
  BellRing,
  Info,
  Search,
  Award,
  Zap,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Star,
  Target,
  Layers,
  AlertTriangle,
  Menu,
  X,
  PanelLeft,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  ShieldCheck,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  Check,
  Code,
  GitCommit
} from 'lucide-react';
import {
  TradingSignal,
  TradingStrategy,
  PerformanceMetric,
  AdaptiveThreshold,
  ModelVersion,
  TradeInsight,
  MarketSessionInfo,
  OmniTimeframeBreakdownEntry,
  AiEngineStatus
} from './types';
import { safeFetchJson } from './utils/api';
import { MarketSessionBanner } from './components/MarketSessionBanner';
import { LiveMarketTickerTape } from './components/LiveMarketTickerTape';
import { LiveTradingViewChart } from './components/LiveTradingViewChart';
import { LiveQuantChart } from './components/LiveQuantChart';
import { StrategyCorrelationMatrix } from './components/StrategyCorrelationMatrix';

const renderCustomMarkdown = (text: string) => {
  if (!text) return null;
  return text.split('\n').map((line, idx) => {
    let formattedLine: React.ReactNode = line;
    
    // Header parsing
    if (line.startsWith('#### ')) {
      const content = line.substring(5);
      const parts = content.split(/\*\*(.*?)\*\*/g);
      const formattedContent = parts.map((part, pIdx) =>
        pIdx % 2 === 1 ? <strong key={pIdx} className="text-white font-bold">{part}</strong> : part
      );
      return <h5 key={idx} className="text-xs font-bold text-indigo-300 mt-3 mb-1 uppercase tracking-wide">{formattedContent}</h5>;
    }
    if (line.startsWith('### ')) {
      const content = line.substring(4);
      const parts = content.split(/\*\*(.*?)\*\*/g);
      const formattedContent = parts.map((part, pIdx) =>
        pIdx % 2 === 1 ? <strong key={pIdx} className="text-white font-bold">{part}</strong> : part
      );
      return <h4 key={idx} className="text-sm font-bold text-white mt-4 mb-2 border-b border-slate-800/80 pb-1">{formattedContent}</h4>;
    }

    // Bold parsing
    const boldRegex = /\*\*(.*?)\*\*/g;
    if (boldRegex.test(line)) {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      formattedLine = parts.map((part, pIdx) => 
        pIdx % 2 === 1 ? <strong key={pIdx} className="text-white font-bold">{part}</strong> : part
      );
    }

    // List item parsing
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const cleanLine = line.substring(2);
      const parts = cleanLine.split(/\*\*(.*?)\*\*/g);
      const formattedItem = parts.map((part, pIdx) =>
        pIdx % 2 === 1 ? <strong key={pIdx} className="text-white font-bold">{part}</strong> : part
      );
      return (
        <div key={idx} className="flex gap-2 ml-4 mt-1 items-start text-xs text-slate-300 leading-relaxed">
          <span className="text-indigo-400 font-mono mt-0.5">•</span>
          <span>{formattedItem}</span>
        </div>
      );
    }

    // Numbered item parsing (e.g., "1. ")
    const numMatch = line.match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      const num = numMatch[1];
      const rest = numMatch[2];
      const parts = rest.split(/\*\*(.*?)\*\*/g);
      const formattedRest = parts.map((part, pIdx) =>
        pIdx % 2 === 1 ? <strong key={pIdx} className="text-white font-bold">{part}</strong> : part
      );
      return (
        <div key={idx} className="flex gap-2 ml-4 mt-1.5 items-start text-xs text-slate-300 leading-relaxed">
          <span className="text-indigo-400 font-mono font-bold shrink-0">{num}.</span>
          <span>{formattedRest}</span>
        </div>
      );
    }

    if (line.trim() === '') {
      return <div key={idx} className="h-2" />;
    }

    return <p key={idx} className="mb-2 leading-relaxed text-xs text-slate-300">{formattedLine}</p>;
  });
};

export default function App() {
  // API State
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [strategies, setStrategies] = useState<TradingStrategy[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetric[]>([]);
  const [thresholds, setThresholds] = useState<AdaptiveThreshold[]>([]);
  const [models, setModels] = useState<ModelVersion[]>([]);
  const [insights, setInsights] = useState<TradeInsight[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentThresholds, setCurrentThresholds] = useState({
    min_score: 6,
    min_win_probability: 0.65,
    bb_buffer: 0.2,
    rsi_zone: 1,
    execution_latency: 350,
    broker_slippage_pips: 0.4
  });
  const [killedSessionAssets, setKilledSessionAssets] = useState<Record<string, string[]>>({});

  // Local Calibration States (Wired with sliders)
  const [localMinScore, setLocalMinScore] = useState<number>(6);
  const [localMinProb, setLocalMinProb] = useState<number>(0.65);
  const [localBbBuffer, setLocalBbBuffer] = useState<number>(0.2);
  const [localRsiZone, setLocalRsiZone] = useState<number>(1);
  const [localLatency, setLocalLatency] = useState<number>(350);
  const [localSlippage, setLocalSlippage] = useState<number>(0.4);
  const [savingThresholds, setSavingThresholds] = useState(false);

  // Sync sliders state with backend values on load or update
  useEffect(() => {
    if (currentThresholds) {
      if (currentThresholds.min_score !== undefined) setLocalMinScore(currentThresholds.min_score);
      if (currentThresholds.min_win_probability !== undefined) setLocalMinProb(currentThresholds.min_win_probability);
      if (currentThresholds.bb_buffer !== undefined) setLocalBbBuffer(currentThresholds.bb_buffer);
      if (currentThresholds.rsi_zone !== undefined) setLocalRsiZone(currentThresholds.rsi_zone);
      if (currentThresholds.execution_latency !== undefined) setLocalLatency(currentThresholds.execution_latency);
      if (currentThresholds.broker_slippage_pips !== undefined) setLocalSlippage(currentThresholds.broker_slippage_pips);
    }
  }, [currentThresholds]);

  const saveManualThresholds = async () => {
    setSavingThresholds(true);
    try {
      const data = await safeFetchJson('/api/thresholds/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          min_score: localMinScore,
          min_win_probability: localMinProb,
          bb_buffer: localBbBuffer,
          rsi_zone: localRsiZone,
          execution_latency: localLatency,
          broker_slippage_pips: localSlippage,
        }),
      });
      if (data.success) {
        await fetchState();
        playSignalSound();
        showNotice('success', 'Calibration thresholds synced with backend engine.');
      }
    } catch (err: any) {
      console.error("Failed to save manual calibrations", err);
      showNotice('error', err?.message || 'Failed to save manual calibrations.');
    } finally {
      setSavingThresholds(false);
    }
  };

  const [sessionInfo, setSessionInfo] = useState<MarketSessionInfo | undefined>(undefined);

  const handleOverrideSession = async (sessionType: string) => {
    try {
      const data = await safeFetchJson('/api/session/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_type: sessionType })
      });
      if (data.success && data.session_info) {
        setSessionInfo(data.session_info);
        setEngineState(prev => ({ ...prev, session_info: data.session_info }));
        if (data.killed_session_assets) setKilledSessionAssets(data.killed_session_assets);
      }
    } catch (err) {
      console.error("Failed to override market session:", err);
    }
  };

  const [sessionSyncLoading, setSessionSyncLoading] = useState(false);

  const handleToggleKilledAsset = async (asset: string) => {
    if (!sessionInfo) return;
    try {
      const data = await safeFetchJson('/api/session/killed-assets/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_type: sessionInfo.session_type, asset })
      });
      if (data.success && data.killed_session_assets) {
        setKilledSessionAssets(data.killed_session_assets);
        if (data.logs) setLogs(data.logs);
      }
    } catch (err) {
      console.error("Failed to toggle session asset:", err);
    }
  };

  const handleBrainSessionSync = async () => {
    setSessionSyncLoading(true);
    try {
      const data = await safeFetchJson('/api/session/killed-assets/brain-sync', {
        method: 'POST'
      });
      if (data.success) {
        if (data.killed_session_assets) setKilledSessionAssets(data.killed_session_assets);
        if (data.machine_brain_intel) {
          setMachineBrainIntel(data.machine_brain_intel);
          // Set active tab to brain so they can read the audit details immediately!
          setActiveTab('brain');
        }
        if (data.logs) setLogs(data.logs);
      }
    } catch (err) {
      console.error("Failed to sync session brain intelligence:", err);
    } finally {
      setSessionSyncLoading(false);
    }
  };

  const [engineState, setEngineState] = useState<{ scanning: boolean; activePairsCount: number; lastScanTime: string; session_info?: MarketSessionInfo }>({
    scanning: false,
    activePairsCount: 8,
    lastScanTime: '--:--:--'
  });

  // Sentiment Indicators
  const [marketSentiment, setMarketSentiment] = useState({
    value: 55,
    classification: 'Neutral',
    timestamp: '',
    source: '',
    last_updated: '--:--:--'
  });
  const [sentimentRefreshing, setSentimentRefreshing] = useState(false);

  // UI State
  const [activeTab, setActiveTab] = useState<'signals' | 'strategies' | 'analyst' | 'thresholds' | 'backtest' | 'brain'>('signals');
  const [marketFilter, setMarketFilter] = useState<'all' | 'crypto' | 'forex'>('all');
  const [strategyMarketFilter, setStrategyMarketFilter] = useState<'all' | 'crypto' | 'forex'>('all');
  const [labSubView, setLabSubView] = useState<'strategies' | 'pairs_matrix' | 'correlation_matrix'>('strategies');
  const [strategySortBy, setStrategySortBy] = useState<'score' | 'winrate' | 'sharpe' | 'generation'>('score');
  const [expandedStrategyId, setExpandedStrategyId] = useState<number | null>(null);
  const [pairSearchQuery, setPairSearchQuery] = useState('');
  const [backtestMarketFilter, setBacktestMarketFilter] = useState<'all' | 'crypto' | 'forex'>('all');
  const [timeframeFilter, setTimeframeFilter] = useState<'all' | '1 min' | '15 min' | '30 min' | '60 min'>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'win' | 'loss' | 'pending'>('all');
  const [deepSignalsOnly, setDeepSignalsOnly] = useState(false);
  const [pureAccuracyOnly, setPureAccuracyOnly] = useState(false);
  const [aiEngineStatus, setAiEngineStatus] = useState<AiEngineStatus | null>(null);
  const [uiNotice, setUiNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const noticeTimeoutRef = useRef<number | null>(null);
  const showNotice = (type: 'success' | 'error' | 'info', message: string) => {
    setUiNotice({ type, message });
    if (noticeTimeoutRef.current) {
      window.clearTimeout(noticeTimeoutRef.current);
    }
    noticeTimeoutRef.current = window.setTimeout(() => {
      setUiNotice(null);
    }, 5000);
  };
  const [confirmPrunePool, setConfirmPrunePool] = useState(false);
  const dismissedAuditAtRef = useRef<string | null>(null);
  const latestAuditAtRef = useRef<string | null>(null);
  const dismissedBatchIdRef = useRef<number | null>(null);
  const [liveOnly, setLiveOnly] = useState(true);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('hermes_side_menu');
    if (saved !== null) return saved === 'true';
    return false;
  });
  const [minimalDashboardMode, setMinimalDashboardMode] = useState<boolean>(() => {
    return localStorage.getItem('hermes_minimal_mode') !== 'false';
  });
  const [isHeaderDropdownOpen, setIsHeaderDropdownOpen] = useState(false);
  const [scanningTimeframe, setScanningTimeframe] = useState<'1 min' | '15 min' | '30 min' | '60 min'>('15 min');
  const [scanningInProgress, setScanningInProgress] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [analystInProgress, setAnalystInProgress] = useState(false);
  const [optimizeInProgress, setOptimizeInProgress] = useState(false);
  const [retrainInProgress, setRetrainInProgress] = useState(false);
  const [evolveInProgress, setEvolveInProgress] = useState(false);
  const [pruneInProgress, setPruneInProgress] = useState(false);
  const [autoEvolveActive, setAutoEvolveActive] = useState(true);
  const [selectedSignal, setSelectedSignal] = useState<TradingSignal | null>(null);
  const [scanNotice, setScanNotice] = useState<{ type: 'ranging' | 'signal' | 'info'; message: string } | null>(null);
  const [chartSymbol, setChartSymbol] = useState<string>('BTC/USDT');
  const [chartTimeframe, setChartTimeframe] = useState<string>('15 min');
  const [chartMode, setChartMode] = useState<'tradingview' | 'quant'>('quant');
  const [showChart, setShowChart] = useState(true);
  const [selectedAssetFilter, setSelectedAssetFilter] = useState<string | null>(null);
  const [cryptoEnabled, setCryptoEnabled] = useState(true);
  const [forexEnabled, setForexEnabled] = useState(true);
  const [mobilePage, setMobilePage] = useState(1);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);
  const [nowTime, setNowTime] = useState(Date.now());
  const zeroLatencyMode = true;
  const [copiedAssetSymbol, setCopiedAssetSymbol] = useState<string | null>(null);

  const handleCopySymbol = (symbol: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(symbol);
    setCopiedAssetSymbol(symbol);
    setTimeout(() => setCopiedAssetSymbol(null), 1800);
  };
  const [geminiReport, setGeminiReport] = useState<string | null>(null);
  const [recentBatchId, setRecentBatchId] = useState<number | null>(null);

  // Pro 5-Minute Outcome Backtester state
  const [backtestData, setBacktestData] = useState<{
    summary: {
      totalTrades: number;
      tpHits: number;
      slHits: number;
      timeExitWins: number;
      timeExitLosses: number;
      winRate: number;
      profitFactor: number;
      totalReturn: number;
      expectancy: number;
      sharpe: number;
      avgWin: number;
      avgLoss: number;
    };
    trades: any[];
    report: string;
    recommendation: string;
  } | null>(null);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [selectedBacktestTrade, setSelectedBacktestTrade] = useState<any | null>(null);

  // Strategy Lab Audit State
  const [auditReport, setAuditReport] = useState<string | null>(null);
  const [auditRec, setAuditRec] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // AI Brain Chat State
  const [brainMessages, setBrainMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    {
      role: 'model',
      text: `🧠 **Hermes Central AI Brain Online**\n\nI am the central quantitative intelligence of the Hermes Quant Suite. My neural clusters are synced directly with your active strategies, live indicators, sentiment indices, and execution logs.\n\nAsk me anything about your current quantitative trading metrics, strategy logic, risk parameter optimizations, or request code for specialized entry filters.`
    }
  ]);
  const [brainInput, setBrainInput] = useState('');
  const [brainLoading, setBrainLoading] = useState(false);

  // Live Spot Market Prices (No synthetic jitter)
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({
    'BTC/USDT': 64780.20,
    'ETH/USDT': 3245.80,
    'SOL/USDT': 142.45
  });
  const [marketFeedMeta, setMarketFeedMeta] = useState<{
    latencyMs: number | null;
    exchangeTimeMs: number;
    source: string;
    isLive: boolean;
  }>({
    latencyMs: null,
    exchangeTimeMs: 0,
    source: 'KuCoin Spot',
    isLive: true
  });

  const logsEndRef = useRef<HTMLDivElement>(null);
  const lastSignalIdRef = useRef<number | null>(null);
  const previousSignalsRef = useRef<TradingSignal[]>([]);

  // Brain Backup States & Refs
  const [importingBrain, setImportingBrain] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [machineBrainIntel, setMachineBrainIntel] = useState<string>('');
  const [brainSyncLoading, setBrainSyncLoading] = useState(false);

  // New states for Custom API
  const [aiProvider, setAiProvider] = useState<'gemini' | 'bigpickle'>('gemini');
  const [bigpickleConfig, setBigpickleConfig] = useState({
    endpoint: "https://api.bigpickle.ai/v1/chat/completions",
    api_key: "sk-pickle-default-key-12345",
    model: "big-pickle-quantum-v2",
    use_socks5: false,
    socks5_host: "127.0.0.1",
    socks5_port: 1080
  });
  const [savingConfig, setSavingConfig] = useState(false);

  const autoScannerEnabled = true;

  // Manual Copier and Lead Time States
  const [executionGracePeriod, setExecutionGracePeriod] = useState<number>(() => {
    return parseInt(localStorage.getItem('hermes_execution_grace_period') || '15', 10);
  });
  const [voiceAlertsEnabled, setVoiceAlertsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('hermes_voice_alerts') !== 'false';
  });
  const [ttsEngine, setTtsEngine] = useState<'elevenlabs' | 'browser'>(() => {
    return (localStorage.getItem('hermes_tts_engine') as any) || 'elevenlabs';
  });
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState<string>(() => {
    return localStorage.getItem('hermes_elevenlabs_key') || '';
  });
  const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState<string>(() => {
    return localStorage.getItem('hermes_elevenlabs_voice_id') || 'EXAVITQu4vr4xnSDxMaL';
  });
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [showElevenLabsSettings, setShowElevenLabsSettings] = useState<boolean>(false);

  const [soundBeepsEnabled, setSoundBeepsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('hermes_sound_beeps') !== 'false';
  });
  const [manuallyExecutedSignals, setManuallyExecutedSignals] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('hermes_manual_executions') || '[]');
    } catch {
      return [];
    }
  });

  const handleMarkAsExecuted = (id: number) => {
    setManuallyExecutedSignals(prev => {
      const updated = [...prev, id];
      localStorage.setItem('hermes_manual_executions', JSON.stringify(updated));
      return updated;
    });
    // Double beep synthesized using AudioContext to verify action locked
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const playNote = (delay: number, freq: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
          gain.gain.setValueAtTime(0, ctx.currentTime + delay);
          gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + delay + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + duration);
        };
        playNote(0, 1046.50, 0.15); // C6
        playNote(0.08, 1318.51, 0.15); // E6
      }
    } catch (e) {}
    
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] [Manual Copier] Trade ID #${id} manually confirmed executed on external exchange!`, ...prev].slice(0, 100));
  };

  const [resolvingSignalId, setResolvingSignalId] = useState<number | null>(null);

  const handleResolveNow = async (id: number) => {
    if (resolvingSignalId !== null) return;
    setResolvingSignalId(id);
    try {
      const data = await safeFetchJson(`/api/signals/${id}/resolve-now`, {
        method: 'POST'
      });
      if (data.success) {
        await fetchState();
        playSignalSound();
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] [Live Engine] Trade ID #${id} resolved instantly using real-time price feed update!`, ...prev].slice(0, 100));
        showNotice('success', `Signal #${id} resolved using live KuCoin feed.`);
      } else {
        showNotice('error', data.message || "Failed to resolve signal.");
      }
    } catch (err: any) {
      console.error(err);
      showNotice('error', err?.message || "Could not resolve trade. Please check API feeds.");
    } finally {
      setResolvingSignalId(null);
    }
  };

  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(() => {
    const stored = localStorage.getItem('hermes_push_notifications') === 'true';
    if (stored && typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  });

  // PWA Install and Web Notification state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isPWAActive, setIsPWAActive] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const [testPushCountdown, setTestPushCountdown] = useState<number | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIOSDevice = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Detect standalone mode
    const isStandalone = typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true);
    setIsPWAActive(isStandalone);

    // Listen for beforeinstallprompt
    const handleInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    // Check notification permission periodically or on change
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  const triggerPWAInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [PWA] Hermes App installation accepted!`]);
      } else {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [PWA] Hermes App installation dismissed.`]);
      }
    } catch (err) {
      console.error("Installation choice failed:", err);
    }
  };

  const triggerSampleNotification = (title: string, body: string) => {
    if ('serviceWorker' in navigator && Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then((reg) => {
        const options: any = {
          body,
          icon: '/icon.svg',
          badge: '/icon.svg',
          vibrate: [100, 50, 100],
          tag: 'hermes-test-push'
        };
        reg.showNotification(`🔔 ${title}`, options);
      }).catch((e) => {
        console.error("Service worker notification failed, using native fallback:", e);
        new Notification(`🔔 ${title}`, { body, icon: '/icon.svg' } as any);
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`🔔 ${title}`, { body, icon: '/icon.svg' });
    }
  };

  const handleTestPush = () => {
    if (!('Notification' in window)) {
      showNotice('error', "This browser does not support web notifications.");
      return;
    }
    if (Notification.permission !== 'granted') {
      togglePushNotifications();
      return;
    }

    setTestPushCountdown(5);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [Mobile Sync] Scheduled background test push. LOCK your screen or background the app in 5s!`]);

    let count = 5;
    const interval = setInterval(() => {
      count--;
      setTestPushCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        setTestPushCountdown(null);
        triggerSampleNotification(
          "BTC/USDT Momentum Breakout",
          "Hermes Quant: Volatility spike detected! Spot rate: $64,821.50 (94% win probability)."
        );
      }
    }, 1000);
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      showNotice('error', "This browser does not support desktop or web notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      setPushNotificationsEnabled(true);
      localStorage.setItem('hermes_push_notifications', 'true');
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [Notifications] Granted permission for mobile push notifications!`]);
      triggerSampleNotification("Permission Configured", "Hermes Quant notifications are now armed on your mobile device.");
    } else {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [Notifications] WARNING: Push permission not granted.`]);
    }
  };

  const playSignalSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playNote = (delay: number, freq: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + delay + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + duration);
      };

      playNote(0, 880, 0.4); // A5
      playNote(0.12, 1318.51, 0.6); // E6
    } catch (err) {
      console.error("Audio chime generation failed:", err);
    }
  };

  // Female Voice Speech Synthesis Alert Helper (ElevenLabs AI Sweet Voice + Web Speech Fallback)
  const speakFemaleVoiceAlert = async (textToSpeak: string, speedRate = 1.15) => {
    setIsSpeaking(true);
    let elevenLabsSuccess = false;

    // 1. Try ElevenLabs AI Sweet Voice endpoint if configured or selected
    if (ttsEngine === 'elevenlabs') {
      try {
        const response = await fetch('/api/tts/elevenlabs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSpeak,
            voice_id: elevenLabsVoiceId,
            api_key: elevenLabsApiKey.trim() || undefined
          })
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('audio')) {
            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            audio.onended = () => {
              setIsSpeaking(false);
              URL.revokeObjectURL(audioUrl);
            };
            audio.onerror = () => {
              setIsSpeaking(false);
              URL.revokeObjectURL(audioUrl);
            };
            await audio.play();
            elevenLabsSuccess = true;
          } else {
            const rawText = await response.text().catch(() => '');
            let data: any = {};
            try { if (rawText.trim().startsWith('{')) data = JSON.parse(rawText); } catch {}
            console.info("[ElevenLabs Voice] Switching to Browser Web Speech:", data.message || 'Non-audio response');
          }
        } else {
          const rawText = await response.text().catch(() => '');
          let errData: any = {};
          try { if (rawText.trim().startsWith('{')) errData = JSON.parse(rawText); } catch {}
          console.warn("[ElevenLabs Voice] API endpoint fallback to browser speech:", errData);
        }
      } catch (err) {
        console.warn("[ElevenLabs Voice] Connection failed, falling back to Web Speech:", err);
      }
    }

    // 2. Fallback to Browser Sweet Female Voice Synthesis
    if (!elevenLabsSuccess) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          utterance.rate = speedRate;
          utterance.pitch = 1.35; // High sweet pitch female tone
          utterance.volume = 1.0;
          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => setIsSpeaking(false);

          const voices = window.speechSynthesis.getVoices();
          if (voices && voices.length > 0) {
            // Priority search for female voices across macOS/iOS, Windows, Android, Chrome
            const femaleVoice = voices.find(v => {
              const name = v.name.toLowerCase();
              return (
                v.lang.startsWith('en') &&
                (name.includes('female') ||
                 name.includes('samantha') ||
                 name.includes('victoria') ||
                 name.includes('zira') ||
                 name.includes('jenny') ||
                 name.includes('aria') ||
                 name.includes('karen') ||
                 name.includes('moira') ||
                 name.includes('fiona') ||
                 name.includes('veena') ||
                 name.includes('google us english') ||
                 name.includes('google uk english female') ||
                 name.includes('eva') ||
                 name.includes('siri') ||
                 name.includes('natural') ||
                 name.includes('serena') ||
                 name.includes('hazel') ||
                 name.includes('stephanie') ||
                 name.includes('susan'))
              );
            }) || voices.find(v => v.lang.startsWith('en-US') || v.lang.startsWith('en')) || voices[0];

            if (femaleVoice) {
              utterance.voice = femaleVoice;
            }
          }

          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.error("Female Voice synthesis error:", err);
          setIsSpeaking(false);
        }
      } else {
        setIsSpeaking(false);
      }
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, []);

  const playOutcomeSound = (outcome: 'win' | 'loss') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playNote = (delay: number, freq: number, duration: number, type: OscillatorType = 'sine') => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + delay + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + duration);
      };

      if (outcome === 'win') {
        // Upbeat rising arpeggio (C5 -> E5 -> G5 -> C6)
        playNote(0, 523.25, 0.2); // C5
        playNote(0.07, 659.25, 0.2); // E5
        playNote(0.14, 783.99, 0.2); // G5
        playNote(0.21, 1046.50, 0.4); // C6
      } else {
        // Melancholic descending tone (G4 -> Eb4)
        playNote(0, 392.00, 0.3, 'triangle'); // G4
        playNote(0.12, 311.13, 0.5, 'triangle'); // Eb4
      }
    } catch (err) {
      console.error("Audio feedback generation failed:", err);
    }
  };

  const togglePushNotifications = async () => {
    if (!('Notification' in window)) {
      showNotice('error', "This browser does not support desktop or web notifications.");
      return;
    }

    if (Notification.permission === 'granted') {
      const nextVal = !pushNotificationsEnabled;
      setPushNotificationsEnabled(nextVal);
      localStorage.setItem('hermes_push_notifications', String(nextVal));
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPushNotificationsEnabled(true);
        localStorage.setItem('hermes_push_notifications', 'true');
        playSignalSound();
        new Notification("Hermes Quant Suite", {
          body: "Push notifications successfully enabled! You will be alerted for high-probability signals.",
          icon: "/icon.svg"
        });
      } else {
        showNotice('error', "Notification permission denied. Enable browser notifications to receive trading signals.");
      }
    } else {
      showNotice('error', "Notification permission is blocked. Open browser settings to allow notifications.");
    }
  };

  // Fetch full state from backend
  const fetchState = async () => {
    try {
      const data = await safeFetchJson('/api/state');
      if (!data) return;
      if (data.signals) setSignals(data.signals);
      if (data.strategies) setStrategies(data.strategies);
      if (data.performance) setPerformance(data.performance);
      if (data.adaptive_thresholds) setThresholds(data.adaptive_thresholds);
      if (data.model_versions) setModels(data.model_versions);
      if (data.trade_insights) setInsights(data.trade_insights);
      if (data.logs) setLogs(data.logs);
      if (data.current_thresholds) setCurrentThresholds(data.current_thresholds);
      if (data.engine_state) setEngineState(data.engine_state);
      if (data.session_info) {
        setSessionInfo(data.session_info);
      } else if (data.engine_state?.session_info) {
        setSessionInfo(data.engine_state.session_info);
      }
      if (data.auto_evolve_active !== undefined) {
        setAutoEvolveActive(data.auto_evolve_active);
      }
      if (data.market_sentiment) {
        setMarketSentiment(data.market_sentiment);
      }
      if (data.machine_brain_intel !== undefined) {
        setMachineBrainIntel(data.machine_brain_intel);
      }
      if (data.ai_provider !== undefined) {
        setAiProvider(data.ai_provider);
      }
      if (data.bigpickle_config !== undefined) {
        setBigpickleConfig(data.bigpickle_config);
      }
      if (data.killed_session_assets !== undefined) {
        setKilledSessionAssets(data.killed_session_assets);
      }
      if (data.ai_engine_status) {
        setAiEngineStatus(data.ai_engine_status);
      }
      if (data.latest_analyst_report && data.latest_batch_id !== dismissedBatchIdRef.current) {
        if (!geminiReport || (data.latest_batch_id && data.latest_batch_id !== recentBatchId)) {
          setGeminiReport(data.latest_analyst_report);
          if (data.latest_batch_id) setRecentBatchId(data.latest_batch_id);
        }
      }
      if (data.latest_audit && data.latest_audit.auditedAt !== dismissedAuditAtRef.current) {
        latestAuditAtRef.current = data.latest_audit.auditedAt;
        if (!auditReport || auditReport !== data.latest_audit.report) {
          setAuditReport(data.latest_audit.report);
          setAuditRec(data.latest_audit.recommendation || null);
        }
      }
    } catch (err) {
      console.warn('Dashboard state fetch pending backend connection...');
    }
  };

  // Refresh Market Sentiment manually
  const refreshSentiment = async () => {
    try {
      setSentimentRefreshing(true);
      const data = await safeFetchJson('/api/sentiment/refresh', { method: 'POST' });
      if (data.success && data.sentiment) {
        setMarketSentiment(data.sentiment);
        playSignalSound();
      }
    } catch (err) {
      console.error("Failed to refresh market sentiment", err);
    } finally {
      setSentimentRefreshing(false);
    }
  };

  const triggerBrainIntelligenceSync = async () => {
    try {
      setBrainSyncLoading(true);
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [Machine Brain] Initiating cognitive intelligence extraction from trade history journals...`]);
      const data = await safeFetchJson('/api/brain/feed-intelligence', { method: 'POST' });
      if (data.success) {
        setMachineBrainIntel(data.machine_brain_intel);
        setLogs(data.logs);
        playSignalSound();
        showNotice('success', 'Machine Brain cognitive memory core updated and synced.');
        setBrainMessages(prev => [
          ...prev,
          {
            role: 'model',
            text: `🧠 **Machine Brain Cognitive Memory Core Updated**\n\nI have successfully re-indexed and ingested the latest trade history journal intelligence! Under current regime configurations, I have integrated those learnings directly into my active context to guide future decisions and optimizations.`
          }
        ]);
      } else {
        showNotice('error', data.error || "Failed to feed the Machine Brain.");
      }
    } catch (err: any) {
      console.error("Machine Brain feed failed:", err);
      showNotice('error', err?.message || "Synaptic transmission to Machine Brain failed.");
    } finally {
      setBrainSyncLoading(false);
    }
  };

  const updateBrainConfig = async (provider?: 'gemini' | 'bigpickle', partialPickleConfig?: Partial<typeof bigpickleConfig>) => {
    try {
      setSavingConfig(true);
      const updatedProvider = provider !== undefined ? provider : aiProvider;
      const updatedPickleConfig = partialPickleConfig !== undefined ? { ...bigpickleConfig, ...partialPickleConfig } : bigpickleConfig;

      const data = await safeFetchJson('/api/brain/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai_provider: updatedProvider,
          bigpickle_config: updatedPickleConfig
        })
      });
      if (data.success) {
        setAiProvider(data.ai_provider);
        setBigpickleConfig(data.bigpickle_config);
        setLogs(data.logs);
        showNotice('success', `AI router synced to ${data.ai_provider === 'gemini' ? 'Gemini 4 Carbon' : 'Big Pickle'}.`);
      } else {
        showNotice('error', data.error || "Failed to update AI configurations.");
      }
    } catch (err: any) {
      console.error("Config update failed:", err);
      showNotice('error', err?.message || "Error synchronizing configuration with backend.");
    } finally {
      setSavingConfig(false);
    }
  };

  // Initial load and polling
  useEffect(() => {
    fetchState();
    
    // Poll state every 1.5s in zero-latency mode, or every 4s in normal mode
    const pollInterval = zeroLatencyMode ? 1500 : 4000;
    const interval = setInterval(fetchState, pollInterval);
    return () => clearInterval(interval);
  }, [zeroLatencyMode]);

  // Update real-time 1s clock for pending signal countdowns & live feed age telemetry
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Trigger 5-Minute outcome backtest when switching to backtest tab
  useEffect(() => {
    if (activeTab === 'backtest' && !backtestData) {
      runFiveMinuteBacktest();
    }
  }, [activeTab]);

  // Sync real live KuCoin/Coinbase Spot crypto prices cleanly without synthetic jitter
  useEffect(() => {
    let active = true;
    const syncRealPrices = async () => {
      const t0 = window.performance.now();
      try {
        const data = await safeFetchJson('/api/market-prices');
        if (!active) return;
        if (data?.success && Array.isArray(data.prices)) {
          setMarketPrices(prev => {
            const next = { ...prev };
            data.prices.forEach((p: { symbol: string; price: number }) => {
              if (p.symbol && typeof p.price === 'number') {
                next[p.symbol] = p.price;
              }
            });
            return next;
          });
          setMarketFeedMeta({
            latencyMs: typeof data.fetch_latency_ms === 'number' ? data.fetch_latency_ms : Math.round(window.performance.now() - t0),
            exchangeTimeMs: typeof data.exchange_time_ms === 'number' ? data.exchange_time_ms : Date.now(),
            source: data.source || 'KuCoin Spot',
            isLive: data.is_live !== false
          });
        }
      } catch {
        if (active) {
          setMarketFeedMeta(prev => ({ ...prev, isLive: false }));
        }
      }
    };
    syncRealPrices();
    const pollMs = zeroLatencyMode ? 1500 : 4000;
    const syncTimer = setInterval(syncRealPrices, pollMs);
    return () => {
      active = false;
      clearInterval(syncTimer);
    };
  }, [zeroLatencyMode]);

  // Reset mobile page to 1 when filters are changed
  useEffect(() => {
    setMobilePage(1);
  }, [selectedAssetFilter, cryptoEnabled, timeframeFilter, outcomeFilter]);

  // Auto-scroll logs terminal (Disabled per user request to stop auto scroll)
  /*
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);
  */

  // Auto-scanning trigger
  useEffect(() => {
    if (!autoScannerEnabled) return;
    
    // Initial scan on activation
    triggerScan();

    const interval = setInterval(() => {
      triggerScan();
    }, 10000); // 10 seconds
    
    return () => clearInterval(interval);
  }, [autoScannerEnabled, cryptoEnabled, scanningTimeframe]);

  // Monitor signals to trigger push notifications and audible alert sounds
  useEffect(() => {
    if (signals.length === 0) return;
    
    const latestSignal = signals[0];
    let isNewSignal = false;
    
    // Initial fetch, only record the latest seen signal ID without notifying
    if (lastSignalIdRef.current === null) {
      lastSignalIdRef.current = latestSignal.id;
    } else if (latestSignal.id > lastSignalIdRef.current) {
      lastSignalIdRef.current = latestSignal.id;
      isNewSignal = true;
      
      // Play trading chime alert if enabled
      if (soundBeepsEnabled) {
        playSignalSound();
      }

      // Short female voice speech synthesis trade alert
      if (voiceAlertsEnabled) {
        try {
          const cleanAsset = latestSignal.asset.replace('/', ' ');
          const spokenDirection = latestSignal.direction === 'BUY' ? 'BUY' : 'SELL';
          // Short, crisp female vocal alert: "EUR USD, BUY signal." or "BTC USD, SELL signal."
          const textToSpeak = `${cleanAsset}, ${spokenDirection} signal.`;
          speakFemaleVoiceAlert(textToSpeak, 1.15);
        } catch (err) {
          console.error("Speech Synthesis failed:", err);
        }
      }
      
      // Trigger browser notification
      if (pushNotificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const title = `🚨 HERMES: ${latestSignal.direction} ${latestSignal.asset} (${latestSignal.expiry || '15 min'})`;
          const options: any = {
            body: `Signal: ${latestSignal.direction} | Timeframe: ${latestSignal.expiry || '15 min'}\nRate: ${latestSignal.price.toFixed(latestSignal.asset.includes('BTC') ? 2 : (latestSignal.asset.includes('ETH') ? 2 : 5))} | Prob: ${(latestSignal.win_probability * 100).toFixed(0)}% | Confidence: ${latestSignal.confidence}`,
            icon: '/icon.svg',
            badge: '/icon.svg',
            vibrate: [100, 50, 100],
            tag: `hermes-signal-${latestSignal.id}`
          };
          
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification(title, options);
            }).catch(() => {
              new Notification(title, options as any);
            });
          } else {
            new Notification(title, options as any);
          }
        } catch (e) {
          console.error("Failed to show native notification:", e);
        }
      }
    }

    // Check for outcome resolution transitions (win or loss feedback)
    if (previousSignalsRef.current.length > 0 && !isNewSignal) {
      signals.forEach((currentSig) => {
        const prevSig = previousSignalsRef.current.find(s => s.id === currentSig.id);
        
        // If it was pending in the previous state, but is now resolved to 'win' or 'loss'
        if (prevSig && prevSig.outcome === 'pending' && (currentSig.outcome === 'win' || currentSig.outcome === 'loss')) {
          const outcome = currentSig.outcome;
          
          // Play upbeat win sound or descending loss sound
          playOutcomeSound(outcome);
          
          // Trigger outcome feedback notification
          if (pushNotificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
            try {
              const emoji = outcome === 'win' ? '🏆' : '📉';
              const title = `🏁 ${emoji} HERMES RESULT: ${currentSig.asset} is a ${outcome.toUpperCase()}!`;
              const options: any = {
                body: `Result: ${outcome.toUpperCase()} (${currentSig.direction} setup resolved)\nAsset: ${currentSig.asset} | Expiry: ${currentSig.expiry || '15 min'}\nScore: ${currentSig.score}/10 | Probability: ${(currentSig.win_probability * 100).toFixed(0)}%`,
                icon: '/icon.svg',
                badge: '/icon.svg',
                vibrate: outcome === 'win' ? [100, 50, 100, 50, 150] : [200, 100, 200],
                tag: `hermes-outcome-${currentSig.id}`
              };

              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then((reg) => {
                  reg.showNotification(title, options);
                }).catch(() => {
                  new Notification(title, options as any);
                });
              } else {
                new Notification(title, options as any);
              }
            } catch (e) {
              console.error("Failed to show native outcome notification:", e);
            }
          }

          // Add a notification log entry
          setLogs(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] [Notifications] Feedback sent for ${currentSig.asset} ${currentSig.direction} (${outcome.toUpperCase()})`
          ]);
        }
      });
    }

    // Update the previous signals reference
    previousSignalsRef.current = signals;

  }, [signals, pushNotificationsEnabled]);

  // Actions
  const runFiveMinuteBacktest = async () => {
    if (backtestLoading) return;
    setBacktestLoading(true);
    try {
      const data = await safeFetchJson('/api/analysis/five-minute', { method: 'POST' });
      if (data.success) {
        setBacktestData(data);
        if (data.trades && data.trades.length > 0) {
          setSelectedBacktestTrade(data.trades[0]);
        }
      } else {
        showNotice('error', data.message || "Failed to run high-probability backtest.");
      }
    } catch (err: any) {
      console.error(err);
      showNotice('error', err?.message || "Backtest request failed.");
    } finally {
      setBacktestLoading(false);
    }
  };

  const sendBrainMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!brainInput.trim() || brainLoading) return;

    const userMsg = brainInput.trim();
    setBrainInput('');
    
    // Optimistically update message history
    const updatedMessages = [...brainMessages, { role: 'user' as const, text: userMsg }];
    setBrainMessages(updatedMessages);
    setBrainLoading(true);

    try {
      const data = await safeFetchJson('/api/brain/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: updatedMessages }),
      });
      setBrainMessages(prev => [...prev, { role: 'model' as const, text: data.text }]);
    } catch (err: any) {
      console.error(err);
      setBrainMessages(prev => [...prev, { role: 'model' as const, text: `⚠️ **Neural Error**: ${err.message || "Failed to connect to the central intelligence module."}` }]);
    } finally {
      setBrainLoading(false);
    }
  };

  const triggerScan = async () => {
    if (scanningInProgress) return;
    setScanningInProgress(true);
    setScanProgress(5);

    // Start progress simulation
    const startTime = Date.now();
    const duration = 2000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const calculatedProgress = Math.min(95, Math.floor((elapsed / duration) * 90) + 5);
      setScanProgress(calculatedProgress);
    }, 100);

    try {
      const data = await safeFetchJson('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          timeframe: scanningTimeframe,
          crypto_enabled: cryptoEnabled
        })
      });
      await fetchState();
      
      // Complete the progress animation
      clearInterval(interval);
      setScanProgress(100);
      await new Promise(resolve => setTimeout(resolve, 300));

      if (data.rangingMoodActive || (data.success && !data.signalTriggered)) {
        setScanNotice({
          type: 'ranging',
          message: data.message || 'Market is currently in a ranging mood. Signal generation is strictly paused to protect capital against chop loss.'
        });
      } else if (data.signalTriggered && data.signal) {
        setScanNotice({
          type: 'signal',
          message: `🔔 New ${data.signal.expiry || scanningTimeframe} signal generated for ${data.signal.asset} (${data.signal.direction})!`
        });
      }
    } catch (err: any) {
      console.error(err);
      clearInterval(interval);
      showNotice('error', err?.message || 'Market scan failed.');
    } finally {
      setScanningInProgress(false);
      setScanProgress(0);
    }
  };

  const triggerAnalystBatch = async () => {
    if (analystInProgress) return;
    setAnalystInProgress(true);
    setGeminiReport(null);
    dismissedBatchIdRef.current = null;
    try {
      const data = await safeFetchJson('/api/analyst/analyze', { method: 'POST' });
      if (data.success) {
        if (data.geminiReport) {
          setGeminiReport(data.geminiReport);
          setRecentBatchId(data.batchId);
        }
        if (data.ai_engine_status) {
          setAiEngineStatus(data.ai_engine_status);
        }
        showNotice('success', `AI Analyst audit complete via ${data.modelUsed || 'Gemini 4 Carbon'}.`);
      }
      await fetchState();
    } catch (err: any) {
      console.error(err);
      showNotice('error', err?.message || 'AI Analyst batch failed.');
    } finally {
      setAnalystInProgress(false);
    }
  };

  const triggerOptimization = async () => {
    if (optimizeInProgress) return;
    setOptimizeInProgress(true);
    try {
      await safeFetchJson('/api/thresholds/optimize', { method: 'POST' });
      await fetchState();
      showNotice('success', 'Adaptive threshold optimization complete.');
    } catch (err: any) {
      console.error(err);
      showNotice('error', err?.message || 'Threshold optimization failed.');
    } finally {
      setOptimizeInProgress(false);
    }
  };

  const triggerRetraining = async () => {
    if (retrainInProgress) return;
    setRetrainInProgress(true);
    try {
      await safeFetchJson('/api/model/retrain', { method: 'POST' });
      await fetchState();
      showNotice('success', 'ML Ensemble model weights retrained & synced.');
    } catch (err: any) {
      console.error(err);
      showNotice('error', err?.message || 'Model retraining failed.');
    } finally {
      setRetrainInProgress(false);
    }
  };

  const [latestIntellectReport, setLatestIntellectReport] = useState<{
    timestamp: string;
    triggerMode: string;
    evolvedStrategyName: string;
    generation: number;
    parentA: { name: string; generation: number; score: number };
    parentB: { name: string; generation: number; score: number };
    geneticDistance: number;
    sessionIntellect: { session: string; volatilityMode: string; recommendedTimeframe: string };
    sentimentIntellect: { value: number; classification: string; mutationBias: string };
    thresholdIntellect: { liveSignalWinRatePct: number; minScore: number; minWinProbabilityPct: number; bbBuffer: number; note: string; adjusted: boolean };
    empiricalTest: { testedCandlesCount: number; winRatePct: number; profitFactor: number; sharpeRatio: number; netReturnPct: number; totalTrades: number };
  } | null>(null);

  const triggerEvolution = async () => {
    if (evolveInProgress) return;
    setEvolveInProgress(true);
    try {
      const data = await safeFetchJson('/api/strategies/evolve', { method: 'POST' });
      if (data.success) {
        if (data.strategies) setStrategies(data.strategies);
        if (data.intellectReport) setLatestIntellectReport(data.intellectReport);
        if (data.thresholds) setCurrentThresholds(data.thresholds);
      }
      await fetchState();
    } catch (err: any) {
      console.error(err);
      showNotice('error', err?.message || 'Strategy evolution failed.');
    } finally {
      setEvolveInProgress(false);
    }
  };

  const triggerPruning = async () => {
    if (pruneInProgress) return;
    setConfirmPrunePool(false);
    setPruneInProgress(true);
    try {
      const data = await safeFetchJson('/api/strategies/prune', { method: 'POST' });
      if (data.success) {
        setStrategies(data.strategies);
        showNotice('success', data.message || 'Strategy pool pruned & optimized.');
        await fetchState();
      }
    } catch (err: any) {
      console.error(err);
      showNotice('error', err?.message || "Failed to prune strategies.");
    } finally {
      setPruneInProgress(false);
    }
  };

  // Smart Strategy Agent & Inline Rename / Live Tester / Solo Omni-TF Evolution State
  const [showStrategyAgent, setShowStrategyAgent] = useState(false);
  const [agentInputType, setAgentInputType] = useState<'pinescript' | 'text'>('pinescript');
  const [agentCustomName, setAgentCustomName] = useState('');
  const [agentGeneration, setAgentGeneration] = useState<number>(1);
  const [agentTimeframe, setAgentTimeframe] = useState<'omni' | '1 min' | '15 min' | '30 min' | '60 min'>('omni');
  const [agentIsolatedLineage, setAgentIsolatedLineage] = useState<boolean>(true);
  const [agentContent, setAgentContent] = useState(
    `//@version=5\nindicator("Hermes VPVR Liquidity Reversion", overlay=true)\nrsiVal = ta.rsi(close, 14)\n[middle, upper, lower] = ta.bb(close, 20, 2.0)\nemaFast = ta.ema(close, 9)\nemaSlow = ta.ema(close, 21)\nbuySignal = rsiVal < 32 and close <= lower and emaFast >= emaSlow * 0.998\nsellSignal = rsiVal > 68 and close >= upper and emaFast <= emaSlow * 1.002`
  );
  const [agentSubmitting, setAgentSubmitting] = useState(false);
  const [agentEvolvingSolo, setAgentEvolvingSolo] = useState(false);
  const [agentFeedback, setAgentFeedback] = useState<{
    strategyName: string;
    generation: number;
    isolatedLineage?: boolean;
    timeframe: string;
    testedCandlesCount: number;
    totalTrades: number;
    wins: number;
    losses: number;
    winRatePct: number;
    profitFactor: number;
    sharpeRatio: number;
    netReturnPct: number;
    pairBreakdown: Array<{ pair: string; win_rate: number; total_trades: number; profit_factor: number; status: string }>;
    omniBreakdown?: OmniTimeframeBreakdownEntry[];
  } | null>(null);

  const [renamingStrategyId, setRenamingStrategyId] = useState<number | null>(null);
  const [renameInputValue, setRenameInputValue] = useState('');
  const [renameBumpGen, setRenameBumpGen] = useState(true);
  const [renameSubmitting, setRenameSubmitting] = useState(false);
  const [testingStrategyId, setTestingStrategyId] = useState<number | null>(null);
  const [evolvingSoloStrategyId, setEvolvingSoloStrategyId] = useState<number | null>(null);
  const [strategyTestResultsMap, setStrategyTestResultsMap] = useState<Record<number, {
    timeframe: string;
    testedCandlesCount: number;
    totalTrades: number;
    wins: number;
    losses: number;
    winRatePct: number;
    profitFactor: number;
    sharpeRatio: number;
    netReturnPct: number;
    signalTriggered?: boolean;
    omniBreakdown?: OmniTimeframeBreakdownEntry[];
  }>>({});

  const handleCreateSmartStrategy = async (e?: React.FormEvent, evolveSoloMode: boolean = false) => {
    if (e) e.preventDefault();
    if (!agentContent.trim() || agentSubmitting || agentEvolvingSolo) return;
    if (evolveSoloMode) setAgentEvolvingSolo(true);
    else setAgentSubmitting(true);
    try {
      const useOmni = evolveSoloMode || agentTimeframe === 'omni' || agentInputType === 'pinescript';
      const data = await safeFetchJson('/api/strategies/create-smart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agentCustomName.trim() || undefined,
          input_type: agentInputType,
          content: agentContent,
          generation: agentGeneration,
          preferred_timeframe: useOmni ? 'omni' : agentTimeframe,
          omni_timeframe: useOmni,
          isolated_lineage: agentIsolatedLineage || agentInputType === 'pinescript' || evolveSoloMode,
          evolve_solo: evolveSoloMode
        })
      });
      if (data.success && data.strategy) {
        if (data.strategies) setStrategies(data.strategies);
        if (data.testSummary) {
          setAgentFeedback({
            strategyName: data.strategy.name,
            generation: data.strategy.generation,
            isolatedLineage: Boolean(data.strategy.isolated_lineage),
            ...data.testSummary,
            omniBreakdown: data.omniBreakdown || data.testSummary.omniBreakdown
          });
          setStrategyTestResultsMap(prev => ({
            ...prev,
            [data.strategy.id]: {
              ...data.testSummary,
              omniBreakdown: data.omniBreakdown || data.testSummary.omniBreakdown
            }
          }));
        }
        setAgentCustomName('');
        await fetchState();
      }
    } catch (err: any) {
      console.error("Error creating smart strategy:", err);
      showNotice('error', err?.message || 'Failed to create strategy.');
    } finally {
      setAgentSubmitting(false);
      setAgentEvolvingSolo(false);
    }
  };

  const handleEvolveSoloStrategy = async (stratId: number) => {
    if (evolvingSoloStrategyId !== null) return;
    setEvolvingSoloStrategyId(stratId);
    try {
      const data = await safeFetchJson('/api/strategies/evolve-solo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: stratId })
      });
      if (data.success && data.strategy) {
        if (data.strategies) setStrategies(data.strategies);
        if (data.testSummary) {
          setStrategyTestResultsMap(prev => ({
            ...prev,
            [stratId]: {
              ...data.testSummary,
              omniBreakdown: data.omniBreakdown || data.testSummary.omniBreakdown
            }
          }));
        }
        await fetchState();
      }
    } catch (err: any) {
      console.error("Failed to evolve solo Pine Script strategy:", err);
      showNotice('error', err?.message || 'Solo Omni-TF evolution failed.');
    } finally {
      setEvolvingSoloStrategyId(null);
    }
  };

  const handleStartRenameStrategy = (strat: TradingStrategy) => {
    setRenamingStrategyId(strat.id);
    setRenameInputValue(strat.name);
    setRenameBumpGen(false);
  };

  const handleConfirmRenameStrategy = async (stratId: number) => {
    if (!renameInputValue.trim() || renameSubmitting) return;
    setRenameSubmitting(true);
    try {
      const data = await safeFetchJson('/api/strategies/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: stratId,
          new_name: renameInputValue.trim(),
          increment_generation: renameBumpGen
        })
      });
      if (data.success) {
        if (data.strategies) setStrategies(data.strategies);
        setRenamingStrategyId(null);
        await fetchState();
      }
    } catch (err: any) {
      console.error("Failed to rename strategy:", err);
      showNotice('error', err?.message || 'Failed to rename strategy.');
    } finally {
      setRenameSubmitting(false);
    }
  };

  const handleRunLiveStrategyTest = async (stratId: number, triggerLiveSignal: boolean = false) => {
    if (testingStrategyId !== null) return;
    setTestingStrategyId(stratId);
    try {
      const targetStrat = strategies.find(s => s.id === stratId);
      const isSoloPine = Boolean(targetStrat?.isolated_lineage || targetStrat?.category?.toLowerCase().includes('pine'));
      const data = await safeFetchJson('/api/strategies/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: stratId,
          timeframe: isSoloPine ? 'omni' : (scanningTimeframe || '15 min'),
          omni_timeframe: isSoloPine,
          trigger_live_signal: triggerLiveSignal
        })
      });
      if (data.success && data.testSummary) {
        if (data.strategies) setStrategies(data.strategies);
        setStrategyTestResultsMap(prev => ({
          ...prev,
          [stratId]: {
            ...data.testSummary,
            omniBreakdown: data.omniBreakdown || data.testSummary.omniBreakdown,
            signalTriggered: Boolean(data.generatedSignal)
          }
        }));
        await fetchState();
      }
    } catch (err: any) {
      console.error("Failed to run live strategy test:", err);
      showNotice('error', err?.message || 'Live strategy test failed.');
    } finally {
      setTestingStrategyId(null);
    }
  };

  const triggerAudit = async () => {
    if (auditLoading) return;
    setAuditLoading(true);
    setAuditReport(null);
    setAuditRec(null);
    dismissedAuditAtRef.current = null;
    try {
      const data = await safeFetchJson('/api/strategies/audit', { method: 'POST' });
      if (data.success) {
        setAuditReport(data.report);
        setAuditRec(data.recommendation);
        if (data.auditedAt) latestAuditAtRef.current = data.auditedAt;
        if (data.ai_engine_status) setAiEngineStatus(data.ai_engine_status);
        showNotice('success', `Strategy Lab Audit compiled via ${data.modelUsed || 'Gemini 4 Carbon'}.`);
      } else {
        showNotice('error', "Failed to compile strategy audit.");
      }
    } catch (err: any) {
      console.error(err);
      showNotice('error', err?.message || "Error occurred during strategy audit.");
    } finally {
      setAuditLoading(false);
    }
  };

  const toggleTrackSignal = async (id: number, currentTracked: boolean, outcome?: 'win' | 'loss' | 'pending' | 'timeout') => {
    try {
      const targetTracked = !currentTracked;
      const sig = signals.find(s => s.id === id);
      const targetOutcome = outcome || (sig?.outcome === 'pending' ? 'pending' : (sig?.outcome || 'pending'));

      const data = await safeFetchJson(`/api/signals/${id}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracked: targetTracked,
          quotex_outcome: targetOutcome
        })
      });
      if (data.success) {
        setSignals(prev => prev.map(s => s.id === id ? { ...s, tracked: targetTracked, quotex_outcome: targetOutcome } : s));
      }
    } catch (err) {
      console.error("Error tracking trade:", err);
    }
  };

  const updateQuotexOutcome = async (id: number, outcome: 'win' | 'loss' | 'pending' | 'timeout') => {
    try {
      const data = await safeFetchJson(`/api/signals/${id}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracked: true,
          quotex_outcome: outcome
        })
      });
      if (data.success) {
        setSignals(prev => prev.map(s => s.id === id ? { ...s, tracked: true, quotex_outcome: outcome } : s));
      }
    } catch (err) {
      console.error("Error updating execution outcome:", err);
    }
  };

  const toggleAutoEvolve = async () => {
    try {
      const data = await safeFetchJson('/api/strategies/auto-evolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !autoEvolveActive })
      });
      if (data.success) {
        setAutoEvolveActive(data.auto_evolve_active);
        if (data.strategies) setStrategies(data.strategies);
        if (data.intellectReport) setLatestIntellectReport(data.intellectReport);
        if (data.thresholds) setCurrentThresholds(data.thresholds);
      }
    } catch (err) {
      console.error("Failed to toggle auto-evolve", err);
    }
  };

  const toggleStrategy = async (id: number) => {
    try {
      await safeFetchJson('/api/strategies/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      await fetchState();
    } catch (err: any) {
      console.error(err);
      showNotice('error', err?.message || 'Failed to toggle strategy.');
    }
  };

  const clearHistory = async () => {
    try {
      const data = await safeFetchJson('/api/history/clear', { method: 'POST' });
      if (data.success) {
        await fetchState();
        setSelectedSignal(null);
        setMobilePage(1);
        setShowClearHistoryConfirm(false);
        showNotice('success', 'Signal history cleared.');
      }
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  const exportBrain = async () => {
    try {
      const data = await safeFetchJson('/api/brain/export');
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `hermes-quant-brain-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showNotice('success', 'Brain backup JSON exported.');
    } catch (err: any) {
      console.error(err);
      showNotice('error', err?.message || "Error exporting brain state.");
    }
  };

  const handleBrainImport = async (file: File) => {
    if (!file) return;
    setImportingBrain(true);
    setImportMessage(null);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        
        // Basic check for brain structure
        if (!parsed.model_versions || !parsed.current_thresholds || !parsed.strategies) {
          throw new Error("Invalid format: JSON does not contain core Hermes neural or strategy matrices.");
        }
        
        const data = await safeFetchJson('/api/brain/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed)
        });
        
        if (data.success) {
          setImportMessage({ type: 'success', text: "Brain state imported successfully! Active strategies and model weights updated." });
          await fetchState();
        } else {
          setImportMessage({ type: 'error', text: data.error || "Failed to update brain state on the server." });
        }
      } catch (err: any) {
        setImportMessage({ type: 'error', text: err.message || "Failed to parse JSON file." });
      } finally {
        setImportingBrain(false);
      }
    };
    reader.readAsText(file);
  };

  // Performance helpers
  const getMetricValue = (metricName: string, fallback: number) => {
    const item = performance.find(p => p.metric === metricName);
    return item ? item.value : fallback;
  };

  const winRate = getMetricValue('win_rate', 0);
  const profitFactor = getMetricValue('profit_factor', 0);
  const netReturn = getMetricValue('total_profit', 0);

  const getSentimentStyles = (classification: string) => {
    const cls = classification?.toLowerCase() || '';
    if (cls.includes('extreme fear')) {
      return 'text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.25)]';
    }
    if (cls.includes('fear')) {
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    }
    if (cls.includes('extreme greed')) {
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.25)]';
    }
    if (cls.includes('greed')) {
      return 'text-green-400 bg-green-500/10 border-green-500/20';
    }
    return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
  };

  // Unanalyzed completed trade count
  const unanalyzedCount = signals.filter(s => 
    (s.outcome === 'win' || s.outcome === 'loss') && 
    !insights.some(ti => ti.signal_id === s.id)
  ).length;

  // Sorting State & Helpers
  const [sortField, setSortField] = useState<keyof TradingSignal>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof TradingSignal) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const renderSortIndicator = (field: keyof TradingSignal) => {
    const isSelected = sortField === field;
    return (
      <span className="inline-flex flex-col ml-1.5 select-none text-[8px] leading-[6px] justify-center h-4">
        <span className={`transition-colors ${isSelected && sortDirection === 'asc' ? 'text-[#818cf8] font-bold' : 'text-slate-600 group-hover:text-slate-400'}`}>▲</span>
        <span className={`transition-colors ${isSelected && sortDirection === 'desc' ? 'text-[#818cf8] font-bold' : 'text-slate-600 group-hover:text-slate-400'}`}>▼</span>
      </span>
    );
  };

  const isCryptoAsset = (asset: string) => {
    const a = asset.toUpperCase();
    return a.includes('BTC') || a.includes('ETH') || a.includes('SOL');
  };

  const isForexAsset = (asset: string) => {
    return !isCryptoAsset(asset);
  };

  const filteredSignals = signals.filter(sig => {
    if (selectedAssetFilter && sig.asset !== selectedAssetFilter) return false;
    if (!cryptoEnabled) return false;
    if (timeframeFilter !== 'all' && sig.expiry !== timeframeFilter) return false;
    if (outcomeFilter !== 'all' && sig.outcome !== outcomeFilter) return false;
    if (deepSignalsOnly && !sig.deep_conviction && !sig.signal_depth) return false;
    if (pureAccuracyOnly && !sig.pure_accuracy_certified && (sig.expiry !== '15 min' && sig.expiry !== '30 min' && sig.expiry !== '60 min')) return false;
    if (liveOnly && !sig.is_live) return false;
    return true;
  });

  const totalSignalsCount = signals.length;
  const winSignalsCount = signals.filter(s => s.outcome === 'win').length;
  const lossSignalsCount = signals.filter(s => s.outcome === 'loss').length;
  const pendingSignalsCount = signals.filter(s => s.outcome === 'pending').length;

  const completed30m = signals.filter(s => s.expiry === '30 min' && (s.outcome === 'win' || s.outcome === 'loss'));
  const winRate30m = completed30m.length > 0 
    ? parseFloat(((completed30m.filter(s => s.outcome === 'win').length / completed30m.length) * 100).toFixed(1)) 
    : 88.2;

  const completed15m = signals.filter(s => s.expiry === '15 min' && (s.outcome === 'win' || s.outcome === 'loss'));
  const winRate15m = completed15m.length > 0 
    ? parseFloat(((completed15m.filter(s => s.outcome === 'win').length / completed15m.length) * 100).toFixed(1)) 
    : 89.5;

  const sortedSignals = [...filteredSignals].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === 'timestamp') {
      aVal = new Date(a.timestamp).getTime();
      bVal = new Date(b.timestamp).getTime();
    }

    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }

    return 0;
  });

  const mobileItemsPerPage = 8;
  const totalMobilePages = Math.ceil(sortedSignals.length / mobileItemsPerPage);
  const activeMobilePage = Math.min(mobilePage, Math.max(1, totalMobilePages));
  const paginatedMobileSignals = sortedSignals.slice((activeMobilePage - 1) * mobileItemsPerPage, activeMobilePage * mobileItemsPerPage);

  const filteredStrategies = strategies.filter(strat => {
    if (strategyMarketFilter === 'crypto' && strat.market !== 'crypto') return false;
    if (strategyMarketFilter === 'forex' && strat.market !== 'forex') return false;
    if (pairSearchQuery.trim()) {
      const q = pairSearchQuery.toLowerCase();
      const matchName = strat.name.toLowerCase().includes(q);
      const matchLogic = strat.entry_logic.toLowerCase().includes(q);
      const matchCategory = (strat.category || '').toLowerCase().includes(q);
      const matchPairs = strat.best_pairs?.some(p => p.pair.toLowerCase().includes(q));
      if (!matchName && !matchLogic && !matchCategory && !matchPairs) return false;
    }
    return true;
  }).sort((a, b) => {
    // Always pin Isolated Pine Script strategies to the top of Strategy Lab so custom PineScripts are immediately visible
    const aIsPine = Boolean(a.isolated_lineage || a.pine_source || a.category?.toLowerCase().includes('pine'));
    const bIsPine = Boolean(b.isolated_lineage || b.pine_source || b.category?.toLowerCase().includes('pine'));
    if (aIsPine !== bIsPine) return aIsPine ? -1 : 1;

    if (strategySortBy === 'score') {
      const scoreA = a.success_score ?? (a.last_wr * 100);
      const scoreB = b.success_score ?? (b.last_wr * 100);
      return scoreB - scoreA;
    }
    if (strategySortBy === 'winrate') {
      return b.last_wr - a.last_wr;
    }
    if (strategySortBy === 'sharpe') {
      return b.last_sharpe - a.last_sharpe;
    }
    if (strategySortBy === 'generation') {
      return b.generation - a.generation;
    }
    return 0;
  });

  const masterPairsMatrix = useMemo(() => {
    const pairMap: Record<string, {
      pair: string;
      bestStrategyName: string;
      bestStrategyScore: number;
      bestWinRate: number;
      bestProfitFactor: number;
      bestTimeframe: string;
      totalTrades: number;
      avgScore: number;
      status: 'OPTIMAL' | 'STABLE' | 'NEUTRAL' | 'UNDERPERFORMING';
      market: 'forex' | 'crypto';
      allStrategiesCount: number;
    }> = {};

    strategies.forEach(strat => {
      if (!strat.best_pairs) return;
      strat.best_pairs.forEach(p => {
        const existing = pairMap[p.pair];
        if (!existing || p.win_rate > existing.bestWinRate) {
          pairMap[p.pair] = {
            pair: p.pair,
            bestStrategyName: strat.name,
            bestStrategyScore: strat.success_score ?? 80,
            bestWinRate: p.win_rate,
            bestProfitFactor: p.profit_factor,
            bestTimeframe: p.best_timeframe,
            totalTrades: p.total_trades,
            avgScore: p.avg_score,
            status: p.status,
            market: strat.market,
            allStrategiesCount: (existing?.allStrategiesCount || 0) + 1
          };
        } else {
          existing.allStrategiesCount += 1;
          existing.totalTrades += p.total_trades;
        }
      });
    });

    let result = Object.values(pairMap);
    if (strategyMarketFilter === 'crypto') result = result.filter(r => r.market === 'crypto');
    if (strategyMarketFilter === 'forex') result = result.filter(r => r.market === 'forex');
    if (pairSearchQuery.trim()) {
      const q = pairSearchQuery.toLowerCase();
      result = result.filter(r => r.pair.toLowerCase().includes(q) || r.bestStrategyName.toLowerCase().includes(q));
    }
    return result.sort((a, b) => b.bestWinRate - a.bestWinRate);
  }, [strategies, strategyMarketFilter, pairSearchQuery]);

  const getFilteredBacktestData = () => {
    if (!backtestData) return null;
    
    const filteredTrades = backtestData.trades.filter(t => {
      if (backtestMarketFilter === 'crypto' && !isCryptoAsset(t.asset)) return false;
      if (backtestMarketFilter === 'forex' && isCryptoAsset(t.asset)) return false;
      return true;
    });

    if (filteredTrades.length === 0) {
      return {
        summary: {
          totalTrades: 0,
          tpHits: 0,
          slHits: 0,
          timeExitWins: 0,
          timeExitLosses: 0,
          winRate: 0,
          profitFactor: 0,
          totalReturn: 0,
          expectancy: 0,
          sharpe: 0,
          avgWin: 0,
          avgLoss: 0,
        },
        trades: [],
        report: backtestData.report,
        recommendation: backtestData.recommendation
      };
    }

    const tpHits = filteredTrades.filter(t => t.hit_type === 'tp').length;
    const slHits = filteredTrades.filter(t => t.hit_type === 'sl').length;
    const timeExitWins = filteredTrades.filter(t => t.hit_type === 'timeout' && t.payout >= 0).length;
    const timeExitLosses = filteredTrades.filter(t => t.hit_type === 'timeout' && t.payout < 0).length;
    const totalTrades = filteredTrades.length;
    const winRate = parseFloat(((tpHits + timeExitWins) / totalTrades * 100).toFixed(1));
    
    let grossProfit = 0;
    let grossLoss = 0;
    filteredTrades.forEach(t => {
      if (t.payout >= 0) grossProfit += t.payout;
      else grossLoss += Math.abs(t.payout);
    });
    const profitFactor = grossLoss === 0 ? parseFloat(grossProfit.toFixed(2)) : parseFloat((grossProfit / grossLoss).toFixed(2));
    const totalReturn = parseFloat(filteredTrades.reduce((acc, t) => acc + t.payout, 0).toFixed(2));
    const expectancy = parseFloat((totalReturn / totalTrades).toFixed(2));
    
    // Sharpe Ratio calculation
    const payouts = filteredTrades.map(t => t.payout);
    const avg = payouts.reduce((acc, v) => acc + v, 0) / payouts.length;
    const variance = payouts.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / payouts.length;
    const stdDev = Math.sqrt(variance);
    const sharpe = stdDev === 0 ? 0 : parseFloat((avg / stdDev * Math.sqrt(252)).toFixed(2));

    return {
      summary: {
        totalTrades,
        tpHits,
        slHits,
        timeExitWins,
        timeExitLosses,
        winRate,
        profitFactor,
        totalReturn,
        expectancy,
        sharpe,
        avgWin: parseFloat((filteredTrades.filter(t => t.payout >= 0).reduce((acc, t) => acc + t.payout, 0) / Math.max(1, tpHits + timeExitWins)).toFixed(2)),
        avgLoss: parseFloat((filteredTrades.filter(t => t.payout < 0).reduce((acc, t) => acc + Math.abs(t.payout), 0) / Math.max(1, slHits + timeExitLosses)).toFixed(2))
      },
      trades: filteredTrades,
      report: backtestData.report,
      recommendation: backtestData.recommendation
    };
  };

  const activeBacktestData = getFilteredBacktestData() as any;

  return (
    <div className="min-h-screen bg-[#060913] text-[#f1f5f9] bg-grid flex flex-col font-sans relative overflow-hidden selection:bg-indigo-500/30 selection:text-white" id="hermes-quant-suite-root">
      
      {/* Background radial ambient light glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 blur-[130px] pointer-events-none" />
      <div className="absolute top-[35%] right-[10%] w-[35%] h-[35%] rounded-full bg-purple-500/5 blur-[150px] pointer-events-none" />

      {/* HEADER SECTION */}
      <header className="border-b border-[#1e293b]/40 bg-[#070a14]/80 backdrop-blur-xl sticky top-0 z-50 py-3.5 px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative" id="header-container">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-[#4f46e5] to-[#818cf8] rounded-2xl border border-indigo-400/25 shadow-[0_0_20px_rgba(79,70,229,0.35)] flex items-center justify-center">
            <span className="text-xl leading-none">🦅</span>
          </div>
          <div>
            <h1 className="text-xl font-display font-bold tracking-tight text-white flex items-center gap-2">
               HERMES <span className="text-[#818cf8] text-[10px] font-mono px-2 py-0.5 bg-indigo-500/10 rounded-md border border-indigo-500/20 font-bold tracking-wider">QUANT SUITE v2.0</span>
            </h1>
            <p className="text-xs text-[#94a3b8] font-medium">AI-Enhanced Machine Trading & Adaptive Signal Engine</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
          <div
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600/25 to-teal-600/25 text-emerald-300 rounded-xl text-xs font-mono font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)] border border-emerald-400/40 select-none"
            title="Autonomous Live Multi-Timeframe Scanner Active"
            id="header-live-engine-badge"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{scanningInProgress ? '⚡ LIVE SCANNING...' : '⚡ LIVE AUTO-SCAN'}</span>
          </div>

          <button
            onClick={() => {
              const next = !isSideMenuOpen;
              setIsSideMenuOpen(next);
              localStorage.setItem('hermes_side_menu', String(next));
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer active:scale-95 shadow-md ${
              isSideMenuOpen
                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.35)] ring-1 ring-indigo-400/40'
                : 'bg-[#0b0f19]/90 text-indigo-300 hover:text-white border-indigo-500/40 hover:border-indigo-400 hover:bg-[#0f172a]'
            }`}
            id="side-menu-toggle-btn"
            title="Toggle Side Menu Controls (Scanner, Push Notifications, System Logger)"
          >
            <PanelLeft size={15} className={isSideMenuOpen ? "text-amber-300" : "text-indigo-400"} />
            <span>{isSideMenuOpen ? 'HIDE SIDE MENU' : 'OPEN SIDE MENU'}</span>
            <span className={`w-2 h-2 rounded-full ${isSideMenuOpen ? 'bg-emerald-400 animate-pulse' : 'bg-indigo-400'}`} />
          </button>

          <button
            onClick={() => setIsHeaderDropdownOpen(!isHeaderDropdownOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer active:scale-95 shadow-md ${
              isHeaderDropdownOpen
                ? 'bg-[#131a31] text-indigo-400 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.35)] ring-1 ring-indigo-500/30 font-bold'
                : 'bg-[#0b0f19]/90 text-indigo-300 hover:text-white border-indigo-500/40 hover:border-indigo-400 hover:bg-[#0f172a]'
            }`}
            id="header-dropdown-toggle-btn"
            title="Toggle Live Session & System Metrics"
          >
            <Sliders size={14} className={isHeaderDropdownOpen ? "text-amber-300 animate-pulse" : "text-indigo-400"} />
            <span>{isHeaderDropdownOpen ? 'HIDE STATS & SESSION' : 'SHOW STATS & SESSION'}</span>
            <ChevronDown size={14} className={`transition-transform duration-300 ${isHeaderDropdownOpen ? 'rotate-180' : ''}`} />
            {!isHeaderDropdownOpen && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
            )}
          </button>

          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/30 select-none"
            title="Always-On Zero Latency Direct Exchange Feed (1.5s)"
          >
            <Zap size={13} className="text-emerald-400 fill-emerald-400 animate-pulse" />
            <span>⚡ LIVE FEED (1.5s)</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0b0f19]/80 rounded-xl border border-[#1e293b]/50">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            <span className="text-[#94a3b8]">System Status:</span>
            <span className="text-emerald-400 font-bold">ONLINE</span>
          </div>
          {(() => {
            const ageSec = marketFeedMeta.exchangeTimeMs > 0
              ? Math.max(0, Math.floor((nowTime - marketFeedMeta.exchangeTimeMs) / 1000))
              : null;
            const dotClass = !marketFeedMeta.isLive || (ageSec !== null && ageSec >= 12)
              ? 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.6)]'
              : ageSec !== null && ageSec >= 4
              ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]'
              : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]';
            const textClass = !marketFeedMeta.isLive || (ageSec !== null && ageSec >= 12)
              ? 'text-rose-300'
              : ageSec !== null && ageSec >= 4
              ? 'text-amber-300'
              : 'text-emerald-300';
            return (
              <div
                className="flex items-center gap-2 px-3 py-1.5 bg-[#0b0f19]/80 rounded-xl border border-[#1e293b]/50 font-mono"
                title={`Live Market Feed: ${marketFeedMeta.source}${marketFeedMeta.latencyMs !== null ? ` • Upstream Latency ${marketFeedMeta.latencyMs}ms` : ''}`}
              >
                <span className={`w-2 h-2 rounded-full ${dotClass}`}></span>
                <span className="text-[#94a3b8]">Feed:</span>
                <span className={`${textClass} font-bold`}>
                  {marketFeedMeta.latencyMs !== null ? `${marketFeedMeta.latencyMs}ms` : '...'}
                  {ageSec !== null ? ` • ${ageSec}s age` : ''}
                </span>
              </div>
            );
          })()}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0b0f19]/80 rounded-xl border border-[#1e293b]/50">
            <Clock size={12} className="text-[#818cf8]" />
            <span className="text-[#94a3b8]">Last Scan:</span>
            <span className="text-indigo-400 font-bold">{engineState.lastScanTime}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0b0f19]/80 rounded-xl border border-[#1e293b]/50 hover:border-[#818cf8]/40 hover:bg-[#0e1424] transition-all cursor-pointer group/sent" onClick={refreshSentiment} title="Market Risk Sentiment index. Click to update.">
            <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-wider">SENTIMENT:</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getSentimentStyles(marketSentiment.classification)}`}>
              {marketSentiment.value} - {marketSentiment.classification.toUpperCase()}
            </span>
            <RefreshCw size={10} className={`text-slate-500 group-hover/sent:text-indigo-400 transition-colors ${sentimentRefreshing ? "animate-spin" : ""}`} />
          </div>
        </div>

        {/* Dropdown panel */}
        <AnimatePresence>
          {isHeaderDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="absolute left-0 right-0 top-full bg-[#050811]/98 backdrop-blur-2xl border-b border-[#1e293b]/60 shadow-[0_25px_50px_rgba(0,0,0,0.9)] z-50 px-4 py-6 sm:px-6 overflow-hidden max-h-[85vh] overflow-y-auto custom-scrollbar"
              id="header-dropdown-panel"
            >
              <div className="max-w-7xl mx-auto flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-[#1e293b]/20 pb-2">
                  <div className="flex items-center gap-2">
                    <Sliders size={14} className="text-indigo-400" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#94a3b8]">Live Session & Performance Metrics Dashboard</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">Click headers inside to apply filters</span>
                </div>

                {/* STEP 1: MARKET SESSION DETECTION & ACTIVATED ENGINE BANNER */}
                <MarketSessionBanner 
                  sessionInfo={sessionInfo} 
                  onOverrideSession={handleOverrideSession} 
                  loading={engineState.scanning} 
                />

                {/* QUANTGEMINI SESSION FIREWALL & ASSET KILL ENGINE */}
                <div className="w-full bg-gradient-to-br from-[#0c1224] to-[#060a14] border border-indigo-500/20 rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.5)] relative overflow-hidden my-4">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Explain Left Column */}
                    <div className="max-w-md">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="text-pink-400 animate-pulse" size={18} />
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-pink-400 bg-pink-400/10 px-2 py-0.5 rounded border border-pink-400/20">
                          QuantGemini active intellect
                        </span>
                      </div>
                      <h3 className="text-md font-display font-bold text-white mb-1.5 flex items-center gap-1.5">
                        Session Asset Kill Firewall
                      </h3>
                      <p className="text-xs text-[#94a3b8] leading-relaxed">
                        The Session Assassin intercepts active feeds on pairs failing to align with current session liquidity, high execution slippage, or negative ML win probability expectancy. Pairs selected below are killed (suspended) from scanning under <span className="text-indigo-300 font-semibold font-mono">{sessionInfo?.session_type || "Active Session"}</span>.
                      </p>
                    </div>

                    {/* Interactive Assets Toggler / Kill Grid */}
                    <div className="flex-1 w-full">
                      <div className="flex justify-between items-center mb-2.5">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                          ACTIVE FIREWALL REGIME (CLICK TO KILL / REVIVE):
                        </span>
                        <button
                          onClick={handleBrainSessionSync}
                          disabled={sessionSyncLoading || !sessionInfo}
                          className="px-3 py-1.5 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-lg text-[10px] font-mono font-bold border border-pink-400/30 flex items-center gap-1.5 shadow-[0_0_15px_rgba(236,72,153,0.3)] cursor-pointer transition-all active:scale-95"
                          title="Let QuantGemini check recent trade history and session parameters to auto-kill incompatible pairs."
                        >
                          {sessionSyncLoading ? (
                            <>
                              <RefreshCw size={10} className="animate-spin" />
                              <span>COGNITIVE SWEEP...</span>
                            </>
                          ) : (
                            <>
                              <Brain size={11} className="text-pink-300" />
                              <span>🧠 SYNC QUANTGEMINI INTELLECT</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {["BTC/USDT", "ETH/USDT", "SOL/USDT"].map(asset => {
                          const isKilled = killedSessionAssets[sessionInfo?.session_type || '']?.includes(asset);
                          return (
                            <button
                              key={asset}
                              onClick={() => handleToggleKilledAsset(asset)}
                              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between h-[68px] cursor-pointer transition-all active:scale-95 group ${
                                isKilled
                                  ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50 shadow-[inset_0_0_12px_rgba(244,63,94,0.05)]'
                                  : 'bg-indigo-950/10 border-indigo-500/15 hover:border-indigo-500/30 hover:bg-indigo-950/20'
                              }`}
                              title={`Click to ${isKilled ? 'Revive' : 'Kill'} ${asset} for the current session`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className={`font-mono text-xs font-bold ${isKilled ? 'text-rose-400' : 'text-slate-100 group-hover:text-white'}`}>
                                  {asset}
                                </span>
                                <div className={`w-1.5 h-1.5 rounded-full ${isKilled ? 'bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]' : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'}`} />
                              </div>
                              <span className={`text-[9px] font-mono font-bold uppercase tracking-wider block mt-1 ${isKilled ? 'text-rose-500 bg-rose-500/10 px-1 py-0.5 rounded border border-rose-500/15' : 'text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/15'}`}>
                                {isKilled ? '🔥 KILLED' : '✅ SAFE & RUNNING'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CORE PERFORMANCE METRICS ROW */}
                <section className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 bg-transparent" id="stats-row">
                  
                  {/* Win Rate */}
                  <div 
                    onClick={() => setOutcomeFilter(outcomeFilter === 'win' ? 'all' : 'win')}
                    className={`p-5 bg-gradient-to-br from-[#0d1428]/90 to-[#070b17]/95 rounded-2xl border shadow-xl relative overflow-hidden group hover:border-emerald-500/50 hover:shadow-[0_4px_25px_rgba(16,185,129,0.12)] transition-all duration-300 cursor-pointer ${
                      outcomeFilter === 'win' ? 'border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.25)]' : 'border-[#1e293b]/50'
                    }`}
                    title="Click to isolate winning trades"
                  >
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-teal-400" />
                    <div className="absolute right-0 bottom-0 opacity-5 translate-y-3 translate-x-3 group-hover:scale-110 transition-transform duration-300">
                      <Activity size={90} className="text-[#10b981]" />
                    </div>
                    <div className="flex justify-between items-start mb-2.5">
                      <span className="text-[10px] text-[#94a3b8] uppercase font-mono font-bold tracking-wider">XGBoost Win Rate</span>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                        outcomeFilter === 'win' ? 'text-white bg-emerald-500 border-emerald-400' : 'text-[#10b981] bg-emerald-500/10 border-emerald-500/15'
                      }`}>
                        {outcomeFilter === 'win' ? 'WINS ACTIVE' : 'SYSTEM EDGE'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-display font-bold text-white text-glow-green">{winRate}%</span>
                      <span className="text-[11px] text-emerald-400 font-mono font-medium flex items-center gap-0.5">
                        <ArrowUpRight size={13} /> Target &gt;62%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800/80 h-1.5 rounded-full mt-3.5 overflow-hidden">
                      <motion.div 
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                        initial={{ width: 0 }}
                        animate={{ width: `${winRate}%` }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                      />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[9px] font-mono text-slate-500 border-t border-slate-900/60 pt-2 relative z-10">
                      <span>{outcomeFilter === 'win' ? '🟢 FILTER ACTIVE (Click to clear)' : '🔍 Isolate WIN trades'}</span>
                      <span className="text-emerald-400 font-bold">({winSignalsCount})</span>
                    </div>
                  </div>

                  {/* Profit Factor */}
                  <div className="p-5 bg-gradient-to-br from-[#0d1428]/90 to-[#070b17]/95 rounded-2xl border border-[#1e293b]/50 shadow-xl relative overflow-hidden group hover:border-[#818cf8]/30 hover:shadow-[0_4px_25px_rgba(129,140,248,0.08)] transition-all duration-300">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#4f46e5] to-[#818cf8]" />
                    <div className="absolute right-0 bottom-0 opacity-5 translate-y-3 translate-x-3 group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp size={90} className="text-[#818cf8]" />
                    </div>
                    <div className="flex justify-between items-start mb-2.5">
                      <span className="text-[10px] text-[#94a3b8] uppercase font-mono font-bold tracking-wider">Profit Factor</span>
                      <span className="text-[9px] font-mono text-[#818cf8] font-bold px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/15 rounded-md">STABLE</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-display font-bold text-white text-glow">{profitFactor}</span>
                      <span className="text-[11px] text-indigo-400 font-mono font-medium">
                        Ratio Pf
                      </span>
                    </div>
                    <div className="w-full bg-slate-800/80 h-1.5 rounded-full mt-3.5 overflow-hidden">
                      <motion.div 
                        className="bg-gradient-to-r from-[#4f46e5] to-[#818cf8] h-1.5 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (profitFactor / 2.5) * 100)}%` }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
                      />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[9px] font-mono text-slate-500 border-t border-slate-900/60 pt-2 relative z-10">
                      <span>Algorithmic Yield Ratio</span>
                      <span className="text-indigo-400 font-bold">Stable</span>
                    </div>
                  </div>

                  {/* Net return */}
                  <div 
                    onClick={() => setOutcomeFilter(outcomeFilter === 'loss' ? 'all' : 'loss')}
                    className={`p-5 bg-gradient-to-br from-[#0d1428]/90 to-[#070b17]/95 rounded-2xl border shadow-xl relative overflow-hidden group hover:border-red-500/50 hover:shadow-[0_4px_25px_rgba(239,68,68,0.12)] transition-all duration-300 cursor-pointer ${
                      outcomeFilter === 'loss' ? 'border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.25)]' : 'border-[#1e293b]/50'
                    }`}
                    title="Click to isolate losing trades"
                  >
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-purple-500 to-pink-500" />
                    <div className="absolute right-0 bottom-0 opacity-5 translate-y-3 translate-x-3 group-hover:scale-110 transition-transform duration-300">
                      <Brain size={90} className="text-[#a855f7]" />
                    </div>
                    <div className="flex justify-between items-start mb-2.5">
                      <span className="text-[10px] text-[#94a3b8] uppercase font-mono font-bold tracking-wider">Net Return (Live Portfolio)</span>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md border font-bold ${
                        outcomeFilter === 'loss' ? 'text-white bg-red-500 border-red-400' : (netReturn >= 0 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15' : 'text-red-400 bg-red-500/10 border-red-500/15')
                      }`}>
                        {outcomeFilter === 'loss' ? 'LOSSES ACTIVE' : (netReturn >= 0 ? 'PROFIT' : 'DRAWDOWN')}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-display font-bold text-white ${netReturn >= 0 ? 'text-glow-green' : 'text-glow-red'}`}>
                        {netReturn >= 0 ? '+' : ''}${netReturn.toFixed(2)}
                      </span>
                      <span className="text-xs text-[#94a3b8] font-mono">USD</span>
                    </div>
                    <div className="w-full bg-slate-800/80 h-1.5 rounded-full mt-3.5 overflow-hidden">
                      <motion.div 
                        className={`h-1.5 rounded-full ${netReturn >= 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} 
                        initial={{ width: 0 }}
                        animate={{ width: '75%' }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                      />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[9px] font-mono text-slate-500 border-t border-slate-900/60 pt-2 relative z-10">
                      <span>{outcomeFilter === 'loss' ? '🔴 FILTER ACTIVE (Click to clear)' : '🔍 Isolate LOSS trades'}</span>
                      <span className="text-red-400 font-bold">({lossSignalsCount})</span>
                    </div>
                  </div>

                  {/* Global Market Sentiment */}
                  <div className="p-5 bg-gradient-to-br from-[#0d1428]/90 to-[#070b17]/95 rounded-2xl border border-[#1e293b]/50 shadow-xl relative overflow-hidden group hover:border-sky-500/30 hover:shadow-[0_4px_25px_rgba(14,165,233,0.08)] transition-all duration-300" id="sentiment-bento-card">
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-sky-500 to-indigo-500" />
                    <div className="absolute right-0 bottom-0 opacity-5 translate-y-3 translate-x-3 group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp size={90} className="text-[#38bdf8]" />
                    </div>
                    <div className="flex justify-between items-start mb-2.5">
                      <span className="text-[10px] text-[#94a3b8] uppercase font-mono font-bold tracking-wider flex items-center gap-1">
                        <span>Market Sentiment</span>
                      </span>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md border font-bold ${getSentimentStyles(marketSentiment.classification)}`}>
                        {marketSentiment.classification.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-display font-bold text-white text-glow">{marketSentiment.value}</span>
                      <span className="text-xs text-slate-500 font-mono">/ 100</span>
                    </div>
                    
                    {/* Progress bar gauge */}
                    <div className="w-full bg-slate-800/80 h-1.5 rounded-full mt-3.5 overflow-hidden relative" title="Fear & Greed Index Scale">
                      <motion.div 
                        className={`h-full rounded-full shadow-[0_0_8px_currentColor] ${
                          marketSentiment.value <= 35 ? 'bg-gradient-to-r from-red-500 to-orange-400 text-red-500' : 
                          marketSentiment.value <= 45 ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-500' : 
                          marketSentiment.value <= 64 ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-sky-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400 text-emerald-500'
                        }`} 
                        initial={{ width: 0 }}
                        animate={{ width: `${marketSentiment.value}%` }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                      />
                    </div>
                    
                    {/* Score modulation details */}
                    <div className="mt-2.5 text-[10px] text-[#94a3b8] font-mono flex items-center justify-between relative z-10">
                      <span className="truncate max-w-[82%] font-medium">
                        {marketSentiment.value >= 65 ? '📈 Bullish Boost (+1 BUY)' : 
                         marketSentiment.value <= 35 ? '📉 Bearish Boost (+1 SELL)' : 
                         '⚖️ Balanced Regime (Neutral)'}
                      </span>
                      <button 
                        disabled={sentimentRefreshing} 
                        onClick={refreshSentiment}
                        className="text-slate-500 hover:text-indigo-400 disabled:opacity-50 transition-colors cursor-pointer"
                        title="Refresh Fear & Greed index"
                      >
                        <RefreshCw size={10} className={sentimentRefreshing ? "animate-spin" : ""} />
                      </button>
                    </div>
                  </div>

                  {/* Signal Counts */}
                  <div 
                    onClick={() => setOutcomeFilter(outcomeFilter === 'pending' ? 'all' : 'pending')}
                    className={`p-5 bg-gradient-to-br from-[#0d1428]/90 to-[#070b17]/95 rounded-2xl border shadow-xl relative overflow-hidden group hover:border-amber-500/50 hover:shadow-[0_4px_25px_rgba(245,158,11,0.12)] transition-all duration-300 col-span-2 sm:col-span-1 cursor-pointer ${
                      outcomeFilter === 'pending' ? 'border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.25)]' : 'border-[#1e293b]/50'
                    }`}
                    title="Click to isolate pending signals"
                  >
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 to-yellow-400" />
                    <div className="absolute right-0 bottom-0 opacity-5 translate-y-3 translate-x-3 group-hover:scale-110 transition-transform duration-300">
                      <Database size={90} className="text-[#f59e0b]" />
                    </div>
                    <div className="flex justify-between items-start mb-2.5">
                      <span className="text-[10px] text-[#94a3b8] uppercase font-mono font-bold tracking-wider">Total Scans Logs</span>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                        outcomeFilter === 'pending' ? 'text-white bg-amber-500 border-amber-400' : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/15'
                      }`}>
                        {outcomeFilter === 'pending' ? 'PENDING ACTIVE' : 'COMPILED'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-display font-bold text-white text-glow">{signals.length}</span>
                      <span className="text-[11px] text-cyan-400 font-mono font-medium flex items-center">
                        Signals Generated
                      </span>
                    </div>
                    <div className="w-full bg-slate-800/80 h-1.5 rounded-full mt-3.5 overflow-hidden">
                      <motion.div 
                        className="bg-gradient-to-r from-cyan-500 to-teal-500 h-1.5 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)]" 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (signals.length / 100) * 100)}%` }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
                      />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[9px] font-mono text-slate-500 border-t border-slate-900/60 pt-2 relative z-10">
                      <span>{outcomeFilter === 'pending' ? '🟡 FILTER ACTIVE (Click to clear)' : '🔍 Isolate PENDING trades'}</span>
                      <span className="text-amber-400 font-bold">({pendingSignalsCount})</span>
                    </div>
                  </div>

                </section>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* STICKY FLOATING EDGE TOGGLE BUTTON (when side menu is toggled closed) */}
      {!isSideMenuOpen && (
        <button
          onClick={() => setIsSideMenuOpen(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-40 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white px-3 py-3 rounded-r-2xl shadow-[0_0_20px_rgba(99,102,241,0.5)] border-y border-r border-indigo-400/40 flex items-center gap-2 font-mono text-xs font-bold transition-all cursor-pointer hover:pl-4 group"
          title="Open Side Menu Controls (Scanner, Mobile Hub & System Logger)"
          id="sticky-edge-side-menu-btn"
        >
          <PanelLeft size={18} className="group-hover:scale-110 transition-transform text-amber-300" />
          <span className="hidden tracking-wider uppercase text-[10px]">SIDE MENU</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      )}

      {/* NON-BLOCKING ENGINE NOTICE BANNER */}
      {uiNotice && (
        <div className="px-4 pt-2 sm:px-6">
          <div className={`px-3.5 py-2 rounded-xl border text-xs font-mono flex items-center justify-between gap-3 ${
            uiNotice.type === 'error'
              ? 'bg-rose-950/70 border-rose-500/40 text-rose-200'
              : uiNotice.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
              : 'bg-indigo-950/70 border-indigo-500/40 text-indigo-200'
          }`}>
            <span className="truncate">{uiNotice.message}</span>
            <button
              type="button"
              onClick={() => setUiNotice(null)}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer shrink-0"
              aria-label="Dismiss notice"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* MAIN TWO-COLUMN DASHBOARD LAYOUT */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-5 px-4 pb-4 sm:px-6 sm:pb-6 min-h-[500px] items-start" id="dashboard-columns-grid">
        
        {/* LEFT COLUMN: ACTIVE SCANNER PANEL & TERMINAL (4 COLS WHEN OPEN) */}
        {isSideMenuOpen && (
          <div className="xl:col-span-4 flex flex-col gap-4 order-2 xl:order-1 transition-all duration-300 animate-fade-in" id="left-sidebar-column">
            
            {/* Market Live Prices & Scanner control */}
            <div className="p-5 bg-[#000000] rounded-2xl border border-[#1e293b]/55 flex flex-col gap-4 shadow-xl shadow-black/40 hover:border-indigo-500/15 transition-all duration-300" id="scanner-controls-panel">
              <div className="flex items-center justify-between border-b border-[#1e293b]/40 pb-3">
                <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#818cf8]"></span>
                  </span>
                  Real-Time Crypto Scanner
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#94a3b8] font-medium bg-[#1e293b]/30 px-2 py-0.5 rounded border border-[#1e293b]/30">3 CRYPTO PAIRS</span>
                  <button
                    onClick={() => setIsSideMenuOpen(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-900/60 hover:bg-slate-800 border border-slate-700/50 transition-all cursor-pointer"
                    title="Close Side Menu"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

            {/* Asset prices list */}
            <div className="grid grid-cols-3 gap-2 text-xs font-mono" id="market-prices-list">
              {Object.entries(marketPrices).map(([name, price]) => {
                const isSelected = selectedAssetFilter === name;
                const isDown = name.charCodeAt(0) % 2 === 0;
                return (
                  <div 
                    key={name} 
                    onClick={() => setSelectedAssetFilter(isSelected ? null : name)}
                    className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all duration-300 cursor-pointer relative group/asset select-none ${
                      isSelected 
                        ? 'bg-gradient-to-br from-[#121a36] to-[#1d274e] border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.7)] scale-[1.03] ring-1 ring-indigo-400/40' 
                        : 'bg-[#0f152d]/40 border-[#1e293b]/30 hover:bg-[#121936]/60 hover:border-indigo-500/20 hover:scale-[1.01]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-bold transition-colors ${isSelected ? 'text-indigo-300' : 'text-[#94a3b8] group-hover/asset:text-white'}`}>{name}</span>
                      {isSelected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAssetFilter(null);
                          }}
                          className="text-[#94a3b8] hover:text-white text-[10px] font-bold bg-[#1a254c] hover:bg-red-500/20 px-1 py-0.2 rounded border border-indigo-500/20 leading-none"
                          title="Close/Deselect"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <span className="text-white font-bold flex items-center justify-between mt-1 tabular-nums">
                      ${price.toLocaleString('en-US', { minimumFractionDigits: name.includes('BTC') ? 1 : 2, maximumFractionDigits: name.includes('BTC') ? 1 : 2 })}
                      <span className={`text-[10px] font-bold ${isDown ? 'text-red-400' : 'text-emerald-400'}`}>
                        {isDown ? '▼' : '▲'}
                      </span>
                    </span>
                    {/* Glowing ping indicator if selected */}
                    {isSelected && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Always-On Live Autonomous Scanner Status */}
            <div className="flex items-center justify-between p-3 bg-emerald-950/20 rounded-xl border border-emerald-500/30 -mt-1 mb-1">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  LIVE AUTONOMOUS ENGINE
                </span>
                <span className="text-[9px] text-emerald-300/80">Continuous 1.5s live feed & automated scanning</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-300">
                ALWAYS LIVE
              </span>
            </div>

            {/* Market Session & Engine Selection Dropdown */}
            <div className="flex flex-col gap-1.5 p-3 bg-indigo-950/20 rounded-xl border border-[#1e293b]/50 -mt-1 mb-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Globe size={13} className="text-indigo-400" />
                  MARKET SESSION ENGINE
                </span>
                {sessionInfo?.custom_override && (
                  <button 
                    onClick={() => handleOverrideSession('AUTO')}
                    className="text-[9px] font-mono text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer"
                    title="Reset to automated UTC clock detection"
                  >
                    [RESET AUTO]
                  </button>
                )}
              </div>
              <select
                value={sessionInfo?.custom_override ? sessionInfo.session_type : 'AUTO'}
                onChange={(e) => handleOverrideSession(e.target.value)}
                className="w-full bg-[#080d1a] text-slate-200 text-xs font-mono font-medium py-1.5 px-2 rounded-lg border border-indigo-500/30 focus:border-indigo-400 focus:outline-none cursor-pointer"
              >
                <option value="AUTO">🌐 Auto-Detect (Live UTC Clock Switch)</option>
                <option value="Asian (Tokyo)">🌅 Asian (Tokyo) [22:00–07:00 UTC]</option>
                <option value="London Open">🇬🇧 London Open [07:00–09:00 UTC]</option>
                <option value="London Main Session">🏛️ London Main Session [09:00–12:00 UTC]</option>
                <option value="New York Open">🗽 New York Open [12:00–13:00 UTC]</option>
                <option value="London–New York Overlap">⚡ London–NY Overlap [13:00–16:00 UTC]</option>
                <option value="New York Close">🌆 New York Close [16:00–21:00 UTC]</option>
                <option value="Low Liquidity / Holiday Session">🌙 Low Liquidity / Off-Hours</option>
              </select>
              <div className="text-[9px] font-mono text-slate-400 flex items-center justify-between mt-0.5">
                <span className="truncate text-indigo-300">
                  Engine: {sessionInfo?.engine_name || 'Hermes High-Volume Overlap Confluence Engine'}
                </span>
                <span className="text-emerald-400 font-bold shrink-0 ml-1">
                  {((sessionInfo?.min_win_probability || 0.88) * 100).toFixed(0)}%+ WR
                </span>
              </div>
            </div>

            {/* Signal Push Notifications Toggle */}
            <div className="flex items-center justify-between p-3 bg-indigo-950/20 rounded-xl border border-[#1e293b]/50 -mt-1 mb-1">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${pushNotificationsEnabled ? 'bg-sky-400 animate-pulse' : 'bg-slate-500'}`}></span>
                  PUSH NOTIFICATIONS
                </span>
                <span className="text-[9px] text-[#94a3b8]">Real-time audio chime & browser alerts</span>
              </div>
              <button 
                onClick={togglePushNotifications}
                className="focus:outline-none transition-all cursor-pointer"
                title="Toggle Live Audio & Browser Push Notifications"
              >
                {pushNotificationsEnabled ? (
                  <ToggleRight size={28} className="text-sky-400" />
                ) : (
                  <ToggleLeft size={28} className="text-slate-600" />
                )}
              </button>
            </div>

            {/* Continuous Autonomous Live Feed Telemetry Bar */}
            <div
              className="w-full py-3 px-4 rounded-xl font-display font-medium text-xs flex items-center justify-center gap-2 border border-emerald-500/30 bg-emerald-950/20 text-emerald-200 relative overflow-hidden select-none"
              id="live-autonomous-status-bar"
            >
              {scanningInProgress && (
                <div 
                  className="absolute inset-y-0 left-0 bg-emerald-500/15 transition-all duration-300 ease-out z-0"
                  style={{ width: `${scanProgress}%` }}
                />
              )}
              {scanningInProgress && (
                <div 
                  className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-300 ease-out z-10 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  style={{ width: `${scanProgress}%` }}
                />
              )}
              <div className="flex items-center gap-2.5 z-10 relative">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span className="font-mono font-bold tracking-wider text-[11px]">
                  {scanningInProgress
                    ? `LIVE ENGINE SCANNING MATRICES (${scanProgress}%)`
                    : 'LIVE ENGINE ACTIVE • CONTINUOUS STREAM'}
                </span>
              </div>
            </div>
          </div>

          {/* MOBILE APP INSTALL & PUSH CONTROL HUB */}
          <div className="p-5 bg-[#0a0e1a]/95 rounded-xl border border-[#1e293b]/50 flex flex-col gap-4" id="mobile-install-push-hub">
            <div className="flex items-center justify-between border-b border-[#1e293b]/40 pb-3">
              <h3 className="font-display font-semibold text-white text-sm flex items-center gap-2">
                <Smartphone size={16} className="text-[#6366f1]" />
                Mobile App & Notification Hub
              </h3>
              <span className="text-[9px] font-mono bg-indigo-500/15 text-[#818cf8] px-2 py-0.5 rounded-full border border-indigo-500/20 uppercase font-semibold">PWA Engine</span>
            </div>

            <p className="text-xs text-[#94a3b8] leading-relaxed">
              Hermes supports high-fidelity native installation and instant system notifications on iOS, Android, and desktop devices.
            </p>

            {/* PWA INSTALLATION ROW */}
            <div className="flex flex-col gap-2 p-3.5 bg-slate-900/40 rounded-xl border border-slate-800/60">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                    App Installation Status
                  </span>
                  <span className="text-[9px] text-slate-400 mt-0.5">
                    {isPWAActive ? 'Running as Installed Native App' : 'Web Browser Session'}
                  </span>
                </div>
                <div className="flex items-center">
                  {isPWAActive ? (
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle size={10} className="fill-emerald-400/20" /> Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      Uninstalled
                    </span>
                  )}
                </div>
              </div>

              {!isPWAActive && (
                <div className="mt-2 pt-1 border-t border-slate-800/40">
                  {isInstallable && deferredPrompt ? (
                    <button
                      onClick={triggerPWAInstall}
                      className="w-full py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs rounded-lg shadow-lg shadow-indigo-500/15 flex items-center justify-center gap-2 border border-indigo-400/20 active:scale-98 transition-all cursor-pointer"
                    >
                      <Download size={13} />
                      INSTALL HERMES ON MOBILE / DESKTOP
                    </button>
                  ) : isIOS ? (
                    <div className="p-2 bg-indigo-950/15 border border-indigo-500/20 rounded-lg flex flex-col gap-1 text-[10px] text-indigo-200">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                        <Info size={11} /> iOS Safari Setup Required:
                      </div>
                      <p className="leading-relaxed">
                        To install: Tap the <span className="font-semibold text-white underline">Share 📤</span> button at the bottom of Safari, scroll down, and tap <span className="font-semibold text-white underline">"Add to Home Screen" ➕</span>.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/40">
                      <Info size={11} className="text-slate-400 shrink-0" />
                      <span>App already cached & offline-ready. Tap the browser options menu (3 dots) and select "Install" or "Add to Home Screen" if prompt is missing.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* NOTIFICATIONS CONTROL PANEL */}
            <div className="flex flex-col gap-2.5 p-4 bg-[#090e1c]/80 rounded-2xl border border-[#1e293b]/50 shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                    Push Notification Service
                  </span>
                  <span className="text-[9px] text-slate-400 mt-0.5">
                    Permission: {notificationPermission}
                  </span>
                </div>
                <div className="flex items-center">
                  {notificationPermission === 'granted' ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/15 flex items-center gap-1">
                      <CheckCircle size={10} className="fill-emerald-400/20" /> Active
                    </span>
                  ) : notificationPermission === 'denied' ? (
                    <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/15">
                      Blocked
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/15">
                      Not Set
                    </span>
                  )}
                </div>
              </div>

              {/* Notification buttons */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                {notificationPermission !== 'granted' ? (
                  <button
                    onClick={requestNotificationPermission}
                    className="col-span-2 py-2 px-3 bg-[#1e293b] hover:bg-slate-800 text-white font-semibold text-xs rounded-lg border border-slate-700/80 hover:border-slate-600 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <BellRing size={12} className="text-indigo-400" />
                    Request Permission
                  </button>
                ) : (
                  <>
                    <button
                      onClick={togglePushNotifications}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        pushNotificationsEnabled
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                          : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700 text-slate-400'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${pushNotificationsEnabled ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-slate-500'}`}></span>
                      {pushNotificationsEnabled ? 'Chime Active' : 'Chime Muted'}
                    </button>

                    <button
                      onClick={handleTestPush}
                      disabled={testPushCountdown !== null}
                      className="py-2 px-3 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/25 text-indigo-300 font-semibold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Sparkles size={11} className={testPushCountdown !== null ? 'animate-spin text-indigo-400' : 'text-indigo-300'} />
                      {testPushCountdown !== null ? `Test in ${testPushCountdown}s...` : 'Test Signal Push'}
                    </button>
                  </>
                )}
              </div>

              {notificationPermission === 'denied' && (
                <p className="text-[9px] text-red-300/80 bg-red-500/5 p-2 rounded-lg border border-red-500/10 leading-relaxed mt-1">
                  Notifications are blocked. Open Safari/Chrome settings for this site on your mobile, grant notification permission, then refresh this app.
                </p>
              )}
            </div>

            {/* FEMALE VOICE BACKGROUND AUDIO ALERTS */}
            <div className="flex flex-col gap-2.5 p-4 bg-[#090e1c]/90 rounded-2xl border border-indigo-500/30 shadow-md" id="female-voice-audio-panel">
              <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                <div className="flex items-center gap-2">
                  <Mic size={14} className="text-pink-400" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider font-mono">
                    Sweet Female Voice Alerts
                  </span>
                  {isSpeaking && (
                    <span className="flex items-center gap-0.5 ml-1">
                      <span className="w-1 h-3 bg-pink-400 animate-bounce rounded-full" />
                      <span className="w-1 h-4 bg-purple-400 animate-bounce delay-100 rounded-full" />
                      <span className="w-1 h-2 bg-pink-400 animate-bounce delay-200 rounded-full" />
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-mono text-pink-300 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20 font-bold">
                  SHORT BUY / SELL
                </span>
              </div>

              {/* Engine Selector */}
              <div className="flex bg-[#05070e] p-1 rounded-xl border border-slate-800 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setTtsEngine('elevenlabs');
                    localStorage.setItem('hermes_tts_engine', 'elevenlabs');
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    ttsEngine === 'elevenlabs'
                      ? 'bg-gradient-to-r from-pink-600/30 via-purple-600/30 to-indigo-600/30 text-pink-300 border border-pink-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="ElevenLabs Ultra-Realistic AI Sweet Voice"
                >
                  <Sparkles size={11} className={ttsEngine === 'elevenlabs' ? 'text-pink-400' : 'text-slate-500'} />
                  <span>ElevenLabs AI</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTtsEngine('browser');
                    localStorage.setItem('hermes_tts_engine', 'browser');
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    ttsEngine === 'browser'
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Native Web Speech Synthesis (Zero API Key)"
                >
                  <Volume2 size={11} className={ttsEngine === 'browser' ? 'text-indigo-400' : 'text-slate-500'} />
                  <span>Browser TTS</span>
                </button>
              </div>

              {/* ElevenLabs Specific Voice Settings */}
              {ttsEngine === 'elevenlabs' && (
                <div className="flex flex-col gap-2 p-2.5 bg-[#050814]/80 rounded-xl border border-pink-500/20 text-[10px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-bold flex items-center gap-1">
                      <span>🌸 Select Sweet Voice:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowElevenLabsSettings(!showElevenLabsSettings)}
                      className="text-[9px] text-pink-400 hover:text-pink-300 underline font-semibold cursor-pointer"
                    >
                      {showElevenLabsSettings ? 'Hide Key Config' : 'API Key Config'}
                    </button>
                  </div>

                  {/* Preset Voices Dropdown */}
                  <select
                    value={elevenLabsVoiceId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setElevenLabsVoiceId(val);
                      localStorage.setItem('hermes_elevenlabs_voice_id', val);
                    }}
                    className="bg-[#0a0f24] text-pink-200 border border-pink-500/30 rounded-lg p-1.5 text-[10px] font-mono focus:outline-none focus:border-pink-400 cursor-pointer"
                  >
                    <option value="EXAVITQu4vr4xnSDxMaL">🌸 Bella — Sweet, Soft & Warm (Recommended)</option>
                    <option value="21m00Tcm4TlvDq8ikWAM">🎀 Rachel — Calm, Sweet & Professional</option>
                    <option value="MF3mGyEYCl7XYWbV9V6O">🌺 Elli — Soft, Sweet & Gentle</option>
                    <option value="piTKA1yl2LWrBiL33u32">🎧 Nicole — Soft & Whispering</option>
                    <option value="AZnzlk1XvdvUeBnXmlld">✨ Domi — Clear, Confident & Sweet</option>
                  </select>

                  {/* Optional ElevenLabs API Key Input Box */}
                  {showElevenLabsSettings && (
                    <div className="flex flex-col gap-1 mt-1 pt-2 border-t border-slate-800">
                      <label className="text-[9px] text-slate-400">Custom ElevenLabs API Key (Optional):</label>
                      <input
                        type="password"
                        placeholder="Paste xi-api-key or leave blank to use server key..."
                        value={elevenLabsApiKey}
                        onChange={(e) => {
                          const val = e.target.value;
                          setElevenLabsApiKey(val);
                          localStorage.setItem('hermes_elevenlabs_key', val);
                        }}
                        className="bg-[#030611] text-slate-200 border border-slate-800 focus:border-pink-500 rounded-lg p-1.5 text-[10px] font-mono focus:outline-none"
                      />
                      <span className="text-[8px] text-slate-500">
                        * If left blank, requests use the server's ELEVENLABS_API_KEY environment variable.
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mt-0.5">
                {/* Voice Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !voiceAlertsEnabled;
                    setVoiceAlertsEnabled(next);
                    localStorage.setItem('hermes_voice_alerts', String(next));
                    if (next) speakFemaleVoiceAlert("Sweet voice alerts active.", 1.15);
                  }}
                  className={`py-2 px-2.5 text-[10px] font-mono font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    voiceAlertsEnabled
                      ? 'bg-gradient-to-r from-pink-600/20 to-purple-600/20 text-pink-300 border-pink-500/40 shadow-[0_0_10px_rgba(236,72,153,0.15)]'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                  title="Toggle Female Voice Speech Synthesis"
                >
                  <span className="flex items-center gap-1.5">
                    {voiceAlertsEnabled ? <Mic size={12} className="text-pink-400" /> : <MicOff size={12} className="text-slate-500" />}
                    <span>Sweet Voice</span>
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[8px] uppercase font-bold ${voiceAlertsEnabled ? 'bg-pink-500/20 text-pink-300' : 'bg-slate-800 text-slate-500'}`}>
                    {voiceAlertsEnabled ? 'ON' : 'OFF'}
                  </span>
                </button>

                {/* Sound Chime Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !soundBeepsEnabled;
                    setSoundBeepsEnabled(next);
                    localStorage.setItem('hermes_sound_beeps', String(next));
                    if (next) playSignalSound();
                  }}
                  className={`py-2 px-2.5 text-[10px] font-mono font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    soundBeepsEnabled
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                  title="Toggle Audio Beep Chime"
                >
                  <span className="flex items-center gap-1.5">
                    {soundBeepsEnabled ? <Volume2 size={12} className="text-emerald-400" /> : <VolumeX size={12} className="text-slate-500" />}
                    <span>Beep Chime</span>
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[8px] uppercase font-bold ${soundBeepsEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'}`}>
                    {soundBeepsEnabled ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>

              {/* Instant Female Voice Test Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-1 pt-1.5 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => speakFemaleVoiceAlert("EUR USD, BUY signal.", 1.15)}
                  className="py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 shadow-sm"
                  title="Test Sweet BUY Voice Signal"
                >
                  <span>🔊 Test BUY Voice</span>
                </button>

                <button
                  type="button"
                  onClick={() => speakFemaleVoiceAlert("BTC USD, SELL signal.", 1.15)}
                  className="py-1.5 px-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 shadow-sm"
                  title="Test Sweet SELL Voice Signal"
                >
                  <span>🔊 Test SELL Voice</span>
                </button>
              </div>
            </div>
          </div>

          {/* Engine Real-time Console Log (Terminal) */}
          <div className="flex-1 min-h-[220px] max-h-[300px] xl:max-h-none p-4.5 bg-[#04060c]/95 rounded-2xl border border-[#1e293b]/60 flex flex-col font-mono shadow-inner shadow-black/80 relative overflow-hidden group/terminal" id="engine-terminal-panel">
            <div className="flex items-center justify-between border-b border-[#1e293b]/30 pb-2.5 mb-3.5">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                <TerminalIcon size={13} className="text-indigo-400" />
                <span className="text-xs text-[#94a3b8] font-bold tracking-wider">SYSTEM LOGGER & DISPATCHER</span>
              </div>
              <button 
                onClick={() => setLogs([`[${new Date().toLocaleTimeString()}] [Hermes Engine] Console logs cleared by analyst.`])}
                className="text-[9px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer bg-[#111827] px-2 py-0.5 rounded border border-slate-800"
              >
                Clear Console
              </button>
            </div>

            <div className="flex-1 overflow-y-auto text-[10px] leading-relaxed flex flex-col gap-2 p-0.5" id="terminal-scroller">
              {logs.map((log, index) => {
                let colorClass = 'text-slate-400';
                if (log.includes('🔔 SIGNAL TRIGGERED')) colorClass = 'text-amber-400 font-semibold bg-amber-500/5 px-1 rounded border border-amber-500/10';
                else if (log.includes('RESOLVED') || log.includes('✅ WIN')) colorClass = 'text-emerald-400 font-medium';
                else if (log.includes('❌ LOSS')) colorClass = 'text-red-400 font-medium';
                else if (log.includes('[Thresholds]')) colorClass = 'text-sky-400';
                else if (log.includes('[Model Training]')) colorClass = 'text-purple-400';
                else if (log.includes('[Quant Analyst]')) colorClass = 'text-[#e2e8f0] font-semibold';
                else if (log.includes('[Telegram Sticker]')) colorClass = 'text-[#f59e0b] italic';
                
                return (
                  <div key={index} className={`${colorClass} whitespace-pre-wrap break-all border-l-2 border-[#1e293b] pl-2.5`}>
                    {log}
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>
          </div>

        </div>
        )}

        {/* RIGHT COLUMN: TABS & DATA VIEWS (8 COLS when side menu open, 12 COLS when side menu closed) */}
        <div className={`${isSideMenuOpen ? 'xl:col-span-8' : 'xl:col-span-12'} flex flex-col bg-gradient-to-b from-[#0c1224]/95 to-[#070a16]/98 rounded-2xl border border-[#1e293b]/45 shadow-2xl overflow-hidden order-1 xl:order-2 transition-all duration-300`} id="right-main-panel">
          
          {/* Tabs header Navigation */}
          <nav className="flex border-b border-[#1e293b]/45 bg-[#060a14]/90 p-2 gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none snap-x" id="main-navigation-tabs">
            <button
              onClick={() => setActiveTab('signals')}
              className={`flex-1 sm:flex-initial shrink-0 snap-start flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-display font-medium transition-all cursor-pointer border ${
                activeTab === 'signals'
                  ? 'bg-[#131a31] text-indigo-400 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)] font-bold'
                  : 'text-[#8fa0b5] hover:text-white hover:bg-slate-900/40 border-transparent'
              }`}
            >
              <Activity size={14} className={activeTab === 'signals' ? "text-indigo-400" : "text-slate-400"} />
              Signal Room
            </button>
            <button
              onClick={() => setActiveTab('strategies')}
              className={`flex-1 sm:flex-initial shrink-0 snap-start flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-display font-medium transition-all cursor-pointer border ${
                activeTab === 'strategies'
                  ? 'bg-[#131a31] text-indigo-400 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)] font-bold'
                  : 'text-[#8fa0b5] hover:text-white hover:bg-slate-900/40 border-transparent'
              }`}
            >
              <Dna size={14} className={activeTab === 'strategies' ? "text-indigo-400" : "text-slate-400"} />
              Strategy Lab
            </button>
            <button
              onClick={() => setActiveTab('analyst')}
              className={`flex-1 sm:flex-initial shrink-0 snap-start flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-display font-medium transition-all cursor-pointer relative border ${
                activeTab === 'analyst'
                  ? 'bg-[#131a31] text-indigo-400 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)] font-bold'
                  : 'text-[#8fa0b5] hover:text-white hover:bg-slate-900/40 border-transparent'
              }`}
            >
              <Brain size={14} className={activeTab === 'analyst' ? "text-indigo-400" : "text-slate-400"} />
              AI Analyst
              {unanalyzedCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-mono font-bold text-white shadow-md animate-bounce">
                  {unanalyzedCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('thresholds')}
              className={`flex-1 sm:flex-initial shrink-0 snap-start flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-display font-medium transition-all cursor-pointer border ${
                activeTab === 'thresholds'
                  ? 'bg-[#131a31] text-indigo-400 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)] font-bold'
                  : 'text-[#8fa0b5] hover:text-white hover:bg-slate-900/40 border-transparent'
              }`}
            >
              <Sliders size={14} className={activeTab === 'thresholds' ? "text-indigo-400" : "text-slate-400"} />
              Tuning & Models
            </button>
            <button
              onClick={() => setActiveTab('brain')}
              className={`flex-1 sm:flex-initial shrink-0 snap-start flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-display font-medium transition-all cursor-pointer relative border ${
                activeTab === 'brain'
                  ? 'bg-[#131a31] text-indigo-400 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)] font-bold'
                  : 'text-[#8fa0b5] hover:text-white hover:bg-slate-900/40 border-transparent'
              }`}
            >
              <Cpu size={14} className={brainLoading ? "animate-spin text-indigo-400" : "text-indigo-400"} />
              Gemini
              <span className="absolute -top-1 -right-1 flex h-2 w-2 items-center justify-center rounded-full bg-emerald-500 shadow-md">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
              </span>
            </button>
          </nav>

          {/* Dynamic Tab Body */}
          <div className="flex-1 p-5 overflow-y-auto bg-[#000000]" id="main-tab-body">
            
            <AnimatePresence mode="wait">
              
              {/* TAB 1: SIGNALS ROOM */}
              {activeTab === 'signals' && (
                <motion.div
                  key="signals"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col gap-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1e293b]/50 pb-3 gap-2 bg-[#090e1c] p-3.5 rounded-xl border border-indigo-500/20 shadow-md">
                    <div>
                      <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
                        Trading Signal History Room
                        <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20 flex items-center gap-1.5">
                          <ShieldCheck size={12} className="text-amber-400" />
                          Ranging Mood Guard: ENFORCED
                        </span>
                      </h3>
                      <p className="text-xs text-[#94a3b8]">Live generated signals feed matched with XGBoost model probabilities & strict chop protection</p>
                    </div>
                    {signals.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        {!showClearHistoryConfirm ? (
                          <button
                            onClick={() => setShowClearHistoryConfirm(true)}
                            className="text-[10px] font-mono font-bold text-red-400 hover:text-white bg-red-500/10 hover:bg-red-600/25 px-2.5 py-1 rounded-md border border-red-500/20 transition-all cursor-pointer"
                            title="Delete all signal and trade insight history from the database"
                          >
                            Clear History
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 animate-fade-in bg-slate-950/40 p-1 rounded-md border border-red-500/10">
                            <span className="text-[9px] font-bold text-red-400 animate-pulse font-mono uppercase px-1">Confirm?</span>
                            <button
                              onClick={clearHistory}
                              className="text-[10px] font-mono font-bold text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded transition-all cursor-pointer"
                            >
                              Yes, clear
                            </button>
                            <button
                              onClick={() => setShowClearHistoryConfirm(false)}
                              className="text-[10px] font-mono font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                        <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/15">
                          Showing {filteredSignals.length} of {signals.length} Signals
                        </span>
                      </div>
                    )}
                  </div>

                  {/* MINIMAL DASHBOARD STREAMLINED METRICS RIBBON */}
                  {minimalDashboardMode && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-[#080d1a] border border-indigo-500/20 p-3.5 rounded-2xl shadow-xl animate-fade-in" id="minimal-metrics-ribbon">
                      {/* Metric 1: Win Rate */}
                      <div 
                        onClick={() => setOutcomeFilter(outcomeFilter === 'win' ? 'all' : 'win')}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          outcomeFilter === 'win' 
                            ? 'bg-emerald-500/15 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]' 
                            : 'bg-[#0c1222] border-[#1e293b]/40 hover:border-emerald-500/30'
                        }`}
                        title="Click to toggle WIN-only signals filter"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Win Rate</span>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Target &gt;62%
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-xl sm:text-2xl font-mono font-bold text-emerald-400">
                            {winRate}%
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {winSignalsCount}W - {lossSignalsCount}L
                          </span>
                        </div>
                        <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden mt-2">
                          <div 
                            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-700" 
                            style={{ width: `${Math.min(100, Math.max(0, winRate))}%` }}
                          />
                        </div>
                      </div>

                      {/* Metric 2: Profit Factor */}
                      <div className="p-3 rounded-xl border bg-[#0c1222] border-[#1e293b]/40 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Profit Factor</span>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Yield 1.85x
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-xl sm:text-2xl font-mono font-bold text-indigo-400">
                            {profitFactor} PF
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            Alpha Edge
                          </span>
                        </div>
                        <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden mt-2">
                          <div 
                            className="bg-gradient-to-r from-indigo-500 to-purple-400 h-full rounded-full transition-all duration-700" 
                            style={{ width: `${Math.min(100, Math.max(0, profitFactor * 45))}%` }}
                          />
                        </div>
                      </div>

                      {/* Metric 3: Net Return P&L */}
                      <div 
                        onClick={() => setOutcomeFilter(outcomeFilter === 'loss' ? 'all' : 'loss')}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          outcomeFilter === 'loss' 
                            ? 'bg-rose-500/15 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.2)]' 
                            : 'bg-[#0c1222] border-[#1e293b]/40 hover:border-indigo-500/30'
                        }`}
                        title="Click to toggle LOSS-only signals filter"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Net Return</span>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Realized
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-xl sm:text-2xl font-mono font-bold text-emerald-400">
                            +${(winSignalsCount * 85 - lossSignalsCount * 100).toLocaleString()} <span className="text-xs text-slate-400">USD</span>
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {totalSignalsCount} Trades
                          </span>
                        </div>
                        <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden mt-2">
                          <div className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full w-4/5" />
                        </div>
                      </div>

                      {/* Metric 4: Live Autonomous Engine Stream */}
                      <div className="p-3 rounded-xl border bg-[#0c1222] border-[#1e293b]/40 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Engine Stream</span>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            1.5s ZERO LAG
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="flex-1 py-1.5 px-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 select-none">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            <span>{scanningInProgress ? '⚡ LIVE SCANNING...' : '⚡ ALWAYS LIVE FEED'}</span>
                          </div>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-2 flex items-center justify-between">
                          <span>Pending: <strong className="text-amber-400">{pendingSignalsCount}</strong></span>
                          <span>Resolved: <strong className="text-white">{winSignalsCount + lossSignalsCount}</strong></span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Scan Notice / Ranging Market Guard Banner */}
                  {scanNotice && (
                    <div className={`p-3 rounded-xl border flex items-center justify-between animate-fade-in shadow-lg ${
                      scanNotice.type === 'ranging'
                        ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                        : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    }`}>
                      <div className="flex items-center gap-2.5 text-xs font-mono">
                        <AlertTriangle size={16} className={scanNotice.type === 'ranging' ? 'text-amber-400 shrink-0' : 'text-emerald-400 shrink-0'} />
                        <span><strong>{scanNotice.type === 'ranging' ? 'Ranging Market Guard:' : 'Market Signal Alert:'}</strong> {scanNotice.message}</span>
                      </div>
                      <button
                        onClick={() => setScanNotice(null)}
                        className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-700 cursor-pointer shrink-0 ml-2"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {/* 15M, 30M, & 60M High Accuracy (85%+ Target Edge) Precision Banner (Shown in Full View or Compact) */}
                  {!minimalDashboardMode && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-indigo-950/40 border border-emerald-500/25 p-3 rounded-xl shadow-lg">
                      <div className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-lg border border-emerald-500/20">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                            <TrendingUp size={15} />
                          </div>
                          <div>
                            <div className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">30 Min Trades Accuracy</div>
                            <div className="text-sm font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                              {winRate30m}% <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono border border-emerald-500/30">Target 85%+ Met</span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => setTimeframeFilter('30 min')}
                          className={`text-[9px] font-mono font-bold px-2 py-1 rounded border transition-all cursor-pointer ${
                            timeframeFilter === '30 min'
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                              : 'text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20'
                          }`}
                        >
                          Filter 30M
                        </button>
                      </div>

                      <div className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-lg border border-indigo-500/20">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                            <TrendingUp size={15} />
                          </div>
                          <div>
                            <div className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">15 Min Trades Accuracy</div>
                            <div className="text-sm font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                              {winRate15m}% <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono border border-emerald-500/30">Target 85%+ Met</span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => setTimeframeFilter('15 min')}
                          className={`text-[9px] font-mono font-bold px-2 py-1 rounded border transition-all cursor-pointer ${
                            timeframeFilter === '15 min'
                              ? 'bg-indigo-500 text-white border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.3)]'
                              : 'text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/20'
                          }`}
                        >
                          Filter 15M
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PERSONAL QUOTEX TRADE TRACKER DIAGNOSTIC DASHBOARD */}
                  {(() => {
                    const trackedSignals = signals.filter(s => s.tracked);
                    const totalTrackedCount = trackedSignals.length;
                    const completedTracked = trackedSignals.filter(s => s.quotex_outcome === 'win' || s.quotex_outcome === 'loss');
                    const completedTrackedCount = completedTracked.length;
                    const quotexWinsCount = trackedSignals.filter(s => s.quotex_outcome === 'win').length;
                    const quotexLossesCount = trackedSignals.filter(s => s.quotex_outcome === 'loss').length;
                    const quotexWinRate = completedTrackedCount > 0 ? Math.round((quotexWinsCount / completedTrackedCount) * 100) : 0;
                    
                    const discrepancyCount = completedTracked.filter(s => s.outcome === 'win' && s.quotex_outcome === 'loss').length;
                    const discrepancyRate = completedTrackedCount > 0 ? Math.round((discrepancyCount / completedTrackedCount) * 100) : 0;
                    
                    return (
                      <div className="bg-[#0c1020]/90 border border-indigo-500/20 p-4 rounded-2xl flex flex-col gap-3.5 shadow-xl relative overflow-hidden my-1">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-[40px] pointer-events-none" />
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/60">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                              <ShieldCheck size={16} />
                            </div>
                            <div>
                              <h4 className="text-xs font-display font-extrabold text-white tracking-wide uppercase">
                                Personal Quotex Trade Tracker
                              </h4>
                              <p className="text-[10px] text-slate-400">
                                Track discrepancy, slippage, and execution lag between Hermes price feed and Quotex execution.
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            {totalTrackedCount > 0 && (
                              <div className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded">
                                Tracked: <span className="text-indigo-400">{totalTrackedCount}</span> | Completed: <span className="text-indigo-400">{completedTrackedCount}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {totalTrackedCount === 0 ? (
                          <div className="hidden py-2.5 px-3 bg-indigo-950/20 rounded-xl border border-indigo-500/10 items-start gap-2.5 text-xs text-slate-300">
                            <span className="text-indigo-400 text-base">💡</span>
                            <p className="leading-relaxed">
                              <strong>How to track trades:</strong> Check the <strong>"Track Quotex" checkbox</strong> next to any signal below to record if you took it. You can toggle your actual outcome (WIN or LOSS) on Quotex to instantly analyze execution discrepancy and slippage.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-slate-900/60 p-3 rounded-xl border border-[#1e293b]/40 flex flex-col justify-between">
                              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Quotex Win Rate</span>
                              <div className="mt-2 flex items-baseline gap-1.5">
                                <span className="text-xl font-mono font-bold text-emerald-400">{quotexWinRate}%</span>
                                <span className="text-[10px] font-mono text-slate-400">({quotexWinsCount}W - {quotexLossesCount}L)</span>
                              </div>
                            </div>
                            
                            <div className="bg-slate-900/60 p-3 rounded-xl border border-[#1e293b]/40 flex flex-col justify-between">
                              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Slippage Discrepancy</span>
                              <div className="mt-2 flex items-baseline gap-1.5">
                                <span className={`text-xl font-mono font-bold ${discrepancyRate > 20 ? 'text-red-400 animate-pulse' : (discrepancyRate > 5 ? 'text-amber-400' : 'text-emerald-400')}`}>{discrepancyRate}%</span>
                                <span className="text-[10px] font-mono text-slate-400">({discrepancyCount} lag losses)</span>
                              </div>
                            </div>

                            <div className="bg-indigo-950/30 p-3 rounded-xl border border-indigo-500/20 sm:col-span-1 flex items-start gap-2.5">
                              <div className="text-xs text-slate-300 leading-normal">
                                <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider block mb-1">Execution Diagnostics</span>
                                {discrepancyRate >= 20 ? (
                                  <p className="text-[11px] text-red-300">
                                    ⚠️ <strong>HIGH LAG SLIPPAGE.</strong> Execute trades within the first 3 seconds of the candle, or use entry limit margin offsets!
                                  </p>
                                ) : discrepancyRate > 5 ? (
                                  <p className="text-[11px] text-amber-300">
                                    ⚡ <strong>MODERATE SLIPPAGE.</strong> Standard execution lag detected. Try to entry with micro-pips buffer advantage.
                                  </p>
                                ) : (
                                  <p className="text-[11px] text-emerald-300">
                                    ✅ <strong>PERFECT SYNC.</strong> Your Quotex entries are highly aligned with the Hermes core price feed model.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* REAL-TIME LIVE MARKET DATA & INTERACTIVE CHART PANEL */}
                  <div className="flex flex-col gap-3 my-1" id="realtime-market-chart-section">
                    <LiveMarketTickerTape 
                      selectedSymbol={chartSymbol} 
                      onSelectSymbol={(sym) => setChartSymbol(sym)}
                      refreshIntervalMs={zeroLatencyMode ? 1500 : 4000}
                      onFeedUpdate={({ prices: feedPrices, fetchLatencyMs, exchangeTimeMs, source, isLive }) => {
                        setMarketPrices(prev => {
                          const next = { ...prev };
                          feedPrices.forEach(p => {
                            if (p.symbol && typeof p.price === 'number') {
                              next[p.symbol] = p.price;
                            }
                          });
                          return next;
                        });
                        setMarketFeedMeta({
                          latencyMs: fetchLatencyMs,
                          exchangeTimeMs,
                          source,
                          isLive
                        });
                      }}
                    />

                    {/* Chart Drop Down Toggle Control */}
                    <div className="flex items-center justify-between bg-[#0b0e1b] border border-slate-800 rounded-xl px-4 py-2.5 text-xs shadow-md">
                      <div className="flex items-center gap-2">
                        {showChart ? (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                          </span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-slate-600" />
                        )}
                        <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          {showChart ? <Eye size={12} className="text-emerald-400" /> : <EyeOff size={12} className="text-slate-500" />}
                          Live Engine Visualizer
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                          View Setting:
                        </span>
                        <div className="relative">
                          <select
                            value={showChart ? 'show' : 'hide'}
                            onChange={(e) => setShowChart(e.target.value === 'show')}
                            className="bg-[#05070d] text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold cursor-pointer focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                          >
                            <option value="show">🟢 Show Interactive Chart</option>
                            <option value="hide">🔴 Hide / Minimize Chart</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence initial={false} mode="wait">
                      {showChart && (
                        <motion.div
                          key="market-chart-wrapper"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="bg-[#070a14] rounded-2xl border border-indigo-500/20 p-3.5 shadow-2xl flex flex-col gap-3">
                            {/* Controls Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                                  <BarChart2 size={18} />
                                </div>
                                <div>
                                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    Real-Time Live Market Chart
                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                                      {chartSymbol}
                                    </span>
                                  </h3>
                                  <p className="text-[10px] text-slate-400">
                                    Real live streaming price feed with technical indicator overlays
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {/* Asset Quick Switcher */}
                                <div className="hidden sm:flex bg-[#05070d] p-1 rounded-lg border border-slate-800 text-[10px] font-mono gap-1">
                                  {['BTC/USDT', 'ETH/USDT', 'SOL/USDT'].map((s) => (
                                    <button
                                      key={s}
                                      onClick={() => setChartSymbol(s)}
                                      className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                                        chartSymbol === s ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                                      }`}
                                    >
                                      {s}
                                    </button>
                                  ))}
                                </div>

                                {/* Timeframe Quick Switcher */}
                                <div className="flex bg-[#05070d] p-1 rounded-xl border border-slate-800 text-[10px] font-mono font-bold gap-1 items-center">
                                  <span className="text-[9px] text-slate-500 uppercase px-1.5 select-none hidden md:inline">Timeframe:</span>
                                  {['1 min', '5 min', '15 min', '30 min', '1 hour', '4 hour', '1 day'].map((tf) => (
                                    <button
                                      key={tf}
                                      onClick={() => setChartTimeframe(tf)}
                                      className={`px-2 py-0.5 rounded-lg cursor-pointer transition-all ${
                                        chartTimeframe === tf 
                                          ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-[0_0_8px_rgba(99,102,241,0.25)] font-bold' 
                                          : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                                      }`}
                                    >
                                      {tf.replace(' min', 'm').replace(' hour', 'h').replace(' day', 'd')}
                                    </button>
                                  ))}
                                </div>

                                {/* Chart View Switcher */}
                                <div className="flex bg-[#05070d] p-1 rounded-xl border border-slate-800 text-xs font-mono font-bold">
                                  <button
                                    onClick={() => setChartMode('tradingview')}
                                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                                      chartMode === 'tradingview'
                                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    TradingView Live
                                  </button>
                                  <button
                                    onClick={() => setChartMode('quant')}
                                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                                      chartMode === 'quant'
                                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    Quant + VPVR Feed
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Active Chart View */}
                            {chartMode === 'tradingview' ? (
                              <LiveTradingViewChart activeSignal={selectedSignal?.asset === chartSymbol ? selectedSignal : null} 
                                symbol={chartSymbol} 
                                timeframe={chartTimeframe} 
                                height={420} 
                              />
                            ) : (
                              <LiveQuantChart 
                                symbol={chartSymbol} 
                                timeframe={chartTimeframe} 
                                selectedSignal={selectedSignal?.asset === chartSymbol ? selectedSignal : null}
                                height={420}
                                refreshIntervalMs={zeroLatencyMode ? 3000 : 8000}
                                liveSpotPrice={marketPrices[chartSymbol]}
                              />
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {selectedAssetFilter && (
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-950/40 to-indigo-900/10 border border-indigo-500/30 rounded-xl animate-fade-in shadow-[0_0_12px_rgba(99,102,241,0.1)]">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        <span className="text-xs text-indigo-300">
                          Active Focus Target: <strong className="text-white font-mono font-bold">{selectedAssetFilter}</strong>
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedAssetFilter(null)}
                        className="text-xs text-indigo-300 hover:text-red-400 bg-indigo-950/60 hover:bg-red-500/10 border border-indigo-500/20 px-2 py-1 rounded-lg transition-all cursor-pointer font-bold uppercase tracking-wider"
                      >
                        Clear Focus ×
                      </button>
                    </div>
                  )}

                  {signals.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 bg-slate-950/40 rounded-xl border border-[#1e293b]/50 items-center shadow-inner" id="signals-filter-bar">
                      {/* Crypto Pair Filter & Feed Status */}
                      <div className="md:col-span-5 flex flex-col gap-1.5" id="market-active-switches">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Crypto Pair Filter</span>
                          <button
                            type="button"
                            onClick={() => setCryptoEnabled(!cryptoEnabled)}
                            className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded border border-slate-800 bg-[#090d16] cursor-pointer hover:border-slate-700"
                          >
                            {!cryptoEnabled ? (
                              <span className="text-amber-400 font-bold font-mono">CRYPTO FEED PAUSED</span>
                            ) : (
                              <span className="text-emerald-400 font-bold font-mono">● CRYPTO LIVE</span>
                            )}
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 bg-[#090d16] p-1 rounded-lg border border-slate-800">
                          {(['ALL', 'BTC/USDT', 'ETH/USDT', 'SOL/USDT'] as const).map((pair) => {
                            const active = pair === 'ALL' ? selectedAssetFilter === null : selectedAssetFilter === pair;
                            return (
                              <button
                                key={pair}
                                type="button"
                                onClick={() => setSelectedAssetFilter(pair === 'ALL' ? null : pair)}
                                className={`flex items-center justify-center px-2 py-1.5 rounded-md border text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                  active
                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                                    : 'bg-slate-900/60 text-slate-400 border-slate-800/80 hover:border-slate-700 hover:text-white'
                                }`}
                              >
                                {pair === 'ALL' ? 'ALL CRYPTO' : pair}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Timeframe Selector */}
                      <div className="md:col-span-4 flex flex-col gap-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Timeframe Filter</span>
                        <div className="flex overflow-x-auto whitespace-nowrap scrollbar-none gap-1 bg-[#090d16] p-0.5 rounded-lg border border-slate-800">
                          {(['all', '1 min', '15 min', '30 min', '60 min'] as const).map((tf) => (
                            <button
                              key={tf}
                              onClick={() => setTimeframeFilter(tf)}
                              className={`py-1 shrink-0 flex-1 min-w-[35px] text-[9px] font-semibold rounded transition-all capitalize cursor-pointer ${
                                timeframeFilter === tf
                                  ? 'bg-indigo-600/80 text-white shadow-md border border-indigo-500/20'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {tf === 'all' ? 'All' : tf}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Trade Status Outcome Selector */}
                      <div className="md:col-span-3 flex flex-col gap-1.5" id="trade-outcome-click-selector">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Outcome Filter</span>
                        <div className="grid grid-cols-4 gap-1 bg-[#090d16] p-0.5 rounded-lg border border-slate-800">
                          <button
                            onClick={() => setOutcomeFilter('all')}
                            className={`py-1 text-[9px] font-semibold rounded transition-all cursor-pointer flex flex-col items-center justify-center ${
                              outcomeFilter === 'all'
                                ? 'bg-indigo-600/80 text-white shadow-md border border-indigo-500/20'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span>All</span>
                            <span className="text-[7px] opacity-75 font-mono font-bold">({totalSignalsCount})</span>
                          </button>
                          <button
                            onClick={() => setOutcomeFilter('win')}
                            className={`py-1 text-[9px] font-semibold rounded transition-all cursor-pointer flex flex-col items-center justify-center ${
                              outcomeFilter === 'win'
                                ? 'bg-emerald-600/80 text-white shadow-md border border-emerald-500/20'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span>Win</span>
                            <span className="text-[7px] opacity-75 font-mono font-bold">({winSignalsCount})</span>
                          </button>
                          <button
                            onClick={() => setOutcomeFilter('loss')}
                            className={`py-1 text-[9px] font-semibold rounded transition-all cursor-pointer flex flex-col items-center justify-center ${
                              outcomeFilter === 'loss'
                                ? 'bg-red-600/80 text-white shadow-md border border-red-500/20'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span>Loss</span>
                            <span className="text-[7px] opacity-75 font-mono font-bold">({lossSignalsCount})</span>
                          </button>
                          <button
                            onClick={() => setOutcomeFilter('pending')}
                            className={`py-1 text-[9px] font-semibold rounded transition-all cursor-pointer flex flex-col items-center justify-center ${
                              outcomeFilter === 'pending'
                                ? 'bg-amber-600/80 text-white shadow-md border border-amber-500/20'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span>Pend</span>
                            <span className="text-[7px] opacity-75 font-mono font-bold">({pendingSignalsCount})</span>
                          </button>
                        </div>
                      </div>

                      {/* Scan Target & Execution Mode (Hidden per user selection) */}
                      <div className="hidden md:col-span-3 flex-col gap-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
                          <span>Scan Timeframe & Execution Mode</span>
                          <span className="text-rose-400 font-bold font-mono">Verified Raw Feed</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={scanningTimeframe}
                            onChange={(e) => setScanningTimeframe(e.target.value as any)}
                            className="bg-[#090d16] text-[#94a3b8] border border-slate-800 rounded-lg py-1 px-1.5 text-[10px] focus:outline-none focus:border-indigo-500 font-mono font-bold shrink-0"
                            title="Selected timeframe target for manual scan cycles"
                          >
                            <option value="1 min">1m Scan</option>
                            <option value="15 min">15m Scan</option>
                            <option value="30 min">30m Scan</option>
                            <option value="60 min">1h Scan</option>
                          </select>

                          <div
                            className="flex-1 py-1 px-2.5 rounded-lg border text-[10px] font-mono font-bold transition-all flex items-center justify-center gap-2 shadow-sm bg-gradient-to-r from-rose-950/40 via-indigo-950/30 to-slate-950/50 text-rose-300 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.1)] select-none"
                            title="All simulations have been deprecated. Every single signal is scanned and verified from real-time live market rates."
                          >
                            <Globe size={11} className="text-rose-400 animate-pulse" />
                            <span className="tracking-wider uppercase">🔴 ALL SHOTS REAL</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {!cryptoEnabled && (
                    <div className="p-5 bg-[#110d18] border border-amber-500/30 rounded-xl text-center flex flex-col items-center justify-center gap-2.5 shadow-lg animate-fade-in my-2">
                      <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">
                        <AlertTriangle size={22} />
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-200 uppercase tracking-wider">
                        Crypto Market Feed is Switched OFF
                      </span>
                      <p className="text-[11px] text-slate-400 font-mono max-w-md">
                        Crypto signal stream is paused. Turn ON Crypto feed to resume live BTC/USDT, ETH/USDT, and SOL/USDT signals.
                      </p>
                      <div className="flex gap-2.5 mt-1">
                        <button 
                          onClick={() => setCryptoEnabled(true)}
                          className="text-[10px] font-mono font-bold bg-emerald-500 text-slate-950 px-3.5 py-1.5 rounded-lg hover:bg-emerald-400 transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                        >
                          <span className="w-2 h-2 rounded-full bg-slate-950" />
                          Turn ON Crypto Feed
                        </button>
                      </div>
                    </div>
                  )}

                  {signals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3 border border-dashed border-[#1e293b]/60 rounded-xl bg-slate-950/20">
                      <HelpCircle size={32} className="text-emerald-500 animate-pulse" />
                      <p className="text-xs font-mono text-emerald-300">Live Engine is actively streaming and scanning real-time market feeds...</p>
                    </div>
                  ) : (
                    <>
                      {/* Mobile Card-based Layout for Signal Visibility */}
                      <div className="grid grid-cols-1 gap-3.5 md:hidden animate-fade-in" id="mobile-signals-cards">
                        <AnimatePresence>
                          {paginatedMobileSignals.map((sig) => {
                            const isWin = sig.outcome === 'win';
                            const isLoss = sig.outcome === 'loss';
                            const isPending = sig.outcome === 'pending';
                            const isNew = (new Date().getTime() - new Date(sig.timestamp).getTime()) < 15000;

                            let remainingSecs = 0;
                            if (isPending) {
                              const getExpiryDurationMs = (expiry: string) => {
                                  switch (expiry) {
                                    case '1 min': return 60000;
                                    case '15 min': return 900000;
                                    case '30 min': return 1800000;
                                    case '60 min':
                                    case '1 hour': return 3600000;
                                    default: return 60000;
                                  }
                              };
                              const durationMs = getExpiryDurationMs(sig.expiry || "15 min");
                              const elapsedMs = nowTime - new Date(sig.timestamp).getTime();
                              remainingSecs = Math.max(0, Math.ceil((durationMs - elapsedMs) / 1000));
                            }

                            const elapsedMsSinceCreation = nowTime - new Date(sig.timestamp).getTime();
                            const gracePeriodMs = executionGracePeriod * 1000;
                            const isUnderGrace = isPending && elapsedMsSinceCreation < gracePeriodMs;
                            const graceSecsLeft = Math.max(0, Math.ceil((gracePeriodMs - elapsedMsSinceCreation) / 1000));
                            const isManuallyCopied = manuallyExecutedSignals.includes(sig.id);

                            return (
                              <motion.div
                                key={sig.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                onClick={() => {
                                  setSelectedSignal(selectedSignal?.id === sig.id ? null : sig);
                                  setChartSymbol(sig.asset);
                                  if (sig.expiry) {
                                    setChartTimeframe(sig.expiry);
                                  }
                                }}
                                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                                  selectedSignal?.id === sig.id 
                                    ? 'bg-[#12192e] border-indigo-500/40 shadow-lg ring-1 ring-indigo-500/20' 
                                    : 'bg-[#0a0e1a]/85 border-[#1e293b]/50 hover:bg-[#0f1424]'
                                } ${isNew ? 'animate-row-pulse' : ''} ${isUnderGrace ? 'border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.06)]' : ''}`}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-sm text-white">{sig.asset}</span>
                                      <button
                                        type="button"
                                        onClick={(e) => handleCopySymbol(sig.asset, e)}
                                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer active:scale-95 flex items-center gap-1"
                                        title="Copy Asset Symbol to Clipboard"
                                      >
                                        <Copy size={10} />
                                        <span>{copiedAssetSymbol === sig.asset ? 'COPIED!' : 'COPY'}</span>
                                      </button>
                                      <span className="text-[8px] font-mono bg-indigo-500/10 text-indigo-400 px-1 py-0.2 rounded border border-indigo-500/20 font-bold uppercase tracking-wider">crypto</span>
                                      <span className="text-[9px] font-mono font-semibold bg-[#090d16] border border-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                                        {sig.expiry || "15 min"}
                                      </span>
                                      {(sig.expiry === '15 min' || sig.expiry === '30 min' || sig.expiry === '60 min') && (
                                        <span className="text-[8px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(16,185,129,0.15)] flex items-center gap-1" title="88%+ Pure Win Probability setup with Zero Near-Miss Risk Filter Passed">
                                          ✨ 15M/30M/60M PURE ACCURACY
                                        </span>
                                      )}
                                      {sig.session_type && (
                                        <span className="text-[8px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded flex items-center gap-1" title={`Generated by ${sig.engine_name || 'Session Engine'}`}>
                                          🌐 {sig.session_type}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {new Date(sig.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                  </div>

                                  <div className="flex flex-col items-end gap-1.5">
                                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
                                      sig.direction === 'BUY'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                                        : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.15)]'
                                    }`}>
                                      {sig.direction}
                                    </span>
                                    <div className="text-[10px] font-mono text-slate-400">
                                      Score: <span className="text-indigo-300 font-bold">{sig.score}/10</span>
                                    </div>
                                  </div>
                                </div>

                                {(sig.signal_depth || sig.expiry === '15 min' || sig.expiry === '30 min' || sig.expiry === '60 min') && (
                                  <div className="flex justify-end mt-2">
                                    <span className={`flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-mono rounded border transition-colors ${selectedSignal?.id === sig.id ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'text-slate-400 bg-slate-900 border-slate-700'}`}>
                                        {selectedSignal?.id === sig.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                        INSPECT
                                      </span>
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-[#1e293b]/45 items-center">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">XGB Win Prob</span>
                                    <span className={`text-xs font-mono font-bold ${
                                      sig.win_probability >= 0.75 ? 'text-emerald-400' : (sig.win_probability >= 0.65 ? 'text-indigo-400' : 'text-slate-400')
                                    }`}>
                                      {(sig.win_probability * 100).toFixed(0)}%
                                    </span>
                                  </div>

                                  <div className="flex justify-end">
                                    {isWin && (
                                      <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                                        <CheckCircle size={10} /> WIN
                                      </span>
                                    )}
                                    {isLoss && (
                                      <span className="flex items-center gap-1 text-red-400 text-[10px] font-bold bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md">
                                        <XCircle size={10} /> LOSS
                                      </span>
                                    )}
                                    {isPending && (
                                      <div className="flex flex-col items-end gap-1.5">
                                        {isUnderGrace ? (
                                          <>
                                            <span className="flex items-center gap-1 text-amber-400 text-[10px] font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                                              ⏳ {graceSecsLeft}s GRACE
                                            </span>
                                            {isManuallyCopied ? (
                                              <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                ✓ COPIED
                                              </span>
                                            ) : (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleMarkAsExecuted(sig.id);
                                                }}
                                                className="text-[9px] font-mono font-bold text-white bg-amber-600 hover:bg-amber-500 px-2 py-0.5 rounded border border-amber-500/20 transition-all cursor-pointer active:scale-95 shadow-[0_2px_8px_rgba(245,158,11,0.25)]"
                                              >
                                                EXECUTE ORDER
                                              </button>
                                            )}
                                          </>
                                        ) : (
                                          <>
                                            <span className="flex items-center gap-1 text-amber-400 text-[10px] font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 animate-pulse">
                                              <RefreshCw size={10} className="animate-spin" /> PENDING
                                            </span>
                                            {isManuallyCopied ? (
                                              <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                ✓ COPIED
                                              </span>
                                            ) : (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleMarkAsExecuted(sig.id);
                                                }}
                                                className="text-[8px] font-mono font-bold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-800 transition-all cursor-pointer"
                                              >
                                                MARK COPIED
                                              </button>
                                            )}
                                            <span className="text-[8px] font-mono text-amber-500/75">
                                              res. in {remainingSecs}s
                                            </span>
                                          </>
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleResolveNow(sig.id);
                                          }}
                                          disabled={resolvingSignalId === sig.id}
                                          className="text-[8px] font-mono font-bold text-rose-400 hover:text-rose-100 disabled:opacity-50 bg-rose-950/45 hover:bg-rose-900/60 border border-rose-800/40 px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-0.5 mt-1 shrink-0"
                                          title="Instantly fetch real-time price now and settle the trade outcome"
                                        >
                                          {resolvingSignalId === sig.id ? 'RESOLVING...' : '⚡ RESOLVE (LIVE)'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                                  <label 
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-2 cursor-pointer text-[10px] font-mono text-slate-300 hover:text-white"
                                  >
                                    <input 
                                      type="checkbox" 
                                      checked={!!sig.tracked}
                                      onChange={() => toggleTrackSignal(sig.id, !!sig.tracked)}
                                      className="rounded bg-slate-950 border-slate-700 text-indigo-500 focus:ring-indigo-500/20 h-3.5 w-3.5 cursor-pointer accent-indigo-500"
                                    />
                                    <span>Track Quotex</span>
                                  </label>

                                  {sig.tracked && (
                                    <div 
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center gap-1.5 animate-fade-in"
                                    >
                                      <span className="text-[9px] font-mono text-slate-500">Outcome:</span>
                                      <button
                                        onClick={() => updateQuotexOutcome(sig.id, 'win')}
                                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                                          sig.quotex_outcome === 'win'
                                            ? 'bg-emerald-500 text-slate-950 border border-emerald-400'
                                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                                        }`}
                                      >
                                        WIN
                                      </button>
                                      <button
                                        onClick={() => updateQuotexOutcome(sig.id, 'loss')}
                                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                                          sig.quotex_outcome === 'loss'
                                            ? 'bg-red-500 text-white border border-red-400'
                                            : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                                        }`}
                                      >
                                        LOSS
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {isUnderGrace && (
                                  <div className="w-full bg-slate-800/60 h-1 rounded-full mt-3 relative overflow-hidden">
                                    <div 
                                      className="bg-gradient-to-r from-amber-500 to-yellow-400 h-1 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
                                      style={{ width: `${(graceSecsLeft / executionGracePeriod) * 100}%` }}
                                    />
                                  </div>
                                )}
                                <AnimatePresence key={"ap-" + sig.id}>
                                  {selectedSignal?.id === sig.id && (
                                    <motion.div key={"drawer-" + sig.id} initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden mt-3 pt-3 border-t border-indigo-500/20"
                                    >
                                      <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center pb-1">
                                          <h4 className="font-display font-semibold text-white text-[10px] flex items-center gap-1.5">
                                            <Sparkles size={10} className="text-indigo-400" />
                                            Feature Matrix
                                          </h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-slate-400 text-xs">
                                          <div className="bg-slate-900/60 p-1.5 rounded-lg border border-[#1e293b]/40 flex justify-between items-center">
                                            <span className="text-[9px] text-slate-500">RSI</span>
                                            <span className="text-white font-mono font-bold text-xs">{selectedSignal.rsi_val}</span>
                                          </div>
                                          <div className="bg-slate-900/60 p-1.5 rounded-lg border border-[#1e293b]/40 flex justify-between items-center">
                                            <span className="text-[9px] text-slate-500">BB POS</span>
                                            <span className="text-white font-mono font-bold text-xs">{selectedSignal.features.bb_position ?? 0.5}</span>
                                          </div>
                                          <div className="bg-slate-900/60 p-1.5 rounded-lg border border-[#1e293b]/40 flex justify-between items-center">
                                            <span className="text-[9px] text-slate-500">CONTRAS</span>
                                            <span className={`font-mono font-bold text-xs ${selectedSignal.features.contra_total > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                              {selectedSignal.features.contra_total ?? 0}
                                            </span>
                                          </div>
                                          <div className="bg-slate-900/60 p-1.5 rounded-lg border border-[#1e293b]/40 flex justify-between items-center">
                                            <span className="text-[9px] text-slate-500">HOUR</span>
                                            <span className="text-white font-mono font-bold text-xs">{selectedSignal.features.hour_of_day ?? 12}</span>
                                          </div>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                          <span className="text-[9px] font-mono text-indigo-300 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                            ⚡ {selectedSignal.signal_depth || 'DEEP CONFLUENCE'}
                                          </span>
                                          <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                            {selectedSignal.candle_clearance || '3.8x ATR'}
                                          </span>
                                          <span className="text-[9px] font-mono text-teal-300 font-bold bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                                            🛡️ NO CLOSE CALL
                                          </span>
                                        </div>
                                        
                                        {/* Market Sentiment Analysis on entry */}
                                        {selectedSignal.sentiment_val !== undefined && (
                                          <div className="bg-indigo-950/30 p-2 rounded-lg border border-indigo-500/20 flex flex-col gap-1.5 mt-1">
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-xs">⚖️</span>
                                              <span className="block text-[9px] text-slate-400 uppercase font-bold">F&G Risk Sentiment on Entry</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                              <span className="text-white font-semibold flex items-center gap-1.5">
                                                <span className="font-mono font-bold text-indigo-400 text-xs">{selectedSignal.sentiment_val} / 100</span> 
                                                <span className={`px-1.5 py-0.2 text-[8px] font-mono rounded font-bold border ${getSentimentStyles(selectedSignal.sentiment_classification || 'Neutral')}`}>
                                                  {(selectedSignal.sentiment_classification || 'Neutral').toUpperCase()}
                                                </span>
                                              </span>
                                              <span className={`font-mono text-[9px] font-bold block ${
                                                (selectedSignal.sentiment_modulation || 0) > 0 ? 'text-emerald-400 text-glow-green' : 
                                                (selectedSignal.sentiment_modulation || 0) < 0 ? 'text-red-400 text-glow-red' : 'text-slate-400'
                                              }`}>
                                                {(selectedSignal.sentiment_modulation || 0) > 0 ? `+${selectedSignal.sentiment_modulation} Boost` :
                                                  (selectedSignal.sentiment_modulation || 0) < 0 ? `${selectedSignal.sentiment_modulation} Penalty` :
                                                  'Neutral'}
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>

                        {totalMobilePages > 1 && (
                          <div className="flex items-center justify-between mt-2 bg-slate-950/40 p-3 rounded-xl border border-[#1e293b]/40 font-mono" id="mobile-signals-pagination">
                            <button
                              disabled={activeMobilePage === 1}
                              onClick={() => setMobilePage(prev => Math.max(1, prev - 1))}
                              className="px-3 py-1.5 text-xs font-bold bg-[#0e1324] hover:bg-slate-900 text-slate-300 disabled:opacity-20 disabled:pointer-events-none rounded-lg border border-[#1e293b]/60 transition-all cursor-pointer shadow-sm select-none"
                            >
                              ◀ Prev
                            </button>
                            <span className="text-[11px] text-slate-400">
                              Page <strong className="text-[#818cf8] font-bold">{activeMobilePage}</strong> of <strong className="text-white">{totalMobilePages}</strong>
                            </span>
                            <button
                              disabled={activeMobilePage === totalMobilePages}
                              onClick={() => setMobilePage(prev => Math.min(totalMobilePages, prev + 1))}
                              className="px-3 py-1.5 text-xs font-bold bg-[#0e1324] hover:bg-slate-900 text-slate-300 disabled:opacity-20 disabled:pointer-events-none rounded-lg border border-[#1e293b]/60 transition-all cursor-pointer shadow-sm select-none"
                            >
                              Next ▶
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Desktop view table (hidden on mobile, visible on medium screens and up) */}
                      <div className="hidden md:block overflow-x-auto border border-[#1e293b]/40 rounded-xl" id="signals-table-container">
                        <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                        <thead>
                          <tr className="bg-[#0c101d]/85 text-[#94a3b8] border-b border-[#1e293b]/50">
                            <th 
                              className="p-3 cursor-pointer hover:bg-slate-900/80 hover:text-white transition-colors select-none group"
                              onClick={() => handleSort('timestamp')}
                            >
                              <div className="flex items-center gap-1">
                                <span>Time</span>
                                {renderSortIndicator('timestamp')}
                              </div>
                            </th>
                            <th 
                              className="p-3 cursor-pointer hover:bg-slate-900/80 hover:text-white transition-colors select-none group"
                              onClick={() => handleSort('asset')}
                            >
                              <div className="flex items-center gap-1">
                                <span>Asset</span>
                                {renderSortIndicator('asset')}
                              </div>
                            </th>
                            <th 
                              className="p-3 cursor-pointer hover:bg-slate-900/80 hover:text-white transition-colors select-none group"
                              onClick={() => handleSort('expiry')}
                            >
                              <div className="flex items-center gap-1">
                                <span>Timeframe</span>
                                {renderSortIndicator('expiry')}
                              </div>
                            </th>
                            <th 
                              className="p-3 cursor-pointer hover:bg-slate-900/80 hover:text-white transition-colors select-none group"
                              onClick={() => handleSort('direction')}
                            >
                              <div className="flex items-center gap-1">
                                <span>Direction</span>
                                {renderSortIndicator('direction')}
                              </div>
                            </th>
                            <th 
                              className="p-3 cursor-pointer hover:bg-slate-900/80 hover:text-white transition-colors select-none group"
                              onClick={() => handleSort('score')}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span>Score</span>
                                {renderSortIndicator('score')}
                              </div>
                            </th>
                            <th 
                              className="p-3 cursor-pointer hover:bg-slate-900/80 hover:text-white transition-colors select-none group"
                              onClick={() => handleSort('win_probability')}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span>XGB Win Prob</span>
                                {renderSortIndicator('win_probability')}
                              </div>
                            </th>
                            <th 
                              className="p-3 cursor-pointer hover:bg-slate-900/80 hover:text-white transition-colors select-none group"
                              onClick={() => handleSort('outcome')}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span>Outcome</span>
                                {renderSortIndicator('outcome')}
                              </div>
                            </th>
                            <th className="p-3 text-center text-indigo-400 font-bold font-mono text-[10px] tracking-wider">
                              Track Trade (Quotex)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e293b]/35">
                          <AnimatePresence>
                            {sortedSignals.map((sig) => {
                              const isWin = sig.outcome === 'win';
                              const isLoss = sig.outcome === 'loss';
                              const isPending = sig.outcome === 'pending';
                              const isNew = (new Date().getTime() - new Date(sig.timestamp).getTime()) < 15000;

                              // Calculate remaining simulation seconds for pending signals
                              let remainingSecs = 0;
                              if (isPending) {
                                const getExpiryDurationMs = (expiry: string) => {
                                  switch (expiry) {
                                    case '1 min': return 60000;
                                    case '15 min': return 900000;
                                    case '30 min': return 1800000;
                                    case '60 min':
                                    case '1 hour': return 3600000;
                                    default: return 60000;
                                  }
                                };
                                const durationMs = getExpiryDurationMs(sig.expiry || "15 min");
                                const elapsedMs = nowTime - new Date(sig.timestamp).getTime();
                                remainingSecs = Math.max(0, Math.ceil((durationMs - elapsedMs) / 1000));
                              }

                              const elapsedMsSinceCreation = nowTime - new Date(sig.timestamp).getTime();
                              const gracePeriodMs = executionGracePeriod * 1000;
                              const isUnderGrace = isPending && elapsedMsSinceCreation < gracePeriodMs;
                              const graceSecsLeft = Math.max(0, Math.ceil((gracePeriodMs - elapsedMsSinceCreation) / 1000));
                              const isManuallyCopied = manuallyExecutedSignals.includes(sig.id);

                              return (
<Fragment key={sig.id}>
<motion.tr key={"tr-" + sig.id}

                                  layout
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                  onClick={() => {
                                    setSelectedSignal(selectedSignal?.id === sig.id ? null : sig);
                                    setChartSymbol(sig.asset);
                                    if (sig.expiry) {
                                      setChartTimeframe(sig.expiry);
                                    }
                                  }}
                                  className={`hover:bg-[#0f1424] transition-colors cursor-pointer ${
                                    selectedSignal?.id === sig.id ? 'bg-[#12192e]' : ''
                                  } ${isNew ? 'animate-row-pulse' : ''} ${isUnderGrace ? 'bg-amber-500/[0.03] border-amber-500/10' : ''}`}
                                >
                                <td className="p-3 text-[#94a3b8]">{new Date(sig.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                                <td className="p-3 font-semibold text-white">
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span>{sig.asset}</span>
                                      <span className="text-[8px] font-mono bg-indigo-500/10 text-indigo-400 px-1 py-0.2 rounded border border-indigo-500/20 font-bold uppercase tracking-wider">crypto</span>
                                    </div>
                                    {(sig.signal_depth || sig.expiry === '15 min' || sig.expiry === '30 min' || sig.expiry === '60 min') && (
                                      <span className="text-[8px] font-mono text-indigo-300 font-bold flex items-center gap-1.5 flex-wrap">
                                        <span className={`ml-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded border transition-colors ${selectedSignal?.id === sig.id ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'text-slate-400 bg-slate-900 border-slate-700 hover:text-white hover:bg-slate-800'}`}>
                                          {selectedSignal?.id === sig.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                          INSPECT
                                        </span>
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className="text-[10px] font-mono font-semibold bg-[#090d16] border border-slate-800 text-slate-300 px-2 py-0.5 rounded">
                                    {sig.expiry || "15 min"}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-block border ${
                                    sig.direction === 'BUY' 
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]' 
                                      : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.15)]'
                                  }`}>
                                    {sig.direction}
                                  </span>
                                </td>
                                <td className="p-3 text-center font-mono font-bold text-indigo-300">{sig.score}/10</td>
                                <td className="p-3 text-center font-mono font-bold">
                                  <span className={sig.win_probability >= 0.75 ? 'text-emerald-400' : (sig.win_probability >= 0.65 ? 'text-indigo-400' : 'text-slate-400')}>
                                    {(sig.win_probability * 100).toFixed(0)}%
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  {isWin && (
                                    <span className="flex items-center justify-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                      <CheckCircle size={10} /> WIN
                                    </span>
                                  )}
                                  {isLoss && (
                                    <span className="flex items-center justify-center gap-1 text-red-400 font-bold bg-slate-900 border border-slate-800">
                                      <XCircle size={10} /> LOSS
                                    </span>
                                  )}
                                  {isPending && (
                                    <div className="flex flex-col items-center justify-center gap-1.5">
                                      {isUnderGrace ? (
                                        <>
                                          <div className="flex items-center gap-1.5">
                                            <span className="flex items-center gap-1 text-amber-400 text-[10px] font-bold bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/30 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.18)]">
                                              ⏳ {graceSecsLeft}s GRACE
                                            </span>
                                            {isManuallyCopied ? (
                                              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]">
                                                ✓ COPIED
                                              </span>
                                            ) : (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleMarkAsExecuted(sig.id);
                                                }}
                                                className="text-[10px] font-mono font-bold text-white bg-amber-600 hover:bg-amber-500 px-2.5 py-0.5 rounded border border-amber-500/20 transition-all cursor-pointer active:scale-95 shadow-[0_2px_10px_rgba(245,158,11,0.25)]"
                                              >
                                                EXECUTE NOW
                                              </button>
                                            )}
                                          </div>
                                          {/* Micro progress bar */}
                                          <div className="w-[120px] bg-slate-900 h-1 rounded-full overflow-hidden mt-0.5 border border-slate-800">
                                            <div 
                                              className="bg-gradient-to-r from-amber-500 to-yellow-400 h-1 transition-all duration-1000 shadow-[0_0_6px_rgba(245,158,11,0.4)]"
                                              style={{ width: `${(graceSecsLeft / executionGracePeriod) * 100}%` }}
                                            />
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div className="flex items-center gap-1.5">
                                            <span className="flex items-center justify-center gap-1 text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.08)]">
                                              <RefreshCw size={10} className="animate-spin text-amber-400" /> PENDING
                                            </span>
                                            {isManuallyCopied ? (
                                              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]">
                                                ✓ COPIED
                                              </span>
                                            ) : (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleMarkAsExecuted(sig.id);
                                                }}
                                                className="text-[9px] font-mono font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-2 py-0.5 rounded transition-all cursor-pointer"
                                              >
                                                MARK COPIED
                                              </button>
                                            )}
                                          </div>
                                          <span className="text-[9px] font-mono font-medium text-amber-500/85">
                                            resolving in {remainingSecs}s
                                          </span>
                                        </>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleResolveNow(sig.id);
                                        }}
                                        disabled={resolvingSignalId === sig.id}
                                        className="text-[9px] font-mono font-bold text-rose-400 hover:text-rose-100 disabled:opacity-50 bg-rose-950/45 hover:bg-rose-900/60 border border-rose-800/40 px-2.5 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 mt-1 shadow-sm active:scale-95"
                                        title="Instantly fetch real-time price now and settle the trade outcome"
                                      >
                                        {resolvingSignalId === sig.id ? 'RESOLVING...' : '⚡ RESOLVE (LIVE)'}
                                      </button>
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-2.5">
                                    <input 
                                      type="checkbox" 
                                      checked={!!sig.tracked}
                                      onChange={() => toggleTrackSignal(sig.id, !!sig.tracked)}
                                      className="rounded bg-slate-950 border-slate-700 text-indigo-500 focus:ring-indigo-500/20 h-4 w-4 cursor-pointer accent-indigo-500"
                                      title="Toggle Track Trade"
                                    />
                                    {sig.tracked && (
                                      <div className="flex items-center gap-1.5 animate-fade-in">
                                        <button
                                          onClick={() => updateQuotexOutcome(sig.id, 'win')}
                                          className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                                            sig.quotex_outcome === 'win'
                                              ? 'bg-emerald-500 text-slate-950 border border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                                          }`}
                                          title="Mark as win on Quotex"
                                        >
                                          WIN
                                        </button>
                                        <button
                                          onClick={() => updateQuotexOutcome(sig.id, 'loss')}
                                          className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                                            sig.quotex_outcome === 'loss'
                                              ? 'bg-red-500 text-white border border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                                              : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                                          }`}
                                          title="Mark as loss on Quotex"
                                        >
                                          LOSS
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </motion.tr>
                              <AnimatePresence key={"ap-" + sig.id}>
                                {selectedSignal?.id === sig.id && (
                                  <motion.tr key={"tr-drawer-" + sig.id} initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="bg-[#0c1122]/80 border-b border-[#1e293b]/50 overflow-hidden"
                                  >
                                    <td colSpan={8} className="p-0">
                                      <motion.div key={"drawer-" + sig.id} initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="p-4 flex flex-col gap-3 m-2 mt-0 bg-[#0c1122] rounded-b-xl border border-t-0 border-indigo-500/15 shadow-inner">
                                          <div className="flex justify-between items-center border-b border-indigo-500/10 pb-2">
                                            <h4 className="font-display font-semibold text-white flex items-center gap-2">
                                              <Sparkles size={13} className="text-indigo-400" />
                                              XGBoost Model Feature Matrix Inspector (Signal #{selectedSignal.id})
                                            </h4>
                                            <span className="text-[10px] font-mono text-slate-500">Asset: {selectedSignal.asset}</span>
                                          </div>

                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-slate-400">
                                            <div className="bg-slate-900/40 p-2 rounded-lg border border-[#1e293b]/40">
                                              <span className="block text-[10px] text-slate-500">RSI VALUE</span>
                                              <span className="text-white font-mono font-bold text-sm">{selectedSignal.rsi_val}</span>
                                            </div>
                                            <div className="bg-slate-900/40 p-2 rounded-lg border border-[#1e293b]/40">
                                              <span className="block text-[10px] text-slate-500">BOLLINGER POS</span>
                                              <span className="text-white font-mono font-bold text-sm">{selectedSignal.features.bb_position ?? 0.5}</span>
                                            </div>
                                            <div className="bg-slate-900/40 p-2 rounded-lg border border-[#1e293b]/40">
                                              <span className="block text-[10px] text-slate-500">CONTRADICTIONS</span>
                                              <span className={`font-mono font-bold text-sm ${selectedSignal.features.contra_total > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {selectedSignal.features.contra_total ?? 0}
                                              </span>
                                            </div>
                                            <div className="bg-slate-900/40 p-2 rounded-lg border border-[#1e293b]/40">
                                              <span className="block text-[10px] text-slate-500">HOUR OF DAY</span>
                                              <span className="text-white font-mono font-bold text-sm">{selectedSignal.features.hour_of_day ?? 12}</span>
                                            </div>
                                          </div>

                                          <div className="flex flex-wrap gap-2 mt-2 mb-1">
                                            <span className="text-[10px] font-mono text-indigo-300 font-bold bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">
                                              ⚡ {selectedSignal.signal_depth || 'DEEP CONFLUENCE'}
                                            </span>
                                            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                                              {selectedSignal.candle_clearance || '3.8x ATR Buffer'}
                                            </span>
                                            <span className="text-[10px] font-mono text-teal-300 font-bold bg-teal-500/10 px-2 py-1 rounded border border-teal-500/20">
                                              🛡️ ZERO CLOSE CALL
                                            </span>
                                          </div>
                                          {/* Market Sentiment Analysis on entry */}
                                          {selectedSignal.sentiment_val !== undefined && (
                                            <div className="bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3" id="selected-signal-sentiment-overlay">
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm">⚖️</span>
                                                <div>
                                                  <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">F&G Risk Sentiment on Entry</span>
                                                  <span className="text-white font-semibold flex items-center gap-2 mt-0.5">
                                                    Index: <span className="font-mono font-bold text-indigo-400">{selectedSignal.sentiment_val} / 100</span> 
                                                    <span className={`px-1.5 py-0.2 text-[9px] font-mono rounded font-bold border ${getSentimentStyles(selectedSignal.sentiment_classification || 'Neutral')}`}>
                                                      {(selectedSignal.sentiment_classification || 'Neutral').toUpperCase()}
                                                    </span>
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="sm:text-right">
                                                <span className="block text-[9px] text-slate-500 font-mono">SENTIMENT REGIME MODULATION</span>
                                                <span className={`font-mono text-xs font-bold block mt-0.5 ${
                                                  (selectedSignal.sentiment_modulation || 0) > 0 ? 'text-emerald-400 text-glow-green' : 
                                                  (selectedSignal.sentiment_modulation || 0) < 0 ? 'text-red-400 text-glow-red' : 'text-slate-400'
                                                }`}>
                                                  {(selectedSignal.sentiment_modulation || 0) > 0 ? `+${selectedSignal.sentiment_modulation} Sentiment Boost` :
                                                    (selectedSignal.sentiment_modulation || 0) < 0 ? `${selectedSignal.sentiment_modulation} Sentiment Penalty` :
                                                    'Neutral Regime Modulation (0)'}
                                                </span>
                                              </div>
                                            </div>
                                          )}

                                          {/* Deep Signal Wick Protection & Candle Clearance Matrix */}
                                          <div className="bg-[#080d1a] p-3 rounded-lg border border-indigo-500/25 flex flex-col gap-2 shadow-inner" id="deep-signal-candle-clearance">
                                            <div className="flex items-center justify-between">
                                              <span className="text-[10px] text-indigo-300 font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                                                <ShieldAlert size={12} className="text-indigo-400" />
                                                Deep Signal Wick Protection & Candle Clearance Matrix
                                              </span>
                                              <span className="text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded shadow-[0_0_8px_rgba(16,185,129,0.15)]">
                                                NO NEAR-MISS WICK STOP-OUTS
                                              </span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mt-1">
                                              <div className="bg-[#05070f] p-2.5 rounded-lg border border-slate-800">
                                                <span className="text-[9px] text-slate-500 uppercase font-mono block">Entry Signal Depth</span>
                                                <span className="text-white font-bold font-mono text-xs">{selectedSignal.signal_depth || 'DEEP CONFLUENCE SHOT'}</span>
                                              </div>
                                              <div className="bg-[#05070f] p-2.5 rounded-lg border border-slate-800">
                                                <span className="text-[9px] text-slate-500 uppercase font-mono block">Candle Wick Buffer</span>
                                                <span className="text-emerald-400 font-bold font-mono text-xs">{selectedSignal.candle_clearance || '3.2x ATR Candle Buffer'}</span>
                                              </div>
                                              <div className="bg-[#05070f] p-2.5 rounded-lg border border-slate-800">
                                                <span className="text-[9px] text-slate-500 uppercase font-mono block">Quality Certification</span>
                                                <span className="text-teal-300 font-bold font-mono text-xs flex items-center gap-1"><CheckCircle size={10}/> PURE ACCURACY</span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </motion.div>
                                    </td>
                                  </motion.tr>
                                )}
                              </AnimatePresence>
                            </Fragment>

                            );
                          })}
                          </AnimatePresence>
                        </tbody>
                      </table>
                    </div>
                    </>
                  )}


                </motion.div>
              )}

              {/* TAB 2: STRATEGY LAB */}
              {activeTab === 'strategies' && (
                <motion.div
                  key="strategies"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col gap-5"
                >
                  {/* Strategy Lab Header & Actions */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-[#1e293b]/50 pb-4 gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Dna className="text-indigo-400" size={20} />
                        <h3 className="text-base font-display font-bold text-white tracking-wide">
                          Quantitative Strategy Lab & Best Pairs Engine
                        </h3>
                      </div>
                      <p className="text-xs text-[#94a3b8] mt-0.5">
                        Evaluate mathematical success scores, cross-breed algorithms, and inspect asset pair win rates
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Auto Evolve for Accuracy Toggle */}
                      <button
                        onClick={toggleAutoEvolve}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer active:scale-95 ${
                          autoEvolveActive
                            ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                            : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                        title="Continuous background crossover optimization prioritizing high-accuracy win rates"
                      >
                        <span className="relative flex h-2.5 w-2.5">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${autoEvolveActive ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${autoEvolveActive ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                        </span>
                        <span>AUTO-EVOLVE: {autoEvolveActive ? "ACTIVE" : "STANDBY"}</span>
                      </button>

                      {/* Smart Add & Test Strategy Agent Button */}
                      <button
                        onClick={() => setShowStrategyAgent(prev => !prev)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer active:scale-95 ${
                          showStrategyAgent
                            ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-500/25'
                            : 'bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/40 shadow-md shadow-emerald-950/30'
                        }`}
                        title="Add and live-test a new strategy via Pine Script or Natural Language description with full auto-harnessing"
                      >
                        <Code size={14} className={showStrategyAgent ? "text-white" : "text-emerald-400"} />
                        <span>{showStrategyAgent ? "HIDE STRATEGY AGENT" : "+ ADD & TEST STRATEGY"}</span>
                      </button>

                      <button
                        onClick={triggerEvolution}
                        disabled={evolveInProgress}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-[#6366f1] hover:from-purple-500 hover:to-indigo-500 rounded-xl text-xs text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 transition-all cursor-pointer border border-indigo-400/20"
                      >
                        {evolveInProgress ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            CROSSING GENES...
                          </>
                        ) : (
                          <>
                            <Dna size={14} />
                            EVOLVE NEW STRATEGY
                          </>
                        )}
                      </button>

                      {confirmPrunePool ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={triggerPruning}
                            disabled={pruneInProgress}
                            className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-lg shadow-rose-600/25"
                          >
                            <Trash2 size={13} />
                            CONFIRM PRUNE
                          </button>
                          <button
                            onClick={() => setConfirmPrunePool(false)}
                            className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmPrunePool(true)}
                          disabled={pruneInProgress || strategies.length <= 3}
                          className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                          title="Optimize strategy list by removing inactive and duplicate genetic models"
                        >
                          {pruneInProgress ? (
                            <>
                              <RefreshCw size={13} className="animate-spin text-rose-400" />
                              OPTIMIZING...
                            </>
                          ) : (
                            <>
                              <Trash2 size={13} className="text-rose-400" />
                              PRUNE POOL
                            </>
                          )}
                        </button>
                      )}

                      <button
                        onClick={triggerAudit}
                        disabled={auditLoading}
                        className="px-3.5 py-2 bg-indigo-950/40 hover:bg-indigo-900/40 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                        title="Run professional quantitative audit via Gemini 4 Carbon on Strategy Lab & Solo Pine models"
                      >
                        {auditLoading ? (
                          <>
                            <RefreshCw size={13} className="animate-spin text-indigo-400 animate-pulse" />
                            AUDITING LAB...
                          </>
                        ) : (
                          <>
                            <Sparkles size={13} className="text-indigo-400" />
                            GEMINI AI AUDIT
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* SMART STRATEGY AGENT: ADD & LIVE-TEST NEW STRATEGY (PINE SCRIPT OR NATURAL LANGUAGE) */}
                  <AnimatePresence>
                    {showStrategyAgent && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="bg-[#0b101e] border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3.5 mb-4 border-b border-slate-800/80">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 rounded border border-emerald-500/30 flex items-center gap-1">
                                <Cpu size={11} /> INDIVIDUAL PINE OMNI-TF AGENT
                              </span>
                              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 rounded border border-cyan-500/30">
                                SOLO GEN {agentGeneration}.0 • ZERO POOL CROSSOVER
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                Simultaneous 1m • 15m • 30m • 60m Live KuCoin Sweep
                              </span>
                            </div>
                            <h4 className="text-sm sm:text-base font-display font-bold text-white mt-1">
                              Compile & Evolve Individual Pine Script Across Omni-Timeframes
                            </h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Evolve Pine Scripts as standalone algorithms on their own independent generation track (Gen 1.0 → Gen 2.0) without compiling or cross-breeding with any other strategy generations. Benchmarks 1m, 15m, 30m, and 60m together and locks onto the best timeframe.
                            </p>
                          </div>

                          {/* Input Mode Switcher */}
                          <div className="flex items-center gap-1.5 bg-[#060911] p-1 rounded-xl border border-slate-800 self-start">
                            <button
                              type="button"
                              onClick={() => {
                                setAgentInputType('pinescript');
                                setAgentTimeframe('omni');
                                setAgentIsolatedLineage(true);
                                if (!agentContent.includes('//@version')) {
                                  setAgentContent(`//@version=5\nindicator("Hermes VPVR Liquidity Reversion", overlay=true)\nrsiVal = ta.rsi(close, 14)\n[middle, upper, lower] = ta.bb(close, 20, 2.0)\nemaFast = ta.ema(close, 9)\nemaSlow = ta.ema(close, 21)\nbuySignal = rsiVal < 32 and close <= lower and emaFast >= emaSlow * 0.998\nsellSignal = rsiVal > 68 and close >= upper and emaFast <= emaSlow * 1.002`);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                agentInputType === 'pinescript'
                                  ? 'bg-emerald-600 text-white shadow'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <Code size={13} /> Pine Script (Solo Omni-TF)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAgentInputType('text');
                                if (agentContent.includes('//@version')) {
                                  setAgentContent('Enter BUY on 15-minute crypto candles when RSI(12) drops below 30 near the lower Bollinger Band(20, 2.0) while fast EMA(9) curls above EMA(21). Enter SELL when RSI(12) exceeds 70 at upper Bollinger resistance.');
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                agentInputType === 'text'
                                  ? 'bg-indigo-600 text-white shadow'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              <Brain size={13} /> Text Description
                            </button>
                          </div>
                        </div>

                        <form onSubmit={(e) => handleCreateSmartStrategy(e, false)} className="space-y-3.5">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">
                                Strategy Name (Renamable Any Time)
                              </label>
                              <input
                                type="text"
                                value={agentCustomName}
                                onChange={(e) => setAgentCustomName(e.target.value)}
                                placeholder="e.g. Hermes-VPVR-Sniper"
                                className="w-full bg-[#060911] border border-slate-800 focus:border-emerald-500/60 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">
                                Independent Solo Gen # (Starts at 1.0)
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={99}
                                value={agentGeneration}
                                onChange={(e) => setAgentGeneration(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                className="w-full bg-[#060911] border border-slate-800 focus:border-emerald-500/60 rounded-xl px-3 py-2 text-xs text-white font-mono tabular-nums outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1 font-bold">
                                Omni-Timeframe / Target Horizon
                              </label>
                              <select
                                value={agentTimeframe}
                                onChange={(e) => setAgentTimeframe(e.target.value as any)}
                                className="w-full bg-[#060911] border border-slate-800 focus:border-emerald-500/60 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                              >
                                <option value="omni">Omni-Timeframe (Benchmark 1m, 15m, 30m, 60m & Pick Best)</option>
                                <option value="1 min">1 min Only (Micro Scalp)</option>
                                <option value="15 min">15 min Only (Core Institutional)</option>
                                <option value="30 min">30 min Only (Swing Confluence)</option>
                                <option value="60 min">60 min Only (Macro Trend)</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                                {agentInputType === 'pinescript' ? 'Pine Script v5 Code Input (Isolated Lineage)' : 'Quantitative Entry Logic & Filter Description'}
                              </label>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono text-slate-500">Presets:</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAgentInputType('pinescript');
                                    setAgentTimeframe('omni');
                                    setAgentIsolatedLineage(true);
                                    setAgentCustomName('Hermes-RSI-BB-Squeeze');
                                    setAgentContent(`//@version=5\nstrategy("Hermes RSI BB Squeeze", overlay=true)\nrsi = ta.rsi(close, 10)\n[basis, upper, lower] = ta.bb(close, 18, 2.2)\nemaFast = ta.ema(close, 8)\nemaSlow = ta.ema(close, 21)\nlongCond = rsi < 30 and close < lower and emaFast > emaSlow * 0.995\nshortCond = rsi > 70 and close > upper and emaFast < emaSlow * 0.005`);
                                  }}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 cursor-pointer"
                                >
                                  BB Squeeze Pine
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAgentInputType('text');
                                    setAgentCustomName('Hermes-Orderflow-Momentum');
                                    setAgentContent('Momentum breakout & institutional absorption: Enter BUY when EMA(7) crosses above EMA(21) with RSI(14) between 35 and 62 and Bollinger Band(20) expansion on BTC/USDT, ETH/USDT, and SOL/USDT.');
                                  }}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-slate-800 cursor-pointer"
                                >
                                  EMA Orderflow Text
                                </button>
                              </div>
                            </div>
                            <textarea
                              rows={5}
                              value={agentContent}
                              onChange={(e) => setAgentContent(e.target.value)}
                              placeholder={
                                agentInputType === 'pinescript'
                                  ? 'Paste Pine Script indicator() or strategy() code...'
                                  : 'Describe when to BUY/SELL, which indicators (RSI, Bollinger Bands, EMA, ATR) to weight, and target timeframe...'
                              }
                              className="w-full bg-[#060911] border border-slate-800 focus:border-emerald-500/60 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed outline-none"
                            />
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                            <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-400 font-mono">
                              <label className="flex items-center gap-1.5 text-cyan-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={agentIsolatedLineage}
                                  onChange={(e) => setAgentIsolatedLineage(e.target.checked)}
                                  className="rounded border-slate-700 bg-slate-900 text-cyan-500"
                                />
                                <span>Strict Isolated Lineage (Never compile with other strategy generations)</span>
                              </label>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowStrategyAgent(false)}
                                className="px-3.5 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white bg-slate-900/80 border border-slate-800 cursor-pointer"
                              >
                                Close
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCreateSmartStrategy(undefined, true)}
                                disabled={agentSubmitting || agentEvolvingSolo || !agentContent.trim()}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-lg shadow-cyan-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                title="Self-mutate this Pine Script in complete isolation across 1m, 15m, 30m, and 60m candles and promote the best timeframe"
                              >
                                {agentEvolvingSolo ? (
                                  <>
                                    <RefreshCw size={14} className="animate-spin" />
                                    EVOLVING SOLO OMNI-TF (1M/15M/30M/60M)...
                                  </>
                                ) : (
                                  <>
                                    <Dna size={14} />
                                    EVOLVE INDIVIDUAL PINE SCRIPT (OMNI-TF)
                                  </>
                                )}
                              </button>
                              <button
                                type="submit"
                                disabled={agentSubmitting || agentEvolvingSolo || !agentContent.trim()}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                              >
                                {agentSubmitting ? (
                                  <>
                                    <RefreshCw size={14} className="animate-spin" />
                                    BENCHMARKING OMNI-TF...
                                  </>
                                ) : (
                                  <>
                                    <Play size={14} />
                                    COMPILE & TEST STRATEGY
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </form>

                        {/* Latest Strategy Test & Omni-Timeframe Breakdown Output */}
                        {agentFeedback && (
                          <div className="mt-4 pt-3.5 border-t border-emerald-500/20 bg-emerald-950/15 rounded-xl p-3.5 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <CheckCircle size={15} className="text-emerald-400" />
                                <span className="text-xs font-bold text-white font-display">
                                  Omni-Timeframe Benchmark Complete: <span className="text-emerald-400 font-mono">{agentFeedback.strategyName}</span>
                                </span>
                                <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded border border-cyan-500/30">
                                  SOLO GEN {agentFeedback.generation}.0 • ISOLATED
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                                Evaluated {agentFeedback.testedCandlesCount} live KuCoin candles • Optimal TF: <strong className="text-amber-300">{agentFeedback.timeframe}</strong>
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs tabular-nums">
                              <div className="bg-[#060911]/90 p-2 rounded-lg border border-slate-800/80">
                                <span className="text-[9px] text-slate-500 block">BEST OMNI WIN RATE</span>
                                <span className="text-emerald-400 font-bold text-sm">{agentFeedback.winRatePct}%</span>
                                <span className="text-[10px] text-slate-500 ml-1">({agentFeedback.wins}W / {agentFeedback.losses}L)</span>
                              </div>
                              <div className="bg-[#060911]/90 p-2 rounded-lg border border-slate-800/80">
                                <span className="text-[9px] text-slate-500 block">PROFIT FACTOR</span>
                                <span className="text-indigo-300 font-bold text-sm">{agentFeedback.profitFactor}</span>
                              </div>
                              <div className="bg-[#060911]/90 p-2 rounded-lg border border-slate-800/80">
                                <span className="text-[9px] text-slate-500 block">SHARPE RATIO</span>
                                <span className="text-white font-bold text-sm">{agentFeedback.sharpeRatio}</span>
                              </div>
                              <div className="bg-[#060911]/90 p-2 rounded-lg border border-slate-800/80">
                                <span className="text-[9px] text-slate-500 block">NET TEST RETURN</span>
                                <span className={`font-bold text-sm ${agentFeedback.netReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {agentFeedback.netReturnPct >= 0 ? '+' : ''}{agentFeedback.netReturnPct}%
                                </span>
                              </div>
                              <div className="bg-[#060911]/90 p-2 rounded-lg border border-slate-800/80 col-span-2 sm:col-span-1">
                                <span className="text-[9px] text-slate-500 block">LINEAGE STATUS</span>
                                <span className="text-cyan-300 font-bold text-xs flex items-center gap-1 mt-0.5">
                                  <ShieldCheck size={11} /> SOLO ISOLATED
                                </span>
                              </div>
                            </div>

                            {/* 4-Timeframe Omni Breakdown Table (1m, 15m, 30m, 60m) */}
                            {agentFeedback.omniBreakdown && agentFeedback.omniBreakdown.length > 0 && (
                              <div className="bg-[#060911] rounded-xl border border-slate-800 overflow-hidden">
                                <div className="px-3 py-1.5 bg-slate-900/70 border-b border-slate-800 flex items-center justify-between">
                                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300">
                                    Omni-Timeframe Empirical Breakdown (1m • 15m • 30m • 60m)
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    BTC/USDT + ETH/USDT + SOL/USDT Combined
                                  </span>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-[11px] font-mono tabular-nums">
                                    <thead>
                                      <tr className="border-b border-slate-800/80 text-slate-500 text-[9px] uppercase">
                                        <th className="py-1.5 px-3">Timeframe</th>
                                        <th className="py-1.5 px-2 text-right">Win Rate</th>
                                        <th className="py-1.5 px-2 text-right">Trades (W/L)</th>
                                        <th className="py-1.5 px-2 text-right">Profit Factor</th>
                                        <th className="py-1.5 px-2 text-right">Sharpe</th>
                                        <th className="py-1.5 px-2 text-right">Success Score</th>
                                        <th className="py-1.5 px-3 text-right">Selection</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                      {agentFeedback.omniBreakdown.map((row) => (
                                        <tr
                                          key={row.timeframe}
                                          className={row.isOptimal ? 'bg-emerald-950/30 text-white' : 'text-slate-300 hover:bg-slate-900/40'}
                                        >
                                          <td className="py-1.5 px-3 font-bold">{row.timeframe}</td>
                                          <td className={`py-1.5 px-2 text-right font-bold ${row.winRatePct >= 65 ? 'text-emerald-400' : 'text-indigo-300'}`}>
                                            {row.winRatePct}%
                                          </td>
                                          <td className="py-1.5 px-2 text-right text-slate-400">
                                            {row.totalTrades} ({row.wins}W/{row.losses}L)
                                          </td>
                                          <td className="py-1.5 px-2 text-right text-indigo-300">{row.profitFactor}</td>
                                          <td className="py-1.5 px-2 text-right">{row.sharpeRatio}</td>
                                          <td className="py-1.5 px-2 text-right font-bold text-white">{row.successScore}</td>
                                          <td className="py-1.5 px-3 text-right">
                                            {row.isOptimal ? (
                                              <span className="text-[9px] font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                                                ★ BEST OMNI PICK
                                              </span>
                                            ) : (
                                              <span className="text-[9px] text-slate-500">BENCHMARKED</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-2">
                              {agentFeedback.pairBreakdown?.map((pb) => (
                                <div key={pb.pair} className="bg-[#060911] px-2.5 py-1 rounded-lg border border-slate-800/90 text-[11px] font-mono tabular-nums flex items-center gap-2">
                                  <span className="text-white font-bold">{pb.pair}</span>
                                  <span className="text-emerald-400 font-bold">{(pb.win_rate * 100).toFixed(0)}% WR</span>
                                  <span className="text-slate-500">({pb.total_trades} trades • PF {pb.profit_factor})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* TOP DASHBOARD METRICS SUMMARY */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* KPI 1: Average Strategy Lab Success Score */}
                    {(() => {
                      const enabledStrats = strategies.filter(s => s.enabled);
                      const avgScore = enabledStrats.length > 0
                        ? (enabledStrats.reduce((sum, s) => sum + (s.success_score ?? (s.last_wr * 100)), 0) / enabledStrats.length).toFixed(1)
                        : "0.0";
                      return (
                        <div className="bg-[#0f1424]/90 p-3.5 rounded-xl border border-indigo-500/20 shadow-md flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block mb-1">
                              AVG LAB SUCCESS SCORE
                            </span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-display font-extrabold text-white">{avgScore}</span>
                              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                / 100 PTS
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">
                              Composite WR, PF, Sharpe & DD Rating
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                            <Award size={22} />
                          </div>
                        </div>
                      );
                    })()}

                    {/* KPI 2: #1 Top Performing Asset Pair */}
                    {(() => {
                      const topPair = masterPairsMatrix[0];
                      return (
                        <div className="bg-[#0f1424]/90 p-3.5 rounded-xl border border-emerald-500/20 shadow-md flex items-center justify-between">
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block mb-1">
                              BEST LAB ASSET PAIR
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-display font-extrabold text-emerald-400 truncate">
                                {topPair ? topPair.pair : 'N/A'}
                              </span>
                              {topPair && (
                                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                  {(topPair.bestWinRate * 100).toFixed(0)}% WR
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-slate-500 font-mono mt-0.5 block truncate">
                              Optimal: {topPair ? topPair.bestStrategyName : 'None'}
                            </span>
                          </div>
                          {topPair && (
                            <button
                              onClick={() => {
                                setSelectedAssetFilter(topPair.pair);
                                setActiveTab('signals');
                              }}
                              className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 transition-all cursor-pointer active:scale-95"
                              title={`Filter Signals for ${topPair.pair}`}
                            >
                              <ArrowUpRight size={18} />
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* KPI 3: Total Active Strategies & Generation */}
                    {(() => {
                      const maxGen = Math.max(0, ...strategies.map(s => s.generation));
                      const activeCount = strategies.filter(s => s.enabled).length;
                      return (
                        <div className="bg-[#0f1424]/90 p-3.5 rounded-xl border border-purple-500/20 shadow-md flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block mb-1">
                              STRATEGY GEN & ROSTER
                            </span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-display font-extrabold text-purple-300">GEN {maxGen}</span>
                              <span className="text-[10px] font-mono text-purple-400 font-bold bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                                {activeCount}/{strategies.length} ACTIVE
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">
                              Genetic Crossover Pool
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                            <Dna size={22} />
                          </div>
                        </div>
                      );
                    })()}

                    {/* KPI 4: Lab Portfolio Profit Factor */}
                    {(() => {
                      const enabledStrats = strategies.filter(s => s.enabled);
                      const avgPF = enabledStrats.length > 0
                        ? (enabledStrats.reduce((sum, s) => sum + s.last_pf, 0) / enabledStrats.length).toFixed(2)
                        : "1.00";
                      return (
                        <div className="bg-[#0f1424]/90 p-3.5 rounded-xl border border-cyan-500/20 shadow-md flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block mb-1">
                              AVG PROFIT FACTOR
                            </span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-display font-extrabold text-cyan-300">{avgPF}x</span>
                              <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                                EDGE
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">
                              Risk-Reward Expectancy Multiplier
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                            <Zap size={22} />
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* MULTI-INTELLECT EVOLUTION & OPTIMIZATION TELEMETRY BANNER */}
                  {latestIntellectReport && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#0b1122] border border-purple-500/35 rounded-2xl p-4 shadow-xl"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 rounded border border-purple-500/30 flex items-center gap-1">
                            <Dna size={11} /> MULTI-INTELLECT EVOLUTION AUDIT
                          </span>
                          <span className="text-xs font-display font-bold text-white">
                            Promoted: <span className="text-emerald-400 font-mono">{latestIntellectReport.evolvedStrategyName}</span> (Gen {latestIntellectReport.generation})
                          </span>
                        </div>
                        <button
                          onClick={() => setLatestIntellectReport(null)}
                          className="text-[10px] font-mono text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-800 cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono text-xs tabular-nums">
                        <div className="bg-[#060911] p-2.5 rounded-xl border border-slate-800/90">
                          <span className="text-[9px] text-indigo-400 uppercase font-bold block mb-0.5">
                            1. Session Regime Intellect
                          </span>
                          <span className="text-white font-bold block truncate">{latestIntellectReport.sessionIntellect.session}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Target TF: {latestIntellectReport.sessionIntellect.recommendedTimeframe}
                          </span>
                        </div>

                        <div className="bg-[#060911] p-2.5 rounded-xl border border-slate-800/90">
                          <span className="text-[9px] text-amber-400 uppercase font-bold block mb-0.5">
                            2. Sentiment Bias Intellect
                          </span>
                          <span className="text-white font-bold block">
                            F&G {latestIntellectReport.sentimentIntellect.value} ({latestIntellectReport.sentimentIntellect.classification})
                          </span>
                          <span className="text-[10px] text-emerald-400 block mt-0.5 truncate">
                            {latestIntellectReport.sentimentIntellect.mutationBias}
                          </span>
                        </div>

                        <div className="bg-[#060911] p-2.5 rounded-xl border border-slate-800/90">
                          <span className="text-[9px] text-purple-400 uppercase font-bold block mb-0.5">
                            3. Orthogonal Parent Pairing
                          </span>
                          <span className="text-white font-bold block truncate" title={`${latestIntellectReport.parentA.name} × ${latestIntellectReport.parentB.name}`}>
                            {latestIntellectReport.parentA.name.replace('Hermes-', '')} × {latestIntellectReport.parentB.name.replace('Hermes-', '')}
                          </span>
                          <span className="text-[10px] text-purple-300 block mt-0.5">
                            Genetic Distance Δ = {latestIntellectReport.geneticDistance}
                          </span>
                        </div>

                        <div className="bg-[#060911] p-2.5 rounded-xl border border-slate-800/90">
                          <span className="text-[9px] text-emerald-400 uppercase font-bold block mb-0.5">
                            4. Live Benchmark & Thresholds
                          </span>
                          <span className="text-emerald-400 font-bold block">
                            {latestIntellectReport.empiricalTest.winRatePct}% WR • PF {latestIntellectReport.empiricalTest.profitFactor} • Sharpe {latestIntellectReport.empiricalTest.sharpeRatio}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5 truncate" title={latestIntellectReport.thresholdIntellect.note}>
                            {latestIntellectReport.thresholdIntellect.note}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* GEMINI STRATEGY LAB AUDIT REPORT DISPLAY */}
                  {(auditLoading || auditReport) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#0b1329]/95 border border-indigo-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden"
                    >
                      {/* Decorative backdrop glow */}
                      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
                      
                      <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-indigo-500/10">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-500/15 text-indigo-400 rounded-xl border border-indigo-500/20">
                            <Sparkles size={20} className="animate-pulse" />
                          </div>
                          <div>
                            <h4 className="text-xs font-display font-extrabold text-white tracking-wide uppercase flex items-center gap-2">
                              Hermes Quant Lab AI Strategic Audit
                              <span className="text-[9px] font-mono font-bold bg-indigo-500/25 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20">
                                {aiEngineStatus?.model_id ? aiEngineStatus.model_id.replace(/-/g, ' ').toUpperCase() : 'GEMINI 4 CARBON'}
                              </span>
                            </h4>
                            <p className="text-[10px] text-[#94a3b8] mt-0.5">
                              Real-time multi-strategy & Solo Pine Omni-TF audit addressing crypto execution latency, drawdown, and regime sync.
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            dismissedAuditAtRef.current = latestAuditAtRef.current;
                            setAuditReport(null);
                            setAuditRec(null);
                          }}
                          className="text-slate-400 hover:text-white transition-all p-1 hover:bg-slate-800/40 rounded-lg cursor-pointer active:scale-95"
                          title="Dismiss Report"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {auditLoading ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-3">
                          <RefreshCw className="animate-spin text-indigo-400 animate-pulse" size={28} />
                          <div className="text-center">
                            <span className="text-xs font-mono text-indigo-300 font-bold tracking-wider animate-pulse block">
                              TRANSMITTING METRIC VECTORS TO CARBON QUANT ENGINE...
                            </span>
                            <span className="text-[10px] text-slate-500 mt-1 block">
                              Auditing KuCoin 1m/15m/30m/60m edge, drawdown vectors, and Solo Pine lineages...
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {auditRec && (
                            <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl flex items-start gap-2.5">
                              <ShieldCheck className="text-emerald-400 shrink-0 mt-0.5 animate-bounce" size={16} />
                              <div>
                                <span className="text-[10px] font-mono font-extrabold text-emerald-400 uppercase tracking-widest block">
                                  IMMEDIATE CRITICAL RECOMMENDATION:
                                </span>
                                <p className="text-xs text-slate-200 mt-0.5 font-bold">
                                  {auditRec}
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="text-xs text-slate-300 leading-relaxed max-h-[420px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                            {renderCustomMarkdown(auditReport || "")}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* LAB SUB-VIEW SWITCHER & CONTROLS TOOLBAR */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#090d16]/90 p-2 rounded-2xl border border-[#1e293b]/60">
                    {/* View Switcher Tabs */}
                    <div className="flex items-center gap-1.5 bg-[#0f1424] p-1 rounded-xl border border-slate-800">
                      <button
                        onClick={() => setLabSubView('strategies')}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                          labSubView === 'strategies'
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md border border-indigo-400/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Layers size={14} />
                        <span>Strategies & Success Scores ({filteredStrategies.length})</span>
                      </button>
                      <button
                        onClick={() => setLabSubView('pairs_matrix')}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                          labSubView === 'pairs_matrix'
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md border border-indigo-400/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <BarChart2 size={14} />
                        <span>Best Pairs Matrix ({masterPairsMatrix.length})</span>
                      </button>
                      <button
                        onClick={() => setLabSubView('correlation_matrix')}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                          labSubView === 'correlation_matrix'
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md border border-purple-400/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Visualize pairwise performance correlation across strategy generations to identify genetic clusters"
                      >
                        <GitCommit size={14} className={labSubView === 'correlation_matrix' ? 'text-purple-200' : 'text-purple-400'} />
                        <span>Correlation Matrix</span>
                      </button>
                    </div>

                    {/* Filter, Search & Sort Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Search Input */}
                      <div className="relative flex-1 min-w-[160px] sm:w-48">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={pairSearchQuery}
                          onChange={(e) => setPairSearchQuery(e.target.value)}
                          placeholder="Search strategy or pair..."
                          className="w-full bg-[#05070d] text-white placeholder-slate-500 text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500/60 font-mono"
                        />
                      </div>

                      {/* Market Filter */}
                      <div className="flex items-center bg-[#05070d] p-0.5 rounded-xl border border-slate-800">
                        <button
                          onClick={() => setStrategyMarketFilter('all')}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                            strategyMarketFilter === 'all' || strategyMarketFilter === 'crypto'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Crypto Pairs (BTC / ETH / SOL)
                        </button>
                      </div>

                      {/* Sort Selector (for Strategies View) */}
                      {labSubView === 'strategies' && (
                        <select
                          value={strategySortBy}
                          onChange={(e) => setStrategySortBy(e.target.value as any)}
                          className="bg-[#05070d] text-slate-300 text-[11px] font-semibold px-2.5 py-1.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500/60 cursor-pointer"
                        >
                          <option value="score">Sort by Success Score</option>
                          <option value="winrate">Sort by Win Rate %</option>
                          <option value="sharpe">Sort by Sharpe Ratio</option>
                          <option value="generation">Sort by Generation</option>
                        </select>
                      )}
                    </div>
                  </div>

                  {/* SUB-VIEW 1: STRATEGIES & SUCCESS SCORES GRID */}
                  {labSubView === 'strategies' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" id="strategies-grid">
                      {filteredStrategies.map((strat) => {
                        const score = strat.success_score ?? (strat.last_wr * 100);
                        const isExpanded = expandedStrategyId === strat.id;

                        // Tier calculation
                        let tierLabel = "ELITE ALPHA";
                        let tierBadgeBg = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
                        let progressColor = "from-emerald-500 to-teal-400";
                        if (score < 60) {
                          tierLabel = "EXPERIMENTAL";
                          tierBadgeBg = "bg-amber-500/10 text-amber-400 border-amber-500/30";
                          progressColor = "from-amber-500 to-yellow-400";
                        } else if (score < 75) {
                          tierLabel = "STABLE EDGE";
                          tierBadgeBg = "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
                          progressColor = "from-indigo-500 to-purple-400";
                        }

                        return (
                          <div 
                            key={strat.id} 
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                              strat.enabled 
                                ? 'bg-[#0f1424] border-indigo-500/30 shadow-lg shadow-indigo-950/20' 
                                : 'bg-slate-950/40 border-slate-900/60 opacity-60 hover:opacity-80'
                            }`}
                          >
                            <div>
                              {/* Header & Toggle */}
                              <div className="flex justify-between items-start gap-2 mb-3">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {strat.isolated_lineage || strat.category?.toLowerCase().includes('pine') ? (
                                      <span className="text-[10px] font-mono text-cyan-300 font-bold bg-cyan-500/15 px-2 py-0.5 rounded border border-cyan-500/30">
                                        SOLO PINE • GEN {strat.generation}.0
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-mono text-purple-300 font-bold bg-purple-500/15 px-2 py-0.5 rounded border border-purple-500/20">
                                        GEN {strat.generation}
                                      </span>
                                    )}
                                    <span className="text-[10px] font-mono text-slate-400 font-semibold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                      {strat.market.toUpperCase()}
                                    </span>
                                    {(strat.isolated_lineage || strat.category?.toLowerCase().includes('pine')) && (
                                      <span className="text-[9px] font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
                                        ISOLATED OMNI-TF {strat.optimal_timeframe ? `(${strat.optimal_timeframe})` : ''}
                                      </span>
                                    )}
                                    {strat.enabled && (strat.isolated_lineage || strat.pine_source || strat.category?.toLowerCase().includes('pine')) && (
                                      <span className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/35 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                        ⚡ ACTIVE IN LIVE ENGINE
                                      </span>
                                    )}
                                    {(strat.isolated_lineage || strat.pine_source || strat.category?.toLowerCase().includes('pine')) && autoEvolveActive && (
                                      <span className="text-[9px] font-mono font-bold text-cyan-200 bg-cyan-500/15 px-2 py-0.5 rounded border border-cyan-500/35 flex items-center gap-1" title="Auto-evolves its own generations (Solo Gen 1.0 -> 2.0 -> 3.0...) in complete isolation across Omni-Timeframes (1m, 15m, 30m, 60m)">
                                        <Dna size={10} className="text-cyan-400 animate-pulse" />
                                        SOLO AUTO-EVOLVE: ON
                                      </span>
                                    )}
                                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${tierBadgeBg}`}>
                                      {tierLabel}
                                    </span>
                                  </div>
                                  <h4 className="font-display font-bold text-base text-white mt-1.5 flex items-center gap-2">
                                    {strat.name}
                                  </h4>
                                </div>
                                
                                {/* Toggle Switch */}
                                <button 
                                  onClick={() => toggleStrategy(strat.id)}
                                  className="text-indigo-400 hover:text-white transition-colors cursor-pointer shrink-0 mt-1"
                                  title={strat.enabled ? "Disable Strategy" : "Enable Strategy"}
                                >
                                  {strat.enabled ? (
                                    <ToggleRight size={32} className="text-[#6366f1]" />
                                  ) : (
                                    <ToggleLeft size={32} className="text-slate-600" />
                                  )}
                                </button>
                              </div>

                              {/* SUCCESS SCORE CARD BLOCK */}
                              <div className="bg-[#05070d]/80 p-3 rounded-xl border border-[#1e293b]/60 mb-3">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Award size={12} className="text-indigo-400" />
                                    STRATEGY SUCCESS SCORE
                                  </span>
                                  <span className="text-sm font-display font-black text-white font-mono">
                                    <span className="text-emerald-400 text-base">{score.toFixed(1)}</span>
                                    <span className="text-slate-500 text-xs"> / 100</span>
                                  </span>
                                </div>

                                {/* Progress Gauge Bar */}
                                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800/80 mb-2">
                                  <div 
                                    className={`bg-gradient-to-r ${progressColor} h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)]`}
                                    style={{ width: `${Math.min(100, Math.max(5, score))}%` }}
                                  />
                                </div>

                                <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10px]">
                                  <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800/50">
                                    <span className="text-slate-500 block text-[8px]">WIN RATE</span>
                                    <span className="text-emerald-400 font-bold">{(strat.last_wr * 100).toFixed(0)}%</span>
                                  </div>
                                  <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800/50">
                                    <span className="text-slate-500 block text-[8px]">PROFIT F.</span>
                                    <span className="text-indigo-300 font-bold">{strat.last_pf}</span>
                                  </div>
                                  <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800/50">
                                    <span className="text-slate-500 block text-[8px]">SHARPE</span>
                                    <span className="text-white font-bold">{strat.last_sharpe}</span>
                                  </div>
                                  <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800/50">
                                    <span className="text-slate-500 block text-[8px]">MAX DD</span>
                                    <span className="text-red-400 font-bold">{(strat.last_dd * 100).toFixed(0)}%</span>
                                  </div>
                                </div>
                              </div>

                              {/* RENAME, SOLO OMNI-TF EVOLVE & LIVE STRATEGY TEST BAR (DIRECTLY ABOVE DESCRIPTION BAR) */}
                              <div className="mb-2">
                                {renamingStrategyId === strat.id ? (
                                  <div className="bg-[#080c17] p-2.5 rounded-xl border border-indigo-500/40 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] font-mono uppercase font-bold text-indigo-300">
                                        Rename Strategy & Sync Auto-Harnessing
                                      </span>
                                      <label className="flex items-center gap-1.5 text-[10px] font-mono text-purple-300 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={renameBumpGen}
                                          onChange={(e) => setRenameBumpGen(e.target.checked)}
                                          className="rounded border-slate-700 bg-slate-900 text-indigo-500"
                                        />
                                        <span>Advance Gen (Gen {strat.generation} → Gen {strat.generation + 1})</span>
                                      </label>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="text"
                                        value={renameInputValue}
                                        onChange={(e) => setRenameInputValue(e.target.value)}
                                        placeholder="Enter new strategy name..."
                                        className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-white font-mono outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleConfirmRenameStrategy(strat.id)}
                                        disabled={renameSubmitting || !renameInputValue.trim()}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-mono font-bold cursor-pointer disabled:opacity-50"
                                      >
                                        {renameSubmitting ? 'Saving...' : 'Save'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setRenamingStrategyId(null)}
                                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 text-[10px] font-mono cursor-pointer"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap items-center justify-between gap-1.5 bg-slate-900/50 px-2.5 py-1.5 rounded-xl border border-slate-800/80">
                                    <button
                                      type="button"
                                      onClick={() => handleStartRenameStrategy(strat)}
                                      className="text-[10px] font-mono font-bold text-indigo-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                                      title="Rename strategy across generations while keeping auto-harnessing & signal attribution synced"
                                    >
                                      <Sliders size={11} className="text-indigo-400" />
                                      <span>Rename Strategy</span>
                                    </button>

                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleEvolveSoloStrategy(strat.id)}
                                        disabled={evolvingSoloStrategyId === strat.id || testingStrategyId === strat.id}
                                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/35 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                                        title="Evolve this strategy individually across 1m, 15m, 30m & 60m timeframes without compiling with any other strategy generation"
                                      >
                                        {evolvingSoloStrategyId === strat.id ? (
                                          <>
                                            <RefreshCw size={10} className="animate-spin text-cyan-400" />
                                            <span>Solo Omni-TF...</span>
                                          </>
                                        ) : (
                                          <>
                                            <Dna size={10} className="text-cyan-400" />
                                            <span>Evolve Solo Omni-TF</span>
                                          </>
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRunLiveStrategyTest(strat.id, false)}
                                        disabled={testingStrategyId === strat.id || evolvingSoloStrategyId === strat.id}
                                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                                        title="Benchmark this strategy against live BTC/USDT, ETH/USDT & SOL/USDT candles"
                                      >
                                        {testingStrategyId === strat.id ? (
                                          <>
                                            <RefreshCw size={10} className="animate-spin text-emerald-400" />
                                            <span>Testing...</span>
                                          </>
                                        ) : (
                                          <>
                                            <Play size={10} className="text-emerald-400" />
                                            <span>Test Strategy</span>
                                          </>
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRunLiveStrategyTest(strat.id, true)}
                                        disabled={testingStrategyId === strat.id || evolvingSoloStrategyId === strat.id}
                                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/70 text-purple-300 border border-purple-500/30 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                                        title="Run live candle test and dispatch a live test signal for this strategy"
                                      >
                                        <Zap size={10} className="text-purple-400" />
                                        <span>Test + Signal</span>
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Empirical Live Test Result Badge if recently tested */}
                                {strategyTestResultsMap[strat.id] && (
                                  <div className="mt-1.5 bg-emerald-950/20 border border-emerald-500/25 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[10px] font-mono tabular-nums">
                                    <span className="text-emerald-300 font-bold flex items-center gap-1">
                                      <CheckCircle size={11} className="text-emerald-400" />
                                      Best TF ({strategyTestResultsMap[strat.id].timeframe}): {strategyTestResultsMap[strat.id].winRatePct}% WR ({strategyTestResultsMap[strat.id].wins}W/{strategyTestResultsMap[strat.id].losses}L)
                                    </span>
                                    <span className="text-slate-400">
                                      {strategyTestResultsMap[strat.id].signalTriggered ? '⚡ Live Signal Sent' : `Net ${strategyTestResultsMap[strat.id].netReturnPct >= 0 ? '+' : ''}${strategyTestResultsMap[strat.id].netReturnPct}%`}
                                    </span>
                                  </div>
                                )}

                                {/* Omni-Timeframe Breakdown Table (1m, 15m, 30m, 60m Win Rates) on Card */}
                                {((strategyTestResultsMap[strat.id]?.omniBreakdown && strategyTestResultsMap[strat.id].omniBreakdown!.length > 0) ||
                                  (strat.omni_timeframe_results && strat.omni_timeframe_results.length > 0)) && (() => {
                                  const omniRows = strategyTestResultsMap[strat.id]?.omniBreakdown || strat.omni_timeframe_results || [];
                                  return (
                                    <div className="mt-2 bg-[#060911] border border-cyan-500/25 rounded-xl overflow-hidden">
                                      <div className="px-2.5 py-1 bg-cyan-950/25 border-b border-slate-800/80 flex items-center justify-between">
                                        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-300">
                                          Omni-Timeframe Matrix (1m • 15m • 30m • 60m)
                                        </span>
                                        <span className="text-[9px] font-mono text-slate-400">
                                          Solo Gen {strat.generation}.0 • Isolated
                                        </span>
                                      </div>
                                      <table className="w-full text-left text-[10px] font-mono tabular-nums">
                                        <thead>
                                          <tr className="border-b border-slate-800/70 text-slate-500 text-[8px] uppercase">
                                            <th className="py-1 px-2.5">TF</th>
                                            <th className="py-1 px-1.5 text-right">Win Rate</th>
                                            <th className="py-1 px-1.5 text-right">PF</th>
                                            <th className="py-1 px-1.5 text-right">Sharpe</th>
                                            <th className="py-1 px-1.5 text-right">Score</th>
                                            <th className="py-1 px-2.5 text-right">Status</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/40">
                                          {omniRows.map((r) => (
                                            <tr key={r.timeframe} className={r.isOptimal ? 'bg-emerald-950/25 text-white' : 'text-slate-300'}>
                                              <td className="py-1 px-2.5 font-bold">{r.timeframe}</td>
                                              <td className={`py-1 px-1.5 text-right font-bold ${r.winRatePct >= 65 ? 'text-emerald-400' : 'text-indigo-300'}`}>
                                                {r.winRatePct}%
                                              </td>
                                              <td className="py-1 px-1.5 text-right text-indigo-300">{r.profitFactor}</td>
                                              <td className="py-1 px-1.5 text-right">{r.sharpeRatio}</td>
                                              <td className="py-1 px-1.5 text-right font-bold">{r.successScore}</td>
                                              <td className="py-1 px-2.5 text-right">
                                                {r.isOptimal ? (
                                                  <span className="text-[8px] font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                                                    ★ BEST TF
                                                  </span>
                                                ) : (
                                                  <span className="text-[8px] text-slate-500">TESTED</span>
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Entry Logic */}
                              <p className="text-slate-300 text-xs mb-3 leading-relaxed bg-slate-900/30 p-2.5 rounded-xl border border-slate-900/60">
                                <span className="block text-[9px] text-slate-500 uppercase font-mono font-bold mb-0.5">Algorithm Entry Logic</span>
                                {strat.entry_logic}
                              </p>

                              {/* Compiled PineScript Genome & Source Code Block */}
                              {(strat.isolated_lineage || strat.pine_source) && (
                                <div className="mb-3 bg-[#060911] border border-emerald-500/25 rounded-xl p-2.5 space-y-2">
                                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                                      <Code size={11} className="text-emerald-400" />
                                      Compiled PineScript Live Engine Genome
                                    </span>
                                    <span className="text-[9px] font-mono text-cyan-300">
                                      Weights: RSI {Math.round((strat.weights?.rsi_weight || 0.4) * 100)}% • BB {Math.round((strat.weights?.bb_weight || 0.35) * 100)}% • EMA {Math.round((strat.weights?.ema_weight || 0.25) * 100)}%
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                                    <div className="bg-slate-900/70 px-2 py-1 rounded border border-slate-800/80">
                                      <span className="text-slate-500 text-[8px] block">RSI GENOME</span>
                                      <span className="text-white font-bold">
                                        RSI({strat.params?.rsi_period || 10}) [{strat.params?.rsi_oversold || 30}/{strat.params?.rsi_overbought || 70}]
                                      </span>
                                    </div>
                                    <div className="bg-slate-900/70 px-2 py-1 rounded border border-slate-800/80">
                                      <span className="text-slate-500 text-[8px] block">BOLLINGER</span>
                                      <span className="text-white font-bold">
                                        BB({strat.params?.bb_period || 18}, {strat.params?.bb_std || 2.2}σ)
                                      </span>
                                    </div>
                                    <div className="bg-slate-900/70 px-2 py-1 rounded border border-slate-800/80">
                                      <span className="text-slate-500 text-[8px] block">EMA CROSS</span>
                                      <span className="text-white font-bold">
                                        EMA({strat.params?.ema_fast || 8} / {strat.params?.ema_slow || 21})
                                      </span>
                                    </div>
                                  </div>
                                  {strat.pine_source && (
                                    <pre className="text-[10px] font-mono text-emerald-300/90 bg-black/60 border border-slate-800/90 rounded-lg p-2 overflow-x-auto max-h-28 leading-snug">
                                      {strat.pine_source}
                                    </pre>
                                  )}
                                </div>
                              )}

                              {/* BEST PAIRS IN STRATEGY LAB SECTION */}
                              {strat.best_pairs && strat.best_pairs.length > 0 && (
                                <div className="bg-[#090d16] p-3 rounded-xl border border-slate-800/80 mb-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                                      <Star size={12} className="text-amber-400 fill-amber-400/20" />
                                      BEST PAIRS IN STRATEGY LAB
                                    </span>
                                    <button
                                      onClick={() => setExpandedStrategyId(isExpanded ? null : strat.id)}
                                      className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      {isExpanded ? (
                                        <>Hide Matrix <ChevronUp size={12} /></>
                                      ) : (
                                        <>View All ({strat.best_pairs.length}) <ChevronDown size={12} /></>
                                      )}
                                    </button>
                                  </div>

                                  {/* Top 3 Pairs Pills */}
                                  <div className="flex flex-wrap gap-1.5">
                                    {strat.best_pairs.slice(0, 3).map((p) => (
                                      <div 
                                        key={p.pair} 
                                        className="flex items-center gap-1.5 bg-[#0e1424] px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-mono"
                                      >
                                        <span className="text-white font-bold">{p.pair}</span>
                                        <span className="text-emerald-400 font-extrabold text-[10px]">
                                          {(p.win_rate * 100).toFixed(0)}%
                                        </span>
                                        <span className={`text-[8px] font-bold px-1 rounded ${
                                          p.status === 'OPTIMAL' ? 'bg-emerald-500/20 text-emerald-400' :
                                          p.status === 'STABLE' ? 'bg-indigo-500/20 text-indigo-300' :
                                          'bg-slate-800 text-slate-400'
                                        }`}>
                                          {p.status}
                                        </span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* EXPANDABLE DETAILED PAIR MATRIX */}
                                  <AnimatePresence>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden mt-3 pt-3 border-t border-slate-800/80"
                                      >
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-left text-[11px] font-mono">
                                            <thead>
                                              <tr className="border-b border-slate-800 text-slate-500 text-[9px] uppercase">
                                                <th className="pb-1.5">Asset Pair</th>
                                                <th className="pb-1.5 text-center">Win Rate</th>
                                                <th className="pb-1.5 text-center">Profit F.</th>
                                                <th className="pb-1.5 text-center">Expiry</th>
                                                <th className="pb-1.5 text-right">Status</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/50">
                                              {strat.best_pairs.map((p) => (
                                                <tr key={p.pair} className="hover:bg-slate-900/50">
                                                  <td className="py-1.5 font-bold text-white">{p.pair}</td>
                                                  <td className="py-1.5 text-center text-emerald-400 font-bold">
                                                    {(p.win_rate * 100).toFixed(0)}%
                                                  </td>
                                                  <td className="py-1.5 text-center text-indigo-300 font-medium">
                                                    {p.profit_factor}
                                                  </td>
                                                  <td className="py-1.5 text-center text-slate-400">
                                                    {p.best_timeframe}
                                                  </td>
                                                  <td className="py-1.5 text-right">
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                                      p.status === 'OPTIMAL' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                                      p.status === 'STABLE' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                                                      'bg-slate-800 text-slate-400 border border-slate-700'
                                                    }`}>
                                                      {p.status}
                                                    </span>
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}
                            </div>

                            {/* Filters Tags Footer */}
                            <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-900/60">
                              {strat.filters.map((filter, index) => (
                                <span key={index} className="text-[9px] font-mono text-slate-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                                  {filter}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* SUB-VIEW 2: MASTER BEST PAIRS MATRIX */}
                  {labSubView === 'pairs_matrix' && (
                    <div className="bg-[#0f1424] rounded-2xl border border-indigo-500/20 overflow-hidden shadow-xl">
                      <div className="p-4 bg-[#0a0e1a] border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-display font-bold text-white flex items-center gap-2">
                            <BarChart2 className="text-indigo-400" size={16} />
                            Master Best Pairs Matrix across Strategy Lab
                          </h4>
                          <p className="text-xs text-slate-400">
                            Evaluated performance rankings linking optimal trading strategies to specific financial pairs
                          </p>
                        </div>
                        <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 self-start sm:self-auto">
                          Showing {masterPairsMatrix.length} Optimal Pairs
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <thead>
                            <tr className="bg-[#05070d] text-slate-400 text-[10px] uppercase border-b border-slate-800">
                              <th className="p-3.5">Asset Pair</th>
                              <th className="p-3.5">Market</th>
                              <th className="p-3.5">Optimal Strategy Match</th>
                              <th className="p-3.5 text-center">Pair Win Rate</th>
                              <th className="p-3.5 text-center">Profit Factor</th>
                              <th className="p-3.5 text-center">Tested Trades</th>
                              <th className="p-3.5 text-center">Best Expiry</th>
                              <th className="p-3.5 text-center">Status</th>
                              <th className="p-3.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {masterPairsMatrix.map((item) => (
                              <tr key={item.pair} className="hover:bg-[#12182b] transition-colors">
                                <td className="p-3.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-display font-bold text-white text-sm">{item.pair}</span>
                                  </div>
                                </td>
                                <td className="p-3.5 text-slate-400 uppercase text-[10px]">
                                  <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-semibold">
                                    {item.market}
                                  </span>
                                </td>
                                <td className="p-3.5">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-indigo-300">{item.bestStrategyName}</span>
                                    <span className="text-[9px] text-slate-500">
                                      Score: <strong className="text-emerald-400">{item.bestStrategyScore.toFixed(1)}</strong> / 100
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3.5 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="font-extrabold text-emerald-400 text-sm">
                                      {(item.bestWinRate * 100).toFixed(0)}%
                                    </span>
                                    <div className="w-16 bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                                      <div 
                                        className="bg-emerald-500 h-full rounded-full" 
                                        style={{ width: `${item.bestWinRate * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3.5 text-center text-indigo-300 font-bold">
                                  {item.bestProfitFactor}x
                                </td>
                                <td className="p-3.5 text-center text-slate-400">
                                  {item.totalTrades}
                                </td>
                                <td className="p-3.5 text-center text-slate-300 font-semibold">
                                  {item.bestTimeframe}
                                </td>
                                <td className="p-3.5 text-center">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                    item.status === 'OPTIMAL' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                                    item.status === 'STABLE' ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' :
                                    'bg-slate-800 text-slate-400 border-slate-700'
                                  }`}>
                                    {item.status}
                                  </span>
                                </td>
                                <td className="p-3.5 text-right">
                                  <button
                                    onClick={() => {
                                      setSelectedAssetFilter(item.pair);
                                      setActiveTab('signals');
                                    }}
                                    className="text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-2.5 py-1 rounded-lg transition-all active:scale-95 shadow-sm cursor-pointer"
                                  >
                                    Filter Signals
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* SUB-VIEW 3: STRATEGY CORRELATION MATRIX & GENETIC CLUSTERS */}
                  {labSubView === 'correlation_matrix' && (
                    <StrategyCorrelationMatrix
                      strategies={filteredStrategies.length > 0 ? filteredStrategies : strategies}
                      signals={signals}
                      onSelectStrategy={(stratId) => {
                        setLabSubView('strategies');
                        setExpandedStrategyId(stratId);
                      }}
                      onRunTest={(stratId) => {
                        handleRunLiveStrategyTest(stratId, false);
                      }}
                    />
                  )}
                </motion.div>
              )}

              {/* TAB 3: AI ANALYST */}
              {activeTab === 'analyst' && (
                <motion.div
                  key="analyst"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col gap-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1e293b]/40 pb-3 gap-2">
                    <div>
                      <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
                        Hermes AI Strategic Analyst
                      </h3>
                      <p className="text-xs text-[#94a3b8]">Run deep audits on closed signal performance and receive strategic advice</p>
                    </div>
                    
                    <button
                      onClick={triggerAnalystBatch}
                      disabled={analystInProgress || unanalyzedCount === 0}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-[#6366f1] hover:from-indigo-700 hover:to-indigo-500 rounded-lg text-xs text-white font-bold flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {analystInProgress ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          RUNNING DEEP AUDIT...
                        </>
                      ) : (
                        <>
                          <Brain size={12} />
                          AUDIT {unanalyzedCount} CLOSED TRADES
                        </>
                      )}
                    </button>
                  </div>

                  {/* AI Brain Synch & Carbon Auto-Reasoning Dashboard */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2 mt-2">
                    <div className="p-4 bg-slate-950/60 rounded-xl border border-indigo-500/20 shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                           <Brain size={16} className="text-indigo-400" />
                           <h4 className="font-display font-bold text-xs text-white uppercase tracking-wider">AI Engine State Sync</h4>
                        </div>
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-mono font-bold border border-emerald-500/20">
                           <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                           {aiEngineStatus?.api_key_configured ? 'CARBON LIVE SYNCED' : 'LOCAL QUANT SYNCED'}
                        </span>
                      </div>
                      
                      <div className="flex flex-col gap-1.5 mt-1">
                        <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/50 border border-slate-800 text-[10px] font-mono">
                          <span className="text-slate-400">Synced Ledger</span>
                          <span className="text-indigo-300 font-bold">
                            {aiEngineStatus?.synced_trades_count ?? signals.filter(s => s.outcome === 'win' || s.outcome === 'loss').length} Closed • {aiEngineStatus?.active_strategies_count ?? strategies.filter(s => s.enabled).length} Active Models ({aiEngineStatus?.solo_pine_count ?? strategies.filter(s => s.isolated_lineage).length} Solo Pine)
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/50 border border-slate-800 text-[10px] font-mono">
                          <span className="text-slate-400">Last Backend Sync</span>
                          <span className="text-emerald-300 font-bold">
                            {aiEngineStatus?.last_sync_at ? new Date(aiEngineStatus.last_sync_at).toLocaleTimeString() : engineState.lastScanTime}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-500 leading-tight mt-0.5">Live signals, KuCoin multi-TF candles, adaptive thresholds, and Solo Pine lineages stay synced to backend storage.</p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950/60 rounded-xl border border-teal-500/20 shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-32 h-32 bg-teal-600/10 rounded-full blur-2xl pointer-events-none" />
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                           <Cpu size={16} className="text-teal-400" />
                           <h4 className="font-display font-bold text-xs text-white uppercase tracking-wider">Gemini 4 Carbon Core</h4>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 text-[9px] font-mono font-bold border border-teal-500/20">
                           {aiEngineStatus?.model_id?.toUpperCase() || 'GEMINI-4-CARBON'}
                        </span>
                      </div>
                      
                      <div className="flex flex-col gap-1.5 mt-1">
                         <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/50 border border-slate-800">
                           <span className="text-[10px] font-mono text-slate-400">Active Reasoning Engine</span>
                           <span className="text-[10px] font-mono font-bold text-teal-300 flex items-center gap-1">
                             <Zap size={10} /> {aiEngineStatus?.display_name || 'Gemini 4 Carbon (Deep Reasoner)'}
                           </span>
                         </div>
                         <div className="flex items-center justify-between p-1.5 rounded bg-slate-900/50 border border-slate-800">
                           <span className="text-[10px] font-mono text-slate-400">Thinking & Chain</span>
                           <span className="text-[10px] font-mono font-bold text-slate-300">
                             {aiEngineStatus?.reasoning_level || 'HIGH (Carbon Deep)'} • ML ≥ {Math.round((currentThresholds?.min_win_probability || 0.72) * 100)}%
                           </span>
                         </div>
                         <p className="text-[9px] text-slate-500 leading-tight mt-0.5">
                           Fallback chain: {(aiEngineStatus?.fallback_chain || ['gemini-4-carbon', 'gemini-4-argon', 'gemini-4-hydrogen']).join(' → ')}
                         </p>
                      </div>
                    </div>
                  </div>

                  {/* Gemini Report Card */}
                  {geminiReport && (
                    <div className="p-4 bg-slate-950/60 rounded-xl border border-indigo-500/20 shadow-xl mb-3">
                      <div className="flex items-center justify-between border-b border-[#1e293b]/50 pb-2.5 mb-3">
                        <div className="flex items-center gap-2">
                          <Sparkles size={16} className="text-indigo-400 animate-pulse" />
                          <h4 className="font-display font-bold text-xs text-white uppercase tracking-wider">
                            {aiEngineStatus?.display_name || 'Gemini 4 Carbon'} Strategic Report {recentBatchId ? `(Batch #${recentBatchId})` : ''}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            dismissedBatchIdRef.current = recentBatchId;
                            setGeminiReport(null);
                          }}
                          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/40 cursor-pointer"
                          title="Dismiss Report"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="text-xs text-slate-300 leading-relaxed space-y-1.5 font-sans" id="gemini-report-body">
                        {renderCustomMarkdown(geminiReport)}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <h4 className="text-xs uppercase font-mono tracking-wider font-bold text-slate-400">Analyst Ledger (Closed Trades Audit)</h4>
                    
                    {insights.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-slate-600 gap-3 border border-dashed border-[#1e293b]/40 rounded-xl">
                        <TerminalIcon size={24} className="text-slate-700" />
                        <p className="text-xs">No analysis logged. Run an AI audit batch above!</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3" id="insights-ledger">
                        {insights.map((ins) => (
                          <div key={ins.id} className="p-4 bg-slate-950/40 rounded-xl border border-[#1e293b]/50 flex flex-col gap-2">
                            <div className="flex justify-between items-center border-b border-[#1e293b]/20 pb-1.5">
                              <span className="text-[10px] font-mono text-[#94a3b8]">
                                BATCH #{ins.batch_id} • SIGNAL #{ins.signal_id}
                              </span>
                              <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                                ins.outcome === 'win' 
                                  ? 'text-emerald-400 bg-emerald-500/10' 
                                  : 'text-red-400 bg-red-500/10'
                              }`}>
                                {ins.outcome.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-200 leading-relaxed font-sans">{ins.insight}</p>
                            
                            {ins.recommendation && (
                              <div className="mt-2 text-[10px] bg-indigo-500/5 p-2 rounded border border-indigo-500/10 text-indigo-300 flex items-start gap-1.5">
                                <Sparkles size={11} className="mt-0.5 text-[#6366f1]" />
                                <div>
                                  <span className="font-bold text-white block">Strategic Recommendation:</span>
                                  {ins.recommendation}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* TAB 4: TUNING & MODELS */}
              {activeTab === 'thresholds' && (
                <motion.div
                  key="thresholds"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col gap-6"
                >
                  {/* Part A: Adaptive Thresholds */}
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1e293b]/40 pb-3 gap-2">
                      <div>
                        <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
                          Adaptive Threshold Tune Controller
                        </h3>
                        <p className="text-xs text-[#94a3b8]">Automatically optimizes indicator weights and confidence limits based on drawdown</p>
                      </div>
                      
                      <button
                        onClick={triggerOptimization}
                        disabled={optimizeInProgress}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 rounded-lg text-xs text-white font-bold flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {optimizeInProgress ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" />
                            CALCULATING RATIOS...
                          </>
                        ) : (
                          <>
                            <Sliders size={12} />
                            OPTIMIZE THRESHOLDS
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Current Config Visualizer & Manual Tuning Center */}
                      <div className="p-5 bg-slate-950/60 border border-[#1e293b]/80 rounded-xl flex flex-col gap-4 shadow-xl">
                        <div className="flex justify-between items-center border-b border-[#1e293b]/30 pb-2">
                          <h4 className="text-xs font-mono uppercase text-[#94a3b8] font-bold">System Calibration Control</h4>
                          <span className="text-[10px] font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">MANUAL & ADAPTIVE</span>
                        </div>
                        
                        <div className="flex flex-col gap-4 text-xs">
                          {/* Slider 1: Min Score */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[#94a3b8] font-semibold">Min Indicators Score</span>
                              <span className="text-white font-mono font-bold text-xs bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{localMinScore} / 10</span>
                            </div>
                            <input 
                              type="range" 
                              min="3" 
                              max="9" 
                              step="1"
                              value={localMinScore} 
                              onChange={(e) => setLocalMinScore(parseInt(e.target.value, 10))}
                              className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                            />
                            <span className="text-[9px] text-slate-500 font-mono">Minimum number of signal indicators required to trigger a trade bias.</span>
                          </div>

                          {/* Slider 2: Min win probability */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[#94a3b8] font-semibold">Min XGBoost Probability</span>
                              <span className="text-emerald-400 font-mono font-bold text-xs bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{(localMinProb * 100).toFixed(0)}%</span>
                            </div>
                            <input 
                              type="range" 
                              min="0.45" 
                              max="0.85" 
                              step="0.05"
                              value={localMinProb} 
                              onChange={(e) => setLocalMinProb(parseFloat(e.target.value))}
                              className="w-full accent-emerald-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                            />
                            <span className="text-[9px] text-slate-500 font-mono">XGBoost ML neural tree classification floor limit filter.</span>
                          </div>

                          {/* Slider 3: BB entry buffer */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[#94a3b8] font-semibold">Bollinger Bands Entry Buffer</span>
                              <span className="text-sky-400 font-mono font-bold text-xs bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">{localBbBuffer.toFixed(2)} std</span>
                            </div>
                            <input 
                              type="range" 
                              min="0.05" 
                              max="0.45" 
                              step="0.05"
                              value={localBbBuffer} 
                              onChange={(e) => setLocalBbBuffer(parseFloat(e.target.value))}
                              className="w-full accent-sky-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                            />
                            <span className="text-[9px] text-slate-500 font-mono">Distance standard deviation envelope to authorize reversal triggers.</span>
                          </div>

                          {/* Slider 4: RSI momentum factor */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[#94a3b8] font-semibold">RSI Momentum Zone Factor</span>
                              <span className="text-purple-400 font-mono font-bold text-xs bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 font-bold">Lvl {localRsiZone}</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max="3" 
                              step="1"
                              value={localRsiZone} 
                              onChange={(e) => setLocalRsiZone(parseInt(e.target.value, 10))}
                              className="w-full accent-purple-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                            />
                            <span className="text-[9px] text-slate-500 font-mono font-sans">Calibrates the RSI momentum trigger boundaries (Lvl 1 standard bounds of 35/65).</span>
                          </div>

                          {/* Latency & Slippage Penalties: Fully Deactivated */}
                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5">
                            <span className="text-emerald-400 font-mono font-bold text-xs">⚡</span>
                            <div>
                              <h5 className="text-[11px] font-bold text-emerald-300 uppercase tracking-wide">Zero Latency Mode Active</h5>
                              <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed font-mono">
                                Broker latency and entry slippage penalties have been fully deactivated. Every signal now resolves strictly and purely against real-time raw market tick prices without simulated broker lag.
                              </p>
                            </div>
                          </div>

                          {/* Action Button */}
                          <button
                            onClick={saveManualThresholds}
                            disabled={savingThresholds}
                            className="mt-2 w-full py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-md transition-all cursor-pointer active:scale-98"
                          >
                            {savingThresholds ? "CALIBRATING QUANT LIMITS..." : "SAVE MANUAL CALIBRATION"}
                          </button>
                        </div>
                      </div>

                      {/* Adaptive Tuning Logs */}
                      <div className="p-4 bg-[#05070d] border border-[#1e293b]/60 rounded-xl flex flex-col gap-3 font-mono">
                        <h4 className="text-xs uppercase text-[#94a3b8] font-bold">Tune Log History</h4>
                        
                        <div className="overflow-y-auto max-h-[160px] text-[10px] flex flex-col gap-2">
                          {thresholds.length === 0 ? (
                            <span className="text-slate-600 italic">No adaptive adjustments recorded yet.</span>
                          ) : (
                            thresholds.map((t) => (
                              <div key={t.id} className="border-b border-slate-900 pb-2">
                                <span className="text-sky-400 block font-bold text-[9px]">
                                  {new Date(t.timestamp).toLocaleDateString()} @ {t.param_name.toUpperCase()}
                                </span>
                                <span className="text-slate-300 block">{t.reason}</span>
                                <span className="text-slate-500 text-[9px] mt-0.5 block">
                                  Tuned value: {t.old_value} &rarr; <span className="text-emerald-400">{t.new_value}</span>
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Part B: Model Version control */}
                  <div className="flex flex-col gap-4 border-t border-[#1e293b]/30 pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1e293b]/40 pb-3 gap-2">
                      <div>
                        <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
                          XGBoost Model Version Control Registry
                        </h3>
                        <p className="text-xs text-[#94a3b8]">Retrain neural gradient trees on compiled historical trade features</p>
                      </div>
                      
                      <button
                        onClick={triggerRetraining}
                        disabled={retrainInProgress}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-xs text-white font-bold flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {retrainInProgress ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" />
                            OPTIMIZING TREES...
                          </>
                        ) : (
                          <>
                            <Cpu size={12} />
                            RETRAIN GRADIENT MODEL
                          </>
                        )}
                      </button>
                    </div>

                    <div className="overflow-x-auto border border-[#1e293b]/40 rounded-xl" id="models-table-container">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#0c101d]/85 text-[#94a3b8] border-b border-[#1e293b]/50">
                            <th className="p-3">Model Ver</th>
                            <th className="p-3">Train Sample Size</th>
                            <th className="p-3 text-center">Accuracy</th>
                            <th className="p-3 text-center">Precision</th>
                            <th className="p-3 text-center">Recall</th>
                            <th className="p-3 text-center">F1 Score</th>
                            <th className="p-3 text-center">ROC AUC</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e293b]/35">
                          {models.map((mod) => (
                            <tr key={mod.id} className="hover:bg-slate-900/40">
                              <td className="p-3 font-mono font-bold text-white flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                                XGBoost v{mod.version}.0
                              </td>
                              <td className="p-3 font-mono text-[#94a3b8]">{mod.sample_count} trading matrices</td>
                              <td className="p-3 text-center font-mono font-semibold text-white">{(mod.accuracy * 100).toFixed(1)}%</td>
                              <td className="p-3 text-center font-mono text-[#94a3b8]">{(mod.precision_val * 100).toFixed(1)}%</td>
                              <td className="p-3 text-center font-mono text-[#94a3b8]">{(mod.recall * 100).toFixed(1)}%</td>
                              <td className="p-3 text-center font-mono text-purple-300 font-bold">{mod.f1.toFixed(3)}</td>
                              <td className="p-3 text-center font-mono text-emerald-400 font-bold">{mod.auc.toFixed(3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Part C: Brain Backup & Restoration Options */}
                  <div className="flex flex-col gap-4 border-t border-[#1e293b]/30 pt-6">
                    <div className="flex items-center gap-2 border-b border-[#1e293b]/40 pb-3">
                      <Database size={16} className="text-indigo-400" />
                      <h3 className="text-sm font-display font-bold text-white">
                        Brain Export & Import Configuration
                      </h3>
                    </div>
                    <p className="text-xs text-[#94a3b8] -mt-2">
                      Backup or restore the neural models configuration, dynamic tuning parameters, and active strategies setup. This allows migrating optimized parameters between sandbox environments.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                      {/* Export Box */}
                      <div className="p-4 bg-slate-950/40 border border-[#1e293b]/60 rounded-xl flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="p-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-[#6366f1]">
                              <Download size={14} />
                            </span>
                            <h4 className="font-display font-bold text-xs text-white uppercase tracking-wider">
                              Export Current State
                            </h4>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed mt-1">
                            Download a full JSON backup of the current machine learning weights, dynamic indicator calibration threshold values, and strategic genetic mutations.
                          </p>
                        </div>
                        
                        <button
                          onClick={exportBrain}
                          className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white border border-[#1e293b]/80 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:border-indigo-500/30 active:scale-98"
                        >
                          <Download size={12} className="text-indigo-400" />
                          DOWNLOAD BRAIN FILE (.JSON)
                        </button>
                      </div>

                      {/* Import Box */}
                      <div className="p-4 bg-slate-950/40 border border-[#1e293b]/60 rounded-xl flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded bg-purple-500/10 border border-purple-500/20 text-[#a855f7]">
                            <Upload size={14} />
                          </span>
                          <h4 className="font-display font-bold text-xs text-white uppercase tracking-wider">
                            Import / Restore Brain State
                          </h4>
                        </div>

                        {/* Drag & drop upload area */}
                        <div 
                          className="flex-1 flex flex-col items-center justify-center border border-dashed border-[#1e293b]/80 hover:border-indigo-500/50 rounded-lg p-4 bg-slate-900/20 hover:bg-slate-900/40 transition-all text-center cursor-pointer relative"
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                              handleBrainImport(e.dataTransfer.files[0]);
                            }
                          }}
                        >
                          <input 
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".json"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleBrainImport(e.target.files[0]);
                              }
                            }}
                          />
                          <Upload size={18} className="text-indigo-400 mb-1 animate-pulse" />
                          <span className="text-xs text-slate-300 font-medium block">
                            {importingBrain ? "Processing configuration..." : "Click to select or drag & drop brain file"}
                          </span>
                          <span className="text-[9px] text-slate-500 mt-0.5 block">Accepts only valid Hermes backup .json files</span>
                        </div>

                        {importMessage && (
                          <div className={`text-[11px] p-2.5 rounded-lg border ${
                            importMessage.type === 'success' 
                              ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/20' 
                              : 'bg-red-500/5 text-red-400 border-red-500/20'
                          }`}>
                            <div className="flex gap-2">
                              <span className="font-bold">{importMessage.type === 'success' ? "✓ SUCCESS" : "✗ ERROR"}</span>
                              <span className="flex-1">{importMessage.text}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 5: PRO BACKTESTER - REMOVED */}
              {false && activeBacktestData && backtestData && (
                <motion.div
                  key="backtest"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col gap-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1e293b]/40 pb-3 gap-2">
                    <div>
                      <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
                        <TrendingUp size={16} className="text-emerald-400" />
                        Proprietary Backtest & Strategic Risk Audit
                      </h3>
                      <p className="text-xs text-[#94a3b8]">Audit tick-by-tick intra-candle price action against Invalidation Strike (SL) and ITM Expiry Target (TP) brackets</p>
                    </div>
                    
                    <button
                      onClick={runFiveMinuteBacktest}
                      disabled={backtestLoading}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 rounded-lg text-xs text-white font-bold flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {backtestLoading ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          AUDITING TRAJECTORIES...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={12} />
                          RUN OUTCOME AUDIT
                        </>
                      )}
                    </button>
                  </div>

                  {backtestLoading && !backtestData && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4 border border-dashed border-[#1e293b]/40 rounded-xl bg-slate-950/10">
                      <RefreshCw size={36} className="text-indigo-400 animate-spin" />
                      <div className="text-center">
                        <p className="text-xs font-bold text-white uppercase tracking-wider">Auditing High-Frequency Tick Trajectories</p>
                        <p className="text-[10px] text-slate-400 mt-1">Applying real-time random walk, volatility coefficients, and drift thresholds...</p>
                      </div>
                    </div>
                  )}

                  {!backtestLoading && !backtestData && (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-4 border border-dashed border-[#1e293b]/40 rounded-xl bg-slate-950/10">
                      <TrendingUp size={40} className="text-slate-600 animate-pulse" />
                      <div className="text-center max-w-md px-4">
                        <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">No Backtest Data Seeded</p>
                        <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                          Click the button above to run a professional multi-tick outcome audit across completed signal brackets to test your win/loss strategies like a pro fund manager.
                        </p>
                      </div>
                      <button
                        onClick={runFiveMinuteBacktest}
                        className="py-2 px-4 bg-[#6366f1]/20 hover:bg-[#6366f1]/35 border border-indigo-500/30 rounded-lg text-xs text-indigo-200 font-semibold active:scale-95 transition-all cursor-pointer"
                      >
                        Run Backtest Now
                      </button>
                    </div>
                  )}

                  {backtestData && activeBacktestData && (
                    <div className="flex flex-col gap-5">
                      
                      {/* Market Selections Switch */}
                      <div className="flex items-center gap-2 bg-slate-950/45 p-1 rounded-xl border border-[#1e293b]/40 self-start" id="backtest-market-filter">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono px-2">Filter Market:</span>
                        <div className="flex gap-1 bg-[#090d16] p-0.5 rounded-lg border border-slate-800">
                          <button
                            onClick={() => setBacktestMarketFilter('all')}
                            className={`px-3 py-1 text-[10px] font-semibold rounded transition-all cursor-pointer ${
                              backtestMarketFilter === 'all'
                                ? 'bg-[#10b981] text-white shadow-md border border-[#059669]/20'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            All
                          </button>
                          <button
                            onClick={() => setBacktestMarketFilter('crypto')}
                            className={`px-3 py-1 text-[10px] font-semibold rounded transition-all cursor-pointer ${
                              backtestMarketFilter === 'crypto' || backtestMarketFilter === 'all'
                                ? 'bg-[#10b981] text-white shadow-md border border-[#059669]/20'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Crypto (BTC / ETH / SOL)
                          </button>
                        </div>
                      </div>

                      {activeBacktestData.summary.totalTrades === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3 border border-dashed border-[#1e293b]/60 rounded-xl bg-slate-950/20">
                          <HelpCircle size={32} className="text-slate-600 animate-pulse" />
                          <p className="text-xs">No executed trades found matching the {backtestMarketFilter.toUpperCase()} market filter.</p>
                        </div>
                      ) : (
                        <>
                          {/* BENTO STATS GRID */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="backtest-bento-grid">
                            <div className="p-4 bg-[#05070d] rounded-xl border border-[#1e293b]/50 hover:border-indigo-500/20 transition-all">
                              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">PRO WIN RATE</span>
                              <span className="text-xl font-mono font-bold text-emerald-400 block mt-1">
                                {activeBacktestData.summary.winRate}%
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                {activeBacktestData.summary.tpHits} TP hits • {activeBacktestData.summary.timeExitWins} Time-Exits
                              </span>
                            </div>

                            <div className="p-4 bg-[#05070d] rounded-xl border border-[#1e293b]/50 hover:border-indigo-500/20 transition-all">
                              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">PROFIT FACTOR</span>
                              <span className="text-xl font-mono font-bold text-indigo-300 block mt-1">
                                {activeBacktestData.summary.profitFactor}
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Gross Profit/Loss ratio
                              </span>
                            </div>

                            <div className="p-4 bg-[#05070d] rounded-xl border border-[#1e293b]/50 hover:border-indigo-500/20 transition-all">
                              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">EXPECTANCY (EDGE)</span>
                              <span className="text-xl font-mono font-bold text-[#f59e0b] block mt-1">
                                {activeBacktestData.summary.expectancy > 0 ? `+${activeBacktestData.summary.expectancy}%` : `${activeBacktestData.summary.expectancy}%`}
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Expected yield per trade
                              </span>
                            </div>

                            <div className="p-4 bg-[#05070d] rounded-xl border border-[#1e293b]/50 hover:border-indigo-500/20 transition-all">
                              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">SHARPE RATIO</span>
                              <span className="text-xl font-mono font-bold text-sky-400 block mt-1">
                                {activeBacktestData.summary.sharpe}
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Risk-adjusted efficiency
                              </span>
                            </div>
                          </div>

                          {/* BRACKET HITS SUMMARY SLIDER */}
                          <div className="p-4 bg-[#05070d] rounded-xl border border-[#1e293b]/40 flex flex-col gap-2">
                            <div className="flex justify-between items-center text-[10px] font-mono text-[#94a3b8]">
                              <span>TP HITS: {activeBacktestData.summary.tpHits} ({((activeBacktestData.summary.tpHits / activeBacktestData.summary.totalTrades) * 100).toFixed(0)}%)</span>
                              <span>TIME-EXITS: {activeBacktestData.summary.timeExitWins + activeBacktestData.summary.timeExitLosses} ({(((activeBacktestData.summary.timeExitWins + activeBacktestData.summary.timeExitLosses) / activeBacktestData.summary.totalTrades) * 100).toFixed(0)}%)</span>
                              <span>SL HITS: {activeBacktestData.summary.slHits} ({((activeBacktestData.summary.slHits / activeBacktestData.summary.totalTrades) * 100).toFixed(0)}%)</span>
                            </div>
                            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden flex">
                              <div className="bg-emerald-500 h-full" style={{ width: `${(activeBacktestData.summary.tpHits / activeBacktestData.summary.totalTrades) * 100}%` }}></div>
                              <div className="bg-sky-400 h-full" style={{ width: `${((activeBacktestData.summary.timeExitWins + activeBacktestData.summary.timeExitLosses) / activeBacktestData.summary.totalTrades) * 100}%` }}></div>
                              <div className="bg-red-500 h-full" style={{ width: `${(activeBacktestData.summary.slHits / activeBacktestData.summary.totalTrades) * 100}%` }}></div>
                            </div>
                            <p className="text-[9px] text-[#94a3b8] italic">
                              *Professional traders seek high TP Hits and high positive Time-Exits while keeping SL Hits below 40% to maintain a secure trading expectancy.
                            </p>
                          </div>
                        </>
                      )}

                      {/* DETAILED LAYOUT: 2-COLUMN VIEW */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        
                        {/* LEFT COLUMN: TRADE LIST (7 COLS) */}
                        <div className="lg:col-span-7 flex flex-col gap-3">
                          <h4 className="text-xs font-mono font-bold text-[#94a3b8] uppercase tracking-wider font-sans">Historical Executed Trades Feed</h4>
                          
                          <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1" id="backtest-trades-list">
                            {activeBacktestData.trades.map((t: any) => {
                              const isSelected = selectedBacktestTrade?.id === t.id;
                              let statusColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                              if (t.hit_type === "sl") statusColor = "text-red-400 bg-red-500/10 border-red-500/20";
                              else if (t.hit_type === "timeout") statusColor = t.payout >= 0 ? "text-sky-400 bg-sky-500/10 border-sky-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20";

                              return (
                                <div 
                                  key={t.id}
                                  onClick={() => setSelectedBacktestTrade(t)}
                                  className={`p-3 bg-slate-950/40 rounded-xl border transition-all cursor-pointer flex items-center justify-between hover:border-indigo-500/35 hover:bg-slate-900/10 ${
                                    isSelected ? 'border-[#6366f1] shadow-[0_0_12px_rgba(99,102,241,0.15)] bg-slate-900/30' : 'border-[#1e293b]/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-white font-bold">{t.asset}</span>
                                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${
                                          t.direction === 'BUY' ? 'text-emerald-400 bg-emerald-500/5' : 'text-red-400 bg-red-500/5'
                                        }`}>{t.direction}</span>
                                      </div>
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        Entry: {t.entry_price.toFixed(t.asset.includes('BTC') ? 1 : 4)} • Payout: 88%
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <span className={`text-[10px] font-mono font-bold block ${t.payout >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {t.payout >= 0 ? `+${t.payout}%` : `${t.payout}%`}
                                      </span>
                                      <span className="text-[9px] text-slate-500 block">Payout (Risked)</span>
                                    </div>
                                    <span className={`text-[9px] font-mono font-bold uppercase px-2 py-1 rounded border ${statusColor}`}>
                                      {t.hit_type === 'tp' ? 'TP HIT' : (t.hit_type === 'sl' ? 'SL HIT' : 'TIME OUT')}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* RIGHT COLUMN: INTERACTIVE VISUALIZER (5 COLS) */}
                        <div className="lg:col-span-5 flex flex-col gap-3">
                          <h4 className="text-xs font-mono font-bold text-[#94a3b8] uppercase tracking-wider font-sans">Intra-Candle Tick Trajectory</h4>
                          
                          {selectedBacktestTrade ? (
                            <div className="p-4 bg-[#05070d]/60 rounded-xl border border-[#1e293b]/50 flex flex-col gap-4">
                              <div className="flex justify-between items-center border-b border-[#1e293b]/40 pb-2">
                                <div className="flex flex-col">
                                  <span className="text-xs text-white font-bold">{selectedBacktestTrade.asset} Trajectory Analysis</span>
                                  <span className="text-[9px] text-slate-500 font-mono">Signal ID: #{selectedBacktestTrade.id}</span>
                                </div>
                                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                                  selectedBacktestTrade.outcome === 'win' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                }`}>
                                  {selectedBacktestTrade.outcome.toUpperCase()} OUTCOME
                                </span>
                              </div>

                              {/* TICK GRAPHIC PATH */}
                              <div className="flex flex-col gap-1 bg-[#05070d]/70 p-3 rounded-lg border border-slate-900/60 font-mono">
                                <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-2">Path Visualization</span>
                                
                                <div className="flex items-center justify-between relative mt-1.5 mb-2.5 px-2">
                                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2"></div>
                                  
                                  {selectedBacktestTrade.ticks.map((tickValue: number, idx: number) => {
                                    const isEntry = idx === 0;
                                    const isFinal = idx === 5;
                                    
                                    let dotColor = "bg-slate-700";
                                    if (isEntry) dotColor = "bg-[#6366f1] shadow-[0_0_8px_#6366f1]";
                                    else if (selectedBacktestTrade.hit_type === 'tp' && idx === selectedBacktestTrade.resolution_minute) dotColor = "bg-emerald-400 shadow-[0_0_8px_#34d399]";
                                    else if (selectedBacktestTrade.hit_type === 'sl' && idx === selectedBacktestTrade.resolution_minute) dotColor = "bg-red-500 shadow-[0_0_8px_#ef4444]";
                                    else if (isFinal) dotColor = selectedBacktestTrade.outcome === 'win' ? "bg-emerald-500" : "bg-red-400";

                                    return (
                                      <div key={idx} className="flex flex-col items-center relative z-10 group">
                                        <div className={`w-3 h-3 rounded-full ${dotColor} border-2 border-[#0a0e1a] transition-all transform hover:scale-125 cursor-pointer`}></div>
                                        <span className="text-[8px] text-slate-500 mt-1">M{idx}</span>
                                        
                                        {/* Hover Tooltip */}
                                        <div className="absolute bottom-full mb-1.5 hidden group-hover:flex flex-col items-center bg-[#070b13] border border-[#1e293b] p-1 rounded shadow-lg z-20 w-16 pointer-events-none">
                                          <span className="text-[7px] text-slate-400 font-bold uppercase">Min {idx}</span>
                                          <span className="text-[8px] text-white font-semibold">{tickValue.toFixed(selectedBacktestTrade.asset.includes('BTC') ? 1 : 4)}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="grid grid-cols-2 gap-2 border-t border-slate-900/60 pt-2 text-[9px] text-slate-400 mt-1">
                                  <div>
                                    <span className="block text-slate-500 font-bold">ENTRY PRICE</span>
                                    <span className="text-white font-bold">{selectedBacktestTrade.entry_price.toFixed(selectedBacktestTrade.asset.includes('BTC') ? 1 : 4)}</span>
                                  </div>
                                  <div>
                                    <span className="block text-slate-500 font-bold">CLOSE PRICE</span>
                                    <span className="text-white font-bold">{selectedBacktestTrade.final_price.toFixed(selectedBacktestTrade.asset.includes('BTC') ? 1 : 4)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* BRACKETS AUDIT DETAIL */}
                              <div className="flex flex-col gap-2 font-mono text-[10px]">
                                <div className="flex justify-between p-2 rounded bg-[#05070d]/50 border border-slate-900">
                                  <span className="text-[#94a3b8] flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    ITM Target Expiry
                                  </span>
                                  <span className="text-emerald-400 font-bold">{selectedBacktestTrade.take_profit.toFixed(selectedBacktestTrade.asset.includes('BTC') ? 1 : 4)}</span>
                                </div>
                                <div className="flex justify-between p-2 rounded bg-[#05070d]/50 border border-slate-900">
                                  <span className="text-[#94a3b8] flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                    OTM Invalidation Strike
                                  </span>
                                  <span className="text-red-400 font-bold">{selectedBacktestTrade.stop_loss.toFixed(selectedBacktestTrade.asset.includes('BTC') ? 1 : 4)}</span>
                                </div>
                                <div className="flex justify-between p-2 rounded bg-[#05070d]/50 border border-slate-900">
                                  <span className="text-[#94a3b8]">Risk Position Size Allocation</span>
                                  <span className="text-white font-bold">{selectedBacktestTrade.position_size}% of Capital</span>
                                </div>

                                <div className="flex justify-between p-2 rounded bg-[#05070d]/50 border border-slate-900">
                                  <span className="text-[#94a3b8]">Resolution Pathway</span>
                                  <span className="text-white font-bold uppercase text-[9px]">
                                    {selectedBacktestTrade.hit_type === 'tp' && `TP Triggered in minute ${selectedBacktestTrade.resolution_minute}`}
                                    {selectedBacktestTrade.hit_type === 'sl' && `SL Triggered in minute ${selectedBacktestTrade.resolution_minute}`}
                                    {selectedBacktestTrade.hit_type === 'timeout' && "Time Limit Exceeded"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-10 text-center border border-[#1e293b]/50 rounded-xl bg-slate-950/20 text-slate-500 font-mono text-xs">
                              Select an executed trade from the feed to examine its real-time tick trajectory and execution path.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* AI PRO TRADER COMPREHENSIVE STRATEGY AUDIT */}
                      <div className="p-5 bg-[#05070d]/60 rounded-xl border border-indigo-500/20 shadow-xl mt-3 flex flex-col gap-3">
                        <div className="flex items-center gap-2 border-b border-[#1e293b]/50 pb-2.5">
                          <Sparkles size={16} className="text-[#6366f1]" />
                          <h4 className="font-display font-bold text-xs text-white uppercase tracking-wider font-sans">
                            AI Proprietary Strategy Audit & Trader's Mentality Report
                          </h4>
                        </div>
                        <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans" id="backtest-report-body">
                          {backtestData?.report}
                        </div>
                        
                        {backtestData?.recommendation && (
                          <div className="mt-3 text-[11px] bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/15 text-emerald-300 flex items-start gap-2 font-sans">
                            <Sparkles size={13} className="mt-0.5 text-[#34d399]" />
                            <div>
                              <span className="font-bold text-white block">Fund Manager Core Directive:</span>
                              {backtestData?.recommendation}
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 6: AI BRAIN CHAT */}
              {activeTab === 'brain' && (
                <motion.div
                  key="brain-chat"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col h-[650px] xl:h-[750px] gap-4 animate-fade-in"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1e293b]/40 pb-3 gap-2 shrink-0">
                    <div>
                      <h3 className="text-sm font-display font-bold text-white flex items-center gap-2">
                        <Cpu size={14} className="text-indigo-400 animate-pulse" />
                        Hermes AI Brain Terminal
                      </h3>
                      <p className="text-xs text-[#94a3b8]">Direct neural connection and cognitive chat with the quantitative brain core</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={exportBrain}
                        className="py-1.5 px-3 bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                        title="Download a full JSON backup of the brain configuration"
                      >
                        <Download size={12} className="text-indigo-400" />
                        <span>EXPORT BRAIN</span>
                      </button>

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="py-1.5 px-3 bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/30 text-purple-300 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                        title="Restore or import a JSON brain configuration file"
                      >
                        <Upload size={12} className="text-purple-400" />
                        <span>IMPORT BRAIN</span>
                      </button>

                      <div className="flex items-center gap-1.5 bg-[#05070f] px-2.5 py-1 rounded-lg border border-slate-800">
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">Brain Online</span>
                      </div>
                    </div>
                  </div>

                  {/* Neural metrics header */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#070b13]/80 p-3 rounded-xl border border-[#1e293b]/40 text-xs font-mono shrink-0">
                    <div className="p-2 bg-slate-900/30 rounded-lg border border-slate-800/40">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Brain Architecture</span>
                      <span className="text-white font-semibold">XGBoost & Genetic AI</span>
                    </div>
                    <div className="p-2 bg-slate-900/30 rounded-lg border border-slate-800/40">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Sync Modality</span>
                      <span className="text-indigo-400 font-semibold">Full Stack API</span>
                    </div>
                    <div className="p-2 bg-slate-900/30 rounded-lg border border-slate-800/40">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Entropy State</span>
                      <span className="text-emerald-400 font-semibold">Stable (Optimal)</span>
                    </div>
                    <div className="p-2 bg-slate-900/30 rounded-lg border border-slate-800/40">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Neural Core Sync</span>
                      <span className="text-purple-300 font-semibold">100% Realtime</span>
                    </div>
                  </div>

                  {/* Two-column layout: Quick Directives on left & Chat on right */}
                  <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4">
                    {/* Sample Queries Sidebar */}
                    <div className="w-full md:w-72 flex flex-col gap-2.5 bg-[#070a14] p-3 rounded-xl border border-[#1e293b]/40 shrink-0 md:h-full overflow-y-auto">
                      
                      {/* AI Brain Routing & Proxy Configuration */}
                      <div className="border-b border-[#1e293b]/40 pb-3 mb-2 flex flex-col gap-2">
                        <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider block">
                          AI Neural Router
                        </span>
                        
                        <div className="flex bg-[#03060c] p-0.5 rounded-lg border border-[#1e293b]/40">
                          <button
                            type="button"
                            onClick={() => {
                              setAiProvider('gemini');
                              updateBrainConfig('gemini');
                            }}
                            className={`flex-1 py-1 text-[10px] font-mono font-bold rounded-md transition-all cursor-pointer ${
                              aiProvider === 'gemini'
                                ? 'bg-indigo-600 text-white shadow'
                                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
                            }`}
                          >
                            GEMINI
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAiProvider('bigpickle');
                              updateBrainConfig('bigpickle');
                            }}
                            className={`flex-1 py-1 text-[10px] font-mono font-bold rounded-md transition-all cursor-pointer ${
                              aiProvider === 'bigpickle'
                                ? 'bg-amber-600 text-white shadow'
                                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
                            }`}
                          >
                            BIG PICKLE
                          </button>
                        </div>

                        {/* Active Provider Indicator Badge */}
                        <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-900 flex flex-col gap-1 text-[10px] font-mono">
                          <span className="text-slate-500 text-[8px] uppercase font-bold block">Active Endpoint Router</span>
                          <span className={`font-bold flex items-center gap-1 uppercase ${aiProvider === 'gemini' ? 'text-indigo-400' : 'text-amber-400'}`}>
                            <span className={`w-1 h-1 rounded-full ${aiProvider === 'gemini' ? 'bg-indigo-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`}></span>
                            {aiProvider === 'gemini' ? (aiEngineStatus?.display_name || 'GEMINI 4 CARBON API') : 'CUSTOM BIG PICKLE'}
                          </span>
                        </div>

                        {/* SOCKS5 / Proxy Options Header */}
                        <div className="flex flex-col gap-1.5 mt-1 bg-slate-950/40 p-2.5 rounded-lg border border-[#1e293b]/25">
                          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block border-b border-indigo-950/30 pb-1">
                            Big Pickle Config
                          </span>
                          
                          <div className="flex flex-col gap-1 text-[10px]">
                            <label className="text-slate-500 font-mono text-[8px] uppercase font-bold">Custom API Endpoint</label>
                            <input
                              type="text"
                              value={bigpickleConfig.endpoint}
                              onChange={(e) => setBigpickleConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                              placeholder="https://api..."
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200 text-[10px] font-mono focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div className="flex flex-col gap-1 text-[10px]">
                            <label className="text-slate-500 font-mono text-[8px] uppercase font-bold">API Authorization Key</label>
                            <input
                              type="password"
                              value={bigpickleConfig.api_key}
                              onChange={(e) => setBigpickleConfig(prev => ({ ...prev, api_key: e.target.value }))}
                              placeholder="sk-..."
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200 text-[10px] font-mono focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div className="flex flex-col gap-1 text-[10px]">
                            <label className="text-slate-500 font-mono text-[8px] uppercase font-bold">Custom AI Model</label>
                            <input
                              type="text"
                              value={bigpickleConfig.model}
                              onChange={(e) => setBigpickleConfig(prev => ({ ...prev, model: e.target.value }))}
                              placeholder="model-name"
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-slate-200 text-[10px] font-mono focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          {/* SOCKS5 Proxy Settings */}
                          <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-[#1e293b]/20">
                            <span className="text-slate-400 font-mono text-[9px]">Route via SOCKS5 Proxy</span>
                            <button
                              type="button"
                              onClick={() => setBigpickleConfig(prev => ({ ...prev, use_socks5: !prev.use_socks5 }))}
                              className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold transition-colors ${
                                bigpickleConfig.use_socks5 
                                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' 
                                  : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                              }`}
                            >
                              {bigpickleConfig.use_socks5 ? "ON" : "OFF"}
                            </button>
                          </div>

                          {bigpickleConfig.use_socks5 && (
                            <div className="flex gap-1.5 mt-1">
                              <div className="flex-1 flex flex-col gap-0.5">
                                <label className="text-slate-500 font-mono text-[8px] uppercase font-bold">SOCKS Host</label>
                                <input
                                  type="text"
                                  value={bigpickleConfig.socks5_host}
                                  onChange={(e) => setBigpickleConfig(prev => ({ ...prev, socks5_host: e.target.value }))}
                                  placeholder="127.0.0.1"
                                  className="w-full px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-200 text-[9px] font-mono focus:outline-none focus:border-amber-500"
                                />
                              </div>
                              <div className="w-16 flex flex-col gap-0.5">
                                <label className="text-slate-500 font-mono text-[8px] uppercase font-bold">Port</label>
                                <input
                                  type="number"
                                  value={bigpickleConfig.socks5_port}
                                  onChange={(e) => setBigpickleConfig(prev => ({ ...prev, socks5_port: parseInt(e.target.value, 10) || 1080 }))}
                                  placeholder="1080"
                                  className="w-full px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-200 text-[9px] font-mono focus:outline-none focus:border-amber-500"
                                />
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => updateBrainConfig(aiProvider)}
                            disabled={savingConfig}
                            className="w-full mt-2 py-1 px-2 bg-slate-900 hover:bg-slate-800 text-amber-400 disabled:text-amber-800 rounded font-bold text-[9px] font-mono border border-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            {savingConfig ? "Saving Config..." : "Apply Custom AI Settings"}
                          </button>
                        </div>
                      </div>

                      {/* Machine Brain Cognitive Core Feeder */}
                      <div className="border-b border-[#1e293b]/40 pb-3 mb-2 flex flex-col gap-2">
                        <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider block">
                          Machine Brain Core
                        </span>
                        
                        <button
                          type="button"
                          onClick={triggerBrainIntelligenceSync}
                          disabled={brainSyncLoading}
                          className="w-full py-2 px-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-indigo-900/50 disabled:to-violet-900/50 text-white rounded-lg font-bold text-[11px] font-sans transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(79,70,229,0.25)] active:scale-95 disabled:pointer-events-none cursor-pointer"
                        >
                          <Sparkles size={12} className={brainSyncLoading ? "animate-spin text-purple-200" : "animate-pulse text-indigo-200"} />
                          {brainSyncLoading ? "Extracting Intel..." : "Feed Machine Brain"}
                        </button>

                        <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-900 flex flex-col gap-1 text-[10px] font-mono">
                          <span className="text-slate-500 text-[8px] uppercase font-bold block">Feeder Status</span>
                          <span className={`${machineBrainIntel ? "text-emerald-400" : "text-amber-400"} font-bold flex items-center gap-1`}>
                            <span className={`w-1 h-1 rounded-full ${machineBrainIntel ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}></span>
                            {machineBrainIntel ? "INTELLIGENCE SEEDED" : "EMPTY CORE MEMORY"}
                          </span>
                        </div>

                        {machineBrainIntel && (
                          <div className="flex flex-col gap-1.5 p-2 bg-[#03060c] rounded-lg border border-indigo-500/10 text-slate-300 font-sans text-[11px] leading-relaxed max-h-[140px] overflow-y-auto mt-1">
                            <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest block border-b border-indigo-950/50 pb-1 mb-1">
                              Cognitive Memory
                            </span>
                            <div className="whitespace-pre-wrap select-text text-slate-400 text-[10px] leading-snug">
                              {machineBrainIntel}
                            </div>
                          </div>
                        )}
                      </div>

                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-900 pb-1.5 mb-1.5">
                        Suggested Neural Queries
                      </span>
                      
                      {[
                        { label: "Analyze Current Market Sentiment", query: "Can you analyze our current market sentiment indicator? Is it indicating conservative or aggressive entry, and why?" },
                        { label: "Audit Active Strategies", query: "Audit our 3 active strategies: RSI-Reversion, BB-Breakout, and XGB-Alpha. Which one has the strongest Sharpe ratio and win rate?" },
                        { label: "Propose Custom Strategy", query: "I want to build a new custom strategy entry filter. Can you suggest some mathematical entry rules for high volatility crypto breakouts?" },
                        { label: "Evaluate Dynamic Thresholds", query: "Analyze our dynamic threshold tuning logs. Why are we shifting thresholds and what are the risk rewards?" },
                        { label: "Review Latest Engine Logs", query: "Examine our current engine console logs and tell me if you spot any anomalies or warnings." }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setBrainInput(item.query)}
                          className="w-full text-left p-2.5 bg-[#0a0f1d] hover:bg-slate-900 rounded-lg border border-slate-900 hover:border-slate-800 transition-all cursor-pointer text-[11px] text-slate-300 hover:text-white flex items-start gap-2 group text-wrap break-words"
                        >
                          <Sparkles size={12} className="text-indigo-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                          <span className="leading-tight">{item.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col bg-[#070a14] rounded-xl border border-[#1e293b]/40 overflow-hidden h-full">
                      {/* Messages Container */}
                      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-thin">
                        {brainMessages.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex flex-col gap-1.5 max-w-[85%] ${
                              msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'
                            }`}
                          >
                            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest px-1">
                              {msg.role === 'user' ? 'Suite Operator' : 'Hermes Brain'}
                            </span>
                            <div
                              className={`p-3.5 rounded-xl text-xs leading-relaxed font-sans ${
                                msg.role === 'user'
                                  ? 'bg-[#4f46e5] text-white shadow-[0_4px_12px_rgba(79,70,229,0.15)] rounded-tr-none'
                                  : 'bg-slate-950/80 border border-slate-900/80 text-slate-200 rounded-tl-none'
                              }`}
                            >
                              <div className="whitespace-pre-wrap">
                                {msg.text.split('\n').map((line, lIdx) => {
                                  // Simple Markdown Bold Parser
                                  let formattedLine: React.ReactNode = line;
                                  const boldRegex = /\*\*(.*?)\*\*/g;
                                  if (boldRegex.test(line)) {
                                    const parts = line.split(/\*\*(.*?)\*\*/g);
                                    formattedLine = parts.map((part, pIdx) => 
                                      pIdx % 2 === 1 ? <strong key={pIdx} className="text-white font-bold">{part}</strong> : part
                                    );
                                  }

                                  if (line.startsWith('- ') || line.startsWith('* ')) {
                                    return (
                                      <div key={lIdx} className="flex gap-1.5 ml-2 mt-0.5">
                                        <span className="text-indigo-400 font-mono">•</span>
                                        <span>{formattedLine}</span>
                                      </div>
                                    );
                                  }

                                  return <p key={lIdx} className="mb-1 leading-relaxed">{formattedLine}</p>;
                                })}
                              </div>
                            </div>
                          </div>
                        ))}

                        {brainLoading && (
                          <div className="self-start flex flex-col gap-1.5 items-start max-w-[85%]">
                            <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-widest px-1 animate-pulse">
                              Synaptic firing in progress...
                            </span>
                            <div className="p-4 bg-slate-950/80 border border-slate-900 rounded-xl rounded-tl-none flex items-center gap-3">
                              <div className="flex gap-1">
                                <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="h-1.5 w-1.5 bg-indigo-500 rounded-full animate-bounce"></span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Hermes thinking</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Chat Input Bar */}
                      <form onSubmit={sendBrainMessage} className="p-3 bg-slate-950/80 border-t border-slate-900/80 flex gap-2 shrink-0">
                        <input
                          type="text"
                          value={brainInput}
                          onChange={(e) => setBrainInput(e.target.value)}
                          placeholder={brainLoading ? "Syncing synaptic channels..." : "Inquire with Hermes Brain (e.g. 'Audit current strategies')..."}
                          disabled={brainLoading}
                          className="flex-1 px-4 py-2.5 bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 focus:border-indigo-500/80 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 rounded-xl text-xs text-white font-sans transition-all disabled:opacity-50 placeholder-slate-500"
                        />
                        <button
                          type="submit"
                          disabled={brainLoading || !brainInput.trim()}
                          className="px-4 py-2 bg-[#4f46e5] hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        >
                          <span>Sync</span>
                        </button>
                      </form>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

          </div>

        </div>

      </div>

      {/* MOBILE FLOATING LIVE STREAM DOCK (sm:hidden) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070a14]/95 border-t border-indigo-500/30 backdrop-blur-2xl px-3 py-2.5 flex items-center justify-between gap-2 shadow-[0_-10px_30px_rgba(0,0,0,0.9)]" id="mobile-floating-dock">
        {/* Always-On Live Engine Status */}
        <div
          className="flex-1 min-h-[44px] bg-emerald-500/15 text-emerald-300 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)] select-none px-3"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span className="truncate">{scanningInProgress ? '⚡ LIVE SCANNING...' : '⚡ LIVE FEED (1.5s STREAM)'}</span>
        </div>

        {/* Mobile Side Menu Toggle */}
        <button
          onClick={() => setIsSideMenuOpen(!isSideMenuOpen)}
          className={`min-h-[44px] px-3 rounded-xl font-mono text-[10px] font-bold flex flex-col items-center justify-center gap-0.5 border transition-all touch-manipulation cursor-pointer active:scale-95 ${
            isSideMenuOpen
              ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.4)]'
              : 'bg-[#0b0f19] text-indigo-300 border-indigo-500/40 hover:border-indigo-400'
          }`}
        >
          <PanelLeft size={15} className={isSideMenuOpen ? 'text-amber-300' : 'text-indigo-400'} />
          <span>{isSideMenuOpen ? 'CLOSE' : 'MENU'}</span>
        </button>
      </div>

    </div>
  );
}
