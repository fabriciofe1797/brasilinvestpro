import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { SUPPORTED_LANGUAGES } from '../i18n';
import { useStore } from '../store/useStore';

interface LanguageSwitcherProps {
  className?: string;
  /** Modo compacto: exibe apenas bandeira + seta (barra superior mobile) */
  compact?: boolean;
  /** Direção de abertura do menu: 'down' (barras superiores) ou 'up' (rodapé) */
  dropDirection?: 'up' | 'down';
}

// Seletor compacto de idioma (pt-BR / en / es) no estilo glass do app
const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className, compact = false, dropDirection = 'down' }) => {
  const { i18n } = useTranslation();
  const { settings, setLanguage } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current =
    SUPPORTED_LANGUAGES.find(l => l.code === (settings.language ?? i18n.language)) ?? SUPPORTED_LANGUAGES[0];

  // Fecha ao clicar fora ou pressionar Escape
  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={current.label}
        className={cn(
          'flex items-center rounded-xl border transition-all',
          compact ? 'gap-1.5 px-2.5 py-2' : 'gap-2 px-3 py-2 w-full',
          open
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-white/[0.03] border-white/5 text-gray-400 hover:text-white hover:bg-white/[0.06] hover:border-white/10'
        )}
      >
        {!compact && <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
        <span className="text-[10px] font-black uppercase tracking-widest truncate text-left">
          {current.flag}
          {!compact && <span className="ml-1.5">{current.code === 'pt-BR' ? 'PT-BR' : current.code.toUpperCase()}</span>}
        </span>
        <ChevronDown className={cn('w-3 h-3 transition-transform shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            'absolute right-0 min-w-[170px] rounded-xl bg-[#0a1122]/95 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/60 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-150',
            dropDirection === 'down' ? 'top-full mt-2' : 'bottom-full mb-2'
          )}
        >
          {SUPPORTED_LANGUAGES.map(lang => {
            const selected = lang.code === current.code;
            return (
              <button
                key={lang.code}
                role="option"
                aria-selected={selected}
                onClick={() => { setLanguage(lang.code); setOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all border-l-2',
                  selected
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-400'
                    : 'text-gray-500 border-transparent hover:text-white hover:bg-white/10 hover:border-white/30'
                )}
              >
                <span className="text-sm leading-none">{lang.flag}</span>
                <span className="flex-1 text-left truncate">{lang.label}</span>
                {selected && <Check className="w-3 h-3 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
