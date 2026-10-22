import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { ChartContainer } from './components/ChartContainer.tsx';
import { OliverKellPanel } from './components/OliverKellPanel.tsx';
import { VolumePanel } from './components/VolumePanel.tsx';
import { AiAnalysisPanel } from './components/AiAnalysisPanel.tsx';
import { FarolStudio } from './components/FarolStudio.tsx';
import { SettingsModal, AppSettings, DEFAULT_APP_SETTINGS } from './components/SettingsModal.tsx';
import { FooterBar } from './components/FooterBar.tsx';
import { OHLCV, calculateSupportResistance } from './indicators/technicalIndicators.ts';
import { calculateOliverKellCycle } from './indicators/oliverKellCycle.ts';
import { computeFinancialVolume, VolumeConfig, DEFAULT_VOLUME_CONFIG } from './indicators/volume.ts';
import { Timeframe } from './services/candleAggregator.ts';
import { Compass, Sparkles, BarChart2, PanelRightClose, PanelRightOpen } from 'lucide-react';

export default function App() {
  // Navigation & View
  const [activeTab, setActiveTab] = useState<'chart' | 'studio'>('chart');
  const [sidebarTab, setSidebarTab] = useState<'indicators' | 'ai'>('indicators');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Market & Asset State
  const [currentSymbol, setCurrentSymbol] = useState('PETR4.SA');
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [candles, setCandles] = useState<OHLCV[]>([]);
  const [marketMeta, setMarketMeta] = useState<{
    currency: string;
    isRealTime: boolean;
    isDemo: boolean;
    provider: string;
    lastUpdate: string | null;
    shortName: string;
  }>({
    currency: 'BRL',
    isRealTime: false,
    isDemo: true,
    provider: 'Farol Engine (Demonstração)',
    lastUpdate: null,
    shortName: 'PETR4',
  });
  const [isLoadingCandles, setIsLoadingCandles] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);

  // Configuration State (persisted in localStorage)
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('farol_traders_settings');
      return saved ? JSON.parse(saved) : DEFAULT_APP_SETTINGS;
    } catch {
      return DEFAULT_APP_SETTINGS;
    }
  });

  const [volumeConfig, setVolumeConfig] = useState<VolumeConfig>(() => {
    try {
      const saved = localStorage.getItem('farol_traders_volume_config');
      return saved ? JSON.parse(saved) : DEFAULT_VOLUME_CONFIG;
    } catch {
      return DEFAULT_VOLUME_CONFIG;
    }
  });

  // Series visibility toggles
  const [showFastMA, setShowFastMA] = useState(true);
  const [showSlowMA, setShowSlowMA] = useState(true);

  // AI Agent Analysis State
  const [aiAnalysisText, setAiAnalysisText] = useState<string | null>(null);
  const [aiAnalysisTimestamp, setAiAnalysisTimestamp] = useState<string | null>(null);
  const [aiAnalysisSymbol, setAiAnalysisSymbol] = useState<string | null>(null);
  const [aiAnalysisTimeframe, setAiAnalysisTimeframe] = useState<string | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Save settings
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('farol_traders_settings', JSON.stringify(newSettings));
    } catch {
      // ignore
    }
  };

  const handleSaveVolumeConfig = (newConfig: VolumeConfig) => {
    setVolumeConfig(newConfig);
    try {
      localStorage.setItem('farol_traders_volume_config', JSON.stringify(newConfig));
    } catch {
      // ignore
    }
  };

  // Fetch candles from backend
  const loadCandles = useCallback(
    async (sym: string, tf: Timeframe) => {
      setIsLoadingCandles(true);
      setMarketError(null);
      try {
        const res = await fetch(`/api/market/candles?symbol=${encodeURIComponent(sym)}&timeframe=${tf}`);
        if (!res.ok) {
          throw new Error('Falha ao obter cotações do provedor financeiro.');
        }
        const data = await res.json();
        if (!data.candles || data.candles.length === 0) {
          throw new Error(`Nenhum dado encontrado para o ativo ${sym}. Verifique o ticker informado.`);
        }

        setCandles(data.candles);
        setMarketMeta({
          currency: data.currency || (sym.endsWith('.SA') ? 'BRL' : 'USD'),
          isRealTime: !!data.isRealTime,
          isDemo: !!data.isDemo,
          provider: data.provider || 'Yahoo Finance',
          lastUpdate: data.lastUpdate || new Date().toISOString(),
          shortName: data.shortName || sym,
        });
      } catch (err: any) {
        setMarketError(err.message || 'Erro ao carregar ativo');
      } finally {
        setIsLoadingCandles(false);
      }
    },
    []
  );

  useEffect(() => {
    loadCandles(currentSymbol, timeframe);
  }, [currentSymbol, timeframe, loadCandles]);

  // Pure Deterministic Technical Indicator Calculations
  const oliverKellResult = useMemo(() => {
    return calculateOliverKellCycle(candles, {
      fastPeriod: settings.fastPeriod,
      slowPeriod: settings.slowPeriod,
      maType: settings.maType,
      atrPeriod: settings.atrPeriod,
      extensionAtrThreshold: 2.2,
    });
  }, [candles, settings.fastPeriod, settings.slowPeriod, settings.maType, settings.atrPeriod]);

  const volumeResult = useMemo(() => {
    return computeFinancialVolume(candles, volumeConfig, marketMeta.currency);
  }, [candles, volumeConfig, marketMeta.currency]);

  const supportResistance = useMemo(() => {
    return calculateSupportResistance(candles, 25);
  }, [candles]);

  // Request AI Market Analysis
  const handleTriggerAiAnalysis = async () => {
    if (candles.length < 10) {
      setAiError('Dados de histórico insuficientes para análise técnica completa.');
      return;
    }

    setIsAiAnalyzing(true);
    setAiError(null);
    setSidebarTab('ai');
    setIsSidebarOpen(true);

    const latest = candles[candles.length - 1];
    const prev = candles.length > 1 ? candles[candles.length - 2] : latest;
    const priceChange = prev.close ? Number((((latest.close - prev.close) / prev.close) * 100).toFixed(2)) : 0;

    const payload = {
      symbol: currentSymbol,
      assetName: marketMeta.shortName,
      currency: marketMeta.currency,
      timeframe,
      currentPrice: latest.close,
      priceChangePercent: priceChange,
      oliverKellSnapshot: oliverKellResult.current,
      transitionsHistory: oliverKellResult.transitions,
      volumeSummary: volumeResult.summary,
      supports: supportResistance.supports,
      resistances: supportResistance.resistances,
      candlesSummary: `Últimos 5 fechamentos: ${candles.slice(-5).map((c) => c.close).join(', ')}`,
      isDemo: marketMeta.isDemo,
      provider: marketMeta.provider,
    };

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao solicitar análise ao Agente de IA');
      }

      setAiAnalysisText(data.analysis);
      setAiAnalysisTimestamp(data.timestamp);
      setAiAnalysisSymbol(currentSymbol);
      setAiAnalysisTimeframe(timeframe);
    } catch (err: any) {
      setAiError(err.message || 'Erro na comunicação com o Agente de IA');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Header */}
      <Header
        currentSymbol={currentSymbol}
        onSelectSymbol={(sym) => setCurrentSymbol(sym)}
        timeframe={timeframe}
        onChangeTimeframe={(tf) => setTimeframe(tf)}
        onRefreshData={() => loadCandles(currentSymbol, timeframe)}
        onTriggerAiAnalysis={handleTriggerAiAnalysis}
        isAiAnalyzing={isAiAnalyzing}
        isLoadingData={isLoadingCandles}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {activeTab === 'chart' ? (
          <>
            {/* Chart Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 relative">
              {marketError ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 max-w-md">
                    <p className="font-bold text-rose-300 text-sm mb-1">Não foi possível carregar o ativo</p>
                    <p className="text-xs text-rose-400 mb-3">{marketError}</p>
                    <button
                      onClick={() => loadCandles('PETR4.SA', '1D')}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs"
                    >
                      Carregar PETR4.SA (Padrão)
                    </button>
                  </div>
                </div>
              ) : (
                <ChartContainer
                  candles={candles}
                  symbol={currentSymbol}
                  currency={marketMeta.currency}
                  timeframe={timeframe}
                  isRealTime={marketMeta.isRealTime}
                  isDemo={marketMeta.isDemo}
                  provider={marketMeta.provider}
                  oliverKell={oliverKellResult}
                  volumeBars={volumeResult.bars}
                  showFastMA={showFastMA}
                  showSlowMA={showSlowMA}
                  showVolume={volumeConfig.enabled}
                  showVolumeMA={true}
                  showSupportResistance={settings.showSupportResistance}
                  supports={supportResistance.supports}
                  resistances={supportResistance.resistances}
                  fastMAColor={settings.fastMAColor}
                  slowMAColor={settings.slowMAColor}
                  volumeMAColor={settings.volumeMAColor}
                  fastPeriod={settings.fastPeriod}
                  slowPeriod={settings.slowPeriod}
                />
              )}

              {/* Toggle Sidebar floating tab */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="absolute top-12 right-2 z-20 p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 shadow-md transition"
                title={isSidebarOpen ? 'Recolher Painel Lateral' : 'Expandir Painel Lateral'}
              >
                {isSidebarOpen ? (
                  <PanelRightClose className="w-4 h-4 text-amber-400" />
                ) : (
                  <PanelRightOpen className="w-4 h-4 text-amber-400" />
                )}
              </button>
            </main>

            {/* Collapsible Right Sidebar */}
            {isSidebarOpen && (
              <aside className="w-80 md:w-96 border-l border-slate-800 bg-slate-950 flex flex-col h-full overflow-hidden shadow-2xl z-20">
                {/* Sidebar Navigation Tabs */}
                <div className="flex items-center border-b border-slate-800 bg-slate-900 p-1.5 gap-1 shrink-0">
                  <button
                    onClick={() => setSidebarTab('indicators')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-bold transition ${
                      sidebarTab === 'indicators'
                        ? 'bg-slate-800 text-amber-400 shadow-sm border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Indicadores & Volume</span>
                  </button>

                  <button
                    onClick={() => setSidebarTab('ai')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-bold transition ${
                      sidebarTab === 'ai'
                        ? 'bg-slate-800 text-amber-400 shadow-sm border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Agente IA Farol</span>
                  </button>
                </div>

                {/* Sidebar Content */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {sidebarTab === 'indicators' ? (
                    <>
                      {/* Oliver Kell Cycle Panel */}
                      <OliverKellPanel
                        analysis={oliverKellResult}
                        showFastMA={showFastMA}
                        onToggleFastMA={() => setShowFastMA(!showFastMA)}
                        showSlowMA={showSlowMA}
                        onToggleSlowMA={() => setShowSlowMA(!showSlowMA)}
                        fastPeriod={settings.fastPeriod}
                        slowPeriod={settings.slowPeriod}
                        fastMAColor={settings.fastMAColor}
                        slowMAColor={settings.slowMAColor}
                      />

                      {/* Financial Volume Panel */}
                      <VolumePanel
                        config={volumeConfig}
                        onChangeConfig={handleSaveVolumeConfig}
                        summary={volumeResult.summary}
                        currency={marketMeta.currency}
                      />
                    </>
                  ) : (
                    /* AI Technical Analysis Panel */
                    <AiAnalysisPanel
                      analysisText={aiAnalysisText}
                      analysisTimestamp={aiAnalysisTimestamp}
                      analysisSymbol={aiAnalysisSymbol}
                      analysisTimeframe={aiAnalysisTimeframe}
                      currentSymbol={currentSymbol}
                      currentTimeframe={timeframe}
                      isAnalyzing={isAiAnalyzing}
                      onTriggerAnalysis={handleTriggerAiAnalysis}
                      error={aiError}
                    />
                  )}
                </div>
              </aside>
            )}
          </>
        ) : (
          /* Farol Studio: Logo Generator (1K, 2K, 4K) & Video Animator (16:9, 9:16) */
          <FarolStudio currentSymbol={currentSymbol} />
        )}
      </div>

      {/* Footer Status Bar */}
      <FooterBar
        provider={marketMeta.provider}
        isRealTime={marketMeta.isRealTime}
        isDemo={marketMeta.isDemo}
        currency={marketMeta.currency}
        lastUpdate={marketMeta.lastUpdate}
        candleCount={candles.length}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
