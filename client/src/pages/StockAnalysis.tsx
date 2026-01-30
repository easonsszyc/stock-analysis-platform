import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, TrendingUp, BarChart3, ArrowUpDown } from 'lucide-react';
import { StockAnalysisView } from '../components/StockAnalysisView';
import { StockComparisonView } from '../components/StockComparisonView';
import type { MarketType } from '@shared/stock-types';

export default function StockAnalysis() {
  const [activeTab, setActiveTab] = useState<'single' | 'compare'>('single');
  const [symbol, setSymbol] = useState('');
  const [market, setMarket] = useState<MarketType>('US');
  const [period, setPeriod] = useState('1y');
  const [compareSymbols, setCompareSymbols] = useState<string[]>(['']);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  const [currentComparison, setCurrentComparison] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!symbol.trim()) return;

    setAnalyzing(true);
    try {
      const response = await fetch('/api/stock/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: symbol.trim(), market, period })
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
        body: JSON.stringify({ symbols: validSymbols, market, period })
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

  const addCompareSymbol = () => {
    if (compareSymbols.length < 5) {
      setCompareSymbols([...compareSymbols, '']);
    }
  };

  const removeCompareSymbol = (index: number) => {
    setCompareSymbols(compareSymbols.filter((_, i) => i !== index));
  };

  const updateCompareSymbol = (index: number, value: string) => {
    const newSymbols = [...compareSymbols];
    newSymbols[index] = value;
    setCompareSymbols(newSymbols);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">智能股票技术分析平台</h1>
        <p className="text-muted-foreground">支持中国大陆、香港和美国市场的专业技术分析</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            单股分析
          </TabsTrigger>
          <TabsTrigger value="compare" className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            多股对比
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>股票技术分析</CardTitle>
              <CardDescription>输入股票代码进行全面的技术分析</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="symbol">股票代码</Label>
                  <Input
                    id="symbol"
                    placeholder="例如: AAPL, 1530.HK, 600519"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                  />
                </div>
                <div>
                  <Label htmlFor="market">市场</Label>
                  <Select value={market} onValueChange={(v) => setMarket(v as MarketType)}>
                    <SelectTrigger id="market">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">美股</SelectItem>
                      <SelectItem value="HK">港股</SelectItem>
                      <SelectItem value="CN">A股</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                      <SelectItem value="5y">5年</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleAnalyze} disabled={analyzing || !symbol.trim()} className="w-full md:w-auto">
                <Search className="mr-2 h-4 w-4" />
                {analyzing ? '分析中...' : '开始分析'}
              </Button>
            </CardContent>
          </Card>

          {currentAnalysis && <StockAnalysisView analysis={currentAnalysis} />}
        </TabsContent>

        <TabsContent value="compare" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>多股票对比分析</CardTitle>
              <CardDescription>同时对比多只股票的走势和技术指标（最多5只）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="compare-market">市场</Label>
                  <Select value={market} onValueChange={(v) => setMarket(v as MarketType)}>
                    <SelectTrigger id="compare-market">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">美股</SelectItem>
                      <SelectItem value="HK">港股</SelectItem>
                      <SelectItem value="CN">A股</SelectItem>
                    </SelectContent>
                  </Select>
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
                      <SelectItem value="5y">5年</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>股票代码</Label>
                {compareSymbols.map((sym, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`股票 ${index + 1}`}
                      value={sym}
                      onChange={(e) => updateCompareSymbol(index, e.target.value)}
                    />
                    {compareSymbols.length > 2 && (
                      <Button variant="outline" size="icon" onClick={() => removeCompareSymbol(index)}>
                        ×
                      </Button>
                    )}
                  </div>
                ))}
                {compareSymbols.length < 5 && (
                  <Button variant="outline" onClick={addCompareSymbol} className="w-full">
                    + 添加股票
                  </Button>
                )}
              </div>

              <Button onClick={handleCompare} disabled={analyzing} className="w-full md:w-auto">
                <BarChart3 className="mr-2 h-4 w-4" />
                {analyzing ? '对比中...' : '开始对比'}
              </Button>
            </CardContent>
          </Card>

          {currentComparison && <StockComparisonView comparison={currentComparison} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
