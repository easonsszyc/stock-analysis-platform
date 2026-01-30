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
  Legend,
  ResponsiveContainer,
  Scatter,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SignalDetailDialog } from './SignalDetailDialog';

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
  const [currentPrice, setCurrentPrice] = useState(0);

  // 获取分时数据和买卖信号
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 清理股票代码，移除Yahoo Finance后缀（如.SS, .HK）
        const cleanSymbol = symbol.split('.')[0];
        
        const response = await fetch(
          `${window.location.origin}/api/intraday/data?symbol=${cleanSymbol}&market=${market}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch intraday data');
        }
        
        const result = await response.json();
        setData(result.data);
        setSignals(result.signals);
        
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

  // 准备Scatter数据
  const prepareScatterData = () => {
    console.log(`[IntradayChart] Rendering ${signals.length} signals`);
    console.log('[IntradayChart] First signal:', signals[0]);
    console.log('[IntradayChart] First chartData:', chartData[0]);
    console.log('[IntradayChart] chartData length:', chartData.length);
    
    // 辅助函数：将时间字符串转换为分钟数（从00:00开始）
    const timeToMinutes = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    let matchedCount = 0;
    let skippedCount = 0;
    
    const result = signals.map((signal, index) => {
      // 策略1: 直接匹配time
      let dataPoint = chartData.find(d => d.time === signal.time);
      
      // 策略2: 通过价格范围匹配（宽松匹配，允许1%误差）
      if (!dataPoint) {
        dataPoint = chartData.find(d => 
          Math.abs(d.price - signal.price) / signal.price < 0.01
        );
      }
      
      // 策略3: 通过时间范围匹配，找到最接近的chartData点
      if (!dataPoint) {
        const signalMinutes = timeToMinutes(signal.time);
        let closestPoint = chartData[0];
        let minDiff = Math.abs(timeToMinutes(chartData[0].time) - signalMinutes);
        
        for (const point of chartData) {
          const diff = Math.abs(timeToMinutes(point.time) - signalMinutes);
          if (diff < minDiff) {
            minDiff = diff;
            closestPoint = point;
          }
        }
        
        // 只有时间差在5分钟以内才使用该点
        if (minDiff <= 5) {
          dataPoint = closestPoint;
          if (index < 3) {
            console.log(`[IntradayChart] Matched signal ${signal.time} to chartData ${closestPoint.time} (diff: ${minDiff} min)`);
          }
        }
      }
      
      // 如果还是找不到匹配的点，跳过该信号
      if (!dataPoint) {
        skippedCount++;
        if (index < 3) {
          console.warn(`[IntradayChart] Skipping signal at ${signal.time} - no matching chartData point found`);
        }
        return null;
      }
      
      matchedCount++;
      if (index < 3) {
        console.log(`[IntradayChart] Matched signal #${index}: signal.time=${signal.time}, dataPoint.time=${dataPoint.time}, dataPoint.price=${dataPoint.price}`);
      }
      
      // 判断是否为共振信号（高亮显示）
      const isResonance = signal.resonance && signal.resonance.level >= 2;
      
      // 添加调试日志
      if (index < 3) {
        console.log(`[IntradayChart] Preparing scatter point #${index}: time=${dataPoint.time}, price=${dataPoint.price}, type=${signal.type}`);
      }
      
      return {
        time: dataPoint.time,
        price: dataPoint.price,
        type: signal.type,
        isResonance,
        signal,  // 保存原始信号数据以便点击时使用
      };
    });
    
    console.log(`[IntradayChart] Signal matching summary: matched=${matchedCount}, skipped=${skippedCount}`);
    
    const scatterData = result.filter(item => item !== null);
    console.log(`[IntradayChart] Prepared ${scatterData.length} scatter points`);
    return scatterData;
  };
  
  // 获取买入和卖出信号数据
  const scatterData = prepareScatterData();
  const buySignals = scatterData.filter(d => d.type === 'buy');
  const sellSignals = scatterData.filter(d => d.type === 'sell');
  
  console.log(`[IntradayChart] Buy signals: ${buySignals.length}, Sell signals: ${sellSignals.length}`);

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
        
        <div className="text-sm text-muted-foreground">
          {signals.length > 0 && (
            <span>检测到 {signals.length} 个交易信号</span>
          )}
        </div>
      </div>

      {/* 走势图 */}
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
          <Legend />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="价格"
            isAnimationActive={false}
          />
          {/* 买入信号 */}
          {buySignals.length > 0 && (
            <Scatter
              name="买入信号"
              data={buySignals}
              fill="#22c55e"
              shape="circle"
              dataKey="price"
              isAnimationActive={false}
              onClick={(data) => {
                if (data && data.signal) {
                  setSelectedSignal(data.signal);
                  setDialogOpen(true);
                }
              }}
            />
          )}
          {/* 卖出信号 */}
          {sellSignals.length > 0 && (
            <Scatter
              name="卖出信号"
              data={sellSignals}
              fill="#ef4444"
              shape="circle"
              dataKey="price"
              isAnimationActive={false}
              onClick={(data) => {
                if (data && data.signal) {
                  setSelectedSignal(data.signal);
                  setDialogOpen(true);
                }
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* 信号详情弹窗 */}
      <SignalDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        signal={selectedSignal}
        currentPrice={currentPrice}
      />
    </Card>
  );
}
