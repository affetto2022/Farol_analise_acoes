import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSMA,
  calculateEMA,
  calculateTrueRange,
  calculateWilderATR,
  calculateSupportResistance,
  OHLCV,
} from './technicalIndicators.ts';
import {
  calculateOliverKellCycle,
  DEFAULT_KELL_CONFIG,
} from './oliverKellCycle.ts';
import { computeFinancialVolume } from './volume.ts';
import { aggregateCandles } from '../services/candleAggregator.ts';

// Deterministic test candles
const sampleCandles: OHLCV[] = [
  { time: '2026-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
  { time: '2026-01-02', open: 102, high: 108, low: 101, close: 107, volume: 1200 },
  { time: '2026-01-03', open: 107, high: 110, low: 104, close: 105, volume: 900 },
  { time: '2026-01-04', open: 105, high: 106, low: 98, close: 100, volume: 1500 },
  { time: '2026-01-05', open: 100, high: 103, low: 97, close: 101, volume: 1100 },
];

test('calculateSMA computes correct rolling average', () => {
  const data = [10, 20, 30, 40, 50];
  const sma3 = calculateSMA(data, 3);
  assert.equal(sma3[0], null);
  assert.equal(sma3[1], null);
  assert.equal(sma3[2], 20); // (10+20+30)/3
  assert.equal(sma3[3], 30); // (20+30+40)/3
  assert.equal(sma3[4], 40); // (30+40+50)/3
});

test('calculateEMA responds with exponential weighting', () => {
  const data = [10, 20, 30, 40, 50];
  const ema3 = calculateEMA(data, 3);
  assert.equal(ema3[0], null);
  assert.equal(ema3[1], null);
  assert.equal(ema3[2], 20); // First EMA is initial SMA
  // Multiplier = 2 / (3 + 1) = 0.5
  // ema[3] = (40 - 20) * 0.5 + 20 = 30
  assert.equal(ema3[3], 30);
  // ema[4] = (50 - 30) * 0.5 + 30 = 40
  assert.equal(ema3[4], 40);
});

test('calculateTrueRange respects gaps from previous close', () => {
  const tr = calculateTrueRange(sampleCandles);
  assert.equal(tr[0], 10); // 105 - 95
  assert.equal(tr[1], 7); // max(108-101=7, |108-102|=6, |101-102|=1)
  assert.equal(tr[2], 6); // max(110-104=6, |110-107|=3, |104-107|=3)
  assert.equal(tr[3], 8); // max(106-98=8, |106-105|=1, |98-105|=7)
});

test('calculateWilderATR computes smoothed average', () => {
  const atr = calculateWilderATR(sampleCandles, 3);
  assert.equal(atr[0], null);
  assert.equal(atr[1], null);
  // TRs: [10, 7, 6, 8, 6]. Initial SMA(3) = (10 + 7 + 6) / 3 = 7.6667
  assert.equal(atr[2], 7.6667);
});

test('calculateSupportResistance detects local extremes', () => {
  const levels = calculateSupportResistance(sampleCandles, 5);
  assert.ok(levels.supports.length > 0);
  assert.ok(levels.resistances.length > 0);
  assert.ok(levels.resistances[0] >= 108);
  assert.ok(levels.supports[0] <= 98);
});

test('calculateOliverKellCycle produces deterministic phases and transitions', () => {
  // Generate 35 candles simulating an uptrend, breakout, extension, and correction
  const candles: OHLCV[] = [];
  let basePrice = 50;
  for (let i = 0; i < 40; i++) {
    if (i < 15) {
      basePrice += 0.5; // slow rise
    } else if (i < 28) {
      basePrice += 1.8; // sharp rally (Phase 2 & 3)
    } else {
      basePrice -= 2.0; // sharp drop (Phase 4 / 5)
    }
    candles.push({
      time: 1700000000 + i * 86400,
      open: basePrice - 0.5,
      high: basePrice + 1.2,
      low: basePrice - 0.8,
      close: basePrice,
      volume: 10000 + i * 500,
    });
  }

  const result = calculateOliverKellCycle(candles, DEFAULT_KELL_CONFIG);
  assert.ok(result.snapshots.length === 40);
  assert.ok(result.current !== null);
  assert.ok([1, 2, 3, 4, 5, 6].includes(result.current!.phase));
  assert.ok(result.fastMA.length === 40);
  assert.ok(result.slowMA.length === 40);
});

test('computeFinancialVolume calculates typical price estimate and surge', () => {
  const { bars, summary } = computeFinancialVolume(sampleCandles, {
    enabled: true,
    maPeriod: 3,
    maType: 'SMA',
    method: 'typical',
    surgeMultiplier: 1.2,
  });

  assert.equal(bars.length, 5);
  assert.ok(summary !== null);
  assert.equal(summary!.isRealData, false); // Estimated from typical price
  assert.ok(summary!.currentFinancialVolume > 0);
});

test('aggregateCandles accurately compresses lower timeframe into higher', () => {
  const fiveMinCandles: OHLCV[] = [
    { time: 0, open: 10, high: 12, low: 9, close: 11, volume: 100 },
    { time: 300, open: 11, high: 15, low: 10, close: 14, volume: 150 },
    { time: 600, open: 14, high: 14, low: 8, close: 12, volume: 200 },
  ];

  // Aggregate 5m into 15m (900 seconds)
  const agg = aggregateCandles(fiveMinCandles, 5, 15);
  assert.equal(agg.length, 1);
  assert.equal(agg[0].open, 10); // First open
  assert.equal(agg[0].high, 15); // Max high
  assert.equal(agg[0].low, 8); // Min low
  assert.equal(agg[0].close, 12); // Last close
  assert.equal(agg[0].volume, 450); // Sum of volumes
});
