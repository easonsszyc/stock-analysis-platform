/**
 * 技术指标计算服务
 * 计算常用的技术分析指标
 */

export interface PriceData {
  time: string;
  price: number;
  volume: number;
}

/**
 * 计算简单移动平均线 (SMA)
 */
export function calculateSMA(data: PriceData[], period: number): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].price;
    }
    result.push(sum / period);
  }
  
  return result;
}

/**
 * 计算相对强弱指标 (RSI)
 */
export function calculateRSI(data: PriceData[], period: number = 14): number[] {
  const result: number[] = [];
  
  if (data.length < period + 1) {
    return data.map(() => NaN);
  }
  
  // 计算价格变化
  const changes: number[] = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].price - data[i - 1].price);
  }
  
  // 计算RSI
  for (let i = 0; i < changes.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    
    let gains = 0;
    let losses = 0;
    
    for (let j = 0; j < period; j++) {
      const change = changes[i - j];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      result.push(rsi);
    }
  }
  
  // 第一个数据点没有变化，补充NaN
  result.unshift(NaN);
  
  return result;
}

/**
 * 计算MACD指标
 */
export function calculateMACD(data: PriceData[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): {
  macd: number[];
  signal: number[];
  histogram: number[];
} {
  const prices = data.map(d => d.price);
  
  // 计算EMA
  const emaFast = calculateEMA(prices, fastPeriod);
  const emaSlow = calculateEMA(prices, slowPeriod);
  
  // MACD线 = 快线 - 慢线
  const macd = emaFast.map((fast, i) => fast - emaSlow[i]);
  
  // 信号线 = MACD的EMA
  const signal = calculateEMA(macd, signalPeriod);
  
  // 柱状图 = MACD - 信号线
  const histogram = macd.map((m, i) => m - signal[i]);
  
  return { macd, signal, histogram };
}

/**
 * 计算指数移动平均线 (EMA)
 */
function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // 第一个EMA值使用SMA
  let ema = 0;
  for (let i = 0; i < period; i++) {
    if (i < data.length) {
      ema += data[i];
    }
  }
  ema /= period;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else if (i === period - 1) {
      result.push(ema);
    } else {
      ema = (data[i] - ema) * multiplier + ema;
      result.push(ema);
    }
  }
  
  return result;
}

/**
 * 计算布林带 (Bollinger Bands)
 */
export function calculateBollingerBands(data: PriceData[], period: number = 20, stdDev: number = 2): {
  upper: number[];
  middle: number[];
  lower: number[];
} {
  const middle = calculateSMA(data, period);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }
    
    // 计算标准差
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += Math.pow(data[i - j].price - middle[i], 2);
    }
    const std = Math.sqrt(sum / period);
    
    upper.push(middle[i] + stdDev * std);
    lower.push(middle[i] - stdDev * std);
  }
  
  return { upper, middle, lower };
}

/**
 * 识别支撑位和压力位
 */
export function findSupportResistance(data: PriceData[], window: number = 10): {
  support: number[];
  resistance: number[];
} {
  const support: number[] = [];
  const resistance: number[] = [];
  
  for (let i = window; i < data.length - window; i++) {
    const currentPrice = data[i].price;
    let isSupport = true;
    let isResistance = true;
    
    // 检查前后window个数据点
    for (let j = 1; j <= window; j++) {
      if (data[i - j].price < currentPrice || data[i + j].price < currentPrice) {
        isSupport = false;
      }
      if (data[i - j].price > currentPrice || data[i + j].price > currentPrice) {
        isResistance = false;
      }
    }
    
    if (isSupport) {
      support.push(currentPrice);
    }
    if (isResistance) {
      resistance.push(currentPrice);
    }
  }
  
  return { support, resistance };
}
