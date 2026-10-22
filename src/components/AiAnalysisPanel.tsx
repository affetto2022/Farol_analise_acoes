import React, { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  FileText,
  Clock,
  ShieldCheck,
  TrendingUp,
  Activity,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface AiAnalysisPanelProps {
  analysisText: string | null;
  analysisTimestamp: string | null;
  analysisSymbol: string | null;
  analysisTimeframe: string | null;
  currentSymbol: string;
  currentTimeframe: string;
  isAnalyzing: boolean;
  onTriggerAnalysis: () => void;
  error: string | null;
}

export const AiAnalysisPanel: React.FC<AiAnalysisPanelProps> = ({
  analysisText,
  analysisTimestamp,
  analysisSymbol,
  analysisTimeframe,
  currentSymbol,
  currentTimeframe,
  isAnalyzing,
  onTriggerAnalysis,
  error,
}) => {
  const [copied, setCopied] = useState(false);

  const isStale =
    analysisText &&
    (analysisSymbol !== currentSymbol || analysisTimeframe !== currentTimeframe);

  const handleCopy = () => {
    if (!analysisText) return;
    navigator.clipboard.writeText(analysisText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!analysisText) return;
    const blob = new Blob(
      [
        `# FAROL TRADERS — RELATÓRIO DE ANÁLISE TÉCNICA\n` +
          `**Ativo:** ${analysisSymbol || currentSymbol} | **Periodicidade:** ${
            analysisTimeframe || currentTimeframe
          }\n` +
          `**Data/Hora:** ${analysisTimestamp ? new Date(analysisTimestamp).toLocaleString('pt-BR') : ''}\n\n` +
          analysisText,
      ],
      { type: 'text/markdown;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FarolTraders_${analysisSymbol || currentSymbol}_${analysisTimeframe || currentTimeframe}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 text-slate-200 flex flex-col gap-3 shadow-sm h-full max-h-[800px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
            <Sparkles className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
              <span>Agente de IA Farol Traders</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                Gemini 3.8
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">Análise técnica estrita fundamentada em dados OHLCV</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {analysisText && (
            <>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                title="Copiar Relatório"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleDownloadMarkdown}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                title="Exportar Markdown"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button
            onClick={onTriggerAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Processando...' : 'Analisar Mercado'}</span>
          </button>
        </div>
      </div>

      {/* Status Bar / Timestamp / Stale Alert */}
      {analysisTimestamp && (
        <div className="flex items-center justify-between text-[10px] bg-slate-950/80 px-2 py-1 rounded border border-slate-800/80">
          <div className="flex items-center gap-1 text-slate-400">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Última análise:</span>
            <span className="font-mono text-slate-200">
              {new Date(analysisTimestamp).toLocaleTimeString('pt-BR')} ({analysisSymbol} - {analysisTimeframe})
            </span>
          </div>
          {isStale && (
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <AlertTriangle className="w-3 h-3" />
              Desatualizada para {currentSymbol} ({currentTimeframe})
            </span>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Erro na análise técnica:</span>
            <span className="text-[11px]">{error}</span>
          </div>
        </div>
      )}

      {/* Analysis Content or Empty State */}
      <div className="flex-1 overflow-y-auto pr-1 text-xs space-y-3 font-sans">
        {isAnalyzing ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-center p-6 text-slate-400">
            <div className="relative">
              <div className="w-12 h-12 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin" />
              <Sparkles className="w-5 h-5 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <div>
              <p className="font-bold text-slate-200 text-sm">Agente Farol Traders Analisando...</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                Processando estrutura de candles, médias de 10 e 20, ATR de Wilder, ciclo Oliver Kell e volume financeiro.
              </p>
            </div>
          </div>
        ) : analysisText ? (
          <div className="space-y-3 leading-relaxed">
            {/* Formatted sections */}
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 whitespace-pre-wrap font-sans text-slate-200 text-[11px] leading-relaxed">
              {analysisText}
            </div>

            <div className="bg-slate-950/50 p-2 rounded border border-slate-800 text-[10px] text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Análise gerada exclusivamente a partir de dados técnicos auditáveis. Não constitui recomendação de investimento.
              </span>
            </div>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-center p-6 text-slate-500">
            <Sparkles className="w-8 h-8 text-slate-600" />
            <p className="font-semibold text-slate-300">Nenhuma análise solicitada ainda</p>
            <p className="text-[11px] max-w-xs">
              Clique em <strong>"Analisar Mercado"</strong> para solicitar ao Agente de IA uma interpretação técnica completa estruturada em 8 seções.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
