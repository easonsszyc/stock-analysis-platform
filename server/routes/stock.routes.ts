import { Router } from 'express';
import { stockDataService } from '../services/stock-data.service';
import { technicalAnalysisService } from '../services/technical-analysis.service';
import { stockComparisonService } from '../services/stock-comparison.service';
import type {
  AnalyzeStockRequest,
  CompareStocksRequest,
  SearchStockRequest,
  StockAnalysis,
  StockComparison,
  ApiResponse
} from '../../shared/stock-types';

const router = Router();

/**
 * 搜索股票
 */
router.get('/search', async (req, res) => {
  try {
    const { query, market, limit } = req.query as any;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: '请提供搜索关键词'
      } as ApiResponse<null>);
    }

    const results = await stockDataService.searchStock(query, market);

    res.json({
      success: true,
      data: results.slice(0, limit ? parseInt(limit) : 10)
    } as ApiResponse<typeof results>);
  } catch (error: any) {
    console.error('Search stock error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '搜索失败'
    } as ApiResponse<null>);
  }
});

/**
 * 分析单个股票
 */
router.post('/analyze', async (req, res) => {
  try {
    const { symbol, market, period = '1y' } = req.body as AnalyzeStockRequest;

    if (!symbol || !market) {
      return res.status(400).json({
        success: false,
        error: '请提供股票代码和市场类型'
      } as ApiResponse<null>);
    }

    // 获取股票数据
    const { stockInfo, priceData } = await stockDataService.getStockData(symbol, market, period);

    if (priceData.length < 60) {
      return res.status(400).json({
        success: false,
        error: '数据不足，无法进行技术分析'
      } as ApiResponse<null>);
    }

    // 添加技术指标
    const dataWithIndicators = technicalAnalysisService.addTechnicalIndicators(priceData);

    // 生成交易信号
    const tradingSignal = technicalAnalysisService.generateTradingSignal(dataWithIndicators);

    // 分析动能
    const momentum = technicalAnalysisService.analyzeMomentum(dataWithIndicators);

    // 计算关键价格点
    const keyLevels = technicalAnalysisService.calculateKeyPriceLevels(priceData);

    // 识别K线形态
    const patterns = technicalAnalysisService.identifyCandlestickPatterns(priceData.slice(-10));

    // 成交量分析
    const volumes = priceData.map(d => d.volume);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const recentVolumes = volumes.slice(-10);
    const recentAvgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;

    let volumeTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
    if (recentAvgVolume > avgVolume * 1.2) {
      volumeTrend = 'INCREASING';
    } else if (recentAvgVolume < avgVolume * 0.8) {
      volumeTrend = 'DECREASING';
    } else {
      volumeTrend = 'STABLE';
    }

    const volumeStrength = Math.min(100, (recentAvgVolume / avgVolume) * 50);

    // 生成投资建议
    let action: 'BUY' | 'SELL' | 'HOLD';
    let reasoning: string;

    if (tradingSignal.signal === 'STRONG_BUY' || tradingSignal.signal === 'BUY') {
      action = 'BUY';
      reasoning = `基于技术分析，当前${tradingSignal.reasons.join('；')}。建议在${tradingSignal.entryPrice?.toFixed(2)}附近买入，止损设在${tradingSignal.stopLoss?.toFixed(2)}，目标价位${tradingSignal.takeProfit?.toFixed(2)}。`;
    } else if (tradingSignal.signal === 'STRONG_SELL' || tradingSignal.signal === 'SELL') {
      action = 'SELL';
      reasoning = `基于技术分析，当前${tradingSignal.reasons.join('；')}。建议在${tradingSignal.entryPrice?.toFixed(2)}附近卖出或做空，止损设在${tradingSignal.stopLoss?.toFixed(2)}，目标价位${tradingSignal.takeProfit?.toFixed(2)}。`;
    } else {
      action = 'HOLD';
      reasoning = `当前市场信号不明确，${tradingSignal.reasons.join('；')}。建议观望等待更明确的交易机会。`;
    }

    const analysis: StockAnalysis = {
      stockInfo,
      priceData: dataWithIndicators,
      tradingSignal,
      momentum,
      keyLevels,
      patterns,
      volumeAnalysis: {
        averageVolume: avgVolume,
        volumeTrend,
        volumeStrength
      },
      recommendation: {
        action,
        targetPrice: tradingSignal.takeProfit,
        stopLoss: tradingSignal.stopLoss,
        timeframe: '短期（1-4周）',
        reasoning
      }
    };

    res.json({
      success: true,
      data: analysis
    } as ApiResponse<StockAnalysis>);
  } catch (error: any) {
    console.error('Analyze stock error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '分析失败'
    } as ApiResponse<null>);
  }
});

/**
 * 对比多个股票
 */
router.post('/compare', async (req, res) => {
  try {
    const { symbols, market, period = '1y' } = req.body as CompareStocksRequest;

    if (!symbols || symbols.length < 2) {
      return res.status(400).json({
        success: false,
        error: '请提供至少2个股票代码'
      } as ApiResponse<null>);
    }

    if (symbols.length > 5) {
      return res.status(400).json({
        success: false,
        error: '最多只能对比5个股票'
      } as ApiResponse<null>);
    }

    // 使用对比服务
    const comparison = await stockComparisonService.compareStocks(symbols, market, period);

    // 为每个股票添加技术指标
    const priceDataWithIndicators: { [symbol: string]: any[] } = {};
    for (const symbol of Object.keys(comparison.priceData)) {
      priceDataWithIndicators[symbol] = technicalAnalysisService.addTechnicalIndicators(
        comparison.priceData[symbol]
      );
    }

    const result: StockComparison = {
      ...comparison,
      priceData: priceDataWithIndicators
    };

    res.json({
      success: true,
      data: result
    } as ApiResponse<StockComparison>);
  } catch (error: any) {
    console.error('Compare stocks error:', error);
    res.status(500).json({
      success: false,
      error: error.message || '对比失败'
    } as ApiResponse<null>);
  }
});

export default router;
