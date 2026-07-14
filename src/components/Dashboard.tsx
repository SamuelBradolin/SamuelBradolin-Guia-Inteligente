import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Music, PlusCircle, Settings, LogOut, Download, 
  Sparkles, Smartphone, CheckCircle, Calendar, Upload, 
  FileText, Mic, Guitar, Info, QrCode, Copy, Check, X,
  Plus, Camera, CreditCard
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { supabase } from '../supabase';
import { CustomAudioPlayer } from './CustomAudioPlayer';

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
  const [userDocId, setUserDocId] = useState<string | null>(null);
  const [isCompositorPro, setIsCompositorPro] = useState(false);
  const [activeDiscount, setActiveDiscount] = useState(0);
  const [supabaseDiscount, setSupabaseDiscount] = useState(0);
  const [withdrawableBalance, setWithdrawableBalance] = useState(0);
  const [paidGuiasCount, setPaidGuiasCount] = useState(0);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [pixKey, setPixKey] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const [globalNotice, setGlobalNotice] = useState<string | null>(null);
  const [privateNotices, setPrivateNotices] = useState<{ id: string; message: string; creditsGifted: number; discountGifted: number; date: string }[]>([]);
  
  interface GamificationRule {
    level_name: 'Bronze' | 'Prata' | 'Ouro';
    min_guias: number;
    max_guias: number;
    bonus_value: number;
    reward_type: 'Saldo de Desconto Interno' | 'Saldo de Saque em Dinheiro';
  }
  const [gamificationRules, setGamificationRules] = useState<GamificationRule[]>([
    { level_name: 'Bronze', min_guias: 0, max_guias: 5, bonus_value: 10.00, reward_type: 'Saldo de Desconto Interno' },
    { level_name: 'Prata', min_guias: 6, max_guias: 14, bonus_value: 5.00, reward_type: 'Saldo de Saque em Dinheiro' },
    { level_name: 'Ouro', min_guias: 15, max_guias: 9999, bonus_value: 10.00, reward_type: 'Saldo de Saque em Dinheiro' }
  ]);

  // Load gamification rules from Supabase and cache in localStorage
  useEffect(() => {
    const fetchRules = async () => {
      // Load from cache first
      const cached = localStorage.getItem('gi_gamification_rules');
      if (cached) {
        try {
          setGamificationRules(JSON.parse(cached));
        } catch (_) {}
      }

      try {
        const { data, error } = await supabase
          .from('gamification_rules')
          .select('*');

        if (!error && data && data.length > 0) {
          const rulesMap: Record<string, any> = {};
          data.forEach((r: any) => {
            rulesMap[r.level_name] = r;
          });

          const loadedRules: GamificationRule[] = [
            {
              level_name: 'Bronze',
              min_guias: rulesMap['Bronze']?.min_guias ?? 0,
              max_guias: rulesMap['Bronze']?.max_guias ?? 5,
              bonus_value: Number(rulesMap['Bronze']?.bonus_value ?? 10.00),
              reward_type: rulesMap['Bronze']?.reward_type ?? 'Saldo de Desconto Interno'
            },
            {
              level_name: 'Prata',
              min_guias: rulesMap['Prata']?.min_guias ?? 6,
              max_guias: rulesMap['Prata']?.max_guias ?? 14,
              bonus_value: Number(rulesMap['Prata']?.bonus_value ?? 5.00),
              reward_type: rulesMap['Prata']?.reward_type ?? 'Saldo de Saque em Dinheiro'
            },
            {
              level_name: 'Ouro',
              min_guias: rulesMap['Ouro']?.min_guias ?? 15,
              max_guias: rulesMap['Ouro']?.max_guias ?? 9999,
              bonus_value: Number(rulesMap['Ouro']?.bonus_value ?? 10.00),
              reward_type: rulesMap['Ouro']?.reward_type ?? 'Saldo de Saque em Dinheiro'
            }
          ];
          setGamificationRules(loadedRules);
          localStorage.setItem('gi_gamification_rules', JSON.stringify(loadedRules));
        }
      } catch (err) {
        console.error("Erro ao carregar regras de gamification:", err);
      }
    };

    fetchRules();
  }, []);

  // Helper to compute user level based on paid guias count
  const getUserLevel = (count: number) => {
    const ruleOuro = gamificationRules.find(r => r.level_name === 'Ouro');
    const rulePrata = gamificationRules.find(r => r.level_name === 'Prata');

    const minOuro = ruleOuro ? ruleOuro.min_guias : 15;
    const minPrata = rulePrata ? rulePrata.min_guias : 6;

    if (count >= minOuro) return { name: 'Ouro' as const, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10', icon: '🏆' };
    if (count >= minPrata) return { name: 'Prata' as const, color: 'text-slate-300 border-slate-400/30 bg-slate-400/10', icon: '🥈' };
    return { name: 'Bronze' as const, color: 'text-amber-700 border-amber-800/30 bg-amber-800/10', icon: '🥉' };
  };

  const level = getUserLevel(paidGuiasCount);

  // Dynamic card content based on level
  const getReferralCardContent = () => {
    const currentRule = gamificationRules.find(r => r.level_name === level.name) || {
      level_name: level.name,
      bonus_value: level.name === 'Ouro' ? 10.00 : level.name === 'Prata' ? 5.00 : 10.00,
      reward_type: level.name === 'Bronze' ? 'Saldo de Desconto Interno' : 'Saldo de Saque em Dinheiro'
    };

    const bonusStr = currentRule.bonus_value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const isCash = currentRule.reward_type === 'Saldo de Saque em Dinheiro';

    if (level.name === 'Ouro') {
      return {
        badge: `GANHE R$ ${bonusStr} EM DINHEIRO`,
        rule: `Parabéns, Membro Elite Ouro! Indique um amigo através do seu link exclusivo. Quando seu amigo se cadastrar e fizer a primeira guia dele PAGA, você recebe R$ ${bonusStr} em dinheiro direto no seu saldo de saques para transferir via PIX quando quiser!`,
        balanceLabel: "SALDO DISPONÍVEL PARA SAQUE (R$)",
        balanceValue: withdrawableBalance,
        isCash: true
      };
    }
    if (level.name === 'Prata') {
      return {
        badge: `GANHE R$ ${bonusStr} EM DINHEIRO`,
        rule: `Indique um amigo através do seu link exclusivo. Quando seu amigo se cadastrar e fizer a primeira guia dele PAGA, você recebe R$ ${bonusStr} em dinheiro direto no seu saldo de saques para transferir via PIX quando quiser!`,
        balanceLabel: "SALDO DISPONÍVEL PARA SAQUE (R$)",
        balanceValue: withdrawableBalance,
        isCash: true
      };
    }
    // Bronze
    return {
      badge: `GANHE R$ ${bonusStr} DE DESCONTO`,
      rule: `Indique um amigo através do seu link exclusivo. Quando seu amigo se cadastrar e fizer a primeira guia dele PAGA, você recebe um cupom de R$ ${bonusStr} de desconto automaticamente no seu painel para usar no site.`,
      balanceLabel: "DESCONTO ACUMULADO ATIVO (R$)",
      balanceValue: supabaseDiscount,
      isCash: false
    };
  };

  const referralContent = getReferralCardContent();

  // Contribute states
  const [testimonial, setTestimonial] = useState('');
  const [testimonialCoupon, setTestimonialCoupon] = useState<string | null>(null);
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  
  // Real guide list synchronized with Firestore
  const [guides, setGuides] = useState<GuideItem[]>([]);

  // Synchronize discount_balance, withdrawable_balance, and paid guias count from Supabase
  useEffect(() => {
    if (!userEmail) return;

    const fetchSupabaseData = async () => {
      try {
        // 1. Fetch user profile (discount_balance and withdrawable_balance)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, discount_balance, withdrawable_balance')
          .eq('email', userEmail)
          .maybeSingle();

        let profileId = '';
        if (!profileError && profileData) {
          profileId = profileData.id;
          setSupabaseDiscount(Number(profileData.discount_balance) || 0);
          setWithdrawableBalance(Number(profileData.withdrawable_balance) || 0);
        }

        // 2. Fetch all paid guias to compute level
        const { data: guiasData, error: guiasError } = await supabase
          .from('guias')
          .select('*')
          .eq('status', 'pago');

        if (!guiasError && guiasData) {
          const userPaidGuias = guiasData.filter((g: any) => 
            g.client_id === profileId || 
            g.id_cliente === profileId || 
            g.email?.toLowerCase() === userEmail.toLowerCase() || 
            g.email_cliente?.toLowerCase() === userEmail.toLowerCase()
          );
          setPaidGuiasCount(userPaidGuias.length);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do Supabase:", err);
      }
    };

    fetchSupabaseData();

    // Set up real-time subscription for changes to this user's profile
    const profileSubscription = supabase
      .channel('profile-discount-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `email=eq.${userEmail}`
        },
        (payload) => {
          if (payload.new) {
            if ('discount_balance' in payload.new) {
              setSupabaseDiscount(Number(payload.new.discount_balance) || 0);
            }
            if ('withdrawable_balance' in payload.new) {
              setWithdrawableBalance(Number(payload.new.withdrawable_balance) || 0);
            }
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for guias changes to recalculate levels
    const guiasSubscription = supabase
      .channel('guias-changes-recalc')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guias'
        },
        () => {
          fetchSupabaseData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileSubscription);
      supabase.removeChannel(guiasSubscription);
    };
  }, [userEmail]);

  // Synchronizer with Firestore database
  useEffect(() => {
    // 1. Sync User Info
    const qUser = query(collection(db, 'usuarios'), where('email', '==', userEmail));
    const unsubscribeUser = onSnapshot(qUser, (snapshot) => {
      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const data = userDoc.data();
        setUserDocId(userDoc.id);
        setComposerName(data.nome || data.name || userEmail.split('@')[0].toUpperCase());
        setCredits(data.credits !== undefined ? data.credits : 1);
        setActiveDiscount(data.activeDiscount || 0);
        setIsCompositorPro(data.role === 'admin' || data.role === 'produtor');
      } else {
        setComposerName(userEmail.split('@')[0].toUpperCase());
      }
    });

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
        status: (c.status === 'Concluído' || c.status === 'Concluída') ? 'Concluída' : (c.status || 'Fila de Espera'),
        genre: c.genre || 'Sertanejo',
        voiceType: c.voiceType || 'Voz Masculina de Estúdio',
        finalAudioUrl: c.audio_final_url || c.audio_final_base64 || c.url_audio_final || c.finalAudioUrl || c.url_audio_entrega
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

    return () => {
      unsubscribeComps();
      unsubscribeUser();
    };
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
  const [showRechargeModal, setShowRechargeModal] = useState(false);
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
      setUploadProgress(10);
      
      let uploadedAudioUrl = '';
      if (selectedFile) {
        try {
          let progress = 10;
          const intervalId = setInterval(() => {
            progress += (95 - progress) * 0.15;
            setUploadProgress(Math.round(progress));
          }, 200);

          const fileExt = selectedFile.name.split('.').pop() || 'mp3';
          const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const filePath = `${userEmail}/${uniqueFileName}`;

          const { data, error } = await supabase.storage
            .from('audios')
            .upload(filePath, selectedFile, {
              cacheControl: '3600',
              upsert: false
            });

          clearInterval(intervalId);

          if (error) {
            throw error;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('audios')
            .getPublicUrl(filePath);

          uploadedAudioUrl = publicUrl;
          setUploadProgress(100);
        } catch (uploadErr) {
          console.error("Error uploading to Supabase:", uploadErr);
          alert("Erro ao realizar o upload do áudio para o Supabase. Por favor, tente novamente.");
          setIsUploading(false);
          setUploadProgress(0);
          return;
        }
      }

      if (!uploadedAudioUrl) {
        alert("Não foi possível processar o áudio. Por favor, tente enviar novamente.");
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }

      try {
        const newCompObj = {
          // Explicitly requested schema fields
          id_cliente: userEmail,
          nome_musica: newTitle,
          status: 'Fila de Espera',
          data: new Date().toLocaleDateString('pt-BR'),
          url_audio: uploadedAudioUrl, // Fallback compatibility
          audio_bruto_base64: '', // No longer using Base64

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
          audioUrl: uploadedAudioUrl,
          createdAt: serverTimestamp()
        };

        await addDoc(collection(db, 'pedidos'), newCompObj);
        setUploadProgress(100);

        // Deduct credits locally and in Firestore
        const newCredits = Math.max(0, credits - 1);
        setCredits(newCredits);

        if (userDocId) {
          const userDocRef = doc(db, 'usuarios', userDocId);
          await updateDoc(userDocRef, {
            credits: newCredits
          });
        }

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
    setUploadProgress(10);
    
    let uploadedAudioUrl = '';
    if (selectedFile) {
      try {
        let progress = 10;
        const intervalId = setInterval(() => {
          progress += (95 - progress) * 0.15;
          setUploadProgress(Math.round(progress));
        }, 200);

        const fileExt = selectedFile.name.split('.').pop() || 'mp3';
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${userEmail}/${uniqueFileName}`;

        const { data, error } = await supabase.storage
          .from('audios')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false
          });

        clearInterval(intervalId);

        if (error) {
          throw error;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('audios')
          .getPublicUrl(filePath);

        uploadedAudioUrl = publicUrl;
        setUploadProgress(100);
      } catch (uploadErr) {
        console.error("Error uploading to Supabase:", uploadErr);
        alert("Erro ao realizar o upload do áudio para o Supabase. Por favor, tente novamente.");
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }
    }

    if (!uploadedAudioUrl) {
      alert("Não foi possível processar o áudio. Por favor, tente enviar novamente.");
      setIsUploading(false);
      setUploadProgress(0);
      return;
    }

    try {
      const newCompObj = {
        // Explicitly requested schema fields
        id_cliente: userEmail,
        nome_musica: newTitle || 'Nova Guia Premium',
        status: 'Fila de Espera',
        data: new Date().toLocaleDateString('pt-BR'),
        url_audio: uploadedAudioUrl, // Fallback compatibility
        audio_bruto_base64: '', // No longer using Base64

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
        audioUrl: uploadedAudioUrl,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'pedidos'), newCompObj);
      setUploadProgress(100);

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

  const handleDownloadAudio = async (title: string, finalAudioUrl?: string) => {
    if (!finalAudioUrl) {
      showToast("Áudio final não disponível.");
      return;
    }

    if (finalAudioUrl.startsWith('http')) {
      try {
        showToast(`Iniciando download em WAV de alta definição: "${title}"`);
        const response = await fetch(finalAudioUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const element = document.createElement('a');
        element.href = blobUrl;
        element.download = `${title.toLowerCase().replace(/\s+/g, '_')}_guia_acustica.wav`;
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        window.URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error("Erro ao baixar áudio do Supabase:", err);
        // Fallback to open in new tab if fetch fails
        window.open(finalAudioUrl, '_blank');
      }
    } else {
      // It's a Base64 string!
      try {
        showToast(`Iniciando download da guia acústica final: "${title}"`);
        let base64Data = finalAudioUrl;
        let contentType = 'audio/mp3';
        
        if (finalAudioUrl.startsWith('data:')) {
          const parts = finalAudioUrl.split(',');
          const mimePart = parts[0].match(/:(.*?);/);
          if (mimePart) contentType = mimePart[1];
          base64Data = parts[1];
        }
        
        const byteCharacters = atob(base64Data);
        const byteArrays = [];
        
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
        
        const blob = new Blob(byteArrays, { type: contentType });
        const blobUrl = URL.createObjectURL(blob);
        
        const element = document.createElement('a');
        element.setAttribute('href', blobUrl);
        element.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}_guia_acustica.mp3`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error("Error downloading final guide Base64:", err);
        // Fallback
        const src = finalAudioUrl.startsWith('data:') ? finalAudioUrl : 'data:audio/mp3;base64,' + finalAudioUrl;
        const element = document.createElement('a');
        element.setAttribute('href', src);
        element.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}_guia_acustica.mp3`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      }
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
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/convite/${composerName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '') || 'musico'}123`;
    navigator.clipboard.writeText(link);
    setCopiedInviteLink(true);
    showToast('Link de indicação copiado com sucesso!');
    setTimeout(() => setCopiedInviteLink(false), 3000);
    
    // Open WhatsApp URL with custom message
    const message = encodeURIComponent(`Olha que sensacional essa plataforma que faz Guia de Voz e Violão Profissional! Eles dão a primeira guia grátis para você testar. Cadastre-se pelo meu link de convite: ${link}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleRequestWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pixKey.trim()) {
      showToast("Por favor, informe a chave PIX.");
      return;
    }
    const amountNum = Number(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showToast("Por favor, insira um valor de saque válido.");
      return;
    }
    if (amountNum > withdrawableBalance) {
      showToast(`Saldo insuficiente. Seu saldo disponível é R$ ${withdrawableBalance.toFixed(2)}.`);
      return;
    }

    setIsSubmittingWithdraw(true);
    try {
      // 1. Get profile ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', userEmail)
        .maybeSingle();

      if (!profile) {
        throw new Error("Perfil não encontrado no Supabase.");
      }

      // 2. Insert withdrawal request
      const { error: insertError } = await supabase
        .from('withdraw_requests')
        .insert({
          user_id: profile.id,
          amount: amountNum,
          pix_key: pixKey,
          status: 'pendente'
        });

      if (insertError) throw insertError;

      // 3. Subtract from profiles table balance
      const newWithdrawable = Math.max(0, withdrawableBalance - amountNum);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ withdrawable_balance: newWithdrawable })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setWithdrawableBalance(newWithdrawable);
      setShowWithdrawModal(false);
      setPixKey('');
      setWithdrawAmount('');
      showToast("✓ Solicitação de saque PIX enviada com sucesso!");
    } catch (err: any) {
      console.error("Erro ao solicitar saque:", err);
      showToast("Erro ao solicitar o saque via PIX. Tente novamente.");
    } finally {
      setIsSubmittingWithdraw(false);
    }
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

            {/* Level Badge */}
            <div className={`w-full py-1.5 px-3 rounded-lg border flex items-center justify-center gap-1.5 text-[9px] font-mono font-extrabold uppercase tracking-widest ${level.color}`}>
              <span className="text-xs">{level.icon}</span>
              <span>Nível: {level.name}</span>
            </div>

            {/* Glowing credits counter */}
            <div className="w-full mt-2 py-2 px-3 rounded-lg bg-[#00ff87]/5 border border-[#00ff87]/15 text-[#00ff87] flex items-center justify-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span className="text-[11px] font-mono font-bold">
                Saldo: {credits} {credits === 1 ? 'Guia' : 'Guias'} {isCompositorPro && '⚡'}
              </span>
            </div>

            {/* Recharge button */}
            <button
              onClick={() => setShowRechargeModal(true)}
              className="w-full mt-2.5 py-2.5 px-3 rounded-lg bg-gradient-to-r from-[#00ff87] to-[#00e076] hover:from-[#00ff87]/90 hover:to-[#00e076]/90 text-black font-extrabold font-mono text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_4px_15px_rgba(0,255,135,0.15)] hover:shadow-[0_4px_20px_rgba(0,255,135,0.35)] cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
            >
              <CreditCard className="h-4 w-4" />
              <span>Recarregar Conta</span>
            </button>
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
              onClick={() => {
                if (credits <= 0) {
                  alert("Você não possui saldo de guias disponível para enviar uma nova composição. Por favor, adicione mais créditos.");
                  setShowPixModal(true);
                } else {
                  setActiveTab('new');
                }
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-mono text-xs font-bold tracking-wider uppercase transition-all border ${
                credits <= 0 ? 'opacity-60 cursor-not-allowed hover:bg-slate-900/20' : ''
              } ${
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
                              <div className="flex flex-col items-end gap-2.5">
                                <button
                                  onClick={() => handleDownloadAudio(item.title, item.finalAudioUrl)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00ff87] hover:bg-[#00e076] text-black rounded-lg font-bold font-mono text-[10px] uppercase tracking-wider transition-all duration-300 shadow-[0_0_15px_rgba(0,255,135,0.1)] hover:shadow-[0_0_20px_rgba(0,255,135,0.25)]"
                                >
                                  <Download className="h-3 w-3" />
                                  <span>Baixar WAV</span>
                                </button>
                                {item.finalAudioUrl && (
                                  <div className="mt-1 w-full flex justify-end">
                                    <CustomAudioPlayer src={item.finalAudioUrl} />
                                  </div>
                                )}
                              </div>
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
                      <div className="text-cyan-400 font-bold animate-pulse">📤 Processando e enviando áudio para o Firestore... {uploadProgress}%</div>
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
              <div className="border-b border-slate-900 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-[#00ff87] uppercase">PROGRAMA DE RECOMPENSAS</span>
                  <h2 className="font-display text-2xl font-black text-white mt-1">Ajude a Comunidade e Economize</h2>
                  <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                    Escolha uma das opções abaixo para acumular descontos na produção das suas próximas músicas.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start md:self-center">
                  <div className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 font-mono font-extrabold text-xs uppercase tracking-wider ${level.color} shadow-lg`}>
                    <span className="text-lg">{level.icon}</span>
                    <span>Nível {level.name}</span>
                  </div>
                </div>
              </div>

              {/* Gamification Level & Progression Rules Header */}
              <div className="bg-[#111419]/30 border border-slate-900 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="space-y-1 text-center md:text-left border-b md:border-b-0 md:border-r border-slate-900/60 pb-4 md:pb-0 md:pr-6">
                  <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest block">SEU STATUS DE GAMIFICAÇÃO</span>
                  <div className="flex flex-col items-center md:items-start">
                    <span className="text-3xl font-black font-display text-white mt-1 flex items-center gap-2">
                      {level.icon} {level.name}
                    </span>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      Você possui <strong className="text-[#00ff87]">{paidGuiasCount}</strong> {paidGuiasCount === 1 ? 'guia paga' : 'guias pagas'} no histórico.
                    </p>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-3">
                  <span className="text-[9px] font-mono font-bold text-[#00ff87] uppercase tracking-widest block text-center md:text-left">TABELA DE CRITÉRIOS DE PROGRESSÃO</span>
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                    <div className={`p-2.5 rounded-xl border ${paidGuiasCount < 6 ? 'bg-amber-800/10 border-amber-800/30 text-amber-500 font-extrabold' : 'bg-slate-950/40 border-slate-900/50 text-slate-500'}`}>
                      <div className="text-xs">🥉 Bronze</div>
                      <div className="text-[9px] text-slate-400 mt-1">0 - 5 guias</div>
                      <div className="text-[8px] text-slate-500 font-bold mt-0.5">Indica: +R$ 10 Desconto</div>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${paidGuiasCount >= 6 && paidGuiasCount <= 14 ? 'bg-slate-400/10 border-slate-400/30 text-slate-300 font-extrabold' : 'bg-slate-950/40 border-slate-900/50 text-slate-500'}`}>
                      <div className="text-xs">🥈 Prata</div>
                      <div className="text-[9px] text-slate-400 mt-1">6 - 14 guias</div>
                      <div className="text-[8px] text-slate-500 font-bold mt-0.5">Indica: +R$ 5 Saque PIX</div>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${paidGuiasCount >= 15 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-extrabold' : 'bg-slate-950/40 border-slate-900/50 text-slate-500'}`}>
                      <div className="text-xs">🏆 Ouro</div>
                      <div className="text-[9px] text-slate-400 mt-1">15+ guias</div>
                      <div className="text-[8px] text-slate-500 font-bold mt-0.5">Indica: +R$ 10 Saque PIX</div>
                    </div>
                  </div>
                </div>
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
                        {referralContent.badge}
                      </span>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-amber-200 text-xs leading-relaxed space-y-1">
                      <span className="font-bold block text-[#00ff87] font-mono text-[10px] uppercase">REGRAS DA INDICAÇÃO:</span>
                      <p>
                        {referralContent.rule}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#00ff87] font-bold block">
                          {referralContent.balanceLabel}
                        </span>
                        <span className="text-2xl font-black font-display text-white">
                          R$ {referralContent.balanceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-[#00ff87]/10 flex items-center justify-center text-[#00ff87] font-bold font-mono text-xs">
                        R$
                      </div>
                    </div>

                    {referralContent.isCash && (
                      <button
                        type="button"
                        onClick={() => {
                          if (withdrawableBalance <= 0) {
                            showToast("Seu saldo de saque está zerado!");
                            return;
                          }
                          setWithdrawAmount(withdrawableBalance.toString());
                          setShowWithdrawModal(true);
                        }}
                        disabled={withdrawableBalance <= 0}
                        className={`w-full py-3 px-4 rounded-xl font-mono text-[10px] font-bold uppercase tracking-wider transition-all duration-300 text-center flex items-center justify-center gap-2 ${
                          withdrawableBalance > 0
                            ? 'bg-[#00ff87] hover:bg-[#00e076] text-black shadow-[0_4px_15px_rgba(0,255,135,0.15)] active:scale-[0.98] cursor-pointer'
                            : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <span>[ SOLICITAR SAQUE VIA PIX ]</span>
                      </button>
                    )}

                    <div className="space-y-3 pt-2">
                      <label className="block text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                        Seu Link de Convite Exclusivo
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/convite/${composerName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '') || 'musico'}123`}
                          className="w-full pl-4 pr-12 py-3 bg-[#14181f] border border-slate-800 focus:outline-none rounded-xl text-xs text-slate-300 font-mono select-all"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const link = `${window.location.origin}/convite/${composerName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '') || 'musico'}123`;
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

                {/* DYNAMIC CARD: SALDO DISPONÍVEL PARA SAQUE (ONLY FOR PRATA OR OURO) */}
                {paidGuiasCount >= 6 && (
                  <div className="md:col-span-2 bg-gradient-to-br from-[#111419]/90 to-[#07090c]/90 border-2 border-[#00ff87]/30 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-2xl mt-4">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ff87]/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                    <div className="space-y-3 flex-1 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <span className="text-sm">💸</span>
                        <span className="text-[10px] font-mono font-bold tracking-widest text-[#00ff87] uppercase">SAQUE VIA PIX ATIVO</span>
                      </div>
                      <h3 className="font-display font-black text-xl text-white">Resgate seu saldo em dinheiro real</h3>
                      <p className="text-xs text-slate-400 max-w-lg leading-relaxed">
                        Como membro do nível <strong className="text-[#00ff87] uppercase">{level.name} {level.icon}</strong>, suas indicações agora geram comissões em dinheiro direto na sua conta bancária via PIX.
                      </p>
                      
                      {/* Balance Display */}
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-950/80 border border-slate-900 rounded-xl mt-1">
                        <span className="text-[10px] font-mono text-slate-500 uppercase">Saldo para Saque:</span>
                        <span className="text-base font-mono font-extrabold text-[#00ff87]">
                          R$ {withdrawableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => {
                          if (withdrawableBalance <= 0) {
                            showToast("Seu saldo de saque está zerado!");
                            return;
                          }
                          setWithdrawAmount(withdrawableBalance.toString());
                          setShowWithdrawModal(true);
                        }}
                        disabled={withdrawableBalance <= 0}
                        className={`w-full sm:w-auto px-6 py-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all duration-300 text-center flex items-center justify-center gap-2 ${
                          withdrawableBalance > 0
                            ? 'bg-[#00ff87] hover:bg-[#00e076] text-black shadow-[0_4px_15px_rgba(0,255,135,0.15)] active:scale-[0.98] cursor-pointer'
                            : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <span>[ SOLICITAR SAQUE VIA PIX ]</span>
                      </button>
                    </div>
                  </div>
                )}

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

      {/* SELEÇÃO DE PLANOS / RECARREGAR CONTA MODAL */}
      <AnimatePresence>
        {showRechargeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#111419] border border-slate-850 rounded-2xl overflow-hidden relative shadow-2xl p-6 md:p-8 space-y-6 animate-none"
            >
              <button
                onClick={() => setShowRechargeModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="text-center space-y-2">
                <div className="h-12 w-12 rounded-full bg-[#00ff87]/15 text-[#00ff87] flex items-center justify-center mx-auto border border-[#00ff87]/20">
                  <CreditCard className="h-6 w-6 animate-pulse" />
                </div>
                <h3 className="font-display text-lg font-extrabold text-white">Recarregar Créditos de Guia</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Adquira créditos adicionais para registrar suas composições na plataforma com curadoria profissional de voz e violão.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#00ff87]/5 border border-[#00ff87]/15 text-center text-xs font-mono text-slate-300">
                Selecione seu plano: 1 Guia Avulsa por R$ 49,90 ou Combo Promocional (Pague 4, Leve 5) por R$ 170,00.
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRechargeModal(false);
                    setShowPixModal(true);
                  }}
                  className="w-full p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition-all duration-300 flex items-center justify-between group cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white group-hover:text-[#00ff87] transition-colors">1 Guia Avulsa</p>
                    <p className="text-[10px] text-slate-500 font-mono">Para testar um único arranjo</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-white font-mono">R$ 49,90</p>
                    <p className="text-[9px] font-mono text-[#00ff87] font-bold">SOLICITAR AVULSO ➔</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowRechargeModal(false);
                    setShowPromoPixModal(true);
                  }}
                  className="w-full p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-[#00ff87]/30 hover:border-[#00ff87]/60 text-left transition-all duration-300 flex items-center justify-between group cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-10 bg-[#00ff87] text-black font-mono font-extrabold text-[8px] px-2 py-0.5 rounded-b uppercase tracking-wider">
                    Melhor Custo
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white group-hover:text-[#00ff87] transition-colors">Combo Promocional</p>
                    <p className="text-[10px] text-slate-400 font-mono">Pague 4, Leve 5 Guias</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-[#00ff87] font-mono">R$ 170,00</p>
                    <p className="text-[9px] font-mono text-cyan-400 font-bold">SOLICITAR COMBO ➔</p>
                  </div>
                </button>
              </div>

              {/* Extra visual trust note */}
              <p className="text-[9px] text-center text-slate-500 font-mono flex items-center justify-center gap-1 pt-2">
                <Smartphone className="h-3.5 w-3.5 text-[#00ff87]" />
                <span>MERCADO PAGO • CRÉDITOS LIBERADOS EM SEGUNDOS</span>
              </p>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SOLICITAR SAQUE VIA PIX MODAL */}
      <AnimatePresence>
        {showWithdrawModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#111419] border border-slate-850 rounded-2xl overflow-hidden relative shadow-2xl p-6 md:p-8 space-y-6 animate-none"
            >
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer"
                title="Fechar"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="text-center space-y-2">
                <div className="h-12 w-12 rounded-full bg-[#00ff87]/15 text-[#00ff87] flex items-center justify-center mx-auto border border-[#00ff87]/20">
                  <span className="text-xl">💸</span>
                </div>
                <h3 className="font-display text-lg font-extrabold text-white">Solicitar Saque via PIX</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Resgate seu saldo em dinheiro diretamente para sua conta bancária cadastrada pelo PIX.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-900 text-center space-y-1">
                <span className="text-[9px] font-mono text-slate-500 uppercase block">Saldo Disponível para Resgate</span>
                <span className="text-xl font-mono font-extrabold text-[#00ff87]">
                  R$ {withdrawableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <form onSubmit={handleRequestWithdraw} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                    Valor do Saque (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={withdrawableBalance}
                    required
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Ex: 50.00"
                    className="w-full px-4 py-3 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-xl text-sm text-white font-mono focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                    Sua Chave PIX
                  </label>
                  <input
                    type="text"
                    required
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="CPF, E-mail, Telefone ou Chave Aleatória"
                    className="w-full px-4 py-3 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-xl text-sm text-white focus:outline-none transition-colors"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingWithdraw || withdrawableBalance <= 0}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00ff87] to-[#00e076] hover:from-[#00ff87]/90 hover:to-[#00e076]/90 disabled:from-slate-800 disabled:to-slate-800 text-black disabled:text-slate-500 font-extrabold font-mono text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_4px_15px_rgba(0,255,135,0.1)] flex items-center justify-center gap-2 cursor-pointer animate-none"
                  >
                    {isSubmittingWithdraw ? (
                      <span>Enviando solicitação...</span>
                    ) : (
                      <span>[ ENVIAR SOLICITAÇÃO DE SAQUE ]</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
