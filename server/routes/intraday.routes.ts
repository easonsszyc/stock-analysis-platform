/**
 * 分时数据和买卖信号API路由
 */
import { Router } from 'express';
import { getIntradayData } from '../services/intraday-data.service';
import { analyzeTradingSignals } from '../services/trading-signals.service';
import { analyzeMultiTimeframeResonance, enrichSignalsWithResonance } from '../services/multi-timeframe.service';
import { getUSMarketStatus, isHKMarketOpen, isCNMarketOpen } from '../utils/market-status';
import { calculateTradingSimulation } from '../services/trading-simulation.service';

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

    // 分析买卖信号（港股/A股会过滤卖出信号）
    const signals = analyzeTradingSignals(intradayData.data, marketType);

    // TODO: 多周期共振分析需要获取多个时间周期的数据
    // 目前仅返回单一时间周期的信号
    // 在实际应用中，需要同时获取5分钟、15分钟、30分钟的数据进行共振分析

    // 获取市场状态
    let marketStatus = { isOpen: true, status: '交易中', description: '' };
    if (marketType === 'US') {
      marketStatus = getUSMarketStatus();
    } else if (marketType === 'HK') {
      const isOpen = isHKMarketOpen();
      marketStatus = {
        isOpen,
        status: isOpen ? '交易中' : '已收盘',
        description: isOpen ? '港股市场正在交易中，显示实时数据' : '港股市场已收盘，显示上一交易日数据'
      };
    } else if (marketType === 'CN') {
      const isOpen = isCNMarketOpen();
      marketStatus = {
        isOpen,
        status: isOpen ? '交易中' : '已收盘',
        description: isOpen ? 'A股市场正在交易中，显示实时数据' : 'A股市场已收盘，显示上一交易日数据'
      };
    }

    // 计算模拟交易盈亏（默认10000元初始资金）
    const initialCapital = req.query.initialCapital
      ? parseFloat(req.query.initialCapital as string)
      : 10000;

    // 获取当前价格（用于计算未平仓市值）
    const currentPrice = intradayData.data.length > 0
      ? intradayData.data[intradayData.data.length - 1].price
      : 0;

    const tradingSimulation = calculateTradingSimulation(signals, initialCapital, currentPrice);

    res.json({
      symbol: intradayData.symbol,
      date: intradayData.date,
      data: intradayData.data,
      signals,
      marketStatus,
      tradingSimulation,
    });
  } catch (error) {
    console.error('Error fetching intraday data:', error);
    res.status(500).json({ error: 'Failed to fetch intraday data' });
  }
});

/**
 * GET /api/intraday/signals
 * 获取指定时间周期的交易信号
 */
router.get('/signals', async (req, res) => {
  try {
    const { symbol, market, timeframe } = req.query;

    if (!symbol || !market) {
      return res.status(400).json({ error: 'Missing required parameters: symbol, market' });
    }

    const marketType = market as 'US' | 'HK' | 'CN';
    if (!['US', 'HK', 'CN'].includes(marketType)) {
      return res.status(400).json({ error: 'Invalid market type' });
    }

    // 获取分时数据（作为信号分析的基础）
    const intradayData = await getIntradayData(symbol as string, marketType);

    if (!intradayData || !intradayData.data || intradayData.data.length === 0) {
      return res.json({ signals: [] });
    }

    // 分析买卖信号（港股/A股会过滤卖出信号）
    const signals = analyzeTradingSignals(intradayData.data, marketType);

    // 根据时间周期过滤/调整信号时间格式
    const tf = (timeframe as string) || 'intraday';
    const adjustedSignals = signals.map(s => {
      // 对于日线等长周期，时间格式可能需要调整
      // 但目前信号基于分时数据，时间格式是 HH:mm
      return s;
    });

    res.json({
      signals: adjustedSignals,
      timeframe: tf,
    });
  } catch (error) {
    console.error('Error fetching signals:', error);
    res.status(500).json({ error: 'Failed to fetch signals' });
  }
});

export default router;
