/**
 * 策略回测服务
 * 使用历史数据测试交易策略的表现
 * 
 * 核心改进：
 * 1. 趋势过滤模块：只在价格 > MA 且 RSI < 超卖线时买入，避免逆势抄底
 * 2. ATR动态止损：止损价 = 入场价 - ATR * ATR_Multiplier，适应不同波动率标的
 */

import { calculateSMA, calculateEMA, calculateATR, calculateRSI } from '../utils/indicators';

export interface BacktestConfig {
  // 策略参数
  rsiPeriod: number;              // RSI周期
  rsiOverbought: number;          // RSI超买线
  rsiOversold: number;            // RSI超卖线
  macdFast: number;               // MACD快线周期
  macdSlow: number;               // MACD慢线周期
  macdSignal: number;             // MACD信号线周期
  
  // 趋势过滤模块（新增）
  useTrendFilter: boolean;        // 是否启用趋势过滤
  maPeriod: number;               // MA均线周期（默认20或60）
  maType: 'SMA' | 'EMA';          // MA类型（简单移动平均或指数移动平均）
  
  // 仓位管理
  positionSize: number;           // 单次投入比例（0.1-0.5）
  maxPositions: number;           // 最大持仓数量
  
  // 风险控制（动态ATR止损）
  useATRStop: boolean;            // 是否启用ATR动态止损
  atrPeriod: number;              // ATR周期（默认14）
  atrMultiplier: number;          // ATR倍数（默认2.0）
  stopLoss: number;               // 固定止损线（负数，如-0.03表示-3%，仅当useATRStop=false时使用）
  takeProfit: number;             // 止盈线（正数，如0.05表示5%）
  
  // 交易成本
  commissionRate: number;         // 手续费率（如0.003表示0.3%）
  stampTaxRate: number;           // 印花税率（如0.001表示0.1%，仅卖出时收取）
}

export interface BacktestResult {
  // 基础信息
  symbol: string;
  startDate: string;
  endDate: string;
  tradingDays: number;
  
  // 收益指标
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;            // 总收益率
  annualizedReturn: number;       // 年化收益率
  
  // 风险指标
  maxDrawdown: number;            // 最大回撤
  sharpeRatio: number;            // 夏普比率
  volatility: number;             // 波动率
  
  // 交易统计
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgProfit: number;              // 平均盈利
  avgLoss: number;                // 平均亏损
  profitFactor: number;           // 盈亏比
  
  // 资金曲线
  equityCurve: EquityPoint[];
  
  // 交易明细
  trades: TradeRecord[];
}

export interface EquityPoint {
  date: string;
  time: string;
  equity: number;                 // 总资产（现金+持仓市值）
  cash: number;                   // 现金
  positionValue: number;          // 持仓市值
}

export interface TradeRecord {
  tradeId: number;
  entryDate: string;
  entryTime: string;
  entryPrice: number;
  exitDate: string | null;
  exitTime: string | null;
  exitPrice: number | null;
  shares: number;
  profit: number | null;
  profitPercent: number | null;
  exitReason: string | null;      // 'signal' | 'stop_loss' | 'take_profit' | 'atr_stop' | 'open'
  stopLossPrice: number | null;   // 止损价（用于ATR动态止损）
}

interface Position {
  entryIndex: number;
  entryPrice: number;
  shares: number;
  stopLossPrice: number;
}

interface Bar {
  date: string;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * 执行策略回测
 */
export async function runBacktest(
  symbol: string,
  market: string,
  startDate: string,
  endDate: string,
  config: BacktestConfig
): Promise<BacktestResult> {
  // TODO: 获取真实历史数据
  // 当前使用模拟数据演示算法逻辑
  const bars = generateMockBars(startDate, endDate);
  
  const initialCapital = 10000;
  let cash = initialCapital;
  const positions: Position[] = [];
  const trades: TradeRecord[] = [];
  const equityCurve: EquityPoint[] = [];
  let tradeIdCounter = 1;
  
  // 计算技术指标
  const closes = bars.map(b => b.close);
  const highs = bars.map(b => b.high);
  const lows = bars.map(b => b.low);
  
  const rsiValues = calculateRSI(closes, config.rsiPeriod);
  const atrValues = calculateATR(highs, lows, closes, config.atrPeriod);
  
  // 计算MA均线（用于趋势过滤）
  let maValues: number[] = [];
  if (config.useTrendFilter) {
    maValues = config.maType === 'SMA' 
      ? calculateSMA(closes, config.maPeriod)
      : calculateEMA(closes, config.maPeriod);
  }
  
  // 遍历每个bar，模拟交易
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const rsi = rsiValues[i];
    const atr = atrValues[i];
    const ma = config.useTrendFilter ? maValues[i] : 0;
    
    // 检查是否有足够的数据计算指标
    if (isNaN(rsi) || (config.useATRStop && isNaN(atr)) || (config.useTrendFilter && isNaN(ma))) {
      continue;
    }
    
    // 1. 检查现有持仓的止损/止盈
    for (let j = positions.length - 1; j >= 0; j--) {
      const pos = positions[j];
      const currentPrice = bar.close;
      const profitPercent = (currentPrice - pos.entryPrice) / pos.entryPrice;
      
      let shouldExit = false;
      let exitReason = '';
      
      // ATR动态止损
      if (config.useATRStop && currentPrice <= pos.stopLossPrice) {
        shouldExit = true;
        exitReason = 'atr_stop';
      }
      // 固定百分比止损
      else if (!config.useATRStop && profitPercent <= config.stopLoss) {
        shouldExit = true;
        exitReason = 'stop_loss';
      }
      // 止盈
      else if (profitPercent >= config.takeProfit) {
        shouldExit = true;
        exitReason = 'take_profit';
      }
      // 卖出信号（RSI超买）
      else if (rsi >= config.rsiOverbought) {
        shouldExit = true;
        exitReason = 'signal';
      }
      
      if (shouldExit) {
        // 平仓
        const exitPrice = currentPrice;
        const grossProfit = (exitPrice - pos.entryPrice) * pos.shares;
        
        // 计算交易成本
        const buyCost = pos.entryPrice * pos.shares * config.commissionRate;
        const sellCost = exitPrice * pos.shares * (config.commissionRate + config.stampTaxRate);
        const netProfit = grossProfit - buyCost - sellCost;
        
        cash += exitPrice * pos.shares - sellCost;
        
        // 记录交易
        const entryBar = bars[pos.entryIndex];
        trades.push({
          tradeId: tradeIdCounter++,
          entryDate: entryBar.date,
          entryTime: entryBar.time,
          entryPrice: pos.entryPrice,
          exitDate: bar.date,
          exitTime: bar.time,
          exitPrice: exitPrice,
          shares: pos.shares,
          profit: netProfit,
          profitPercent: (exitPrice - pos.entryPrice) / pos.entryPrice,
          exitReason: exitReason,
          stopLossPrice: pos.stopLossPrice,
        });
        
        // 移除持仓
        positions.splice(j, 1);
      }
    }
    
    // 2. 检查买入信号
    if (positions.length < config.maxPositions && rsi < config.rsiOversold) {
      // 趋势过滤：只在价格 > MA 时买入
      const trendOk = !config.useTrendFilter || bar.close > ma;
      
      if (trendOk) {
        // 计算买入数量
        const investAmount = cash * config.positionSize;
        const buyPrice = bar.close;
        const shares = Math.floor(investAmount / buyPrice);
        
        if (shares > 0) {
          // 计算止损价
          let stopLossPrice: number;
          if (config.useATRStop) {
            stopLossPrice = buyPrice - atr * config.atrMultiplier;
          } else {
            stopLossPrice = buyPrice * (1 + config.stopLoss);
          }
          
          // 扣除买入成本
          const buyCost = buyPrice * shares * (1 + config.commissionRate);
          cash -= buyCost;
          
          // 开仓
          positions.push({
            entryIndex: i,
            entryPrice: buyPrice,
            shares: shares,
            stopLossPrice: stopLossPrice,
          });
        }
      }
    }
    
    // 3. 记录资金曲线
    const positionValue = positions.reduce((sum, pos) => sum + pos.shares * bar.close, 0);
    const equity = cash + positionValue;
    
    equityCurve.push({
      date: bar.date,
      time: bar.time,
      equity: Math.round(equity * 100) / 100,
      cash: Math.round(cash * 100) / 100,
      positionValue: Math.round(positionValue * 100) / 100,
    });
  }
  
  // 4. 平掉所有未平仓持仓
  const lastBar = bars[bars.length - 1];
  for (const pos of positions) {
    const exitPrice = lastBar.close;
    const grossProfit = (exitPrice - pos.entryPrice) * pos.shares;
    const buyCost = pos.entryPrice * pos.shares * config.commissionRate;
    const sellCost = exitPrice * pos.shares * (config.commissionRate + config.stampTaxRate);
    const netProfit = grossProfit - buyCost - sellCost;
    
    cash += exitPrice * pos.shares - sellCost;
    
    const entryBar = bars[pos.entryIndex];
    trades.push({
      tradeId: tradeIdCounter++,
      entryDate: entryBar.date,
      entryTime: entryBar.time,
      entryPrice: pos.entryPrice,
      exitDate: lastBar.date,
      exitTime: lastBar.time,
      exitPrice: exitPrice,
      shares: pos.shares,
      profit: netProfit,
      profitPercent: (exitPrice - pos.entryPrice) / pos.entryPrice,
      exitReason: 'open',
      stopLossPrice: pos.stopLossPrice,
    });
  }
  
  // 5. 计算统计指标
  const finalCapital = equityCurve[equityCurve.length - 1].equity;
  const totalReturn = (finalCapital - initialCapital) / initialCapital;
  
  const winningTrades = trades.filter(t => t.profit && t.profit > 0);
  const losingTrades = trades.filter(t => t.profit && t.profit < 0);
  const totalProfit = winningTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit || 0), 0));
  
  const returns = equityCurve.map((point, i) => {
    if (i === 0) return 0;
    return (point.equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity;
  }).slice(1);
  
  const maxDrawdown = calculateMaxDrawdown(equityCurve.map(p => p.equity));
  const sharpeRatio = calculateSharpeRatio(returns);
  const volatility = calculateVolatility(returns);
  
  const tradingDays = bars.length;
  const annualizedReturn = totalReturn * (252 / tradingDays);
  
  const result: BacktestResult = {
    symbol,
    startDate,
    endDate,
    tradingDays,
    
    initialCapital,
    finalCapital,
    totalReturn,
    annualizedReturn,
    
    maxDrawdown,
    sharpeRatio,
    volatility,
    
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: trades.length > 0 ? winningTrades.length / trades.length : 0,
    avgProfit: winningTrades.length > 0 ? totalProfit / winningTrades.length : 0,
    avgLoss: losingTrades.length > 0 ? -totalLoss / losingTrades.length : 0,
    profitFactor: totalLoss > 0 ? totalProfit / totalLoss : 0,
    
    equityCurve,
    trades,
  };
  
  return result;
}

/**
 * 生成模拟K线数据（用于演示）
 * TODO: 替换为真实历史数据API
 */
function generateMockBars(startDate: string, endDate: string): Bar[] {
  const bars: Bar[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let currentPrice = 100;
  let currentDate = new Date(start);
  
  while (currentDate <= end) {
    // 跳过周末
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      // 生成当天的分钟级数据（模拟240个bar，4小时交易）
      for (let minute = 0; minute < 240; minute++) {
        const hour = 9 + Math.floor(minute / 60);
        const min = minute % 60;
        
        // 模拟价格波动
        const change = (Math.random() - 0.5) * 2;
        currentPrice = Math.max(50, Math.min(150, currentPrice + change));
        
        const open = currentPrice;
        const high = currentPrice + Math.random() * 1;
        const low = currentPrice - Math.random() * 1;
        const close = low + Math.random() * (high - low);
        
        bars.push({
          date: currentDate.toISOString().split('T')[0],
          time: `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`,
          open: Math.round(open * 100) / 100,
          high: Math.round(high * 100) / 100,
          low: Math.round(low * 100) / 100,
          close: Math.round(close * 100) / 100,
          volume: Math.floor(Math.random() * 10000) + 1000,
        });
        
        currentPrice = close;
      }
    }
    
    // 下一天
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return bars;
}

/**
 * 计算夏普比率
 */
function calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.03): number {
  if (returns.length === 0) return 0;
  
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return 0;
  
  return (avgReturn - riskFreeRate / 252) / stdDev * Math.sqrt(252);
}

/**
 * 计算最大回撤
 */
function calculateMaxDrawdown(equityCurve: number[]): number {
  let maxDrawdown = 0;
  let peak = equityCurve[0];
  
  for (const equity of equityCurve) {
    if (equity > peak) {
      peak = equity;
    }
    const drawdown = (equity - peak) / peak;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown;
}

/**
 * 计算波动率
 */
function calculateVolatility(returns: number[]): number {
  if (returns.length === 0) return 0;
  
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  
  return Math.sqrt(variance * 252);
}
