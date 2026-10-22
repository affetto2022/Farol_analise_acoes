import React from 'react';
import { X, Sliders, Check, RotateCcw } from 'lucide-react';
import { MAType } from '../indicators/oliverKellCycle.ts';

export interface AppSettings {
  fastPeriod: number;
  slowPeriod: number;
  maType: MAType;
  fastMAColor: string;
  slowMAColor: string;
  atrPeriod: number;
  volumeMAPeriod: number;
  volumeMAType: 'SMA' | 'EMA';
  volumeMAColor: string;
  showSupportResistance: boolean;
  timezone: string;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  fastPeriod: 10,
  slowPeriod: 20,
  maType: 'EMA',
  fastMAColor: '#38bdf8', // sky-400
  slowMAColor: '#fbbf24', // amber-400
  atrPeriod: 14,
  volumeMAPeriod: 20,
  volumeMAType: 'SMA',
  volumeMAColor: '#a78bfa', // purple-400
  showSupportResistance: true,
  timezone: 'America/Sao_Paulo',
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [draft, setDraft] = React.useState<AppSettings>(settings);

  React.useEffect(() => {
    setDraft(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  const handleReset = () => {
    setDraft(DEFAULT_APP_SETTINGS);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">Configurações de Indicadores</h2>
              <p className="text-[10px] text-slate-400">Personalize parâmetros de cálculo e estilo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-200">
          {/* Section 1: Médias Móveis */}
          <div className="space-y-3">
            <h3 className="font-bold text-amber-400 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-1">
              Médias Móveis (Ciclo Oliver Kell)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Período Média Rápida (M10):</label>
                <input
                  type="number"
                  min="3"
                  max="50"
                  value={draft.fastPeriod}
                  onChange={(e) =>
                    setDraft({ ...draft, fastPeriod: Math.max(3, parseInt(e.target.value) || 10) })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Período Média Lenta (M20):</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={draft.slowPeriod}
                  onChange={(e) =>
                    setDraft({ ...draft, slowPeriod: Math.max(5, parseInt(e.target.value) || 20) })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Tipo de Média Móvel:</label>
                <select
                  value={draft.maType}
                  onChange={(e) => setDraft({ ...draft, maType: e.target.value as MAType })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100"
                >
                  <option value="EMA">Exponencial (EMA - Kell Original)</option>
                  <option value="SMA">Aritmética Simples (SMA)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Cores das Médias:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draft.fastMAColor}
                    onChange={(e) => setDraft({ ...draft, fastMAColor: e.target.value })}
                    className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                    title="Cor da Média Rápida"
                  />
                  <input
                    type="color"
                    value={draft.slowMAColor}
                    onChange={(e) => setDraft({ ...draft, slowMAColor: e.target.value })}
                    className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                    title="Cor da Média Lenta"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Volatilidade ATR */}
          <div className="space-y-3">
            <h3 className="font-bold text-amber-400 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-1">
              Volatilidade & ATR (Wilder)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Período ATR (Wilder):</label>
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={draft.atrPeriod}
                  onChange={(e) =>
                    setDraft({ ...draft, atrPeriod: Math.max(5, parseInt(e.target.value) || 14) })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Fuso Horário do Gráfico:</label>
                <select
                  value={draft.timezone}
                  onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100"
                >
                  <option value="America/Sao_Paulo">Brasília (UTC-3)</option>
                  <option value="America/New_York">New York (EST/EDT)</option>
                  <option value="UTC">UTC Universal</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Volume & Níveis Técnicos */}
          <div className="space-y-3">
            <h3 className="font-bold text-amber-400 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-1">
              Volume & Níveis Gráficos
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Período Média do Volume:</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={draft.volumeMAPeriod}
                  onChange={(e) =>
                    setDraft({ ...draft, volumeMAPeriod: Math.max(5, parseInt(e.target.value) || 20) })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Cor da Média do Volume:</label>
                <input
                  type="color"
                  value={draft.volumeMAColor}
                  onChange={(e) => setDraft({ ...draft, volumeMAColor: e.target.value })}
                  className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={draft.showSupportResistance}
                    onChange={(e) => setDraft({ ...draft, showSupportResistance: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0"
                  />
                  <span className="text-slate-300">
                    Exibir linhas horizontais de Suporte e Resistência calculados no gráfico
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-between bg-slate-950">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrões</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
