import React from 'react';
import { Radio } from 'lucide-react';

interface HeaderProps {
  onRegisterClick?: () => void;
  onLoginClick?: () => void;
  isLoggedIn?: boolean;
  onLogout?: () => void;
  onBackToHome?: () => void;
}

export default function Header({ onRegisterClick, onLoginClick, isLoggedIn, onLogout, onBackToHome }: HeaderProps) {
  const scrollToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="border-b border-[#1e293b]/40 bg-[#0f1115]/80 backdrop-blur-md sticky top-0 z-40 w-full py-4 px-6 md:px-12 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Brand Logo & Slogan */}
        <div className="flex flex-col items-center md:items-start gap-1.5">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-[#00ff87]/20 blur-md animate-pulse"></div>
              <Radio className="h-5 w-5 text-[#00ff87] relative z-10" />
            </div>
            <span className="font-display text-xl md:text-2xl font-bold tracking-tight text-white select-none">
              Guia <span className="text-[#00ff87] drop-shadow-[0_0_12px_rgba(0,255,135,0.4)]">Inteligente</span>
            </span>
          </div>
          <p className="text-[11px] md:text-xs text-slate-400 font-medium md:pl-[30px] text-center md:text-left select-none">
            Guias inteligentes para compositores inteligentes.
          </p>
        </div>

        {/* Navigation Menu */}
        <nav className="flex items-center justify-center">
          <a 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (onBackToHome) onBackToHome();
              else scrollToTop(e);
            }}
            className="text-xs font-mono font-bold tracking-widest text-[#00ff87] hover:text-white transition-colors duration-300 uppercase px-3 py-1.5 rounded-md bg-[#00ff87]/5 border border-[#00ff87]/15 hover:border-[#00ff87]/40 cursor-pointer"
          >
            PAGINA INICIAL
          </a>
        </nav>

        {/* Action Buttons: ENTRAR & CADASTRE-SE / SAIR */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <button 
              type="button"
              onClick={onLogout}
              className="text-xs font-mono font-bold tracking-wider text-red-400 hover:text-red-300 transition-colors duration-300 uppercase px-3.5 py-2 hover:bg-red-500/5 rounded-lg border border-transparent hover:border-red-500/10 cursor-pointer animate-fade-in"
            >
              SAIR DO PAINEL
            </button>
          ) : (
            <>
              <button 
                type="button"
                onClick={onLoginClick}
                className="text-xs font-mono font-bold tracking-wider text-slate-300 hover:text-white transition-colors duration-300 uppercase px-3.5 py-2 hover:bg-slate-800/40 rounded-lg border border-transparent hover:border-slate-800 cursor-pointer"
              >
                ENTRAR
              </button>
              <button 
                type="button"
                onClick={onRegisterClick}
                className="text-xs font-mono font-bold tracking-wider text-black bg-[#00ff87] hover:bg-[#00e076] transition-all duration-300 uppercase px-4 py-2 rounded-lg shadow-[0_0_15px_rgba(0,255,135,0.1)] hover:shadow-[0_0_20px_rgba(0,255,135,0.25)] cursor-pointer"
              >
                CADASTRE-SE
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
