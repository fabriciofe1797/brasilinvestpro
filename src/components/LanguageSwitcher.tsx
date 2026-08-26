import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { SUPPORTED_LANGUAGES } from '../i18n';
import { useStore } from '../store/useStore';

interface LanguageSwitcherProps {
  className?: string;
}

// Seletor compacto de idioma (pt-BR / en / es) no estilo glass do app
const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className }) => {
  const { i18n } = useTranslation();
  const { settings, setLanguage } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current =
    SUPPORTED_LANGUAGES.find(l => l.code === (settings.language ?? i18n.language)) ?? SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all"
      >
        <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-widest truncate flex-1 text-left">
          {current.flag} {current.code === 'pt-BR' ? 'PT-BR' : current.code.toUpperCase()}
        </span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-[#0a1122] border border-white/10 shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          {SUPPORTED_LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => { setLanguage(lang.code); setOpen(false); }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all',
                lang.code === current.code
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
              )}
            >
              <span>{lang.flag}</span>
              <span className="flex-1 text-left">{lang.label}</span>
              {lang.code === current.code && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
