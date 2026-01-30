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
  const trades: TradeRecord[] = [];
  const equityCurve: EquityPoint[] = [];
  
  // 模拟回测结果（实际需要遍历历史数据）
  const result: BacktestResult = {
    symbol,
    startDate,
    endDate,
    tradingDays: 60,
    
    initialCapital,
    finalCapital: 10500,
    totalReturn: 0.05,
    annualizedReturn: 0.15,
    
    maxDrawdown: -0.08,
    sharpeRatio: 1.2,
    volatility: 0.15,
    
    totalTrades: 10,
    winningTrades: 6,
    losingTrades: 4,
    winRate: 0.6,
    avgProfit: 150,
    avgLoss: -80,
    profitFactor: 1.875,
    
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
