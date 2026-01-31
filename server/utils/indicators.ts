/**
 * 技术指标计算工具
 * 用于策略回测和实时分析
 */

/**
 * 计算简单移动平均线 (SMA - Simple Moving Average)
 * @param data 价格数据数组
 * @param period 周期
 * @returns MA值数组
 */
export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN); // 数据不足，无法计算
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  
  return result;
}

/**
 * 计算指数移动平均线 (EMA - Exponential Moving Average)
 * @param data 价格数据数组
 * @param period 周期
 * @returns EMA值数组
 */
export function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // 第一个EMA值使用SMA
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
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
 * 计算真实波幅 (TR - True Range)
 * @param high 最高价数组
 * @param low 最低价数组
 * @param close 收盘价数组
 * @returns TR值数组
 */
export function calculateTR(high: number[], low: number[], close: number[]): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < high.length; i++) {
    if (i === 0) {
      // 第一根K线的TR = high - low
      result.push(high[i] - low[i]);
    } else {
      // TR = max(high - low, abs(high - prevClose), abs(low - prevClose))
      const tr1 = high[i] - low[i];
      const tr2 = Math.abs(high[i] - close[i - 1]);
      const tr3 = Math.abs(low[i] - close[i - 1]);
      result.push(Math.max(tr1, tr2, tr3));
    }
  }
  
  return result;
}

/**
 * 计算平均真实波幅 (ATR - Average True Range)
 * @param high 最高价数组
 * @param low 最低价数组
 * @param close 收盘价数组
 * @param period ATR周期（默认14）
 * @returns ATR值数组
 */
export function calculateATR(
  high: number[],
  low: number[],
  close: number[],
  period: number = 14
): number[] {
  const tr = calculateTR(high, low, close);
  
  // ATR使用EMA平滑TR
  const result: number[] = [];
  let atr = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = 0; i < tr.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else if (i === period - 1) {
      result.push(atr);
    } else {
      // ATR = (prevATR * (period - 1) + TR) / period
      atr = (atr * (period - 1) + tr[i]) / period;
      result.push(atr);
    }
  }
  
  return result;
}

/**
 * 计算RSI (Relative Strength Index)
 * @param data 价格数据数组
 * @param period RSI周期（默认14）
 * @returns RSI值数组
 */
export function calculateRSI(data: number[], period: number = 14): number[] {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  // 计算涨跌幅
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  
  // 计算RSI
  result.push(NaN); // 第一个数据点无法计算
  
  for (let i = 0; i < gains.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        result.push(rsi);
      }
    }
  }
  
  return result;
}

/**
 * 计算MACD (Moving Average Convergence Divergence)
 * @param data 价格数据数组
 * @param fastPeriod 快线周期（默认12）
 * @param slowPeriod 慢线周期（默认26）
 * @param signalPeriod 信号线周期（默认9）
 * @returns {macd, signal, histogram}
 */
export function calculateMACD(
  data: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  // MACD = fastEMA - slowEMA
  const macd = fastEMA.map((fast, i) => fast - slowEMA[i]);
  
  // Signal = EMA(MACD, signalPeriod)
  const signal = calculateEMA(macd.filter(v => !isNaN(v)), signalPeriod);
  
  // Histogram = MACD - Signal
  const histogram = macd.map((m, i) => m - (signal[i] || 0));
  
  return { macd, signal, histogram };
}
