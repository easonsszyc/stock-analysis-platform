/**
 * 策略回测服务
 * 使用历史数据测试交易策略的表现
 */

export interface BacktestConfig {
  // 策略参数
  rsiPeriod: number;              // RSI周期
  rsiOverbought: number;          // RSI超买线
  rsiOversold: number;            // RSI超卖线
  macdFast: number;               // MACD快线周期
  macdSlow: number;               // MACD慢线周期
  macdSignal: number;             // MACD信号线周期
  
  // 仓位管理
  positionSize: number;           // 单次投入比例（0.1-0.5）
  maxPositions: number;           // 最大持仓数量
  
  // 风险控制
  stopLoss: number;               // 止损线（负数，如-0.03表示-3%）
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
  exitReason: string | null;      // 'signal' | 'stop_loss' | 'take_profit' | 'open'
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
  // TODO: 获取历史数据（需要实现历史数据API）
  // 这里先返回模拟数据，后续需要对接真实历史数据源
  
  const initialCapital = 10000;
  
  // 生成模拟交易记录
  const trades: TradeRecord[] = [
    {
      tradeId: 1,
      entryDate: '2025-11-05',
      entryTime: '10:30:00',
      entryPrice: 100.50,
      exitDate: '2025-11-05',
      exitTime: '14:20:00',
      exitPrice: 102.30,
      shares: 100,
      profit: 180,
      profitPercent: 1.79,
      exitReason: 'signal',
    },
    {
      tradeId: 2,
      entryDate: '2025-11-08',
      entryTime: '09:45:00',
      entryPrice: 102.00,
      exitDate: '2025-11-08',
      exitTime: '11:30:00',
      exitPrice: 101.20,
      shares: 100,
      profit: -80,
      profitPercent: -0.78,
      exitReason: 'stop_loss',
    },
    {
      tradeId: 3,
      entryDate: '2025-11-12',
      entryTime: '10:15:00',
      entryPrice: 103.50,
      exitDate: '2025-11-12',
      exitTime: '15:00:00',
      exitPrice: 105.80,
      shares: 95,
      profit: 218.5,
      profitPercent: 2.22,
      exitReason: 'take_profit',
    },
    {
      tradeId: 4,
      entryDate: '2025-11-15',
      entryTime: '11:00:00',
      entryPrice: 104.20,
      exitDate: '2025-11-15',
      exitTime: '13:45:00',
      exitPrice: 103.50,
      shares: 95,
      profit: -66.5,
      profitPercent: -0.67,
      exitReason: 'signal',
    },
    {
      tradeId: 5,
      entryDate: '2025-11-20',
      entryTime: '09:30:00',
      entryPrice: 105.00,
      exitDate: '2025-11-20',
      exitTime: '14:30:00',
      exitPrice: 107.50,
      shares: 90,
      profit: 225,
      profitPercent: 2.38,
      exitReason: 'signal',
    },
    {
      tradeId: 6,
      entryDate: '2025-11-25',
      entryTime: '10:00:00',
      entryPrice: 106.80,
      exitDate: '2025-11-25',
      exitTime: '15:30:00',
      exitPrice: 108.20,
      shares: 90,
      profit: 126,
      profitPercent: 1.31,
      exitReason: 'signal',
    },
    {
      tradeId: 7,
      entryDate: '2025-12-02',
      entryTime: '09:45:00',
      entryPrice: 107.50,
      exitDate: '2025-12-02',
      exitTime: '11:00:00',
      exitPrice: 106.20,
      shares: 90,
      profit: -117,
      profitPercent: -1.21,
      exitReason: 'stop_loss',
    },
    {
      tradeId: 8,
      entryDate: '2025-12-10',
      entryTime: '10:30:00',
      entryPrice: 108.00,
      exitDate: '2025-12-10',
      exitTime: '14:00:00',
      exitPrice: 109.80,
      shares: 85,
      profit: 153,
      profitPercent: 1.67,
      exitReason: 'signal',
    },
    {
      tradeId: 9,
      entryDate: '2025-12-18',
      entryTime: '11:15:00',
      entryPrice: 109.20,
      exitDate: '2025-12-18',
      exitTime: '15:45:00',
      exitPrice: 110.50,
      shares: 85,
      profit: 110.5,
      profitPercent: 1.19,
      exitReason: 'signal',
    },
    {
      tradeId: 10,
      entryDate: '2026-01-08',
      entryTime: '09:30:00',
      entryPrice: 110.00,
      exitDate: '2026-01-08',
      exitTime: '13:30:00',
      exitPrice: 108.50,
      shares: 85,
      profit: -127.5,
      profitPercent: -1.36,
      exitReason: 'stop_loss',
    },
  ];
  
  // 生成资金曲线（每天一个数据点）
  const equityCurve: EquityPoint[] = [];
  let currentEquity = initialCapital;
  const startTime = new Date(startDate).getTime();
  const endTime = new Date(endDate).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  
  for (let time = startTime; time <= endTime; time += dayMs) {
    const date = new Date(time);
    const dateStr = date.toISOString().split('T')[0];
    
    // 模拟随机波动
    const randomChange = (Math.random() - 0.5) * 200;
    currentEquity = Math.max(initialCapital * 0.8, Math.min(initialCapital * 1.3, currentEquity + randomChange));
    
    equityCurve.push({
      date: dateStr,
      time: '16:00:00',
      equity: Math.round(currentEquity * 100) / 100,
      cash: Math.round(currentEquity * 0.3 * 100) / 100,
      positionValue: Math.round(currentEquity * 0.7 * 100) / 100,
    });
  }
  
  const finalCapital = equityCurve[equityCurve.length - 1].equity;
  const totalReturn = (finalCapital - initialCapital) / initialCapital;
  
  // 计算交易统计
  const winningTrades = trades.filter(t => t.profit && t.profit > 0).length;
  const losingTrades = trades.filter(t => t.profit && t.profit < 0).length;
  const totalProfit = trades.filter(t => t.profit && t.profit > 0).reduce((sum, t) => sum + (t.profit || 0), 0);
  const totalLoss = Math.abs(trades.filter(t => t.profit && t.profit < 0).reduce((sum, t) => sum + (t.profit || 0), 0));
  
  const result: BacktestResult = {
    symbol,
    startDate,
    endDate,
    tradingDays: Math.floor((endTime - startTime) / dayMs),
    
    initialCapital,
    finalCapital,
    totalReturn,
    annualizedReturn: totalReturn * (365 / Math.floor((endTime - startTime) / dayMs)),
    
    maxDrawdown: -0.08,
    sharpeRatio: 1.2,
    volatility: 0.15,
    
    totalTrades: trades.length,
    winningTrades,
    losingTrades,
    winRate: winningTrades / trades.length,
    avgProfit: totalProfit / winningTrades,
    avgLoss: -totalLoss / losingTrades,
    profitFactor: totalProfit / totalLoss,
    
    equityCurve,
    trades,
  };
  
  return result;
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
