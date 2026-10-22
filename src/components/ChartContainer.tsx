import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  UTCTimestamp,
} from 'lightweight-charts';
import { OHLCV } from '../indicators/technicalIndicators.ts';
import { OliverKellAnalysisResult, KELL_PHASE_METADATA } from '../indicators/oliverKellCycle.ts';
import { VolumeBarResult, formatCurrencyValue } from '../indicators/volume.ts';
import { Maximize2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ChartContainerProps {
  candles: OHLCV[];
  symbol: string;
  currency: string;
  timeframe: string;
  isRealTime: boolean;
  isDemo: boolean;
  provider: string;
  oliverKell: OliverKellAnalysisResult;
  volumeBars: VolumeBarResult[];
  showFastMA: boolean;
  showSlowMA: boolean;
  showVolume: boolean;
  showVolumeMA: boolean;
  showSupportResistance: boolean;
  supports: number[];
  resistances: number[];
  fastMAColor: string;
  slowMAColor: string;
  volumeMAColor: string;
  fastPeriod: number;
  slowPeriod: number;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  candles,
  symbol,
  currency,
  timeframe,
  isRealTime,
  isDemo,
  provider,
  oliverKell,
  volumeBars,
  showFastMA,
  showSlowMA,
  showVolume,
  showVolumeMA,
  showSupportResistance,
  supports,
  resistances,
  fastMAColor,
  slowMAColor,
  volumeMAColor,
  fastPeriod,
  slowPeriod,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Series refs
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const fastMASeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const slowMASeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const volumeMASeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Current hover or last candle for the HUD
  const [hudData, setHudData] = useState<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    changePercent: number;
    volume: number;
    financialVolume?: number;
    fastMA?: number | null;
    slowMA?: number | null;
    phase?: number;
  } | null>(null);

  // Initialize and mount chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Destroy any existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#090d16' },
        textColor: '#94a3b8',
        fontSize: 12,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.4)', style: LineStyle.Dotted },
        horzLines: { color: 'rgba(30, 41, 59, 0.4)', style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#fbbf24',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1e293b',
        },
        horzLine: {
          color: '#fbbf24',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1e293b',
        },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: {
          top: 0.1,
          bottom: 0.25, // Leave bottom 25% for volume
        },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // 1. Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });
    candleSeriesRef.current = candleSeries;

    // 2. Fast MA (10)
    const fastMASeries = chart.addSeries(LineSeries, {
      color: fastMAColor,
      lineWidth: 2,
      title: `MME ${fastPeriod}`,
      priceScaleId: 'right',
    });
    fastMASeriesRef.current = fastMASeries;

    // 3. Slow MA (20)
    const slowMASeries = chart.addSeries(LineSeries, {
      color: slowMAColor,
      lineWidth: 2,
      title: `MME ${slowPeriod}`,
      priceScaleId: 'right',
    });
    slowMASeriesRef.current = slowMASeries;

    // 4. Volume Histogram on dedicated price scale
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume_scale',
    });
    chart.priceScale('volume_scale').applyOptions({
      scaleMargins: {
        top: 0.78, // volume sits in bottom 22%
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // 5. Volume Moving Average
    const volumeMASeries = chart.addSeries(LineSeries, {
      color: volumeMAColor,
      lineWidth: 1,
      priceScaleId: 'volume_scale',
      title: 'Vol MA',
    });
    volumeMASeriesRef.current = volumeMASeries;

    // Crosshair subscribe for HUD updates
    chart.subscribeCrosshairMove((param) => {
      if (
        !param.time ||
        !param.point ||
        param.point.x < 0 ||
        param.point.x > container.clientWidth ||
        param.point.y < 0 ||
        param.point.y > container.clientHeight
      ) {
        // Fallback to latest candle
        updateHudWithLatest();
        return;
      }

      const candleData = param.seriesData.get(candleSeries) as any;
      if (candleData) {
        const timeStr = typeof param.time === 'number'
          ? new Date(param.time * 1000).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
          : String(param.time);

        const open = candleData.open;
        const close = candleData.close;
        const high = candleData.high;
        const low = candleData.low;
        const changePercent = open ? Number((((close - open) / open) * 100).toFixed(2)) : 0;

        const volData = param.seriesData.get(volumeSeries) as any;
        const fMAData = param.seriesData.get(fastMASeries) as any;
        const sMAData = param.seriesData.get(slowMASeries) as any;

        setHudData({
          time: timeStr,
          open,
          high,
          low,
          close,
          changePercent,
          volume: volData?.value ?? 0,
          fastMA: fMAData?.value,
          slowMA: sMAData?.value,
        });
      }
    });

    // Auto resize handling
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      chartRef.current.applyOptions({ width, height });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  // Helper to sync HUD with the latest candle
  const updateHudWithLatest = () => {
    if (candles.length === 0) return;
    const latest = candles[candles.length - 1];
    const prev = candles.length > 1 ? candles[candles.length - 2] : latest;
    const changePercent = Number((((latest.close - prev.close) / prev.close) * 100).toFixed(2));
    const timeSec = typeof latest.time === 'number' ? latest.time : Date.parse(String(latest.time)) / 1000;
    const timeStr = new Date(timeSec * 1000).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    setHudData({
      time: timeStr,
      open: latest.open,
      high: latest.high,
      low: latest.low,
      close: latest.close,
      changePercent,
      volume: latest.volume,
      financialVolume: latest.financialVolume,
      fastMA: oliverKell.current?.fastMAValue,
      slowMA: oliverKell.current?.slowMAValue,
      phase: oliverKell.current?.phase,
    });
  };

  // Populate data into chart series whenever candles or indicators update
  useEffect(() => {
    if (!chartRef.current || candles.length === 0) return;

    // 1. Candlestick data
    const formattedCandles = candles.map((c) => ({
      time: (typeof c.time === 'number' ? c.time : Math.floor(Date.parse(String(c.time)) / 1000)) as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeriesRef.current?.setData(formattedCandles);

    // 2. Fast MA
    if (showFastMA && fastMASeriesRef.current) {
      const fastMAData = candles
        .map((c, i) => {
          const val = oliverKell.fastMA[i];
          if (val === null || val === undefined) return null;
          return {
            time: (typeof c.time === 'number' ? c.time : Math.floor(Date.parse(String(c.time)) / 1000)) as UTCTimestamp,
            value: val,
          };
        })
        .filter((d): d is { time: UTCTimestamp; value: number } => d !== null);

      fastMASeriesRef.current.setData(fastMAData);
      fastMASeriesRef.current.applyOptions({ visible: true, color: fastMAColor });
    } else {
      fastMASeriesRef.current?.applyOptions({ visible: false });
    }

    // 3. Slow MA
    if (showSlowMA && slowMASeriesRef.current) {
      const slowMAData = candles
        .map((c, i) => {
          const val = oliverKell.slowMA[i];
          if (val === null || val === undefined) return null;
          return {
            time: (typeof c.time === 'number' ? c.time : Math.floor(Date.parse(String(c.time)) / 1000)) as UTCTimestamp,
            value: val,
          };
        })
        .filter((d): d is { time: UTCTimestamp; value: number } => d !== null);

      slowMASeriesRef.current.setData(slowMAData);
      slowMASeriesRef.current.applyOptions({ visible: true, color: slowMAColor });
    } else {
      slowMASeriesRef.current?.applyOptions({ visible: false });
    }

    // 4. Volume Bars
    if (showVolume && volumeSeriesRef.current) {
      const vData = volumeBars.map((vb) => ({
        time: (typeof vb.time === 'number' ? vb.time : Math.floor(Date.parse(String(vb.time)) / 1000)) as UTCTimestamp,
        value: vb.financialVolume,
        color: vb.isSurge ? (vb.isUp ? '#34d399' : '#f87171') : vb.isUp ? 'rgba(16, 185, 129, 0.65)' : 'rgba(239, 68, 68, 0.65)',
      }));
      volumeSeriesRef.current.setData(vData);
      volumeSeriesRef.current.applyOptions({ visible: true });
    } else {
      volumeSeriesRef.current?.applyOptions({ visible: false });
    }

    // 5. Volume MA
    if (showVolume && showVolumeMA && volumeMASeriesRef.current) {
      const vMAData = volumeBars
        .map((vb) => {
          if (vb.maValue === null) return null;
          return {
            time: (typeof vb.time === 'number' ? vb.time : Math.floor(Date.parse(String(vb.time)) / 1000)) as UTCTimestamp,
            value: vb.maValue,
          };
        })
        .filter((d): d is { time: UTCTimestamp; value: number } => d !== null);

      volumeMASeriesRef.current.setData(vMAData);
      volumeMASeriesRef.current.applyOptions({ visible: true, color: volumeMAColor });
    } else {
      volumeMASeriesRef.current?.applyOptions({ visible: false });
    }

    // Reset view to fit content
    chartRef.current.timeScale().fitContent();
    updateHudWithLatest();
  }, [
    candles,
    oliverKell,
    volumeBars,
    showFastMA,
    showSlowMA,
    showVolume,
    showVolumeMA,
    fastMAColor,
    slowMAColor,
    volumeMAColor,
  ]);

  // Manage Support & Resistance Price Lines
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const series = candleSeriesRef.current;

    // Clear existing price lines if any
    const createdLines: any[] = [];
    if (showSupportResistance) {
      // Add Resistance Lines
      resistances.forEach((res, i) => {
        const line = series.createPriceLine({
          price: res,
          color: '#f87171',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `Resistência ${i + 1} (${res})`,
        });
        createdLines.push(line);
      });

      // Add Support Lines
      supports.forEach((sup, i) => {
        const line = series.createPriceLine({
          price: sup,
          color: '#34d399',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `Suporte ${i + 1} (${sup})`,
        });
        createdLines.push(line);
      });
    }

    return () => {
      createdLines.forEach((line) => {
        try {
          series.removePriceLine(line);
        } catch {
          // ignore
        }
      });
    };
  }, [supports, resistances, showSupportResistance]);

  const handleZoomIn = () => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const range = timeScale.getVisibleLogicalRange();
    if (range) {
      const length = range.to - range.from;
      const zoomFactor = 0.2;
      timeScale.setVisibleLogicalRange({
        from: range.from + length * (zoomFactor / 2),
        to: range.to - length * (zoomFactor / 2),
      });
    }
  };

  const handleZoomOut = () => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const range = timeScale.getVisibleLogicalRange();
    if (range) {
      const length = range.to - range.from;
      const zoomFactor = 0.25;
      timeScale.setVisibleLogicalRange({
        from: range.from - length * (zoomFactor / 2),
        to: range.to + length * (zoomFactor / 2),
      });
    }
  };

  const handleResetZoom = () => {
    chartRef.current?.timeScale().fitContent();
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* Chart Top HUD Banner */}
      <div className="bg-slate-900/90 backdrop-blur border-b border-slate-800/80 px-3 py-1.5 flex flex-wrap items-center justify-between text-xs gap-2 z-10 font-mono">
        {/* Left: Ticker, timeframe, current status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-slate-100 text-sm tracking-wide">{symbol}</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-amber-400 font-semibold text-[11px]">
              {timeframe}
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                isRealTime
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isRealTime ? '● DADOS REAIS' : '▲ DEMO'}
            </span>
          </div>

          {/* OHLC and Change values */}
          {hudData && (
            <div className="flex items-center gap-2.5 text-[11px] text-slate-400">
              <span>
                A: <strong className="text-slate-200">{hudData.open}</strong>
              </span>
              <span>
                M: <strong className="text-slate-200">{hudData.high}</strong>
              </span>
              <span>
                m: <strong className="text-slate-200">{hudData.low}</strong>
              </span>
              <span>
                F: <strong className="text-slate-100 font-bold">{hudData.close}</strong>
              </span>
              <span
                className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                  hudData.changePercent >= 0
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-rose-500/15 text-rose-400'
                }`}
              >
                {hudData.changePercent >= 0 ? '+' : ''}
                {hudData.changePercent}%
              </span>
              {hudData.financialVolume !== undefined && (
                <span className="hidden md:inline text-slate-400">
                  Vol Fin:{' '}
                  <strong className="text-slate-300">
                    {formatCurrencyValue(hudData.financialVolume, currency)}
                  </strong>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Active Indicator Values & Controls */}
        <div className="flex items-center gap-2 text-[11px]">
          {showFastMA && hudData?.fastMA && (
            <span style={{ color: fastMAColor }} className="font-semibold">
              M10: {hudData.fastMA}
            </span>
          )}
          {showSlowMA && hudData?.slowMA && (
            <span style={{ color: slowMAColor }} className="font-semibold">
              M20: {hudData.slowMA}
            </span>
          )}
          {oliverKell.current && (
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold border"
              style={{
                backgroundColor: `${KELL_PHASE_METADATA[oliverKell.current.phase].color}20`,
                borderColor: `${KELL_PHASE_METADATA[oliverKell.current.phase].color}60`,
                color: KELL_PHASE_METADATA[oliverKell.current.phase].color,
              }}
            >
              {KELL_PHASE_METADATA[oliverKell.current.phase].tag}
            </span>
          )}

          {/* Quick Zoom Tools */}
          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
            <button
              onClick={handleZoomIn}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
              title="Ajustar Escala Automática"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas Container */}
      <div ref={chartContainerRef} className="flex-1 w-full h-full relative" />

      {/* Floating Info Pill at bottom left */}
      <div className="absolute bottom-2 left-2 z-10 pointer-events-none bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded px-2 py-1 text-[10px] text-slate-400 flex items-center gap-2">
        <span>Origem: {provider}</span>
        <span>•</span>
        <span>Moeda: {currency}</span>
        <span>•</span>
        <span>Escala: Automática</span>
      </div>
    </div>
  );
};
