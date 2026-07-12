import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Mic2, Guitar, ShieldCheck, Headphones, Sliders, Disc, 
  ArrowRight, Sparkles, Volume2, Star
} from 'lucide-react';

import Header from './components/Header';
import Footer from './components/Footer';
import AudioDemoSection from './components/AudioDemoSection';
import HowItWorks from './components/HowItWorks';
import PriceSection from './components/PriceSection';
import WizardModal from './components/WizardModal';
import LoginModal from './components/LoginModal';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  
  // Persist authentication state in localStorage for a seamless refresh experience
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('gi_logged_in') === 'true';
  });
  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem('gi_user_email') || '';
  });
  const [isAdminView, setIsAdminView] = useState(() => {
    return localStorage.getItem('gi_is_admin_view') === 'true';
  });

  // Track the current URL pathname for routing
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const openWizard = () => {
    setIsLoginOpen(false);
    setIsWizardOpen(true);
  };
  const closeWizard = () => setIsWizardOpen(false);

  const openLogin = () => {
    setIsWizardOpen(false);
    setIsLoginOpen(true);
  };
  const closeLogin = () => setIsLoginOpen(false);

  const handleLoginSuccess = (email: string) => {
    setUserEmail(email);
    setIsLoggedIn(true);
    localStorage.setItem('gi_logged_in', 'true');
    localStorage.setItem('gi_user_email', email);

    if (email.toLowerCase().includes('admin')) {
      setIsAdminView(true);
      localStorage.setItem('gi_is_admin_view', 'true');
      navigateTo('/produtor');
    } else {
      setIsAdminView(false);
      localStorage.setItem('gi_is_admin_view', 'false');
      navigateTo('/cliente');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserEmail('');
    setIsAdminView(false);
    localStorage.removeItem('gi_logged_in');
    localStorage.removeItem('gi_user_email');
    localStorage.removeItem('gi_is_admin_view');
    navigateTo('/');
  };

  const handleBackToHome = () => {
    navigateTo('/');
  };

  // 1. Route Resolution Engine
  let viewToRender: 'home' | 'client' | 'admin' = 'home';
  
  if (currentPath === '/produtor' || currentPath === '/admin') {
    if (isLoggedIn && userEmail.toLowerCase().includes('admin')) {
      viewToRender = 'admin';
    } else if (isLoggedIn) {
      // Normal user trying to access admin - redirect to client dashboard
      viewToRender = 'client';
      window.history.replaceState({}, '', '/cliente');
      setTimeout(() => setCurrentPath('/cliente'), 0);
    } else {
      // Unauthorized, show home and prompt login
      viewToRender = 'home';
      if (!isLoginOpen && !isWizardOpen) {
        setIsLoginOpen(true);
      }
    }
  } else if (currentPath === '/cliente' || currentPath === '/dashboard') {
    if (isLoggedIn) {
      if (userEmail.toLowerCase().includes('admin')) {
        viewToRender = 'admin';
        window.history.replaceState({}, '', '/produtor');
        setTimeout(() => setCurrentPath('/produtor'), 0);
      } else {
        viewToRender = 'client';
      }
    } else {
      // Unauthorized, show home and prompt login
      viewToRender = 'home';
      if (!isLoginOpen && !isWizardOpen) {
        setIsLoginOpen(true);
      }
    }
  } else {
    // Normal / landing page
    viewToRender = 'home';
  }

  return (
    <div className="min-h-screen bg-[#0f1115] font-sans text-slate-200 flex flex-col selection:bg-[#00ff87]/30 selection:text-[#00ff87]">
      {/* Admin utility bar at the top */}
      {isLoggedIn && userEmail.toLowerCase().includes('admin') && (
        <div className="bg-[#00ff87]/15 border-b border-[#00ff87]/30 px-6 py-2.5 flex items-center justify-between text-xs font-mono relative z-50 shadow-md">
          <div className="flex items-center gap-2 text-white">
            <span className="h-2 w-2 rounded-full bg-[#00ff87] animate-pulse"></span>
            <span>Ambiente: <strong>Painel do Produtor (Admin)</strong> • Logado como: <span className="text-[#00ff87] font-semibold">{userEmail}</span></span>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                if (viewToRender === 'admin') {
                  navigateTo('/cliente');
                } else {
                  navigateTo('/produtor');
                }
              }}
              className="px-3 py-1 rounded bg-[#00ff87] text-black font-extrabold uppercase tracking-wider hover:bg-[#00e076] transition-all cursor-pointer shadow-[0_2px_10px_rgba(0,255,135,0.2)] text-[10px]"
            >
              {viewToRender === 'admin' ? '[ Ver Painel do Cliente ]' : '[ Ver Central do Produtor (Admin) ]'}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <Header 
        onRegisterClick={openWizard} 
        onLoginClick={openLogin} 
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        onBackToHome={handleBackToHome}
        onGoToPanel={() => {
          if (userEmail.toLowerCase().includes('admin')) {
            navigateTo('/produtor');
          } else {
            navigateTo('/cliente');
          }
        }}
      />

      {/* Main Content */}
      {viewToRender === 'home' && (
        <>
          <main className="flex-1">
        
        {/* HERO SECTION */}
        <section className="relative pt-20 pb-24 md:py-32 px-6 md:px-12 bg-gradient-to-b from-[#111419] to-[#0f1115] overflow-hidden">
          {/* Studio Ambient Lights */}
          <div className="absolute top-20 right-10 w-[400px] h-[400px] bg-[#00ff87]/4 blur-[120px] rounded-full pointer-events-none"></div>
          <div className="absolute -bottom-10 left-10 w-[300px] h-[300px] bg-[#1e293b]/20 blur-[100px] rounded-full pointer-events-none"></div>

          <div className="max-w-5xl mx-auto text-center relative z-10 space-y-8">
            
            {/* Visual Intro Badge */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1e293b]/40 border border-slate-800 text-slate-300 text-xs font-mono select-none"
            >
              <span className="h-2 w-2 rounded-full bg-[#00ff87] animate-pulse"></span>
              <span className="text-[#00ff87] font-bold">Curadoria de Elite</span>
              <span className="text-slate-600">•</span>
              <span>Voz e Violão Premium</span>
            </motion.div>

            {/* Impact Title (H1) */}
            <motion.h1 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display text-4xl md:text-6xl font-black tracking-tight text-white leading-[1.1]"
            >
              Transforme sua composição em uma{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#00ff87] to-[#00ff87]/80 drop-shadow-[0_4px_12px_rgba(0,255,135,0.15)]">
                Guia Voz e Violão Profissional
              </span>
              . Ganhe sua primeira produção grátis!
            </motion.h1>

            {/* Explanatory Subtitle */}
            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-slate-400 max-w-3xl mx-auto text-sm md:text-base leading-relaxed md:px-4"
            >
              Envie o áudio do seu celular cantando ou tocando a sua música. Nossa curadoria isola sua melodia, substitui por uma engenharia de voz impecável e cria o acompanhamento de violão perfeito. Simples, acústico e no padrão que o mercado exige — teste nosso system sem custo hoje mesmo.
            </motion.p>

            {/* CTA Button */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="pt-4 flex flex-col items-center gap-3"
            >
              <button
                onClick={openWizard}
                className="group relative inline-flex items-center justify-center gap-2 px-8 py-5 rounded-2xl bg-[#00ff87] hover:bg-[#00e076] text-black font-extrabold font-mono text-base uppercase tracking-wider transition-all duration-300 shadow-[0_4px_25px_rgba(0,255,135,0.2)] hover:shadow-[0_4px_30px_rgba(0,255,135,0.4)] active:scale-[0.98]"
              >
                <span>[ Enviar Minha Composição ]</span>
                <ArrowRight className="h-5 w-5 stroke-[2.5px] group-hover:translate-x-1 transition-transform" />
              </button>
              
              <span className="text-[10px] md:text-xs text-slate-500 font-mono flex items-center gap-1.5 select-none">
                <ShieldCheck className="h-3.5 w-3.5 text-[#00ff87]" />
                <span>Análise de Métrica & Tom inclusas sem custo adicional</span>
              </span>
            </motion.div>

            {/* Premium Studio Hardware Features Grid */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="pt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto"
            >
              {/* Feature 1 */}
              <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-800 bg-[#13161c]/40 hover:bg-[#13161c]/70 transition-all">
                <div className="p-2.5 rounded-lg bg-[#1e293b] text-[#00ff87] border border-slate-700/50">
                  <Mic2 className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase">Voz de Estúdio</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Engenharia de voz avançada com afinação, expressividade e brilho de estúdio.</p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-800 bg-[#13161c]/40 hover:bg-[#13161c]/70 transition-all">
                <div className="p-2.5 rounded-lg bg-[#1e293b] text-[#00ff87] border border-slate-700/50">
                  <Guitar className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase">Violão Premium</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Acústico impecável com dedilhados, texturas e ritmos calibrados pela nossa curadoria.</p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-800 bg-[#13161c]/40 hover:bg-[#13161c]/70 transition-all">
                <div className="p-2.5 rounded-lg bg-[#1e293b] text-[#00ff87] border border-slate-700/50">
                  <Disc className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase">Entrega Expressa</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Arquivo WAV de alta definição pronto para mercado.</p>
                </div>
              </div>
            </motion.div>

          </div>
        </section>

        {/* INTERACTIVE DEMOS SECTION */}
        <AudioDemoSection />

        {/* HOW IT WORKS SECTION */}
        <HowItWorks />

        {/* PRICING SECTION */}
        <PriceSection onTriggerCTA={openWizard} />

        {/* TRUST BANNER SECTION */}
        <section className="py-16 px-6 md:px-12 bg-[#0f1115] border-t border-slate-900 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[#00ff87]/1 pointer-events-none"></div>
          <div className="max-w-2xl mx-auto space-y-6 relative z-10">
            <div className="flex justify-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-current" />
              ))}
            </div>
            <p className="text-lg md:text-xl font-medium text-white italic">
              "Com a Guia Inteligente, apresentei minha música para um grande produtor de Goiânia. A qualidade da interpretação em voz e violão fez toda a diferença na aceitação imediata."
            </p>
            <div className="text-xs font-mono uppercase tracking-widest text-slate-500">
              — Juliano Santos, Compositor Independente
            </div>
          </div>
        </section>

          </main>

          {/* Footer */}
          <Footer />
        </>
      )}

      {viewToRender === 'client' && (
        <Dashboard userEmail={userEmail} onLogout={handleLogout} />
      )}

      {viewToRender === 'admin' && (
        <AdminDashboard onLogout={handleLogout} onSwitchToClient={() => navigateTo('/cliente')} />
      )}

      {/* Interactive Submit Wizard Modal */}
      <WizardModal isOpen={isWizardOpen} onClose={closeWizard} onSwitchToLogin={openLogin} />

      {/* Interactive Login Modal */}
      <LoginModal isOpen={isLoginOpen} onClose={closeLogin} onSwitchToRegister={openWizard} onLoginSuccess={handleLoginSuccess} />
    </div>
  );
}
