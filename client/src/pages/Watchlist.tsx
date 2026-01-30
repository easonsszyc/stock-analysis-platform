/**
 * 自选股监控页面
 * 实时监控用户关注的股票价格变化和买卖信号
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, TrendingUp, TrendingDown, Bell, BellOff, RefreshCw, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Link } from 'wouter';

interface WatchlistStock {
  id: number;
  symbol: string;
  nameCn?: string | null;
  market: string;
  exchange?: string | null;
  currency?: string | null;
  addedAt: Date;
  updatedAt: Date;
}

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  signal?: 'buy' | 'sell' | 'hold';
  signalStrength?: number;
}

export default function Watchlist() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // 获取自选股列表
  const { data: watchlist = [], refetch: refetchWatchlist } = trpc.watchlist.list.useQuery();
  
  // 获取实时行情
  const { data: quotes = [], refetch: refetchQuotes, isLoading: quotesLoading } = trpc.watchlist.getQuotes.useQuery();

  // 删除自选股
  const removeMutation = trpc.watchlist.remove.useMutation({
    onSuccess: () => {
      refetchWatchlist();
      refetchQuotes();
    },
  });

  // 添加自选股
  const addMutation = trpc.watchlist.add.useMutation({
    onSuccess: () => {
      refetchWatchlist();
      refetchQuotes();
      setAddDialogOpen(false);
      setNewSymbol('');
      alert('添加成功！');
    },
    onError: (error) => {
      alert(`添加失败：${error.message}`);
    },
  });

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetchQuotes();
      setLastUpdate(new Date());
    }, 30000); // 每30秒刷新一次

    return () => clearInterval(interval);
  }, [autoRefresh, refetchQuotes]);

  // 手动刷新
  const handleRefresh = () => {
    refetchQuotes();
    setLastUpdate(new Date());
  };

  // 添加自选股
  const handleAddStock = async () => {
    if (!newSymbol.trim()) {
      alert('请输入股票代码');
      return;
    }

    // 简单的市场判断逻辑
    let market = 'US';
    if (/^\d{6}$/.test(newSymbol)) {
      market = 'CN';
    } else if (/^\d{4}$/.test(newSymbol)) {
      market = 'HK';
    }

    addMutation.mutate({
      symbol: newSymbol.toUpperCase(),
      market,
    });
  };

  // 删除自选股
  const handleRemove = (watchlistId: number) => {
    if (confirm('确定要删除这只股票吗？')) {
      removeMutation.mutate({ watchlistId });
    }
  };

  // 合并watchlist和quotes数据
  const stocksWithQuotes = watchlist.map((stock: any) => {
    const quote = quotes.find((q: any) => q.symbol === stock.symbol);
    return {
      ...stock,
      quote,
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">自选股监控</h1>
          <p className="text-blue-100">实时监控您关注的股票价格变化和买卖信号</p>
        </div>

        {/* 操作栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  添加自选股
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700">
                <DialogHeader>
                  <DialogTitle>添加自选股</DialogTitle>
                  <DialogDescription>
                    输入股票代码，支持美股、港股、A股
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="symbol">股票代码</Label>
                    <Input
                      id="symbol"
                      placeholder="例如: AAPL, 1530, 600519"
                      value={newSymbol}
                      onChange={(e) => setNewSymbol(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddStock();
                        }
                      }}
                      className="bg-black border-gray-700"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setAddDialogOpen(false)}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleAddStock}
                    disabled={addMutation.isPending}
                  >
                    {addMutation.isPending ? '添加中...' : '添加'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={quotesLoading}
              title="刷新数据"
            >
              <RefreshCw className={`w-4 h-4 ${quotesLoading ? 'animate-spin' : ''}`} />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? '关闭自动刷新' : '开启自动刷新'}
            >
              {autoRefresh ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="text-sm text-gray-400">
            最后更新：{lastUpdate.toLocaleTimeString()}
          </div>
        </div>

        {/* 股票列表 */}
        {stocksWithQuotes.length === 0 ? (
          <Card className="bg-black/50 border-gray-700">
            <CardContent className="py-12 text-center">
              <p className="text-gray-400 mb-4">您还没有添加任何自选股</p>
              <Button onClick={() => setAddDialogOpen(true)}>
                添加第一只股票
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stocksWithQuotes.map((stock: any) => {
              const quote = stock.quote;
              const isPositive = quote && quote.changePercent > 0;
              const isNegative = quote && quote.changePercent < 0;

              return (
                <Card key={stock.id} className="bg-black/50 border-gray-700 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{stock.symbol}</CardTitle>
                        <CardDescription>
                          {stock.nameCn || stock.symbol}
                        </CardDescription>
                        <div className="text-xs text-gray-500 mt-1">
                          {stock.exchange} · {stock.market}市场 · {stock.currency}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(stock.id)}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {quote ? (
                      <div className="space-y-3">
                        {/* 价格信息 */}
                        <div>
                          <div className="text-3xl font-bold">
                            {quote.price?.toFixed(2) || '--'}
                          </div>
                          <div className={`flex items-center gap-2 text-sm ${
                            isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-gray-400'
                          }`}>
                            {isPositive ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : isNegative ? (
                              <TrendingDown className="w-4 h-4" />
                            ) : null}
                            <span>
                              {quote.change > 0 ? '+' : ''}{quote.change?.toFixed(2) || '--'}
                              ({quote.changePercent > 0 ? '+' : ''}{quote.changePercent?.toFixed(2) || '--'}%)
                            </span>
                          </div>
                        </div>

                        {/* 买卖信号 */}
                        {quote.signal && quote.signal !== 'hold' && (
                          <div className={`px-3 py-2 rounded-lg ${
                            quote.signal === 'buy' 
                              ? 'bg-green-500/20 border border-green-500/30' 
                              : 'bg-red-500/20 border border-red-500/30'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className={`font-semibold ${
                                quote.signal === 'buy' ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {quote.signal === 'buy' ? '买入信号' : '卖出信号'}
                              </span>
                              {quote.signalStrength && (
                                <span className="text-xs text-gray-400">
                                  强度: {quote.signalStrength}/100
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 操作按钮 */}
                        <Link href={`/?symbol=${stock.symbol}`}>
                          <Button variant="outline" className="w-full">
                            查看详情
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 py-4">
                        加载中...
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
