import type {
  PriceDataPoint,
  TechnicalIndicators,
  TradingSignal,
  SignalType,
  MomentumAnalysis,
  KeyPriceLevels,
  SupportResistance,
  CandlestickPattern
} from '../../shared/stock-types';

/**
 * 技术分析引擎
 */
class TechnicalAnalysisService {
  /**
   * 计算移动平均线
   */
  calculateMA(data: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(NaN);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / period);
      }
    }
    return result;
  }

  /**
   * 计算RSI
   */
  calculateRSI(prices: number[], period: number = 14): number[] {
    const rsi: number[] = [];
    const changes: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    for (let i = 0; i < prices.length; i++) {
      if (i < period) {
        rsi.push(NaN);
      } else {
        const recentChanges = changes.slice(i - period, i);
        const gains = recentChanges.filter(c => c > 0);
        const losses = recentChanges.filter(c => c < 0).map(c => Math.abs(c));

        const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0;
        const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0;

        if (avgLoss === 0) {
          rsi.push(100);
        } else {
          const rs = avgGain / avgLoss;
          rsi.push(100 - (100 / (1 + rs)));
        }
      }
    }

    return rsi;
  }

  /**
   * 计算MACD
   */
  calculateMACD(prices: number[]): { macd: number[]; signal: number[]; histogram: number[] } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);

    const macd = ema12.map((val, i) => val - ema26[i]);
    const signal = this.calculateEMA(macd.filter(v => !isNaN(v)), 9);

    // 补齐signal数组长度
    const fullSignal = new Array(macd.length - signal.length).fill(NaN).concat(signal);
    const histogram = macd.map((val, i) => val - fullSignal[i]);

    return { macd, signal: fullSignal, histogram };
  }

  /**
   * 计算EMA (指数移动平均)
   */
  private calculateEMA(data: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        ema.push(NaN);
      } else if (i === period - 1) {
        const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
        ema.push(sum / period);
      } else {
        const value = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
        ema.push(value);
      }
    }

    return ema;
  }

  /**
   * 计算布林带
   */
  calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): {
    upper: number[];
    middle: number[];
    lower: number[];
  } {
    const middle = this.calculateMA(prices, period);
    const upper: number[] = [];
    const lower: number[] = [];

    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        upper.push(NaN);
        lower.push(NaN);
      } else {
        const slice = prices.slice(i - period + 1, i + 1);
        const mean = middle[i];
        const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
        const std = Math.sqrt(variance);

        upper.push(mean + stdDev * std);
        lower.push(mean - stdDev * std);
      }
    }

    return { upper, middle, lower };
  }

  /**
   * 计算KDJ指标
   */
  calculateKDJ(data: PriceDataPoint[], period: number = 9): {
    k: number[];
    d: number[];
    j: number[];
  } {
    const k: number[] = [];
    const d: number[] = [];
    const j: number[] = [];

    let prevK = 50;
    let prevD = 50;

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        k.push(NaN);
        d.push(NaN);
        j.push(NaN);
      } else {
        const slice = data.slice(i - period + 1, i + 1);
        const highest = Math.max(...slice.map(d => d.high));
        const lowest = Math.min(...slice.map(d => d.low));
        const close = data[i].close;

        const rsv = ((close - lowest) / (highest - lowest)) * 100;
        const currentK = (2 / 3) * prevK + (1 / 3) * rsv;
        const currentD = (2 / 3) * prevD + (1 / 3) * currentK;
        const currentJ = 3 * currentK - 2 * currentD;

        k.push(currentK);
        d.push(currentD);
        j.push(currentJ);

        prevK = currentK;
        prevD = currentD;
      }
    }

    return { k, d, j };
  }

  /**
   * 识别支撑位和阻力位
   */
  identifySupportResistance(data: PriceDataPoint[]): SupportResistance {
    const support: number[] = [];
    const resistance: number[] = [];

    // 找局部最低点作为支撑位
    for (let i = 2; i < data.length - 2; i++) {
      const current = data[i].low;
      if (
        current < data[i - 1].low &&
        current < data[i - 2].low &&
        current < data[i + 1].low &&
        current < data[i + 2].low
      ) {
        support.push(current);
      }
    }

    // 找局部最高点作为阻力位
    for (let i = 2; i < data.length - 2; i++) {
      const current = data[i].high;
      if (
        current > data[i - 1].high &&
        current > data[i - 2].high &&
        current > data[i + 1].high &&
        current > data[i + 2].high
      ) {
        resistance.push(current);
      }
    }

    // 取最近的3个支撑位和阻力位
    return {
      support: support.slice(-3).reverse(),
      resistance: resistance.slice(-3).reverse()
    };
  }

  /**
   * 分析动能
   */
  analyzeMomentum(data: (PriceDataPoint & TechnicalIndicators)[]): MomentumAnalysis {
    const recentData = data.slice(-20); // 最近20天
    const latest = data[data.length - 1];

    // 计算上涨天数和下跌天数
    let upDays = 0;
    let downDays = 0;
    let totalUpMove = 0;
    let totalDownMove = 0;

    for (let i = 1; i < recentData.length; i++) {
      const change = recentData[i].close - recentData[i - 1].close;
      if (change > 0) {
        upDays++;
        totalUpMove += change;
      } else if (change < 0) {
        downDays++;
        totalDownMove += Math.abs(change);
      }
    }

    const upwardMomentum = (upDays / recentData.length) * 100;
    const downwardMomentum = (downDays / recentData.length) * 100;

    // 判断趋势
    let trend: MomentumAnalysis['trend'];
    let strength: number;

    if (latest.ma5! > latest.ma20! && latest.ma20! > latest.ma60!) {
      trend = 'STRONG_UPTREND';
      strength = 80 + (upwardMomentum / 5);
    } else if (latest.ma5! > latest.ma20!) {
      trend = 'UPTREND';
      strength = 60 + (upwardMomentum / 5);
    } else if (latest.ma5! < latest.ma20! && latest.ma20! < latest.ma60!) {
      trend = 'STRONG_DOWNTREND';
      strength = 80 + (downwardMomentum / 5);
    } else if (latest.ma5! < latest.ma20!) {
      trend = 'DOWNTREND';
      strength = 60 + (downwardMomentum / 5);
    } else {
      trend = 'SIDEWAYS';
      strength = 40;
    }

    return {
      upwardMomentum: Math.min(100, upwardMomentum),
      downwardMomentum: Math.min(100, downwardMomentum),
      trend,
      strength: Math.min(100, strength)
    };
  }

  /**
   * 生成交易信号
   */
  generateTradingSignal(data: (PriceDataPoint & TechnicalIndicators)[]): TradingSignal {
    const latest = data[data.length - 1];
    // If less than 2 points, we can't do comparison, so use latest as prev or return neutral
    if (data.length < 2) {
      return {
        signal: 'HOLD',
        confidence: 0,
        reasons: ['数据不足，无法生成有效信号'],
        entryPrice: latest.close,
        stopLoss: latest.close * 0.95,
        takeProfit: latest.close * 1.05
      };
    }
    const prev = data[data.length - 2];

    const reasons: string[] = [];
    let bullishScore = 0;
    let bearishScore = 0;

    // RSI分析
    if (latest.rsi! < 30) {
      bullishScore += 2;
      reasons.push('RSI处于超卖区域（<30），可能出现反弹');
    } else if (latest.rsi! > 70) {
      bearishScore += 2;
      reasons.push('RSI处于超买区域（>70），可能出现回调');
    }

    // MACD分析
    if (latest.macd! > latest.macdSignal! && prev.macd! <= prev.macdSignal!) {
      bullishScore += 3;
      reasons.push('MACD金叉，短期趋势转强');
    } else if (latest.macd! < latest.macdSignal! && prev.macd! >= prev.macdSignal!) {
      bearishScore += 3;
      reasons.push('MACD死叉，短期趋势转弱');
    } else if (latest.macd! > latest.macdSignal!) {
      bullishScore += 1;
      reasons.push('MACD处于多头状态');
    } else {
      bearishScore += 1;
      reasons.push('MACD处于空头状态');
    }

    // 均线分析
    if (latest.ma5! > latest.ma10! && latest.ma10! > latest.ma20!) {
      bullishScore += 2;
      reasons.push('均线呈多头排列');
    } else if (latest.ma5! < latest.ma10! && latest.ma10! < latest.ma20!) {
      bearishScore += 2;
      reasons.push('均线呈空头排列');
    }

    // 布林带分析
    if (latest.close < latest.bollingerLower!) {
      bullishScore += 1;
      reasons.push('价格触及布林带下轨，可能反弹');
    } else if (latest.close > latest.bollingerUpper!) {
      bearishScore += 1;
      reasons.push('价格触及布林带上轨，可能回调');
    }

    // 价格趋势
    const priceChange = ((latest.close - data[data.length - 20].close) / data[data.length - 20].close) * 100;
    if (priceChange > 10) {
      bullishScore += 1;
      reasons.push(`近期涨幅${priceChange.toFixed(2)}%，趋势向上`);
    } else if (priceChange < -10) {
      bearishScore += 1;
      reasons.push(`近期跌幅${Math.abs(priceChange).toFixed(2)}%，趋势向下`);
    }

    // 确定信号
    let signal: SignalType;
    let confidence: number;

    const totalScore = bullishScore + bearishScore;
    const bullishRatio = totalScore > 0 ? bullishScore / totalScore : 0.5;

    if (bullishScore > bearishScore + 3) {
      signal = 'STRONG_BUY';
      confidence = Math.min(95, 70 + bullishScore * 5);
    } else if (bullishScore > bearishScore) {
      signal = 'BUY';
      confidence = Math.min(85, 60 + bullishScore * 5);
    } else if (bearishScore > bullishScore + 3) {
      signal = 'STRONG_SELL';
      confidence = Math.min(95, 70 + bearishScore * 5);
    } else if (bearishScore > bullishScore) {
      signal = 'SELL';
      confidence = Math.min(85, 60 + bearishScore * 5);
    } else {
      signal = 'HOLD';
      confidence = 50;
      reasons.push('多空力量均衡，建议观望');
    }

    // 计算入场价、止损和止盈
    const entryPrice = latest.close;
    const atr = this.calculateATR(data.slice(-14));
    const stopLoss = signal.includes('BUY') ? entryPrice - 2 * atr : entryPrice + 2 * atr;
    const takeProfit = signal.includes('BUY') ? entryPrice + 3 * atr : entryPrice - 3 * atr;

    return {
      signal,
      confidence,
      reasons,
      entryPrice,
      stopLoss,
      takeProfit
    };
  }

  /**
   * 计算ATR (平均真实波幅)
   */
  private calculateATR(data: PriceDataPoint[]): number {
    const trueRanges: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevClose = data[i - 1].close;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trueRanges.push(tr);
    }

    return trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
  }

  /**
   * 识别K线形态
   */
  identifyCandlestickPatterns(data: PriceDataPoint[]): CandlestickPattern[] {
    const patterns: CandlestickPattern[] = [];
    const latest = data[data.length - 1];
    if (data.length < 2) return [];
    const prev = data[data.length - 2];

    // 锤子线
    const bodySize = Math.abs(latest.close - latest.open);
    const lowerShadow = Math.min(latest.open, latest.close) - latest.low;
    const upperShadow = latest.high - Math.max(latest.open, latest.close);

    if (lowerShadow > bodySize * 2 && upperShadow < bodySize * 0.5) {
      patterns.push({
        name: '锤子线',
        type: 'BULLISH',
        reliability: 70,
        description: '下影线较长，可能是底部反转信号'
      });
    }

    // 吞没形态
    if (prev.close < prev.open && latest.close > latest.open) {
      if (latest.close > prev.open && latest.open < prev.close) {
        patterns.push({
          name: '看涨吞没',
          type: 'BULLISH',
          reliability: 80,
          description: '阳线完全吞没前一根阴线，强烈的反转信号'
        });
      }
    }

    if (prev.close > prev.open && latest.close < latest.open) {
      if (latest.close < prev.open && latest.open > prev.close) {
        patterns.push({
          name: '看跌吞没',
          type: 'BEARISH',
          reliability: 80,
          description: '阴线完全吞没前一根阳线，强烈的反转信号'
        });
      }
    }

    return patterns;
  }

  /**
   * 计算关键价格点
   */
  calculateKeyPriceLevels(data: PriceDataPoint[]): KeyPriceLevels {
    const prices = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);

    const currentPrice = prices[prices.length - 1];
    const yearHigh = Math.max(...highs);
    const yearLow = Math.min(...lows);

    // 最近30天的高低点
    const recentData = data.slice(-30);
    const recentHigh = Math.max(...recentData.map(d => d.high));
    const recentLow = Math.min(...recentData.map(d => d.low));

    const support = this.identifySupportResistance(data);

    return {
      currentPrice,
      yearHigh,
      yearLow,
      recentHigh,
      recentLow,
      support
    };
  }

  /**
   * 添加技术指标到价格数据
   */
  addTechnicalIndicators(priceData: PriceDataPoint[]): (PriceDataPoint & TechnicalIndicators)[] {
    const closes = priceData.map(d => d.close);

    const ma5 = this.calculateMA(closes, 5);
    const ma10 = this.calculateMA(closes, 10);
    const ma20 = this.calculateMA(closes, 20);
    const ma60 = this.calculateMA(closes, 60);
    const rsi = this.calculateRSI(closes, 14);
    const { macd, signal, histogram } = this.calculateMACD(closes);
    const bollinger = this.calculateBollingerBands(closes, 20, 2);
    const kdj = this.calculateKDJ(priceData, 9);

    return priceData.map((point, i) => ({
      ...point,
      ma5: ma5[i],
      ma10: ma10[i],
      ma20: ma20[i],
      ma60: ma60[i],
      rsi: rsi[i],
      macd: macd[i],
      macdSignal: signal[i],
      macdHist: histogram[i],
      bollingerUpper: bollinger.upper[i],
      bollingerMiddle: bollinger.middle[i],
      bollingerLower: bollinger.lower[i],
      kdj_k: kdj.k[i],
      kdj_d: kdj.d[i],
      kdj_j: kdj.j[i]
    }));
  }
}

export const technicalAnalysisService = new TechnicalAnalysisService();
