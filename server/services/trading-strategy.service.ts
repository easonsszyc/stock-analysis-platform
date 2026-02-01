import { StockAnalysis, TechnicalIndicators } from '../../shared/stock-types';

/**
 * 交易策略类型
 */
export type StrategyType = 'scalping' | 'swing';

/**
 * 策略评估结果
 */
export interface StrategyRecommendation {
  strategyType: StrategyType;
  strategyName: string;
  suitabilityScore: number; // 0-100的适配度评分
  recommendation: 'highly_suitable' | 'suitable' | 'moderate' | 'not_suitable';
  entryPoints: {
    price: number;
    reason: string;
    confidence: 'high' | 'medium' | 'low';
  }[];
  exitPoints: {
    price: number;
    type: 'take_profit' | 'stop_loss';
    reason: string;
  }[];
  holdingPeriod: string; // 建议持仓时间
  expectedReturn: string; // 预期收益率
  riskLevel: 'low' | 'medium' | 'high';
  keyFactors: string[]; // 关键因素
  operationSuggestions: string[]; // 操作建议
}

/**
 * 交易策略评估服务
 */
export class TradingStrategyService {
  /**
   * 评估剥头皮策略适配度
   */
  evaluateScalpingStrategy(analysis: StockAnalysis): StrategyRecommendation {
    const { priceData, stockInfo } = analysis;
    const currentPrice = stockInfo.currentPrice || 0;

    // 从 priceData 中获取最新的技术指标
    const latestData = priceData[priceData.length - 1] || {};
    const technicalIndicators: TechnicalIndicators = {
      ma5: latestData.ma5 || undefined,
      ma10: latestData.ma10 || undefined,
      ma20: latestData.ma20 || undefined,
      ma60: latestData.ma60 || undefined,
      rsi: latestData.rsi || undefined,
      macd: latestData.macd || undefined,
      macdSignal: latestData.macdSignal || undefined,
      macdHist: latestData.macdHist || undefined,
      bollingerUpper: latestData.bollingerUpper || undefined,
      bollingerMiddle: latestData.bollingerMiddle || undefined,
      bollingerLower: latestData.bollingerLower || undefined,
      kdj_k: latestData.kdj_k || undefined,
      kdj_d: latestData.kdj_d || undefined,
      kdj_j: latestData.kdj_j || undefined,
    };

    // 计算日内波动率
    const intradayVolatility = this.calculateIntradayVolatility(priceData);

    // 计算流动性得分（基于成交量）
    const liquidityScore = this.calculateLiquidityScore(priceData);

    // 计算震荡程度（基于布林带宽度）
    const oscillationScore = this.calculateOscillationScore(technicalIndicators, priceData);

    // 综合适配度评分
    const suitabilityScore = Math.round(
      liquidityScore * 0.4 +
      oscillationScore * 0.35 +
      (100 - intradayVolatility * 10) * 0.25
    );

    // 确定推荐等级
    let recommendation: StrategyRecommendation['recommendation'];
    if (suitabilityScore >= 80) recommendation = 'highly_suitable';
    else if (suitabilityScore >= 65) recommendation = 'suitable';
    else if (suitabilityScore >= 50) recommendation = 'moderate';
    else recommendation = 'not_suitable';

    // 生成入场点位
    const entryPoints = this.generateScalpingEntryPoints(
      currentPrice,
      technicalIndicators,
      suitabilityScore
    );

    // 生成出场点位（剥头皮通常目标0.5%-1%）
    const exitPoints = this.generateScalpingExitPoints(currentPrice);

    // 关键因素分析
    const keyFactors = this.analyzeScalpingFactors(
      liquidityScore,
      oscillationScore,
      intradayVolatility
    );

    // 操作建议
    const operationSuggestions = this.generateScalpingOperationSuggestions(
      suitabilityScore,
      technicalIndicators
    );

    return {
      strategyType: 'scalping',
      strategyName: '剥头皮策略',
      suitabilityScore,
      recommendation,
      entryPoints,
      exitPoints,
      holdingPeriod: '5-30分钟',
      expectedReturn: '0.5%-1.5%',
      riskLevel: liquidityScore > 70 ? 'low' : 'medium',
      keyFactors,
      operationSuggestions,
    };
  }

  /**
   * 评估波段交易策略适配度
   */
  evaluateSwingStrategy(analysis: StockAnalysis): StrategyRecommendation {
    const { priceData, tradingSignal, keyLevels, stockInfo } = analysis;
    const currentPrice = stockInfo.currentPrice || 0;

    // 从 priceData 中获取最新的技术指标
    const latestData = priceData[priceData.length - 1] || {};
    const technicalIndicators: TechnicalIndicators = {
      ma5: latestData.ma5 || undefined,
      ma10: latestData.ma10 || undefined,
      ma20: latestData.ma20 || undefined,
      ma60: latestData.ma60 || undefined,
      rsi: latestData.rsi || undefined,
      macd: latestData.macd || undefined,
      macdSignal: latestData.macdSignal || undefined,
      macdHist: latestData.macdHist || undefined,
      bollingerUpper: latestData.bollingerUpper || undefined,
      bollingerMiddle: latestData.bollingerMiddle || undefined,
      bollingerLower: latestData.bollingerLower || undefined,
      kdj_k: latestData.kdj_k || undefined,
      kdj_d: latestData.kdj_d || undefined,
      kdj_j: latestData.kdj_j || undefined,
    };

    // 构造 signals 对象
    const signals = {
      signal: tradingSignal.signal.toLowerCase(),
      supportLevels: keyLevels.support.support,
      resistanceLevels: keyLevels.support.resistance,
      targetPrice: tradingSignal.takeProfit,
      stopLossPrice: tradingSignal.stopLoss,
    };

    // 计算趋势强度
    const trendStrength = this.calculateTrendStrength(technicalIndicators);

    // 计算波动幅度
    const volatilityScore = this.calculateVolatilityScore(priceData);

    // 计算支撑阻力清晰度
    const supportResistanceClarity = this.calculateSupportResistanceClarity(
      signals.supportLevels,
      signals.resistanceLevels,
      currentPrice
    );

    // 综合适配度评分
    const suitabilityScore = Math.round(
      trendStrength * 0.4 +
      volatilityScore * 0.35 +
      supportResistanceClarity * 0.25
    );

    // 确定推荐等级
    let recommendation: StrategyRecommendation['recommendation'];
    if (suitabilityScore >= 75) recommendation = 'highly_suitable';
    else if (suitabilityScore >= 60) recommendation = 'suitable';
    else if (suitabilityScore >= 45) recommendation = 'moderate';
    else recommendation = 'not_suitable';

    // 生成入场点位
    const entryPoints = this.generateSwingEntryPoints(
      currentPrice,
      technicalIndicators,
      signals,
      suitabilityScore
    );

    // 生成出场点位（波段交易通常目标5%-15%）
    const exitPoints = this.generateSwingExitPoints(
      currentPrice,
      signals,
      technicalIndicators
    );

    // 关键因素分析
    const keyFactors = this.analyzeSwingFactors(
      trendStrength,
      volatilityScore,
      supportResistanceClarity,
      signals
    );

    // 操作建议
    const operationSuggestions = this.generateSwingOperationSuggestions(
      suitabilityScore,
      signals,
      technicalIndicators
    );

    return {
      strategyType: 'swing',
      strategyName: '波段交易策略',
      suitabilityScore,
      recommendation,
      entryPoints,
      exitPoints,
      holdingPeriod: '3-10个交易日',
      expectedReturn: '5%-15%',
      riskLevel: volatilityScore > 70 ? 'high' : 'medium',
      keyFactors,
      operationSuggestions,
    };
  }

  /**
   * 计算日内波动率
   */
  private calculateIntradayVolatility(priceData: any[]): number {
    const recentData = priceData.slice(-20); // 最近20个交易日
    let totalVolatility = 0;

    for (const data of recentData) {
      if (data.high && data.low && data.close) {
        const dayVolatility = ((data.high - data.low) / data.close) * 100;
        totalVolatility += dayVolatility;
      }
    }

    return totalVolatility / recentData.length;
  }

  /**
   * 计算流动性得分
   */
  private calculateLiquidityScore(priceData: any[]): number {
    const recentData = priceData.slice(-20);
    const avgVolume = recentData.reduce((sum, d) => sum + (d.volume || 0), 0) / recentData.length;

    // 假设日均成交量超过100万为高流动性
    const liquidityScore = Math.min((avgVolume / 1000000) * 20, 100);
    return liquidityScore;
  }

  /**
   * 计算震荡程度
   */
  private calculateOscillationScore(indicators: TechnicalIndicators, priceData: any[]): number {
    const { bollingerUpper, bollingerMiddle, bollingerLower, rsi } = indicators;

    if (!bollingerUpper || !bollingerMiddle || !bollingerLower) return 50;

    // 布林带宽度百分比
    const bandwidth = ((bollingerUpper - bollingerLower) / bollingerMiddle) * 100;

    // RSI在30-70之间表示震荡
    const rsiOscillation = rsi && rsi >= 30 && rsi <= 70 ? 80 : 50;

    // 窄幅震荡更适合剥头皮
    const bandwidthScore = bandwidth < 5 ? 90 : bandwidth < 10 ? 70 : 50;

    return (rsiOscillation + bandwidthScore) / 2;
  }

  /**
   * 生成剥头皮入场点位
   */
  private generateScalpingEntryPoints(
    currentPrice: number,
    indicators: TechnicalIndicators,
    suitabilityScore: number
  ): StrategyRecommendation['entryPoints'] {
    const entryPoints: StrategyRecommendation['entryPoints'] = [];

    // 当前价格附近的快速入场
    if (suitabilityScore >= 70) {
      entryPoints.push({
        price: currentPrice,
        reason: 'RSI处于中性区域，适合快速进场',
        confidence: 'high',
      });
    }

    // 基于MA5的入场点
    if (indicators.ma5) {
      const ma5Entry = indicators.ma5;
      if (Math.abs(currentPrice - ma5Entry) / currentPrice < 0.01) {
        entryPoints.push({
          price: ma5Entry,
          reason: '价格接近5日均线，短期支撑位',
          confidence: 'medium',
        });
      }
    }

    return entryPoints;
  }

  /**
   * 生成剥头皮出场点位
   */
  private generateScalpingExitPoints(currentPrice: number): StrategyRecommendation['exitPoints'] {
    return [
      {
        price: Number((currentPrice * 1.008).toFixed(2)),
        type: 'take_profit',
        reason: '目标止盈0.8%，快速锁定利润',
      },
      {
        price: Number((currentPrice * 0.995).toFixed(2)),
        type: 'stop_loss',
        reason: '止损0.5%，严格控制风险',
      },
    ];
  }

  /**
   * 分析剥头皮关键因素
   */
  private analyzeScalpingFactors(
    liquidityScore: number,
    oscillationScore: number,
    intradayVolatility: number
  ): string[] {
    const factors: string[] = [];

    if (liquidityScore > 70) {
      factors.push('流动性充足，适合快速进出');
    } else {
      factors.push('流动性一般，需注意滑点风险');
    }

    if (oscillationScore > 70) {
      factors.push('价格窄幅震荡，适合高频交易');
    } else {
      factors.push('价格波动较大，需谨慎操作');
    }

    if (intradayVolatility < 2) {
      factors.push('日内波动较小，风险可控');
    } else {
      factors.push('日内波动较大，需快速决策');
    }

    return factors;
  }

  /**
   * 生成剥头皮操作建议
   */
  private generateScalpingOperationSuggestions(
    suitabilityScore: number,
    indicators: TechnicalIndicators
  ): string[] {
    const suggestions: string[] = [];

    if (suitabilityScore >= 75) {
      suggestions.push('适合剥头皮策略，建议使用限价单快速进出');
      suggestions.push('设置严格的止损止盈，目标0.5%-1%收益');
      suggestions.push('关注分钟级K线，捕捉短期价格波动');
    } else if (suitabilityScore >= 55) {
      suggestions.push('可尝试剥头皮，但需降低仓位');
      suggestions.push('选择流动性高的时段操作（开盘后30分钟和收盘前30分钟）');
    } else {
      suggestions.push('当前不太适合剥头皮策略');
      suggestions.push('建议等待更好的市场环境或考虑其他策略');
    }

    if (indicators.rsi && indicators.rsi < 40) {
      suggestions.push('RSI偏低，可考虑逢低买入');
    } else if (indicators.rsi && indicators.rsi > 60) {
      suggestions.push('RSI偏高，谨慎追高');
    }

    return suggestions;
  }

  /**
   * 计算趋势强度
   */
  private calculateTrendStrength(indicators: TechnicalIndicators): number {
    const { macd, ma10, ma20, ma60 } = indicators;

    let trendScore = 50;

    // MACD趋势判断
    if (macd && typeof macd === 'number') {
      // macd是单个数值，简化判断
      if (macd > 0) {
        trendScore += 20;
      } else if (macd < 0) {
        trendScore += 10; // 下跌趋势也是趋势
      }
    }

    // 均线排列判断
    if (ma10 && ma20 && ma60) {
      if (ma10 > ma20 && ma20 > ma60) {
        trendScore += 20; // 多头排列
      } else if (ma10 < ma20 && ma20 < ma60) {
        trendScore += 15; // 空头排列
      }
    }

    return Math.min(trendScore, 100);
  }

  /**
   * 计算波动幅度得分
   */
  private calculateVolatilityScore(priceData: any[]): number {
    const recentData = priceData.slice(-20);
    let totalVolatility = 0;

    for (const data of recentData) {
      if (data.high && data.low && data.close) {
        const dayVolatility = ((data.high - data.low) / data.close) * 100;
        totalVolatility += dayVolatility;
      }
    }

    const avgVolatility = totalVolatility / recentData.length;

    // 波段交易适合中等波动（3%-8%）
    if (avgVolatility >= 3 && avgVolatility <= 8) {
      return 90;
    } else if (avgVolatility >= 2 && avgVolatility <= 10) {
      return 70;
    } else {
      return 50;
    }
  }

  /**
   * 计算支撑阻力清晰度
   */
  private calculateSupportResistanceClarity(
    supportLevels: number[],
    resistanceLevels: number[],
    currentPrice: number
  ): number {
    if (supportLevels.length === 0 || resistanceLevels.length === 0) {
      return 50;
    }

    // 找到最近的支撑和阻力
    const nearestSupport = supportLevels.reduce((prev, curr) =>
      Math.abs(curr - currentPrice) < Math.abs(prev - currentPrice) ? curr : prev
    );

    const nearestResistance = resistanceLevels.reduce((prev, curr) =>
      Math.abs(curr - currentPrice) < Math.abs(prev - currentPrice) ? curr : prev
    );

    // 计算支撑阻力之间的空间
    const space = ((nearestResistance - nearestSupport) / currentPrice) * 100;

    // 空间在5%-15%之间最适合波段交易
    if (space >= 5 && space <= 15) {
      return 90;
    } else if (space >= 3 && space <= 20) {
      return 70;
    } else {
      return 50;
    }
  }

  /**
   * 生成波段交易入场点位
   */
  private generateSwingEntryPoints(
    currentPrice: number,
    indicators: TechnicalIndicators,
    signals: any,
    suitabilityScore: number
  ): StrategyRecommendation['entryPoints'] {
    const entryPoints: StrategyRecommendation['entryPoints'] = [];

    // 基于支撑位的入场点
    if (signals.supportLevels && signals.supportLevels.length > 0) {
      const nearestSupport = signals.supportLevels[0];
      entryPoints.push({
        price: nearestSupport,
        reason: '关键支撑位，回调买入机会',
        confidence: suitabilityScore >= 70 ? 'high' : 'medium',
      });
    }

    // 基于MA20的入场点
    if (indicators.ma20) {
      entryPoints.push({
        price: indicators.ma20,
        reason: '20日均线支撑，中期趋势参考',
        confidence: 'medium',
      });
    }

    // 基于布林带下轨的入场点
    if (indicators.bollingerLower) {
      entryPoints.push({
        price: indicators.bollingerLower,
        reason: '布林带下轨，超卖反弹机会',
        confidence: indicators.rsi && indicators.rsi < 35 ? 'high' : 'medium',
      });
    }

    return entryPoints;
  }

  /**
   * 生成波段交易出场点位
   */
  private generateSwingExitPoints(
    currentPrice: number,
    signals: any,
    indicators: TechnicalIndicators
  ): StrategyRecommendation['exitPoints'] {
    const exitPoints: StrategyRecommendation['exitPoints'] = [];

    // 基于阻力位的止盈点
    if (signals.resistanceLevels && signals.resistanceLevels.length > 0) {
      const nearestResistance = signals.resistanceLevels[0];
      exitPoints.push({
        price: nearestResistance,
        type: 'take_profit',
        reason: '关键阻力位，波段止盈目标',
      });
    }

    // 基于目标价的止盈点
    if (signals.targetPrice) {
      exitPoints.push({
        price: signals.targetPrice,
        type: 'take_profit',
        reason: '技术分析目标价位',
      });
    }

    // 基于支撑位的止损点
    if (signals.supportLevels && signals.supportLevels.length > 0) {
      const nearestSupport = signals.supportLevels[0];
      exitPoints.push({
        price: Number((nearestSupport * 0.98).toFixed(2)),
        type: 'stop_loss',
        reason: '跌破支撑位止损，控制风险',
      });
    }

    // 基于止损价的止损点
    if (signals.stopLossPrice) {
      exitPoints.push({
        price: signals.stopLossPrice,
        type: 'stop_loss',
        reason: '技术分析止损价位',
      });
    }

    return exitPoints;
  }

  /**
   * 分析波段交易关键因素
   */
  private analyzeSwingFactors(
    trendStrength: number,
    volatilityScore: number,
    supportResistanceClarity: number,
    signals: any
  ): string[] {
    const factors: string[] = [];

    if (trendStrength > 70) {
      factors.push('趋势明确，适合顺势波段操作');
    } else {
      factors.push('趋势不明朗，需谨慎判断方向');
    }

    if (volatilityScore > 70) {
      factors.push('波动幅度适中，有足够的利润空间');
    } else {
      factors.push('波动较小，可能影响收益空间');
    }

    if (supportResistanceClarity > 70) {
      factors.push('支撑阻力位清晰，便于设置止盈止损');
    } else {
      factors.push('支撑阻力位不明显，需结合其他指标');
    }

    if (signals.signal === 'strong_buy' || signals.signal === 'buy') {
      factors.push('技术信号偏多，可考虑做多波段');
    } else if (signals.signal === 'strong_sell' || signals.signal === 'sell') {
      factors.push('技术信号偏空，谨慎做多');
    }

    return factors;
  }

  /**
   * 生成波段交易操作建议
   */
  private generateSwingOperationSuggestions(
    suitabilityScore: number,
    signals: any,
    indicators: TechnicalIndicators
  ): string[] {
    const suggestions: string[] = [];

    if (suitabilityScore >= 70) {
      suggestions.push('适合波段交易，建议在支撑位附近分批建仓');
      suggestions.push('设置合理的止盈止损，目标收益5%-15%');
      suggestions.push('持仓周期3-10个交易日，关注日K线形态');
    } else if (suitabilityScore >= 50) {
      suggestions.push('可尝试波段交易，但需降低仓位和预期收益');
      suggestions.push('严格执行止损纪律，避免深度套牢');
    } else {
      suggestions.push('当前不太适合波段交易');
      suggestions.push('建议等待趋势更加明确或考虑其他策略');
    }

    if (signals.signal === 'strong_buy') {
      suggestions.push('强烈买入信号，可适当加大仓位');
    } else if (signals.signal === 'buy') {
      suggestions.push('买入信号，建议轻仓试探');
    } else if (signals.signal === 'sell' || signals.signal === 'strong_sell') {
      suggestions.push('卖出信号，不建议做多，可考虑观望');
    }

    if (indicators.macd && indicators.macdHist) {
      if (indicators.macdHist > 0) {
        suggestions.push('MACD金叉，短期趋势向好');
      } else if (indicators.macdHist < 0) {
        suggestions.push('MACD死叉，短期趋势偏弱');
      }
    }

    return suggestions;
  }
}

export const tradingStrategyService = new TradingStrategyService();
