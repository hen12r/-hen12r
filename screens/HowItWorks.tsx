import React from 'react';
import { ICONS } from '../constants';
import { ScreenProps } from './shared';

interface Props extends ScreenProps {
  isSignedIn: boolean;
}

export function HowItWorks({ t, onNavigate, isSignedIn }: Props) {
  return (
    <div className="min-h-screen p-8 bg-black text-white animate-in slide-in-from-right duration-500 overflow-y-auto">
      <div className="max-w-xl mx-auto space-y-16 py-12">
        <button onClick={() => onNavigate('welcome')} className="text-zinc-500 hover:text-white uppercase text-[10px] font-black tracking-widest flex items-center gap-2">
          <ICONS.Arrow className="w-4 h-4 rotate-180" /> {t.back}
        </button>

        <h2 className="text-6xl font-black uppercase tracking-tighter leading-none border-b-4 border-white pb-4">{t.howItWorks}</h2>

        <div className="space-y-12">
          <div className="space-y-4">
            <h3 className="text-2xl font-black uppercase tracking-tighter">{t.howStep1Title}</h3>
            <p className="text-zinc-500 uppercase text-xs tracking-widest leading-relaxed font-bold">{t.howStep1Desc}</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-black uppercase tracking-tighter">{t.howStep2Title}</h3>
            <p className="text-zinc-500 uppercase text-xs tracking-widest leading-relaxed font-bold">{t.howStep2Desc}</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-black uppercase tracking-tighter">{t.howStep3Title}</h3>
            <p className="text-zinc-500 uppercase text-xs tracking-widest leading-relaxed font-bold">{t.howStep3Desc}</p>
          </div>
        </div>

        <button 
          onClick={() => onNavigate(isSignedIn ? 'gender' : 'auth')} 
          className="w-full bg-white text-black py-5 font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
        >
          {t.getStarted}
        </button>
      </div>
    </div>
  );
}
