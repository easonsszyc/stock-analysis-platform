/**
 * 买卖信号分析服务
 * 基于技术指标生成买卖信号
 */

import { PriceData, calculateRSI, calculateMACD, calculateBollingerBands, findSupportResistance } from './technical-indicators.service';

export interface TradingSignal {
  time: string;
  type: 'buy' | 'sell' | 'hold';
  price: number;
  strength: number; // 0-100，信号强度
  confidence: number; // 0-100，置信度
  reasons: string[]; // 信号原因
  stopLoss?: number; // 止损价
  target?: number; // 目标价
  tradeId?: number; // 配对交易ID，用于关联买卖信号
  indicators?: {
    rsi?: number;
    macd?: number;
    macdSignal?: number;
    macdHistogram?: number;
    kdj?: { k: number; d: number; j: number };
    bollingerBands?: { upper: number; middle: number; lower: number };
  };
  resonance?: {
    level: number; // 0-3，共振级别（几个周期同时出现信号）
    timeframes: string[]; // 共振的时间周期
  };
}

/**
 * 分析买卖信号
 * @param data 价格数据
 * @param market 市场类型 - 港股/A股不能做空，会过滤卖出信号
 */
export function analyzeTradingSignals(data: PriceData[], market?: 'US' | 'HK' | 'CN'): TradingSignal[] {
  if (data.length < 30) {
    return [];
  }

  const signals: TradingSignal[] = [];

  // 计算技术指标
  const rsi = calculateRSI(data, 14);
  const macd = calculateMACD(data);
  const bb = calculateBollingerBands(data, 20, 2);
  const { support, resistance } = findSupportResistance(data, 5);

  // 遍历每个数据点，分析信号
  for (let i = 20; i < data.length; i++) {
    const currentPrice = data[i].price;
    const prevPrice = data[i - 1]?.price || currentPrice;
    const reasons: string[] = [];
    let signalType: 'buy' | 'sell' | 'hold' = 'hold';
    let strength = 0;

    // 1. RSI信号
    if (rsi[i] < 30) {
      reasons.push(`RSI超卖（${rsi[i].toFixed(1)}）`);
      strength += 25;
      signalType = 'buy';
    } else if (rsi[i] > 70) {
      reasons.push(`RSI超买（${rsi[i].toFixed(1)}）`);
      strength += 25;
      signalType = 'sell';
    }

    // 2. MACD信号
    const macdCross = macd.histogram[i] > 0 && macd.histogram[i - 1] <= 0;
    const macdCrossDown = macd.histogram[i] < 0 && macd.histogram[i - 1] >= 0;

    if (macdCross) {
      reasons.push('MACD金叉');
      strength += 30;
      if (signalType !== 'sell') signalType = 'buy';
    } else if (macdCrossDown) {
      reasons.push('MACD死叉');
      strength += 30;
      if (signalType !== 'buy') signalType = 'sell';
    }

    // 3. 布林带信号
    if (currentPrice < bb.lower[i] && prevPrice >= bb.lower[i]) {
      reasons.push('跌破布林带下轨');
      strength += 20;
      if (signalType !== 'sell') signalType = 'buy';
    } else if (currentPrice > bb.upper[i] && prevPrice <= bb.upper[i]) {
      reasons.push('突破布林带上轨');
      strength += 20;
      if (signalType !== 'buy') signalType = 'sell';
    }

    // 4. 支撑压力位信号
    const nearSupport = support.some(s => Math.abs(currentPrice - s) / s < 0.005);
    const nearResistance = resistance.some(r => Math.abs(currentPrice - r) / r < 0.005);

    if (nearSupport && currentPrice > prevPrice) {
      reasons.push('触及支撑位反弹');
      strength += 25;
      if (signalType !== 'sell') signalType = 'buy';
    } else if (nearResistance && currentPrice < prevPrice) {
      reasons.push('触及压力位回落');
      strength += 25;
      if (signalType !== 'buy') signalType = 'sell';
    }

    // 5. 成交量信号
    if (i >= 5) {
      const avgVolume = data.slice(i - 5, i).reduce((sum, d) => sum + d.volume, 0) / 5;
      const volumeRatio = data[i].volume / avgVolume;

      if (volumeRatio > 2 && currentPrice > prevPrice) {
        reasons.push(`成交量放大${volumeRatio.toFixed(1)}倍`);
        strength += 15;
        if (signalType !== 'sell') signalType = 'buy';
      } else if (volumeRatio > 2 && currentPrice < prevPrice) {
        reasons.push(`成交量放大${volumeRatio.toFixed(1)}倍`);
        strength += 15;
        if (signalType !== 'buy') signalType = 'sell';
      }
    }

    // 计算置信度（基于多个因素）
    let confidence = 0;
    if (reasons.length >= 3) confidence += 30;
    else if (reasons.length >= 2) confidence += 20;
    if (strength >= 70) confidence += 30;
    else if (strength >= 50) confidence += 20;
    else if (strength >= 40) confidence += 10;

    // RSI极端值增加置信度
    if (rsi[i] < 20 || rsi[i] > 80) confidence += 20;
    else if (rsi[i] < 30 || rsi[i] > 70) confidence += 10;

    // MACD和价格趋势一致增加置信度
    if (macdCross && currentPrice > prevPrice) confidence += 20;
    if (macdCrossDown && currentPrice < prevPrice) confidence += 20;

    // 只记录有明确信号的点位（降低阈值，确保分时图也能生成信号）
    if (reasons.length >= 1 && strength >= 30) {
      // 止损和目标价先不计算，后面根据市场类型重新计算
      signals.push({
        time: data[i].time,
        type: signalType,
        price: currentPrice,
        strength: Math.min(strength, 100),
        confidence: Math.min(confidence, 100),
        reasons,
        indicators: {
          rsi: rsi[i],
          macd: macd.macd[i],
          macdSignal: macd.signal[i],
          macdHistogram: macd.histogram[i],
          bollingerBands: {
            upper: bb.upper[i],
            middle: bb.middle[i],
            lower: bb.lower[i],
          },
        },
      });
    }
  }

  // 根据市场类型处理信号
  // 获取当前价格（最后一个数据点）
  const currentPrice = data.length > 0 ? data[data.length - 1].price : undefined;

  if (market === 'HK' || market === 'CN') {
    // 港股/A股：只做多，生成买卖配对交易
    return generateLongOnlyTrades(signals, currentPrice);
  } else {
    // 美股：可以做空，保留所有信号并设置各自的止损止盈
    return signals.map(s => ({
      ...s,
      stopLoss: s.type === 'buy'
        ? s.price * 0.98  // 做多止损：跌2%
        : s.price * 1.02, // 做空止损：涨2%
      target: s.type === 'buy'
        ? s.price * 1.03  // 做多目标：涨3%
        : s.price * 0.97, // 做空目标：跌3%
    }));
  }
}

/**
 * 生成做多配对交易（港股/A股）
 * 买入信号后必须有对应的卖出信号（平仓）
 * 返回信号列表，未完成的持仓会添加特殊标记
 */
function generateLongOnlyTrades(rawSignals: TradingSignal[], currentPrice?: number): TradingSignal[] {
  const result: TradingSignal[] = [];
  let openPosition: TradingSignal | null = null;
  let tradeId = 1;

  for (const signal of rawSignals) {
    if (signal.type === 'buy' && !openPosition) {
      // 开仓：买入建仓
      openPosition = {
        ...signal,
        tradeId: tradeId,
        stopLoss: signal.price * 0.97,  // 止损：跌3%
        target: signal.price * 1.05,    // 目标：涨5%
      };
      result.push(openPosition);
    } else if (signal.type === 'sell' && openPosition) {
      // 平仓：卖出已持有的股票
      const buyPrice = openPosition.price;
      const profitPercent = ((signal.price - buyPrice) / buyPrice) * 100;

      result.push({
        ...signal,
        tradeId: tradeId,
        // 平仓信号的止损止盈是相对于买入价计算的
        stopLoss: buyPrice * 0.97,     // 跌破买入价3%强制止损
        target: buyPrice * 1.05,       // 高于买入价5%为目标
        reasons: [
          ...signal.reasons,
          `平仓盈亏: ${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%`,
        ],
      });

      tradeId++;
      openPosition = null;  // 清空持仓
    }
    // 忽略：做空信号（无持仓时的卖出）、重复买入信号
  }

  // 如果有未完成的持仓，标记为持仓中
  if (openPosition && currentPrice) {
    const buyPrice = openPosition.price;
    const floatingPL = ((currentPrice - buyPrice) / buyPrice) * 100;

    // 更新持仓信号，添加持仓状态标记
    const openIdx = result.findIndex(s => s.tradeId === openPosition!.tradeId && s.type === 'buy');
    if (openIdx >= 0) {
      result[openIdx] = {
        ...result[openIdx],
        reasons: [
          ...result[openIdx].reasons,
          `【持仓中】浮动盈亏: ${floatingPL >= 0 ? '+' : ''}${floatingPL.toFixed(2)}%`,
          `目标价: ${(buyPrice * 1.05).toFixed(2)} | 止损价: ${(buyPrice * 0.97).toFixed(2)}`,
        ],
      };
    }
  }

  return result;
}

/**
 * 多周期共振分析
 */
export function analyzeMultiTimeframeResonance(
  signals1m: TradingSignal[],
  signals5m: TradingSignal[],
  signals15m: TradingSignal[],
  signals30m: TradingSignal[]
): {
  resonanceLevel: number; // 0-4，共振强度
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  details: string[];
} {
  const buyCount = [signals1m, signals5m, signals15m, signals30m].filter(
    signals => signals.length > 0 && signals[signals.length - 1].type === 'buy'
  ).length;

  const sellCount = [signals1m, signals5m, signals15m, signals30m].filter(
    signals => signals.length > 0 && signals[signals.length - 1].type === 'sell'
  ).length;

  const details: string[] = [];
  let recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell' = 'hold';
  let resonanceLevel = 0;

  if (signals1m.length > 0 && signals1m[signals1m.length - 1].type === 'buy') {
    details.push('1分钟：买入信号');
    resonanceLevel++;
  }
  if (signals5m.length > 0 && signals5m[signals5m.length - 1].type === 'buy') {
    details.push('5分钟：买入信号');
    resonanceLevel++;
  }
  if (signals15m.length > 0 && signals15m[signals15m.length - 1].type === 'buy') {
    details.push('15分钟：买入信号');
    resonanceLevel++;
  }
  if (signals30m.length > 0 && signals30m[signals30m.length - 1].type === 'buy') {
    details.push('30分钟：买入信号');
    resonanceLevel++;
  }

  if (buyCount >= 3) {
    recommendation = 'strong_buy';
  } else if (buyCount >= 2) {
    recommendation = 'buy';
  } else if (sellCount >= 3) {
    recommendation = 'strong_sell';
  } else if (sellCount >= 2) {
    recommendation = 'sell';
  }

  return { resonanceLevel, recommendation, details };
}
