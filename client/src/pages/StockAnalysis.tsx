import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, TrendingUp, ArrowUpDown, Loader2, Sparkles, BarChart3, Moon, Sun, Star } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Link } from 'wouter';
import { useTheme } from '@/contexts/ThemeContext';
import { StockAnalysisView } from '../components/StockAnalysisView';
import { StockComparisonView } from '../components/StockComparisonView';

interface StockCandidate {
  symbol: string;
  name: string;
  nameCn?: string;
  exchange: string;
  market: 'US' | 'HK' | 'CN';
  currency: string;
}

export default function StockAnalysis() {
  const [activeTab, setActiveTab] = useState<'single' | 'compare'>('single');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<StockCandidate[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockCandidate | null>(null);
  const [period, setPeriod] = useState('1y');
  const [compareSymbols, setCompareSymbols] = useState<string[]>(['', '']);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  const [currentComparison, setCurrentComparison] = useState<any>(null);

  // 搜索股票
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setCandidates([]);
    setSelectedStock(null);
    
    try {
      const response = await fetch(`/api/stock/search?query=${encodeURIComponent(searchQuery.trim())}`);
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        setCandidates(result.data);
        
        // 如果只有一个结果，自动选中
        if (result.data.length === 1) {
          setSelectedStock(result.data[0]);
        }
      } else {
        alert('未找到匹配的股票，请检查代码是否正确');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('搜索失败，请检查网络连接');
    } finally {
      setSearching(false);
    }
  };

  // 分析股票
  const handleAnalyze = async () => {
    if (!selectedStock) {
      alert('请先搜索并选择股票');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch('/api/stock/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          symbol: selectedStock.symbol, 
          market: selectedStock.market, 
          period 
        })
      });

      const result = await response.json();
      if (result.success) {
        setCurrentAnalysis(result.data);
      } else {
        alert(result.error || '分析失败');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('分析失败，请检查网络连接');
    } finally {
      setAnalyzing(false);
    }
  };

  // 对比股票
  const handleCompare = async () => {
    const validSymbols = compareSymbols.filter(s => s.trim());
    if (validSymbols.length < 2) {
      alert('请至少输入2个股票代码');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch('/api/stock/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: validSymbols, period })
      });

      const result = await response.json();
      if (result.success) {
        setCurrentComparison(result.data);
      } else {
        alert(result.error || '对比失败');
      }
    } catch (error) {
      console.error('Comparison error:', error);
      alert('对比失败，请检查网络连接');
    } finally {
      setAnalyzing(false);
    }
  };

  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-primary text-white py-16 relative">
        {/* 主题切换按钮 */}
        <button
          onClick={toggleTheme}
          className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 backdrop-blur-sm"
          aria-label="切换主题"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-yellow-300" />
          ) : (
            <Moon className="w-5 h-5 text-blue-200" />
          )}
        </button>
        <div className="container">
          <div className="max-w-4xl mx-auto text-center space-y-4 animate-fade-in">
            <div className="flex items-center justify-center gap-3 mb-4">
              <BarChart3 className="w-12 h-12" />
              <h1 className="text-4xl md:text-5xl font-bold">智能股票技术分析平台</h1>
            </div>
            <p className="text-xl text-blue-100">
              支持中国大陆、香港和美国市场的专业技术分析
            </p>
            <div className="flex items-center justify-center gap-6 pt-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span>单股分析</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <span>多股对比</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-12">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'single' | 'compare')} className="space-y-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-12">
            <TabsTrigger value="single" className="flex items-center gap-2 text-base">
              <Search className="w-4 h-4" />
              单股分析
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex items-center gap-2 text-base">
              <ArrowUpDown className="w-4 h-4" />
              多股对比
            </TabsTrigger>
          </TabsList>

          {/* 单股分析 */}
          <TabsContent value="single" className="space-y-8 animate-fade-in">
            <Card className="max-w-4xl mx-auto shadow-lg card-hover border-2 bg-black">
              <CardHeader className="bg-black">
                <CardTitle className="text-2xl">股票技术分析</CardTitle>
                <CardDescription className="text-base">
                  输入股票代码，系统将自动识别市场并进行全面分析
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* 搜索区域 */}
                <div className="space-y-4">
                  <Label htmlFor="search" className="text-base font-semibold">股票代码或名称</Label>
                  <div className="flex gap-3">
                    <Input
                      id="search"
                      placeholder="例如: AAPL, 1530, 600519"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="text-lg h-12 border-2 focus:border-primary transition-smooth"
                      disabled={searching}
                    />
                    <Button 
                      onClick={handleSearch} 
                      disabled={searching || !searchQuery.trim()}
                      size="lg"
                      className="px-8 h-12 text-base"
                    >
                      {searching ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          搜索中
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          搜索
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* 候选股票列表 */}
                {candidates.length > 1 && (
                  <div className="space-y-3 animate-fade-in">
                    <Label className="text-base font-semibold">选择股票</Label>
                    <div className="grid gap-3">
                      {candidates.map((candidate) => (
                        <button
                          key={candidate.symbol}
                          onClick={() => setSelectedStock(candidate)}
                          className={`p-4 rounded-lg border-2 text-left transition-smooth hover:shadow-md ${
                            selectedStock?.symbol === candidate.symbol
                              ? 'border-primary bg-gray-900'
                              : 'border-gray-700 hover:border-primary/50 bg-gray-900'
                          }`}
                        >
                          <div className="font-semibold text-lg">
                            {candidate.symbol} - {candidate.nameCn || candidate.name}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {candidate.exchange} · {candidate.market}市场 · {candidate.currency}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 已选股票 */}
                {selectedStock && (
                  <Card className="bg-gray-900 border-2 border-primary/30 animate-fade-in">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold">
                            {selectedStock.symbol} - {selectedStock.nameCn || selectedStock.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {selectedStock.exchange} · {selectedStock.market}市场 · {selectedStock.currency}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <AddToWatchlistButton stock={selectedStock} />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedStock(null);
                              setCandidates([]);
                              setCurrentAnalysis(null);
                            }}
                          >
                            重新搜索
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 时间周期选择 */}
                {selectedStock && (
                  <div className="space-y-3 animate-fade-in">
                    <Label htmlFor="period" className="text-base font-semibold">时间周期</Label>
                    <Select value={period} onValueChange={setPeriod}>
                      <SelectTrigger id="period" className="h-12 text-base border-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1d">1天</SelectItem>
                        <SelectItem value="5d">5天</SelectItem>
                        <SelectItem value="1mo">1个月</SelectItem>
                        <SelectItem value="3mo">3个月</SelectItem>
                        <SelectItem value="6mo">6个月</SelectItem>
                        <SelectItem value="1y">1年</SelectItem>
                        <SelectItem value="2y">2年</SelectItem>
                        <SelectItem value="5y">5年</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 分析按钮 */}
                {selectedStock && (
                  <Button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    size="lg"
                    className="w-full h-14 text-lg font-semibold animate-fade-in"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        分析中...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5 mr-2" />
                        开始分析
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* 分析结果 */}
            {currentAnalysis && (
              <div className="animate-fade-in">
                <StockAnalysisView analysis={currentAnalysis} />
              </div>
            )}
          </TabsContent>

          {/* 多股对比 */}
          <TabsContent value="compare" className="space-y-8 animate-fade-in">
            <Card className="max-w-4xl mx-auto shadow-lg card-hover border-2">
              <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
                <CardTitle className="text-2xl">多股票走势对比</CardTitle>
                <CardDescription className="text-base">
                  输入多个股票代码进行对比分析
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {compareSymbols.map((symbol, index) => (
                  <div key={index} className="space-y-3">
                    <Label htmlFor={`symbol-${index}`} className="text-base font-semibold">
                      股票 {index + 1}
                    </Label>
                    <Input
                      id={`symbol-${index}`}
                      placeholder="例如: AAPL, 1530, 600519"
                      value={symbol}
                      onChange={(e) => {
                        const newSymbols = [...compareSymbols];
                        newSymbols[index] = e.target.value;
                        setCompareSymbols(newSymbols);
                      }}
                      className="text-lg h-12 border-2 focus:border-primary transition-smooth"
                    />
                  </div>
                ))}

                <Button
                  variant="outline"
                  onClick={() => setCompareSymbols([...compareSymbols, ''])}
                  className="w-full h-12 text-base border-2 border-dashed"
                >
                  + 添加更多股票
                </Button>

                <div className="space-y-3">
                  <Label htmlFor="compare-period" className="text-base font-semibold">时间周期</Label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger id="compare-period" className="h-12 text-base border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1mo">1个月</SelectItem>
                      <SelectItem value="3mo">3个月</SelectItem>
                      <SelectItem value="6mo">6个月</SelectItem>
                      <SelectItem value="1y">1年</SelectItem>
                      <SelectItem value="2y">2年</SelectItem>
                      <SelectItem value="5y">5年</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleCompare}
                  disabled={analyzing || compareSymbols.filter(s => s.trim()).length < 2}
                  size="lg"
                  className="w-full h-14 text-lg font-semibold"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      对比中...
                    </>
                  ) : (
                    <>
                      <ArrowUpDown className="w-5 h-5 mr-2" />
                      开始对比
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* 对比结果 */}
            {currentComparison && (
              <div className="animate-fade-in">
                <StockComparisonView comparison={currentComparison} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/**
 * 添加到自选股按钮组件
 */
function AddToWatchlistButton({ stock }: { stock: StockCandidate }) {
  const [isAdded, setIsAdded] = useState(false);

  // 检查是否已在自选股中
  const { data: inWatchlist } = trpc.watchlist.check.useQuery(
    { symbol: stock.symbol },
    { enabled: !!stock.symbol }
  );

  // 添加到自选股
  const addToWatchlist = trpc.watchlist.add.useMutation({
    onSuccess: () => {
      setIsAdded(true);
      alert('已添加到自选股！');
    },
    onError: (error) => {
      alert(`添加失败：${error.message}`);
    },
  });

  const handleAdd = () => {
    addToWatchlist.mutate({
      symbol: stock.symbol,
      nameCn: stock.nameCn || stock.name,
      market: stock.market,
      exchange: stock.exchange,
      currency: stock.currency,
    });
  };

  if (inWatchlist || isAdded) {
    return (
      <Link href="/watchlist">
        <Button variant="outline" size="sm">
          <Star className="w-4 h-4 mr-1 fill-yellow-500 text-yellow-500" />
          已收藏
        </Button>
      </Link>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleAdd}
      disabled={addToWatchlist.isPending}
    >
      <Star className="w-4 h-4 mr-1" />
      {addToWatchlist.isPending ? '添加中...' : '添加自选'}
    </Button>
  );
}
