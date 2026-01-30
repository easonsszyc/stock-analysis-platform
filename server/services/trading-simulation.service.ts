/**
 * 模拟交易盈亏计算服务
 * 根据买卖信号计算如果按照信号交易的盈亏情况
 */

export interface TradingSimulationResult {
  initialCapital: number;           // 初始资金
  finalCapital: number;              // 最终资金（现金 + 持仓市值）
  totalProfit: number;               // 总盈亏金额
  totalProfitPercent: number;        // 总盈亏百分比
  totalTrades: number;               // 总交易次数
  winningTrades: number;             // 盈利交易次数
  losingTrades: number;              // 亏损交易次数
  winRate: number;                   // 胜率（百分比）
  openPositions: number;             // 未平仓数量
  openPositionsValue: number;        // 未平仓市值
  cash: number;                      // 剩余现金
  trades: TradeDetail[];             // 交易详情列表
}

export interface TradeDetail {
  tradeId: number;                   // 交易ID
  buyPrice: number;                  // 买入价格
  buyTime: string;                   // 买入时间
  sellPrice: number | null;          // 卖出价格（null表示未平仓）
  sellTime: string | null;           // 卖出时间
  profit: number | null;             // 盈亏金额
  profitPercent: number | null;      // 盈亏百分比
  shares: number;                    // 交易股数
}

/**
 * 计算模拟交易盈亏
 * @param signals 买卖信号列表（已配对）
 * @param initialCapital 初始资金
 * @param currentPrice 当前价格（用于计算未平仓市值）
 * @returns 模拟交易结果
 */
export function calculateTradingSimulation(
  signals: any[],
  initialCapital: number = 10000,
  currentPrice: number = 0
): TradingSimulationResult {
  let cash = initialCapital;
  let totalProfit = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let openPositions = 0;
  let openPositionsValue = 0;
  const trades: TradeDetail[] = [];

  // 按时间排序信号
  const sortedSignals = [...signals].sort((a, b) => {
    const timeA = a.time || '';
    const timeB = b.time || '';
    return timeA.localeCompare(timeB);
  });

  // 遍历所有信号，计算交易
  let tradeId = 1;
  for (const signal of sortedSignals) {
    if (signal.type === 'buy') {
      // 买入信号：使用当前现金的30%买入
      const investAmount = cash * 0.3;
      const shares = Math.floor(investAmount / signal.price);
      
      if (shares > 0) {
        const actualInvestment = shares * signal.price;
        cash -= actualInvestment;
        
        // 检查是否有配对的卖出信号
        const pairedSell = signal.pairedSignal;
        
        if (pairedSell) {
          // 已平仓交易
          const sellAmount = shares * pairedSell.price;
          cash += sellAmount;
          
          const profit = sellAmount - actualInvestment;
          const profitPercent = (profit / actualInvestment) * 100;
          totalProfit += profit;
          
          if (profit > 0) {
            winningTrades++;
          } else {
            losingTrades++;
          }
          
          trades.push({
            tradeId: tradeId++,
            buyPrice: signal.price,
            buyTime: signal.time,
            sellPrice: pairedSell.price,
            sellTime: pairedSell.time,
            profit,
            profitPercent,
            shares,
          });
        } else {
          // 未平仓交易：按当前价格计算市值
          openPositions++;
          const currentValue = shares * (currentPrice || signal.price);
          openPositionsValue += currentValue;
          
          trades.push({
            tradeId: tradeId++,
            buyPrice: signal.price,
            buyTime: signal.time,
            sellPrice: null,
            sellTime: null,
            profit: null,
            profitPercent: null,
            shares,
          });
        }
      }
    }
  }

  const totalTrades = winningTrades + losingTrades;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  
  // 最终资产 = 现金 + 未平仓市值
  const finalCapital = cash + openPositionsValue;
  const totalProfitPercent = ((finalCapital - initialCapital) / initialCapital) * 100;

  return {
    initialCapital,
    finalCapital,
    totalProfit: finalCapital - initialCapital,
    totalProfitPercent,
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    openPositions,
    openPositionsValue,
    cash,
    trades,
  };
}
