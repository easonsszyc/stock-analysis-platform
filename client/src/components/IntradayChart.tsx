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
        // 清理股票代码，移除Yahoo Finance后缀（如.SS, .HK）
        const cleanSymbol = symbol.split('.')[0];
        
        const response = await fetch(
          `/api/intraday/data?symbol=${cleanSymbol}&market=${market}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch intraday data');
        }
        
        const result = await response.json();
        setData(result.data);
        setSignals(result.signals);
        setMarketStatus(result.marketStatus || null);
        setDataDate(result.date || '');
        setTradingSimulation(result.tradingSimulation || null);
        
        // 更新当前价格（使用最新的数据点）
        if (result.data && result.data.length > 0) {
          setCurrentPrice(result.data[result.data.length - 1].price);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // 每30秒自动刷新
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [symbol, market, timeFrame]);

  // 根据时间周期聚合数据
  const aggregateData = (rawData: IntradayDataPoint[], frame: TimeFrame): IntradayDataPoint[] => {
    if (frame === 'intraday' || rawData.length === 0) {
      return rawData;
    }
    
    const intervalMinutes = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '60m': 60,
      'daily': 240, // 4小时作为一天
    }[frame] || 1;
    
    const aggregated: IntradayDataPoint[] = [];
    let currentBucket: IntradayDataPoint[] = [];
    let bucketStartMinute = 0;
    
    rawData.forEach((point, index) => {
      const [hours, minutes] = point.time.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes;
      
      if (index === 0) {
        bucketStartMinute = Math.floor(totalMinutes / intervalMinutes) * intervalMinutes;
      }
      
      const currentBucketStart = Math.floor(totalMinutes / intervalMinutes) * intervalMinutes;
      
      if (currentBucketStart !== bucketStartMinute && currentBucket.length > 0) {
        // 聚合当前bucket
        const avgPrice = currentBucket.reduce((sum, p) => sum + p.price, 0) / currentBucket.length;
        const totalVolume = currentBucket.reduce((sum, p) => sum + p.volume, 0);
        const totalAmount = currentBucket.reduce((sum, p) => sum + p.amount, 0);
        
        aggregated.push({
          time: currentBucket[0].time,
          price: avgPrice,
          volume: totalVolume,
          amount: totalAmount,
        });
        
        currentBucket = [];
        bucketStartMinute = currentBucketStart;
      }
      
      currentBucket.push(point);
    });
    
    // 处理最后一个bucket
    if (currentBucket.length > 0) {
      const avgPrice = currentBucket.reduce((sum, p) => sum + p.price, 0) / currentBucket.length;
      const totalVolume = currentBucket.reduce((sum, p) => sum + p.volume, 0);
      const totalAmount = currentBucket.reduce((sum, p) => sum + p.amount, 0);
      
      aggregated.push({
        time: currentBucket[0].time,
        price: avgPrice,
        volume: totalVolume,
        amount: totalAmount,
      });
    }
    
    return aggregated;
  };

  const chartData = aggregateData(data, timeFrame);
  
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

  // 自定义信号点渲染函数
  const renderSignalDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload.signal) return <g />;
    
    const signal = payload.signal;
    const isResonance = signal.resonance && signal.resonance.level >= 2;
    const fillColor = signal.type === 'buy' ? '#ef4444' : '#22c55e';
    const strokeColor = signal.type === 'buy' ? '#dc2626' : '#16a34a';
    
    // 检查是否是悬停的信号或其配对信号
    const isHovered = hoveredSignal?.time === signal.time;
    const isPaired = hoveredSignal?.tradeId && signal.tradeId === hoveredSignal.tradeId && hoveredSignal.time !== signal.time;
    
    // 根据状态调整尺寸
    let radius = isResonance ? 10 : 7;
    if (isHovered) radius += 3; // 悬停时放大
    if (isPaired) radius += 2; // 配对信号也放大
    
    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={isResonance ? 3 : 2.5}
          opacity={isHovered || isPaired ? 1 : 0.9}
          style={{ cursor: 'pointer' }}
          onClick={() => {
            setSelectedSignal(signal);
            setDialogOpen(true);
          }}
          onMouseEnter={() => setHoveredSignal(signal)}
          onMouseLeave={() => setHoveredSignal(null)}
        />
        {/* 配对高亮效果 */}
        {isPaired && (
          <circle
            cx={cx}
            cy={cy}
            r={radius + 5}
            fill="none"
            stroke={fillColor}
            strokeWidth={2}
            opacity={0.6}
            style={{ pointerEvents: 'none' }}
          />
        )}
        {isResonance && (
          <circle
            cx={cx}
            cy={cy}
            r={15}
            fill="none"
            stroke={fillColor}
            strokeWidth={2.5}
            strokeDasharray="4 4"
            opacity={0.8}
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setSelectedSignal(signal);
              setDialogOpen(true);
            }}
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
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="time"
            stroke="#888"
            tick={{ fill: '#888', fontSize: 12 }}
            tickFormatter={(value) => value}
          />
          <YAxis
            stroke="#888"
            tick={{ fill: '#888', fontSize: 12 }}
            domain={['dataMin - 5', 'dataMax + 5']}
            tickFormatter={(value) => value.toFixed(2)}
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
