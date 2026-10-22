import React, { useState } from 'react';
import {
  Sparkles,
  Video,
  Upload,
  Download,
  Image as ImageIcon,
  Play,
  RotateCw,
  Wand2,
  Film,
  Layers,
  CheckCircle,
} from 'lucide-react';

interface FarolStudioProps {
  currentSymbol: string;
}

export const FarolStudio: React.FC<FarolStudioProps> = ({ currentSymbol }) => {
  // Image Generation States
  const [logoPrompt, setLogoPrompt] = useState(
    `Logo profissional para empresa financeira Farol Traders, com farol luminoso emitindo feixes de luz dourada em contraste com mar escuro, elementos minimalistas de candlesticks e estética moderna corporativa de alta definição`
  );
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('2K');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // Video Animation States
  const [motionPrompt, setMotionPrompt] = useState(
    'O farol ilumina o mar e o logotipo ganha vida com brilho dourado e luz pulsante cinematográfica com partículas financeiras em movimento suave.'
  );
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Handle Image Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImageBase64(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate Image with gemini-3-pro-image-preview
  const handleGenerateLogo = async () => {
    if (!logoPrompt.trim()) return;
    setIsGeneratingImage(true);
    setImageError(null);
    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: logoPrompt,
          imageSize, // 1K, 2K, 4K
          aspectRatio: '1:1',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao gerar logo');
      }
      setGeneratedImageUrl(data.imageUrl);
      // Automatically make this the input image for video animator if no image was uploaded
      if (!uploadedImageBase64) {
        setUploadedImageBase64(data.imageUrl);
      }
    } catch (err: any) {
      setImageError(err.message || 'Erro ao gerar logo');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Animate Image into Video with gemini-omni-1.1-flash
  const handleAnimateVideo = async () => {
    const targetImage = uploadedImageBase64 || generatedImageUrl;
    if (!targetImage) {
      setVideoError('Por favor, gere ou envie uma foto/logo primeiro.');
      return;
    }

    setIsGeneratingVideo(true);
    setVideoError(null);
    try {
      const res = await fetch('/api/ai/animate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: targetImage,
          motionPrompt,
          aspectRatio, // '16:9' or '9:16'
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao animar vídeo');
      }
      setGeneratedVideoUrl(data.videoUrl);
    } catch (err: any) {
      setVideoError(err.message || 'Erro ao animar vídeo');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  return (
    <div className="flex-1 w-full h-full bg-slate-950 p-4 md:p-6 overflow-y-auto text-slate-100 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 rounded bg-amber-500/20 text-amber-400 font-bold text-xs">
                ESTÚDIO VISUAL & MULTIMÍDIA
              </span>
              <span className="text-xs text-slate-400">• Farol Traders Studio</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-100 tracking-wide">
              Criador de Logo & Animador de Vídeo
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Crie logos de alta fidelidade com o modelo <strong>gemini-3-pro-image-preview</strong> (resoluções 1K, 2K e 4K) e transforme a arte em vídeo animado cinematográfico com o modelo <strong>gemini-omni-1.1-flash</strong> (aspect ratio 16:9 ou 9:16).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 block">Ativo em Foco</span>
              <span className="font-mono font-bold text-amber-400 text-xs">{currentSymbol}</span>
            </div>
          </div>
        </div>

        {/* Studio Grid: Left = Logo Generator, Right = Video Animator */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. LOGO GENERATION CARD */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-md space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-slate-100">1. Gerador de Logo Empresarial</h2>
                    <p className="text-[10px] text-slate-400">Modelo: gemini-3-pro-image-preview</p>
                  </div>
                </div>
                {/* Size Selector Affordance: 1K, 2K, 4K */}
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
                  <span className="text-[10px] text-slate-400 mr-1 pl-1 font-semibold">Tamanho:</span>
                  {(['1K', '2K', '4K'] as const).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setImageSize(sz)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono transition ${
                        imageSize === sz
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Description Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Descrição detalhada do Logo para sua empresa:
                </label>
                <textarea
                  rows={3}
                  value={logoPrompt}
                  onChange={(e) => setLogoPrompt(e.target.value)}
                  placeholder="Descreva o estilo, elementos, cores e tipografia desejados..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition leading-relaxed font-sans"
                />

                {/* Pre-made suggestions */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setLogoPrompt(
                        'Logo minimalista e premium para Farol Traders, com farol geométrico dourado sobre fundo azul meia-noite e velas de candlestick ascendentes em verde esmeralda'
                      )
                    }
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-amber-300 hover:border-amber-500/40 transition"
                  >
                    + Farol Dourado Minimalista
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLogoPrompt(
                        'Emblema corporativo moderno para Mesa Proprietária de Day Trade, com touro de Wall Street estilizado e feixe de laser de alta tecnologia'
                      )
                    }
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-amber-300 hover:border-amber-500/40 transition"
                  >
                    + Emblema Touro Tecnológico
                  </button>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateLogo}
                disabled={isGeneratingImage || !logoPrompt.trim()}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition disabled:opacity-50"
              >
                <Wand2 className={`w-4 h-4 ${isGeneratingImage ? 'animate-spin' : ''}`} />
                <span>{isGeneratingImage ? 'Gerando Logo em Alta Resolução...' : `Gerar Logo (${imageSize})`}</span>
              </button>

              {imageError && (
                <div className="mt-3 p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {imageError}
                </div>
              )}
            </div>

            {/* Generated Image Preview */}
            <div className="mt-4 bg-slate-950 border border-slate-800 rounded-lg p-3 min-h-[260px] flex flex-col items-center justify-center">
              {isGeneratingImage ? (
                <div className="flex flex-col items-center gap-3 text-center text-slate-400">
                  <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
                  <span className="text-xs">Renderizando imagem com gemini-3-pro-image-preview...</span>
                </div>
              ) : generatedImageUrl ? (
                <div className="w-full flex flex-col items-center gap-2">
                  <div className="relative group rounded-lg overflow-hidden border border-slate-800 max-h-64 shadow-xl">
                    <img
                      src={generatedImageUrl}
                      alt="Logo Gerado"
                      className="max-h-64 w-auto object-contain rounded-lg"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <a
                      href={generatedImageUrl}
                      download="FarolTraders_Logo.png"
                      className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar Imagem
                    </a>
                    <button
                      onClick={() => setUploadedImageBase64(generatedImageUrl)}
                      className="flex items-center gap-1 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold rounded transition"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-amber-400" />
                      Usar para Animação
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-500 space-y-1">
                  <ImageIcon className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs">Nenhum logo gerado ainda</p>
                  <p className="text-[10px]">O logo renderizado aparecerá aqui em resolução {imageSize}</p>
                </div>
              )}
            </div>
          </div>

          {/* 2. VIDEO ANIMATION CARD */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-md space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                    <Film className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-slate-100">2. Animar Imagem em Vídeo</h2>
                    <p className="text-[10px] text-slate-400">Modelo: gemini-omni-1.1-flash (Interactions API)</p>
                  </div>
                </div>

                {/* Aspect Ratio Selector Affordance: 16:9 or 9:16 */}
                <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
                  <span className="text-[10px] text-slate-400 mr-1 pl-1 font-semibold">Proporção:</span>
                  {(['16:9', '9:16'] as const).map((ar) => (
                    <button
                      key={ar}
                      onClick={() => setAspectRatio(ar)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono transition ${
                        aspectRatio === ar
                          ? 'bg-sky-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {ar}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload or Select Image */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Foto / Logo para animar:</span>
                  {uploadedImageBase64 && (
                    <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Imagem Carregada
                    </span>
                  )}
                </label>

                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-950 hover:bg-slate-800/80 border border-dashed border-slate-700 text-xs text-slate-300 transition">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Carregar Foto do Computador</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>

                  {generatedImageUrl && (
                    <button
                      type="button"
                      onClick={() => setUploadedImageBase64(generatedImageUrl)}
                      className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition"
                    >
                      Usar Logo Gerado
                    </button>
                  )}
                </div>

                {/* Motion Prompt */}
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Instruções de Movimento / Prompt de Animação:
                  </label>
                  <textarea
                    rows={2}
                    value={motionPrompt}
                    onChange={(e) => setMotionPrompt(e.target.value)}
                    placeholder="Descreva o movimento da câmera, luzes, partículas..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition leading-relaxed font-sans"
                  />
                </div>
              </div>

              {/* Animate Video Button */}
              <button
                onClick={handleAnimateVideo}
                disabled={isGeneratingVideo || (!uploadedImageBase64 && !generatedImageUrl)}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-slate-950 font-bold text-xs shadow-md shadow-sky-500/20 transition disabled:opacity-50"
              >
                <Video className={`w-4 h-4 ${isGeneratingVideo ? 'animate-spin' : ''}`} />
                <span>
                  {isGeneratingVideo
                    ? 'Animando com gemini-omni-1.1-flash...'
                    : `Animar Logo em Vídeo (${aspectRatio})`}
                </span>
              </button>

              {videoError && (
                <div className="mt-3 p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {videoError}
                </div>
              )}
            </div>

            {/* Generated Video Player / Preview */}
            <div className="mt-4 bg-slate-950 border border-slate-800 rounded-lg p-3 min-h-[260px] flex flex-col items-center justify-center">
              {isGeneratingVideo ? (
                <div className="flex flex-col items-center gap-3 text-center text-slate-400">
                  <div className="w-10 h-10 border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin" />
                  <span className="text-xs">Gerando vídeo com gemini-omni-1.1-flash (Interactions API)...</span>
                </div>
              ) : generatedVideoUrl ? (
                <div className="w-full flex flex-col items-center gap-2">
                  <div className="rounded-lg overflow-hidden border border-slate-800 shadow-xl max-h-64 w-full flex items-center justify-center bg-black">
                    <video
                      src={generatedVideoUrl}
                      controls
                      autoPlay
                      loop
                      className="max-h-64 rounded-lg object-contain"
                    />
                  </div>
                  <a
                    href={generatedVideoUrl}
                    download="FarolTraders_Animated.mp4"
                    className="flex items-center gap-1 px-3 py-1 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-xs font-semibold rounded transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Baixar Vídeo ({aspectRatio})
                  </a>
                </div>
              ) : (
                <div className="text-center text-slate-500 space-y-1">
                  <Film className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs">Nenhum vídeo animado ainda</p>
                  <p className="text-[10px]">
                    Carregue uma imagem e clique em Animar para ver a versão em movimento
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
