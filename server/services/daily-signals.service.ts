/**
 * 日线交易信号服务
 * 基于通达信公式实现
 * 
 * 核心信号:
 * - 相对底部: 60日新低 + 当日涨幅>=4%
 * - 绝对底部: EMA21偏离度<-20后金叉
 * - 阶段启动: DX动量指标金叉 + 超卖区域
 * - 集筹: 阶段启动 + 支撑位确认 + 放量
 * - 预顶离场: DX动量死叉 + 超买区域
 * - 大笔出货: CCI类指标超买 + 成交异常
 */

export interface DailyPriceData {
    date: string;      // MM-DD 格式
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface DailySignal {
    time: string;
    type: 'buy' | 'sell';
    price: number;
    signalName: string;  // 信号名称: 相对底部、阶段启动等
    strength: number;    // 0-100
    confidence: number;  // 0-100
    reasons: string[];
    target?: number;
    stopLoss?: number;
    tradeId?: number;
}

/**
 * 计算简单移动平均线 MA
 */
function MA(data: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            result.push(NaN);
        } else {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j];
            }
            result.push(sum / period);
        }
    }
    return result;
}

/**
 * 计算指数移动平均线 EMA
 */
function EMA(data: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    let ema = 0;

    for (let i = 0; i < Math.min(period, data.length); i++) {
        ema += data[i];
    }
    ema = ema / Math.min(period, data.length);

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
 * 计算平滑移动平均线 SMA (通达信风格)
 * SMA(X, N, M) = (M * X + (N - M) * REF(SMA, 1)) / N
 */
function SMA(data: number[], n: number, m: number): number[] {
    const result: number[] = [];
    let prev = data[0] || 0;

    for (let i = 0; i < data.length; i++) {
        const val = (m * data[i] + (n - m) * prev) / n;
        result.push(val);
        prev = val;
    }
    return result;
}

/**
 * 计算N周期最高值 HHV
 */
function HHV(data: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - period + 1);
        let max = data[start];
        for (let j = start; j <= i; j++) {
            if (data[j] > max) max = data[j];
        }
        result.push(max);
    }
    return result;
}

/**
 * 计算N周期最低值 LLV
 */
function LLV(data: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - period + 1);
        let min = data[start];
        for (let j = start; j <= i; j++) {
            if (data[j] < min) min = data[j];
        }
        result.push(min);
    }
    return result;
}

/**
 * 引用N周期前的值 REF
 */
function REF(data: number[], n: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < n) {
            result.push(NaN);
        } else {
            result.push(data[i - n]);
        }
    }
    return result;
}

/**
 * 金叉判断 CROSS(a, b) - a上穿b
 */
function CROSS(a: number[], b: number[]): boolean[] {
    const result: boolean[] = [];
    for (let i = 0; i < a.length; i++) {
        if (i === 0) {
            result.push(false);
        } else {
            result.push(a[i - 1] <= b[i - 1] && a[i] > b[i]);
        }
    }
    return result;
}

/**
 * 计算DX动量指标
 * DX = 100 × EMA(EMA(MTM,6),6) / EMA(EMA(ABS(MTM),6),6)
 * MTM = C - REF(C,1)
 */
function calculateDX(closes: number[]): number[] {
    const mtm: number[] = [];
    const absMtm: number[] = [];

    for (let i = 0; i < closes.length; i++) {
        if (i === 0) {
            mtm.push(0);
            absMtm.push(0);
        } else {
            const change = closes[i] - closes[i - 1];
            mtm.push(change);
            absMtm.push(Math.abs(change));
        }
    }

    // 双重EMA平滑
    const emaMtm = EMA(EMA(mtm, 6), 6);
    const emaAbsMtm = EMA(EMA(absMtm, 6), 6);

    const dx: number[] = [];
    for (let i = 0; i < closes.length; i++) {
        if (emaAbsMtm[i] === 0 || isNaN(emaAbsMtm[i])) {
            dx.push(0);
        } else {
            dx.push(100 * emaMtm[i] / emaAbsMtm[i]);
        }
    }

    return dx;
}

/**
 * 分析日线交易信号
 * @param data 日线价格数据
 * @param market 市场类型
 */
export function analyzeDailySignals(data: DailyPriceData[], market?: 'US' | 'HK' | 'CN'): DailySignal[] {
    if (data.length < 60) {
        return [];
    }

    const signals: DailySignal[] = [];

    // 提取价格数据
    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const volumes = data.map(d => d.volume);

    // 计算技术指标
    const ema21 = EMA(closes, 21);
    const llv60 = LLV(lows, 60);
    const llv3 = LLV(lows, 3);
    const hhv21 = HHV(highs, 21);
    const llv21 = LLV(lows, 21);
    const dx = calculateDX(closes);
    const maDX = MA(dx, 2);

    // 计算EMA21偏离度
    const xl2: number[] = [];
    for (let i = 0; i < closes.length; i++) {
        if (isNaN(ema21[i]) || ema21[i] === 0) {
            xl2.push(0);
        } else {
            xl2.push(((closes[i] - ema21[i]) / ema21[i]) * 100);
        }
    }

    // 绝对底部: XL2上穿-20
    const zeroMinus20 = new Array(closes.length).fill(-20);
    const xl3Cross = CROSS(xl2, zeroMinus20);

    for (let i = 30; i < data.length; i++) {
        const currentPrice = closes[i];
        const prevPrice = closes[i - 1] || currentPrice;
        const changePercent = ((currentPrice - prevPrice) / prevPrice) * 100;

        // ============ 买入信号 ============

        // 1. 相对底部: 60日新低 + 当日涨幅>=4%
        const isRelativeBottom = lows[i] === llv60[i] && changePercent >= 4;
        if (isRelativeBottom) {
            signals.push({
                time: data[i].date,
                type: 'buy',
                price: currentPrice,
                signalName: '相对底部',
                strength: 75,
                confidence: 70,
                reasons: [
                    '创60日新低后反弹',
                    `当日涨幅: ${changePercent.toFixed(2)}%`,
                    '底部确认信号'
                ],
                target: currentPrice * 1.08,
                stopLoss: lows[i] * 0.97,
            });
        }

        // 2. 绝对底部: EMA21偏离度从<-20向上突破
        if (xl3Cross[i]) {
            signals.push({
                time: data[i].date,
                type: 'buy',
                price: currentPrice,
                signalName: '绝对底部',
                strength: 80,
                confidence: 75,
                reasons: [
                    'EMA21偏离度突破-20',
                    `偏离度: ${xl2[i].toFixed(2)}%`,
                    '超卖后反转信号'
                ],
                target: ema21[i] || currentPrice * 1.05,
                stopLoss: lows[i] * 0.96,
            });
        }

        // 3. 阶段启动: DX从负值金叉+超卖区域
        const dxLLV7 = LLV(dx.slice(Math.max(0, i - 6), i + 1), 7);
        const isLowestDX = dx[i] <= dxLLV7[dxLLV7.length - 1];
        const isDXBelowZero = dx[i - 1] < 0 || dx[i - 2] < 0;
        const isDXCrossUp = dx[i - 1] <= maDX[i - 1] && dx[i] > maDX[i];

        if (isLowestDX && isDXBelowZero && isDXCrossUp) {
            signals.push({
                time: data[i].date,
                type: 'buy',
                price: currentPrice,
                signalName: '阶段启动',
                strength: 85,
                confidence: 80,
                reasons: [
                    'DX动量指标金叉',
                    '超卖区域反转',
                    '阶段性底部确认'
                ],
                target: currentPrice * 1.10,
                stopLoss: currentPrice * 0.95,
            });
        }

        // ============ 卖出信号 ============

        // 4. 预顶离场: DX从高位死叉
        const dxHHV7 = HHV(dx.slice(Math.max(0, i - 6), i + 1), 7);
        const isHighestDX = dx[i] >= dxHHV7[dxHHV7.length - 1] * 0.95;
        const isDXAbove50 = dx[i - 1] > 50 || dx[i - 2] > 50;
        const isDXCrossDown = dx[i - 1] >= maDX[i - 1] && dx[i] < maDX[i];

        if (isHighestDX && isDXAbove50 && isDXCrossDown) {
            signals.push({
                time: data[i].date,
                type: 'sell',
                price: currentPrice,
                signalName: '预顶离场',
                strength: 80,
                confidence: 75,
                reasons: [
                    'DX动量指标死叉',
                    '超买区域回落',
                    '阶段性顶部预警'
                ],
                target: currentPrice * 0.95,
                stopLoss: highs[i] * 1.02,
            });
        }

        // 5. 大笔出货: 成交量放大 + 价格接近高点但收阴
        const avgVol5 = volumes.slice(Math.max(0, i - 5), i).reduce((a, b) => a + b, 0) / 5;
        const isVolumeSpike = volumes[i] > avgVol5 * 1.8;
        const isNearHigh = highs[i] >= hhv21[i] * 0.98;
        const isNegativeClose = closes[i] < data[i].open;

        if (isVolumeSpike && isNearHigh && isNegativeClose) {
            signals.push({
                time: data[i].date,
                type: 'sell',
                price: currentPrice,
                signalName: '大笔出货',
                strength: 85,
                confidence: 80,
                reasons: [
                    '成交量异常放大',
                    '价格接近阶段高点',
                    '收盘价低于开盘价（冲高回落）'
                ],
                target: currentPrice * 0.92,
                stopLoss: highs[i] * 1.01,
            });
        }
    }

    // 港股/A股: 做多配对处理
    if (market === 'HK' || market === 'CN') {
        return generateLongOnlyDailyTrades(signals, closes[closes.length - 1]);
    }

    return signals;
}

/**
 * 生成做多配对交易（港股/A股日线）
 */
function generateLongOnlyDailyTrades(rawSignals: DailySignal[], currentPrice: number): DailySignal[] {
    const result: DailySignal[] = [];
    let openPosition: DailySignal | null = null;
    let tradeId = 1;

    for (const signal of rawSignals) {
        if (signal.type === 'buy' && !openPosition) {
            openPosition = { ...signal, tradeId };
            result.push(openPosition);
        } else if (signal.type === 'sell' && openPosition) {
            const buyPrice = openPosition.price;
            const profitPercent = ((signal.price - buyPrice) / buyPrice) * 100;

            result.push({
                ...signal,
                tradeId,
                reasons: [
                    ...signal.reasons,
                    `平仓盈亏: ${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%`,
                ],
            });

            tradeId++;
            openPosition = null;
        }
    }

    // 标记未完成持仓
    if (openPosition && currentPrice) {
        const buyPrice = openPosition.price;
        const floatingPL = ((currentPrice - buyPrice) / buyPrice) * 100;

        const openIdx = result.findIndex(s => s.tradeId === openPosition!.tradeId && s.type === 'buy');
        if (openIdx >= 0) {
            result[openIdx].reasons = [
                ...result[openIdx].reasons,
                `【持仓中】浮动盈亏: ${floatingPL >= 0 ? '+' : ''}${floatingPL.toFixed(2)}%`,
            ];
        }
    }

    return result;
}
