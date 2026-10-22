import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  RefreshCw,
  Sparkles,
  Sliders,
  TrendingUp,
  Image as ImageIcon,
  Compass,
} from 'lucide-react';
import { Timeframe, TIMEFRAME_LABELS } from '../services/candleAggregator.ts';

interface HeaderProps {
  currentSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  timeframe: Timeframe;
  onChangeTimeframe: (tf: Timeframe) => void;
  onRefreshData: () => void;
  onTriggerAiAnalysis: () => void;
  isAiAnalyzing: boolean;
  isLoadingData: boolean;
  onOpenSettings: () => void;
  activeTab: 'chart' | 'studio';
  onChangeTab: (tab: 'chart' | 'studio') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSymbol,
  onSelectSymbol,
  timeframe,
  onChangeTimeframe,
  onRefreshData,
  onTriggerAiAnalysis,
  isAiAnalyzing,
  isLoadingData,
  onOpenSettings,
  activeTab,
  onChangeTab,
}) => {
  const [searchInput, setSearchInput] = useState(currentSymbol);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchInput(currentSymbol);
  }, [currentSymbol]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    if (val.trim().length >= 1) {
      setIsSearching(true);
      setShowDropdown(true);
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(val)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.results || []);
        }
      } catch (err) {
        console.warn('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const handleSelect = (symbol: string) => {
    setSearchInput(symbol);
    setShowDropdown(false);
    onSelectSymbol(symbol);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      handleSelect(searchInput.trim());
    }
  };

  const quickTickers = ['PETR4.SA', 'VALE3.SA', 'AAPL', 'NVDA', 'BTC-USD'];
  const timeframes: Timeframe[] = ['5m', '15m', '30m', '60m', '1D', '1S', '1M'];

  return (
    <header className="bg-slate-950 border-b border-slate-800 text-slate-100 px-3 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
      {/* Brand & Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black text-xl">
            <Compass className="w-5 h-5 text-slate-950 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-wider text-slate-100">
                FAROL<span className="text-amber-400">TRADERS</span>
              </span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-400 border border-amber-400/30">
                V1.0
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Analisador Gráfico Inteligente & Ciclo Oliver Kell
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 ml-2">
          <button
            onClick={() => onChangeTab('chart')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
              activeTab === 'chart'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Terminal Gráfico</span>
          </button>
          <button
            onClick={() => onChangeTab('studio')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
              activeTab === 'studio'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Estúdio Logo & Vídeo</span>
          </button>
        </div>
      </div>

      {/* Center Search & Quick Tickers */}
      <div className="flex items-center gap-2 flex-1 max-w-xl">
        <div className="relative flex-1" ref={dropdownRef}>
          <form onSubmit={handleSubmit} className="flex items-center">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (suggestions.length > 0) setShowDropdown(true);
                }}
                placeholder="Pesquisar ativo (ex: PETR4, VALE3, AAPL, NVDA)..."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-20 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition font-mono"
              />
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded transition shadow-sm"
              >
                Buscar
              </button>
            </div>
          </form>

          {/* Autocomplete Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(item.symbol)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800/80 flex items-center justify-between border-b border-slate-800/50 last:border-b-0 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400">{item.symbol}</span>
                    <span className="text-slate-300 truncate max-w-[200px]">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {item.exchange || 'Mercado'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">
                      {item.currency}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Tickers */}
        <div className="hidden lg:flex items-center gap-1">
          {quickTickers.map((t) => (
            <button
              key={t}
              onClick={() => handleSelect(t)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition border ${
                currentSymbol === t
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 font-bold'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {t.replace('.SA', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Controls & AI Trigger */}
      <div className="flex items-center gap-2">
        {/* Timeframe Selector */}
        {activeTab === 'chart' && (
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => onChangeTimeframe(tf)}
                className={`px-2 py-1 rounded text-xs font-semibold font-mono transition ${
                  timeframe === tf
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={TIMEFRAME_LABELS[tf].name}
              >
                {tf}
              </button>
            ))}
          </div>
        )}

        {/* Refresh Data */}
        <button
          onClick={onRefreshData}
          disabled={isLoadingData}
          title="Atualizar dados de cotações"
          className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin text-amber-400' : ''}`} />
        </button>

        {/* AI Analysis Trigger */}
        <button
          onClick={onTriggerAiAnalysis}
          disabled={isAiAnalyzing || isLoadingData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition disabled:opacity-50"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isAiAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAiAnalyzing ? 'Analisando...' : 'Analisar Mercado (IA)'}</span>
        </button>

        {/* Settings Modal Button */}
        <button
          onClick={onOpenSettings}
          title="Configurações de Indicadores e Gráfico"
          className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
