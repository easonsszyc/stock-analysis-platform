/**
 * 分时走势图组件
 * 支持多时间周期切换和智能买卖点标注
 */
import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  // 渲染买卖信号标注
  const renderSignals = () => {
    return signals.map((signal, index) => {
      const dataPoint = chartData.find(d => d.time === signal.time);
      if (!dataPoint) return null;
      
      return (
        <ReferenceDot
          key={index}
          x={signal.time}
          y={signal.price}
          r={6}
          fill={signal.type === 'buy' ? '#ef4444' : '#22c55e'}
          stroke="#fff"
          strokeWidth={2}
          onClick={() => setSelectedSignal(signal)}
          style={{ cursor: 'pointer' }}
        />
      );
    });
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
    <Card className="p-6">
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
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
          {renderSignals()}
        </LineChart>
      </ResponsiveContainer>

      {/* 信号详情弹窗 */}
      {selectedSignal && (
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {selectedSignal.type === 'buy' ? (
                <TrendingUp className="h-5 w-5 text-red-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-green-500" />
              )}
              <span className="font-semibold">
                {selectedSignal.type === 'buy' ? '买入信号' : '卖出信号'} @ {selectedSignal.time}
              </span>
              <span className="text-sm text-muted-foreground">
                价格 {selectedSignal.price.toFixed(2)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedSignal(null)}
            >
              关闭
            </Button>
          </div>
          
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">信号强度:</span>
              <span className="ml-2 font-semibold">{selectedSignal.strength}/100</span>
            </div>
            
            <div>
              <span className="text-muted-foreground">信号原因:</span>
              <ul className="ml-6 mt-1 list-disc">
                {selectedSignal.reasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>
            
            {selectedSignal.stopLoss && (
              <div>
                <span className="text-muted-foreground">止损位:</span>
                <span className="ml-2 font-semibold text-green-500">
                  {selectedSignal.stopLoss.toFixed(2)}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({((selectedSignal.stopLoss - selectedSignal.price) / selectedSignal.price * 100).toFixed(2)}%)
                </span>
              </div>
            )}
            
            {selectedSignal.target && (
              <div>
                <span className="text-muted-foreground">目标位:</span>
                <span className="ml-2 font-semibold text-red-500">
                  {selectedSignal.target.toFixed(2)}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({((selectedSignal.target - selectedSignal.price) / selectedSignal.price * 100).toFixed(2)}%)
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
