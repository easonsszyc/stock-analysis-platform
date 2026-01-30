import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, TrendingUp, ArrowUpDown, Loader2 } from 'lucide-react';
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
      // 首先搜索每个股票代码
      const searchPromises = validSymbols.map(async (query) => {
        const response = await fetch(`/api/stock/search?query=${encodeURIComponent(query.trim())}`);
        const result = await response.json();
        return result.success && result.data.length > 0 ? result.data[0] : null;
      });

      const stocks = await Promise.all(searchPromises);
      const validStocks = stocks.filter(s => s !== null);

      if (validStocks.length < 2) {
        alert('部分股票代码无效，请检查');
        setAnalyzing(false);
        return;
      }

      // 使用第一个股票的市场作为基准
      const market = validStocks[0].market;
      const symbols = validStocks.map(s => s.symbol);

      const response = await fetch('/api/stock/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols, market, period })
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto py-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            智能股票技术分析平台
          </h1>
          <p className="text-gray-600 mt-2">支持中国大陆、香港和美国市场的专业技术分析</p>
        </div>
      </header>

      <main className="container mx-auto py-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'single' | 'compare')} className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              单股分析
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              多股对比
            </TabsTrigger>
          </TabsList>

          {/* 单股分析 */}
          <TabsContent value="single" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>股票技术分析</CardTitle>
                <CardDescription>输入股票代码，系统将自动识别市场并进行全面分析</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 搜索区域 */}
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor="search">股票代码或名称</Label>
                      <Input
                        id="search"
                        placeholder="例如: AAPL, 1530, 600519"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                        {searching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                        搜索
                      </Button>
                    </div>
                  </div>

                  {/* 候选列表 */}
                  {candidates.length > 1 && (
                    <div className="space-y-2">
                      <Label>找到多个匹配结果，请选择:</Label>
                      <div className="grid gap-2">
                        {candidates.map((candidate) => (
                          <Button
                            key={candidate.symbol}
                            variant={selectedStock?.symbol === candidate.symbol ? "default" : "outline"}
                            className="justify-start h-auto py-3"
                            onClick={() => setSelectedStock(candidate)}
                          >
                            <div className="text-left">
                              <div className="font-semibold">
                                {candidate.symbol} - {candidate.nameCn || candidate.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {candidate.exchange} · {candidate.market}市场 · {candidate.currency}
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 已选股票 */}
                  {selectedStock && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-lg">
                            {selectedStock.symbol} - {selectedStock.nameCn || selectedStock.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {selectedStock.exchange} · {selectedStock.market}市场 · {selectedStock.currency}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSelectedStock(null);
                          setCandidates([]);
                          setSearchQuery('');
                        }}>
                          重新搜索
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 分析参数 */}
                {selectedStock && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="period">时间周期</Label>
                      <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger id="period">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1mo">1个月</SelectItem>
                          <SelectItem value="3mo">3个月</SelectItem>
                          <SelectItem value="6mo">6个月</SelectItem>
                          <SelectItem value="1y">1年</SelectItem>
                          <SelectItem value="2y">2年</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      onClick={handleAnalyze} 
                      disabled={analyzing}
                      className="w-full"
                      size="lg"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          分析中...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          开始分析
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 分析结果 */}
            {currentAnalysis && <StockAnalysisView analysis={currentAnalysis} />}
          </TabsContent>

          {/* 多股对比 */}
          <TabsContent value="compare" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>多股票对比分析</CardTitle>
                <CardDescription>输入多个股票代码进行走势对比（无需添加后缀）</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {compareSymbols.map((symbol, index) => (
                  <div key={index}>
                    <Label htmlFor={`symbol-${index}`}>股票代码 {index + 1}</Label>
                    <Input
                      id={`symbol-${index}`}
                      placeholder="例如: AAPL, 1530, 600519"
                      value={symbol}
                      onChange={(e) => {
                        const newSymbols = [...compareSymbols];
                        newSymbols[index] = e.target.value;
                        setCompareSymbols(newSymbols);
                      }}
                    />
                  </div>
                ))}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCompareSymbols([...compareSymbols, ''])}
                  >
                    添加股票
                  </Button>
                  {compareSymbols.length > 2 && (
                    <Button
                      variant="outline"
                      onClick={() => setCompareSymbols(compareSymbols.slice(0, -1))}
                    >
                      移除最后一个
                    </Button>
                  )}
                </div>

                <div>
                  <Label htmlFor="compare-period">时间周期</Label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger id="compare-period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1mo">1个月</SelectItem>
                      <SelectItem value="3mo">3个月</SelectItem>
                      <SelectItem value="6mo">6个月</SelectItem>
                      <SelectItem value="1y">1年</SelectItem>
                      <SelectItem value="2y">2年</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleCompare} 
                  disabled={analyzing}
                  className="w-full"
                  size="lg"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      对比中...
                    </>
                  ) : (
                    <>
                      <ArrowUpDown className="mr-2 h-4 w-4" />
                      开始对比
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* 对比结果 */}
            {currentComparison && <StockComparisonView comparison={currentComparison} />}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
