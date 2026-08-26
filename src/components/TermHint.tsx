/**
 * TermHint — educação contextual: termo do glossário com tooltip explicativo.
 * Aparece com ícone de ajuda discreto ao lado do rótulo.
 */

import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { GLOSSARY } from '../data/glossary';

interface TermHintProps {
  term: string; // chave do GLOSSARY
  children?: React.ReactNode; // rótulo a exibir (default: label do termo)
}

const TermHint: React.FC<TermHintProps> = ({ term, children }) => {
  const entry = GLOSSARY[term];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  if (!entry) return <>{children}</>;

  return (
    <span ref={ref} className="relative inline-flex items-center gap-1">
      <span>{children ?? entry.label}</span>
      <button
        type="button"
        aria-label={`O que é ${entry.label}?`}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className="text-gray-500 hover:text-emerald-400 transition-colors"
      >
        <HelpCircle className="w-3 h-3" />
      </button>
      {open && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 rounded-xl bg-[#030816] border border-emerald-500/30 shadow-xl text-left">
          <span className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">
            {entry.label}
          </span>
          <span className="block text-[11px] text-gray-300 leading-relaxed normal-case font-normal">
            {entry.definition}
          </span>
        </span>
      )}
    </span>
  );
};

export default TermHint;
