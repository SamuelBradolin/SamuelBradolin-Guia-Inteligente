import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Music, PlusCircle, Settings, LogOut, Download, 
  Sparkles, Smartphone, CheckCircle, Calendar, Upload, 
  FileText, Mic, Guitar, Info, QrCode, Copy, Check, X,
  Plus, Camera
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

interface GuideItem {
  id: string;
  title: string;
  date: string;
  status: 'Em Produção' | 'Concluída' | 'Fila de Espera';
  genre: string;
  voiceType: string;
  finalAudioUrl?: string;
}

interface DashboardProps {
  userEmail: string;
  onLogout: () => void;
}

export default function Dashboard({ userEmail, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'new' | 'settings' | 'contribute'>('history');
  const [composerName, setComposerName] = useState('Roberto Santos');
  const [credits, setCredits] = useState(1);
  const [isCompositorPro, setIsCompositorPro] = useState(false);
  const [activeDiscount, setActiveDiscount] = useState(0);
  const [globalNotice, setGlobalNotice] = useState<string | null>(null);
  const [privateNotices, setPrivateNotices] = useState<{ id: string; message: string; creditsGifted: number; discountGifted: number; date: string }[]>([]);
  
  // Contribute states
  const [testimonial, setTestimonial] = useState('');
  const [testimonialCoupon, setTestimonialCoupon] = useState<string | null>(null);
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  
  // Real guide list synchronized with Firestore
  const [guides, setGuides] = useState<GuideItem[]>([]);

  // Synchronizer with Firestore database
  useEffect(() => {
    // 1. Sync User Info
    const cachedUsers = localStorage.getItem('gi_users');
    let usersList = cachedUsers ? JSON.parse(cachedUsers) : [];
    
    let currentUser = usersList.find((u: any) => u.email === userEmail);
    if (!currentUser) {
      currentUser = {
        id: `usr-${Date.now()}`,
        name: userEmail.split('@')[0].toUpperCase(),
        email: userEmail,
        credits: 1, // Start with 1 free credit!
        activeDiscount: 0,
        isCompositorPro: userEmail.includes('admin') || userEmail === 'roberto@email.com' || userEmail === 'bruno@email.com'
      };
      usersList.push(currentUser);
      localStorage.setItem('gi_users', JSON.stringify(usersList));
    }
    
    setComposerName(currentUser.name);
    setCredits(currentUser.credits);
    setActiveDiscount(currentUser.activeDiscount || 0);
    setIsCompositorPro(currentUser.isCompositorPro || false);

    // 2. Sync Compositions from Firestore Collection (pedidos)
    const q = query(
      collection(db, 'pedidos'),
      where('id_cliente', '==', userEmail)
    );
    
    const unsubscribeComps = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      
      // Map composition list to client GuideItem format
      const mappedGuides = list.map((c: any) => ({
        id: c.id,
        title: c.nome_musica || c.title || 'Sem Título',
        date: c.data || c.date || '11/07/2026',
        status: c.status || 'Fila de Espera',
        genre: c.genre || 'Sertanejo',
        voiceType: c.voiceType || 'Voz Masculina de Estúdio',
        finalAudioUrl: c.url_audio_final || c.finalAudioUrl || c.url_audio_entrega
      }));
      setGuides(mappedGuides);
    }, (error) => {
      console.error("Error loading guides from Firebase pedidos collection:", error);
    });

    // 3. Sync CRM Notifications
    const globalAnnounce = localStorage.getItem('gi_global_notification');
    setGlobalNotice(globalAnnounce);

    const privateList = JSON.parse(localStorage.getItem('gi_private_notifications') || '[]');
    const myPrivates = privateList.filter((p: any) => p.email === userEmail);
    setPrivateNotices(myPrivates);

    return () => unsubscribeComps();
  }, [userEmail, activeTab]);

  // Form states for "Nova Composição"
  const [newTitle, setNewTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [musicStyle, setMusicStyle] = useState('');
  const [partners, setPartners] = useState('');
  const [voiceType, setVoiceType] = useState('Voz Masculina de Estúdio');
  const [directionDetails, setDirectionDetails] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings states
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const avatarUploadRef = useRef<HTMLInputElement>(null);

  const avatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80'
  ];

  const currentAvatarUrl = (avatarIndex === -1 && customAvatar) ? customAvatar : avatars[avatarIndex] || avatars[0];

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomAvatar(reader.result as string);
        setAvatarIndex(-1); // -1 selects custom avatar
        showToast('Foto de perfil atualizada com sucesso!');
      };
      reader.readAsDataURL(file);
    }
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Pix modal/alert state
  const [showPixModal, setShowPixModal] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [showPromoPixModal, setShowPromoPixModal] = useState(false);
  const [copiedPromoPix, setCopiedPromoPix] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setFileName(file.name);
      setSelectedFile(file);
    }
  };

  const handleCreateComposition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) {
      alert('Por favor, informe o nome da composição.');
      return;
    }
    if (!fileName) {
      alert('Por favor, envie um arquivo de áudio para prosseguir.');
      return;
    }

    if (credits > 0) {
      setIsUploading(true);
      setUploadProgress(15);
      
      let audioUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
      if (selectedFile) {
        try {
          const fileRef = ref(storage, `audios_brutos/${Date.now()}_${selectedFile.name}`);
          setUploadProgress(40);
          const uploadResult = await uploadBytes(fileRef, selectedFile);
          setUploadProgress(80);
          audioUrl = await getDownloadURL(uploadResult.ref);
          setUploadProgress(95);
        } catch (uploadErr) {
          console.error("Firebase Storage Upload Error, falling back to simulated audio:", uploadErr);
        }
      }

      try {
        const newCompObj = {
          // Explicitly requested schema fields
          id_cliente: userEmail,
          nome_musica: newTitle,
          status: 'Fila de Espera',
          data: new Date().toLocaleDateString('pt-BR'),
          url_audio: audioUrl,

          // Legacy compatible fields
          composerName: composerName,
          composerEmail: userEmail,
          isCompositorPro: isCompositorPro,
          title: newTitle,
          genre: musicStyle || 'Geral Acústico',
          voiceType: voiceType,
          lyrics: lyrics || 'Letra da música...',
          directionDetails: directionDetails,
          partners: partners,
          audioName: fileName || 'audio_composição.mp3',
          audioUrl: audioUrl,
          createdAt: serverTimestamp()
        };

        await addDoc(collection(db, 'pedidos'), newCompObj);

        // Deduct credits locally in profile
        const newCredits = credits - 1;
        setCredits(newCredits);
        const cachedUsers = localStorage.getItem('gi_users');
        if (cachedUsers) {
          const usersList = JSON.parse(cachedUsers);
          const updated = usersList.map((u: any) => {
            if (u.email === userEmail) {
              return { ...u, credits: newCredits };
            }
            return u;
          });
          localStorage.setItem('gi_users', JSON.stringify(updated));
        }

        showToast('Composição enviada com sucesso utilizando seu crédito!');
        
        // Reset form
        setNewTitle('');
        setLyrics('');
        setMusicStyle('');
        setPartners('');
        setDirectionDetails('');
        setFileName(null);
        setSelectedFile(null);
        
        // Go to history tab
        setActiveTab('history');
      } catch (err) {
        console.error("Firestore Error creating composition:", err);
        alert("Erro ao enviar sua composição. Por favor tente novamente.");
      } finally {
        setIsUploading(false);
        setUploadProgress(100);
      }
    } else {
      // Limit reached, trigger PIX
      setShowPixModal(true);
    }
  };

  const handleSimulatePayment = async () => {
    setShowPixModal(false);
    setIsUploading(true);
    setUploadProgress(15);
    
    let audioUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
    if (selectedFile) {
      try {
        const fileRef = ref(storage, `audios_brutos/${Date.now()}_${selectedFile.name}`);
        setUploadProgress(50);
        const uploadResult = await uploadBytes(fileRef, selectedFile);
        audioUrl = await getDownloadURL(uploadResult.ref);
        setUploadProgress(85);
      } catch (uploadErr) {
        console.error("Firebase Storage Simulation Upload Error:", uploadErr);
      }
    }

    try {
      const newCompObj = {
        // Explicitly requested schema fields
        id_cliente: userEmail,
        nome_musica: newTitle || 'Nova Guia Premium',
        status: 'Fila de Espera',
        data: new Date().toLocaleDateString('pt-BR'),
        url_audio: audioUrl,

        // Legacy compatible fields
        composerName: composerName,
        composerEmail: userEmail,
        isCompositorPro: isCompositorPro,
        title: newTitle || 'Nova Guia Premium',
        genre: musicStyle || 'Sertanejo Moderno',
        voiceType: voiceType,
        lyrics: lyrics || 'Letra da música...',
        directionDetails: directionDetails,
        partners: partners,
        audioName: fileName || 'audio_composição.mp3',
        audioUrl: audioUrl,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'pedidos'), newCompObj);

      // Save transaction to Firestore
      const discount = activeDiscount || 0;
      const amountPaid = Math.max(0, 49.90 - discount);
      const newTxObj = {
        dateTime: new Date().toLocaleString('pt-BR'),
        clientName: composerName,
        clientEmail: userEmail,
        type: discount > 0 ? 'Uso de Cupom' : 'Guia Avulsa',
        amountPaid: amountPaid,
        discountApplied: discount,
        timestamp: serverTimestamp()
      };
      await addDoc(collection(db, 'transacoes'), newTxObj);

      // Clear activeDiscount in user profile
      if (discount > 0) {
        setActiveDiscount(0);
        const cachedUsers = localStorage.getItem('gi_users');
        if (cachedUsers) {
          const usersList = JSON.parse(cachedUsers);
          const updated = usersList.map((u: any) => {
            if (u.email === userEmail) {
              return { ...u, activeDiscount: 0 };
            }
            return u;
          });
          localStorage.setItem('gi_users', JSON.stringify(updated));
        }
      }

      showToast('Pagamento confirmado! Sua nova composição entrou em linha de produção!');
      
      // Reset form
      setNewTitle('');
      setLyrics('');
      setMusicStyle('');
      setPartners('');
      setDirectionDetails('');
      setFileName(null);
      setSelectedFile(null);
      setActiveTab('history');
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  const copyPixKey = () => {
    navigator.clipboard.writeText('00020101021126580014br.gov.bcb.pix0136guia-inteligente-acustica-pix-key999520400005303986540549.905802BR5925Guia Inteligente LTDA6009Sao Paulo62070503***6304D18E');
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const copyPromoPixKey = () => {
    navigator.clipboard.writeText('00020101021126580014br.gov.bcb.pix0136guia-inteligente-acustica-pix-key999520400005303986540549.170002BR5925Guia Inteligente LTDA6009Sao Paulo62070503***6304E29F');
    setCopiedPromoPix(true);
    setTimeout(() => setCopiedPromoPix(false), 2000);
  };

  const handleSimulatePromoPayment = () => {
    setShowPromoPixModal(false);
    const newCredits = credits + 5;
    setCredits(newCredits);
    setIsCompositorPro(true);

    // Save in localStorage gi_users
    const cachedUsers = localStorage.getItem('gi_users');
    if (cachedUsers) {
      const usersList = JSON.parse(cachedUsers);
      const updated = usersList.map((u: any) => {
        if (u.email === userEmail) {
          return { ...u, credits: newCredits, isCompositorPro: true };
        }
        return u;
      });
      localStorage.setItem('gi_users', JSON.stringify(updated));
    }

    // Save transaction
    const cachedTx = localStorage.getItem('gi_transactions');
    const txList = cachedTx ? JSON.parse(cachedTx) : [];
    const newTx = {
      id: `tx-${Date.now()}`,
      dateTime: new Date().toLocaleString('pt-BR'),
      clientName: composerName,
      clientEmail: userEmail,
      type: 'Pacote Pro' as const,
      amountPaid: 170.00,
      discountApplied: 79.50 // (5 * 49.90 = 249.50. So savings are 79.50)
    };
    txList.push(newTx);
    localStorage.setItem('gi_transactions', JSON.stringify(txList));

    showToast('Pagamento do Pacote Pro confirmado! Status "Compositor Pro" ativado e 5 créditos adicionados ao seu painel.');
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword && newPassword !== confirmNewPassword) {
      alert('A nova senha e a confirmação de senha não coincidem.');
      return;
    }
    showToast('Configurações salvas com sucesso!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  const handleDownloadAudio = (title: string, finalAudioUrl?: string) => {
    if (finalAudioUrl && finalAudioUrl.startsWith('http')) {
      showToast(`Iniciando download em WAV de alta definição: "${title}"`);
      const element = document.createElement('a');
      element.setAttribute('href', finalAudioUrl);
      element.setAttribute('target', '_blank');
      element.setAttribute('rel', 'noopener noreferrer');
      element.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}_guia_acustica.wav`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } else {
      showToast(`Iniciando download em WAV de alta definição (Simulação): "${title}"`);
      // Create a mock link element
      const element = document.createElement('a');
      element.setAttribute('href', 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
      element.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}_guia_acustica.wav`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  const handleSendTestimonial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testimonial.trim()) {
      showToast('Por favor, escreva seu depoimento antes de enviar!');
      return;
    }

    const newTestimonialObj = {
      id: `test-${Date.now()}`,
      composerName: composerName,
      composerEmail: userEmail,
      text: testimonial,
      status: 'Aguardando Aprovação' as const,
      sendToHome: false,
      date: '11/07/2026'
    };

    const cachedTests = localStorage.getItem('gi_testimonials');
    const testsList = cachedTests ? JSON.parse(cachedTests) : [];
    testsList.push(newTestimonialObj);
    localStorage.setItem('gi_testimonials', JSON.stringify(testsList));

    const codes = ['DEPOIMENTO5', 'GUIA5DEPO', 'VOZ5ACUSTICA', 'PRODUCAO5'];
    const randomCode = codes[Math.floor(Math.random() * codes.length)];
    setTestimonialCoupon(randomCode);
    showToast('Depoimento enviado para aprovação! Seu cupom de desconto de R$ 5 foi gerado.');
  };

  const handleCopyInviteLink = () => {
    const link = `guiainteligente.com/convite/${composerName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '') || 'musico'}123`;
    navigator.clipboard.writeText(link);
    setCopiedInviteLink(true);
    showToast('Link de indicação copiado com sucesso!');
    setTimeout(() => setCopiedInviteLink(false), 3000);
    
    // Open WhatsApp URL with custom message
    const message = encodeURIComponent(`Olha que sensacional essa plataforma que faz Guia de Voz e Violão Profissional! Eles dão a primeira guia grátis para você testar. Cadastre-se pelo meu link de convite: ${link}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-100px)] bg-[#0d0f13] text-slate-100 relative">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 right-6 z-50 bg-slate-900 border border-[#00ff87]/30 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 max-w-sm"
          >
            <div className="p-1 rounded-full bg-[#00ff87]/10 text-[#00ff87]">
              <Sparkles className="h-4 w-4 animate-pulse" />
            </div>
            <p className="text-xs font-semibold">{successToast}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-[#0a0c0f] border-b md:border-b-0 md:border-r border-slate-900 p-6 flex flex-col justify-between gap-6 md:sticky md:top-[73px] md:h-[calc(100vh-73px)]">
        <div className="space-y-6">
          
          {/* PROFILE CARD */}
          <div className="p-4 rounded-xl bg-[#111419] border border-slate-900 flex flex-col items-center text-center space-y-3">
            <div className="relative group">
              <div className="absolute -inset-1.5 rounded-full bg-[#00ff87]/20 blur-md opacity-70 group-hover:opacity-100 transition-opacity"></div>
              <img 
                src={currentAvatarUrl} 
                alt={composerName} 
                className="h-14 w-14 rounded-full border border-slate-800 object-cover relative z-10"
              />
            </div>
            <div>
              <h4 className="font-display font-bold text-sm text-white">{composerName}</h4>
              <p className="text-[10px] font-mono text-slate-500 truncate max-w-[170px]">{userEmail}</p>
            </div>

            {/* Glowing credits counter */}
            <div className="w-full mt-2 py-2 px-3 rounded-lg bg-[#00ff87]/5 border border-[#00ff87]/15 text-[#00ff87] flex items-center justify-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span className="text-[11px] font-mono font-bold">
                Saldo: {credits} {credits === 1 ? 'Guia' : 'Guias'} {isCompositorPro && '⚡'}
              </span>
            </div>
          </div>

          {/* MENU ITEMS */}
          <nav className="flex flex-col gap-1.5">
            <button
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-mono text-xs font-bold tracking-wider uppercase transition-all border ${
                activeTab === 'history'
                  ? 'bg-[#00ff87]/10 text-[#00ff87] border-[#00ff87]/20'
                  : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-900/50'
              }`}
            >
              <Music className="h-4 w-4" />
              <span>Minhas Guias</span>
            </button>

            <button
              onClick={() => setActiveTab('new')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-mono text-xs font-bold tracking-wider uppercase transition-all border ${
                activeTab === 'new'
                  ? 'bg-[#00ff87]/10 text-[#00ff87] border-[#00ff87]/20'
                  : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-900/50'
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              <span>Nova Composição</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-mono text-xs font-bold tracking-wider uppercase transition-all border ${
                activeTab === 'settings'
                  ? 'bg-[#00ff87]/10 text-[#00ff87] border-[#00ff87]/20'
                  : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-900/50'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Configurações</span>
            </button>

            <button
              onClick={() => setActiveTab('contribute')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-mono text-xs font-bold tracking-wider uppercase transition-all border ${
                activeTab === 'contribute'
                  ? 'bg-[#00ff87]/10 text-[#00ff87] border-[#00ff87]/20'
                  : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-900/50'
              }`}
            >
              <span className="text-sm">🎁</span>
              <span>Contribua e Ganhe</span>
            </button>
          </nav>
        </div>

        {/* LOGOUT BUTTON FOOTER */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-mono text-xs font-bold tracking-wider text-red-400/80 hover:text-red-400 border border-transparent hover:border-red-500/20 hover:bg-red-500/5 transition-all uppercase"
        >
          <LogOut className="h-4 w-4" />
          <span>[ Sair do Painel ]</span>
        </button>
      </aside>

      {/* DYNAMIC CONTENT STAGE */}
      <main className="flex-1 p-6 md:p-10 max-w-5xl space-y-6">
        
        {/* CRM Notice */}
        {globalNotice && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold flex items-center gap-3 shadow-[0_2px_15px_rgba(245,158,11,0.1)] relative">
            <span className="text-base animate-bounce">📢</span>
            <div className="flex-1">
              <span className="text-[9px] text-amber-500 uppercase tracking-widest font-black block">AVISO GERAL DA PRODUÇÃO</span>
              <p className="mt-0.5">{globalNotice}</p>
            </div>
            <button 
              onClick={() => {
                setGlobalNotice(null);
              }}
              className="text-amber-500 hover:text-white font-bold p-1 rounded-full text-xs"
              title="Dispensar aviso"
            >
              ✕
            </button>
          </div>
        )}

        {/* Private Messages */}
        {privateNotices.length > 0 && privateNotices.map((note) => (
          <div 
            key={note.id} 
            className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs flex items-center gap-3 shadow-[0_2px_15px_rgba(6,182,212,0.1)] relative"
          >
            <span className="text-base">✉️</span>
            <div className="flex-1">
              <span className="text-[9px] text-cyan-400 uppercase tracking-widest font-black block">MENSAGEM DO PRODUTOR</span>
              <p className="font-medium text-white mt-0.5">{note.message || 'Seu saldo foi atualizado pelo suporte!'}</p>
              
              {(Number(note.creditsGifted || 0) > 0 || Number(note.discountGifted || 0) > 0) && (
                <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-cyan-500/15 text-[10px] text-cyan-400 font-bold">
                  {Number(note.creditsGifted) > 0 && <span>🎁 +{note.creditsGifted} Crédito de Guia de presente</span>}
                  {Number(note.discountGifted) > 0 && <span>💵 +R$ {note.discountGifted},00 Desconto acumulado presente</span>}
                </div>
              )}
            </div>
            <button 
              onClick={() => {
                setPrivateNotices(prev => prev.filter(p => p.id !== note.id));
                const cached = JSON.parse(localStorage.getItem('gi_private_notifications') || '[]');
                const filtered = cached.filter((p: any) => p.id !== note.id);
                localStorage.setItem('gi_private_notifications', JSON.stringify(filtered));
              }}
              className="text-cyan-400 hover:text-white font-bold p-1 rounded-full text-xs"
              title="Dispensar mensagem"
            >
              ✕
            </button>
          </div>
        ))}

        <AnimatePresence mode="wait">
          
          {/* TELA 1 - HISTÓRICO */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-6">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-[#00ff87] uppercase">ESCRITÓRIO VIRTUAL</span>
                  <h2 className="font-display text-2xl font-black text-white mt-1">Seu Escritório de Criação Virtual</h2>
                  <p className="text-xs text-slate-400 mt-1">Acompanhe e gerencie as guias enviadas para nossa curadoria artística.</p>
                </div>
              </div>

              {/* Responsive Tabela de Projetos */}
              <div className="rounded-xl border border-slate-900 bg-[#111419]/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#0a0c0f] border-b border-slate-900 text-[10px] font-mono text-slate-400 tracking-wider uppercase">
                        <th className="py-4 px-6">Nome da Música</th>
                        <th className="py-4 px-6">Envio / Data</th>
                        <th className="py-4 px-6">Estilo Musical</th>
                        <th className="py-4 px-6">Status da Curadoria</th>
                        <th className="py-4 px-6 text-right">Download</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/50">
                      {guides.map((item) => (
                        <tr key={item.id} className="text-xs hover:bg-[#111419]/80 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-slate-900 text-slate-400 border border-slate-800">
                                <Music className="h-3.5 w-3.5 text-[#00ff87]" />
                              </div>
                              <div>
                                <span className="font-bold text-white block">{item.title}</span>
                                <span className="text-[10px] text-slate-500 font-mono uppercase">{item.voiceType}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{item.date}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 font-mono text-[11px] text-slate-300">
                            {item.genre}
                          </td>
                          <td className="py-4 px-6">
                            {item.status === 'Fila de Espera' ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-bold font-mono text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                  ⚪ Fila de Espera
                                </span>
                                <p className="text-[10px] text-slate-500 max-w-[200px] leading-tight">
                                  Aguardando início da produção pelo produtor.
                                </p>
                              </div>
                            ) : item.status === 'Em Produção' ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-bold font-mono text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/15">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  🟡 Em Produção
                                </span>
                                <p className="text-[10px] text-slate-500 max-w-[200px] leading-tight">
                                  Nossa curadoria está calibrando a IA para a sua música.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-bold font-mono text-[10px] bg-[#00ff87]/10 text-[#00ff87] border border-[#00ff87]/15">
                                  <CheckCircle className="h-3 w-3" />
                                  🟢 Concluída
                                </span>
                                <p className="text-[10px] text-slate-500 max-w-[200px] leading-tight">
                                  Sua guia profissional está pronta para baixar!
                                </p>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            {item.status === 'Concluída' ? (
                              <button
                                onClick={() => handleDownloadAudio(item.title, item.finalAudioUrl)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00ff87] hover:bg-[#00e076] text-black rounded-lg font-bold font-mono text-[10px] uppercase tracking-wider transition-all duration-300 shadow-[0_0_15px_rgba(0,255,135,0.1)] hover:shadow-[0_0_20px_rgba(0,255,135,0.25)]"
                              >
                                <Download className="h-3 w-3" />
                                <span>Baixar WAV</span>
                              </button>
                            ) : (
                              <button
                                disabled
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-500 rounded-lg font-mono text-[10px] uppercase cursor-not-allowed"
                              >
                                <span>Aguardando</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TELA 2 - FORMULÁRIO DE ENVIO */}
          {activeTab === 'new' && (
            <motion.div
              key="new"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Header Promo Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-[#00ff87]/5 border border-[#00ff87]/20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-[#00ff87]/10 text-[#00ff87]">
                    <Sparkles className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Excelente escolha!</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {credits > 0 
                        ? 'Você tem 1 Guia Grátis para usar nesta composição.'
                        : 'Você utilizará créditos avulsos. Caso não possua, o envio gerará um PIX seguro.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Box */}
              <form onSubmit={handleCreateComposition} className="space-y-6 bg-[#111419]/40 border border-slate-900 rounded-2xl p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left Column: Music Details */}
                  <div className="space-y-5">
                    {/* Title */}
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                        Nome da Composição
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Minha Nova Música"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full px-4 py-3 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-xl text-sm text-white focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Partners / Coauthors */}
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                        Parceiros / Coautores (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: João Silva, Maria Souza (Deixe em branco se compôs sozinho)"
                        value={partners}
                        onChange={(e) => setPartners(e.target.value)}
                        className="w-full px-4 py-3 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-xl text-sm text-white focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Style Input */}
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                        Estilo Musical Desejado (Campo Livre)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Sertanejo arrastado estilo anos 90, Pop acústico leve, etc."
                        value={musicStyle}
                        onChange={(e) => setMusicStyle(e.target.value)}
                        className="w-full px-4 py-3 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-xl text-sm text-white focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Voice Selection */}
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                        Tipo de Voz de Estúdio
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setVoiceType('Voz Masculina de Estúdio')}
                          className={`py-3 px-4 rounded-xl border text-xs font-bold font-mono tracking-wider transition-all flex items-center justify-center gap-2 ${
                            voiceType === 'Voz Masculina de Estúdio'
                              ? 'bg-[#00ff87]/15 border-[#00ff87]/40 text-[#00ff87]'
                              : 'bg-[#14181f] border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <Mic className="h-4 w-4" />
                          <span>VOZ MASCULINA</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setVoiceType('Voz Feminina de Estúdio')}
                          className={`py-3 px-4 rounded-xl border text-xs font-bold font-mono tracking-wider transition-all flex items-center justify-center gap-2 ${
                            voiceType === 'Voz Feminina de Estúdio'
                              ? 'bg-[#00ff87]/15 border-[#00ff87]/40 text-[#00ff87]'
                              : 'bg-[#14181f] border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <Mic className="h-4 w-4" />
                          <span>VOZ FEMININA</span>
                        </button>
                      </div>
                    </div>

                    {/* Direction Art Details */}
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                        Detalhes da Direção Artística (Opcional)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Ex: Instruções de andamento, tom desejado, artista em que se inspirou para o dedilhado do violão..."
                        value={directionDetails}
                        onChange={(e) => setDirectionDetails(e.target.value)}
                        className="w-full px-4 py-3 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-xl text-sm text-white focus:outline-none transition-colors resize-none"
                      />
                    </div>
                  </div>

                  {/* Right Column: Audio file & Lyrics */}
                  <div className="space-y-5">
                    {/* Audio Upload */}
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                        Áudio da Composição (Voz ou Canto Solo)
                      </label>
                      <div
                        onClick={handleFileUploadClick}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className={`h-36 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all ${
                          fileName 
                            ? 'bg-[#00ff87]/5 border-[#00ff87]/40 text-slate-200' 
                            : 'bg-[#14181f] border-slate-800 hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        <input
                          type="file"
                          accept="audio/*"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        {fileName ? (
                          <div className="space-y-2">
                            <div className="h-10 w-10 rounded-full bg-[#00ff87]/10 text-[#00ff87] flex items-center justify-center mx-auto">
                              <Guitar className="h-5 w-5 animate-pulse" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white max-w-[200px] truncate">{fileName}</p>
                              <p className="text-[10px] text-[#00ff87] font-mono mt-0.5">Áudio Carregado ✓</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Upload className="h-6 w-6 text-slate-500 mx-auto" />
                            <div>
                              <p className="text-xs font-semibold text-slate-300">Arraste seu áudio ou toque aqui</p>
                              <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase">Suporta MP3, WAV, M4A</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Lyrics area */}
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                        Letra da Música (Opcional)
                      </label>
                      <textarea
                        rows={5}
                        placeholder="Cole aqui a letra completa da composição para nossa curadoria analisar métricas e sílabas poéticas..."
                        value={lyrics}
                        onChange={(e) => setLyrics(e.target.value)}
                        className="w-full px-4 py-3 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-xl text-sm text-white focus:outline-none transition-colors resize-none font-mono text-xs leading-relaxed"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-4 border-t border-slate-900 flex flex-col gap-4">
                  {isUploading && (
                    <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl space-y-2 text-center text-xs font-mono">
                      <div className="text-cyan-400 font-bold animate-pulse">📤 Enviando áudio bruto para o Firebase Storage... {uploadProgress}%</div>
                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#00ff87] h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isUploading}
                      className={`w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-extrabold font-mono text-xs uppercase tracking-wider transition-all duration-300 ${
                        isUploading 
                          ? 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
                          : 'bg-[#00ff87] hover:bg-[#00e076] text-black shadow-[0_4px_15px_rgba(0,255,135,0.15)] hover:shadow-[0_4px_25px_rgba(0,255,135,0.3)] cursor-pointer'
                      }`}
                    >
                      <span>{isUploading ? 'ENVIANDO...' : 'ENVIAR PARA A CURADORIA ➔'}</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Seção de Oferta de Créditos - Pacote Compositor Pro */}
              <div className="mt-8 border-t border-slate-900/60 pt-8">
                <div className="text-center mb-6">
                  <p className="text-[10px] font-mono tracking-widest text-cyan-400 font-bold uppercase">RECARREGAR CRÉDITOS COM DESCONTO</p>
                  <h3 className="font-display text-xl font-extrabold text-white mt-1">Gaveta Cheia de Composições?</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto">
                    Aproveite nossa melhor oferta de lote e garanta suas próximas produções profissionais pelo menor valor unitário do mercado.
                  </p>
                </div>

                <div className="max-w-xl mx-auto relative group">
                  {/* Glowing gradient border effect */}
                  <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#00ff87] to-[#00f0ff] opacity-40 group-hover:opacity-100 blur-sm transition-opacity duration-500"></div>
                  
                  <div className="relative bg-[#0d1015]/95 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 overflow-hidden">
                    {/* Background noise/texture simulation */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-[#00ff87]/5 pointer-events-none" />

                    {/* Badge */}
                    <div className="flex justify-center">
                      <span className="text-[10px] font-mono font-black text-black bg-[#00ff87] px-3 py-1 rounded-full uppercase tracking-wider shadow-[0_2px_10px_rgba(0,255,135,0.2)]">
                        🔥 O MAIS VENDIDO
                      </span>
                    </div>

                    <div className="text-center space-y-2">
                      <h4 className="font-display text-lg md:text-xl font-black text-white">
                        Pacote Compositor Pro (Compre 4, Leve 5)
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                        Ideal para quem tem gavetas cheias de projetos e quer produzir seu lote de músicas com o menor preço.
                      </p>
                    </div>

                    {/* Price and economics */}
                    <div className="text-center bg-slate-950/60 border border-slate-900 p-4 rounded-xl space-y-1">
                      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">VALOR PROMOCIONAL</p>
                      <p className="text-3xl font-black text-white">
                        R$ 170,00
                        <span className="text-xs text-[#00ff87] font-mono font-bold block sm:inline sm:ml-2">à vista no Pix</span>
                      </p>
                      <p className="text-[11px] text-[#00f0ff] leading-relaxed max-w-md mx-auto pt-1 font-medium">
                        (Você ganha 1 guia inteiramente grátis e economiza R$ 79,50 no total. Cada guia sai por apenas R$ 34,00).
                      </p>
                    </div>

                    {/* Features list */}
                    <div className="space-y-3 max-w-md mx-auto">
                      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">O que está incluso no pacote:</p>
                      <ul className="space-y-2.5 text-xs text-slate-300">
                        <li className="flex items-start gap-2.5">
                          <span className="text-[#00ff87] shrink-0">✓</span>
                          <span><strong>5 Créditos de Guia Acústica</strong> (Sem prazo de validade para usar).</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="text-[#00ff87] shrink-0">✓</span>
                          <span><strong>Prioridade máxima</strong> na fila de curadoria.</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <span className="text-[#00ff87] shrink-0">✓</span>
                          <span><strong>Suporte prioritário</strong> dos engenheiros de áudio.</span>
                        </li>
                      </ul>
                    </div>

                    {/* Action button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowPromoPixModal(true)}
                        className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#00ff87] to-[#00e076] text-black font-black font-mono text-xs uppercase tracking-widest transition-all duration-300 shadow-[0_4px_20px_rgba(0,255,135,0.2)] hover:shadow-[0_4px_30px_rgba(0,255,135,0.4)] hover:scale-[1.01] active:scale-[0.99] cursor-pointer animate-pulse"
                      >
                        [ ⚡ COMPRAR PACOTE PRO COM DESCONTO ]
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TELA 3 - CONFIGURAÇÕES */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="border-b border-slate-900 pb-6">
                <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">CONFIGURAÇÕES DE PERFIL</span>
                <h2 className="font-display text-2xl font-black text-white mt-1">Configurações de Perfil</h2>
                <p className="text-xs text-slate-400 mt-1">Mantenha seus dados artísticos e de segurança sempre atualizados.</p>
              </div>

              {/* Settings Form */}
              <form onSubmit={handleSaveSettings} className="space-y-6 bg-[#111419]/40 border border-slate-900 rounded-2xl p-6 md:p-8">
                
                {/* 1. Profile Picture Selector */}
                <div className="space-y-3">
                  <label className="block text-xs font-mono text-slate-400 font-bold uppercase tracking-wide">
                    Escolher Avatar Artístico
                  </label>
                  <div className="flex flex-wrap gap-5 items-center">
                    {/* Upload button first */}
                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => avatarUploadRef.current?.click()}
                        className="relative rounded-full h-16 w-16 bg-slate-950 border-2 border-dashed border-[#00ff87] hover:border-[#00e076] hover:bg-slate-900/40 transition-all flex items-center justify-center text-[#00ff87] hover:text-[#00e076] cursor-pointer"
                        title="Subir Foto Personalizada"
                      >
                        <Camera className="h-5 w-5 stroke-[2]" />
                        <input
                          type="file"
                          ref={avatarUploadRef}
                          onChange={handleAvatarUpload}
                          accept="image/*"
                          className="hidden"
                        />
                      </button>
                      <span className="text-[10px] font-mono text-[#00ff87] font-bold tracking-wider uppercase">Subir Foto</span>
                    </div>

                    {/* Custom uploaded image if exists */}
                    {customAvatar && (
                      <div className="flex flex-col items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAvatarIndex(-1)}
                          className={`relative rounded-full h-16 w-16 overflow-hidden border-2 transition-all p-0.5 ${
                            avatarIndex === -1 ? 'border-[#00ff87] scale-105' : 'border-slate-800 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={customAvatar} alt="Avatar Personalizado" className="h-full w-full rounded-full object-cover" />
                          {avatarIndex === -1 && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Check className="h-4 w-4 text-[#00ff87] stroke-[3px]" />
                            </div>
                          )}
                        </button>
                        <span className="text-[10px] font-mono text-slate-400 font-semibold tracking-wider uppercase">Pessoal</span>
                      </div>
                    )}

                    {/* Standard avatars list */}
                    {avatars.map((url, index) => (
                      <div key={index} className="flex flex-col items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAvatarIndex(index)}
                          className={`relative rounded-full h-16 w-16 overflow-hidden border-2 transition-all p-0.5 ${
                            avatarIndex === index ? 'border-[#00ff87] scale-105' : 'border-slate-800 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={url} alt={`Avatar Padrão ${index + 1}`} className="h-full w-full rounded-full object-cover" />
                          {avatarIndex === index && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Check className="h-4 w-4 text-[#00ff87] stroke-[3px]" />
                            </div>
                          )}
                        </button>
                        <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase">Padrão {index + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left block - Info */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                        Nome Artístico / Compositor
                      </label>
                      <input
                        type="text"
                        required
                        value={composerName}
                        onChange={(e) => setComposerName(e.target.value)}
                        className="w-full px-4 py-3 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-xl text-sm text-white focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                        E-mail de Contato (Não alterável)
                      </label>
                      <input
                        type="email"
                        disabled
                        value={userEmail}
                        className="w-full px-4 py-3 bg-[#14181f]/40 border border-slate-900 text-slate-500 rounded-xl text-sm focus:outline-none cursor-not-allowed font-mono"
                      />
                    </div>
                  </div>

                  {/* Right block - Security */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#00ff87] border-b border-slate-900 pb-2">
                      Segurança da Conta
                    </h4>

                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                        Senha Atual
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-xl text-sm text-white focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                          Nova Senha
                        </label>
                        <input
                          type="password"
                          placeholder="Nova senha"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-xl text-sm text-white focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                          Confirmar Nova
                        </label>
                        <input
                          type="password"
                          placeholder="Confirme"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-xl text-sm text-white focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save settings */}
                <div className="pt-4 border-t border-slate-900 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg font-bold font-mono text-xs uppercase tracking-wider transition-all duration-300"
                  >
                    Salvar Alterações
                  </button>
                </div>

              </form>
            </motion.div>
          )}

          {/* TELA 4 - CONTRIBUA E GANHE */}
          {activeTab === 'contribute' && (
            <motion.div
              key="contribute"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Header Info */}
              <div className="border-b border-slate-900 pb-6">
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#00ff87] uppercase">PROGRAMA DE RECOMPENSAS</span>
                <h2 className="font-display text-2xl font-black text-white mt-1">Ajude a Comunidade e Economize</h2>
                <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                  Escolha uma das opções abaixo para acumular descontos na produção das suas próximas músicas.
                </p>
              </div>

              {/* Reward Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* CARD 1 - DEIXE SEU DEPOIMENTO */}
                <div className="bg-[#111419]/40 border border-slate-900 rounded-2xl p-6 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h3 className="font-display font-bold text-lg text-white">1. Deixe seu Depoimento</h3>
                      <span className="text-[9px] font-mono font-extrabold text-[#00ff87] bg-[#00ff87]/10 px-2 py-0.5 rounded-full border border-[#00ff87]/20 self-start">
                        GANHE R$ 5
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Escreva o que você achou da nossa plataforma e ganhe R$ 5 de desconto na sua próxima guia.
                    </p>

                    <form onSubmit={handleSendTestimonial} className="space-y-4">
                      <textarea
                        value={testimonial}
                        onChange={(e) => setTestimonial(e.target.value)}
                        placeholder="Escreva seu depoimento sincero aqui... (Ex: 'Amei a interpretação acústica de voz e violão, mudou a forma de eu apresentar minhas letras!')"
                        rows={4}
                        disabled={!!testimonialCoupon}
                        className="w-full px-4 py-3 bg-[#14181f]/80 border border-slate-800 focus:border-[#00ff87]/50 rounded-xl text-sm text-white focus:outline-none transition-colors resize-none placeholder-slate-600 disabled:opacity-50"
                      />

                      {!testimonialCoupon ? (
                        <button
                          type="submit"
                          className="w-full py-3.5 px-4 rounded-xl bg-[#00ff87] hover:bg-[#00e076] text-black font-extrabold font-mono text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_4px_15px_rgba(0,255,135,0.1)] active:scale-[0.98] cursor-pointer"
                        >
                          [ Enviar Depoimento e Resgatar Cupom ]
                        </button>
                      ) : (
                        <div className="p-4 bg-[#00ff87]/5 border border-[#00ff87]/15 rounded-xl space-y-3 text-center">
                          <p className="text-xs text-[#00ff87] font-semibold">
                            ✓ Depoimento enviado! Seu cupom está ativo:
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            <span className="font-mono text-lg font-black text-white bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 tracking-wider">
                              {testimonialCoupon}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(testimonialCoupon);
                                showToast('Cupom copiado!');
                              }}
                              className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="Copiar Cupom"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono">
                            Aplique este cupom na sua próxima produção paga para abater R$ 5,00!
                          </p>
                        </div>
                      )}
                    </form>
                  </div>
                </div>

                {/* CARD 2 - INDIQUE UM AMIGO */}
                <div className="bg-[#111419]/40 border border-slate-900 rounded-2xl p-6 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h3 className="font-display font-bold text-lg text-white">2. Indique um Amigo</h3>
                      <span className="text-[9px] font-mono font-extrabold text-[#00ff87] bg-[#00ff87]/10 px-2 py-0.5 rounded-full border border-[#00ff87]/20 self-start">
                        GANHE R$ 15
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-200 text-xs leading-relaxed space-y-1">
                      <span className="font-bold block text-[#00ff87] font-mono text-[10px] uppercase">REGRAS DA INDICAÇÃO:</span>
                      <p>
                        Indique um amigo através do seu link exclusivo. Quando seu amigo se cadastrar e fizer a primeira guia dele PAGA, você recebe um cupom de R$ 15 automaticamente no seu painel.
                      </p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <label className="block text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                        Seu Link de Convite Exclusivo
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          value={`guiainteligente.com/convite/${composerName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '') || 'musico'}123`}
                          className="w-full pl-4 pr-12 py-3 bg-[#14181f] border border-slate-800 focus:outline-none rounded-xl text-xs text-slate-300 font-mono select-all"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const link = `guiainteligente.com/convite/${composerName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '') || 'musico'}123`;
                            navigator.clipboard.writeText(link);
                            showToast('Link de indicação copiado!');
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Copiar Link"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyInviteLink}
                        className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold font-mono text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(16,185,129,0.1)] cursor-pointer"
                      >
                        <span>[ 🟢 Copiar Link e Enviar no WhatsApp ]</span>
                      </button>
                    </div>
                  </div>
                </div>

              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* PIX CONVITE / QR CODE SIMULATOR MODAL */}
      <AnimatePresence>
        {showPixModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#111419] border border-slate-800 rounded-2xl overflow-hidden relative shadow-2xl p-6 md:p-8 space-y-6"
            >
              <button
                onClick={() => setShowPixModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="text-center space-y-2">
                <div className="h-12 w-12 rounded-full bg-[#00ff87]/15 text-[#00ff87] flex items-center justify-center mx-auto border border-[#00ff87]/20">
                  <QrCode className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-extrabold text-white">Limite de Guia Grátis Atingido</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Faça o Pix avulso de <span className="text-[#00ff87] font-bold">R$ 49,90</span> para enviar esta nova música para a linha de produção da curadoria.
                </p>
              </div>

              {/* QR Code Graphic Box */}
              <div className="p-4 bg-white rounded-xl max-w-[200px] mx-auto shadow-inner flex flex-col items-center">
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=00020101021126580014br.gov.bcb.pix0136guia-inteligente-acustica-pix-key999520400005303986540549.905802BR5925Guia Inteligente LTDA6009Sao Paulo62070503***6304D18E" 
                  alt="PIX QR Code" 
                  className="h-36 w-36 object-contain"
                />
                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wide mt-2">QR CODE PIX ATIVO</span>
              </div>

              {/* Copy Key Button */}
              <div className="space-y-3">
                <button
                  onClick={copyPixKey}
                  className={`w-full py-3 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
                    copiedPix
                      ? 'bg-[#00ff87]/10 border-[#00ff87]/40 text-[#00ff87]'
                      : 'bg-[#14181f] border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {copiedPix ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Chave Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copiar Código Pix Copia e Cola</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleSimulatePayment}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#00ff87] hover:bg-[#00e076] text-black font-extrabold font-mono text-xs uppercase tracking-wider transition-all"
                >
                  SIMULAR CONFIRMAÇÃO DE PAGAMENTO ➔
                </button>
              </div>

              {/* Extra visual trust note */}
              <p className="text-[9px] text-center text-slate-500 font-mono flex items-center justify-center gap-1">
                <Smartphone className="h-3.5 w-3.5 text-[#00ff87]" />
                <span>PROCESSAMENTO INSTANTÂNEO • MERCADO PAGO</span>
              </p>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PIX PACOTE COMPOSITOR PRO / QR CODE SIMULATOR MODAL */}
      <AnimatePresence>
        {showPromoPixModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#111419] border border-slate-850 rounded-2xl overflow-hidden relative shadow-2xl p-6 md:p-8 space-y-6"
            >
              <button
                onClick={() => setShowPromoPixModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="text-center space-y-2">
                <div className="h-12 w-12 rounded-full bg-cyan-500/15 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/20">
                  <QrCode className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-extrabold text-white">Adquirir Pacote Compositor Pro</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Escaneie o Pix de <span className="text-cyan-400 font-bold">R$ 170,00</span> para recarregar <span className="text-[#00ff87] font-bold">5 créditos</span> de guia acústica profissional com prioridade total.
                </p>
              </div>

              {/* QR Code Graphic Box */}
              <div className="p-4 bg-white rounded-xl max-w-[200px] mx-auto shadow-inner flex flex-col items-center">
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=00020101021126580014br.gov.bcb.pix0136guia-inteligente-acustica-pix-key999520400005303986540549.170002BR5925Guia Inteligente LTDA6009Sao Paulo62070503***6304E29F" 
                  alt="PIX QR Code PRO" 
                  className="h-36 w-36 object-contain"
                />
                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wide mt-2">QR CODE PIX ATIVO</span>
              </div>

              {/* Copy Key Button */}
              <div className="space-y-3">
                <button
                  onClick={copyPromoPixKey}
                  className={`w-full py-3 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border transition-all ${
                    copiedPromoPix
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                      : 'bg-[#14181f] border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {copiedPromoPix ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Chave Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copiar Código Pix Copia e Cola</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleSimulatePromoPayment}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-[#00ff87] text-black font-black font-mono text-xs uppercase tracking-wider transition-all"
                >
                  SIMULAR CONFIRMAÇÃO DE PAGAMENTO ➔
                </button>
              </div>

              {/* Extra visual trust note */}
              <p className="text-[9px] text-center text-slate-500 font-mono flex items-center justify-center gap-1">
                <Smartphone className="h-3.5 w-3.5 text-[#00ff87]" />
                <span>PROCESSAMENTO INSTANTÂNEO • MERCADO PAGO</span>
              </p>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
