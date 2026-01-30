import { Router } from 'express';
import { stockDataService } from '../services/stock-data.service';
import { technicalAnalysisService } from '../services/technical-analysis.service';
import { stockComparisonService } from '../services/stock-comparison.service';
import { stockSearchService } from '../services/stock-search.service';
import { tradingStrategyService, StrategyRecommendation } from '../services/trading-strategy.service';
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
 * 将策略推荐数据转换为前端期望的中文字段格式
 */
function transformStrategyForFrontend(strategy: StrategyRecommendation) {
  // 计算推荐指数（基于适配度和推荐等级）
  let recommendationScore = strategy.suitabilityScore;
  if (strategy.recommendation === 'highly_suitable') {
    recommendationScore = Math.min(100, recommendationScore + 10);
  } else if (strategy.recommendation === 'not_suitable') {
    recommendationScore = Math.max(0, recommendationScore - 20);
  }

  // 格式化入场建议
  const entryAdvice = strategy.entryPoints.length > 0
    ? strategy.entryPoints.map(ep => `在${ep.price.toFixed(2)}附近${ep.reason}（置信度：${ep.confidence === 'high' ? '高' : ep.confidence === 'medium' ? '中' : '低'}）`).join('；')
    : '等待合适的入场时机';

  // 格式化出场建议
  const takeProfitPoints = strategy.exitPoints.filter(ep => ep.type === 'take_profit');
  const exitAdvice = takeProfitPoints.length > 0
    ? takeProfitPoints.map(ep => `目标价位${ep.price.toFixed(2)}，${ep.reason}`).join('；')
    : '根据市场情况灵活调整';

  // 格式化止损建议
  const stopLossPoints = strategy.exitPoints.filter(ep => ep.type === 'stop_loss');
  const stopLossAdvice = stopLossPoints.length > 0
    ? stopLossPoints.map(ep => `止损价位${ep.price.toFixed(2)}，${ep.reason}`).join('；')
    : '建议设置合理止损';

  // 转换风险等级为大写
  const riskLevel = strategy.riskLevel.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH';

  return {
    适配度: strategy.suitabilityScore,
    推荐指数: recommendationScore,
    风险等级: riskLevel,
    入场建议: entryAdvice,
    出场建议: exitAdvice,
    止损建议: stopLossAdvice,
    预期收益: strategy.expectedReturn,
    持仓时长: strategy.holdingPeriod,
    操作要点: strategy.operationSuggestions,
    风险提示: strategy.keyFactors
  };
}

/**
 * 智能搜索股票 - 自动识别市场
 */
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query as any;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: '请提供搜索关键词'
      } as ApiResponse<null>);
    }

    const results = await stockSearchService.searchStock(query);

    res.json({
      success: true,
      data: results
    } as ApiResponse<typeof results>);
  } catch (error: any) {
    console.error('Search stock error:', error);
    
    // 检测API配额耗尽错误
    if (error.message === 'API_QUOTA_EXHAUSTED') {
      return res.status(503).json({
        success: false,
        error: '数据服务暂时不可用，请稍后再试。如果问题持续，请联系Manus支持团队。'
      } as ApiResponse<null>);
    }
    
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
    
    // 生成交易策略推荐
    const scalpingStrategy = tradingStrategyService.evaluateScalpingStrategy(analysis);
    const swingStrategy = tradingStrategyService.evaluateSwingStrategy(analysis);

    // 转换为前端期望的格式
    const transformedScalping = transformStrategyForFrontend(scalpingStrategy);
    const transformedSwing = transformStrategyForFrontend(swingStrategy);

    res.json({
      success: true,
      data: {
        ...analysis,
        tradingStrategies: {
          scalping: transformedScalping,
          swing: transformedSwing
        }
      }
    } as ApiResponse<any>);
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
