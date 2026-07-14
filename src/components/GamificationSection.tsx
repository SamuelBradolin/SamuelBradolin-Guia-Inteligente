import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Medal, Award, Trophy, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface GamificationRule {
  level_name: string;
  min_guias: number;
  max_guias: number;
  bonus_value: number;
  reward_type: string;
}

export default function GamificationSection() {
  const [rules, setRules] = useState<GamificationRule[]>([
    { level_name: 'Bronze', min_guias: 0, max_guias: 5, bonus_value: 10.00, reward_type: 'Saldo de Desconto Interno' },
    { level_name: 'Prata', min_guias: 6, max_guias: 14, bonus_value: 5.00, reward_type: 'Saldo de Saque em Dinheiro' },
    { level_name: 'Ouro', min_guias: 15, max_guias: 9999, bonus_value: 10.00, reward_type: 'Saldo de Saque em Dinheiro' }
  ]);

  const [title, setTitle] = useState('Suba de Nível e Ganhe Dinheiro');
  const [subtitle, setSubtitle] = useState('Conheça o nosso programa de fidelidade e acelere seus ganhos indicando outros compositores.');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    // 1. Try local cache first
    const cachedRules = localStorage.getItem('gi_gamification_rules');
    if (cachedRules) {
      try {
        setRules(JSON.parse(cachedRules));
      } catch (_) {}
    }

    const cachedTitle = localStorage.getItem('gi_gamification_title');
    if (cachedTitle) {
      setTitle(cachedTitle);
    }
    const cachedSub = localStorage.getItem('gi_gamification_subtitle');
    if (cachedSub) {
      setSubtitle(cachedSub);
    }

    try {
      // 2. Fetch from Supabase
      const { data: rulesData, error: rulesError } = await supabase
        .from('gamification_rules')
        .select('*');

      if (!rulesError && rulesData && rulesData.length > 0) {
        const rulesMap: Record<string, any> = {};
        rulesData.forEach((r: any) => {
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
        setRules(loadedRules);
        localStorage.setItem('gi_gamification_rules', JSON.stringify(loadedRules));
      }

      const { data: settingsData, error: settingsError } = await supabase
        .from('site_settings')
        .select('*');

      if (!settingsError && settingsData) {
        const titleRow = settingsData.find((r: any) => r.key === 'gamification_title');
        const subtitleRow = settingsData.find((r: any) => r.key === 'gamification_subtitle');

        if (titleRow) {
          setTitle(titleRow.value);
          localStorage.setItem('gi_gamification_title', titleRow.value);
        }
        if (subtitleRow) {
          setSubtitle(subtitleRow.value);
          localStorage.setItem('gi_gamification_subtitle', subtitleRow.value);
        }
      }
    } catch (err) {
      console.warn("Could not query Supabase site settings/rules, using fallbacks.", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Event listener for storage changes so admin edits sync immediately
    const handleStorageChange = () => {
      loadData();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const getLevelConfig = (levelName: string, rule: GamificationRule) => {
    const isCash = rule.reward_type === 'Saldo de Saque em Dinheiro';
    const bonusStr = rule.bonus_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const rangeStr = rule.max_guias >= 9999 ? `${rule.min_guias}+ guias` : `${rule.min_guias} - ${rule.max_guias} guias`;

    switch (levelName) {
      case 'Bronze':
        return {
          icon: Medal,
          badgeColor: 'bg-amber-600/10 text-amber-500 border-amber-600/20',
          borderColor: 'border-amber-900/30 hover:border-amber-500/40',
          shadowColor: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.1)]',
          title: 'Bronze',
          range: rangeStr,
          rewardValue: `R$ ${bonusStr}`,
          rewardDesc: 'Dedução direta como Cupom de Desconto em novos pedidos.',
          badgeText: 'Cupom de Desconto',
          gradient: 'from-amber-500/5 via-transparent to-transparent'
        };
      case 'Prata':
        return {
          icon: Award,
          badgeColor: 'bg-slate-400/10 text-slate-300 border-slate-400/20',
          borderColor: 'border-slate-800 hover:border-slate-400/40',
          shadowColor: 'hover:shadow-[0_0_20px_rgba(148,163,184,0.1)]',
          title: 'Prata',
          range: rangeStr,
          rewardValue: `R$ ${bonusStr}`,
          rewardDesc: 'Dinheiro real enviado via PIX direto para sua conta bancária.',
          badgeText: 'Saque via PIX',
          gradient: 'from-slate-400/5 via-transparent to-transparent'
        };
      case 'Ouro':
      default:
        return {
          icon: Trophy,
          badgeColor: 'bg-[#00ff87]/10 text-[#00ff87] border-[#00ff87]/20',
          borderColor: 'border-emerald-950/30 hover:border-[#00ff87]/40',
          shadowColor: 'hover:shadow-[0_0_20px_rgba(0,255,135,0.15)]',
          title: 'Ouro',
          range: rangeStr,
          rewardValue: `R$ ${bonusStr}`,
          rewardDesc: 'Aceleração máxima! Dinheiro real enviado via PIX sem burocracia.',
          badgeText: 'Super Saque PIX',
          gradient: 'from-[#00ff87]/5 via-transparent to-transparent'
        };
    }
  };

  return (
    <section id="fidelidade-niveis" className="py-20 px-6 md:px-12 bg-[#0d0f13] border-t border-slate-900 relative overflow-hidden">
      {/* Glow lines */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#00ff87]/2 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <p className="text-xs font-mono tracking-widest text-[#00ff87] uppercase">Programa de Indicações</p>
          <h2 className="font-display text-3xl md:text-5xl font-black tracking-tight text-white leading-[1.1]">
            {title}
          </h2>
          <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Level Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {rules.map((rule) => {
            const config = getLevelConfig(rule.level_name, rule);
            const IconComponent = config.icon;

            return (
              <motion.div
                key={rule.level_name}
                whileHover={{ y: -6 }}
                className={`group relative rounded-2xl border ${config.borderColor} bg-[#111419]/50 p-6 md:p-8 flex flex-col justify-between transition-all duration-300 ${config.shadowColor} overflow-hidden`}
              >
                {/* Visual gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-40 group-hover:opacity-100 transition-opacity pointer-events-none`} />

                <div className="space-y-6 relative z-10">
                  {/* Card Header (Icon & Badge) */}
                  <div className="flex justify-between items-start">
                    <div className={`p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 group-hover:border-[#00ff87]/20 group-hover:shadow-[0_0_15px_rgba(0,255,135,0.05)] transition-all`}>
                      <IconComponent className={`h-6 w-6 ${rule.level_name === 'Bronze' ? 'text-amber-500' : rule.level_name === 'Prata' ? 'text-slate-300' : 'text-[#00ff87]'}`} />
                    </div>
                    <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${config.badgeColor}`}>
                      {config.badgeText}
                    </span>
                  </div>

                  {/* Card Details */}
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <h3 className="font-display text-2xl font-black text-white group-hover:text-[#00ff87] transition-all">
                        {config.title}
                      </h3>
                      <span className="text-xs font-mono text-slate-500">({config.range})</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed pt-2">
                      Indique outros compositores e ganhe bônus por cada primeiro pedido pago!
                    </p>
                  </div>

                  {/* Bonus Reward Highlight */}
                  <div className="bg-slate-950/70 border border-slate-900/60 p-4 rounded-xl space-y-1">
                    <span className="block text-[8px] font-mono text-slate-500 uppercase font-bold tracking-wider">RECOMPENSA POR INDICAÇÃO</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-2xl font-black font-display ${rule.level_name === 'Ouro' ? 'text-[#00ff87]' : 'text-white'}`}>
                        {config.rewardValue}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">por amigo</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-normal pt-1 border-t border-slate-900/50 mt-1">
                      {config.rewardDesc}
                    </p>
                  </div>
                </div>

                {/* Footer status / button preview */}
                <div className="pt-6 relative z-10 border-t border-slate-900 mt-6">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#00ff87]">
                    <Zap className="h-3.5 w-3.5 animate-pulse" />
                    <span>Liberado automaticamente na conta</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Additional info banner */}
        <div className="mt-12 bg-[#111419]/30 border border-slate-900 rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className="p-2.5 rounded-xl bg-[#00ff87]/5 text-[#00ff87] border border-[#00ff87]/10 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Como funciona o pagamento?</h4>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Nossos saques de bônus PIX são liquidados de forma ágil e segura diretamente na sua chave cadastrada no seu painel.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              // Trigger wizard or scroll to price
              const element = document.getElementById('precos');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="w-full sm:w-auto px-5 py-3 bg-[#00ff87] hover:bg-[#00e076] text-black font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_4px_15px_rgba(0,255,135,0.1)] shrink-0 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>[ Começar Agora ]</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

      </div>
    </section>
  );
}
