import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ChevronRight, ChevronLeft, User, Mail, Phone, Upload, Mic, 
  Square, Check, Copy, FileAudio, Clock, Sparkles, Shield, 
  Music, Download, RefreshCw, Sliders, AlertCircle, ShieldCheck, Play, Lock
} from 'lucide-react';
import { VoiceGender, SongStyle, CompositionInput, SubmittedOrder } from '../types';
import { audioSynth } from '../utils/audioSynth';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { supabase } from '../supabase';

interface WizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
}

export default function WizardModal({ isOpen, onClose, onSwitchToLogin }: WizardModalProps) {
  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<CompositionInput>({
    name: '',
    email: '',
    phone: '',
    songTitle: '',
    lyrics: '',
    voiceGender: 'masculine',
    style: 'sertanejo_sofrencia',
    audioBlob: null,
    audioFileName: null,
  });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Microphone recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordTimerRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Stage loading animation states
  const [activeAnalysisStage, setActiveAnalysisStage] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Order submission
  const [order, setOrder] = useState<SubmittedOrder | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [isPlayingDashboardTrack, setIsPlayingDashboardTrack] = useState(false);
  const [dashboardProgress, setDashboardProgress] = useState(0);
  const [dashboardTime, setDashboardTime] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop sound on close
  useEffect(() => {
    if (!isOpen) {
      audioSynth.stop();
      setIsPlayingDashboardTrack(false);
      // Reset wizard state
      setStep(1);
      setFormData({
        name: '',
        email: '',
        phone: '',
        songTitle: '',
        lyrics: '',
        voiceGender: 'masculine',
        style: 'sertanejo_sofrencia',
        audioBlob: null,
        audioFileName: null,
      });
      setPassword('');
      setConfirmPassword('');
      setRecordedUrl(null);
      setOrder(null);
    }
  }, [isOpen]);

  // Handle Recording Timer
  useEffect(() => {
    if (isRecording) {
      recordTimerRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(recordTimerRef.current);
      setRecordDuration(0);
    }
    return () => clearInterval(recordTimerRef.current);
  }, [isRecording]);

  const formatRecordTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Drag and Drop handlers
  const [isDragActive, setIsDragActive] = useState(false);
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleAudioFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleAudioFile(e.target.files[0]);
    }
  };

  const handleAudioFile = (file: File) => {
    setFormData(prev => ({
      ...prev,
      audioBlob: file,
      audioFileName: file.name
    }));
    setRecordedUrl(URL.createObjectURL(file));
  };

  // Microphone recording actions
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setFormData(prev => ({
          ...prev,
          audioBlob: audioBlob,
          audioFileName: `gravação_celular_${Date.now()}.wav`
        }));
        setRecordedUrl(URL.createObjectURL(audioBlob));
        // Stop all track streams to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied or unsupported", err);
      alert("Para gravar áudio, permita o acesso ao microfone ou envie um arquivo de áudio pronto.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const clearAudio = () => {
    setFormData(prev => ({
      ...prev,
      audioBlob: null,
      audioFileName: null
    }));
    setRecordedUrl(null);
  };

  // Next steps handling
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email && formData.phone) {
      if (!password || !confirmPassword) {
        alert("Por favor, defina e confirme sua senha.");
        return;
      }
      if (password !== confirmPassword) {
        alert("As senhas não coincidem. Por favor, digite a mesma senha nos dois campos.");
        return;
      }

      setRegisterLoading(true);
      setRegisterError(null);

      try {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, password);
        const user = userCredential.user;

        const referredBy = sessionStorage.getItem('referred_by_slug') || localStorage.getItem('referred_by_slug') || null;

        // Save role: 'cliente' in usuarios collection
        await setDoc(doc(db, 'usuarios', user.uid), {
          uid: user.uid,
          nome: formData.name,
          email: formData.email,
          telefone: formData.phone,
          role: 'cliente',
          referred_by: referredBy,
          discount_balance: 0.00,
          createdAt: new Date().toISOString()
        });

        // Save in Supabase 'profiles' table
        try {
          const { error: sbProfileError } = await supabase
            .from('profiles')
            .upsert({
              id: user.uid,
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              referred_by: referredBy,
              discount_balance: 0.00,
              created_at: new Date().toISOString()
            });
          if (sbProfileError) {
            console.error("Erro ao salvar perfil no Supabase profiles:", sbProfileError);
          }
        } catch (sbErr) {
          console.error("Falha ao salvar perfil no Supabase:", sbErr);
        }

        setRegisterLoading(false);
        setStep(2);
      } catch (err: any) {
        console.error("Error creating user in Firebase Auth:", err);
        setRegisterLoading(false);
        let friendlyMessage = 'Erro ao realizar o cadastro. Tente novamente.';
        if (err.code === 'auth/email-already-in-use') {
          friendlyMessage = 'Este e-mail já está cadastrado no sistema.';
        } else if (err.code === 'auth/weak-password') {
          friendlyMessage = 'A senha deve conter no mínimo 6 caracteres.';
        } else if (err.code === 'auth/invalid-email') {
          friendlyMessage = 'O e-mail inserido é inválido.';
        }
        setRegisterError(friendlyMessage);
      }
    }
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.songTitle || !formData.lyrics) {
      alert("Por favor, preencha o título e a letra da composição.");
      return;
    }
    // Proceed to analyzing animation (Step 3)
    setStep(3);
    runAnalysisSimulation();
  };

  // Process simulation for high-tech look
  const runAnalysisSimulation = () => {
    setActiveAnalysisStage(0);
    setAnalysisProgress(0);

    const stagesCount = 4;
    const intervalTime = 1200; // time per stage

    let currentStage = 0;
    const interval = setInterval(() => {
      currentStage += 1;
      setActiveAnalysisStage(currentStage);
      setAnalysisProgress((currentStage / stagesCount) * 100);

      if (currentStage >= stagesCount) {
        clearInterval(interval);
        // Completed - generate Order structure and move to Payment (Step 4)
        setTimeout(() => {
          const generatedId = `GUI-${Math.floor(100000 + Math.random() * 900000)}`;
          const orderData: SubmittedOrder = {
            ...formData,
            id: generatedId,
            status: 'payment_pending',
            createdAt: new Date().toLocaleDateString('pt-BR'),
            pixCode: `00020101021126580014br.gov.bcb.pix0136guia-inteligente-pix-key-production991105303986540449.905802BR5920GuiaInteligenteStudio6009SaoPaulo62070503***6304CA28`
          };
          setOrder(orderData);
          setStep(4);
        }, 800);
      }
    }, intervalTime);
  };

  // PIX Interaction
  const handleCopyPix = () => {
    if (order) {
      navigator.clipboard.writeText(order.pixCode);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2000);
    }
  };

  const handleSimulatePaymentConfirm = () => {
    if (order) {
      setOrder(prev => prev ? { ...prev, status: 'ready' } : null);
      setStep(5);
    }
  };

  // Dashboard Pre-listening controls
  const handleToggleDashboardPlay = () => {
    if (!order) return;

    if (isPlayingDashboardTrack) {
      audioSynth.stop();
      setIsPlayingDashboardTrack(false);
    } else {
      setIsPlayingDashboardTrack(true);
      // Map styles and genders for the synthesizer
      const styleKey = order.style === 'sertanejo_sofrencia' ? 'sertanejo' : 'piseiro';
      const gender = order.voiceGender;

      audioSynth.playDemo(styleKey, gender, (progress, elapsed) => {
        setDashboardProgress(progress);
        setDashboardTime(elapsed);
        if (progress >= 100 || progress === 0) {
          setIsPlayingDashboardTrack(false);
        }
      });
    }
  };

  const formatDashboardTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
          {/* Main Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="w-full max-w-2xl bg-[#111419] border border-slate-800 rounded-2xl overflow-hidden relative shadow-2xl my-auto"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-[#0a0c0f] border-b border-slate-900 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#00ff87] animate-pulse"></span>
                <span className="font-mono text-xs text-slate-400 tracking-wider">PAINEL DO COMPOSITOR</span>
              </div>
              <button 
                onClick={onClose} 
                className="text-slate-500 hover:text-white p-1 rounded-full hover:bg-slate-900 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Step Content Wrapper */}
            <div className="p-6 md:p-8 max-h-[80vh] overflow-y-auto">

              {/* STEP 1: CADASTRO */}
              {step === 1 && (
                <form onSubmit={handleStep1Submit} className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="font-display text-xl font-extrabold text-white">
                      Passo 1 de 4: Faça seu Cadastro Exclusivo
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Informe seus dados básicos para liberar sua área segura de acompanhamento de guias.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {registerError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-start gap-2.5">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{registerError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                        Nome Completo
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                          type="text"
                          required
                          placeholder="Ex: Roberto Silva"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-xl text-sm text-white focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                          E-mail para Recebimento
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                          <input
                            type="email"
                            required
                            placeholder="roberto@email.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-xl text-sm text-white focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                          WhatsApp / Telefone
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                          <input
                            type="tel"
                            required
                            placeholder="(11) 99999-9999"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-xl text-sm text-white focus:outline-none transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                          Criar Senha
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                          <input
                            type="password"
                            required
                            placeholder="Defina sua senha"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-xl text-sm text-white focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                          Confirmar Senha
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                          <input
                            type="password"
                            required
                            placeholder="Confirme sua senha"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-xl text-sm text-white focus:outline-none transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-900/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {onSwitchToLogin && (
                      <button
                        type="button"
                        disabled={registerLoading}
                        onClick={onSwitchToLogin}
                        className="text-slate-400 hover:text-[#00ff87] disabled:text-slate-600 text-xs font-mono transition-colors text-left cursor-pointer"
                      >
                        Já possui conta? Acesse o Panel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={registerLoading}
                      className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#00ff87] hover:bg-[#00e076] disabled:bg-slate-800 disabled:text-slate-500 text-black font-bold font-mono text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer"
                    >
                      <span>{registerLoading ? 'Cadastrando...' : 'Prosseguir para Áudio & Letra'}</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              )}


              {/* STEP 2: AUDIO E LETRA */}
              {step === 2 && (
                <form onSubmit={handleStep2Submit} className="space-y-6">
                  <div className="text-center">
                    <h3 className="font-display text-xl font-extrabold text-white">
                      Passo 2 de 4: Suba seu Áudio e Letra
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Envie a melodia gravada no celular e cole a letra original da música.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Song Title */}
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                        Título da Música
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Amor de Varanda"
                        value={formData.songTitle}
                        onChange={(e) => setFormData({ ...formData, songTitle: e.target.value })}
                        className="w-full px-4 py-3 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-xl text-sm text-white focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Lyric Field */}
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                        Letra Completa da Composição
                      </label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Cole aqui os versos e refrão para que nossos curadores humanos e IA analisem a métrica..."
                        value={formData.lyrics}
                        onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
                        className="w-full px-4 py-3 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-xl text-sm text-white focus:outline-none transition-colors resize-none font-sans"
                      />
                    </div>

                    {/* Preferences Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Voice Selection */}
                      <div>
                        <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                          Voz Desejada (Modelo de Estúdio)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, voiceGender: 'masculine' })}
                            className={`py-3 rounded-xl border text-xs font-mono uppercase tracking-wider font-bold transition-all ${
                              formData.voiceGender === 'masculine'
                                ? 'border-[#00ff87] bg-[#00ff87]/5 text-[#00ff87]'
                                : 'border-slate-800 bg-[#14181f] text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            Masculina
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, voiceGender: 'feminine' })}
                            className={`py-3 rounded-xl border text-xs font-mono uppercase tracking-wider font-bold transition-all ${
                              formData.voiceGender === 'feminine'
                                ? 'border-[#00ff87] bg-[#00ff87]/5 text-[#00ff87]'
                                : 'border-slate-800 bg-[#14181f] text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            Feminina
                          </button>
                        </div>
                      </div>

                      {/* Style Selection */}
                      <div>
                        <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                          Estilo Acústico da Guia
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, style: 'sertanejo_sofrencia' })}
                            className={`py-3 rounded-xl border text-[11px] font-mono uppercase tracking-wider font-bold transition-all ${
                              formData.style === 'sertanejo_sofrencia'
                                ? 'border-[#00ff87] bg-[#00ff87]/5 text-[#00ff87]'
                                : 'border-slate-800 bg-[#14181f] text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            Sertanejo Sofrência
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, style: 'piseiro_pop_acustico' })}
                            className={`py-3 rounded-xl border text-[11px] font-mono uppercase tracking-wider font-bold transition-all ${
                              formData.style === 'piseiro_pop_acustico'
                                ? 'border-[#00ff87] bg-[#00ff87]/5 text-[#00ff87]'
                                : 'border-slate-800 bg-[#14181f] text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            Piseiro / Pop Acústico
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Audio Recorder / Uploader Block */}
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                        Envio do Áudio de Referência (Voz ou Instrumento)
                      </label>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Recorder */}
                        <div className="border border-slate-800 bg-[#14181f] rounded-xl p-4 flex flex-col items-center justify-center min-h-[140px] text-center">
                          {isRecording ? (
                            <div className="space-y-3">
                              <span className="flex h-3 w-3 relative mx-auto">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                              </span>
                              <p className="text-xs font-mono text-red-400 font-bold">
                                Gravando Áudio do Celular... {formatRecordTime(recordDuration)}
                              </p>
                              <button
                                type="button"
                                onClick={stopRecording}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-mono text-xs font-bold transition-colors mx-auto"
                              >
                                <Square className="h-3.5 w-3.5" />
                                <span>Parar Gravação</span>
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-xs text-slate-400">Gravar melodia pelo microfone agora:</p>
                              <button
                                type="button"
                                onClick={startRecording}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-white font-mono text-xs font-bold transition-all"
                              >
                                <Mic className="h-4 w-4 text-[#00ff87]" />
                                <span>[ Gravar do Celular ]</span>
                              </button>
                              <span className="text-[10px] text-slate-500 font-mono">Recomendado para gogó puro</span>
                            </div>
                          )}
                        </div>

                        {/* 2. Drag/Drop Uploader */}
                        <div 
                          onDragEnter={handleDrag}
                          onDragOver={handleDrag}
                          onDragLeave={handleDrag}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center min-h-[140px] text-center cursor-pointer transition-all ${
                            isDragActive 
                              ? 'border-[#00ff87] bg-[#00ff87]/5' 
                              : formData.audioFileName 
                                ? 'border-emerald-500/30 bg-emerald-500/5' 
                                : 'border-slate-800 hover:border-slate-700 bg-[#14181f]'
                          }`}
                        >
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileInputChange}
                            accept="audio/*"
                            className="hidden"
                          />
                          {formData.audioFileName ? (
                            <div className="space-y-2">
                              <FileAudio className="h-8 w-8 text-[#00ff87] mx-auto animate-bounce" />
                              <p className="text-xs font-bold text-white max-w-[180px] truncate mx-auto">
                                {formData.audioFileName}
                              </p>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); clearAudio(); }}
                                className="text-[10px] text-red-400 font-mono underline block mx-auto hover:text-red-300"
                              >
                                Remover áudio
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Upload className="h-6 w-6 text-slate-500 mx-auto group-hover:text-white" />
                              <p className="text-xs text-slate-300 font-semibold">Anexar arquivo de áudio</p>
                              <p className="text-[10px] text-slate-500">Arraste aqui ou clique para selecionar</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="pt-4 border-t border-slate-900/60 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex items-center gap-1.5 text-slate-400 hover:text-white font-mono text-xs transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Voltar</span>
                    </button>

                    <button
                      type="submit"
                      disabled={!formData.audioBlob}
                      className={`flex items-center gap-2 py-3 px-6 rounded-xl font-bold font-mono text-xs uppercase tracking-wider transition-all duration-200 ${
                        formData.audioBlob
                          ? 'bg-[#00ff87] hover:bg-[#00e076] text-black shadow-md'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <span>Gerar Análise de Guia</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              )}


              {/* STEP 3: HIGH-TECH LOADING / PROCESSING */}
              {step === 3 && (
                <div className="py-8 space-y-8 flex flex-col items-center">
                  <div className="relative">
                    <div className="absolute -inset-4 rounded-full bg-[#00ff87]/5 blur-lg animate-pulse"></div>
                    <Sliders className="h-14 w-14 text-[#00ff87] animate-spin" style={{ animationDuration: '6s' }} />
                  </div>

                  <div className="text-center max-w-sm space-y-2">
                    <h3 className="font-display text-xl font-extrabold text-white">
                      Análise & Síntese em Tempo Real
                    </h3>
                    <p className="text-xs text-slate-400">
                      Nossos curadores e algoritmos estão mapeando a alma da sua música para entregar o melhor acústico.
                    </p>
                  </div>

                  {/* Progressive Bar */}
                  <div className="w-full max-w-md space-y-4 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
                    <div className="flex justify-between items-center text-xs font-mono text-slate-500">
                      <span>CALIBRADOR COGNITIVO</span>
                      <span className="text-[#00ff87]">{Math.floor(analysisProgress)}%</span>
                    </div>

                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#00ff87] rounded-full transition-all duration-300"
                        style={{ width: `${analysisProgress}%` }}
                      />
                    </div>

                    {/* Progress log lines */}
                    <div className="font-mono text-[10px] space-y-2 pt-2 border-t border-slate-800/40">
                      <div className="flex items-center gap-2">
                        <span className={activeAnalysisStage >= 1 ? "text-emerald-400" : "text-slate-600 animate-pulse"}>
                          {activeAnalysisStage >= 1 ? "✓" : "●"}
                        </span>
                        <span className={activeAnalysisStage >= 0 ? "text-slate-300" : "text-slate-600"}>
                          Extraindo melodia de voz limpa e livre de ruídos de fundo...
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={activeAnalysisStage >= 2 ? "text-emerald-400" : activeAnalysisStage === 1 ? "text-slate-400 animate-pulse" : "text-slate-700"}>
                          {activeAnalysisStage >= 2 ? "✓" : "●"}
                        </span>
                        <span className={activeAnalysisStage >= 1 ? "text-slate-300" : "text-slate-600"}>
                          Sincronizando metrônomo e gerando violão de aço acústico...
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={activeAnalysisStage >= 3 ? "text-emerald-400" : activeAnalysisStage === 2 ? "text-slate-400 animate-pulse" : "text-slate-700"}>
                          {activeAnalysisStage >= 3 ? "✓" : "●"}
                        </span>
                        <span className={activeAnalysisStage >= 2 ? "text-slate-300" : "text-slate-600"}>
                          Modelando interpretação vocal com filtros de estúdio...
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={activeAnalysisStage >= 4 ? "text-emerald-400" : activeAnalysisStage === 3 ? "text-slate-400 animate-pulse" : "text-slate-700"}>
                          {activeAnalysisStage >= 4 ? "✓" : "●"}
                        </span>
                        <span className={activeAnalysisStage >= 3 ? "text-slate-300" : "text-slate-600"}>
                          Preparando interface segura do painel do cliente...
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* STEP 4: PAYMENT SCREEN (PIX GATEWAY) */}
              {step === 4 && order && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="font-display text-xl font-extrabold text-white">
                      Passo 4 de 4: Área de Liberação Instantânea
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Conclua o pagamento de sua composição para enviar imediatamente à nossa curadoria e baixar a versão final.
                    </p>
                  </div>

                  {/* Summary order details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
                    <div>
                      <p className="text-slate-500 uppercase">Composição</p>
                      <p className="text-white font-bold truncate mt-1">{order.songTitle}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 uppercase">Estilo Escolhido</p>
                      <p className="text-[#00ff87] font-bold mt-1">
                        {order.style === 'sertanejo_sofrencia' ? 'Sertanejo' : 'Piseiro / Pop'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 uppercase">Interpretação</p>
                      <p className="text-white font-bold mt-1">
                        Voz {order.voiceGender === 'masculine' ? 'Masculina' : 'Feminina'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 uppercase">Identificador</p>
                      <p className="text-slate-400 mt-1">{order.id}</p>
                    </div>
                  </div>

                  {/* PIX Details Area */}
                  <div className="p-6 rounded-2xl border border-[#00ff87]/20 bg-[#14181f] flex flex-col md:flex-row items-center gap-6">
                    
                    {/* Simulated Pix QR Code */}
                    <div className="relative p-3 rounded-xl bg-white border border-slate-200 shrink-0">
                      <div className="absolute inset-0 border-[3px] border-[#00ff87] rounded-xl scale-105 opacity-80 animate-pulse pointer-events-none"></div>
                      
                      {/* Generates a clean custom QR-looking visual mockup */}
                      <svg className="w-32 h-32 text-black" viewBox="0 0 100 100">
                        {/* QR Code corners */}
                        <rect x="5" y="5" width="25" height="25" fill="black" />
                        <rect x="8" y="8" width="19" height="19" fill="white" />
                        <rect x="12" y="12" width="11" height="11" fill="black" />

                        <rect x="70" y="5" width="25" height="25" fill="black" />
                        <rect x="73" y="8" width="19" height="19" fill="white" />
                        <rect x="77" y="12" width="11" height="11" fill="black" />

                        <rect x="5" y="70" width="25" height="25" fill="black" />
                        <rect x="8" y="73" width="19" height="19" fill="white" />
                        <rect x="12" y="77" width="11" height="11" fill="black" />

                        {/* QR Code random pixels */}
                        <rect x="40" y="10" width="8" height="8" fill="black" />
                        <rect x="55" y="15" width="8" height="8" fill="black" />
                        <rect x="45" y="35" width="12" height="6" fill="black" />
                        <rect x="15" y="45" width="8" height="14" fill="black" />
                        <rect x="35" y="55" width="15" height="15" fill="black" />
                        <rect x="75" y="45" width="10" height="20" fill="black" />
                        <rect x="55" y="75" width="12" height="12" fill="black" />
                        <rect x="80" y="80" width="15" height="12" fill="black" />
                        
                        {/* Small green logo in center */}
                        <circle cx="50" cy="50" r="10" fill="white" />
                        <circle cx="50" cy="50" r="7" fill="#00ff87" />
                      </svg>
                    </div>

                    {/* Copy/Paste Pix Key Info */}
                    <div className="flex-1 space-y-4 w-full">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">VALOR DO SERVIÇO</span>
                        <p className="text-white text-3xl font-black font-display mt-0.5">R$ 49,90</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-slate-400 block font-bold uppercase">
                          Copia e Cola do Pix
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            readOnly
                            value={order.pixCode}
                            className="flex-1 bg-[#0a0c0f] border border-slate-800 text-[10px] font-mono px-3 py-2 rounded-lg text-slate-400 select-all"
                          />
                          <button
                            type="button"
                            onClick={handleCopyPix}
                            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase tracking-wider border transition-colors ${
                              pixCopied
                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                                : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                            }`}
                          >
                            {pixCopied ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                        <ShieldCheck className="h-4 w-4 text-[#00ff87]" />
                        <span>O painel libera no re-reconhecimento bancário instantâneo.</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Simulator Button */}
                  <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/15 text-center space-y-3">
                    <p className="text-xs text-slate-400 font-medium">
                      Simule o Pix realizado no seu celular para ver a finalização em tempo real:
                    </p>
                    <button
                      type="button"
                      onClick={handleSimulatePaymentConfirm}
                      className="inline-flex items-center gap-2 py-2.5 px-6 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold font-mono uppercase tracking-wide transition-all shadow-md active:scale-95"
                    >
                      <Check className="h-4 w-4 stroke-[3px]" />
                      <span>[ Simular Confirmação de Pagamento ]</span>
                    </button>
                  </div>
                </div>
              )}


              {/* STEP 5: PERSONAL COMPOSER DASHBOARD */}
              {step === 5 && order && (
                <div className="space-y-6">
                  {/* Dashboard Header Banner */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-[#14181f] border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <span className="text-[10px] font-mono text-[#00ff87] font-bold bg-[#00ff87]/10 px-2 py-0.5 rounded">
                        CONTA ATIVA
                      </span>
                      <h4 className="text-white font-display text-lg font-bold mt-1.5">
                        Olá, {order.name}!
                      </h4>
                      <p className="text-slate-400 text-xs mt-0.5">
                        Bem-vindo ao seu painel exclusivo do compositor.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-mono bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                      <Shield className="h-3.5 w-3.5" />
                      <span>ÁREA SEGURA</span>
                    </div>
                  </div>

                  {/* Active Studio Production Row */}
                  <div className="border border-slate-800 rounded-2xl bg-[#14181f]/60 p-6 space-y-5">
                    <div className="flex justify-between items-start flex-wrap gap-2 pb-4 border-b border-slate-900">
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-white font-bold text-sm md:text-base">
                            {order.songTitle}
                          </h5>
                          <span className="text-[10px] font-mono text-[#00ff87] bg-[#00ff87]/5 px-2 py-0.5 rounded border border-[#00ff87]/10 font-semibold">
                            {order.style === 'sertanejo_sofrencia' ? 'Sertanejo Sofrência' : 'Piseiro / Pop'}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-500 mt-1">
                          Ref: {order.audioFileName} • Criado em {order.createdAt}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase select-none animate-pulse">
                        <Sparkles className="h-3 w-3" />
                        <span>GUIA CONCLUÍDA</span>
                      </div>
                    </div>

                    {/* Dashboard Custom Active Player */}
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-3">
                      <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                        <span className="flex items-center gap-1">
                          <Music className="h-3.5 w-3.5 text-[#00ff87]" />
                          <span>GUIA COMPLETA - VOZ {order.voiceGender === 'masculine' ? 'MASCULINA' : 'FEMININA'}</span>
                        </span>
                        <span className="text-slate-500">{formatDashboardTime(dashboardTime)} / 0:30</span>
                      </div>

                      {/* Wave visuals */}
                      <div className="flex items-end gap-[2px] h-8 justify-center opacity-80 my-2">
                        {[...Array(40)].map((_, i) => {
                          if (isPlayingDashboardTrack) {
                            return (
                              <span
                                key={i}
                                className="w-[3px] bg-[#00ff87] rounded-full animate-bounce"
                                style={{
                                  height: `${Math.max(20, Math.sin(i * 0.3) * 80 + 20)}%`,
                                  animationDuration: `${0.5 + (i % 4) * 0.15}s`
                                }}
                              />
                            );
                          }
                          return <span key={i} className="w-[3px] h-1.5 bg-slate-800 rounded-full" />;
                        })}
                      </div>

                      {/* Scrub */}
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#00ff87] rounded-full" 
                          style={{ width: `${dashboardProgress}%` }}
                        />
                      </div>

                      {/* Play buttons */}
                      <div className="flex justify-between items-center pt-2">
                        <button
                          onClick={handleToggleDashboardPlay}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all shadow-md ${
                            isPlayingDashboardTrack
                              ? 'bg-red-500/25 border border-red-500/40 text-red-400'
                              : 'bg-[#00ff87] hover:bg-[#00e076] text-black hover:shadow-[0_0_12px_rgba(0,255,135,0.2)]'
                          }`}
                        >
                          {isPlayingDashboardTrack ? (
                            <>
                              <Square className="h-3.5 w-3.5" />
                              <span>Parar Guia</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5 fill-black" />
                              <span>Tocar Guia Completa</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => alert(`Sua Guia de Áudio de alta definição (.WAV) foi salva na pasta de Downloads! (${order.songTitle}_Guia_Acustica.wav)`)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 text-white hover:text-white text-xs font-mono font-bold transition-all"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Baixar (.WAV)</span>
                        </button>
                      </div>
                    </div>

                    {/* Lyrics preview dashboard block */}
                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                      <span className="text-[10px] font-mono text-slate-500 font-bold block mb-2 uppercase">
                        Letra Vinculada
                      </span>
                      <p className="text-xs text-slate-400 font-serif leading-relaxed whitespace-pre-line border-l border-slate-800 pl-3">
                        {order.lyrics}
                      </p>
                    </div>
                  </div>

                  {/* Reset/New creation Button */}
                  <div className="pt-4 border-t border-slate-900/60 flex justify-center">
                    <button
                      onClick={() => {
                        audioSynth.stop();
                        setIsPlayingDashboardTrack(false);
                        setStep(1);
                        setFormData({
                          name: '',
                          email: '',
                          phone: '',
                          songTitle: '',
                          lyrics: '',
                          voiceGender: 'masculine',
                          style: 'sertanejo_sofrencia',
                          audioBlob: null,
                          audioFileName: null,
                        });
                        setRecordedUrl(null);
                        setOrder(null);
                      }}
                      className="flex items-center gap-1.5 text-slate-400 hover:text-white font-mono text-xs uppercase tracking-wide transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Produzir Nova Composição</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
