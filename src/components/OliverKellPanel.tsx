import React, { useState } from 'react';
import {
  OliverKellAnalysisResult,
  KELL_PHASE_METADATA,
  CyclePhaseNumber,
} from '../indicators/oliverKellCycle.ts';
import {
  Compass,
  TrendingUp,
  TrendingDown,
  Activity,
  History,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldAlert,
} from 'lucide-react';

interface OliverKellPanelProps {
  analysis: OliverKellAnalysisResult;
  showFastMA: boolean;
  onToggleFastMA: () => void;
  showSlowMA: boolean;
  onToggleSlowMA: () => void;
  fastPeriod: number;
  slowPeriod: number;
  fastMAColor: string;
  slowMAColor: string;
}

export const OliverKellPanel: React.FC<OliverKellPanelProps> = ({
  analysis,
  showFastMA,
  onToggleFastMA,
  showSlowMA,
  onToggleSlowMA,
  fastPeriod,
  slowPeriod,
  fastMAColor,
  slowMAColor,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const current = analysis.current;
  if (!current) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-400">
        Aguardando histórico suficiente para cálculo do Ciclo Oliver Kell (mínimo de {slowPeriod} barras).
      </div>
    );
  }

  const phaseMeta = KELL_PHASE_METADATA[current.phase];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-slate-200 flex flex-col gap-3 shadow-sm">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
              <span>Ciclo de Preço — Oliver Kell</span>
              <span className="text-[10px] text-amber-400/80 font-normal">USIC Champion</span>
            </h3>
            <p className="text-[10px] text-slate-400">Máquina de estados determinística (6 Fases)</p>
          </div>
        </div>

        {/* Visibility Toggles */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleFastMA}
            className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 transition border ${
              showFastMA
                ? 'bg-slate-800 text-slate-200 border-slate-700'
                : 'bg-slate-950 text-slate-500 border-slate-800 line-through'
            }`}
            title="Exibir/Ocultar M10"
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: fastMAColor }} />
            M{fastPeriod}
          </button>
          <button
            onClick={onToggleSlowMA}
            className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 transition border ${
              showSlowMA
                ? 'bg-slate-800 text-slate-200 border-slate-700'
                : 'bg-slate-950 text-slate-500 border-slate-800 line-through'
            }`}
            title="Exibir/Ocultar M20"
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: slowMAColor }} />
            M{slowPeriod}
          </button>
        </div>
      </div>

      {/* Current Phase Highlight Box */}
      <div
        className="rounded-lg p-2.5 border transition"
        style={{
          backgroundColor: `${phaseMeta.color}15`,
          borderColor: `${phaseMeta.color}40`,
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-[11px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded border"
            style={{
              backgroundColor: `${phaseMeta.color}25`,
              borderColor: `${phaseMeta.color}70`,
              color: phaseMeta.color,
            }}
          >
            {phaseMeta.name}
          </span>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-950/70"
            style={{ color: phaseMeta.color }}
          >
            {current.direction}
          </span>
        </div>
        <p className="text-[11px] text-slate-300 mt-1 leading-snug">{phaseMeta.description}</p>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {/* Fast MA Status */}
        <div className="bg-slate-950/80 border border-slate-800 rounded p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>MME {fastPeriod} (Rápida)</span>
            <span
              className={`font-semibold ${
                current.fastMASlope === 'Ascendente'
                  ? 'text-emerald-400'
                  : current.fastMASlope === 'Descendente'
                  ? 'text-rose-400'
                  : 'text-slate-400'
              }`}
            >
              {current.fastMASlope}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="font-mono font-bold text-slate-200">{current.fastMAValue}</span>
            <span
              className={`text-[10px] font-semibold ${
                current.distanceFromFastMAPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {current.distanceFromFastMAPercent >= 0 ? '+' : ''}
              {current.distanceFromFastMAPercent}%
            </span>
          </div>
          <span className="text-[9px] text-slate-500 mt-0.5">Preço {current.priceVsFastMA} da M10</span>
        </div>

        {/* Slow MA Status */}
        <div className="bg-slate-950/80 border border-slate-800 rounded p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>MME {slowPeriod} (Lenta)</span>
            <span
              className={`font-semibold ${
                current.slowMASlope === 'Ascendente'
                  ? 'text-emerald-400'
                  : current.slowMASlope === 'Descendente'
                  ? 'text-rose-400'
                  : 'text-slate-400'
              }`}
            >
              {current.slowMASlope}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="font-mono font-bold text-slate-200">{current.slowMAValue}</span>
            <span
              className={`text-[10px] font-semibold ${
                current.distanceFromSlowMAPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {current.distanceFromSlowMAPercent >= 0 ? '+' : ''}
              {current.distanceFromSlowMAPercent}%
            </span>
          </div>
          <span className="text-[9px] text-slate-500 mt-0.5">Preço {current.priceVsSlowMA} da M20</span>
        </div>

        {/* ATR Wilder & Volatility */}
        <div className="bg-slate-950/80 border border-slate-800 rounded p-2 flex flex-col justify-between col-span-2">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-amber-400" />
              ATR Wilder (14) & Volatilidade
            </span>
            <span
              className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                current.volatilityRegime === 'Expansão'
                  ? 'bg-amber-500/20 text-amber-400'
                  : current.volatilityRegime === 'Contração'
                  ? 'bg-sky-500/20 text-sky-400'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {current.volatilityRegime}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="font-mono font-bold text-slate-200 text-xs">
              {current.atrValue} <span className="text-[10px] text-slate-500 font-normal">pts/unid</span>
            </span>
            <span className="text-[10px] text-slate-400">
              Amplitude Média de Oscilação
            </span>
          </div>
        </div>
      </div>

      {/* Trigger Event that Caused Last Phase Transition */}
      <div className="bg-slate-950/90 border border-slate-800/80 rounded p-2 text-[10px]">
        <div className="text-slate-400 font-semibold mb-0.5 flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-amber-400" />
          <span>Gatilho da Última Transição:</span>
        </div>
        <p className="text-slate-200 italic font-mono leading-relaxed">{current.lastTransitionEvent}</p>
      </div>

      {/* Transition History Collapsible */}
      <div className="border-t border-slate-800/80 pt-1">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between py-1 text-slate-400 hover:text-slate-200 text-xs transition"
        >
          <span className="flex items-center gap-1 font-semibold text-[11px]">
            <History className="w-3 h-3 text-amber-400" />
            Histórico de Transições ({analysis.transitions.length})
          </span>
          {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showHistory && (
          <div className="mt-1 space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {analysis.transitions.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic">Nenhuma transição recente registrada.</p>
            ) : (
              analysis.transitions
                .slice()
                .reverse()
                .map((trans, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 rounded bg-slate-950 border border-slate-800/60 text-[10px] flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">
                        Fase {trans.fromPhase} → <span className="text-amber-400">Fase {trans.toPhase}</span>
                      </span>
                      <span className="text-slate-500 font-mono text-[9px]">
                        {typeof trans.time === 'number'
                          ? new Date(trans.time * 1000).toLocaleDateString('pt-BR')
                          : String(trans.time)}
                      </span>
                    </div>
                    <p className="text-slate-400">{trans.triggerEvent}</p>
                  </div>
                ))
            )}
          </div>
        )}
      </div>

      {/* Methodology Disclaimer & Info */}
      <div className="border-t border-slate-800/80 pt-1">
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          className="w-full flex items-center justify-between py-1 text-slate-500 hover:text-slate-300 text-[10px] transition"
        >
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3 text-slate-400" />
            Sobre as 6 Fases de Oliver Kell
          </span>
          {showExplanation ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showExplanation && (
          <div className="mt-1 p-2 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400 leading-relaxed space-y-1">
            <p>
              A metodologia baseia-se nas estratégias do trader norte-americano <strong>Oliver Kell</strong>{' '}
              (campeão do USIC 2021 com rendimento recorde de 941,10%), estruturando o mercado em 6 estágios
              cíclicos a partir das médias móveis exponenciais de 10 e 20 períodos aliadas à expansão de ATR.
            </p>
            <p className="text-amber-400/90 font-medium">
              A classificação é 100% determinística através de regras lógicas sobre preços OHLC, impedindo que
              interpretações subjetivas alterem a fase calculada.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
