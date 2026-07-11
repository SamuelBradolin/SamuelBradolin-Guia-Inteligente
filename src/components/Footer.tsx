import React from 'react';
import { ShieldCheck, Music4 } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t border-[#1e293b]/40 bg-[#07080a] py-8 px-6 md:px-12 w-full text-center">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <Music4 className="h-4 w-4 text-slate-600" />
          <span>Focado na pureza da composição.</span>
        </div>
        
        <p className="order-last md:order-none select-none text-slate-600">
          © {currentYear} Guia Inteligente. Todos os direitos reservados.
        </p>

        <div className="flex items-center gap-1.5 text-[#00ff87]/80 bg-[#00ff87]/5 px-3 py-1.5 rounded-full border border-[#00ff87]/10">
          <ShieldCheck className="h-4 w-4" />
          <span>Pagamento 100% seguro via PIX</span>
        </div>
      </div>
    </footer>
  );
}
