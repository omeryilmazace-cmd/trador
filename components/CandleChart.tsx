import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, ISeriesApi, CandlestickData, UTCTimestamp } from 'lightweight-charts';
import { Candle, Trade, OrderType } from '../types';

interface CandleChartProps {
    data: Candle[];
    trades?: Trade[];
}

const CandleChart: React.FC<CandleChartProps> = ({ data, trades = [] }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const seriesRef = useRef<ISeriesApi<'Candlestick'>>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#0f1115' },
                textColor: '#94a3b8',
            },
            grid: {
                vertLines: { color: '#1e293b' },
                horzLines: { color: '#1e293b' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 450,
            timeScale: {
                borderColor: '#1e293b',
                timeVisible: true,
            },
        });

        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
        });

        chartRef.current = chart;
        seriesRef.current = candlestickSeries;

        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    useEffect(() => {
        if (seriesRef.current && data.length > 0) {
            const chartData: CandlestickData[] = data.map(d => ({
                time: (d.timestamp / 1000) as UTCTimestamp,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
            }));
            seriesRef.current.setData(chartData);
            chartRef.current?.timeScale().fitContent();
        }
    }, [data]);

    useEffect(() => {
        if (seriesRef.current && trades.length > 0) {
            const markers = trades.flatMap(trade => {
                const entryMarker = {
                    time: (trade.entryTime / 1000) as UTCTimestamp,
                    position: 'belowBar' as const,
                    color: '#3b82f6',
                    shape: 'arrowUp' as const,
                    text: 'Entry',
                };

                if (trade.exitTime) {
                    return [
                        entryMarker,
                        {
                            time: (trade.exitTime / 1000) as UTCTimestamp,
                            position: 'aboveBar' as const,
                            color: trade.pnl > 0 ? '#22c55e' : '#ef4444',
                            shape: 'arrowDown' as const,
                            text: `Exit ${trade.pnl > 0 ? '+' : ''}${trade.pnlPct.toFixed(2)}%`,
                        }
                    ];
                }
                return [entryMarker];
            });

            seriesRef.current.setMarkers(markers);
        } else if (seriesRef.current) {
            seriesRef.current.setMarkers([]);
        }
    }, [trades]);

    return <div ref={chartContainerRef} className="w-full h-full" />;
};

export default CandleChart;
