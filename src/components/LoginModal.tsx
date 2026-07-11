import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, Sparkles } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
  onLoginSuccess?: (email: string) => void;
}

export default function LoginModal({ isOpen, onClose, onSwitchToRegister, onLoginSuccess }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    // Simulate API authorization response
    setTimeout(() => {
      setLoading(false);
      setLoginSuccess(true);
      setTimeout(() => {
        setLoginSuccess(false);
        onClose();
        if (onLoginSuccess) {
          onLoginSuccess(email);
        }
      }, 1800);
    }, 1200);
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    alert("Um link de redefinição de senha foi enviado para o e-mail informado (simulação).");
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
            className="w-full max-w-md bg-[#111419] border border-slate-800 rounded-2xl overflow-hidden relative shadow-2xl my-auto"
          >
            {/* Top Indicator Header */}
            <div className="px-6 py-4 bg-[#0a0c0f] border-b border-slate-900 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#00ff87] animate-pulse"></span>
                <span className="font-mono text-xs text-[#00ff87] font-bold tracking-wider uppercase">● ACESSO AO PAINEL</span>
              </div>
              <button 
                type="button"
                onClick={onClose} 
                className="text-slate-500 hover:text-white p-1 rounded-full hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8">
              {loginSuccess ? (
                <div className="py-12 text-center space-y-4">
                  <div className="h-12 w-12 rounded-full bg-[#00ff87]/10 text-[#00ff87] flex items-center justify-center mx-auto border border-[#00ff87]/20">
                    <Sparkles className="h-6 w-6 animate-pulse" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-white">Login Realizado!</h3>
                  <p className="text-xs text-slate-400">Você está sendo redirecionado para o seu painel de guias...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Central Headers */}
                  <div className="text-center mb-6">
                    <h3 className="font-display text-2xl font-extrabold text-white">
                      Bem-vindo de Volta
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      Insira suas credenciais para acompanhar suas guias acústicas.
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#00ff87]/5 border border-[#00ff87]/15 text-[#00ff87] text-[10px] font-mono leading-tight">
                      <Sparkles className="h-3 w-3 animate-pulse text-[#00ff87]" />
                      <span>Dica: Digite qualquer e-mail contendo <strong className="text-white">"admin"</strong> para testar o Painel de Produção!</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* E-mail Field */}
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                        E-mail Cadastrado
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                          type="email"
                          required
                          placeholder="roberto@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-xl text-sm text-white focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    {/* Password Field */}
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wide">
                        Sua Senha
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-[#14181f] border border-slate-800 focus:border-[#00ff87]/50 rounded-xl text-sm text-white focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    {/* Forgot password */}
                    <div className="flex justify-between items-center pt-1 text-xs">
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-slate-500 hover:text-[#00ff87] font-mono transition-colors cursor-pointer"
                      >
                        Esqueceu sua senha?
                      </button>

                      <button
                        type="button"
                        onClick={onSwitchToRegister}
                        className="text-[#00ff87] hover:underline font-mono font-medium transition-colors cursor-pointer"
                      >
                        Criar uma conta
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full group inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#00ff87] hover:bg-[#00e076] disabled:bg-slate-800 disabled:text-slate-500 text-black font-extrabold font-mono text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_4px_20px_rgba(0,255,135,0.15)] hover:shadow-[0_4px_25px_rgba(0,255,135,0.3)] cursor-pointer"
                    >
                      <span>{loading ? 'CONECTANDO...' : 'ENTRAR NO PAINEL ➔'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
