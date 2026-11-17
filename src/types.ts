export interface TradingSignal {
  id: number;
  timestamp: string;
  asset: string;
  direction: 'BUY' | 'SELL';
  expiry: string;
  price: number;
  rsi_val: number;
  atr_val: number;
  score: number;
  win_probability: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  features: Record<string, any>;
  breakdown: Record<string, string | number>;
  outcome: 'pending' | 'win' | 'loss' | 'timeout';
  actual_payout: number;
  recorded_at?: string;
  strategy_name?: string;
  stop_loss?: number;
  take_profit?: number;
  risk_reward?: number;
  position_size?: number;
  outcome_5m?: 'win' | 'loss' | 'pending';
  price_5m?: number;
  sentiment_val?: number;
  sentiment_classification?: string;
  sentiment_modulation?: number;
  signal_depth?: 'DEEP EXTREME REVERSION' | 'DEEP WICK ABSORPTION' | 'DEEP CONFLUENCE SHOT' | 'DEEP BREAKOUT CLEARANCE' | string;
  candle_clearance?: string;
  entry_margin_pips?: number;
  deep_conviction?: boolean;
  pure_accuracy_certified?: boolean;
  near_miss_risk?: string;
  session_type?: string;
  engine_name?: string;
  session_position_scale?: string;
  tracked?: boolean;
  quotex_outcome?: 'win' | 'loss' | 'pending' | 'timeout';
  is_live?: boolean;
}

export interface MarketSentiment {
  value: number;
  classification: string;
  timestamp: string;
  source: string;
  last_updated: string;
}

export interface StrategyPairPerformance {
  pair: string;
  win_rate: number;
  total_trades: number;
  avg_score: number;
  profit_factor: number;
  best_timeframe: string;
  status: 'OPTIMAL' | 'STABLE' | 'NEUTRAL' | 'UNDERPERFORMING';
}

export interface OmniTimeframeBreakdownEntry {
  timeframe: string;
  testedCandlesCount: number;
  totalTrades: number;
  wins: number;
  losses: number;
  winRatePct: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdownPct: number;
  netReturnPct: number;
  successScore: number;
  isOptimal: boolean;
}

export interface TradingStrategy {
  id: number;
  name: string;
  template_id: string;
  params: Record<string, any>;
  weights: Record<string, number>;
  entry_logic: string;
  filters: string[];
  enabled: boolean;
  generation: number;
  promoted_at: string;
  market: 'forex' | 'crypto';
  last_sharpe: number;
  last_pf: number; // profit factor
  last_wr: number; // win rate
  last_dd: number; // max drawdown
  success_score?: number; // 0 to 100 calculated success score
  best_pairs?: StrategyPairPerformance[];
  total_signals_generated?: number;
  category?: string;
  backtest_history: { date: string; value: number }[];
  isolated_lineage?: boolean;
  pine_source?: string;
  optimal_timeframe?: string;
  omni_timeframe_results?: OmniTimeframeBreakdownEntry[];
}

export interface PerformanceMetric {
  id: number;
  timestamp: string;
  metric: string;
  value: number;
  period: 'all' | 'daily' | 'weekly';
}

export interface AdaptiveThreshold {
  id: number;
  timestamp: string;
  param_name: string;
  old_value: number;
  new_value: number;
  reason: string;
}

export interface ModelVersion {
  id: number;
  timestamp: string;
  version: number;
  accuracy: number;
  precision_val: number;
  recall: number;
  f1: number;
  auc: number;
  sample_count: number;
  features_used: string[];
}

export interface TradeInsight {
  id: number;
  signal_id: number;
  batch_id: number;
  outcome: 'win' | 'loss';
  contradictions: Record<string, any>;
  insight: string;
  recommendation: string;
  created_at: string;
}

export type MarketSessionType = 
  | 'Asian (Tokyo)'
  | 'London Open'
  | 'London Main Session'
  | 'New York Open'
  | 'London–New York Overlap'
  | 'New York Close'
  | 'Low Liquidity / Holiday Session';

export interface MarketSessionInfo {
  session_type: MarketSessionType;
  engine_name: string;
  status: 'ACTIVE' | 'TRANSITIONING';
  utc_hour: number;
  volatility_mode: string;
  focus: string;
  target_assets: string[];
  recommended_timeframe: string;
  min_win_probability: number;
  position_scale: string;
  last_updated: string;
  custom_override?: boolean;
}

export interface EngineState {
  scanning: boolean;
  activePairsCount: number;
  lastScanTime: string;
  logs: string[];
  session_info?: MarketSessionInfo;
}

export interface AISentimentBriefing {
  commentary: string;
  suggested_action: string;
  risk_level: 'Conservative' | 'Moderate' | 'Aggressive' | 'Neutral';
  last_updated: string;
}

export interface AiEngineStatus {
  model_id: string;
  display_name: string;
  reasoning_level: string;
  fallback_chain: string[];
  api_key_configured: boolean;
  last_sync_at: string;
  synced_trades_count: number;
  active_strategies_count: number;
  solo_pine_count: number;
}
