/**
 * 分时走势图组件
 * 支持多时间周期切换和智能买卖点标注
 */
import { useState, useEffect } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Scatter,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SignalDetailDialog } from './SignalDetailDialog';
import { TradingSimulationCard } from './TradingSimulationCard';
import { TechnicalIndicatorsPanel } from './TechnicalIndicatorsPanel';

interface IntradayDataPoint {
  time: string;
  price: number;
  volume: number;
  amount: number;
}

interface TradingSignal {
  time: string;
  type: 'buy' | 'sell' | 'hold';
  price: number;
  strength: number;
  reasons: string[];
  stopLoss?: number;
  target?: number;
  resonance?: {
    level: number; // 共振级别，如 2 表示 2/3
    timeframes: string[]; // 参与共振的时间周期
    strength: number; // 共振强度评分 0-100
  };
  // 配对信息
  tradeId?: string; // 交易ID，用于匹配买入和卖出
  pairedSignal?: TradingSignal; // 配对的信号（买入对应卖出，反之亦然）
  profitLoss?: number; // 盈亏金额
  profitLossPercent?: number; // 盈亏百分比
}

interface IntradayChartProps {
  symbol: string;
  market: 'US' | 'HK' | 'CN';
}

type TimeFrame = 'intraday' | '1m' | '5m' | '15m' | '30m' | '60m' | 'daily';

const timeFrameLabels: Record<TimeFrame, string> = {
  intraday: '分时',
  '1m': '1分',
  '5m': '5分',
  '15m': '15分',
  '30m': '30分',
  '60m': '60分',
  daily: '日线',
};

export function IntradayChart({ symbol, market }: IntradayChartProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('intraday');
  const [data, setData] = useState<IntradayDataPoint[]>([]);
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<TradingSignal | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hoveredSignal, setHoveredSignal] = useState<TradingSignal | null>(null);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [marketStatus, setMarketStatus] = useState<{
    isOpen: boolean;
    status: string;
    description: string;
  } | null>(null);
  const [dataDate, setDataDate] = useState<string>('');
  const [tradingSimulation, setTradingSimulation] = useState<any>(null);

  // 获取分时数据和买卖信号
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 清理股票代码
        const cleanSymbol = symbol.split('.')[0];

        // 策略: 'intraday'使用分时API(1天)，其他周期使用历史K线API(多天)
        if (timeFrame === 'intraday') {
          const response = await fetch(
            `/api/intraday/data?symbol=${cleanSymbol}&market=${market}`
          );

          if (!response.ok) throw new Error('Failed to fetch intraday data');

          const result = await response.json();
          setData(result.data); // data point time is "HH:mm"
          setSignals(result.signals);
          setMarketStatus(result.marketStatus || null);
          setDataDate(result.date || '');
          setCurrentPrice(result.data.length > 0 ? result.data[result.data.length - 1].price : 0);

        } else {
          // K-line data (>1 day)
          // Map timeFrame to interval/range
          let interval = timeFrame as string;
          let range = '60d'; // Default sufficient for 30d requirement
          if (timeFrame === 'daily') {
            interval = '1d';
            range = '1y';
          }

          const response = await fetch(
            `/api/stock/history?symbol=${cleanSymbol}&market=${market}&interval=${interval}&range=${range}`
          );

          if (!response.ok) throw new Error('Failed to fetch history data');

          const result = await response.json();
          const priceData = result.data.priceData || [];

          // Map to IntradayDataPoint format
          const mappedData: IntradayDataPoint[] = priceData.map((p: any) => ({
            time: p.date.substring(5), // Remove Year "YYYY-MM-DD HH:mm" -> "MM-DD HH:mm"
            price: p.close,
            volume: p.volume,
            amount: p.close * p.volume // Approx
          }));

          setData(mappedData);

          // Fetch signals for daily data using the history-signals endpoint
          try {
            const signalResponse = await fetch(
              `/api/stock/history-signals?symbol=${cleanSymbol}&market=${market}&interval=1d&range=60d`
            );
            if (signalResponse.ok) {
              const signalResult = await signalResponse.json();
              setSignals(signalResult.data?.signals || []);
            } else {
              setSignals([]);
            }
          } catch {
            setSignals([]);
          }

          if (mappedData.length > 0) {
            setCurrentPrice(mappedData[mappedData.length - 1].price);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Auto refresh
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [symbol, market, timeFrame]);

  // 根据时间周期聚合数据 (Only for 'intraday' mode if needed, others are pre-fetched)
  // Since we fetch pre-aggregated data for 5m/15m etc, we can bypass this for those modes.
  const aggregateData = (rawData: IntradayDataPoint[], frame: TimeFrame): IntradayDataPoint[] => {
    if (frame !== 'intraday') return rawData;
    // ... existing 'intraday' aggregation logic if rawData is 1m ...
    // But 'intraday' frame means we WANT 1m (or whatever backend gave). 
    // Backend gives 1m for intraday.
    return rawData;
  };

  const chartData = data; // Directly use fetched data (aggregated by backend or simple 1m)

  // 买入卖出信号配对算法（FIFO先进先出）
  const pairSignals = (signals: TradingSignal[]): TradingSignal[] => {
    const pairedSignals: TradingSignal[] = [];
    const openBuySignals: TradingSignal[] = []; // 未平仓的买入信号

    signals.forEach((signal, index) => {
      if (signal.type === 'buy') {
        // 买入信号：分配交易ID并加入未平仓列表
        const buySignal = {
          ...signal,
          tradeId: `trade-${index}`,
        };
        openBuySignals.push(buySignal);
        pairedSignals.push(buySignal);
      } else if (signal.type === 'sell' && openBuySignals.length > 0) {
        // 卖出信号：匹配最早的未平仓买入信号（FIFO）
        const buySignal = openBuySignals.shift()!;
        const profitLoss = signal.price - buySignal.price;
        const profitLossPercent = (profitLoss / buySignal.price) * 100;

        const sellSignal = {
          ...signal,
          tradeId: buySignal.tradeId,
          pairedSignal: buySignal,
          profitLoss,
          profitLossPercent,
        };

        // 更新买入信号的配对信息
        const buyIndex = pairedSignals.findIndex(s => s.tradeId === buySignal.tradeId);
        if (buyIndex !== -1) {
          pairedSignals[buyIndex] = {
            ...pairedSignals[buyIndex],
            pairedSignal: sellSignal,
            profitLoss,
            profitLossPercent,
          };
        }

        pairedSignals.push(sellSignal);
      } else {
        // 其他信号（hold或未匹配的sell）
        pairedSignals.push(signal);
      }
    });

    return pairedSignals;
  };

  const pairedSignals = pairSignals(signals);

  // 将信号数据合并到chartData中
  const chartDataWithSignals = chartData.map(point => {
    const signal = pairedSignals.find(s => s.time === point.time);
    return {
      ...point,
      buySignal: signal?.type === 'buy' ? signal.price : null,
      sellSignal: signal?.type === 'sell' ? signal.price : null,
      signal: signal || null,
    };
  });

  // 调试日志
  console.log('[IntradayChart] Data prepared:', {
    totalDataPoints: chartDataWithSignals.length,
    totalSignals: signals.length,
    buySignals: chartDataWithSignals.filter(d => d.buySignal !== null).length,
    sellSignals: chartDataWithSignals.filter(d => d.sellSignal !== null).length,
    sampleData: chartDataWithSignals.slice(0, 5),
  });

  // 自定义Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <div className="text-sm font-semibold mb-2">{data.time}</div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">价格:</span>
            <span className="font-semibold">{data.price.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">成交量:</span>
            <span>{data.volume.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  };

  // 自定义信号点渲染函数 - 使用清晰的箭头标识
  const renderSignalDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload.signal) return <g />;

    const signal = payload.signal;
    const isBuy = signal.type === 'buy';
    const isResonance = signal.resonance && signal.resonance.level >= 2;

    // 中国习惯：红买绿卖
    const mainColor = isBuy ? '#ef4444' : '#22c55e'; // 红色买入，绿色卖出
    const glowColor = isBuy ? '#fca5a5' : '#86efac'; // 发光效果颜色

    // 悬停状态
    const isHovered = hoveredSignal?.time === signal.time;
    const isPaired = hoveredSignal?.tradeId && signal.tradeId === hoveredSignal.tradeId && hoveredSignal.time !== signal.time;

    // 箭头大小
    const size = isResonance ? 14 : 10;
    const scale = isHovered ? 1.3 : isPaired ? 1.2 : 1;
    const finalSize = size * scale;

    // 买入箭头朝上 ▲，卖出箭头朝下 ▼
    const arrowPath = isBuy
      ? `M ${cx} ${cy - finalSize} L ${cx - finalSize * 0.7} ${cy + finalSize * 0.5} L ${cx + finalSize * 0.7} ${cy + finalSize * 0.5} Z`
      : `M ${cx} ${cy + finalSize} L ${cx - finalSize * 0.7} ${cy - finalSize * 0.5} L ${cx + finalSize * 0.7} ${cy - finalSize * 0.5} Z`;

    return (
      <g style={{ cursor: 'pointer' }}
        onClick={() => {
          setSelectedSignal(signal);
          setDialogOpen(true);
        }}
        onMouseEnter={() => setHoveredSignal(signal)}
        onMouseLeave={() => setHoveredSignal(null)}>
        {/* 发光效果 */}
        <defs>
          <filter id={`glow-${signal.time}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 外圈发光 (共振或悬停时) */}
        {(isResonance || isHovered) && (
          <circle
            cx={cx}
            cy={cy}
            r={finalSize + 8}
            fill="none"
            stroke={glowColor}
            strokeWidth={2}
            opacity={0.6}
            strokeDasharray={isResonance ? "4 2" : "none"}
          />
        )}

        {/* 白色描边底层（提升对比度） */}
        <path
          d={arrowPath}
          fill="white"
          stroke="white"
          strokeWidth={3}
          opacity={0.8}
        />

        {/* 主箭头 */}
        <path
          d={arrowPath}
          fill={mainColor}
          stroke={mainColor}
          strokeWidth={1.5}
          filter={isHovered ? `url(#glow-${signal.time})` : undefined}
          opacity={1}
        />

        {/* 配对高亮 */}
        {isPaired && (
          <circle
            cx={cx}
            cy={cy}
            r={finalSize + 5}
            fill="none"
            stroke={mainColor}
            strokeWidth={2}
            opacity={0.8}
          />
        )}
      </g>
    );
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-destructive flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-border/50 bg-card/80 backdrop-blur-sm shadow-lg shadow-black/20">
      {/* 时间周期切换器 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {(Object.keys(timeFrameLabels) as TimeFrame[]).map((frame) => (
            <Button
              key={frame}
              variant={timeFrame === frame ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeFrame(frame)}
            >
              {timeFrameLabels[frame]}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-sm">
          {marketStatus && (
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2 py-1 rounded text-xs font-medium",
                marketStatus.isOpen
                  ? "bg-green-500/20 text-green-400"
                  : "bg-amber-500/20 text-amber-400"
              )}>
                {marketStatus.status}
              </span>
              {dataDate && (
                <span className="text-muted-foreground">
                  数据日期: {dataDate}
                </span>
              )}
            </div>
          )}
          {signals.length > 0 && (
            <span className="text-muted-foreground">
              检测到 {signals.length} 个交易信号
            </span>
          )}
        </div>
      </div>

      {/* 走势图 */}
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartDataWithSignals} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={true} vertical={false} />
          <XAxis
            dataKey="time"
            stroke="#888"
            tick={{ fill: 'var(--foreground)', fontSize: 11 }}
            tickFormatter={(value) => {
              // 简化显示：只显示时间或日期部分
              if (timeFrame === 'daily') {
                // 日线只显示月-日
                return value.length > 5 ? value.substring(5) : value;
              }
              // 分时/分钟线只显示时间
              if (value.includes(' ')) {
                return value.split(' ')[1] || value;
              }
              return value;
            }}
            interval="preserveStartEnd"
            minTickGap={60}
          />
          <YAxis
            stroke="#888"
            tick={{ fill: '#888', fontSize: 12 }}
            domain={['auto', 'auto']}
            tickFormatter={(value) => value.toFixed(2)}
            tickCount={5}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="价格"
            isAnimationActive={false}
          />
          <Scatter
            dataKey="buySignal"
            fill="#ef4444"
            shape={renderSignalDot as any}
            isAnimationActive={false}
            legendType="none"
          />
          <Scatter
            dataKey="sellSignal"
            fill="#22c55e"
            shape={renderSignalDot as any}
            isAnimationActive={false}
            legendType="none"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* 技术指标面板 */}
      {data.length > 0 && (
        <TechnicalIndicatorsPanel data={data} timeFrame={timeFrame} />
      )}

      {/* 信号详情弹窗 */}
      <SignalDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        signal={selectedSignal}
        currentPrice={currentPrice}
      />

      {/* 模拟交易盈亏分析 */}
      {tradingSimulation && (
        <div className="mt-6">
          <TradingSimulationCard
            simulation={tradingSimulation}
            currency={market === 'US' ? 'USD' : market === 'HK' ? 'HKD' : 'CNY'}
          />
        </div>
      )}
    </Card>
  );
}
