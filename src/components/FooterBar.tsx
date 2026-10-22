import React from 'react';
import { Database, Clock, Wifi, Shield, Globe } from 'lucide-react';

interface FooterBarProps {
  provider: string;
  isRealTime: boolean;
  isDemo: boolean;
  currency: string;
  lastUpdate: string | null;
  candleCount: number;
}

export const FooterBar: React.FC<FooterBarProps> = ({
  provider,
  isRealTime,
  isDemo,
  currency,
  lastUpdate,
  candleCount,
}) => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-[11px] px-3 py-1.5 flex flex-wrap items-center justify-between gap-3 font-mono">
      {/* Left items: Provider and Realtime badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-300">Fonte:</span>
          <span className="font-semibold text-slate-200">{provider}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isRealTime ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className={isRealTime ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
            {isRealTime ? 'Conexão em Tempo Real' : 'Modo Demonstração'}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1">
          <Globe className="w-3 h-3 text-slate-500" />
          <span>Moeda:</span>
          <span className="text-slate-200 font-bold">{currency}</span>
        </div>

        <div className="hidden md:flex items-center gap-1">
          <span>Barras:</span>
          <span className="text-slate-200">{candleCount}</span>
        </div>
      </div>

      {/* Right items: Timestamp and Disclaimer */}
      <div className="flex items-center gap-3">
        {lastUpdate && (
          <div className="flex items-center gap-1 text-slate-400">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>Atualizado:</span>
            <span className="text-slate-300 font-medium">
              {new Date(lastUpdate).toLocaleTimeString('pt-BR')}
            </span>
          </div>
        )}

        <div className="hidden lg:flex items-center gap-1 text-[10px] text-slate-500">
          <Shield className="w-3 h-3 text-slate-600" />
          <span>Exclusivamente análise técnica & apoio à decisão</span>
        </div>
      </div>
    </footer>
  );
};
