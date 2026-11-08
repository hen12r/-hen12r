import React, { useState } from 'react';
import { User } from '../types';
import { supabaseService } from '../services/supabaseService';
import { ScreenProps } from './shared';

interface Props extends ScreenProps {
  user: User | null;
  onUserChange: (user: User | null) => void;
}

export function Paywall({ t, user, onNavigate, onUserChange }: Props) {
  const [isUpgrading, setIsUpgrading] = useState(false);

  // FIXME: no payment happens here. The client grants itself Pro after a fake
  // delay, and the "Secure payments via Stripe" footer is not true yet.
  // See README "Known issues".
  const handleSubscribe = async () => {
    if (!user) return;
    setIsUpgrading(true);
    await new Promise(r => setTimeout(r, 2000));
    try {
      await supabaseService.setProStatus(user.id, true);
      const updatedProfile = await supabaseService.getProfile(user.id);
      onUserChange(updatedProfile);
      onNavigate('welcome');
    } catch (e) {
      console.error("Upgrade failed", e);
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-black text-white animate-in zoom-in duration-300">
      <div className="w-full max-w-md space-y-12 text-center">
        <div className="inline-block p-4 border-2 border-white mb-4">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="space-y-4">
          <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">{t.paywallTitle}</h2>
          <p className="text-zinc-500 uppercase text-[10px] tracking-[0.2em] font-black max-w-xs mx-auto">{t.paywallSub}</p>
        </div>
        
        <div className="space-y-4">
          <button 
            onClick={handleSubscribe} 
            disabled={isUpgrading}
            className="w-full bg-white text-black py-5 font-black uppercase tracking-widest hover:bg-zinc-200 transition-all disabled:opacity-50"
          >
            {isUpgrading ? "SECURE CONNECTION..." : t.upgradeBtn}
          </button>
          <button onClick={() => onNavigate('welcome')} className="text-zinc-600 py-2 font-black uppercase text-[10px] tracking-widest hover:text-white">
            {t.back}
          </button>
        </div>
        
        <p className="text-[8px] text-zinc-700 uppercase font-black tracking-widest">Secure payments via Stripe • Cancel anytime</p>
      </div>
    </div>
  );
}
