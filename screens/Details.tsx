import React from 'react';
import { Outfit } from '../types';
import { ICONS } from '../constants';
import { ScreenProps } from './shared';

interface Props extends ScreenProps {
  outfit: Outfit;
  onTryOn: () => void;
}

export function Details({ t, outfit, onTryOn, onNavigate }: Props) {
  return (
     <div className="p-8 animate-in fade-in duration-500">
        <button onClick={() => onNavigate('results')} className="mb-12 text-zinc-500 hover:text-white uppercase text-[10px] font-black flex items-center gap-2"><ICONS.Arrow className="w-4 h-4 rotate-180" /> {t.back}</button>
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
           <h1 className="text-6xl font-black uppercase tracking-tighter">{outfit.name}</h1>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <img src={outfit.imageUrls[0]} alt={outfit.name} className="w-full aspect-[3/4] object-cover grayscale border border-zinc-800" />
             <div className="flex flex-col justify-between">
                <div className="space-y-6">
                  <p className="text-2xl font-serif italic text-zinc-300 leading-relaxed">{outfit.explanation}</p>
                  <button onClick={onTryOn} className="w-full bg-white text-black py-4 font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors shadow-lg border border-white">
                    {t.tryOnBtn}
                  </button>
                </div>
                <a href={outfit.affiliateLink} target="_blank" rel="noreferrer" className="block w-full border border-zinc-800 text-white py-5 text-center font-black uppercase tracking-widest hover:bg-zinc-900 mt-8">{t.buyLook}</a>
             </div>
           </div>
        </div>
     </div>
  );
}
