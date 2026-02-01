/**
 * 技术指标面板组件
 * 完整展示 MACD、KDJ、RSI、VOL 四个指标（垂直堆叠）
 */
import { useMemo } from 'react';
import {
    ComposedChart,
    Line,
    Bar,
    Cell,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';

interface PriceDataPoint {
    time: string;
    price: number;
    volume: number;
}

interface TechnicalIndicatorsPanelProps {
    data: PriceDataPoint[];
    timeFrame: string;
}

// 计算 EMA
function calculateEMA(prices: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    let ema = 0;

    for (let i = 0; i < period && i < prices.length; i++) {
        ema += prices[i];
    }
    ema /= Math.min(period, prices.length);

    for (let i = 0; i < prices.length; i++) {
        if (i < period - 1) {
            result.push(NaN);
        } else if (i === period - 1) {
            result.push(ema);
        } else {
            ema = (prices[i] - ema) * multiplier + ema;
            result.push(ema);
        }
    }
    return result;
}

// 计算 MACD
function calculateMACD(data: PriceDataPoint[], fast = 12, slow = 26, signal = 9) {
    const prices = data.map(d => d.price);
    const emaFast = calculateEMA(prices, fast);
    const emaSlow = calculateEMA(prices, slow);
    const dif = emaFast.map((f, i) => f - emaSlow[i]);
    const dea = calculateEMA(dif.filter(v => !isNaN(v)), signal);

    const deaPadded = [...Array(dif.length - dea.length).fill(NaN), ...dea];
    const macd = dif.map((d, i) => 2 * (d - deaPadded[i]));

    return data.map((d, i) => ({
        time: d.time,
        dif: isNaN(dif[i]) ? null : dif[i],
        dea: isNaN(deaPadded[i]) ? null : deaPadded[i],
        macd: isNaN(macd[i]) ? null : macd[i],
    }));
}

// 计算 KDJ
function calculateKDJ(data: PriceDataPoint[], n = 9) {
    const result: { time: string; k: number | null; d: number | null; j: number | null }[] = [];
    let prevK = 50, prevD = 50;

    for (let i = 0; i < data.length; i++) {
        if (i < n - 1) {
            result.push({ time: data[i].time, k: null, d: null, j: null });
            continue;
        }

        let high = -Infinity, low = Infinity;
        for (let j = i - n + 1; j <= i; j++) {
            if (data[j].price > high) high = data[j].price;
            if (data[j].price < low) low = data[j].price;
        }

        const rsv = high !== low ? ((data[i].price - low) / (high - low)) * 100 : 50;
        const k = (2 * prevK + rsv) / 3;
        const d = (2 * prevD + k) / 3;
        const j = 3 * k - 2 * d;

        result.push({ time: data[i].time, k, d, j });
        prevK = k;
        prevD = d;
    }
    return result;
}

// 计算 RSI
function calculateRSI(data: PriceDataPoint[], periods: number[] = [6, 12, 24]) {
    const result: any[] = data.map(d => ({ time: d.time }));

    periods.forEach((period, idx) => {
        let gains = 0, losses = 0;

        for (let i = 1; i < data.length; i++) {
            const change = data[i].price - data[i - 1].price;

            if (i < period) {
                if (change > 0) gains += change;
                else losses -= change;
                result[i][`rsi${idx + 1}`] = null;
            } else if (i === period) {
                if (change > 0) gains += change;
                else losses -= change;
                const avgGain = gains / period;
                const avgLoss = losses / period;
                result[i][`rsi${idx + 1}`] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
            } else {
                const avgGain = gains / period;
                const avgLoss = losses / period;
                const currentGain = change > 0 ? change : 0;
                const currentLoss = change < 0 ? -change : 0;
                gains = avgGain * (period - 1) + currentGain;
                losses = avgLoss * (period - 1) + currentLoss;
                result[i][`rsi${idx + 1}`] = losses === 0 ? 100 : 100 - 100 / (1 + (gains / period) / (losses / period));
            }
        }
        result[0][`rsi${idx + 1}`] = null;
    });

    return result;
}

// 成交量数据
function calculateVOL(data: PriceDataPoint[]) {
    return data.map((d, i) => ({
        time: d.time,
        volume: d.volume,
        isUp: i === 0 ? true : data[i].price >= data[i - 1].price,
    }));
}

export function TechnicalIndicatorsPanel({ data, timeFrame }: TechnicalIndicatorsPanelProps) {
    const macdData = useMemo(() => calculateMACD(data), [data]);
    const kdjData = useMemo(() => calculateKDJ(data), [data]);
    const rsiData = useMemo(() => calculateRSI(data), [data]);
    const volData = useMemo(() => calculateVOL(data), [data]);

    // 简化X轴格式
    const formatXAxis = (value: string) => {
        if (timeFrame === 'daily') {
            return value.length > 5 ? value.substring(5) : value;
        }
        if (value.includes(' ')) {
            return value.split(' ')[1] || value;
        }
        return value;
    };

    const chartHeight = 80;
    const commonMargin = { top: 5, right: 30, left: 50, bottom: 5 };

    return (
        <div className="mt-4 border-t border-border pt-4 space-y-2">
            {/* MACD */}
            <div>
                <div className="text-xs text-muted-foreground mb-1">
                    MACD(12,26,9) <span className="text-yellow-500">DIF</span> <span className="text-blue-500">DEA</span>
                </div>
                <div style={{ height: chartHeight }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={macdData} margin={commonMargin}>
                            <XAxis dataKey="time" tickFormatter={formatXAxis} tick={{ fontSize: 9 }} interval="preserveStartEnd" minTickGap={80} stroke="#666" axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 9 }} stroke="#666" domain={['auto', 'auto']} width={40} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', fontSize: 11 }} />
                            <ReferenceLine y={0} stroke="#444" strokeDasharray="2 2" />
                            <Bar dataKey="macd" name="MACD" barSize={2}>
                                {macdData.map((entry, index) => (
                                    <Cell key={`macd-${index}`} fill={entry.macd && entry.macd >= 0 ? '#ef4444' : '#22c55e'} />
                                ))}
                            </Bar>
                            <Line type="monotone" dataKey="dif" stroke="#f59e0b" strokeWidth={1} dot={false} name="DIF" />
                            <Line type="monotone" dataKey="dea" stroke="#3b82f6" strokeWidth={1} dot={false} name="DEA" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* KDJ */}
            <div>
                <div className="text-xs text-muted-foreground mb-1">
                    KDJ(9,3,3) <span className="text-yellow-500">K</span> <span className="text-blue-500">D</span> <span className="text-purple-500">J</span>
                </div>
                <div style={{ height: chartHeight }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={kdjData} margin={commonMargin}>
                            <XAxis dataKey="time" tickFormatter={formatXAxis} tick={{ fontSize: 9 }} interval="preserveStartEnd" minTickGap={80} stroke="#666" axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 9 }} stroke="#666" domain={[0, 100]} width={40} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', fontSize: 11 }} />
                            <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="2 2" strokeOpacity={0.5} />
                            <ReferenceLine y={20} stroke="#22c55e" strokeDasharray="2 2" strokeOpacity={0.5} />
                            <Line type="monotone" dataKey="k" stroke="#f59e0b" strokeWidth={1} dot={false} name="K" />
                            <Line type="monotone" dataKey="d" stroke="#3b82f6" strokeWidth={1} dot={false} name="D" />
                            <Line type="monotone" dataKey="j" stroke="#a855f7" strokeWidth={1} dot={false} name="J" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* RSI */}
            <div>
                <div className="text-xs text-muted-foreground mb-1">
                    RSI <span className="text-yellow-500">6</span> <span className="text-blue-500">12</span> <span className="text-purple-500">24</span>
                </div>
                <div style={{ height: chartHeight }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={rsiData} margin={commonMargin}>
                            <XAxis dataKey="time" tickFormatter={formatXAxis} tick={{ fontSize: 9 }} interval="preserveStartEnd" minTickGap={80} stroke="#666" axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 9 }} stroke="#666" domain={[0, 100]} width={40} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', fontSize: 11 }} />
                            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="2 2" strokeOpacity={0.5} />
                            <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="2 2" strokeOpacity={0.5} />
                            <Line type="monotone" dataKey="rsi1" stroke="#f59e0b" strokeWidth={1} dot={false} name="RSI(6)" />
                            <Line type="monotone" dataKey="rsi2" stroke="#3b82f6" strokeWidth={1} dot={false} name="RSI(12)" />
                            <Line type="monotone" dataKey="rsi3" stroke="#a855f7" strokeWidth={1} dot={false} name="RSI(24)" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* VOL */}
            <div>
                <div className="text-xs text-muted-foreground mb-1">成交量</div>
                <div style={{ height: chartHeight }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={volData} margin={commonMargin}>
                            <XAxis dataKey="time" tickFormatter={formatXAxis} tick={{ fontSize: 9 }} interval="preserveStartEnd" minTickGap={80} stroke="#666" axisLine={false} tickLine={false} />
                            <YAxis
                                tick={{ fontSize: 9 }}
                                stroke="#666"
                                domain={['auto', 'auto']}
                                width={40}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', fontSize: 11 }}
                                formatter={(value: number) => value.toLocaleString()}
                            />
                            <Bar dataKey="volume" name="成交量" barSize={3}>
                                {volData.map((entry, index) => (
                                    <Cell key={`vol-${index}`} fill={entry.isUp ? '#ef4444' : '#22c55e'} />
                                ))}
                            </Bar>
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
