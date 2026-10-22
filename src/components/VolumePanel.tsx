import React from 'react';
import {
  VolumeConfig,
  VolumeAnalysisSummary,
  VolumeCalcMethod,
  formatCurrencyValue,
} from '../indicators/volume.ts';
import { BarChart3, AlertCircle, CheckCircle2, Sliders } from 'lucide-react';

interface VolumePanelProps {
  config: VolumeConfig;
  onChangeConfig: (newConfig: VolumeConfig) => void;
  summary: VolumeAnalysisSummary | null;
  currency: string;
}

export const VolumePanel: React.FC<VolumePanelProps> = ({
  config,
  onChangeConfig,
  summary,
  currency,
}) => {
  if (!summary) return null;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-slate-200 flex flex-col gap-3 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
              <span>Volume Financeiro</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                  summary.isRealData
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {summary.isRealData ? 'REAL' : 'ESTIMADO'}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">Fluxo de capital por candle & Média Móvel</p>
          </div>
        </div>

        {/* Toggle switch */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onChangeConfig({ ...config, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
        </label>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {/* Current Financial Volume */}
        <div className="bg-slate-950/80 border border-slate-800 rounded p-2">
          <span className="text-[10px] text-slate-400 block mb-0.5">Volume Recente ({currency})</span>
          <span className="font-mono font-bold text-slate-100 text-xs">
            {formatCurrencyValue(summary.currentFinancialVolume, currency)}
          </span>
        </div>

        {/* Average Financial Volume */}
        <div className="bg-slate-950/80 border border-slate-800 rounded p-2">
          <span className="text-[10px] text-slate-400 block mb-0.5">
            Média ({config.maPeriod} {config.maType})
          </span>
          <span className="font-mono font-bold text-slate-100 text-xs">
            {formatCurrencyValue(summary.averageFinancialVolume, currency)}
          </span>
        </div>
      </div>

      {/* Volume Trend & Ratio */}
      <div className="bg-slate-950/90 border border-slate-800 rounded p-2 flex items-center justify-between text-[11px]">
        <div>
          <span className="text-[10px] text-slate-400 block">Comportamento de Volume:</span>
          <span
            className={`font-bold ${
              summary.volumeTrend === 'Forte Expansão' || summary.volumeTrend === 'Acima da Média'
                ? 'text-emerald-400'
                : summary.volumeTrend === 'Secagem / Baixo'
                ? 'text-rose-400'
                : 'text-amber-400'
            }`}
          >
            {summary.volumeTrend}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 block">Proporção / Média:</span>
          <span className="font-mono font-extrabold text-slate-100 text-xs">
            {summary.volumeRatio}x
          </span>
        </div>
      </div>

      {/* Configuration Controls */}
      <div className="border-t border-slate-800/80 pt-2 space-y-2">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-400 flex items-center gap-1 font-semibold">
            <Sliders className="w-3 h-3 text-amber-400" />
            Método de Cálculo Financeiro:
          </span>
          <select
            value={config.method}
            onChange={(e) =>
              onChangeConfig({ ...config, method: e.target.value as VolumeCalcMethod })
            }
            className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-slate-200 text-[10px] focus:outline-none focus:border-amber-500"
          >
            <option value="typical">Preço Típico [(H+L+C)/3]</option>
            <option value="close">Preço de Fechamento</option>
            <option value="ohlc_average">Média OHLC [(O+H+L+C)/4]</option>
            <option value="real">Real Efetivo (quando disp.)</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-400">Média Móvel do Volume:</span>
          <div className="flex items-center gap-1">
            <select
              value={config.maType}
              onChange={(e) =>
                onChangeConfig({ ...config, maType: e.target.value as 'SMA' | 'EMA' })
              }
              className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-slate-200 text-[10px]"
            >
              <option value="SMA">SMA</option>
              <option value="EMA">EMA</option>
            </select>
            <input
              type="number"
              min="5"
              max="200"
              value={config.maPeriod}
              onChange={(e) =>
                onChangeConfig({ ...config, maPeriod: Math.max(5, parseInt(e.target.value) || 20) })
              }
              className="w-12 bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-center text-slate-200 text-[10px] font-mono"
            />
            <span className="text-slate-500 text-[9px]">períodos</span>
          </div>
        </div>
      </div>

      {/* Methodology documentation note */}
      <div className="bg-slate-950/60 rounded p-1.5 border border-slate-800/60 text-[9px] text-slate-400 leading-tight">
        <span className="font-semibold text-slate-300">Nota Metodológica: </span>
        {summary.methodologyNote}
      </div>
    </div>
  );
};
