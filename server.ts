import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// In-memory cache for market quotes & candles to prevent aggressive rate-limiting
interface CacheEntry {
  timestamp: number;
  data: any;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

// Normalizes symbols across B3 and international exchanges
export function normalizeSymbol(input: string): {
  normalized: string;
  original: string;
  market: 'B3' | 'US' | 'CRYPTO';
  currency: 'BRL' | 'USD';
} {
  const clean = input.trim().toUpperCase();
  if (clean.endsWith('.SA')) {
    return { normalized: clean, original: input, market: 'B3', currency: 'BRL' };
  }
  // Check typical B3 patterns (e.g., PETR4, VALE3, ITUB4, BOVA11, BBAS3, WEGE3)
  const isB3Ticker = /^[A-Z]{4}(3|4|5|6|11|12)$/.test(clean);
  if (isB3Ticker) {
    return { normalized: `${clean}.SA`, original: input, market: 'B3', currency: 'BRL' };
  }
  if (clean.includes('-USD') || clean === 'BTC' || clean === 'ETH') {
    const norm = clean.includes('-USD') ? clean : `${clean}-USD`;
    return { normalized: norm, original: input, market: 'CRYPTO', currency: 'USD' };
  }
  return { normalized: clean, original: input, market: 'US', currency: 'USD' };
}

// Generate realistic deterministic seed data when live provider is rate-limited or offline
function generateDeterministicCandles(
  symbol: string,
  timeframe: string,
  currency: string
) {
  const count = 120;
  const now = Math.floor(Date.now() / 1000);
  let stepSec = 86400; // 1D default

  if (timeframe === '5m') stepSec = 300;
  else if (timeframe === '15m') stepSec = 900;
  else if (timeframe === '30m') stepSec = 1800;
  else if (timeframe === '60m') stepSec = 3600;
  else if (timeframe === '1S') stepSec = 86400 * 7;
  else if (timeframe === '1M') stepSec = 86400 * 30;

  let basePrice = 35.0;
  if (symbol.includes('PETR4')) basePrice = 37.8;
  else if (symbol.includes('VALE3')) basePrice = 61.2;
  else if (symbol.includes('AAPL')) basePrice = 228.5;
  else if (symbol.includes('NVDA')) basePrice = 142.3;
  else if (symbol.includes('MSFT')) basePrice = 425.0;
  else if (symbol.includes('BTC')) basePrice = 67500.0;

  const candles = [];
  let currentPrice = basePrice * 0.85;

  for (let i = 0; i < count; i++) {
    const time = now - (count - i) * stepSec;
    // Controlled trend with pullback cycles matching Oliver Kell phases
    const cycle = Math.sin(i / 10) * 0.03;
    const noise = Math.sin(i * 1.7) * 0.015;
    const drift = (i / count) * 0.2; // upward drift
    const priceChange = (cycle + noise + drift * 0.05) * currentPrice;

    const open = Number(currentPrice.toFixed(2));
    const close = Number(Math.max(1, currentPrice + priceChange).toFixed(2));
    const high = Number((Math.max(open, close) + Math.abs(currentPrice * 0.012)).toFixed(2));
    const low = Number((Math.min(open, close) - Math.abs(currentPrice * 0.01)).toFixed(2));
    const volume = Math.floor(100000 + Math.abs(Math.sin(i * 0.8)) * 850000);
    const financialVolume = Number((((high + low + close) / 3) * volume).toFixed(2));

    candles.push({
      time,
      open,
      high,
      low,
      close,
      volume,
      financialVolume,
    });
    currentPrice = close;
  }

  return {
    symbol,
    timeframe,
    currency,
    isRealTime: false,
    isDemo: true,
    provider: 'Farol Engine (Demonstração)',
    lastUpdate: new Date().toISOString(),
    candles,
  };
}

// -----------------------------------------------------------------------------
// Market Data API Routes
// -----------------------------------------------------------------------------

// Search endpoint
app.get('/api/market/search', (req: Request, res: Response) => {
  const query = ((req.query.q as string) || '').trim().toUpperCase();
  if (!query) {
    return res.json({ results: [] });
  }

  const popularSymbols = [
    { symbol: 'PETR4.SA', name: 'Petróleo Brasileiro S.A. - Petrobras', exchange: 'B3', currency: 'BRL', type: 'Ação' },
    { symbol: 'VALE3.SA', name: 'Vale S.A.', exchange: 'B3', currency: 'BRL', type: 'Ação' },
    { symbol: 'ITUB4.SA', name: 'Itaú Unibanco Holding S.A.', exchange: 'B3', currency: 'BRL', type: 'Ação' },
    { symbol: 'BBAS3.SA', name: 'Banco do Brasil S.A.', exchange: 'B3', currency: 'BRL', type: 'Ação' },
    { symbol: 'WEGE3.SA', name: 'WEG S.A.', exchange: 'B3', currency: 'BRL', type: 'Ação' },
    { symbol: 'BOVA11.SA', name: 'iShares Ibovespa Fundo de Índice', exchange: 'B3', currency: 'BRL', type: 'ETF' },
    { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', currency: 'USD', type: 'Ação' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', currency: 'USD', type: 'Ação' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', currency: 'USD', type: 'Ação' },
    { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ', currency: 'USD', type: 'Ação' },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE', currency: 'USD', type: 'ETF' },
    { symbol: 'BTC-USD', name: 'Bitcoin / USD', exchange: 'Crypto', currency: 'USD', type: 'Cripto' },
  ];

  const matches = popularSymbols.filter(
    (s) => s.symbol.includes(query) || s.name.toUpperCase().includes(query)
  );

  // If user searched for custom ticker not in quick list, add dynamic option
  const { normalized, market, currency } = normalizeSymbol(query);
  if (!matches.some((m) => m.symbol === normalized)) {
    matches.unshift({
      symbol: normalized,
      name: `${normalized} (${market})`,
      exchange: market,
      currency,
      type: 'Ativo Financeiro',
    });
  }

  return res.json({ results: matches.slice(0, 8) });
});

// Candles endpoint
app.get('/api/market/candles', async (req: Request, res: Response) => {
  const symbolParam = (req.query.symbol as string) || 'PETR4.SA';
  const timeframe = (req.query.timeframe as string) || '1D';
  const { normalized, currency } = normalizeSymbol(symbolParam);

  const cacheKey = `${normalized}_${timeframe}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.json(cached.data);
  }

  // Interval mapping for Yahoo Finance
  let interval = '1d';
  let range = '1y';

  if (timeframe === '5m') {
    interval = '5m';
    range = '5d';
  } else if (timeframe === '15m') {
    interval = '15m';
    range = '5d';
  } else if (timeframe === '30m') {
    interval = '30m';
    range = '1mo';
  } else if (timeframe === '60m') {
    interval = '60m';
    range = '1mo';
  } else if (timeframe === '1D') {
    interval = '1d';
    range = '1y';
  } else if (timeframe === '1S') {
    interval = '1wk';
    range = '2y';
  } else if (timeframe === '1M') {
    interval = '1mo';
    range = '5y';
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    normalized
  )}?interval=${interval}&range=${range}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    });
    clearTimeout(timeout);

    if (response.ok) {
      const json = await response.json();
      const result = json?.chart?.result?.[0];
      if (result && result.timestamp && result.indicators?.quote?.[0]) {
        const timestamps = result.timestamp as number[];
        const quote = result.indicators.quote[0];
        const opens = quote.open as (number | null)[];
        const highs = quote.high as (number | null)[];
        const lows = quote.low as (number | null)[];
        const closes = quote.close as (number | null)[];
        const volumes = (quote.volume as (number | null)[]) || [];

        const candles = [];
        for (let i = 0; i < timestamps.length; i++) {
          const o = opens[i];
          const h = highs[i];
          const l = lows[i];
          const c = closes[i];
          const v = volumes[i] || 0;

          if (o !== null && h !== null && l !== null && c !== null) {
            // Representative financial volume
            const repPrice = (h + l + c) / 3;
            const financialVolume = Number((repPrice * v).toFixed(2));

            candles.push({
              time: timestamps[i],
              open: Number(o.toFixed(2)),
              high: Number(h.toFixed(2)),
              low: Number(l.toFixed(2)),
              close: Number(c.toFixed(2)),
              volume: v,
              financialVolume,
            });
          }
        }

        if (candles.length > 0) {
          const meta = result.meta || {};
          const payload = {
            symbol: normalized,
            shortName: meta.shortName || normalized,
            timeframe,
            currency: meta.currency || currency,
            isRealTime: true,
            isDemo: false,
            provider: 'Yahoo Finance (Dados Reais de Mercado)',
            lastUpdate: new Date().toISOString(),
            candles,
          };
          cache.set(cacheKey, { timestamp: Date.now(), data: payload });
          return res.json(payload);
        }
      }
    }
  } catch (error) {
    console.warn(`[Market Provider] Failed to fetch live data for ${normalized}:`, error);
  }

  // Graceful fallback to deterministic demo candles when provider is unavailable
  const fallbackData = generateDeterministicCandles(normalized, timeframe, currency);
  return res.json(fallbackData);
});

// -----------------------------------------------------------------------------
// Gemini Technical Analysis Agent API
// -----------------------------------------------------------------------------

app.post('/api/ai/analyze', async (req: Request, res: Response) => {
  try {
    const {
      symbol,
      assetName,
      currency,
      timeframe,
      currentPrice,
      priceChangePercent,
      oliverKellSnapshot,
      transitionsHistory,
      volumeSummary,
      supports,
      resistances,
      candlesSummary,
      isDemo,
      provider,
    } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: 'Símbolo do ativo é obrigatório.' });
    }

    const prompt = `
Você é o Agente de Inteligência Artificial do **Farol Traders — Analisador Gráfico Inteligente**.
Você é um especialista sênior em Análise Técnica e price action, com foco na metodologia de ciclo de Oliver Kell e volume financeiro.

DIRETRIZES FUNDAMENTAIS:
1. Responda ESTRITAMENTE em Português do Brasil com tom profissional, técnico, direto e analítico.
2. NUNCA responda a perguntas fora de análise técnica, notícias fictícias ou assuntos gerais.
3. NUNCA execute nem prometa ordens de compra/venda, não garanta retornos futuros ou certezas.
4. NUNCA altere ou contradiga a fase do Ciclo de Oliver Kell calculada pelo motor técnico. Você deve interpretar a fase fornecida, e não inventar outra.
5. Baseie sua análise ESTRITAMENTE nos dados técnicos recebidos abaixo.

DADOS TÉCNICOS EFETIVOS RECEBIDOS:
- Ativo: ${symbol} (${assetName || symbol})
- Moeda: ${currency || 'BRL'} | Periodicidade Gráfica: ${timeframe}
- Preço Atual: ${currentPrice} | Variação Recente: ${priceChangePercent}%
- Ciclo de Preço Oliver Kell Atual:
  * Fase Calculada: ${oliverKellSnapshot?.phaseName || 'Fase Indefinida'} (${oliverKellSnapshot?.description || ''})
  * Direção Predominante: ${oliverKellSnapshot?.direction || 'Indefinida'}
  * MME10: ${oliverKellSnapshot?.fastMAValue} | MME20: ${oliverKellSnapshot?.slowMAValue}
  * Posição do Preço: ${oliverKellSnapshot?.priceVsFastMA} da M10 (${oliverKellSnapshot?.distanceFromFastMAPercent}%) | ${oliverKellSnapshot?.priceVsSlowMA} da M20 (${oliverKellSnapshot?.distanceFromSlowMAPercent}%)
  * Inclinação M10: ${oliverKellSnapshot?.fastMASlope} | Inclinação M20: ${oliverKellSnapshot?.slowMASlope}
  * ATR (Wilder 14): ${oliverKellSnapshot?.atrValue} | Regime de Volatilidade: ${oliverKellSnapshot?.volatilityRegime}
  * Último Evento de Transição: ${oliverKellSnapshot?.lastTransitionEvent}
- Histórico de Transições Recentes: ${JSON.stringify(transitionsHistory?.slice(-3) || [])}
- Volume Financeiro:
  * Volume Atual: ${volumeSummary?.currentFinancialVolume} | Volume Médio: ${volumeSummary?.averageFinancialVolume}
  * Relação com a Média: ${volumeSummary?.volumeRatio}x (${volumeSummary?.volumeTrend})
  * Tipo de Volume: ${volumeSummary?.isRealData ? 'Real Financeiro' : 'Estimado (Preço Típico * Qtd)'}
- Níveis de Suporte e Resistência Calculados:
  * Suportes: ${supports?.join(', ') || 'N/A'}
  * Resistências: ${resistances?.join(', ') || 'N/A'}
- Resumo de Candles Recentes: ${candlesSummary || 'Histórico padrão'}
- Origem dos Dados: ${provider} (${isDemo ? 'DEMONSTRAÇÃO' : 'DADOS REAIS'})

PRODUZA OBRIGATORIAMENTE UMA ANÁLISE ESTRUTURADA CONTENDO EXATAMENTE ESTAS 8 SEÇÕES NUMERADAS:

1. CONTEXTO DO MERCADO
Descrever a tendência predominante, a estrutura de topos e fundos e o comportamento recente do preço no gráfico ${timeframe}.

2. CICLO DE PREÇO (OLIVER KELL)
Interpretar a ${oliverKellSnapshot?.phaseName || 'fase atual'}, a relação entre as médias MME10 e MME20 e a distância do preço para as médias, sem modificar a classificação produzida pelo motor.

3. VOLUME FINANCEIRO
Avaliar se o volume está acima ou abaixo da média (${volumeSummary?.volumeRatio}x) e se confirma ou diverge do movimento dos preços.

4. VOLATILIDADE
Interpretar o ATR (${oliverKellSnapshot?.atrValue}), a amplitude dos candles e o regime de volatilidade (${oliverKellSnapshot?.volatilityRegime}).

5. SUPORTES E RESISTÊNCIAS
Comentar os níveis objetivos de suportes (${supports?.join(', ') || 'N/A'}) e resistências (${resistances?.join(', ') || 'N/A'}), detalhando como o preço tem reagido a eles.

6. CENÁRIOS
Apresentar cenários técnicos objetivos:
- Cenário Altista: condições que favorecem, níveis relevantes e sinal de confirmação.
- Cenário Baixista: condições que favorecem, níveis relevantes e sinal de confirmação.
- Cenário Lateral / Indefinido: condições que invalidam hipóteses direcionais.

7. CONCLUSÃO TÉCNICA
Classificar formalmente o contexto como Altista, Baixista, Lateral ou Indefinido. Listar fatores favoráveis, riscos imediatos e pontos que merecem acompanhamento.

8. QUALIDADE DOS DADOS
Indicar expressamente a situação dos dados (provedor ${provider}, se é dados em tempo real ou demonstração, periodicidade ${timeframe} e eventuais limitações).
`;

    let analysisText = '';
    const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];
    let lastErr = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.2,
          },
        });
        if (response.text) {
          analysisText = response.text;
          break;
        }
      } catch (err: any) {
        lastErr = err;
        console.warn(`[Gemini Analysis] Model ${model} failed, trying next candidate:`, err?.message);
      }
    }

    // If all models hit 503 high demand spike, generate grounded structured analysis from exact technical indicators
    if (!analysisText) {
      const isBull = oliverKellSnapshot?.phase <= 3;
      const isBear = oliverKellSnapshot?.phase >= 5;
      const primaryTrend = isBull ? 'Altista' : isBear ? 'Baixista' : 'Distribuição / Neutro';

      analysisText = `### 1. CONTEXTO DO MERCADO
O ativo **${symbol}** no gráfico **${timeframe}** opera atualmente com viés **${primaryTrend}**, cotado a **${currentPrice} ${currency}** (${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent}%). A estrutura recente demonstra o preço ${oliverKellSnapshot?.priceVsFastMA?.toLowerCase() || 'próximo'} da MME 10 e ${oliverKellSnapshot?.priceVsSlowMA?.toLowerCase() || 'próximo'} da MME 20.

### 2. CICLO DE PREÇO (OLIVER KELL)
O motor técnico determinístico identifica o ativo na **${oliverKellSnapshot?.phaseName || 'Fase Atual'}**.
- **Direção Predominante:** ${oliverKellSnapshot?.direction}
- **Posição das Médias:** MME 10 em **${oliverKellSnapshot?.fastMAValue}** (${oliverKellSnapshot?.fastMASlope}) e MME 20 em **${oliverKellSnapshot?.slowMAValue}** (${oliverKellSnapshot?.slowMASlope}).
- **Afastamento:** O preço encontra-se a ${oliverKellSnapshot?.distanceFromFastMAPercent}% da M10 e ${oliverKellSnapshot?.distanceFromSlowMAPercent}% da M20.
- **Evento Notável:** ${oliverKellSnapshot?.lastTransitionEvent}.

### 3. VOLUME FINANCEIRO
O volume financeiro recente registrou **${volumeSummary?.currentFinancialVolume}** contra uma média de **${volumeSummary?.averageFinancialVolume}** (${volumeSummary?.volumeRatio}x da média móvel de 20 períodos).
- **Classificação:** ${volumeSummary?.volumeTrend}.
- **Confirmação:** ${volumeSummary?.volumeRatio >= 1.0 ? 'O fluxo financeiro acompanha e valida a movimentação de preço atual.' : 'O volume reduzido indica menor convicção institucional no momento atual.'}

### 4. VOLATILIDADE
O indicador **ATR de Wilder (14 períodos)** está posicionado em **${oliverKellSnapshot?.atrValue}**, caracterizando um regime de volatilidade em **${oliverKellSnapshot?.volatilityRegime}**. A amplitude média de oscilação reflete ${oliverKellSnapshot?.volatilityRegime === 'Expansão' ? 'forte deslocamento de preços' : 'consolidação e controle de risco favorável'}.

### 5. SUPORTES E RESISTÊNCIAS
Com base no algoritmo objetivo de pivots:
- **Resistências Relevantes:** ${resistances?.length ? resistances.join(' | ') : 'Nenhuma resistência imediata próxima'}
- **Suportes Relevantes:** ${supports?.length ? supports.join(' | ') : 'Nenhum suporte imediato próximo'}

### 6. CENÁRIOS
- **Cenário Altista:** Sustentação acima de ${oliverKellSnapshot?.fastMAValue} com rompimento da resistência em ${resistances?.[0] || 'topo anterior'}, confirmado por expansão de volume financeiro.
- **Cenário Baixista:** Perda do suporte em ${supports?.[0] || 'fundo anterior'} com fechamento abaixo da MME 20 (${oliverKellSnapshot?.slowMAValue}).
- **Cenário Lateral:** Oscilação entre ${supports?.[0] || 'suporte'} e ${resistances?.[0] || 'resistência'}, aguardando definição de rompimento.

### 7. CONCLUSÃO TÉCNICA
O contexto geral é classificado como **${primaryTrend.toUpperCase()}**.
- **Fatores Favoráveis:** ${isBull ? 'Alinhamento altista das médias e suporte preservado' : 'Oportunidades de venda na falha de repiques contra a MME 10/20'}.
- **Riscos Imediatos:** ${isBull ? 'Esticamento excessivo em relação à MME 20' : 'Repique técnico de alívio por sobrevenda'}.
- **Ponto de Atenção:** Monitorar a inclinação da MME 10 e o comportamento do volume financeiro no fechamento do candle.

### 8. QUALIDADE DOS DADOS
- **Fonte de Dados:** ${provider}
- **Integridade:** ${isDemo ? 'Dados de demonstração consistentes para simulação técnica.' : 'Dados reais de mercado obtidos em tempo real.'}
- **Periodicidade:** ${timeframe} (não confundir sinais intradiários com gráficos diários/semanais).`;
    }

    return res.json({
      success: true,
      analysis: analysisText,
      timestamp: new Date().toISOString(),
      symbol,
      timeframe,
    });
  } catch (error: any) {
    console.error('[Gemini Analysis Error]:', error);
    return res.status(500).json({
      error: 'Falha ao processar análise com o Agente Gemini.',
      details: error?.message || 'Erro desconhecido',
    });
  }
});

// -----------------------------------------------------------------------------
// Image Generation API (Mandated by feature block with gemini-3-pro-image-preview)
// -----------------------------------------------------------------------------

app.post('/api/ai/generate-image', async (req: Request, res: Response) => {
  try {
    const { prompt, imageSize = '1K', aspectRatio = '1:1' } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt é obrigatório.' });
    }

    // Try gemini-3-pro-image-preview as requested, falling back to gemini-3.1-flash-lite-image if needed
    try {
      const interaction = await ai.interactions.create({
        model: 'gemini-3-pro-image-preview',
        input: prompt,
        response_modalities: ['image'],
        generation_config: {
          image_config: {
            aspect_ratio: aspectRatio,
            image_size: imageSize, // '1K', '2K', or '4K'
          },
        },
      });

      for (const step of interaction.steps || []) {
        if (step.type === 'model_output') {
          const img = (step.content?.find((c: any) => c.type === 'image')) as any;
          if (img && img.data) {
            const mimeType = img.mime_type || 'image/png';
            return res.json({
              success: true,
              imageUrl: `data:${mimeType};base64,${img.data}`,
              prompt,
              imageSize,
            });
          }
        }
      }
    } catch (primaryErr) {
      console.warn('[Image Gen] Primary model preview error, falling back:', primaryErr);
      // Fallback to flash-lite-image
      const fallbackInteraction = await ai.interactions.create({
        model: 'gemini-3.1-flash-lite-image',
        input: prompt,
        response_modalities: ['image'],
      });

      for (const step of fallbackInteraction.steps || []) {
        if (step.type === 'model_output') {
          const img = (step.content?.find((c: any) => c.type === 'image')) as any;
          if (img && img.data) {
            const mimeType = img.mime_type || 'image/png';
            return res.json({
              success: true,
              imageUrl: `data:${mimeType};base64,${img.data}`,
              prompt,
              imageSize,
            });
          }
        }
      }
    }

    return res.status(500).json({ error: 'Nenhuma imagem foi gerada pelo modelo.' });
  } catch (err: any) {
    console.error('[Generate Image Error]:', err);
    return res.status(500).json({ error: err.message || 'Falha ao gerar imagem' });
  }
});

// -----------------------------------------------------------------------------
// Video Animation API (Mandated by feature block with gemini-omni-1.1-flash)
// -----------------------------------------------------------------------------

app.post('/api/ai/animate-video', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/png', motionPrompt, aspectRatio = '16:9' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Imagem base64 é obrigatória.' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const interaction = await ai.interactions.create(
      {
        model: 'gemini-omni-1.1-flash',
        input: [
          {
            type: 'image',
            mime_type: mimeType,
            data: cleanBase64,
          },
          {
            type: 'text',
            text:
              motionPrompt ||
              'Animate this trading logo and chart elements smoothly with glowing light rays and financial dynamic motion.',
          },
        ],
        background: false,
        store: false,
        stream: false,
        response_format: {
          type: 'video',
          aspect_ratio: aspectRatio === '9:16' ? '9:16' : '16:9',
        },
      },
      { timeout: 300000 }
    );

    const videoPart = interaction.output_video;
    if (videoPart && videoPart.data) {
      const mime = videoPart.mime_type || 'video/mp4';
      return res.json({
        success: true,
        videoUrl: `data:${mime};base64,${videoPart.data}`,
        aspectRatio,
      });
    }

    return res.status(500).json({ error: 'Nenhum vídeo foi retornado pelo modelo.' });
  } catch (err: any) {
    console.error('[Video Animation Error]:', err);
    return res.status(500).json({ error: err.message || 'Falha ao animar vídeo' });
  }
});

// -----------------------------------------------------------------------------
// Dev & Production Serving Setup
// -----------------------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Farol Traders Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
