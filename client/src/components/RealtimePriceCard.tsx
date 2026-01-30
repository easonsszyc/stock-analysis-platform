import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RealtimeQuote {
  symbol: string;
  name: string;
  currentPrice: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  change: number;
  changePercent: number;
  timestamp: string;
  currency: string;
  market: 'US' | 'HK' | 'CN';
}

interface RealtimePriceCardProps {
  symbol: string;
  market: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // 刷新间隔（秒）
}

export function RealtimePriceCard({
  symbol,
  market,
  autoRefresh = true,
  refreshInterval = 30,
}: RealtimePriceCardProps) {
  const [quote, setQuote] = useState<RealtimeQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [priceAnimation, setPriceAnimation] = useState<'up' | 'down' | null>(null);

  const fetchQuote = async () => {
    try {
      const response = await fetch(
        `/api/realtime/quote?symbol=${encodeURIComponent(symbol)}&market=${encodeURIComponent(market)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch realtime quote');
      }

      const data: RealtimeQuote = await response.json();
      
      // 检测价格变化并触发动画
      if (quote && data.currentPrice !== quote.currentPrice) {
        setPriceAnimation(data.currentPrice > quote.currentPrice ? 'up' : 'down');
        setTimeout(() => setPriceAnimation(null), 1000);
      }

      setQuote(data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching realtime quote:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote();

    if (autoRefresh) {
      const interval = setInterval(fetchQuote, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [symbol, market, autoRefresh, refreshInterval]);

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">加载实时数据...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !quote) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            <p className="font-medium">无法获取实时数据</p>
            <p className="text-sm mt-1">{error || '数据源暂时不可用'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPositive = quote.change >= 0;
  // 中国市场习惯：红涨绿跌
  const changeColor = isPositive ? 'text-red-500' : 'text-green-500';
  const bgColor = isPositive ? 'bg-red-500/10' : 'bg-green-500/10';
  const borderColor = isPositive ? 'border-red-500/30' : 'border-green-500/30';

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 shadow-lg shadow-black/20">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          {/* 左侧：价格信息 */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-2xl font-bold">{quote.name || quote.symbol}</h3>
              <span className="text-sm text-muted-foreground">{quote.symbol}</span>
            </div>

            <div className="flex items-baseline gap-4">
              <div
                className={cn(
                  'text-6xl font-bold transition-all duration-300',
                  changeColor,
                  priceAnimation === 'up' && 'scale-110',
                  priceAnimation === 'down' && 'scale-90'
                )}
              >
                {quote.currentPrice.toFixed(2)}
                <span className="text-3xl ml-2 text-muted-foreground">{quote.currency}</span>
              </div>

              <div className={cn('flex items-center gap-2', changeColor)}>
                {isPositive ? (
                  <TrendingUp className="h-6 w-6" />
                ) : (
                  <TrendingDown className="h-6 w-6" />
                )}
                <div className="text-xl font-semibold">
                  <div>{isPositive ? '+' : ''}{quote.change.toFixed(2)}</div>
                  <div className="text-sm">
                    ({isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：详细数据 */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <div className="text-muted-foreground">今开</div>
              <div className="font-semibold">{quote.open.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">昨收</div>
              <div className="font-semibold">{quote.previousClose.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">最高</div>
              <div className="font-semibold text-red-500">{quote.high.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">最低</div>
              <div className="font-semibold text-green-500">{quote.low.toFixed(2)}</div>
            </div>
            <div className="col-span-2">
              <div className="text-muted-foreground">成交量</div>
              <div className="font-semibold">{quote.volume.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* 底部：数据来源和更新时间 */}
        <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>数据来源: 腾讯财经</span>
            <span>市场: {quote.market === 'US' ? '美股' : quote.market === 'HK' ? '港股' : 'A股'}</span>
            <span className="text-amber-500">⚠️ 数据延迟约5秒</span>
          </div>
          <div className="flex items-center gap-2">
            {autoRefresh && (
              <RefreshCw className="h-3 w-3 animate-spin" />
            )}
            <span>更新于: {lastUpdate.toLocaleTimeString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
