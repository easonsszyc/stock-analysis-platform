/**
 * 多周期共振分析服务
 * 检测多个时间周期的信号共振，提高交易信号可靠性
 */

import { TradingSignal } from './trading-signals.service';

export interface ResonanceAnalysis {
  hasResonance: boolean;
  level: number; // 0-3，共振级别（几个周期同时出现信号）
  timeframes: string[]; // 共振的时间周期
  signalType: 'buy' | 'sell' | 'hold';
  strength: number; // 共振强度评分 0-100
  description: string;
}

/**
 * 分析多周期共振
 * @param signals5m 5分钟信号
 * @param signals15m 15分钟信号
 * @param signals30m 30分钟信号
 * @param signals60m 60分钟信号（可选）
 */
export function analyzeMultiTimeframeResonance(
  signals5m: TradingSignal[],
  signals15m: TradingSignal[],
  signals30m: TradingSignal[],
  signals60m?: TradingSignal[]
): ResonanceAnalysis {
  // 获取每个时间周期的最新信号
  const latest5m = signals5m.length > 0 ? signals5m[signals5m.length - 1] : null;
  const latest15m = signals15m.length > 0 ? signals15m[signals15m.length - 1] : null;
  const latest30m = signals30m.length > 0 ? signals30m[signals30m.length - 1] : null;
  const latest60m = signals60m && signals60m.length > 0 ? signals60m[signals60m.length - 1] : null;

  // 统计买入和卖出信号数量
  const buySignals: string[] = [];
  const sellSignals: string[] = [];

  if (latest5m?.type === 'buy') buySignals.push('5分钟');
  if (latest5m?.type === 'sell') sellSignals.push('5分钟');

  if (latest15m?.type === 'buy') buySignals.push('15分钟');
  if (latest15m?.type === 'sell') sellSignals.push('15分钟');

  if (latest30m?.type === 'buy') buySignals.push('30分钟');
  if (latest30m?.type === 'sell') sellSignals.push('30分钟');

  if (latest60m?.type === 'buy') buySignals.push('60分钟');
  if (latest60m?.type === 'sell') sellSignals.push('60分钟');

  // 判断共振类型和级别
  let hasResonance = false;
  let level = 0;
  let timeframes: string[] = [];
  let signalType: 'buy' | 'sell' | 'hold' = 'hold';
  let strength = 0;
  let description = '无明显共振信号';

  if (buySignals.length >= 2) {
    hasResonance = true;
    level = buySignals.length;
    timeframes = buySignals;
    signalType = 'buy';
    strength = calculateResonanceStrength(buySignals.length, [latest5m, latest15m, latest30m, latest60m].filter(s => s !== null) as TradingSignal[]);
    description = `${buySignals.length}个周期共振买入信号（${buySignals.join('、')}）`;
  } else if (sellSignals.length >= 2) {
    hasResonance = true;
    level = sellSignals.length;
    timeframes = sellSignals;
    signalType = 'sell';
    strength = calculateResonanceStrength(sellSignals.length, [latest5m, latest15m, latest30m, latest60m].filter(s => s !== null) as TradingSignal[]);
    description = `${sellSignals.length}个周期共振卖出信号（${sellSignals.join('、')}）`;
  }

  return {
    hasResonance,
    level,
    timeframes,
    signalType,
    strength,
    description,
  };
}

/**
 * 计算共振强度评分
 */
function calculateResonanceStrength(resonanceLevel: number, signals: TradingSignal[]): number {
  let strength = 0;

  // 基础分数：共振级别越高，分数越高
  strength += resonanceLevel * 20;

  // 信号强度加权平均
  const avgSignalStrength = signals.reduce((sum, s) => sum + (s.strength || 0), 0) / signals.length;
  strength += avgSignalStrength * 0.4;

  // 置信度加权平均
  const avgConfidence = signals.reduce((sum, s) => sum + (s.confidence || 0), 0) / signals.length;
  strength += avgConfidence * 0.4;

  return Math.min(Math.round(strength), 100);
}

/**
 * 为信号添加共振信息
 * @param signal 原始信号
 * @param resonance 共振分析结果
 */
export function enrichSignalWithResonance(
  signal: TradingSignal,
  resonance: ResonanceAnalysis
): TradingSignal {
  if (!resonance.hasResonance || signal.type !== resonance.signalType) {
    return signal;
  }

  return {
    ...signal,
    resonance: {
      level: resonance.level,
      timeframes: resonance.timeframes,
    },
    // 共振信号的强度和置信度提升
    strength: Math.min(signal.strength + resonance.level * 5, 100),
    confidence: Math.min(signal.confidence + resonance.level * 10, 100),
  };
}

/**
 * 批量为信号添加共振信息
 */
export function enrichSignalsWithResonance(
  signals: TradingSignal[],
  resonance: ResonanceAnalysis
): TradingSignal[] {
  return signals.map(signal => enrichSignalWithResonance(signal, resonance));
}
