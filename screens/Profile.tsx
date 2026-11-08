import React from 'react';
import { User } from '../types';
import { FREE_SCAN_LIMIT, ICONS } from '../constants';
import { ScreenProps } from './shared';

interface Props extends ScreenProps {
  user: User | null;
  onSignOut: () => void;
}

export function Profile({ t, user, onNavigate, onSignOut }: Props) {
  return (
    <div className="min-h-screen p-8 bg-black text-white animate-in slide-in-from-top duration-500">
      <div className="max-w-xl mx-auto space-y-12 py-12">
        <button onClick={() => onNavigate('welcome')} className="text-zinc-500 hover:text-white uppercase text-[10px] font-black tracking-widest flex items-center gap-2">
          <ICONS.Arrow className="w-4 h-4 rotate-180" /> {t.back}
        </button>

        <div className="space-y-4">
          <h2 className="text-6xl font-black uppercase tracking-tighter leading-none">{t.profileTitle}</h2>
          <p className="text-zinc-500 uppercase text-[10px] tracking-widest font-black">{t.accountInfo}</p>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 p-8 space-y-8">
            <div className="space-y-1">
              <p className="text-[9px] uppercase font-black text-zinc-500 tracking-widest">{t.email}</p>
              <p className="text-xl font-bold tracking-tight">{user?.email}</p>
            </div>

            <div className="space-y-1 pt-6 border-t border-zinc-800">
              <p className="text-[9px] uppercase font-black text-zinc-500 tracking-widest">{t.status}</p>
              <div className="flex items-center justify-between">
                <p className={`text-xl font-black tracking-tight ${user?.isPro ? 'text-white' : 'text-zinc-400'}`}>
                  {user?.isPro ? t.premium : t.free}
                </p>
                {!user?.isPro && (
                  <button onClick={() => onNavigate('paywall')} className="bg-white text-black text-[10px] px-4 py-2 font-black uppercase tracking-widest hover:bg-zinc-200">
                    UPGRADE
                  </button>
                )}
              </div>
              <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest mt-2">
                {user?.isPro ? t.unlimited : `${user?.photosUsed} / ${FREE_SCAN_LIMIT} SCANS USED`}
              </p>
            </div>
          </div>

          <button onClick={onSignOut} className="w-full border border-zinc-800 text-zinc-500 py-5 font-black uppercase tracking-widest hover:border-red-900 hover:text-red-500 transition-all">
            {t.signOut}
          </button>
        </div>
      </div>
    </div>
  );
}
