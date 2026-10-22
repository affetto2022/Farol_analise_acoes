/**
 * Oliver Kell Price Cycle - Deterministic 6-Stage State Machine
 *
 * Implements rule-based phase determination based on:
 * - 10-period Moving Average (EMA/SMA)
 * - 20-period Moving Average (EMA/SMA)
 * - Price position relative to MA10 & MA20
 * - Moving Average slopes (3-period rate of change)
 * - Wilder ATR extension / volatility ratio
 */

import { OHLCV, calculateEMA, calculateSMA, calculateWilderATR } from './technicalIndicators.ts';

export type MAType = 'EMA' | 'SMA';

export interface OliverKellConfig {
  fastPeriod: number; // default 10
  slowPeriod: number; // default 20
  maType: MAType; // default 'EMA'
  atrPeriod: number; // default 14
  extensionAtrThreshold: number; // default 2.2 ATRs
}

export const DEFAULT_KELL_CONFIG: OliverKellConfig = {
  fastPeriod: 10,
  slowPeriod: 20,
  maType: 'EMA',
  atrPeriod: 14,
  extensionAtrThreshold: 2.2,
};

export type CyclePhaseNumber = 1 | 2 | 3 | 4 | 5 | 6;

export interface PhaseTransition {
  index: number;
  time: string | number;
  fromPhase: CyclePhaseNumber;
  toPhase: CyclePhaseNumber;
  triggerEvent: string;
  close: number;
}

export interface CycleSnapshot {
  phase: CyclePhaseNumber;
  phaseName: string;
  description: string;
  direction: 'Alta Forte' | 'Alta em Formação' | 'Neutro / Alerta' | 'Baixa Inicial' | 'Baixa Forte';
  priceVsFastMA: 'Acima' | 'Abaixo' | 'Próximo';
  priceVsSlowMA: 'Acima' | 'Abaixo' | 'Próximo';
  fastMASlope: 'Ascendente' | 'Descendente' | 'Lateral';
  slowMASlope: 'Ascendente' | 'Descendente' | 'Lateral';
  fastMAValue: number;
  slowMAValue: number;
  atrValue: number;
  volatilityRegime: 'Expansão' | 'Normal' | 'Contração';
  lastTransitionEvent: string;
  distanceFromFastMAPercent: number;
  distanceFromSlowMAPercent: number;
}

export interface OliverKellAnalysisResult {
  snapshots: (CycleSnapshot | null)[];
  current: CycleSnapshot | null;
  transitions: PhaseTransition[];
  fastMA: (number | null)[];
  slowMA: (number | null)[];
  atr: (number | null)[];
}

export const KELL_PHASE_METADATA: Record<
  CyclePhaseNumber,
  { name: string; tag: string; description: string; color: string }
> = {
  1: {
    name: 'Fase 1: Acumulação / Reversão Inicial',
    tag: 'Fase 1 (Acumulação)',
    description: 'Preço retoma e fecha acima da M10 após tendência de baixa; médias estabilizando.',
    color: '#38bdf8', // sky blue
  },
  2: {
    name: 'Fase 2: Rompimento / Confirmação de Tendência',
    tag: 'Fase 2 (Confirmação)',
    description: 'M10 cruza acima da M20 (cruzamento tático) com preço acima de ambas as médias.',
    color: '#34d399', // emerald / green
  },
  3: {
    name: 'Fase 3: Avanço / Tendência Estabelecida',
    tag: 'Fase 3 (Avanço)',
    description: 'Tendência altista madura; Preço > M10 > M20 com inclinações ascendentes sustentadas.',
    color: '#10b981', // dark green
  },
  4: {
    name: 'Fase 4: Exaustão / Clímax ou Distribuição',
    tag: 'Fase 4 (Distribuição)',
    description: 'Esticamento excessivo (>2.2 ATRs) ou perda de suporte da M10 com perda de fôlego.',
    color: '#f59e0b', // amber / warning
  },
  5: {
    name: 'Fase 5: Perda de Médias / Rompimento de Baixa',
    tag: 'Fase 5 (Perda de Médias)',
    description: 'Preço fecha abaixo da M20 ou M10 cruza abaixo da M20, quebrando a estrutura altista.',
    color: '#f87171', // red light
  },
  6: {
    name: 'Fase 6: Desvalorização / Tendência de Baixa',
    tag: 'Fase 6 (Desvalorização)',
    description: 'Tendência de baixa contínua; Preço < M10 < M20 com inclinações descendentes.',
    color: '#ef4444', // red
  },
};

/**
 * Calculates Oliver Kell Cycle with full history of states and deterministic rules
 */
export function calculateOliverKellCycle(
  candles: OHLCV[],
  config: OliverKellConfig = DEFAULT_KELL_CONFIG
): OliverKellAnalysisResult {
  if (candles.length === 0) {
    return {
      snapshots: [],
      current: null,
      transitions: [],
      fastMA: [],
      slowMA: [],
      atr: [],
    };
  }

  const closes = candles.map((c) => c.close);
  const fastMA =
    config.maType === 'EMA'
      ? calculateEMA(closes, config.fastPeriod)
      : calculateSMA(closes, config.fastPeriod);
  const slowMA =
    config.maType === 'EMA'
      ? calculateEMA(closes, config.slowPeriod)
      : calculateSMA(closes, config.slowPeriod);
  const atr = calculateWilderATR(candles, config.atrPeriod);

  const snapshots: (CycleSnapshot | null)[] = [];
  const transitions: PhaseTransition[] = [];

  let previousPhase: CyclePhaseNumber = 6;
  let lastEvent = 'Inicialização de dados históricos';

  // Average ATR for volatility expansion/contraction check
  const validATRs = atr.filter((v): v is number => v !== null);
  const avgATR =
    validATRs.length > 0 ? validATRs.reduce((a, b) => a + b, 0) / validATRs.length : 1;

  for (let i = 0; i < candles.length; i++) {
    const fMA = fastMA[i];
    const sMA = slowMA[i];
    const currentATR = atr[i];
    const c = candles[i];

    // Need at least slowPeriod bars to evaluate state machine
    if (fMA === null || sMA === null || currentATR === null || i < config.slowPeriod) {
      snapshots.push(null);
      continue;
    }

    const prevFMA = fastMA[i - 1] ?? fMA;
    const prevSMA = slowMA[i - 1] ?? sMA;
    const prevC = candles[i - 1].close;

    // Slopes based on 3 bars change or 1 bar change
    const fSlopeVal = fMA - prevFMA;
    const sSlopeVal = sMA - prevSMA;
    const fastSlope: 'Ascendente' | 'Descendente' | 'Lateral' =
      fSlopeVal > 0.001 * fMA ? 'Ascendente' : fSlopeVal < -0.001 * fMA ? 'Descendente' : 'Lateral';
    const slowSlope: 'Ascendente' | 'Descendente' | 'Lateral' =
      sSlopeVal > 0.0005 * sMA ? 'Ascendente' : sSlopeVal < -0.0005 * sMA ? 'Descendente' : 'Lateral';

    // Position of price relative to MAs
    const priceVsFast: 'Acima' | 'Abaixo' | 'Próximo' =
      c.close > fMA * 1.002 ? 'Acima' : c.close < fMA * 0.998 ? 'Abaixo' : 'Próximo';
    const priceVsSlow: 'Acima' | 'Abaixo' | 'Próximo' =
      c.close > sMA * 1.002 ? 'Acima' : c.close < sMA * 0.998 ? 'Abaixo' : 'Próximo';

    // Extension check: distance from slow MA in multiples of ATR
    const distanceATR = (c.close - sMA) / currentATR;

    // State classification according to deterministic criteria
    let currentPhase: CyclePhaseNumber = previousPhase;
    let transitionReason = '';

    const isGoldenCross = prevFMA <= prevSMA && fMA > sMA;
    const isDeathCross = prevFMA >= prevSMA && fMA < sMA;
    const priceReclaimedFast = prevC <= prevFMA && c.close > fMA;
    const priceLostFast = prevC >= prevFMA && c.close < fMA;
    const priceLostSlow = prevC >= prevSMA && c.close < sMA;

    // Deterministic state machine logic
    if (c.close > fMA && fMA > sMA) {
      // Price and Fast MA above Slow MA
      if (distanceATR >= config.extensionAtrThreshold) {
        currentPhase = 4;
        transitionReason = `Esticamento acentuado de preço (${distanceATR.toFixed(1)}x ATR acima da M20)`;
      } else if (isGoldenCross) {
        currentPhase = 2;
        transitionReason = 'Cruzamento tático altista: M10 cruzou acima da M20';
      } else if (previousPhase === 1 || previousPhase === 2) {
        if (fastSlope === 'Ascendente') {
          currentPhase = 3;
          transitionReason = 'Confirmação e alinhamento de alta (Preço > M10 > M20)';
        } else {
          currentPhase = 2;
        }
      } else if (previousPhase === 4 && priceReclaimedFast) {
        currentPhase = 3;
        transitionReason = 'Retomada de força após correção; fechamento recupera M10';
      } else if (previousPhase === 5 || previousPhase === 6) {
        currentPhase = 2;
        transitionReason = 'Rompimento direto para zona altista acima de M10 e M20';
      } else {
        currentPhase = 3;
      }
    } else if (c.close < fMA && fMA > sMA) {
      // Fast MA still above Slow MA, but Price dipped below Fast MA
      if (c.close < sMA) {
        currentPhase = 5;
        transitionReason = 'Perda simultânea da M10 e da M20 com fechamento abaixo';
      } else {
        currentPhase = 4;
        transitionReason = priceLostFast
          ? 'Perda do suporte da M10 (início de correção ou distribuição)'
          : 'Preço trabalhando entre M10 e M20 em fase distributiva';
      }
    } else if (fMA <= sMA) {
      // Fast MA is below Slow MA
      if (isDeathCross) {
        currentPhase = 5;
        transitionReason = 'Cruzamento baixista: M10 cruzou abaixo da M20';
      } else if (c.close > fMA && c.close < sMA) {
        currentPhase = 1;
        transitionReason = priceReclaimedFast
          ? 'Tentativa de reversão de fundo: preço superou M10'
          : 'Acumulação em curso com preço acima da M10 e abaixo da M20';
      } else if (c.close >= sMA) {
        currentPhase = 1;
        transitionReason = 'Preço superou M20 antes do cruzamento de médias (acumulação avançada)';
      } else {
        currentPhase = 6;
        if (priceLostSlow) {
          transitionReason = 'Preço acelerando abaixo de M10 e M20 (tendência de baixa)';
        }
      }
    }

    // Register transition if phase changed
    if (currentPhase !== previousPhase) {
      lastEvent = transitionReason || `Transição da Fase ${previousPhase} para a Fase ${currentPhase}`;
      transitions.push({
        index: i,
        time: c.time,
        fromPhase: previousPhase,
        toPhase: currentPhase,
        triggerEvent: lastEvent,
        close: c.close,
      });
      previousPhase = currentPhase;
    }

    // Volatility regime
    const volRegime: 'Expansão' | 'Normal' | 'Contração' =
      currentATR > avgATR * 1.25
        ? 'Expansão'
        : currentATR < avgATR * 0.75
        ? 'Contração'
        : 'Normal';

    // Direction label
    const directionMap: Record<CyclePhaseNumber, CycleSnapshot['direction']> = {
      1: 'Alta em Formação',
      2: 'Alta Forte',
      3: 'Alta Forte',
      4: 'Neutro / Alerta',
      5: 'Baixa Inicial',
      6: 'Baixa Forte',
    };

    const snapshot: CycleSnapshot = {
      phase: currentPhase,
      phaseName: KELL_PHASE_METADATA[currentPhase].name,
      description: KELL_PHASE_METADATA[currentPhase].description,
      direction: directionMap[currentPhase],
      priceVsFastMA: priceVsFast,
      priceVsSlowMA: priceVsSlow,
      fastMASlope: fastSlope,
      slowMASlope: slowSlope,
      fastMAValue: Number(fMA.toFixed(2)),
      slowMAValue: Number(sMA.toFixed(2)),
      atrValue: Number(currentATR.toFixed(2)),
      volatilityRegime: volRegime,
      lastTransitionEvent: lastEvent,
      distanceFromFastMAPercent: Number((((c.close - fMA) / fMA) * 100).toFixed(2)),
      distanceFromSlowMAPercent: Number((((c.close - sMA) / sMA) * 100).toFixed(2)),
    };

    snapshots.push(snapshot);
  }

  const current = snapshots.slice(-1)[0] ?? null;

  return {
    snapshots,
    current,
    transitions,
    fastMA,
    slowMA,
    atr,
  };
}
