import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Line } from 'react-chartjs-2';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { StockComparison } from '@shared/stock-types';

interface StockComparisonViewProps {
  comparison: StockComparison;
}

export function StockComparisonView({ comparison }: StockComparisonViewProps) {
  const { stocks, priceData, relativeStrength, performance, correlation } = comparison;

  // 价格对比图表
  const priceComparisonChart = useMemo(() => {
    if (!stocks.length) return null;

    const colors = [
      'rgb(59, 130, 246)',
      'rgb(239, 68, 68)',
      'rgb(34, 197, 94)',
      'rgb(168, 85, 247)',
      'rgb(249, 115, 22)'
    ];

    const firstSymbol = stocks[0].symbol;
    const labels = priceData[firstSymbol]?.map(d => d.date) || [];

    const datasets = stocks.map((stock, index) => {
      const data = priceData[stock.symbol];
      if (!data || data.length === 0) return null;

      // 归一化价格（以第一天为100）
      const normalizedPrices = data.map(d => (d.close / data[0].close) * 100);

      return {
        label: stock.name,
        data: normalizedPrices,
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length].replace('rgb', 'rgba').replace(')', ', 0.1)'),
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      };
    }).filter((d): d is NonNullable<typeof d> => d !== null);

    return {
      labels,
      datasets
    };
  }, [stocks, priceData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const
      },
      title: {
        display: true,
        text: '相对价格走势对比（归一化，起点=100）',
        font: {
          size: 14,
          weight: 'bold' as const
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(2);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        ticks: {
          maxTicksLimit: 10
        }
      },
      y: {
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: '相对价格 (起点=100)'
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 股票列表概览 */}
      <Card>
        <CardHeader>
          <CardTitle>对比股票列表</CardTitle>
          <CardDescription>共 {stocks.length} 只股票</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stocks.map((stock, index) => (
              <div key={stock.symbol} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{stock.name}</h4>
                    <p className="text-sm text-muted-foreground">{stock.symbol}</p>
                  </div>
                  <Badge variant="outline">
                    相对强度: {relativeStrength[stock.symbol]?.toFixed(0)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">当前价格</p>
                    <p className="font-semibold">{stock.currentPrice?.toFixed(2)} {stock.currency}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">交易所</p>
                    <p className="font-semibold">{stock.exchange}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 价格走势对比图 */}
      <Card>
        <CardHeader>
          <CardTitle>价格走势对比</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            {priceComparisonChart && <Line data={priceComparisonChart} options={chartOptions} />}
          </div>
        </CardContent>
      </Card>

      {/* 涨跌幅对比 */}
      <Card>
        <CardHeader>
          <CardTitle>涨跌幅对比</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">股票</th>
                  <th className="text-right py-3 px-4">日涨跌</th>
                  <th className="text-right py-3 px-4">周涨跌</th>
                  <th className="text-right py-3 px-4">月涨跌</th>
                  <th className="text-right py-3 px-4">年涨跌</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((stock) => {
                  const perf = performance[stock.symbol];
                  if (!perf) return null;

                  return (
                    <tr key={stock.symbol} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold">{stock.name}</p>
                          <p className="text-sm text-muted-foreground">{stock.symbol}</p>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={`flex items-center justify-end gap-1 ${perf.daily >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {perf.daily >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          {perf.daily.toFixed(2)}%
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={perf.weekly >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {perf.weekly.toFixed(2)}%
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={perf.monthly >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {perf.monthly.toFixed(2)}%
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={perf.yearly >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {perf.yearly.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 相关性矩阵 */}
      <Card>
        <CardHeader>
          <CardTitle>相关性分析</CardTitle>
          <CardDescription>股票之间的价格相关系数（-1到1，越接近1表示走势越相似）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">股票</th>
                  {stocks.map((stock) => (
                    <th key={stock.symbol} className="text-center py-2 px-3">
                      {stock.symbol}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stocks.map((stock1) => (
                  <tr key={stock1.symbol} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-3 font-semibold">{stock1.symbol}</td>
                    {stocks.map((stock2) => {
                      const corr = correlation[stock1.symbol]?.[stock2.symbol];
                      if (corr === undefined) return <td key={stock2.symbol} className="text-center py-2 px-3">-</td>;

                      const intensity = Math.abs(corr);
                      const bgColor = corr > 0 
                        ? `rgba(34, 197, 94, ${intensity * 0.5})` 
                        : `rgba(239, 68, 68, ${intensity * 0.5})`;

                      return (
                        <td 
                          key={stock2.symbol} 
                          className="text-center py-2 px-3 font-mono"
                          style={{ backgroundColor: bgColor }}
                        >
                          {corr.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 相对强度排名 */}
      <Card>
        <CardHeader>
          <CardTitle>相对强度排名</CardTitle>
          <CardDescription>相对于第一只股票的表现</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stocks
              .map((stock) => ({
                stock,
                strength: relativeStrength[stock.symbol] || 0
              }))
              .sort((a, b) => b.strength - a.strength)
              .map(({ stock, strength }, index) => (
                <div key={stock.symbol} className="flex items-center gap-4">
                  <div className="w-8 text-center font-bold text-muted-foreground">
                    #{index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{stock.name}</span>
                      <span className={`font-semibold ${strength >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                        {strength.toFixed(0)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strength >= 100 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(100, Math.abs(strength))}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
