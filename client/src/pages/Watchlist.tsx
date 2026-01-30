/**
 * 自选股监控面板
 * 实时监控用户自选股票的价格变化和买卖信号
 */

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, TrendingUp, TrendingDown, Minus, Bell, BellOff, Plus } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface WatchlistItem {
  id: number;
  symbol: string;
  nameCn: string | null;
  market: string;
  exchange: string | null;
  currency: string | null;
  addedAt: Date;
  currentPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  latestSignal?: {
    type: 'buy' | 'sell' | 'hold';
    strength: number;
    confidence: number;
    time: string;
  };
}

export default function Watchlist() {

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newStock, setNewStock] = useState({
    symbol: '',
    market: 'US' as 'US' | 'HK' | 'CN',
  });

  // 获取自选股列表
  const { data: watchlist, isLoading, refetch } = trpc.watchlist.list.useQuery();

  // 删除自选股
  const removeFromWatchlist = trpc.watchlist.remove.useMutation({
    onSuccess: () => {
      alert('移除成功！');
      refetch();
    },
    onError: (error) => {
      alert(`移除失败：${error.message}`);
    },
  });

  // 添加自选股
  const addToWatchlist = trpc.watchlist.add.useMutation({
    onSuccess: () => {
      alert('添加成功！');
      setIsAddDialogOpen(false);
      setNewStock({ symbol: '', market: 'US' });
      refetch();
    },
    onError: (error) => {
      alert(`添加失败：${error.message}`);
    },
  });

  const handleAddStock = () => {
    if (!newStock.symbol.trim()) {
      alert('请输入股票代码！');
      return;
    }

    addToWatchlist.mutate({
      symbol: newStock.symbol.toUpperCase(),
      market: newStock.market,
    });
  };

  const handleRemoveStock = (watchlistId: number) => {
    removeFromWatchlist.mutate({ watchlistId });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* 页面标题和添加按钮 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">自选股监控</h1>
          <p className="text-muted-foreground mt-2">
            实时监控您关注的股票价格变化和买卖信号
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              添加自选股
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle>添加自选股</DialogTitle>
              <DialogDescription>
                输入股票代码和选择市场，将股票添加到自选列表
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="symbol">股票代码</Label>
                <Input
                  id="symbol"
                  placeholder="例如：AAPL, 1530, 600519"
                  value={newStock.symbol}
                  onChange={(e) => setNewStock({ ...newStock, symbol: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="market">市场</Label>
                <Select
                  value={newStock.market}
                  onValueChange={(value) => setNewStock({ ...newStock, market: value as 'US' | 'HK' | 'CN' })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">美国市场</SelectItem>
                    <SelectItem value="HK">香港市场</SelectItem>
                    <SelectItem value="CN">中国大陆市场</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAddStock}
                disabled={addToWatchlist.isPending}
                className="w-full"
              >
                {addToWatchlist.isPending ? '添加中...' : '确认添加'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 自选股列表 */}
      {!watchlist || watchlist.length === 0 ? (
        <Card className="bg-black border-gray-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-muted-foreground mb-4">您还没有添加任何自选股</div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              添加第一只股票
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {watchlist.map((item) => (
            <WatchlistCard
              key={item.id}
              item={item as WatchlistItem}
              onRemove={handleRemoveStock}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 自选股卡片组件
 */
function WatchlistCard({
  item,
  onRemove,
}: {
  item: WatchlistItem;
  onRemove: (id: number) => void;
}) {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [latestSignal, setLatestSignal] = useState<any>(null);

  // TODO: 实现实时价格监控
  // 这里需要定期调用API获取最新价格和信号
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     // 获取最新价格和信号
  //   }, 30000); // 每30秒更新一次
  //   return () => clearInterval(interval);
  // }, [item.symbol]);

  const getSignalIcon = (type: 'buy' | 'sell' | 'hold') => {
    if (type === 'buy') return <TrendingUp className="w-4 h-4" />;
    if (type === 'sell') return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getSignalColor = (type: 'buy' | 'sell' | 'hold') => {
    if (type === 'buy') return 'text-green-500';
    if (type === 'sell') return 'text-red-500';
    return 'text-gray-500';
  };

  return (
    <Card className="bg-gray-900 border-gray-700 hover:border-gray-600 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{item.symbol}</CardTitle>
            <CardDescription>
              {item.nameCn || item.exchange || item.market}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(item.id)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 价格信息 */}
          {currentPrice && (
            <div>
              <div className="text-2xl font-bold">{currentPrice.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">
                {item.currency || 'USD'}
              </div>
            </div>
          )}

          {/* 最新信号 */}
          {latestSignal && (
            <div className="flex items-center gap-2">
              <div className={getSignalColor(latestSignal.type)}>
                {getSignalIcon(latestSignal.type)}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {latestSignal.type === 'buy' ? '买入信号' : latestSignal.type === 'sell' ? '卖出信号' : '持有'}
                </div>
                <div className="text-xs text-muted-foreground">
                  强度: {latestSignal.strength} | 置信度: {latestSignal.confidence}
                </div>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1">
              查看详情
            </Button>
            <Button variant="outline" size="sm">
              <Bell className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
