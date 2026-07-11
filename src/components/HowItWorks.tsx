import React from 'react';
import { UserPlus, UploadCloud, Download } from 'lucide-react';

interface Step {
  num: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export default function HowItWorks() {
  const steps: Step[] = [
    {
      num: '01',
      title: 'Faça seu Cadastro',
      description: 'Acesse nosso sistema seguro informando apenas seu nome, e-mail e telefone para liberar sua área de cliente exclusiva.',
      icon: UserPlus,
    },
    {
      num: '02',
      title: 'Suba seu Áudio e Letra',
      description: 'Cole o texto da sua letra e anexe o áudio gravado no celular (vale gogó puro ou violão básico). Escolha o tipo de voz (Masculina ou Feminina).',
      icon: UploadCloud,
    },
    {
      num: '03',
      title: 'Nossa Curadoria em Ação',
      description: 'A nossa equipa recebe o seu material, isola a sua melodia original.\nTratamento acústico humano para extrair a alma da sua música.\nRemovemos ruídos, refinamos o violão e entregamos a sua guia tratada em alta qualidade direto no seu painel.',
      icon: Download,
    },
  ];

  return (
    <section id="como-funciona" className="py-20 px-6 md:px-12 bg-[#0f1115] relative">
      <div className="max-w-6xl mx-auto">
        {/* Section Heading */}
        <div className="text-center mb-16">
          <p className="text-xs font-mono tracking-widest text-[#00ff87] mb-3 uppercase">ESTRUTURA DE PRODUÇÃO</p>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Como Funciona <span className="text-slate-400 font-normal">(Processo Simples no seu Painel)</span>
          </h2>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector Line for Desktop */}
          <div className="hidden md:block absolute top-1/2 left-[12%] right-[12%] h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent -translate-y-12 z-0"></div>

          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div 
                key={step.num}
                className="relative z-10 group flex flex-col items-center md:items-start p-6 md:p-8 rounded-2xl border border-slate-800/50 bg-[#13161c]/60 hover:bg-[#13161c] hover:border-slate-800 transition-all duration-300"
              >
                {/* Step Icon and Number Box */}
                <div className="flex justify-between items-center w-full mb-6">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[#00ff87] group-hover:border-[#00ff87]/30 group-hover:shadow-[0_0_15px_rgba(0,255,135,0.1)] transition-all duration-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="font-display text-4xl font-black text-slate-800 group-hover:text-[#00ff87]/20 select-none transition-all duration-300">
                    {step.num}
                  </span>
                </div>

                {/* Step Details */}
                <h3 className="text-lg font-bold text-white mb-3 group-hover:text-[#00ff87] transition-all duration-300">
                  {step.title}
                </h3>
                
                <p className="text-slate-400 text-sm leading-relaxed text-center md:text-left whitespace-pre-line">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
