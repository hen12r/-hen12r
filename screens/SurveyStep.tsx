import React from 'react';
import { AppStep } from '../types';
import { ScreenProps } from './shared';

export interface SurveyOption<T> {
  label: string;
  value: T;
}

interface Props<T extends string | number> extends ScreenProps {
  title: string;
  options: SurveyOption<T>[];
  current: T | null;
  onSelect: (value: T) => void;
  next: AppStep;
}

export function SurveyStep<T extends string | number>({ t, title, options, current, onSelect, next, onNavigate }: Props<T>) {
  return (
    <div className="min-h-screen p-8 bg-black text-white flex flex-col items-center justify-center animate-in slide-in-from-right duration-500">
      <div className="w-full max-w-lg space-y-12 text-center">
        <h2 className="text-4xl font-black tracking-tighter uppercase underline decoration-zinc-800 decoration-4 underline-offset-8">{title}</h2>
        <div className="grid grid-cols-1 gap-4">
          {options.map(opt => (
            <button key={opt.value} onClick={() => { onSelect(opt.value); onNavigate(next); }} className={`p-6 border font-bold uppercase tracking-widest transition-all ${current === opt.value ? 'bg-white text-black' : 'border-zinc-800 text-zinc-400 hover:border-zinc-500'}`}>
              {opt.label}
            </button>
          ))}
        </div>
        <button onClick={() => onNavigate('welcome')} className="text-xs text-zinc-600 uppercase font-black tracking-widest hover:text-white">{t.back}</button>
      </div>
    </div>
  );
}
