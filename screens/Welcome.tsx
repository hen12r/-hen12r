import React from 'react';
import { AppStep, User } from '../types';
import { FREE_SCAN_LIMIT } from '../constants';
import { ScreenProps } from './shared';

interface Props extends ScreenProps {
  user: User | null;
  onLimitedAction: (step: AppStep) => void;
}

export function Welcome({ t, user, onNavigate, onLimitedAction }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-black text-white text-center space-y-12 animate-in fade-in duration-1000">
      <div className="space-y-4">
        <h1 className="text-7xl font-black tracking-tighter uppercase whitespace-pre-line leading-[0.9]">{t.welcomeTitle}</h1>
        <p className="text-zinc-500 max-w-sm mx-auto uppercase text-[10px] tracking-[0.3em] font-bold">{t.welcomeSub}</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        {user ? (
          <div className="flex flex-col gap-4">
             <div className="bg-zinc-900 border border-zinc-800 p-4 text-left relative overflow-hidden group">
                {user.isPro && (
                  <div className="absolute top-0 right-0 bg-white text-black text-[8px] font-black px-2 py-0.5 uppercase tracking-widest">
                    PREMIUM
                  </div>
                )}
                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Architect Detected</p>
                <p className="text-xs font-bold truncate">{user.email}</p>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-[9px] uppercase font-black text-zinc-600 tracking-widest">
                    {user.isPro ? t.unlimited : `${FREE_SCAN_LIMIT - user.photosUsed} ${t.freeRemaining}`}
                  </span>
                  {!user.isPro && (
                    <button onClick={() => onNavigate('paywall')} className="text-[9px] font-black uppercase text-white underline underline-offset-4 hover:text-zinc-300">Upgrade</button>
                  )}
                </div>
             </div>
             <button onClick={() => onLimitedAction('visual-scan')} className="bg-white text-black py-4 px-8 font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors">
               {t.visualScanBtn}
             </button>
             <button onClick={() => onNavigate('gender')} className="border border-zinc-800 text-white py-4 px-8 font-black uppercase tracking-widest hover:border-white transition-colors">
               {t.getStarted}
             </button>
             <button onClick={() => onNavigate('profile')} className="text-zinc-400 py-2 font-black uppercase text-[10px] tracking-[0.2em] hover:text-white transition-colors">
               {t.profile}
             </button>
             <button onClick={() => onNavigate('how-it-works')} className="text-zinc-600 py-2 font-black uppercase text-[10px] tracking-[0.2em] hover:text-white transition-colors border-b border-zinc-900 hover:border-white">
               {t.howItWorks}
             </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <button onClick={() => onNavigate('auth')} className="bg-white text-black py-4 px-8 font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors">
              {t.login} / {t.signUp}
            </button>
            <button onClick={() => onNavigate('discovery')} className="text-zinc-600 py-2 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors">
              {t.vibeCheck}
            </button>
            <button onClick={() => onNavigate('how-it-works')} className="text-zinc-600 py-2 font-black uppercase text-[10px] tracking-[0.2em] hover:text-white transition-colors border-b border-zinc-900 hover:border-white">
               {t.howItWorks}
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
