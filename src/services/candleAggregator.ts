/**
 * Timeframe Candle Aggregator
 *
 * Agregação cronológica estrita de candles menores em periodicidades maiores:
 * - Abertura: primeira abertura do intervalo
 * - Máxima: maior máxima do intervalo
 * - Mínima: menor mínima do intervalo
 * - Fechamento: último fechamento do intervalo
 * - Volume: soma dos volumes do intervalo
 */

import { OHLCV } from '../indicators/technicalIndicators.ts';

export type Timeframe = '5m' | '15m' | '30m' | '60m' | '1D' | '1S' | '1M';

export const TIMEFRAME_LABELS: Record<Timeframe, { label: string; name: string; minutes: number }> = {
  '5m': { label: '5m', name: '5 Minutos', minutes: 5 },
  '15m': { label: '15m', name: '15 Minutos', minutes: 15 },
  '30m': { label: '30m', name: '30 Minutos', minutes: 30 },
  '60m': { label: '60m', name: '60 Minutos', minutes: 60 },
  '1D': { label: '1D', name: 'Diário', minutes: 1440 },
  '1S': { label: '1S', name: 'Semanal', minutes: 10080 },
  '1M': { label: '1M', name: 'Mensal', minutes: 43200 },
};

/**
 * Parses timestamp into unix epoch seconds
 */
export function toTimestampSeconds(time: string | number): number {
  if (typeof time === 'number') {
    // If milliseconds, convert to seconds
    return time > 20000000000 ? Math.floor(time / 1000) : time;
  }
  const parsed = Date.parse(time);
  return isNaN(parsed) ? 0 : Math.floor(parsed / 1000);
}

/**
 * Aggregates smaller resolution candles into a higher resolution
 */
export function aggregateCandles(
  candles: OHLCV[],
  sourceMinutes: number,
  targetMinutes: number
): OHLCV[] {
  if (candles.length === 0 || targetMinutes <= sourceMinutes) {
    return candles;
  }

  const factor = targetMinutes / sourceMinutes;
  // If not integer multiple, return as is
  if (!Number.isInteger(factor) && targetMinutes < 1440) {
    return candles;
  }

  const result: OHLCV[] = [];
  const targetSeconds = targetMinutes * 60;

  let currentBucket: OHLCV[] = [];
  let currentBucketTimestamp = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const tSec = toTimestampSeconds(c.time);
    const bucketTime = Math.floor(tSec / targetSeconds) * targetSeconds;

    if (currentBucket.length === 0) {
      currentBucket.push(c);
      currentBucketTimestamp = bucketTime;
    } else if (bucketTime === currentBucketTimestamp) {
      currentBucket.push(c);
    } else {
      // Flush completed bucket
      result.push(combineBucket(currentBucket, currentBucketTimestamp));
      currentBucket = [c];
      currentBucketTimestamp = bucketTime;
    }
  }

  // Flush last bucket
  if (currentBucket.length > 0) {
    result.push(combineBucket(currentBucket, currentBucketTimestamp));
  }

  return result;
}

function combineBucket(bucket: OHLCV[], timestampSec: number): OHLCV {
  const open = bucket[0].open;
  const close = bucket[bucket.length - 1].close;
  const high = Math.max(...bucket.map((c) => c.high));
  const low = Math.min(...bucket.map((c) => c.low));
  const volume = bucket.reduce((sum, c) => sum + c.volume, 0);
  const financialVolume = bucket.some((c) => c.financialVolume !== undefined)
    ? bucket.reduce((sum, c) => sum + (c.financialVolume || 0), 0)
    : undefined;

  return {
    time: timestampSec,
    open,
    high,
    low,
    close,
    volume,
    financialVolume,
  };
}
