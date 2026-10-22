/**
 * Financial Volume Module
 *
 * Computes:
 * - Real or estimated financial volume per candle
 * - Method selection: 'real' | 'typical' ((H+L+C)/3 * Vol) | 'close' (Close * Vol) | 'vwap_approx' ((O+H+L+C)/4 * Vol)
 * - Volume Moving Average (SMA / EMA)
 * - Ratio to average (volume surge vs low volume)
 */

import { OHLCV, calculateEMA, calculateSMA } from './technicalIndicators.ts';

export type VolumeCalcMethod = 'real' | 'typical' | 'close' | 'ohlc_average';

export interface VolumeConfig {
  enabled: boolean;
  maPeriod: number; // default 20
  maType: 'SMA' | 'EMA'; // default 'SMA'
  method: VolumeCalcMethod;
  surgeMultiplier: number; // default 1.5x (highlights volume spike)
}

export const DEFAULT_VOLUME_CONFIG: VolumeConfig = {
  enabled: true,
  maPeriod: 20,
  maType: 'SMA',
  method: 'typical',
  surgeMultiplier: 1.5,
};

export interface VolumeBarResult {
  time: string | number;
  rawVolume: number;
  financialVolume: number;
  isRealFinancial: boolean;
  color: string;
  isUp: boolean;
  maValue: number | null;
  ratioToMA: number | null;
  isSurge: boolean;
}

export interface VolumeAnalysisSummary {
  currentFinancialVolume: number;
  averageFinancialVolume: number;
  volumeRatio: number;
  volumeTrend: 'Forte Expansão' | 'Acima da Média' | 'Normal' | 'Abaixo da Média' | 'Secagem / Baixo';
  isRealData: boolean;
  methodologyNote: string;
}

export function computeFinancialVolume(
  candles: OHLCV[],
  config: VolumeConfig = DEFAULT_VOLUME_CONFIG,
  currency: string = 'BRL'
): {
  bars: VolumeBarResult[];
  summary: VolumeAnalysisSummary | null;
} {
  if (candles.length === 0) {
    return { bars: [], summary: null };
  }

  const values: number[] = [];
  const hasRealFinancialData = candles.some((c) => c.financialVolume && c.financialVolume > 0);

  // Calculate volume series for each candle
  for (const c of candles) {
    let finVal: number;
    if (config.method === 'real' && c.financialVolume && c.financialVolume > 0) {
      finVal = c.financialVolume;
    } else {
      // Representative price
      let repPrice = c.close;
      if (config.method === 'typical') {
        repPrice = (c.high + c.low + c.close) / 3;
      } else if (config.method === 'ohlc_average') {
        repPrice = (c.open + c.high + c.low + c.close) / 4;
      } else {
        repPrice = c.close;
      }
      finVal = repPrice * c.volume;
    }
    values.push(finVal);
  }

  const maValues =
    config.maType === 'EMA'
      ? calculateEMA(values, config.maPeriod)
      : calculateSMA(values, config.maPeriod);

  const bars: VolumeBarResult[] = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const isUp = c.close >= c.open;
    const finVal = values[i];
    const ma = maValues[i];
    const ratio = ma && ma > 0 ? Number((finVal / ma).toFixed(2)) : null;
    const isSurge = ratio !== null && ratio >= config.surgeMultiplier;

    // Up candle: emerald green (#10b981), Down candle: rose red (#ef4444)
    const color = isUp ? '#10b981' : '#ef4444';

    bars.push({
      time: c.time,
      rawVolume: c.volume,
      financialVolume: Number(finVal.toFixed(2)),
      isRealFinancial: config.method === 'real' && !!c.financialVolume,
      color,
      isUp,
      maValue: ma !== null ? Number(ma.toFixed(2)) : null,
      ratioToMA: ratio,
      isSurge,
    });
  }

  const lastBar = bars.slice(-1)[0];
  const lastMA = lastBar?.maValue ?? 1;
  const currentFin = lastBar?.financialVolume ?? 0;
  const ratio = lastMA > 0 ? currentFin / lastMA : 1;

  let volumeTrend: VolumeAnalysisSummary['volumeTrend'] = 'Normal';
  if (ratio >= 2.0) volumeTrend = 'Forte Expansão';
  else if (ratio >= 1.2) volumeTrend = 'Acima da Média';
  else if (ratio <= 0.6) volumeTrend = 'Secagem / Baixo';
  else if (ratio < 0.9) volumeTrend = 'Abaixo da Média';

  const isReal = config.method === 'real' && hasRealFinancialData;
  const methodologyNote = isReal
    ? `Volume financeiro real fornecido pela bolsa/provedor em ${currency}.`
    : `Volume financeiro estimado pela fórmula: Preço ${
        config.method === 'typical'
          ? 'Típico [(H+L+C)/3]'
          : config.method === 'ohlc_average'
          ? 'Médio OHLC [(O+H+L+C)/4]'
          : 'de Fechamento'
      } × Quantidade de Ações Negociadas.`;

  const summary: VolumeAnalysisSummary = {
    currentFinancialVolume: currentFin,
    averageFinancialVolume: lastMA,
    volumeRatio: Number(ratio.toFixed(2)),
    volumeTrend,
    isRealData: isReal,
    methodologyNote,
  };

  return { bars, summary };
}

/**
 * Format currency in compact human-readable format (e.g. R$ 1.45 B or $ 2.3 M)
 */
export function formatCurrencyValue(value: number, currency: string = 'BRL'): string {
  const symbol = currency === 'BRL' ? 'R$' : '$';
  if (value >= 1_000_000_000) {
    return `${symbol} ${(value / 1_000_000_000).toFixed(2)} B`;
  }
  if (value >= 1_000_000) {
    return `${symbol} ${(value / 1_000_000).toFixed(2)} M`;
  }
  if (value >= 1_000) {
    return `${symbol} ${(value / 1_000).toFixed(1)} K`;
  }
  return `${symbol} ${value.toFixed(2)}`;
}
