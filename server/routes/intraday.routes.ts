/**
 * 分时数据和买卖信号API路由
 */
import { Router } from 'express';
import { getIntradayData } from '../services/intraday-data.service';
import { analyzeTradingSignals } from '../services/trading-signals.service';

const router = Router();

/**
 * GET /api/intraday/data
 * 获取分时数据和买卖信号
 */
router.get('/data', async (req, res) => {
  try {
    const { symbol, market } = req.query;
    
    if (!symbol || !market) {
      return res.status(400).json({ error: 'Missing required parameters: symbol, market' });
    }
    
    const marketType = market as 'US' | 'HK' | 'CN';
    if (!['US', 'HK', 'CN'].includes(marketType)) {
      return res.status(400).json({ error: 'Invalid market type' });
    }
    
    // 获取分时数据
    const intradayData = await getIntradayData(symbol as string, marketType);
    
    if (!intradayData) {
      return res.status(404).json({ error: 'No intraday data found' });
    }
    
    // 分析买卖信号
    const signals = analyzeTradingSignals(intradayData.data);
    
    res.json({
      symbol: intradayData.symbol,
      date: intradayData.date,
      data: intradayData.data,
      signals,
    });
  } catch (error) {
    console.error('Error fetching intraday data:', error);
    res.status(500).json({ error: 'Failed to fetch intraday data' });
  }
});

export default router;
