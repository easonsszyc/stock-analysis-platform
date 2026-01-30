// 股票分析相关类型定义
export type MarketType = 'CN' | 'HK' | 'US';

// 时间周期类型
export type TimeRange = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y';
export type Interval = '1m' | '2m' | '5m' | '15m' | '30m' | '60m' | '1d' | '1wk' | '1mo';

// 股票基本信息
export interface StockInfo {
  symbol: string;
  name: string;
  market: MarketType;
  currency: string;
  exchange: string;
  currentPrice?: number;
  previousClose?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  marketCap?: number;
  volume?: number;
}

// 历史价格数据点
export interface PriceDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose?: number;
}

// 技术指标数据
export interface TechnicalIndicators {
  ma5?: number;
  ma10?: number;
  ma20?: number;
  ma60?: number;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
  bollingerUpper?: number;
  bollingerMiddle?: number;
  bollingerLower?: number;
  kdj_k?: number;
  kdj_d?: number;
  kdj_j?: number;
}

// 支撑位和阻力位
export interface SupportResistance {
  support: number[];
  resistance: number[];
}

// 交易信号类型
export type SignalType = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

// 交易信号
export interface TradingSignal {
  signal: SignalType;
  confidence: number; // 0-100
  reasons: string[];
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
}

// 动能分析
export interface MomentumAnalysis {
  upwardMomentum: number; // 上涨动能 0-100
  downwardMomentum: number; // 下跌动能 0-100
  trend: 'STRONG_UPTREND' | 'UPTREND' | 'SIDEWAYS' | 'DOWNTREND' | 'STRONG_DOWNTREND';
  strength: number; // 趋势强度 0-100
}

// 关键价格点
export interface KeyPriceLevels {
  currentPrice: number;
  yearHigh: number;
  yearLow: number;
  recentHigh: number;
  recentLow: number;
  support: SupportResistance;
}

// K线形态
export interface CandlestickPattern {
  name: string;
  type: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  reliability: number; // 0-100
  description: string;
}

// 完整的股票分析结果
export interface StockAnalysis {
  stockInfo: StockInfo;
  priceData: (PriceDataPoint & TechnicalIndicators)[];
  tradingSignal: TradingSignal;
  momentum: MomentumAnalysis;
  keyLevels: KeyPriceLevels;
  patterns: CandlestickPattern[];
  volumeAnalysis: {
    averageVolume: number;
    volumeTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
    volumeStrength: number; // 0-100
  };
  recommendation: {
    action: 'BUY' | 'SELL' | 'HOLD';
    targetPrice?: number;
    stopLoss?: number;
    timeframe: string;
    reasoning: string;
  };
}

// 股票对比数据
export interface StockComparison {
  stocks: StockInfo[];
  priceData: {
    [symbol: string]: (PriceDataPoint & TechnicalIndicators)[];
  };
  relativeStrength: {
    [symbol: string]: number; // 相对强度
  };
  performance: {
    [symbol: string]: {
      daily: number;
      weekly: number;
      monthly: number;
      yearly: number;
    };
  };
  correlation: {
    [symbol: string]: {
      [symbol: string]: number; // 相关系数
    };
  };
}

// API请求类型
export interface AnalyzeStockRequest {
  symbol: string;
  market: MarketType;
  period?: '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y';
}

export interface CompareStocksRequest {
  symbols: string[];
  market: MarketType;
  period?: '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y';
}

export interface SearchStockRequest {
  query: string;
  market?: MarketType;
  limit?: number;
}

// API响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
