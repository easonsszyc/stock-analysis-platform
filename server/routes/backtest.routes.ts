import express from 'express';
import { runBacktest, BacktestConfig } from '../services/backtest.service';

const router = express.Router();

/**
 * POST /api/backtest/run
 * 执行策略回测
 */
router.post('/run', async (req, res) => {
  try {
    const { symbol, market, startDate, endDate, config } = req.body;
    
    if (!symbol || !market || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // 使用默认配置或用户提供的配置
    const backtestConfig: BacktestConfig = {
      rsiPeriod: config?.rsiPeriod || 14,
      rsiOverbought: config?.rsiOverbought || 70,
      rsiOversold: config?.rsiOversold || 30,
      macdFast: config?.macdFast || 12,
      macdSlow: config?.macdSlow || 26,
      macdSignal: config?.macdSignal || 9,
      positionSize: config?.positionSize || 0.3,
      maxPositions: config?.maxPositions || 5,
      stopLoss: config?.stopLoss || -0.03,
      takeProfit: config?.takeProfit || 0.05,
      commissionRate: config?.commissionRate || 0.003,
      stampTaxRate: config?.stampTaxRate || 0.001,
    };
    
    const result = await runBacktest(symbol, market, startDate, endDate, backtestConfig);
    
    res.json(result);
  } catch (error) {
    console.error('Error running backtest:', error);
    res.status(500).json({ error: 'Failed to run backtest' });
  }
});

export default router;
