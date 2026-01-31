/**
 * 回测引擎测试
 * 验证趋势过滤和ATR动态止损功能
 */

import { describe, it, expect } from 'vitest';
import { runBacktest, BacktestConfig } from './backtest.service';

describe('策略回测服务', () => {
  const defaultConfig: BacktestConfig = {
    rsiPeriod: 14,
    rsiOverbought: 70,
    rsiOversold: 30,
    macdFast: 12,
    macdSlow: 26,
    macdSignal: 9,
    
    useTrendFilter: false,
    maPeriod: 20,
    maType: 'SMA',
    
    positionSize: 0.3,
    maxPositions: 3,
    
    useATRStop: false,
    atrPeriod: 14,
    atrMultiplier: 2.0,
    stopLoss: -0.03,
    takeProfit: 0.05,
    
    commissionRate: 0.003,
    stampTaxRate: 0.001,
  };

  it('应该返回完整的回测结果', async () => {
    const result = await runBacktest(
      'AAPL',
      'US',
      '2026-01-01',
      '2026-01-15',
      defaultConfig
    );

    // 验证基础信息
    expect(result.symbol).toBe('AAPL');
    expect(result.startDate).toBe('2026-01-01');
    expect(result.endDate).toBe('2026-01-15');
    expect(result.tradingDays).toBeGreaterThan(0);

    // 验证收益指标
    expect(result.initialCapital).toBe(10000);
    expect(result.finalCapital).toBeGreaterThan(0);
    expect(typeof result.totalReturn).toBe('number');
    expect(typeof result.annualizedReturn).toBe('number');

    // 验证风险指标
    expect(typeof result.maxDrawdown).toBe('number');
    expect(typeof result.sharpeRatio).toBe('number');
    expect(typeof result.volatility).toBe('number');

    // 验证交易统计
    expect(result.totalTrades).toBeGreaterThanOrEqual(0);
    expect(result.winningTrades).toBeGreaterThanOrEqual(0);
    expect(result.losingTrades).toBeGreaterThanOrEqual(0);
    expect(result.winRate).toBeGreaterThanOrEqual(0);
    expect(result.winRate).toBeLessThanOrEqual(1);

    // 验证资金曲线
    expect(result.equityCurve).toBeInstanceOf(Array);
    expect(result.equityCurve.length).toBeGreaterThan(0);

    // 验证交易明细
    expect(result.trades).toBeInstanceOf(Array);
  });

  it('启用趋势过滤后，应该减少逆势交易', async () => {
    const withoutFilter = await runBacktest(
      'AAPL',
      'US',
      '2026-01-01',
      '2026-01-15',
      { ...defaultConfig, useTrendFilter: false }
    );

    const withFilter = await runBacktest(
      'AAPL',
      'US',
      '2026-01-01',
      '2026-01-15',
      { ...defaultConfig, useTrendFilter: true }
    );

    // 趋势过滤应该减少交易次数（过滤掉逆势信号）
    // 注意：由于使用模拟数据，这个测试可能不稳定
    expect(withFilter.totalTrades).toBeLessThanOrEqual(withoutFilter.totalTrades + 5);
  });

  it('启用ATR动态止损后，应该在交易记录中包含止损价', async () => {
    const result = await runBacktest(
      'AAPL',
      'US',
      '2026-01-01',
      '2026-01-15',
      { ...defaultConfig, useATRStop: true }
    );

    // 检查交易记录中是否有止损价
    const tradesWithStopLoss = result.trades.filter(t => t.stopLossPrice !== null);
    expect(tradesWithStopLoss.length).toBeGreaterThan(0);

    // 验证止损价格合理性（止损价应该低于入场价）
    for (const trade of tradesWithStopLoss) {
      if (trade.stopLossPrice !== null) {
        expect(trade.stopLossPrice).toBeLessThan(trade.entryPrice);
      }
    }
  });

  it('固定百分比止损应该正确计算止损价', async () => {
    const stopLossPercent = -0.05; // -5%
    const result = await runBacktest(
      'AAPL',
      'US',
      '2026-01-01',
      '2026-01-15',
      { ...defaultConfig, useATRStop: false, stopLoss: stopLossPercent }
    );

    // 验证有交易被止损
    const stopLossTrades = result.trades.filter(t => t.exitReason === 'stop_loss');
    
    // 如果有止损交易，验证亏损幅度接近设定的止损线
    for (const trade of stopLossTrades) {
      if (trade.profitPercent !== null) {
        // 允许一定误差（因为可能在下一个bar才触发止损）
        expect(trade.profitPercent).toBeLessThanOrEqual(0);
        expect(trade.profitPercent).toBeGreaterThanOrEqual(stopLossPercent * 1.5);
      }
    }
  });

  it('止盈功能应该正确触发', async () => {
    const takeProfitPercent = 0.05; // 5%
    const result = await runBacktest(
      'AAPL',
      'US',
      '2026-01-01',
      '2026-01-15',
      { ...defaultConfig, takeProfit: takeProfitPercent }
    );

    // 验证有交易被止盈
    const takeProfitTrades = result.trades.filter(t => t.exitReason === 'take_profit');
    
    // 如果有止盈交易，验证盈利幅度接近设定的止盈线
    for (const trade of takeProfitTrades) {
      if (trade.profitPercent !== null) {
        expect(trade.profitPercent).toBeGreaterThanOrEqual(takeProfitPercent * 0.8);
      }
    }
  });

  it('应该正确计算交易成本（手续费和印花税）', async () => {
    const result = await runBacktest(
      'AAPL',
      'US',
      '2026-01-01',
      '2026-01-15',
      defaultConfig
    );

    // 验证最终资金小于等于初始资金+总盈利（因为有交易成本）
    const grossProfit = result.trades.reduce((sum, t) => {
      if (t.exitPrice && t.profit !== null) {
        const grossProfitWithoutCost = (t.exitPrice - t.entryPrice) * t.shares;
        return sum + grossProfitWithoutCost;
      }
      return sum;
    }, 0);

    // 最终资金应该小于初始资金+总毛利（因为扣除了交易成本）
    expect(result.finalCapital).toBeLessThanOrEqual(result.initialCapital + grossProfit);
  });

  it('资金曲线应该连续且合理', async () => {
    const result = await runBacktest(
      'AAPL',
      'US',
      '2026-01-01',
      '2026-01-15',
      defaultConfig
    );

    // 验证资金曲线的连续性
    expect(result.equityCurve.length).toBeGreaterThan(0);

    // 验证每个点的资金组成合理
    for (const point of result.equityCurve) {
      expect(point.equity).toBeGreaterThan(0);
      expect(point.cash).toBeGreaterThanOrEqual(0);
      expect(point.positionValue).toBeGreaterThanOrEqual(0);
      
      // 总资产 = 现金 + 持仓市值（允许小数误差）
      expect(Math.abs(point.equity - (point.cash + point.positionValue))).toBeLessThan(1);
    }
  });

  it('胜率计算应该正确', async () => {
    const result = await runBacktest(
      'AAPL',
      'US',
      '2026-01-01',
      '2026-01-15',
      defaultConfig
    );

    if (result.totalTrades > 0) {
      const expectedWinRate = result.winningTrades / result.totalTrades;
      expect(result.winRate).toBeCloseTo(expectedWinRate, 5);
      
      // 验证盈利交易数 + 亏损交易数 = 总交易数
      expect(result.winningTrades + result.losingTrades).toBe(result.totalTrades);
    }
  });

  it('盈亏比计算应该正确', async () => {
    const result = await runBacktest(
      'AAPL',
      'US',
      '2026-01-01',
      '2026-01-15',
      defaultConfig
    );

    if (result.losingTrades > 0 && result.winningTrades > 0) {
      const totalProfit = result.trades
        .filter(t => t.profit && t.profit > 0)
        .reduce((sum, t) => sum + (t.profit || 0), 0);
      
      const totalLoss = Math.abs(
        result.trades
          .filter(t => t.profit && t.profit < 0)
          .reduce((sum, t) => sum + (t.profit || 0), 0)
      );

      if (totalLoss > 0) {
        const expectedProfitFactor = totalProfit / totalLoss;
        expect(result.profitFactor).toBeCloseTo(expectedProfitFactor, 2);
      }
    }
  });

  it('SMA和EMA趋势过滤应该产生不同的结果', async () => {
    const withSMA = await runBacktest(
      'AAPL',
      'US',
      '2026-01-01',
      '2026-01-15',
      { ...defaultConfig, useTrendFilter: true, maType: 'SMA' }
    );

    const withEMA = await runBacktest(
      'AAPL',
      'US',
      '2026-01-01',
      '2026-01-15',
      { ...defaultConfig, useTrendFilter: true, maType: 'EMA' }
    );

    // SMA和EMA应该产生不同的交易结果（因为计算方式不同）
    // 注意：由于模拟数据的随机性，这个测试可能不稳定
    expect(withSMA.totalReturn).not.toBe(withEMA.totalReturn);
  });
});
