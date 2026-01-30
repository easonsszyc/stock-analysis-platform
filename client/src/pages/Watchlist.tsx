/**
 * 自选股监控页面
 * 实时监控用户关注的股票价格变化和买卖信号
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2, TrendingUp, TrendingDown, Bell, BellOff, RefreshCw, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Link } from 'wouter';
import { PriceAlertDialog } from '@/components/PriceAlertDialog';
import { requestNotificationPermission, sendPriceAlertNotification, hasNotificationPermission } from '@/lib/notifications';

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

interface PriceAlert {
  id: number;
  symbol: string;
  alertType: 'above' | 'below';
  targetPrice: string;
  isActive: number;
  isTriggered: number;
}

export default function Watchlist() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<{ symbol: string; price: number } | null>(null);
  const [notificationEnabled, setNotificationEnabled] = useState(hasNotificationPermission());

  // 用于跟踪已触发的预警，避免重复通知
  const triggeredAlertsRef = useRef<Set<number>>(new Set());

  // 获取自选股列表
  const { data: watchlist = [], refetch: refetchWatchlist } = trpc.watchlist.list.useQuery();
  
  // 获取实时行情
  const { data: quotes = [], refetch: refetchQuotes, isLoading: quotesLoading } = trpc.watchlist.getQuotes.useQuery();

  // 获取所有价格预警
  const { data: allAlerts = [], refetch: refetchAlerts } = trpc.priceAlerts.listAll.useQuery();

  // 删除自选股
  const removeMutation = trpc.watchlist.remove.useMutation({
    onSuccess: () => {
      refetchWatchlist();
      refetchQuotes();
      refetchAlerts();
    },
  });

  // 添加自选股
  const addMutation = trpc.watchlist.add.useMutation({
    onSuccess: () => {
      refetchWatchlist();
      setAddDialogOpen(false);
      setNewSymbol('');
    },
  });

  // 保存价格预警
  const upsertAlertMutation = trpc.priceAlerts.upsert.useMutation({
    onSuccess: () => {
      refetchAlerts();
    },
  });

  // 请求通知权限
  const handleRequestNotification = async () => {
    const granted = await requestNotificationPermission();
    setNotificationEnabled(granted);
    if (!granted) {
      alert('通知权限被拒绝，无法接收价格预警通知');
    }
  };

  // 检查价格预警
  useEffect(() => {
    if (!notificationEnabled || quotes.length === 0 || allAlerts.length === 0) {
      return;
    }

    // 创建价格映射
    const priceMap = new Map<string, number>();
    quotes.forEach((quote: any) => {
      if (quote && quote.symbol && quote.price) {
        priceMap.set(quote.symbol, quote.price);
      }
    });

    // 检查每个预警
    allAlerts.forEach((alert: PriceAlert) => {
      // 跳过已触发或已通知的预警
      if (alert.isTriggered || triggeredAlertsRef.current.has(alert.id)) {
        return;
      }

      const currentPrice = priceMap.get(alert.symbol);
      if (currentPrice === undefined) {
        return;
      }

      const targetPrice = parseFloat(alert.targetPrice);
      let triggered = false;

      if (alert.alertType === 'above' && currentPrice >= targetPrice) {
        triggered = true;
      } else if (alert.alertType === 'below' && currentPrice <= targetPrice) {
        triggered = true;
      }

      if (triggered) {
        // 发送通知
        sendPriceAlertNotification(alert.symbol, currentPrice, targetPrice, alert.alertType);
        
        // 标记为已触发
        triggeredAlertsRef.current.add(alert.id);
        
        // 更新数据库状态（可选）
        // 这里可以调用API更新isTriggered字段
      }
    });
  }, [quotes, allAlerts, notificationEnabled]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetchQuotes();
      refetchAlerts();
      setLastUpdate(new Date());
    }, 30000); // 每30秒刷新一次

    return () => clearInterval(interval);
  }, [autoRefresh, refetchQuotes, refetchAlerts]);

  // 手动刷新
  const handleRefresh = () => {
    refetchQuotes();
    refetchAlerts();
    setLastUpdate(new Date());
  };

  // 打开价格预警对话框
  const handleOpenAlertDialog = (symbol: string, price: number) => {
    setSelectedStock({ symbol, price });
    setAlertDialogOpen(true);
  };

  // 保存价格预警
  const handleSaveAlert = async (priceUpper: number | null, priceLower: number | null) => {
    if (!selectedStock) return;
    
    await upsertAlertMutation.mutateAsync({
      symbol: selectedStock.symbol,
      priceUpper,
      priceLower,
    });
  };

  // 获取股票的预警设置
  const getStockAlerts = (symbol: string) => {
    const alerts = allAlerts.filter((a: PriceAlert) => a.symbol === symbol && a.isActive);
    const priceUpper = alerts.find((a: PriceAlert) => a.alertType === 'above')?.targetPrice;
    const priceLower = alerts.find((a: PriceAlert) => a.alertType === 'below')?.targetPrice;
    
    return {
      priceUpper: priceUpper ? parseFloat(priceUpper) : undefined,
      priceLower: priceLower ? parseFloat(priceLower) : undefined,
    };
  };

  // 合并watchlist和quotes数据
  const stocksWithQuotes = watchlist.map((stock: WatchlistStock) => {
    const quote = quotes.find((q: any) => q && q.symbol === stock.symbol);
    const alerts = getStockAlerts(stock.symbol);
    const hasAlerts = alerts.priceUpper !== undefined || alerts.priceLower !== undefined;
    
    return {
      ...stock,
      quote,
      alerts,
      hasAlerts,
    };
  });

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">自选股监控</h1>
          <p className="text-muted-foreground mt-1">
            实时监控您关注的股票价格变化和买卖信号
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 通知权限按钮 */}
          {!notificationEnabled && (
            <Button variant="outline" onClick={handleRequestNotification} className="gap-2">
              <Bell className="w-4 h-4" />
              启用通知
            </Button>
          )}
          
          {/* 自动刷新开关 */}
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="gap-2"
          >
            {autoRefresh ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            {autoRefresh ? '自动刷新' : '已暂停'}
          </Button>

          {/* 手动刷新按钮 */}
          <Button variant="outline" onClick={handleRefresh} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${quotesLoading ? 'animate-spin' : ''}`} />
            刷新
          </Button>

          {/* 添加自选股按钮 */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                添加自选股
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加自选股</DialogTitle>
                <DialogDescription>
                  输入股票代码添加到自选股列表
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="symbol">股票代码</Label>
                  <Input
                    id="symbol"
                    placeholder="例如: AAPL, 1530, 600519"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    if (newSymbol.trim()) {
                      // 自动检测市场
                      let market = 'US';
                      const symbol = newSymbol.trim();
                      if (/^\d{4,6}$/.test(symbol)) {
                        market = 'HK'; // 香港股票
                      } else if (/^6\d{5}$/.test(symbol)) {
                        market = 'CN'; // A股
                      }
                      addMutation.mutate({ symbol, market });
                    }
                  }}
                  disabled={!newSymbol.trim() || addMutation.isPending}
                >
                  {addMutation.isPending ? '添加中...' : '添加'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 最后更新时间 */}
      <div className="text-sm text-muted-foreground">
        最后更新: {lastUpdate.toLocaleTimeString('zh-CN')}
      </div>

      {/* 自选股列表 */}
      {stocksWithQuotes.length === 0 ? (
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="text-muted-foreground">您还没有添加任何自选股</div>
              <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                添加第一只股票
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stocksWithQuotes.map((stock) => (
            <Card key={stock.id} className="bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{stock.symbol}</CardTitle>
                    <CardDescription className="text-sm">
                      {stock.nameCn || stock.market}
                      {stock.hasAlerts && (
                        <span className="ml-2 text-primary">
                          <Bell className="w-3 h-3 inline" />
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMutation.mutate({ watchlistId: stock.id })}
                    className="h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {stock.quote ? (
                  <>
                    {/* 价格信息 */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">{stock.quote.price.toFixed(2)}</span>
                      <span className={`text-sm ${stock.quote.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {stock.quote.change >= 0 ? '+' : ''}{stock.quote.change.toFixed(2)} ({stock.quote.changePercent.toFixed(2)}%)
                      </span>
                    </div>

                    {/* 买卖信号 */}
                    {stock.quote.signal && stock.quote.signal !== 'hold' && (
                      <div className="flex items-center gap-2">
                        {stock.quote.signal === 'buy' ? (
                          <div className="flex items-center gap-1 text-green-500">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-sm font-medium">买入信号</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-500">
                            <TrendingDown className="w-4 h-4" />
                            <span className="text-sm font-medium">卖出信号</span>
                          </div>
                        )}
                        {stock.quote.signalStrength && (
                          <span className="text-xs text-muted-foreground">
                            强度: {stock.quote.signalStrength}
                          </span>
                        )}
                      </div>
                    )}

                    {/* 操作按钮 */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAlertDialog(stock.symbol, stock.quote!.price)}
                        className="flex-1 gap-2"
                      >
                        <Bell className="w-3 h-3" />
                        {stock.hasAlerts ? '修改预警' : '设置预警'}
                      </Button>
                      <Link href={`/?symbol=${stock.symbol}`}>
                        <Button variant="outline" size="sm" className="gap-2">
                          查看详情
                        </Button>
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">加载中...</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 价格预警设置对话框 */}
      {selectedStock && (
        <PriceAlertDialog
          open={alertDialogOpen}
          onOpenChange={setAlertDialogOpen}
          symbol={selectedStock.symbol}
          currentPrice={selectedStock.price}
          existingAlert={getStockAlerts(selectedStock.symbol)}
          onSave={handleSaveAlert}
        />
      )}
    </div>
  );
}
