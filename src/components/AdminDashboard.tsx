import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Music, Users, MessageSquare, Megaphone, Gift, Sliders, 
  X, Upload, Download, Search, Sparkles, Plus, Trash2, 
  CheckCircle, Eye, Volume2, Copy, Play, Pause, DollarSign,
  Briefcase, Send, Layers, Award, Radio, TrendingUp, CreditCard, Landmark
} from 'lucide-react';
import { db } from '../firebase';
import { supabase } from '../supabase';
import { convertAudioToMp3 } from '../utils/audioConverter';
import { CustomAudioPlayer } from './CustomAudioPlayer';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp, 
  setDoc,
  getDoc
} from 'firebase/firestore';

interface AdminDashboardProps {
  onLogout: () => void;
  onSwitchToClient: () => void;
}

interface CompositionItem {
  id: string;
  composerName: string;
  composerEmail: string;
  isCompositorPro: boolean;
  title: string;
  genre: string;
  voiceType: string;
  lyrics: string;
  directionDetails?: string;
  partners?: string;
  audioName?: string;
  audioUrl?: string;
  audio_bruto_base64?: string;
  audio_final_base64?: string;
  status: string;
  date: string;
  finalAudioUrl?: string;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  credits: number;
  activeDiscount: number;
  isCompositorPro: boolean;
}

interface TestimonialItem {
  id: string;
  composerName: string;
  composerEmail: string;
  text: string;
  status: 'Aguardando Aprovação' | 'Aprovado' | 'Rejeitado';
  sendToHome: boolean;
  date: string;
}

interface PromoAction {
  id: string;
  title: string;
  description: string;
  bonusValue: number;
  status: 'Ativo' | 'Inativo';
}

interface HomeDemoTrack {
  id: string;
  title: string;
  genre: string;
  originalText: string;
  curatedText: string;
  originalAudioName?: string;
  curatedAudioName?: string;
}

export default function AdminDashboard({ onLogout, onSwitchToClient }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'production' | 'clients' | 'testimonials' | 'crm' | 'contribute' | 'home_adjusts' | 'finances'>('production');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // States for interactive actions
  const [compositions, setCompositions] = useState<CompositionItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);
  const [promoActions, setPromoActions] = useState<PromoAction[]>([]);
  const [homeDemos, setHomeDemos] = useState<HomeDemoTrack[]>([]);
  const [transactions, setTransactions] = useState<{ id: string; dateTime: string; clientName: string; clientEmail: string; type: string; amountPaid: number; discountApplied: number }[]>([]);

  // CRM States
  const [generalAnnouncement, setGeneralAnnouncement] = useState('');
  const [privateEmail, setPrivateEmail] = useState('');
  const [privateMessage, setPrivateMessage] = useState('');
  const [privateCredits, setPrivateCredits] = useState(0);
  const [privateDiscount, setPrivateDiscount] = useState(0);

  // Pricing Card States
  const [offerTag, setOfferTag] = useState('OFERTA DE LANÇAMENTO');
  const [offerTitle, setOfferTitle] = useState('Produção de Guia Acústica Exclusiva');
  const [offerPrice, setOfferPrice] = useState('49,90');
  const [offerSub, setOfferSub] = useState('Sua primeira música é por nossa conta. Pague R$ 49,90 apenas quando quiser enviar novos projetos.');
  const [offerBenefit1, setOfferBenefit1] = useState('Primeira composição 100% gratuita (Crédito imediato no painel).');
  const [offerBenefit2, setOfferBenefit2] = useState('Preservação matemática e exata da sua melodia original.');
  const [offerBenefit3, setOfferBenefit3] = useState('Curadoria e tratamento acústico humano (sem chiados ou robótica).');
  const [offerBenefit4, setOfferBenefit4] = useState('Direitos autorais e comerciais 100% seus. Você é totalmente dono da obra e do áudio gerado. Use a guia livremente para postar, registrar ou divulgar onde quiser.');
  const [offerBtnText, setOfferBtnText] = useState('[ CRIAR MINHA CONTA E GANHAR 1 GUIA GRÁTIS ]');

  // New Bonus Action form state
  const [showAddAction, setShowAddAction] = useState(false);
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionDesc, setNewActionDesc] = useState('');
  const [newActionBonus, setNewActionBonus] = useState(10);

  // Home Demo form state
  const [showAddDemo, setShowAddDemo] = useState(false);
  const [newDemoTitle, setNewDemoTitle] = useState('');
  const [newDemoGenre, setNewDemoGenre] = useState('');
  const [newDemoOriginal, setNewDemoOriginal] = useState('');
  const [newDemoCurated, setNewDemoCurated] = useState('');
  const [uploadedOriginalFile, setUploadedOriginalFile] = useState<string | null>(null);
  const [uploadedCuratedFile, setUploadedCuratedFile] = useState<string | null>(null);

  // Production Detail Modal State
  const [selectedComp, setSelectedComp] = useState<CompositionItem | null>(null);
  const [uploadedDeliverFile, setUploadedDeliverFile] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deliverFileObj, setDeliverFileObj] = useState<File | null>(null);

  // Toast helper
  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Load and Initialize real databases synced through Firestore
  useEffect(() => {
    // 1. Sync Compositions from 'pedidos'
    const qComps = query(collection(db, 'pedidos'));
    const unsubComps = onSnapshot(qComps, (snapshot) => {
      const list: CompositionItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          composerName: data.composerName || 'Sem Nome',
          composerEmail: data.id_cliente || data.composerEmail || '',
          isCompositorPro: !!data.isCompositorPro,
          title: data.nome_musica || data.title || 'Sem Título',
          genre: data.genre || 'Geral',
          voiceType: data.voiceType || 'Voz Masculina de Estúdio',
          lyrics: data.lyrics || '',
          directionDetails: data.directionDetails || '',
          partners: data.partners || '',
          audioName: data.audioName || '',
          audioUrl: data.audio_bruto_base64 || data.url_audio || data.audioUrl || '',
          audio_bruto_base64: data.audio_bruto_base64 || '',
          audio_final_base64: data.audio_final_base64 || '',
          status: data.status || 'Fila de Espera',
          date: data.data || data.date || '',
          finalAudioUrl: data.audio_final_url || data.audio_final_base64 || data.url_audio_final || data.finalAudioUrl || ''
        });
      });
      setCompositions(list);
    }, (error) => {
      console.error("Error fetching compositions:", error);
    });

    // 2. Sync Transactions
    const qTx = query(collection(db, 'transacoes'));
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          dateTime: data.dateTime || '',
          clientName: data.clientName || '',
          clientEmail: data.clientEmail || '',
          type: data.type || 'Guia Avulsa',
          amountPaid: Number(data.amountPaid) || 0,
          discountApplied: Number(data.discountApplied) || 0
        });
      });
      setTransactions(list);
    }, (error) => {
      console.error("Error fetching transactions:", error);
    });

    // 3. Sync Pricing Offer CMS Doc
    const unsubOffer = onSnapshot(doc(db, 'configuracoes', 'home_offer'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setOfferTag(data.tag || 'OFERTA DE LANÇAMENTO');
        setOfferTitle(data.title || 'Produção de Guia Acústica Exclusiva');
        setOfferPrice(data.price || '49,90');
        setOfferSub(data.sub || 'Sua primeira música é por nossa conta. Pague R$ 49,90 apenas quando quiser enviar novos projetos.');
        setOfferBenefit1(data.benefits?.[0] || 'Primeira composição 100% gratuita (Crédito imediato no painel).');
        setOfferBenefit2(data.benefits?.[1] || 'Preservação matemática e exata da sua melodia original.');
        setOfferBenefit3(data.benefits?.[2] || 'Curadoria e tratamento acústico humano (sem chiados ou robótica).');
        setOfferBenefit4(data.benefits?.[3] || 'Direitos autorais e comerciais 100% seus. Você é totalmente dono da obra e do áudio gerado. Use a guia livremente para postar, registrar ou divulgar onde quiser.');
        setOfferBtnText(data.btnText || '[ CRIAR MINHA CONTA E GANHAR 1 GUIA GRÁTIS ]');
      }
    });

    // 4. Sync Home Demos CMS Doc
    const unsubDemos = onSnapshot(doc(db, 'configuracoes', 'home_demos'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && Array.isArray(data.tracks)) {
          setHomeDemos(data.tracks);
        }
      }
    });

    // 5. Sync Users from localStorage (as auth/users list fallback)
    const cachedUsers = localStorage.getItem('gi_users');
    if (cachedUsers) {
      setUsers(JSON.parse(cachedUsers));
    } else {
      const initialUsers: UserItem[] = [
        { id: 'usr-1', name: 'Roberto Santos', email: 'roberto@email.com', credits: 5, activeDiscount: 5, isCompositorPro: true },
        { id: 'usr-2', name: 'Bruno Lima', email: 'bruno@email.com', credits: 1, activeDiscount: 15, isCompositorPro: true },
        { id: 'usr-3', name: 'Amanda Costa', email: 'amanda@email.com', credits: 0, activeDiscount: 0, isCompositorPro: false },
        { id: 'usr-4', name: 'Bradokim Santos', email: 'bradokimk@gmail.com', credits: 1, activeDiscount: 0, isCompositorPro: false }
      ];
      localStorage.setItem('gi_users', JSON.stringify(initialUsers));
      setUsers(initialUsers);
    }

    // 6. Sync Testimonials
    const cachedTestimonials = localStorage.getItem('gi_testimonials');
    if (cachedTestimonials) {
      setTestimonials(JSON.parse(cachedTestimonials));
    } else {
      const initialTestimonials = [
        {
          id: 'test-1',
          composerName: 'Roberto Santos',
          composerEmail: 'roberto@email.com',
          text: 'Amei a interpretação acústica de voz e violão, mudou a forma de eu apresentar minhas letras! Os produtores de Goiânia adoraram a clareza da gravação.',
          status: 'Aguardando Aprovação' as const,
          sendToHome: false,
          date: '11/07/2026'
        },
        {
          id: 'test-2',
          composerName: 'Amanda Costa',
          composerEmail: 'amanda@email.com',
          text: 'A voz masculina combinou perfeitamente com a melodia do meu sertanejo de sofrência. Recomendo muito a Guia Inteligente para todo compositor independente!',
          status: 'Aprovado' as const,
          sendToHome: true,
          date: '08/07/2026'
        }
      ];
      localStorage.setItem('gi_testimonials', JSON.stringify(initialTestimonials));
      setTestimonials(initialTestimonials);
    }

    // 7. Sync Bonus actions
    const cachedPromoActions = localStorage.getItem('gi_promo_actions');
    if (cachedPromoActions) {
      setPromoActions(JSON.parse(cachedPromoActions));
    }

    return () => {
      unsubComps();
      unsubTx();
      unsubOffer();
      unsubDemos();
    };
  }, []);

  // Update states helper that also updates localStorage
  const saveCompositionsToDB = (newComps: CompositionItem[]) => {
    setCompositions(newComps);
    localStorage.setItem('gi_compositions', JSON.stringify(newComps));
    // Also sync standard client dashboard array if any user is logged in
    // This maintains complete real-time consistency
  };

  const saveUsersToDB = (newUsers: UserItem[]) => {
    setUsers(newUsers);
    localStorage.setItem('gi_users', JSON.stringify(newUsers));
  };

  const saveTestimonialsToDB = (newTestimonials: TestimonialItem[]) => {
    setTestimonials(newTestimonials);
    localStorage.setItem('gi_testimonials', JSON.stringify(newTestimonials));
  };

  const savePromoActionsToDB = (newActions: PromoAction[]) => {
    setPromoActions(newActions);
    localStorage.setItem('gi_promo_actions', JSON.stringify(newActions));
  };

  const saveHomeDemosToDB = (newDemos: HomeDemoTrack[]) => {
    setHomeDemos(newDemos);
    localStorage.setItem('gi_home_demos', JSON.stringify(newDemos));
  };

  const convertFileToBase64 = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const downloadBase64File = async (base64OrUrl: string, fileName: string) => {
    if (!base64OrUrl) {
      showToast("Áudio não disponível para download.");
      return;
    }
    try {
      let finalName = fileName || 'audio_composição.mp3';
      if (!finalName.toLowerCase().endsWith('.mp3')) {
        const lastDot = finalName.lastIndexOf('.');
        if (lastDot !== -1) {
          finalName = finalName.substring(0, lastDot) + '.mp3';
        } else {
          finalName = finalName + '.mp3';
        }
      }

      if (base64OrUrl.startsWith('http://') || base64OrUrl.startsWith('https://')) {
        showToast(`Iniciando download do áudio: ${finalName}`);
        const response = await fetch(base64OrUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = finalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        return;
      }

      let base64Data = base64OrUrl;
      let contentType = 'audio/mp3';
      
      if (base64OrUrl.startsWith('data:')) {
        const parts = base64OrUrl.split(',');
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
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = finalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      showToast(`Iniciando download do áudio: ${finalName}`);
    } catch (err) {
      console.error("Error downloading file via blob conversion:", err);
      showToast("Erro ao processar download do arquivo.");
    }
  };

  // ACTION 1: Deliver Concluded Guide
  const handleDeliverGuide = async (compId: string) => {
    if (!deliverFileObj) {
      showToast('Por favor, faça upload ou selecione o arquivo WAV da guia concluída!');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(10);

      let progress = 10;
      const intervalId = setInterval(() => {
        progress += (95 - progress) * 0.15;
        setUploadProgress(Math.round(progress));
      }, 200);

      const fileExt = deliverFileObj.name.split('.').pop() || 'wav';
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `final_guides/${uniqueFileName}`;

      const { data, error } = await supabase.storage
        .from('audios')
        .upload(filePath, deliverFileObj, {
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

      const finalUrl = publicUrl;
      setUploadProgress(100);

      // Update the document in Firestore
      const docRef = doc(db, 'pedidos', compId);
      await updateDoc(docRef, {
        status: 'Concluído',
        audio_final_url: finalUrl,
        url_audio_final: finalUrl, // Compat field
        finalAudioUrl: finalUrl // Compat field
      });

      showToast(`Guia entregue com sucesso! Status atualizado para Concluído.`);
      setUploadedDeliverFile(null);
      setDeliverFileObj(null);
      setSelectedComp(null);
    } catch (err) {
      console.error("Error delivering final guide to Supabase/Firestore:", err);
      alert("Erro ao enviar a guia finalizada. Por favor, tente novamente.");
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  // ACTION 2: Present Top User
  const handleGiftUser = (userEmail: string, userName: string) => {
    const updatedUsers = users.map(u => {
      if (u.email === userEmail) {
        return {
          ...u,
          credits: u.credits + 1
        };
      }
      return u;
    });

    saveUsersToDB(updatedUsers);
    showToast(`Parabéns! 1 Crédito de Guia de Presente foi enviado com sucesso para ${userName} (${userEmail})!`);
  };

  // ACTION 3: Approve Testimonial (Gives R$ 10 discount to client profile)
  const handleApproveTestimonial = (testId: string, composerEmail: string, composerName: string) => {
    const updatedTestimonials = testimonials.map(t => {
      if (t.id === testId) {
        return { ...t, status: 'Aprovado' as const };
      }
      return t;
    });
    saveTestimonialsToDB(updatedTestimonials);

    // Release R$ 10 discount to client profile
    const updatedUsers = users.map(u => {
      if (u.email === composerEmail) {
        return { ...u, activeDiscount: u.activeDiscount + 10 };
      }
      return u;
    });
    saveUsersToDB(updatedUsers);

    showToast(`Depoimento de ${composerName} aprovado! Bônus de R$ 10,00 de desconto creditado no perfil do cliente.`);
  };

  // ACTION 4: Send Testimonial to Home Page carousel
  const handleToggleSendToHome = (testId: string) => {
    const updatedTestimonials = testimonials.map(t => {
      if (t.id === testId) {
        const nextVal = !t.sendToHome;
        showToast(nextVal ? 'Depoimento destacado! Ele aparecerá no carrossel da Página Inicial.' : 'Depoimento removido da Página Inicial.');
        return { ...t, sendToHome: nextVal };
      }
      return t;
    });
    saveTestimonialsToDB(updatedTestimonials);
  };

  // ACTION 5: Disparar Notificação Geral (Global Announcement)
  const handleBroadcastAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalAnnouncement.trim()) {
      showToast('Escreva alguma mensagem antes de disparar o comunicado geral!');
      return;
    }
    localStorage.setItem('gi_global_notification', generalAnnouncement);
    showToast('📢 Notificação Geral disparada com sucesso! Todos os clientes verão este aviso no topo de seus painéis.');
  };

  const handleClearBroadcast = () => {
    setGeneralAnnouncement('');
    localStorage.removeItem('gi_global_notification');
    showToast('📢 Comunicado geral removido!');
  };

  // ACTION 6: Enviar Notificação Individual + Presente (CRM block B)
  const handleSendIndividualCRM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!privateEmail) {
      showToast('Selecione ou insira o e-mail do cliente!');
      return;
    }

    // Update credits and/or discount for the selected user
    let found = false;
    const updatedUsers = users.map(u => {
      if (u.email === privateEmail) {
        found = true;
        return {
          ...u,
          credits: u.credits + Number(privateCredits || 0),
          activeDiscount: u.activeDiscount + Number(privateDiscount || 0)
        };
      }
      return u;
    });

    if (!found) {
      showToast('E-mail do cliente não encontrado na base cadastrada!');
      return;
    }

    saveUsersToDB(updatedUsers);

    // Save individual message notification in simulated database
    const privates = JSON.parse(localStorage.getItem('gi_private_notifications') || '[]');
    privates.push({
      id: `p-${Date.now()}`,
      email: privateEmail,
      message: privateMessage,
      creditsGifted: privateCredits,
      discountGifted: privateDiscount,
      date: '11/07/2026'
    });
    localStorage.setItem('gi_private_notifications', JSON.stringify(privates));

    showToast(`✉️ Mensagem enviada para ${privateEmail}! Presente creditado (+${privateCredits} créditos, +R$ ${privateDiscount} desconto).`);
    
    // Clear fields
    setPrivateMessage('');
    setPrivateCredits(0);
    setPrivateDiscount(0);
  };

  // ACTION 7: Criar Nova Ação de Bonificação (Contribute actions)
  const handleCreatePromoAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionTitle || !newActionDesc) {
      showToast('Preencha todos os campos da nova ação!');
      return;
    }

    const newAction: PromoAction = {
      id: `pact-${Date.now()}`,
      title: newActionTitle,
      description: newActionDesc,
      bonusValue: Number(newActionBonus || 0),
      status: 'Ativo'
    };

    savePromoActionsToDB([...promoActions, newAction]);
    showToast(`Ação de marketing "${newActionTitle}" criada com sucesso!`);
    
    // reset form
    setNewActionTitle('');
    setNewActionDesc('');
    setNewActionBonus(10);
    setShowAddAction(false);
  };

  const handleToggleActionStatus = (actionId: string) => {
    const updated = promoActions.map(a => {
      if (a.id === actionId) {
        const nextStatus = a.status === 'Ativo' ? 'Inativo' as const : 'Ativo' as const;
        showToast(`Ação de marketing alterada para ${nextStatus}!`);
        return { ...a, status: nextStatus };
      }
      return a;
    });
    savePromoActionsToDB(updated);
  };

  const handleDeleteAction = (actionId: string) => {
    const filtered = promoActions.filter(a => a.id !== actionId);
    savePromoActionsToDB(filtered);
    showToast('Ação de bonificação removida com sucesso!');
  };

  // ACTION 8: Adicionar Novo Exemplo de Áudio (Home demo manager)
  const handleCreateHomeDemo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDemoTitle || !newDemoGenre || !newDemoOriginal || !newDemoCurated) {
      showToast('Preencha os campos editáveis do exemplo de áudio!');
      return;
    }

    const newDemo: HomeDemoTrack = {
      id: `demo-${Date.now()}`,
      title: newDemoTitle,
      genre: newDemoGenre,
      originalText: newDemoOriginal,
      curatedText: newDemoCurated,
      originalAudioName: uploadedOriginalFile || 'whatsapp_demo.mp3',
      curatedAudioName: uploadedCuratedFile || 'estudio_guia_profissional.wav'
    };

    saveHomeDemosToDB([...homeDemos, newDemo]);
    showToast(`Novo exemplo de áudio "${newDemoTitle}" adicionado com sucesso!`);

    // Reset fields
    setNewDemoTitle('');
    setNewDemoGenre('');
    setNewDemoOriginal('');
    setNewDemoCurated('');
    setUploadedOriginalFile(null);
    setUploadedCuratedFile(null);
    setShowAddDemo(false);
  };

  const handleDeleteHomeDemo = (demoId: string) => {
    const filtered = homeDemos.filter(d => d.id !== demoId);
    saveHomeDemosToDB(filtered);
    showToast('Exemplo de áudio removido do gerenciador da home!');
  };

  // ACTION 9: Salvar Alterações do Card de Preço (Home pricing manager)
  const handleSavePricingOffer = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedOffer = {
      tag: offerTag,
      title: offerTitle,
      price: offerPrice,
      sub: offerSub,
      benefits: [offerBenefit1, offerBenefit2, offerBenefit3, offerBenefit4],
      btnText: offerBtnText
    };
    localStorage.setItem('gi_home_pricing_offer', JSON.stringify(updatedOffer));
    
    // Dispatch storage event manually so other components in the same window hear it immediately
    window.dispatchEvent(new Event('storage'));
    
    showToast('Sucesso: Os novos textos do Card de Oferta Principal foram salvos e aplicados na página inicial!');
  };

  // Sort queue: COMPOSITOR PRO is featured at the top!
  const sortedCompositions = [...compositions].sort((a, b) => {
    if (a.isCompositorPro && !b.isCompositorPro) return -1;
    if (!a.isCompositorPro && b.isCompositorPro) return 1;
    return 0; // maintain date or initial index order
  });

  // Calculate TOP 10 COMPOSITORES based on spent/purchases
  // In our simulated users, we can display users ranked by total investment
  const topComposers = [
    { name: 'Roberto Santos', email: 'roberto@email.com', spent: 850, count: 12, isPro: true },
    { name: 'Bruno Lima', email: 'bruno@email.com', spent: 510, count: 8, isPro: true },
    { name: 'Carlos Mello', email: 'carlos.m@email.com', spent: 340, count: 6, isPro: false },
    { name: 'Pedro Bial', email: 'bial@g.com', spent: 170, count: 3, isPro: true },
    { name: 'Amanda Costa', email: 'amanda@email.com', spent: 170, count: 4, isPro: false },
    { name: 'Luana Silva', email: 'luanasilva@email.com', spent: 85, count: 2, isPro: false },
    { name: 'Lucas Neto', email: 'lucasneto@email.com', spent: 85, count: 2, isPro: false },
    { name: 'Juliano Santos', email: 'juliano@compositor.com', spent: 0, count: 1, isPro: false },
    { name: 'Sorocaba Som', email: 'sorocaba@som.com', spent: 0, count: 1, isPro: false },
    { name: 'Fernando Zor', email: 'fernando@zor.com', spent: 0, count: 1, isPro: false }
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-100px)] bg-[#0d0f13] text-slate-100 relative">
      
      {/* Dynamic Success Toast */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 px-5 py-4 bg-[#111419] border border-[#00ff87]/30 text-white font-mono text-xs font-bold rounded-xl shadow-[0_4px_25px_rgba(0,255,135,0.15)] flex items-center gap-3"
          >
            <div className="h-5 w-5 rounded-full bg-[#00ff87]/15 text-[#00ff87] flex items-center justify-center border border-[#00ff87]/25">
              ✓
            </div>
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEFT SIDEBAR: Admin Menus */}
      <aside className="w-full md:w-80 bg-[#0a0c0f] border-b md:border-b-0 md:border-r border-slate-900 p-6 flex flex-col justify-between space-y-6">
        <div className="space-y-6">
          {/* Admin Tag */}
          <div className="space-y-1.5 pb-4 border-b border-slate-900/80">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="font-mono text-xs text-cyan-400 font-extrabold tracking-widest uppercase">
                PAINEL DO PRODUTOR (ADMIN)
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              Controle de Fila, CRM & Gestão do Site
            </p>
          </div>

          {/* Quick Client Switcher */}
          <button
            onClick={onSwitchToClient}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-[#00ff87] hover:text-[#00e076] font-mono text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>➔ ACESSAR PAINEL DO CLIENTE</span>
          </button>

          {/* Nav Links */}
          <nav className="space-y-1 pt-2">
            
            {/* Nav 1: Produção */}
            <button
              onClick={() => setActiveTab('production')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md font-mono text-[10px] font-bold tracking-wider uppercase transition-all border text-left ${
                activeTab === 'production'
                  ? 'bg-[#00ff87]/10 text-[#00ff87] border-[#00ff87]/20'
                  : 'text-slate-400 hover:text-[#00ff87] border-transparent hover:bg-[#00ff87]/5 hover:border-[#00ff87]/10'
              }`}
            >
              <Music className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">🎵 Produção</span>
            </button>

            {/* Nav 2: Clientes */}
            <button
              onClick={() => setActiveTab('clients')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md font-mono text-[10px] font-bold tracking-wider uppercase transition-all border text-left ${
                activeTab === 'clients'
                  ? 'bg-[#00ff87]/10 text-[#00ff87] border-[#00ff87]/20'
                  : 'text-slate-400 hover:text-[#00ff87] border-transparent hover:bg-[#00ff87]/5 hover:border-[#00ff87]/10'
              }`}
            >
              <Users className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">👥 Clientes</span>
            </button>

            {/* Nav 3: Finanças */}
            <button
              onClick={() => setActiveTab('finances')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md font-mono text-[10px] font-bold tracking-wider uppercase transition-all border text-left ${
                activeTab === 'finances'
                  ? 'bg-[#00ff87]/10 text-[#00ff87] border-[#00ff87]/20'
                  : 'text-slate-400 hover:text-[#00ff87] border-transparent hover:bg-[#00ff87]/5 hover:border-[#00ff87]/10'
              }`}
            >
              <DollarSign className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">💰 Finanças</span>
            </button>

            {/* Nav 4: Depoimentos */}
            <button
              onClick={() => setActiveTab('testimonials')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md font-mono text-[10px] font-bold tracking-wider uppercase transition-all border text-left ${
                activeTab === 'testimonials'
                  ? 'bg-[#00ff87]/10 text-[#00ff87] border-[#00ff87]/20'
                  : 'text-slate-400 hover:text-[#00ff87] border-transparent hover:bg-[#00ff87]/5 hover:border-[#00ff87]/10'
              }`}
            >
              <MessageSquare className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">💬 Depoimentos</span>
            </button>

            {/* Nav 5: Comunicação */}
            <button
              onClick={() => setActiveTab('crm')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md font-mono text-[10px] font-bold tracking-wider uppercase transition-all border text-left ${
                activeTab === 'crm'
                  ? 'bg-[#00ff87]/10 text-[#00ff87] border-[#00ff87]/20'
                  : 'text-slate-400 hover:text-[#00ff87] border-transparent hover:bg-[#00ff87]/5 hover:border-[#00ff87]/10'
              }`}
            >
              <Megaphone className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">📢 Comunicação</span>
            </button>

            {/* Nav 6: Programa Bônus */}
            <button
              onClick={() => setActiveTab('contribute')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md font-mono text-[10px] font-bold tracking-wider uppercase transition-all border text-left ${
                activeTab === 'contribute'
                  ? 'bg-[#00ff87]/10 text-[#00ff87] border-[#00ff87]/20'
                  : 'text-slate-400 hover:text-[#00ff87] border-transparent hover:bg-[#00ff87]/5 hover:border-[#00ff87]/10'
              }`}
            >
              <Gift className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">🎁 Programa Bônus</span>
            </button>

            {/* Nav 7: Ajustes do Site */}
            <button
              onClick={() => setActiveTab('home_adjusts')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md font-mono text-[10px] font-bold tracking-wider uppercase transition-all border text-left ${
                activeTab === 'home_adjusts'
                  ? 'bg-[#00ff87]/10 text-[#00ff87] border-[#00ff87]/20'
                  : 'text-slate-400 hover:text-[#00ff87] border-transparent hover:bg-[#00ff87]/5 hover:border-[#00ff87]/10'
              }`}
            >
              <Sliders className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">⚙️ Ajustes do Site</span>
            </button>

          </nav>
        </div>

        {/* Footer info & Logout */}
        <div className="pt-6 border-t border-slate-900/80 space-y-4">
          <div className="flex items-center gap-3 p-2 bg-[#111419]/50 border border-slate-900 rounded-xl">
            <div className="h-8 w-8 rounded-full bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/20 text-xs font-bold font-mono">
              PR
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-white truncate">Produtor Elite</h4>
              <p className="text-[10px] text-slate-500 truncate font-mono">admin@guiainteligente.com</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-2.5 px-4 rounded-xl bg-red-950/20 hover:bg-red-950/40 border border-red-950/30 hover:border-red-900 text-red-400 text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>SAIR DO ADMIN</span>
          </button>
        </div>
      </aside>

      {/* CENTRAL AREA: Dynamic Screens */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto space-y-8">
        <AnimatePresence mode="wait">
          
          {/* SCREEN 1 - CENTRAL DE PRODUÇÃO */}
          {activeTab === 'production' && (
            <motion.div
              key="production"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-6">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">FILA DE PRODUÇÃO ATIVA</span>
                  <h2 className="font-display text-2xl font-black text-white mt-1">Central de Produção</h2>
                  <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                    Acompanhe e entregue as guias de voz e violão encomendadas pelos compositores.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 border border-slate-900 rounded-xl flex items-center gap-6">
                  <div className="text-center">
                    <span className="text-[9px] font-mono font-bold text-slate-500 block uppercase">FILA TOTAL</span>
                    <span className="text-2xl font-black text-white">{sortedCompositions.length}</span>
                  </div>
                  <div className="h-8 w-[1px] bg-slate-900" />
                  <div className="text-center">
                    <span className="text-[9px] font-mono font-bold text-amber-400 block uppercase">PENDENTES</span>
                    <span className="text-2xl font-black text-amber-400">
                      {sortedCompositions.filter(c => c.status !== 'Concluída').length}
                    </span>
                  </div>
                  <div className="h-8 w-[1px] bg-slate-900" />
                  <div className="text-center">
                    <span className="text-[9px] font-mono font-bold text-[#00ff87] block uppercase">CONCLUÍDAS</span>
                    <span className="text-2xl font-black text-[#00ff87]">
                      {sortedCompositions.filter(c => c.status === 'Concluída').length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Composition Queue Table */}
              <div className="bg-[#111419]/40 border border-slate-900 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/80 border-b border-slate-900 text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-4 px-6">Compositor</th>
                        <th className="py-4 px-6">Título da Música</th>
                        <th className="py-4 px-6">Estilo Pedido</th>
                        <th className="py-4 px-6">Tipo de Voz</th>
                        <th className="py-4 px-6">Status</th>
                        <th className="py-4 px-6 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/40 text-xs">
                      {sortedCompositions.map((comp) => (
                        <tr 
                          key={comp.id} 
                          className={`hover:bg-slate-900/10 transition-colors ${
                            comp.isCompositorPro ? 'bg-cyan-500/[0.01]' : ''
                          }`}
                        >
                          <td className="py-4 px-6">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm">{comp.composerName}</span>
                                {comp.isCompositorPro && (
                                  <span className="text-[9px] font-mono font-extrabold text-[#00ff87] bg-[#00ff87]/10 px-2 py-0.5 rounded border border-[#00ff87]/20 shadow-[0_0_8px_rgba(0,255,135,0.1)]">
                                    ⚡ COMPOSITOR PRO
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 font-mono">{comp.composerEmail}</p>
                            </div>
                          </td>
                          <td className="py-4 px-6 font-semibold text-slate-300">
                            {comp.title}
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-mono text-[11px] text-slate-400">{comp.genre}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-mono text-[11px] text-slate-400">{comp.voiceType}</span>
                          </td>
                          <td className="py-4 px-6">
                            {comp.status === 'Aguardando Produção' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold font-mono text-[9px] bg-red-500/10 text-red-400 border border-red-500/15">
                                🔴 Fila de Espera
                              </span>
                            )}
                            {comp.status === 'Em Produção' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold font-mono text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/15">
                                🟡 Em Produção
                              </span>
                            )}
                            {comp.status === 'Concluída' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold font-mono text-[9px] bg-[#00ff87]/10 text-[#00ff87] border border-[#00ff87]/15">
                                🟢 Concluída
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => {
                                setSelectedComp(comp);
                                setUploadedDeliverFile(comp.finalAudioUrl || null);
                              }}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-cyan-400 hover:text-cyan-300 rounded-lg font-bold font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              [ Ver Detalhes ]
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* SCREEN 2 - CLIENTES & FINANCEIRO */}
          {activeTab === 'clients' && (
            <motion.div
              key="clients"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-900 pb-6">
                <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">RELAÇÃO COMERCIAL & RANKING</span>
                <h2 className="font-display text-2xl font-black text-white mt-1">Clientes & Financeiro</h2>
                <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                  Gerencie a base de clientes cadastrados, créditos e saldo de descontos ativos.
                </p>
              </div>

              {/* TOP 10 COMPOSITORES */}
              <div className="bg-[#111419]/40 border border-slate-900 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">📊</span>
                  <h3 className="font-display font-black text-white text-base">TOP 10 COMPOSITORES (Maiores Investimentos)</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {topComposers.map((composer, index) => (
                    <div 
                      key={index} 
                      className="bg-slate-950/60 border border-slate-900 rounded-xl p-4 space-y-3 relative overflow-hidden"
                    >
                      <div className="absolute top-2 right-2 text-lg font-black text-slate-800 font-mono">
                        #{index + 1}
                      </div>
                      <div className="space-y-1">
                        <div className="font-bold text-white text-xs truncate pr-4">{composer.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">{composer.email}</div>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <p className="text-[9px] font-mono text-slate-400 uppercase">INVESTIDO</p>
                          <p className="text-sm font-extrabold text-[#00ff87]">R$ {composer.spent},00</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-mono text-slate-400 uppercase">GUIAS</p>
                          <p className="text-xs font-bold text-white">{composer.count}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleGiftUser(composer.email, composer.name)}
                        className="w-full py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-[10px] font-mono font-bold uppercase rounded border border-cyan-500/15 cursor-pointer text-center"
                      >
                        [ 🎁 Presentear Top User ]
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Client Table */}
              <div className="bg-[#111419]/40 border border-slate-900 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-white text-sm">Base Geral de Clientes Cadastrados</h3>
                  <span className="text-xs font-mono text-slate-500">Total: {users.length} usuários</span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/80 border-b border-slate-900 text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-4 px-6">Cliente / E-mail</th>
                        <th className="py-4 px-6">Nível de Conta</th>
                        <th className="py-4 px-6">Saldo de Créditos</th>
                        <th className="py-4 px-6">Desconto Acumulado Ativo (R$)</th>
                        <th className="py-4 px-6 text-right">Ação de Suporte</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/40 text-xs">
                      {users.map((usr) => (
                        <tr key={usr.id} className="hover:bg-slate-900/10 transition-colors">
                          <td className="py-4 px-6">
                            <div>
                              <div className="font-bold text-white text-sm">{usr.name}</div>
                              <p className="text-[10px] text-slate-500 font-mono">{usr.email}</p>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {usr.isCompositorPro ? (
                              <span className="text-[10px] font-mono font-extrabold text-[#00ff87] bg-[#00ff87]/10 px-2.5 py-0.5 rounded-full border border-[#00ff87]/20">
                                ⚡ COMPOSITOR PRO
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-850">
                                COMPOSITOR PADRÃO
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 font-mono font-bold text-slate-300">
                            {usr.credits} {usr.credits === 1 ? 'crédito' : 'créditos'}
                          </td>
                          <td className="py-4 px-6 font-mono font-bold text-emerald-400">
                            R$ {usr.activeDiscount},00
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => {
                                setPrivateEmail(usr.email);
                                setActiveTab('crm');
                                showToast(`Cliente ${usr.name} selecionado para CRM!`);
                              }}
                              className="px-3 py-1.5 bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-400 rounded-lg font-bold font-mono text-[10px] uppercase cursor-pointer"
                            >
                              [ Enviar Mensagem/Presente ]
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* SCREEN 3 - DEPOIMENTOS & INDICAÇÕES */}
          {activeTab === 'testimonials' && (
            <motion.div
              key="testimonials"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-900 pb-6">
                <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">PROVA SOCIAL & AUDITORIA</span>
                <h2 className="font-display text-2xl font-black text-white mt-1">Depoimentos & Indicações</h2>
                <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                  Avalie e gerencie os depoimentos enviados pelos compositores e libere cupons de bonificação automaticamente.
                </p>
              </div>

              {/* Testimonials List */}
              <div className="bg-[#111419]/40 border border-slate-900 rounded-2xl p-6 space-y-4">
                <h3 className="font-display font-bold text-white text-sm">Fila de Depoimentos Recebidos</h3>
                
                {testimonials.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 font-mono">Nenhum depoimento encontrado.</p>
                ) : (
                  <div className="space-y-4">
                    {testimonials.map((test) => (
                      <div 
                        key={test.id} 
                        className="bg-slate-950/60 border border-slate-900 rounded-xl p-5 space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="space-y-0.5">
                            <span className="font-bold text-white">{test.composerName}</span>
                            <span className="text-slate-500 text-[11px] font-mono block sm:inline sm:ml-2">({test.composerEmail})</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-slate-500">{test.date}</span>
                            {test.status === 'Aguardando Aprovação' ? (
                              <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/15">
                                Aguardando Aprovação
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono font-bold text-[#00ff87] bg-[#00ff87]/10 px-2 py-0.5 rounded border border-[#00ff87]/15">
                                Aprovado & Creditado
                              </span>
                            )}

                            {test.sendToHome && (
                              <span className="text-[9px] font-mono font-black text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/15">
                                Destacado na Home
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 italic leading-relaxed font-sans border-l-2 border-[#00ff87]/30 pl-3">
                          "{test.text}"
                        </p>

                        <div className="flex flex-wrap gap-3 pt-2">
                          {test.status === 'Aguardando Aprovação' && (
                            <button
                              onClick={() => handleApproveTestimonial(test.id, test.composerEmail, test.composerName)}
                              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold font-mono text-[10px] uppercase rounded-lg transition-all cursor-pointer"
                            >
                              [ APROVAR DEPOIMENTO ]
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleToggleSendToHome(test.id)}
                            className={`px-3.5 py-2 font-bold font-mono text-[10px] uppercase rounded-lg transition-all border cursor-pointer ${
                              test.sendToHome 
                                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25' 
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                            }`}
                          >
                            {test.sendToHome ? '[ REMOVER DA PÁGINA INICIAL ]' : '[ ENVIAR PARA A PÁGINA INICIAL ]'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* SCREEN 4 - CRM & COMUNICAÇÃO */}
          {activeTab === 'crm' && (
            <motion.div
              key="crm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-900 pb-6">
                <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">MARKETING & NOTIFICAÇÕES</span>
                <h2 className="font-display text-2xl font-black text-white mt-1">CRM & Comunicação</h2>
                <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                  Comunique-se diretamente com seus clientes. Envie avisos em massa ou presentes individuais de forma inteligente.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* BLOCO A: Comunicação em Massa */}
                <div className="bg-[#111419]/40 border border-slate-900 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-amber-400" />
                    <h3 className="font-display font-bold text-white text-base">Bloco A — Comunicado Geral (Massa)</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Escreva um comunicado de manutenção, novidade ou cupom relâmpago. Esta mensagem aparecerá em destaque no topo do painel de todos os clientes logados.
                  </p>

                  <form onSubmit={handleBroadcastAnnouncement} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                        Texto do Comunicado Geral
                      </label>
                      <textarea
                        value={generalAnnouncement}
                        onChange={(e) => setGeneralAnnouncement(e.target.value)}
                        placeholder="Ex: ⚡ SISTEMA ATUALIZADO: Engenharia de Violão de Aço agora com simulação de 12 cordas inclusa sem custo adicional!"
                        rows={4}
                        className="w-full px-4 py-3 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-xl text-sm text-white focus:outline-none transition-colors resize-none placeholder-slate-600"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="flex-1 py-3 bg-[#00ff87] hover:bg-[#00e076] text-black font-extrabold font-mono text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_4px_15px_rgba(0,255,135,0.1)] cursor-pointer text-center"
                      >
                        [ 📢 Disparar Notificação Geral ]
                      </button>
                      
                      {generalAnnouncement && (
                        <button
                          type="button"
                          onClick={handleClearBroadcast}
                          className="px-4 py-3 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 text-xs font-bold font-mono uppercase rounded-xl transition-all cursor-pointer"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* BLOCO B: Individual / Presentes */}
                <div className="bg-[#111419]/40 border border-slate-900 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-cyan-400" />
                    <h3 className="font-display font-bold text-white text-base">Bloco B — Presentes & CRM Individual</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Selecione um compositor cadastrado para enviar uma mensagem particular na tela dele e conceder créditos ou saldo de desconto de cortesia.
                  </p>

                  <form onSubmit={handleSendIndividualCRM} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                        E-mail do Cliente Alvo
                      </label>
                      <select
                        value={privateEmail}
                        onChange={(e) => setPrivateEmail(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-[#14181f] border border-slate-800 focus:border-cyan-500/50 rounded-xl text-sm text-slate-300 focus:outline-none transition-colors"
                      >
                        <option value="">-- Selecione o compositor --</option>
                        {users.map(u => (
                          <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                        Mensagem Privada Especial
                      </label>
                      <input
                        type="text"
                        value={privateMessage}
                        onChange={(e) => setPrivateMessage(e.target.value)}
                        placeholder="Ex: Como você é um compositor ativo, te enviamos um presente especial!"
                        className="w-full px-4 py-3 bg-[#14181f] border border-slate-800 focus:border-cyan-500/50 rounded-xl text-sm text-white focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                          Adicionar Créditos
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={privateCredits}
                          onChange={(e) => setPrivateCredits(Number(e.target.value))}
                          className="w-full px-4 py-3 bg-[#14181f] border border-slate-800 focus:border-cyan-500/50 rounded-xl text-sm text-white focus:outline-none transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                          Adicionar Saldo de Desconto (R$)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={privateDiscount}
                          onChange={(e) => setPrivateDiscount(Number(e.target.value))}
                          className="w-full px-4 py-3 bg-[#14181f] border border-slate-800 focus:border-cyan-500/50 rounded-xl text-sm text-white focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold font-mono text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_4px_15px_rgba(6,182,212,0.1)] cursor-pointer text-center"
                    >
                      [ ✉️ Enviar Notificação + Presente ]
                    </button>
                  </form>
                </div>

              </div>
            </motion.div>
          )}

          {/* SCREEN 5 - GERENCIAR CONTRIBUA E GANHE */}
          {activeTab === 'contribute' && (
            <motion.div
              key="contribute"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-6">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">CAMPANHAS DE CAPTAÇÃO & MARKETING</span>
                  <h2 className="font-display text-2xl font-black text-white mt-1">Gerenciar "Contribua e Ganhe"</h2>
                  <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                    Gerencie os incentivos e recompensas para indicação de amigos e depoimentos sobre a plataforma.
                  </p>
                </div>

                <button
                  onClick={() => setShowAddAction(!showAddAction)}
                  className="px-4 py-2.5 bg-[#00ff87] hover:bg-[#00e076] text-black font-extrabold font-mono text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_15px_rgba(0,255,135,0.1)]"
                >
                  <Plus className="h-4 w-4" />
                  <span>[ Criar Nova Ação de Bonificação ]</span>
                </button>
              </div>

              {/* Add New Action Modal Form */}
              <AnimatePresence>
                {showAddAction && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <form 
                      onSubmit={handleCreatePromoAction} 
                      className="bg-[#111419]/60 border border-cyan-500/20 p-6 rounded-2xl space-y-4 max-w-xl"
                    >
                      <h4 className="text-sm font-bold text-cyan-400 font-mono uppercase tracking-wide">
                        Cadastrar Nova Ação de Marketing
                      </h4>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="sm:col-span-2 space-y-1.5">
                            <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase">Título da Ação</label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: Seguir no Instagram"
                              value={newActionTitle}
                              onChange={(e) => setNewActionTitle(e.target.value)}
                              className="w-full px-4 py-2.5 bg-[#14181f] border border-slate-800 focus:border-cyan-500/50 rounded-lg text-xs text-white focus:outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase">Valor do Bônus (R$)</label>
                            <input
                              type="number"
                              min={1}
                              required
                              value={newActionBonus}
                              onChange={(e) => setNewActionBonus(Number(e.target.value))}
                              className="w-full px-4 py-2.5 bg-[#14181f] border border-slate-800 focus:border-cyan-500/50 rounded-lg text-xs text-white focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase">Descrição / Explicativo da Missão</label>
                          <textarea
                            required
                            placeholder="Ex: Siga o perfil oficial @guiainteligente, tire um print e ganhe R$ 10 de desconto imediato na sua próxima produção."
                            value={newActionDesc}
                            onChange={(e) => setNewActionDesc(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2.5 bg-[#14181f] border border-slate-800 focus:border-cyan-500/50 rounded-lg text-xs text-white focus:outline-none resize-none"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold font-mono text-xs uppercase rounded-lg transition-all"
                        >
                          [ Salvar Ação de Marketing ]
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddAction(false)}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 rounded-lg text-xs font-mono"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Active Actions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {promoActions.map((action) => (
                  <div 
                    key={action.id} 
                    className="bg-[#111419]/40 border border-slate-900 rounded-2xl p-6 flex flex-col justify-between space-y-6"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display font-bold text-lg text-white">{action.title}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-mono font-extrabold px-2 py-0.5 rounded-full border ${
                            action.status === 'Ativo'
                              ? 'text-[#00ff87] bg-[#00ff87]/10 border-[#00ff87]/20'
                              : 'text-slate-500 bg-slate-950 border-slate-900'
                          }`}>
                            {action.status.toUpperCase()}
                          </span>
                          <span className="text-[10px] font-mono font-extrabold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                            BÔNUS: R$ {action.bonusValue},00
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed">
                        {action.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-950/80 pt-4">
                      <div className="text-[10px] font-mono text-slate-500">
                        Ação Ativa no Painel
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleActionStatus(action.id)}
                          className={`px-3 py-1.5 rounded-lg font-mono text-[9px] font-bold uppercase border cursor-pointer ${
                            action.status === 'Ativo'
                              ? 'bg-red-950/20 border-red-900/30 text-red-400 hover:bg-red-950/40'
                              : 'bg-[#00ff87]/15 border-[#00ff87]/30 text-[#00ff87] hover:bg-[#00ff87]/25'
                          }`}
                        >
                          {action.status === 'Ativo' ? '[ DESATIVAR ]' : '[ ATIVAR ]'}
                        </button>

                        <button
                          onClick={() => handleDeleteAction(action.id)}
                          className="p-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                          title="Excluir Ação"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* SCREEN 6 - AJUSTES DO SITE */}
          {activeTab === 'home_adjusts' && (
            <motion.div
              key="home_adjusts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-6">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">DASHBOARD & HOME FRONT调整</span>
                  <h2 className="font-display text-2xl font-black text-white mt-1">Ajustes do Site (Antes/Depois)</h2>
                  <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                    Gerencie a seção da Home principal "Ouça o Poder da Nossa Curadoria Acústica" e cadastre novos arquivos de demonstração.
                  </p>
                </div>

                <button
                  onClick={() => setShowAddDemo(!showAddDemo)}
                  className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold font-mono text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_15px_rgba(6,182,212,0.1)]"
                >
                  <Plus className="h-4 w-4" />
                  <span>[ ➕ Adicionar Novo Exemplo de Áudio ]</span>
                </button>
              </div>

              {/* Add New Demo Track Form */}
              <AnimatePresence>
                {showAddDemo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <form 
                      onSubmit={handleCreateHomeDemo} 
                      className="bg-[#111419]/60 border border-cyan-500/20 p-6 rounded-2xl space-y-4 max-w-2xl"
                    >
                      <h4 className="text-sm font-bold text-cyan-400 font-mono uppercase tracking-wide">
                        Adicionar Novo Exemplo de Demonstração
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase">Nome do Compositor / Título</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Sertanejo Romântico"
                            value={newDemoTitle}
                            onChange={(e) => setNewDemoTitle(e.target.value)}
                            className="w-full px-4 py-2.5 bg-[#14181f] border border-slate-800 focus:border-cyan-500/50 rounded-lg text-xs text-white focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase">Gênero Musical</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Sertanejo Universitário / Acústico"
                            value={newDemoGenre}
                            onChange={(e) => setNewDemoGenre(e.target.value)}
                            className="w-full px-4 py-2.5 bg-[#14181f] border border-slate-800 focus:border-cyan-500/50 rounded-lg text-xs text-white focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase">Áudio Original do Celular (Texto Explicativo)</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Voz gravada no WhatsApp, sem violão"
                            value={newDemoOriginal}
                            onChange={(e) => setNewDemoOriginal(e.target.value)}
                            className="w-full px-4 py-2.5 bg-[#14181f] border border-slate-800 focus:border-cyan-500/50 rounded-lg text-xs text-white focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase">Resultado Curadoria Estúdio (Texto Explicativo)</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Violão premium de aço e voz masculina afinada"
                            value={newDemoCurated}
                            onChange={(e) => setNewDemoCurated(e.target.value)}
                            className="w-full px-4 py-2.5 bg-[#14181f] border border-slate-800 focus:border-cyan-500/50 rounded-lg text-xs text-white focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase">Upload do Áudio Original (Celular)</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Nenhum arquivo"
                              readOnly
                              value={uploadedOriginalFile || ''}
                              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-400 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const files = ['whatsapp_roberto.mp3', 'gravacao_celular_samba.wav', 'voz_bruta.mp3'];
                                setUploadedOriginalFile(files[Math.floor(Math.random() * files.length)]);
                                showToast('Áudio original carregado!');
                              }}
                              className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg font-mono text-[10px] uppercase cursor-pointer"
                            >
                              Simular
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase">Upload do Áudio Final (Guia Profissional)</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Nenhum arquivo"
                              readOnly
                              value={uploadedCuratedFile || ''}
                              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-400 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const files = ['guia_final_masculino.wav', 'guia_final_feminino.wav', 'guia_final_acustico.wav'];
                                setUploadedCuratedFile(files[Math.floor(Math.random() * files.length)]);
                                showToast('Guia final profissional carregada!');
                              }}
                              className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg font-mono text-[10px] uppercase cursor-pointer"
                            >
                              Simular
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold font-mono text-xs uppercase rounded-lg transition-all"
                        >
                          [ Adicionar Exemplo na Home ]
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddDemo(false)}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 rounded-lg text-xs font-mono"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Grid of Existing Home Demo Tracks */}
              <div className="bg-[#111419]/40 border border-slate-900 rounded-2xl p-6 space-y-4">
                <h3 className="font-display font-bold text-white text-sm">Lista de Exemplos Antes / Depois Ativos</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {homeDemos.map((demo) => (
                    <div 
                      key={demo.id} 
                      className="bg-slate-950/60 border border-slate-900 rounded-xl p-5 space-y-4 relative"
                    >
                      <button
                        onClick={() => handleDeleteHomeDemo(demo.id)}
                        className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
                        title="Excluir exemplo"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>

                      <div className="space-y-1">
                        <h4 className="font-bold text-white font-display text-base">{demo.title}</h4>
                        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">{demo.genre}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-t border-slate-900 pt-3">
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Celular Original:</span>
                          <p className="text-xs text-slate-400 leading-snug">{demo.originalText}</p>
                          <span className="text-[9px] font-mono text-amber-400 bg-amber-400/5 px-1.5 py-0.5 rounded border border-amber-400/10 truncate block mt-1.5 max-w-[140px]">
                            {demo.originalAudioName || 'audio.mp3'}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Guia Curadoria:</span>
                          <p className="text-xs text-slate-300 leading-snug font-semibold">{demo.curatedText}</p>
                          <span className="text-[9px] font-mono text-[#00ff87] bg-[#00ff87]/5 px-1.5 py-0.5 rounded border border-[#00ff87]/10 truncate block mt-1.5 max-w-[140px]">
                            {demo.curatedAudioName || 'guia.wav'}
                          </span>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION: 📦 Gerenciar Card de Oferta Principal (Home) */}
              <div className="bg-[#111419]/40 border border-slate-900 rounded-2xl p-6 space-y-6">
                <div className="border-b border-slate-900 pb-4">
                  <span className="text-[9px] font-mono font-bold tracking-widest text-[#00ff87] uppercase">GESTÃO DE PLANOS & MARKETING</span>
                  <h3 className="font-display font-bold text-white text-base mt-0.5">📦 Gerenciar Card de Oferta Principal (Home)</h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Edite livremente o card de preços principal exibido na página inicial (investimento avulso por composição).
                  </p>
                </div>

                <form onSubmit={handleSavePricingOffer} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tag de Destaque Superior */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase">Tag de Destaque Superior</label>
                      <input
                        type="text"
                        required
                        value={offerTag}
                        onChange={(e) => setOfferTag(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-lg text-xs text-white focus:outline-none"
                        placeholder="Ex: Oferta de Lançamento"
                      />
                    </div>

                    {/* Título da Oferta */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase">Título da Oferta</label>
                      <input
                        type="text"
                        required
                        value={offerTitle}
                        onChange={(e) => setOfferTitle(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-lg text-xs text-white focus:outline-none"
                        placeholder="Ex: Produção de Guia Acústica Exclusiva"
                      />
                    </div>

                    {/* Valor do Plano (R$) */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase">Valor do Plano (R$)</label>
                      <input
                        type="text"
                        required
                        value={offerPrice}
                        onChange={(e) => setOfferPrice(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-lg text-xs text-white focus:outline-none font-mono"
                        placeholder="Ex: 49,90"
                      />
                    </div>

                    {/* Texto do Botão Principal */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase">Texto do Botão Principal</label>
                      <input
                        type="text"
                        required
                        value={offerBtnText}
                        onChange={(e) => setOfferBtnText(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-lg text-xs text-white focus:outline-none"
                        placeholder="Ex: [ CRIAR MINHA CONTA E GANHE 1 GUIA GRÁTIS ]"
                      />
                    </div>
                  </div>

                  {/* Subtítulo do Preço */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase">Subtítulo do Preço</label>
                    <textarea
                      required
                      value={offerSub}
                      onChange={(e) => setOfferSub(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2.5 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-lg text-xs text-white focus:outline-none resize-none"
                      placeholder="Ex: Sua primeira música é por nossa conta. Pague R$ 49,90 apenas quando quiser enviar novos projetos."
                    />
                  </div>

                  {/* Benefícios */}
                  <div className="space-y-3 pt-2">
                    <span className="block text-[10px] font-mono text-[#00ff87] font-bold uppercase tracking-wider">Benefícios Inclusos (Lista com Checkmark Verde)</span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-mono text-slate-500 font-bold uppercase">Benefício 1</label>
                        <input
                          type="text"
                          required
                          value={offerBenefit1}
                          onChange={(e) => setOfferBenefit1(e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-lg text-xs text-white focus:outline-none"
                          placeholder="Ex: Primeira composição 100% gratuita"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-mono text-slate-500 font-bold uppercase">Benefício 2</label>
                        <input
                          type="text"
                          required
                          value={offerBenefit2}
                          onChange={(e) => setOfferBenefit2(e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-lg text-xs text-white focus:outline-none"
                          placeholder="Ex: Preservação matemática e exata"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-mono text-slate-500 font-bold uppercase">Benefício 3</label>
                        <input
                          type="text"
                          required
                          value={offerBenefit3}
                          onChange={(e) => setOfferBenefit3(e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-lg text-xs text-white focus:outline-none"
                          placeholder="Ex: Curadoria e tratamento acústico humano"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-mono text-slate-500 font-bold uppercase">Benefício 4</label>
                        <input
                          type="text"
                          required
                          value={offerBenefit4}
                          onChange={(e) => setOfferBenefit4(e.target.value)}
                          className="w-full px-4 py-2.5 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-lg text-xs text-white focus:outline-none"
                          placeholder="Ex: Direitos autorais e comerciais 100% seus"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-slate-900 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold font-mono text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_15px_rgba(37,99,235,0.15)] hover:shadow-[0_4px_25px_rgba(37,99,235,0.3)] active:scale-[0.98]"
                    >
                      <span>[ 💾 Salvar Alterações do Card de Preço ]</span>
                    </button>
                  </div>
                </form>
              </div>

            </motion.div>
          )}

          {/* SCREEN Finances - 💰 Finanças */}
          {activeTab === 'finances' && (
            <motion.div
              key="finances"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Header info */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-900 pb-6">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-[#00ff87] uppercase">GESTÃO FINANCEIRA EM TEMPO REAL</span>
                  <h2 className="font-display text-2xl font-black text-white mt-1">Painel Financeiro & Fluxo de Caixa</h2>
                  <p className="text-slate-400 mt-2 text-sm leading-relaxed">
                    Acompanhe em tempo real o faturamento bruto, descontos concedidos aos clientes e lucros reais da plataforma.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      localStorage.removeItem('gi_transactions');
                      const initialTransactions = [
                        {
                          id: 'tx-1',
                          dateTime: '11/07/2026 10:15:30',
                          clientName: 'Roberto Santos',
                          clientEmail: 'roberto@email.com',
                          type: 'Pacote Pro',
                          amountPaid: 170.00,
                          discountApplied: 79.50
                        },
                        {
                          id: 'tx-2',
                          dateTime: '11/07/2026 09:22:15',
                          clientName: 'Bruno Lima',
                          clientEmail: 'bruno@email.com',
                          type: 'Pacote Pro',
                          amountPaid: 170.00,
                          discountApplied: 79.50
                        },
                        {
                          id: 'tx-3',
                          dateTime: '10/07/2026 18:44:00',
                          clientName: 'Amanda Costa',
                          clientEmail: 'amanda@email.com',
                          type: 'Uso de Cupom',
                          amountPaid: 39.90,
                          discountApplied: 10.00
                        },
                        {
                          id: 'tx-4',
                          dateTime: '09/07/2026 14:12:05',
                          clientName: 'Carlos Mello',
                          clientEmail: 'carlos.m@email.com',
                          type: 'Uso de Cupom',
                          amountPaid: 34.90,
                          discountApplied: 15.00
                        },
                        {
                          id: 'tx-5',
                          dateTime: '08/07/2026 11:30:50',
                          clientName: 'Luana Silva',
                          clientEmail: 'luanasilva@email.com',
                          type: 'Guia Avulsa',
                          amountPaid: 49.90,
                          discountApplied: 0.00
                        },
                        {
                          id: 'tx-6',
                          dateTime: '08/07/2026 08:05:12',
                          clientName: 'Lucas Neto',
                          clientEmail: 'lucasneto@email.com',
                          type: 'Uso de Cupom',
                          amountPaid: 44.90,
                          discountApplied: 5.00
                        },
                        {
                          id: 'tx-7',
                          dateTime: '07/07/2026 21:18:40',
                          clientName: 'Pedro Bial',
                          clientEmail: 'bial@g.com',
                          type: 'Pacote Pro',
                          amountPaid: 170.00,
                          discountApplied: 79.50
                        }
                      ];
                      localStorage.setItem('gi_transactions', JSON.stringify(initialTransactions));
                      setTransactions(initialTransactions);
                      showToast('Histórico financeiro redefinido!');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors text-xs font-mono"
                  >
                    [ Limpar / Resetar Dados ]
                  </button>
                </div>
              </div>

              {/* Calculations block */}
              {(() => {
                const faturamentoBruto = transactions.reduce((acc, curr) => acc + curr.amountPaid, 0);
                const totalDescontos = transactions.reduce((acc, curr) => acc + curr.discountApplied, 0);
                const totalGuidesPurchased = transactions.reduce((acc, curr) => {
                  if (curr.type === 'Pacote Pro') return acc + 5;
                  return acc + 1;
                }, 0);
                const lucroEstimadoSemBonus = totalGuidesPurchased * 49.90;
                const lucroLiquidoReal = faturamentoBruto - totalDescontos;

                return (
                  <div className="space-y-6">
                    {/* METRICS CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* CARD A */}
                      <div className="bg-[#111419]/40 border border-slate-900 rounded-2xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 text-slate-800 opacity-20">
                          <DollarSign className="h-16 w-16" />
                        </div>
                        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase block tracking-wider">CARD A • ACUMULADO</span>
                        <h4 className="text-xs font-mono font-bold text-slate-300 mt-2 block">Faturamento Bruto (Tempo Real)</h4>
                        <p className="text-2xl font-black text-white mt-3 font-display">
                          R$ {faturamentoBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono mt-1 leading-normal">
                          Soma total do dinheiro de vendas recebido via Pix.
                        </p>
                      </div>

                      {/* CARD B */}
                      <div className="bg-[#111419]/40 border border-slate-900 rounded-2xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 text-red-500/10">
                          <Gift className="h-16 w-16" />
                        </div>
                        <span className="text-[9px] font-mono font-bold text-red-400 uppercase block tracking-wider">CARD B • DESCONTOS</span>
                        <h4 className="text-xs font-mono font-bold text-slate-300 mt-2 block">Total de Descontos Concedidos</h4>
                        <p className="text-2xl font-black text-red-400 mt-3 font-display">
                          R$ {totalDescontos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono mt-1 leading-normal">
                          Bônus de depoimentos, indicações e descontos do Pacote Pro.
                        </p>
                      </div>

                      {/* CARD C */}
                      <div className="bg-[#111419]/40 border border-slate-900 rounded-2xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 text-cyan-500/10">
                          <TrendingUp className="h-16 w-16" />
                        </div>
                        <span className="text-[9px] font-mono font-bold text-cyan-400 uppercase block tracking-wider">CARD C • PROJEÇÃO</span>
                        <h4 className="text-xs font-mono font-bold text-slate-300 mt-2 block">Lucro Estimado (Sem Bônus)</h4>
                        <p className="text-2xl font-black text-cyan-400 mt-3 font-display">
                          R$ {lucroEstimadoSemBonus.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono mt-1 leading-normal">
                          Projeção ({totalGuidesPurchased} guias) caso todas fossem pagas por R$ 49,90.
                        </p>
                      </div>

                      {/* CARD D */}
                      <div className="relative group rounded-2xl">
                        <div className="absolute -inset-[1.5px] rounded-2xl bg-gradient-to-r from-[#00ff87] to-emerald-500 opacity-60 blur-[2px]"></div>
                        <div className="relative bg-[#111419] border border-[#00ff87]/20 rounded-2xl p-6 overflow-hidden">
                          <div className="absolute top-0 right-0 p-3 text-[#00ff87]/5">
                            <Landmark className="h-16 w-16" />
                          </div>
                          <span className="text-[9px] font-mono font-extrabold text-[#00ff87] uppercase block tracking-wider">CARD D • RESULTADO LÍQUIDO</span>
                          <h4 className="text-xs font-mono font-extrabold text-white mt-2 block">Lucro Líquido Real (Com Bônus)</h4>
                          <p className="text-2xl font-black text-[#00ff87] mt-3 font-display">
                            R$ {lucroLiquidoReal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-1 leading-normal font-semibold">
                            Faturamento Bruto menos Descontos Concedidos.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* COMPARATIVE METRICS VISUAL AID */}
                    <div className="bg-[#111419]/40 border border-slate-900 rounded-2xl p-6 space-y-4">
                      <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-[#00ff87]" />
                        <span>Análise Comparativa de Desempenho Financeiro</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4 bg-slate-950/40 p-4 rounded-xl border border-slate-900/60">
                          <h4 className="text-xs font-mono font-bold text-slate-400 uppercase">Aproveitamento de Margem de Lucro</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-mono">
                              <span className="text-slate-400">Lucro Líquido Real (Com Bônus):</span>
                              <span className="text-[#00ff87] font-bold">
                                {lucroEstimadoSemBonus > 0 ? ((lucroLiquidoReal / lucroEstimadoSemBonus) * 100).toFixed(1) : 0}%
                              </span>
                            </div>
                            <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden flex">
                              <div 
                                className="bg-[#00ff87] h-full rounded-full shadow-[0_0_8px_rgba(0,255,135,0.4)]" 
                                style={{ width: `${lucroEstimadoSemBonus > 0 ? Math.max(5, Math.min(100, (lucroLiquidoReal / lucroEstimadoSemBonus) * 100)) : 0}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-1">
                              <span>Faturado: R$ {faturamentoBruto.toFixed(2)}</span>
                              <span>Descontado: R$ {totalDescontos.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900/60 text-center flex flex-col justify-center">
                            <span className="text-[9px] font-mono font-bold text-slate-500 block uppercase">TOTAL DE TRANSAÇÕES</span>
                            <span className="text-xl font-black text-white font-display block mt-1">{transactions.length}</span>
                          </div>
                          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900/60 text-center flex flex-col justify-center">
                            <span className="text-[9px] font-mono font-bold text-slate-500 block uppercase">COMPRAS DO PACOTE PRO</span>
                            <span className="text-xl font-black text-cyan-400 font-display block mt-1">
                              {transactions.filter(t => t.type === 'Pacote Pro').length}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RECENT TRANSACTIONS TABLE */}
                    <div className="bg-[#111419]/40 border border-slate-900 rounded-2xl p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-cyan-400" />
                          <span>Lista de Transações Recentes (Fluxo de Caixa)</span>
                        </h3>
                        <span className="px-3 py-1 rounded-full bg-slate-950 text-slate-500 border border-slate-900 font-mono text-[10px]">
                          {transactions.length} transações registradas no total
                        </span>
                      </div>

                      <div className="rounded-xl border border-slate-900 bg-slate-950/50 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-[#0a0c0f] border-b border-slate-900 text-[10px] font-mono text-slate-400 tracking-wider uppercase">
                                <th className="py-4 px-6">Data/Hora</th>
                                <th className="py-4 px-6">Cliente</th>
                                <th className="py-4 px-6">Tipo de Compra</th>
                                <th className="py-4 px-6 text-right">Valor Pago (R$)</th>
                                <th className="py-4 px-6 text-right">Desconto Aplicado (R$)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-900/50">
                              {transactions.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="py-8 text-center text-slate-500 text-xs font-mono">
                                    Nenhuma transação financeira registrada até o momento.
                                  </td>
                                </tr>
                              ) : (
                                [...transactions].reverse().map((tx) => (
                                  <tr key={tx.id} className="text-xs hover:bg-[#111419]/80 transition-colors">
                                    <td className="py-4 px-6 font-mono text-slate-400">
                                      {tx.dateTime}
                                    </td>
                                    <td className="py-4 px-6">
                                      <div>
                                        <span className="font-bold text-white block">{tx.clientName}</span>
                                        <span className="text-[10px] text-slate-500 font-mono truncate max-w-[200px] block">{tx.clientEmail}</span>
                                      </div>
                                    </td>
                                    <td className="py-4 px-6">
                                      {tx.type === 'Pacote Pro' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold font-mono text-[9px] bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                                          ⚡ Pacote Pro
                                        </span>
                                      ) : tx.type === 'Uso de Cupom' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold font-mono text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                          🏷️ Uso de Cupom
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold font-mono text-[9px] bg-emerald-500/15 text-[#00ff87] border border-[#00ff87]/20">
                                          🎵 Guia Avulsa
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-4 px-6 text-right font-mono font-bold text-white">
                                      R$ {tx.amountPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-4 px-6 text-right font-mono text-slate-400">
                                      {tx.discountApplied > 0 ? (
                                        <span className="text-red-400 font-medium">
                                          - R$ {tx.discountApplied.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                      ) : (
                                        <span className="text-slate-600 font-mono">-</span>
                                      )}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* MODAL: Central de Produção / Detalhes da Música */}
      <AnimatePresence>
        {selectedComp && (() => {
          const pedido = selectedComp;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-2xl bg-[#111419] border border-slate-850 rounded-2xl overflow-hidden relative shadow-2xl p-6 md:p-8 space-y-6 my-auto"
              >
                {/* Close Button */}
                <button
                  onClick={() => {
                    setSelectedComp(null);
                    setUploadedDeliverFile(null);
                  }}
                  className="absolute top-4 right-4 text-slate-500 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Title & Tags */}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">DETALHES DO PROJETO</span>
                    {pedido.isCompositorPro && (
                      <span className="text-[9px] font-mono font-extrabold text-[#00ff87] bg-[#00ff87]/10 px-2.5 py-0.5 rounded border border-[#00ff87]/20 shadow-[0_0_8px_rgba(0,255,135,0.1)]">
                        ⚡ COMPOSITOR PRO
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-xl md:text-2xl font-black text-white">{pedido.title}</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Compositor: <span className="text-slate-200 font-sans font-semibold">{pedido.composerName}</span> ({pedido.composerEmail})
                  </p>
                </div>

                {/* Grid content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left: Lyrics & Info */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-mono text-slate-500 font-bold uppercase">Letra Recebida</label>
                      <div className="w-full h-48 px-4 py-3 bg-[#0d0f13] border border-slate-900 rounded-xl text-xs text-slate-300 overflow-y-auto whitespace-pre-line font-medium leading-relaxed">
                        {pedido.lyrics || 'Letra não fornecida.'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                      <div>
                        <span className="text-slate-500 block text-[9px] font-bold uppercase">Parceiros / Coautores:</span>
                        <span className="text-slate-300 font-sans font-medium">{pedido.partners || 'Solo'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] font-bold uppercase">Voz Solicitada:</span>
                        <span className="text-slate-300 font-sans font-medium">{pedido.voiceType}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Observações e Áudio */}
                  <div className="space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-mono text-slate-500 font-bold uppercase">Direção / Observações do Compositor</label>
                        <p className="p-3 bg-[#0d0f13] border border-slate-900 rounded-xl text-xs text-slate-400 italic leading-relaxed">
                          "{pedido.directionDetails || 'Sem observações adicionais.'}"
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-900 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5 min-w-0">
                            <span className="text-[9px] font-mono text-slate-500 uppercase block">ÁUDIO BRUTO RECEBIDO (Celular):</span>
                            <p className="text-xs text-white truncate font-mono">{pedido.audioName || 'audio_bruto.mp3'}</p>
                          </div>

                          <button
                            onClick={() => downloadBase64File(pedido.audioUrl || '', pedido.audioName || 'audio_bruto.mp3')}
                            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-400 hover:text-cyan-300 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                            title="Baixar Áudio Bruto"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Custom Modern Audio Player */}
                        <div className="pt-2 border-t border-slate-900 flex justify-end w-full">
                          {pedido.audioUrl ? (
                            <CustomAudioPlayer src={pedido.audioUrl} />
                          ) : (
                            <span className="text-xs text-slate-500 font-mono">Áudio indisponível</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delivery Input Area */}
                    <div className="space-y-3 pt-4 border-t border-slate-900/60">
                      <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase">
                        Entrega da Guia Acústica Final (WAV)
                      </label>

                      {pedido.status === 'Concluída' || pedido.status === 'Concluído' ? (
                        <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/15 rounded-xl space-y-1.5 text-center">
                          <p className="text-xs text-[#00ff87] font-bold">✓ GUIA CONCLUÍDA E ENTREGUE</p>
                          <p className="text-[10px] text-slate-400 font-mono break-all">{pedido.finalAudioUrl}</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <div className="flex gap-2">
                            <input
                              type="file"
                              accept="audio/*"
                              id="deliver-file-input"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const file = e.target.files[0];
                                  setDeliverFileObj(file);
                                  setUploadedDeliverFile(file.name);
                                  showToast(`Áudio selecionado: ${file.name}`);
                                }
                              }}
                            />
                            <input
                              type="text"
                              placeholder="Escolha o arquivo WAV da guia final..."
                              readOnly
                              value={uploadedDeliverFile || ''}
                              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-900 focus:outline-none rounded-lg text-xs text-slate-300 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => document.getElementById('deliver-file-input')?.click()}
                              className="px-3 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg font-mono text-[10px] uppercase cursor-pointer"
                            >
                              Upload WAV
                            </button>
                          </div>

                          {isUploading && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-mono text-cyan-400">
                                <span>Enviando guia final...</span>
                                <span>{uploadProgress}%</span>
                              </div>
                              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-cyan-500 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            disabled={isUploading || !deliverFileObj}
                            onClick={() => handleDeliverGuide(pedido.id)}
                            className={`w-full py-3 font-extrabold font-mono text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                              isUploading || !deliverFileObj
                                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                                : 'bg-[#00ff87] hover:bg-[#00e076] text-black shadow-[0_4px_15px_rgba(0,255,135,0.1)] cursor-pointer'
                            }`}
                          >
                            <Upload className="h-4 w-4" />
                            <span>{isUploading ? 'ENVIANDO...' : '[ 📤 Entregar Guia Concluída ]'}</span>
                          </button>
                        </div>
                      )}

                    </div>

                  </div>

                </div>

              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
