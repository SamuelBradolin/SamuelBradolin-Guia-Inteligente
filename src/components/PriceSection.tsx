import React from 'react';
import { Check, ShieldCheck, Zap, Sparkles } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface PriceSectionProps {
  onTriggerCTA: () => void;
}

interface PricingOffer {
  tag: string;
  title: string;
  price: string;
  sub: string;
  benefits: string[];
  btnText: string;
}

export default function PriceSection({ onTriggerCTA }: PriceSectionProps) {
  const [offer, setOffer] = React.useState<PricingOffer>({
    tag: 'OFERTA DE LANÇAMENTO',
    title: 'Produção de Guia Acústica Exclusiva',
    price: '49,90',
    sub: 'Sua primeira música é por nossa conta. Pague R$ 49,90 apenas quando quiser enviar novos projetos.',
    benefits: [
      'Primeira composição 100% gratuita (Crédito imediato no painel).',
      'Preservação matemática e exata da sua melodia original.',
      'Curadoria e tratamento acústico humano (sem chiados ou robótica).',
      'Direitos autorais e comerciais 100% seus. Você é totalmente dono da obra e do áudio gerado. Use a guia livremente para postar, registrar ou divulgar onde quiser.'
    ],
    btnText: '[ CRIAR MINHA CONTA E GANHAR 1 GUIA GRÁTIS ]'
  });

  React.useEffect(() => {
    const docRef = doc(db, 'configuracoes', 'home_offer');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setOffer(docSnap.data() as PricingOffer);
      } else {
        const defaultOffer = {
          tag: 'OFERTA DE LANÇAMENTO',
          title: 'Produção de Guia Acústica Exclusiva',
          price: '49,90',
          sub: 'Sua primeira música é por nossa conta. Pague R$ 49,90 apenas quando quiser enviar novos projetos.',
          benefits: [
            'Primeira composição 100% gratuita (Crédito imediato no painel).',
            'Preservação matemática e exata da sua melodia original.',
            'Curadoria e tratamento acústico humano (sem chiados ou robótica).',
            'Direitos autorais e comerciais 100% seus. Você é totalmente dono da obra e do áudio gerado. Use a guia livremente para postar, registrar ou divulgar onde quiser.'
          ],
          btnText: '[ CRIAR MINHA CONTA E GANHAR 1 GUIA GRÁTIS ]'
        };
        setDoc(docRef, defaultOffer).catch(err => console.error("Error seeding pricing config:", err));
        setOffer(defaultOffer);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <section id="preco" className="py-24 px-6 md:px-12 bg-[#0d0f13] relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-[#00ff87]/3 blur-[140px] rounded-full pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="text-xs font-mono tracking-widest text-[#00ff87] mb-3 uppercase select-none">INVESTIMENTO ÚNICO</p>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Experimente Grátis — Preço Justo a Partir da Segunda Guia
          </h2>
          <p className="text-slate-400 mt-2 text-sm md:text-base">
            Pague apenas pelo que produzir. Sem cobranças recorrentes ou taxas ocultas.
          </p>
        </div>

        {/* Central Pricing Card */}
        <div className="max-w-lg mx-auto relative group">
          {/* Glowing neon green outline back-border */}
          <div className="absolute -inset-[1.5px] rounded-2xl bg-gradient-to-b from-[#00ff87] to-[#1e293b]/20 opacity-90 blur-[1px] group-hover:blur-[2px] transition-all duration-300"></div>

          {/* Card Body */}
          <div className="relative rounded-2xl bg-[#111419] p-8 md:p-10 flex flex-col items-center">
            {/* Visual badge top */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#00ff87] text-black text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider select-none shadow-[0_0_12px_rgba(0,255,135,0.3)]">
              <Sparkles className="h-3 w-3" />
              <span>{offer.tag}</span>
            </div>

            {/* Title */}
            <h3 className="font-display text-lg md:text-xl font-bold text-slate-300 mb-2 mt-2 text-center">
              {offer.title}
            </h3>

            {/* Price Box */}
            <div className="my-6 text-center">
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-slate-400 font-mono text-lg font-medium">R$</span>
                <span className="text-white text-5xl font-black tracking-tight font-display drop-shadow-[0_0_20px_rgba(255,255,255,0.08)]">
                  {offer.price}
                </span>
                <span className="text-slate-500 font-mono text-xs">/ por composição</span>
              </div>
              <p className="text-slate-400 text-xs mt-3 max-w-sm mx-auto leading-relaxed">
                {offer.sub}
              </p>
            </div>

            {/* Divider */}
            <div className="w-full h-[1px] bg-slate-800/50 mb-6"></div>

            {/* Benefits List */}
            <ul className="w-full space-y-4 mb-8">
              {offer.benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 p-0.5 rounded-full bg-[#00ff87]/15 text-[#00ff87] shrink-0 border border-[#00ff87]/10">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs md:text-sm text-slate-300 leading-normal font-medium">
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            <button
              onClick={onTriggerCTA}
              className="w-full py-4 px-6 rounded-xl bg-[#00ff87] hover:bg-[#00e076] text-black font-bold font-mono text-xs md:text-sm uppercase tracking-wider transition-all duration-300 shadow-[0_4px_20px_rgba(0,255,135,0.15)] hover:shadow-[0_4px_25px_rgba(0,255,135,0.3)] active:scale-[0.98] cursor-pointer"
            >
              {offer.btnText}
            </button>

            {/* Security Note */}
            <div className="flex items-center gap-1.5 mt-4 text-[11px] font-mono text-slate-500">
              <ShieldCheck className="h-4 w-4 text-slate-600" />
              <span>Garantia de satisfação ou reembolso rápido</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
