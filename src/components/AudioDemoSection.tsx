import React, { useState, useEffect } from 'react';
import { Play, Pause, Volume2, Music, Sparkles, Smartphone, CheckCircle, HelpCircle } from 'lucide-react';
import { audioSynth } from '../utils/audioSynth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface DemoTrack {
  id: string;
  title: string;
  genre: string;
  originalText: string;
  curatedText: string;
  styleKey?: 'sertanejo' | 'piseiro';
  gender?: 'masculine' | 'feminine';
  coverUrl?: string;
  altText?: string;
  originalAudioName?: string;
  curatedAudioName?: string;
}

export default function AudioDemoSection() {
  const [activeTrack, setActiveTrack] = useState<string | null>(null);
  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false);
  const [isPlayingCurated, setIsPlayingCurated] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const defaultTracks: DemoTrack[] = [
    {
      id: 'demo-1',
      title: 'Sertanejo Sofrência',
      genre: 'Acústico Romântico',
      originalText: 'Voz gravada no WhatsApp, sem instrumento e com ruído ao fundo',
      curatedText: 'Violão de aço com dedilhado premium e voz masculina expressiva de estúdio.',
      styleKey: 'sertanejo',
      gender: 'masculine',
      coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=120&h=120&q=80',
      altText: 'Exemplo de guia acústica sertaneja profissional gerada na plataforma Guia Inteligente'
    },
    {
      id: 'demo-2',
      title: 'Piseiro / Pop Acústico',
      genre: 'Alegre & Ritmado',
      originalText: 'Cantor batendo na mesa para dar o ritmo e cantando a melodia',
      curatedText: 'Violão ritmado (Strumming) perfeito e voz feminina afinada em alta definição.',
      styleKey: 'piseiro',
      gender: 'feminine',
      coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=120&h=120&q=80',
      altText: 'Exemplo de guia acústica pop e piseiro profissional produzida pela curadoria Guia Inteligente'
    },
  ];

  const [demoTracks, setDemoTracks] = useState<DemoTrack[]>(defaultTracks);

  useEffect(() => {
    const docRef = doc(db, 'configuracoes', 'home_demos');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && Array.isArray(data.tracks)) {
          setDemoTracks(data.tracks);
        }
      } else {
        // Seed the configurations collection if empty
        setDoc(docRef, { tracks: defaultTracks }).catch(err => console.error("Error seeding home demos:", err));
        setDemoTracks(defaultTracks);
      }
    });

    return () => unsubscribe();
  }, []);

  const stopAll = () => {
    clearInterval((window as any)._originalAudioInterval);
    if ((window as any)._realAudioPlayer) {
      try {
        (window as any)._realAudioPlayer.pause();
        (window as any)._realAudioPlayer = null;
      } catch (e) {
        console.error(e);
      }
    }
    audioSynth.stop();
    setIsPlayingOriginal(false);
    setIsPlayingCurated(false);
  };

  // Stop any playing audio if the active track changes
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  const handlePlayOriginal = (trackId: string) => {
    // If already playing this track, stop it
    if (activeTrack === trackId && isPlayingOriginal) {
      stopAll();
      return;
    }

    stopAll();
    setActiveTrack(trackId);
    setIsPlayingOriginal(true);
    setProgress(0);
    setCurrentTime(0);

    const track = demoTracks.find((t) => t.id === trackId);
    const audioUrl = track?.originalAudioName;

    if (audioUrl && (audioUrl.startsWith('http://') || audioUrl.startsWith('https://'))) {
      // Play real audio file from Supabase Storage
      const audio = new Audio(audioUrl);
      (window as any)._realAudioPlayer = audio;

      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          const currentProgress = (audio.currentTime / audio.duration) * 100;
          setProgress(currentProgress);
          setCurrentTime(audio.currentTime);
        }
      });

      audio.addEventListener('ended', () => {
        setIsPlayingOriginal(false);
        setProgress(0);
        setCurrentTime(0);
      });

      audio.addEventListener('error', (e) => {
        console.error('Erro ao tocar áudio real:', e);
        setIsPlayingOriginal(false);
      });

      audio.play().catch((err) => {
        console.error('Falha ao iniciar áudio real:', err);
        setIsPlayingOriginal(false);
      });
    } else {
      // Simulate playing low-quality client hum
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsPlayingOriginal(false);
            return 0;
          }
          setCurrentTime((elapsed) => elapsed + 0.1);
          return prev + (100 / 120); // 12 seconds duration approx
        });
      }, 100);

      (window as any)._originalAudioInterval = interval;
    }
  };

  const handlePlayCurated = (trackId: string, style?: 'sertanejo' | 'piseiro', gender?: 'masculine' | 'feminine') => {
    // If already playing this track, stop it
    if (activeTrack === trackId && isPlayingCurated) {
      stopAll();
      return;
    }

    stopAll();
    setActiveTrack(trackId);
    setIsPlayingCurated(true);
    setProgress(0);
    setCurrentTime(0);

    const track = demoTracks.find((t) => t.id === trackId);
    const audioUrl = track?.curatedAudioName;

    if (audioUrl && (audioUrl.startsWith('http://') || audioUrl.startsWith('https://'))) {
      // Play real audio file from Supabase Storage
      const audio = new Audio(audioUrl);
      (window as any)._realAudioPlayer = audio;

      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          const currentProgress = (audio.currentTime / audio.duration) * 100;
          setProgress(currentProgress);
          setCurrentTime(audio.currentTime);
        }
      });

      audio.addEventListener('ended', () => {
        setIsPlayingCurated(false);
        setProgress(0);
        setCurrentTime(0);
      });

      audio.addEventListener('error', (e) => {
        console.error('Erro ao tocar áudio real curado:', e);
        setIsPlayingCurated(false);
      });

      audio.play().catch((err) => {
        console.error('Falha ao iniciar áudio real curado:', err);
        setIsPlayingCurated(false);
      });
    } else {
      // Trigger the real Web Audio API synthesizer
      audioSynth.playDemo(style || 'sertanejo', gender || 'masculine', (prog, current) => {
        setProgress(prog);
        setCurrentTime(current);
        if (prog >= 100 || prog === 0) {
          setIsPlayingCurated(false);
        }
      });
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <section id="demos" className="py-12 px-6 md:px-12 bg-[#0d0f13] relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[#00ff87]/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00ff87]/5 border border-[#00ff87]/15 text-[#00ff87] text-xs font-mono mb-3 select-none">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            <span>ESTÚDIO VIRTUAL PRE-LISTENING</span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-3">
            Ouça o Poder da Nossa Curadoria Acústica
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-xs md:text-sm leading-relaxed">
            Grandes artistas e produtores preferem guias em Voz e Violão para focar 100% na letra e na melodia. Veja a transformação real de arquivos comuns enviados por nossos clientes:
          </p>
        </div>

        {/* Demo Tracks Grid: Side-by-side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {demoTracks.map((track) => {
            const isThisActive = activeTrack === track.id;
            const isThisOriginalPlaying = isThisActive && isPlayingOriginal;
            const isThisCuratedPlaying = isThisActive && isPlayingCurated;

            return (
              <div 
                key={track.id} 
                className={`rounded-xl border transition-all duration-300 overflow-hidden flex flex-col justify-between ${
                  isThisActive 
                    ? 'border-[#00ff87]/30 bg-[#13161c] shadow-[0_0_20px_rgba(0,255,135,0.03)]' 
                    : 'border-slate-800/60 bg-[#0f1115] hover:border-slate-800 hover:bg-[#111419]'
                }`}
              >
                {/* Track Title Panel */}
                <div className="px-4 py-3 bg-[#0a0c0f] border-b border-slate-900 flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <div className="relative h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden border border-slate-800">
                      <img 
                        src={track.coverUrl} 
                        alt={track.altText} 
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Music className={`h-3.5 w-3.5 ${isThisActive ? 'text-[#00ff87]' : 'text-slate-300'}`} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs md:text-sm font-bold text-white tracking-tight">{track.title}</h3>
                      <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wide">{track.genre}</p>
                    </div>
                  </div>
                  
                  {/* Status Indicator */}
                  {isThisActive && (
                    <div className="flex items-center gap-1.5 font-mono text-[9px] text-[#00ff87]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#00ff87] animate-ping"></span>
                      <span className="hidden sm:inline">{isThisOriginalPlaying ? 'MONITORANDO ORIGINAL' : 'PRODUÇÃO ATIVA'}</span>
                      <span className="sm:hidden">{isThisOriginalPlaying ? 'ORIGINAL' : 'ESTÚDIO'}</span>
                    </div>
                  )}
                </div>

                {/* Main Player Bodies - Compact Layout with side-by-side blocks */}
                <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
                  
                  {/* Two audio columns side-by-side on sm: screens */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* 1. Original Input Block */}
                    <div className="flex flex-col justify-between p-3 rounded-lg bg-[#14181f]/40 border border-slate-900/60">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800/40 w-fit">
                          <Smartphone className="h-2.5 w-2.5" />
                          <span>GRAVAÇÃO DO CLIENTE</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug font-medium min-h-[40px] flex items-center">
                          {track.originalText}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => handlePlayOriginal(track.id)}
                        className={`mt-2 w-full flex items-center justify-center gap-1.5 text-[11px] font-mono py-1.5 px-3 rounded-md border transition-all duration-300 ${
                          isThisOriginalPlaying
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        {isThisOriginalPlaying ? (
                          <>
                            <Pause className="h-3 w-3" />
                            <span>Pausar</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3" />
                            <span>Ouvir Envio</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* 2. Professional Curated Block */}
                    <div className={`flex flex-col justify-between p-3 rounded-lg border transition-all duration-300 ${
                      isThisCuratedPlaying 
                        ? 'bg-[#00ff87]/5 border-[#00ff87]/20 shadow-[0_0_15px_rgba(0,255,135,0.02)]' 
                        : 'bg-[#14181f]/40 border-slate-900/60 hover:border-slate-800'
                    }`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[10px] font-mono text-[#00ff87] font-bold bg-[#00ff87]/10 px-1.5 py-0.5 rounded border border-[#00ff87]/10 w-fit">
                          <Sparkles className="h-2.5 w-2.5 animate-pulse" />
                          <span>RESULTADO CURADORIA</span>
                        </div>
                        <p className="text-[11px] text-white leading-snug font-semibold min-h-[40px] flex items-center">
                          {track.curatedText}
                        </p>
                      </div>

                      <button
                        onClick={() => handlePlayCurated(track.id, track.styleKey, track.gender)}
                        className={`mt-2 w-full flex items-center justify-center gap-1 text-[11px] font-mono py-1.5 px-3 rounded-md font-bold uppercase tracking-wider transition-all duration-300 ${
                          isThisCuratedPlaying
                            ? 'bg-red-500/15 border border-red-500/30 text-red-400'
                            : 'bg-[#00ff87] text-black hover:bg-[#00e076]'
                        }`}
                      >
                        {isThisCuratedPlaying ? (
                          <>
                            <Pause className="h-3 w-3" />
                            <span>Parar</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3" />
                            <span>Ouvir Guia</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>

                  {/* Active Player Status Wave Bar */}
                  {isThisActive && (
                    <div className="mt-2 pt-2 border-t border-slate-900/60 flex flex-col gap-2">
                      {/* Playback Progress and Waveform */}
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                        <span>{formatTime(currentTime)}</span>
                        
                        {/* Dynamic Animated Waves SVG */}
                        <div className="flex items-end gap-[2px] h-5 px-3 flex-1 justify-center opacity-80 overflow-hidden">
                          {[...Array(18)].map((_, i) => {
                            if (isThisCuratedPlaying) {
                              // Live bounce math
                              const delays = ['animation-delay-75', 'animation-delay-150', 'animation-delay-300', 'animation-delay-500'];
                              const chosenDelay = delays[i % delays.length];
                              return (
                                <span
                                  key={i}
                                  className={`w-[2.5px] bg-[#00ff87] rounded-full animate-[bounce_1.1s_infinite_ease-in-out] ${chosenDelay}`}
                                  style={{
                                    height: `${Math.max(15, Math.sin(i * 0.4) * 85 + 40)}%`,
                                    animationDuration: `${0.6 + (i % 5) * 0.15}s`
                                  }}
                                />
                              );
                            } else if (isThisOriginalPlaying) {
                              return (
                                <span
                                  key={i}
                                  className="w-[2.5px] bg-amber-500/60 rounded-full animate-pulse"
                                  style={{
                                    height: `${Math.max(10, Math.cos(i * 0.8) * 35 + 20)}%`,
                                    animationDuration: '1.5s'
                                  }}
                                />
                              );
                            }
                            return <span key={i} className="w-[2.5px] h-1 bg-slate-800 rounded-full" />;
                          })}
                        </div>

                        <span>{isThisCuratedPlaying ? '0:30' : '0:12'}</span>
                      </div>

                      {/* Visual Scrub Bar */}
                      <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden relative">
                        <div 
                          className={`h-full rounded-full transition-all duration-100 ${
                            isThisCuratedPlaying ? 'bg-[#00ff87]' : 'bg-amber-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
