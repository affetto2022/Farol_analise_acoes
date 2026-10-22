/**
 * Core Technical Indicators & Math
 * Wilder's ATR, Moving Averages (SMA/EMA), and Support/Resistance detection.
 */

export interface OHLCV {
  time: string | number; // ISO string, YYYY-MM-DD or unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  financialVolume?: number; // Real or estimated currency value
}

/**
 * Calculates Simple Moving Average (SMA)
 */
export function calculateSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  if (period <= 0 || data.length === 0) return result;

  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    if (i >= period) {
      sum -= data[i - period];
    }
    if (i >= period - 1) {
      result.push(Number((sum / period).toFixed(4)));
    } else {
      result.push(null);
    }
  }
  return result;
}

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  if (period <= 0 || data.length === 0) return result;

  const multiplier = 2 / (period + 1);
  let prevEma: number | null = null;

  // First EMA is usually the SMA of the first 'period' values
  let initialSum = 0;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      initialSum += data[i];
      result.push(null);
    } else if (i === period - 1) {
      initialSum += data[i];
      prevEma = initialSum / period;
      result.push(Number(prevEma.toFixed(4)));
    } else {
      const currentEma: number = (data[i] - (prevEma as number)) * multiplier + (prevEma as number);
      prevEma = currentEma;
      result.push(Number(currentEma.toFixed(4)));
    }
  }
  return result;
}

/**
 * Calculates True Range (TR)
 * TR = max(H - L, abs(H - PrevC), abs(L - PrevC))
 */
export function calculateTrueRange(candles: OHLCV[]): number[] {
  if (candles.length === 0) return [];
  const tr: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    const current = candles[i];
    if (i === 0) {
      tr.push(current.high - current.low);
    } else {
      const prevClose = candles[i - 1].close;
      const hl = current.high - current.low;
      const hpc = Math.abs(current.high - prevClose);
      const lpc = Math.abs(current.low - prevClose);
      tr.push(Math.max(hl, hpc, lpc));
    }
  }
  return tr;
}

/**
 * Calculates Average True Range (ATR) with Wilder's Smoothing
 * First ATR = SMA of True Range over period
 * Subsequent ATR = (PrevATR * (period - 1) + CurrentTR) / period
 */
export function calculateWilderATR(candles: OHLCV[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];
  if (candles.length === 0 || period <= 0) return result;

  const tr = calculateTrueRange(candles);
  let prevATR: number | null = null;
  let initialSum = 0;

  for (let i = 0; i < tr.length; i++) {
    if (i < period - 1) {
      initialSum += tr[i];
      result.push(null);
    } else if (i === period - 1) {
      initialSum += tr[i];
      prevATR = initialSum / period;
      result.push(Number(prevATR.toFixed(4)));
    } else {
      const currentATR: number = ((prevATR as number) * (period - 1) + tr[i]) / period;
      prevATR = currentATR;
      result.push(Number(currentATR.toFixed(4)));
    }
  }
  return result;
}

/**
 * Objective Pivot-based Support and Resistance Level Detection
 */
export function calculateSupportResistance(candles: OHLCV[], lookback: number = 20): {
  supports: number[];
  resistances: number[];
} {
  if (candles.length < 5) {
    return { supports: [], resistances: [] };
  }

  const recent = candles.slice(-Math.min(lookback, candles.length));
  const highs = recent.map((c) => c.high);
  const lows = recent.map((c) => c.low);

  // Local peaks and valleys (3-bar fractal pivots)
  const pivotHighs: number[] = [];
  const pivotLows: number[] = [];

  for (let i = 1; i < recent.length - 1; i++) {
    if (recent[i].high > recent[i - 1].high && recent[i].high > recent[i + 1].high) {
      pivotHighs.push(recent[i].high);
    }
    if (recent[i].low < recent[i - 1].low && recent[i].low < recent[i + 1].low) {
      pivotLows.push(recent[i].low);
    }
  }

  // Include absolute recent range
  const maxHigh = Math.max(...highs);
  const minLow = Math.min(...lows);
  if (!pivotHighs.includes(maxHigh)) pivotHighs.push(maxHigh);
  if (!pivotLows.includes(minLow)) pivotLows.push(minLow);

  // Sort and remove duplicates within 0.3%
  const cleanLevels = (levels: number[], desc: boolean = false) => {
    levels.sort((a, b) => (desc ? b - a : a - b));
    const deduped: number[] = [];
    for (const lvl of levels) {
      if (!deduped.some((d) => Math.abs(d - lvl) / lvl < 0.005)) {
        deduped.push(Number(lvl.toFixed(2)));
      }
    }
    return deduped.slice(0, 4);
  };

  return {
    supports: cleanLevels(pivotLows, false),
    resistances: cleanLevels(pivotHighs, true),
  };
}
