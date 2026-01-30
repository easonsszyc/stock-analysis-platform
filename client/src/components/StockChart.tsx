import { useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import type { PriceDataPoint, TechnicalIndicators, StockInfo } from '@shared/stock-types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface StockChartProps {
  data: (PriceDataPoint & TechnicalIndicators)[];
  stockInfo: StockInfo;
}

export function StockChart({ data, stockInfo }: StockChartProps) {
  const priceChartData = useMemo(() => {
    const labels = data.map(d => d.date);
    const closes = data.map(d => d.close);
    const ma5 = data.map(d => d.ma5);
    const ma10 = data.map(d => d.ma10);
    const ma20 = data.map(d => d.ma20);
    const ma60 = data.map(d => d.ma60);

    return {
      labels,
      datasets: [
        {
          label: '收盘价',
          data: closes,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true
        },
        {
          label: 'MA5',
          data: ma5,
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1.5,
          pointRadius: 0,
          borderDash: [5, 5]
        },
        {
          label: 'MA10',
          data: ma10,
          borderColor: 'rgb(249, 115, 22)',
          borderWidth: 1.5,
          pointRadius: 0,
          borderDash: [5, 5]
        },
        {
          label: 'MA20',
          data: ma20,
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1.5,
          pointRadius: 0,
          borderDash: [5, 5]
        },
        {
          label: 'MA60',
          data: ma60,
          borderColor: 'rgb(168, 85, 247)',
          borderWidth: 1.5,
          pointRadius: 0,
          borderDash: [5, 5]
        }
      ]
    };
  }, [data]);

  const volumeChartData = useMemo(() => {
    const labels = data.map(d => d.date);
    const volumes = data.map(d => d.volume);
    const colors = data.map((d, i) => {
      if (i === 0) return 'rgba(107, 114, 128, 0.6)';
      return d.close >= data[i - 1].close ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)';
    });

    return {
      labels,
      datasets: [
        {
          label: '成交量',
          data: volumes,
          backgroundColor: colors,
          borderWidth: 0
        }
      ]
    };
  }, [data]);

  const rsiChartData = useMemo(() => {
    const labels = data.map(d => d.date);
    const rsi = data.map(d => d.rsi);

    return {
      labels,
      datasets: [
        {
          label: 'RSI',
          data: rsi,
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true
        }
      ]
    };
  }, [data]);

  const macdChartData = useMemo(() => {
    const labels = data.map(d => d.date);
    const macd = data.map(d => d.macd);
    const signal = data.map(d => d.macdSignal);
    const histogram = data.map(d => d.macdHist);
    const histColors = histogram.map(h => h && h >= 0 ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)');

    return {
      labels,
      datasets: [
        {
          label: 'Histogram',
          data: histogram,
          backgroundColor: histColors,
          borderWidth: 0
        }
      ]
    };
  }, [data]);

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          padding: 10,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        enabled: true
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
        position: 'right' as const
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* 价格走势图 */}
      <div className="h-[300px]">
        <Line data={priceChartData} options={{
          ...commonOptions,
          plugins: {
            ...commonOptions.plugins,
            title: {
              display: true,
              text: `${stockInfo.name} 价格走势`,
              font: {
                size: 14,
                weight: 'bold' as const
              }
            }
          }
        }} />
      </div>

      {/* 成交量 */}
      <div className="h-[150px]">
        <Bar data={volumeChartData} options={{
          ...commonOptions,
          plugins: {
            ...commonOptions.plugins,
            title: {
              display: true,
              text: '成交量',
              font: {
                size: 14,
                weight: 'bold' as const
              }
            },
            legend: {
              display: false
            }
          }
        }} />
      </div>

      {/* RSI */}
      <div className="h-[150px]">
        <Line data={rsiChartData} options={{
          ...commonOptions,
          plugins: {
            ...commonOptions.plugins,
            title: {
              display: true,
              text: 'RSI 相对强弱指标',
              font: {
                size: 14,
                weight: 'bold' as const
              }
            }
          },
          scales: {
            ...commonOptions.scales,
            y: {
              ...commonOptions.scales.y,
              min: 0,
              max: 100
            }
          }
        }} />
      </div>

      {/* MACD */}
      <div className="h-[150px]">
        <Bar data={macdChartData} options={{
          ...commonOptions,
          plugins: {
            ...commonOptions.plugins,
            title: {
              display: true,
              text: 'MACD 指标',
              font: {
                size: 14,
                weight: 'bold' as const
              }
            }
          }
        }} />
      </div>
    </div>
  );
}
