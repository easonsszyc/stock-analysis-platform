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
  reasons: string[]; // 信号原因
  stopLoss?: number; // 止损价
  target?: number; // 目标价
}

/**
 * 分析买卖信号
 */
export function analyzeTradingSignals(data: PriceData[]): TradingSignal[] {
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
    
    // 只记录有明确信号的点位
    if (reasons.length >= 2 && strength >= 40) {
      // 计算止损和目标价
      let stopLoss: number | undefined;
      let target: number | undefined;
      
      if (signalType === 'buy') {
        stopLoss = currentPrice * 0.98; // 止损2%
        target = currentPrice * 1.03; // 目标3%
      } else if (signalType === 'sell') {
        stopLoss = currentPrice * 1.02; // 止损2%
        target = currentPrice * 0.97; // 目标3%
      }
      
      signals.push({
        time: data[i].time,
        type: signalType,
        price: currentPrice,
        strength: Math.min(strength, 100),
        reasons,
        stopLoss,
        target,
      });
    }
  }
  
  return signals;
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
